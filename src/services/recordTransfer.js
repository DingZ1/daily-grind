import { DAY_KIND_LABELS } from '../constants/rules'

const CSV_COLUMNS = [
  { key: 'date', label: '日期' },
  { key: 'dayKind', label: '日期类型编码' },
  { key: 'dayKindLabel', label: '日期类型' },
  { key: 'startTime', label: '开始时间' },
  { key: 'endTime', label: '结束时间' },
  { key: 'overtimeHours', label: '计入时长(h)' },
  { key: 'status', label: '状态' },
  { key: 'note', label: '备注' },
  { key: 'updatedAt', label: '更新时间' },
]

const HEADER_ALIASES = {
  date: 'date',
  日期: 'date',
  dayKind: 'dayKind',
  日期类型编码: 'dayKind',
  dayKindLabel: 'dayKindLabel',
  日期类型: 'dayKindLabel',
  startTime: 'startTime',
  开始时间: 'startTime',
  endTime: 'endTime',
  结束时间: 'endTime',
  note: 'note',
  备注: 'note',
}

function escapeCsvCell(value) {
  const text = value == null ? '' : String(value)
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

function splitCsvLine(line) {
  const cells = []
  let current = ''
  let inQuotes = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    const nextChar = line[index + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"'
        index += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === ',' && !inQuotes) {
      cells.push(current)
      current = ''
      continue
    }

    current += char
  }

  cells.push(current)
  return cells
}

export function downloadRecordsCsv(records, filename = 'daily-grind-records.csv') {
  const headerRow = CSV_COLUMNS.map((column) => column.label).join(',')
  const dataRows = records.map((record) => CSV_COLUMNS.map((column) => {
    if (column.key === 'dayKindLabel') {
      return escapeCsvCell(DAY_KIND_LABELS[record.dayKind] || record.dayKind || '')
    }

    if (column.key === 'status') {
      return escapeCsvCell(record.status === 'valid' ? 'valid' : 'invalid')
    }

    return escapeCsvCell(record[column.key] ?? '')
  }).join(','))

  const csv = [headerRow, ...dataRows].join('\r\n')
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = filename
  link.click()

  URL.revokeObjectURL(url)
}

export function parseRecordsCsv(text) {
  const normalized = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const lines = normalized
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length < 2) {
    throw new Error('导入文件为空。')
  }

  const headers = splitCsvLine(lines[0]).map((cell) => HEADER_ALIASES[cell.trim()] || cell.trim())

  if (!headers.includes('date') || !headers.includes('startTime') || !headers.includes('endTime')) {
    throw new Error('导入文件缺少必要列：日期、开始时间、结束时间。')
  }

  return lines.slice(1).map((line, index) => {
    const cells = splitCsvLine(line)
    const row = { __rowNumber: index + 2 }

    headers.forEach((header, headerIndex) => {
      row[header] = (cells[headerIndex] || '').trim()
    })

    return row
  })
}
