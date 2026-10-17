import { Blob as NodeBlob } from 'node:buffer'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useOvertimeStore } from '../stores/overtime'
import { calculateMealAllowance } from '../utils/mealAllowance'
import { downloadRecordsExcel, parseRecordsCsv, parseRecordsFile } from './recordTransfer'

vi.mock('./supabase', () => ({ supabase: null }))

const encoder = new TextEncoder()
const decoder = new TextDecoder()
const exampleRecords = [
  { date: '2026-10-12', dayKind: 'workday', startTime: '19:00', endTime: '20:00' },
  { date: '2026-10-13', dayKind: 'workday', startTime: '19:00', endTime: '20:30' },
  { date: '2026-10-17', dayKind: 'weekend', startTime: '08:30', endTime: '20:30' },
].map((record) => ({ ...record, attendanceSegments: [], note: '餐补测试', status: 'valid' }))

let downloadedBlob

// Exported workbooks use stored ZIP entries, allowing the fixture to retain the real workbook metadata.
function readStoredEntries(buffer) {
  const bytes = new Uint8Array(buffer)
  const view = new DataView(buffer)
  const entries = []
  let offset = 0

  while (view.getUint32(offset, true) === 0x04034b50) {
    const size = view.getUint32(offset + 18, true)
    const nameLength = view.getUint16(offset + 26, true)
    const extraLength = view.getUint16(offset + 28, true)
    const dataOffset = offset + 30 + nameLength + extraLength
    entries.push({
      name: decoder.decode(bytes.slice(offset + 30, offset + 30 + nameLength)),
      content: decoder.decode(bytes.slice(dataOffset, dataOffset + size)),
    })
    offset = dataOffset + size
  }

  return entries
}

function zipFixture(entries) {
  const localParts = []
  const centralParts = []
  let localOffset = 0

  entries.forEach(({ name, content }) => {
    const nameBytes = encoder.encode(name)
    const data = encoder.encode(content)
    let crc = 0xffffffff
    data.forEach((byte) => {
      crc ^= byte
      for (let bit = 0; bit < 8; bit += 1) crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1
    })
    crc = (crc ^ 0xffffffff) >>> 0

    const local = new Uint8Array(30 + nameBytes.length)
    const localView = new DataView(local.buffer)
    localView.setUint32(0, 0x04034b50, true)
    localView.setUint16(4, 20, true)
    localView.setUint16(6, 0x0800, true)
    localView.setUint32(14, crc, true)
    localView.setUint32(18, data.length, true)
    localView.setUint32(22, data.length, true)
    localView.setUint16(26, nameBytes.length, true)
    local.set(nameBytes, 30)
    localParts.push(local, data)

    const central = new Uint8Array(46 + nameBytes.length)
    const centralView = new DataView(central.buffer)
    centralView.setUint32(0, 0x02014b50, true)
    centralView.setUint16(4, 20, true)
    centralView.setUint16(6, 20, true)
    centralView.setUint16(8, 0x0800, true)
    centralView.setUint32(16, crc, true)
    centralView.setUint32(20, data.length, true)
    centralView.setUint32(24, data.length, true)
    centralView.setUint16(28, nameBytes.length, true)
    centralView.setUint32(42, localOffset, true)
    central.set(nameBytes, 46)
    centralParts.push(central)
    localOffset += local.length + data.length
  })

  const centralLength = centralParts.reduce((sum, bytes) => sum + bytes.length, 0)
  const end = new Uint8Array(22)
  const endView = new DataView(end.buffer)
  endView.setUint32(0, 0x06054b50, true)
  endView.setUint16(8, entries.length, true)
  endView.setUint16(10, entries.length, true)
  endView.setUint32(12, centralLength, true)
  endView.setUint32(16, localOffset, true)

  return new NodeBlob([...localParts, ...centralParts, end]).arrayBuffer()
}

async function exportEntries(records = exampleRecords) {
  downloadRecordsExcel(records)
  return readStoredEntries(await downloadedBlob.arrayBuffer())
}

function excelFile(buffer) {
  return { name: 'records.xlsx', arrayBuffer: async () => buffer }
}

function importRows(rows) {
  const store = useOvertimeStore()
  vi.spyOn(store, 'persist').mockImplementation(() => {})
  const result = store.importRecords(rows)
  expect(result).toMatchObject({ created: rows.length, skipped: 0, errors: [] })
  return store
}

describe('meal allowance record transfer', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.stubGlobal('Blob', NodeBlob)
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn((blob) => {
        downloadedBlob = blob
        return 'blob:records'
      }),
      revokeObjectURL: vi.fn(),
    })
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('exports meal amounts as numeric cells after overtime hours, including zero', async () => {
    const entries = await exportEntries(exampleRecords.map((record) => ({ ...record, mealAllowanceAmount: 999 })))
    const sheet = entries.find((entry) => entry.name === 'xl/worksheets/sheet1.xml').content

    expect(sheet).toContain('<dimension ref="A1:K4"/>')
    expect(sheet).toContain('<c r="G1" t="inlineStr"><is><t>计入时长(h)</t></is></c>')
    expect(sheet).toContain('<c r="H1" t="inlineStr"><is><t>餐补（元）</t></is></c>')
    expect(sheet).toContain('<c r="H2" t="n"><v>0</v></c>')
    expect(sheet).toContain('<c r="H3" t="n"><v>25</v></c>')
    expect(sheet).toContain('<c r="H4" t="n"><v>50</v></c>')
    expect(sheet).toContain('<col min="9" max="11" width="18" customWidth="1"/>')
    expect(sheet).not.toContain('<v>999</v>')
  })

  it('imports legacy CSV without a meal column and recomputes the allowance', () => {
    const rows = parseRecordsCsv([
      '日期,日期类型编码,加班开始时间,加班结束时间,当天打卡记录,备注',
      '2026-10-13,workday,19:00,20:30,08:30-18:00,旧 CSV',
      '2026-10-17,weekend,08:30,20:30,,旧 CSV',
    ].join('\n'))
    const store = importRows(rows)

    expect(calculateMealAllowance(store.records['2026-10-13']).totalAmount).toBe(25)
    expect(calculateMealAllowance(store.records['2026-10-17']).totalAmount).toBe(50)
  })

  it('imports legacy XLSX without the meal column', async () => {
    const entries = await exportEntries()
    const worksheet = entries.find((entry) => entry.name === 'xl/worksheets/sheet1.xml')
    worksheet.content = worksheet.content
      .replace(/<c r="H\d+"[^>]*>[\s\S]*?<\/c>/g, '')
      .replace(/r="([I-K])(\d+)"/g, (_, column, row) => `r="${String.fromCharCode(column.charCodeAt(0) - 1)}${row}"`)
      .replace('A1:K4', 'A1:J4')
    const rows = await parseRecordsFile(excelFile(await zipFixture(entries)))
    const store = importRows(rows)

    expect(rows[0]).not.toHaveProperty('餐补（元）')
    expect(exampleRecords.map((record) => calculateMealAllowance(store.records[record.date]).totalAmount)).toEqual([0, 25, 50])
  })

  it('round-trips XLSX while ignoring imported meal amounts and persisting original record fields only', async () => {
    const entries = await exportEntries()
    const rows = await parseRecordsFile(excelFile(await zipFixture(entries)))
    expect(rows.map((row) => row['餐补（元）'])).toEqual(['0', '25', '50'])
    rows.forEach((row) => { row['餐补（元）'] = '999' })
    const store = importRows(rows)

    expect(exampleRecords.map((record) => calculateMealAllowance(store.records[record.date]).totalAmount)).toEqual([0, 25, 50])
    Object.values(store.records).forEach((record) => {
      expect(record).not.toHaveProperty('餐补（元）')
      expect(record).not.toHaveProperty('mealAllowanceAmount')
    })
  })
})
