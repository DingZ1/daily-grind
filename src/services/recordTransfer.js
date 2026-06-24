import { DAY_KIND_LABELS } from '../constants/rules'

const TRANSFER_COLUMNS = [
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

const EXCEL_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder('utf-8')

const BUILT_IN_DATE_FORMAT_IDS = new Set([
  14, 15, 16, 17, 22,
  27, 28, 29, 30, 31, 36,
  50, 51, 52, 53, 54, 57, 58,
])
const BUILT_IN_TIME_FORMAT_IDS = new Set([18, 19, 20, 21, 45, 46, 47])

const CRC_TABLE = new Uint32Array(256)
for (let index = 0; index < 256; index += 1) {
  let value = index
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1
  }
  CRC_TABLE[index] = value >>> 0
}

function getRecordCellValue(record, column) {
  if (column.key === 'dayKindLabel') {
    return DAY_KIND_LABELS[record.dayKind] || record.dayKind || ''
  }

  if (column.key === 'status') {
    return record.status === 'valid' ? 'valid' : 'invalid'
  }

  return record[column.key] ?? ''
}

function buildTransferRows(records) {
  return [
    TRANSFER_COLUMNS.map((column) => column.label),
    ...records.map((record) => TRANSFER_COLUMNS.map((column) => getRecordCellValue(record, column))),
  ]
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

function normalizeRowsToRecords(rows) {
  const filledRows = rows
    .map((row, index) => ({
      cells: row.cells.map((cell) => String(cell ?? '').trim()),
      rowNumber: row.rowNumber || index + 1,
    }))
    .filter((row) => row.cells.some(Boolean))

  if (filledRows.length < 2) {
    throw new Error('导入文件为空。')
  }

  const [headerRow, ...dataRows] = filledRows
  const headers = headerRow.cells.map((cell) => HEADER_ALIASES[cell] || cell)

  if (!headers.includes('date') || !headers.includes('startTime') || !headers.includes('endTime')) {
    throw new Error('导入文件缺少必要列：日期、开始时间、结束时间。')
  }

  return dataRows.map((row) => {
    const record = { __rowNumber: row.rowNumber }

    headers.forEach((header, headerIndex) => {
      record[header] = row.cells[headerIndex] || ''
    })

    return record
  })
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = filename
  link.click()

  URL.revokeObjectURL(url)
}

function escapeXml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function columnNameFromIndex(index) {
  let columnName = ''
  let current = index + 1

  while (current > 0) {
    current -= 1
    columnName = String.fromCharCode(65 + (current % 26)) + columnName
    current = Math.floor(current / 26)
  }

  return columnName
}

function columnIndexFromName(columnName) {
  return columnName.split('').reduce((sum, char) => sum * 26 + char.charCodeAt(0) - 64, 0) - 1
}

function buildInlineStringXml(value) {
  const text = String(value ?? '')
  const preserveSpace = /^\s|\s$/.test(text) ? ' xml:space="preserve"' : ''
  return `<is><t${preserveSpace}>${escapeXml(text)}</t></is>`
}

function buildWorksheetXml(rows) {
  const maxColumnIndex = Math.max(TRANSFER_COLUMNS.length - 1, ...rows.map((row) => row.length - 1))
  const maxRowIndex = Math.max(rows.length, 1)
  const dimension = `A1:${columnNameFromIndex(maxColumnIndex)}${maxRowIndex}`
  const sheetRows = rows.map((row, rowIndex) => {
    const cells = row.map((cell, columnIndex) => {
      const ref = `${columnNameFromIndex(columnIndex)}${rowIndex + 1}`
      return `<c r="${ref}" t="inlineStr">${buildInlineStringXml(cell)}</c>`
    }).join('')

    return `<row r="${rowIndex + 1}">${cells}</row>`
  }).join('')

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <dimension ref="${dimension}"/>
  <sheetViews><sheetView workbookViewId="0"/></sheetViews>
  <sheetFormatPr defaultRowHeight="18"/>
  <cols>
    <col min="1" max="1" width="14" customWidth="1"/>
    <col min="2" max="3" width="14" customWidth="1"/>
    <col min="4" max="5" width="12" customWidth="1"/>
    <col min="6" max="6" width="14" customWidth="1"/>
    <col min="7" max="9" width="18" customWidth="1"/>
  </cols>
  <sheetData>${sheetRows}</sheetData>
</worksheet>`
}

function getCrc32(bytes) {
  let crc = 0xffffffff

  for (let index = 0; index < bytes.length; index += 1) {
    crc = CRC_TABLE[(crc ^ bytes[index]) & 0xff] ^ (crc >>> 8)
  }

  return (crc ^ 0xffffffff) >>> 0
}

function concatBytes(parts) {
  const length = parts.reduce((sum, part) => sum + part.length, 0)
  const result = new Uint8Array(length)
  let offset = 0

  parts.forEach((part) => {
    result.set(part, offset)
    offset += part.length
  })

  return result
}

function writeUint16(view, offset, value) {
  view.setUint16(offset, value, true)
}

function writeUint32(view, offset, value) {
  view.setUint32(offset, value >>> 0, true)
}

function createZip(entries) {
  const localParts = []
  const centralParts = []
  let localOffset = 0

  entries.forEach((entry) => {
    const nameBytes = textEncoder.encode(entry.name)
    const dataBytes = typeof entry.content === 'string' ? textEncoder.encode(entry.content) : entry.content
    const crc = getCrc32(dataBytes)
    const localHeader = new Uint8Array(30 + nameBytes.length)
    const localView = new DataView(localHeader.buffer)

    writeUint32(localView, 0, 0x04034b50)
    writeUint16(localView, 4, 20)
    writeUint16(localView, 6, 0x0800)
    writeUint16(localView, 8, 0)
    writeUint32(localView, 10, 0)
    writeUint32(localView, 14, crc)
    writeUint32(localView, 18, dataBytes.length)
    writeUint32(localView, 22, dataBytes.length)
    writeUint16(localView, 26, nameBytes.length)
    localHeader.set(nameBytes, 30)

    localParts.push(localHeader, dataBytes)

    const centralHeader = new Uint8Array(46 + nameBytes.length)
    const centralView = new DataView(centralHeader.buffer)

    writeUint32(centralView, 0, 0x02014b50)
    writeUint16(centralView, 4, 20)
    writeUint16(centralView, 6, 20)
    writeUint16(centralView, 8, 0x0800)
    writeUint16(centralView, 10, 0)
    writeUint32(centralView, 12, 0)
    writeUint32(centralView, 16, crc)
    writeUint32(centralView, 20, dataBytes.length)
    writeUint32(centralView, 24, dataBytes.length)
    writeUint16(centralView, 28, nameBytes.length)
    writeUint32(centralView, 42, localOffset)
    centralHeader.set(nameBytes, 46)

    centralParts.push(centralHeader)
    localOffset += localHeader.length + dataBytes.length
  })

  const centralDirectory = concatBytes(centralParts)
  const endRecord = new Uint8Array(22)
  const endView = new DataView(endRecord.buffer)

  writeUint32(endView, 0, 0x06054b50)
  writeUint16(endView, 8, entries.length)
  writeUint16(endView, 10, entries.length)
  writeUint32(endView, 12, centralDirectory.length)
  writeUint32(endView, 16, localOffset)

  return concatBytes([...localParts, centralDirectory, endRecord])
}

function buildExcelEntries(records) {
  const worksheetXml = buildWorksheetXml(buildTransferRows(records))

  return [
    {
      name: '[Content_Types].xml',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`,
    },
    {
      name: '_rels/.rels',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`,
    },
    {
      name: 'xl/workbook.xml',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="加班记录" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`,
    },
    {
      name: 'xl/_rels/workbook.xml.rels',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`,
    },
    {
      name: 'xl/styles.xml',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts>
  <fills count="1"><fill><patternFill patternType="none"/></fill></fills>
  <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`,
    },
    {
      name: 'xl/worksheets/sheet1.xml',
      content: worksheetXml,
    },
  ]
}

function readUint16(bytes, offset) {
  return bytes[offset] | (bytes[offset + 1] << 8)
}

function readUint32(bytes, offset) {
  return (
    bytes[offset] |
    (bytes[offset + 1] << 8) |
    (bytes[offset + 2] << 16) |
    (bytes[offset + 3] << 24)
  ) >>> 0
}

function findEndOfCentralDirectory(bytes) {
  for (let offset = bytes.length - 22; offset >= 0; offset -= 1) {
    if (readUint32(bytes, offset) === 0x06054b50) {
      return offset
    }
  }

  return -1
}

function isZipBuffer(buffer) {
  const bytes = new Uint8Array(buffer)
  return bytes[0] === 0x50 && bytes[1] === 0x4b
}

async function inflateRaw(data) {
  if (!('DecompressionStream' in globalThis)) {
    throw new Error('当前浏览器暂不支持解析压缩的 Excel 文件，请另存为 CSV 后导入。')
  }

  const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

async function readZipEntries(buffer) {
  const bytes = new Uint8Array(buffer)
  const endOffset = findEndOfCentralDirectory(bytes)

  if (endOffset < 0) {
    throw new Error('Excel 文件格式无效。')
  }

  const totalEntries = readUint16(bytes, endOffset + 10)
  let centralOffset = readUint32(bytes, endOffset + 16)
  const entries = new Map()

  for (let index = 0; index < totalEntries; index += 1) {
    if (readUint32(bytes, centralOffset) !== 0x02014b50) {
      throw new Error('Excel 文件目录损坏。')
    }

    const method = readUint16(bytes, centralOffset + 10)
    const compressedSize = readUint32(bytes, centralOffset + 20)
    const fileNameLength = readUint16(bytes, centralOffset + 28)
    const extraLength = readUint16(bytes, centralOffset + 30)
    const commentLength = readUint16(bytes, centralOffset + 32)
    const localHeaderOffset = readUint32(bytes, centralOffset + 42)
    const fileName = textDecoder.decode(bytes.slice(centralOffset + 46, centralOffset + 46 + fileNameLength))

    if (readUint32(bytes, localHeaderOffset) !== 0x04034b50) {
      throw new Error('Excel 文件内容损坏。')
    }

    const localFileNameLength = readUint16(bytes, localHeaderOffset + 26)
    const localExtraLength = readUint16(bytes, localHeaderOffset + 28)
    const dataOffset = localHeaderOffset + 30 + localFileNameLength + localExtraLength
    const compressedData = bytes.slice(dataOffset, dataOffset + compressedSize)
    let data

    if (method === 0) {
      data = compressedData
    } else if (method === 8) {
      data = await inflateRaw(compressedData)
    } else {
      throw new Error('暂不支持此 Excel 压缩格式。')
    }

    entries.set(normalizeZipPath(fileName), data)
    centralOffset += 46 + fileNameLength + extraLength + commentLength
  }

  return entries
}

function normalizeZipPath(path) {
  return path.replace(/\\/g, '/').replace(/^\/+/, '')
}

function resolveZipTarget(baseFolder, target) {
  if (target.startsWith('/')) return normalizeZipPath(target)

  const parts = `${baseFolder}/${target}`.split('/')
  const stack = []

  parts.forEach((part) => {
    if (!part || part === '.') return
    if (part === '..') {
      stack.pop()
      return
    }
    stack.push(part)
  })

  return stack.join('/')
}

function readZipText(entries, path) {
  const entry = entries.get(normalizeZipPath(path))
  return entry ? textDecoder.decode(entry) : ''
}

function parseXml(text, emptyMessage = 'Excel 文件内容为空。') {
  if (!text) {
    throw new Error(emptyMessage)
  }

  const document = new DOMParser().parseFromString(text, 'application/xml')
  const parserError = document.querySelector('parsererror')

  if (parserError) {
    throw new Error('Excel 文件 XML 内容无效。')
  }

  return document
}

function getElementsByLocalName(parent, localName) {
  return Array.from(parent.getElementsByTagName('*')).filter((element) => element.localName === localName)
}

function getFirstWorksheetPath(entries) {
  const workbook = parseXml(readZipText(entries, 'xl/workbook.xml'), 'Excel 文件缺少工作簿。')
  const firstSheet = getElementsByLocalName(workbook, 'sheet')[0]

  if (!firstSheet) {
    throw new Error('Excel 文件缺少工作表。')
  }

  const relationshipId = firstSheet.getAttribute('r:id') ||
    firstSheet.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id')
  const relationshipsText = readZipText(entries, 'xl/_rels/workbook.xml.rels')

  if (relationshipId && relationshipsText) {
    const relationships = parseXml(relationshipsText, 'Excel 文件缺少工作表关系。')
    const targetRelationship = getElementsByLocalName(relationships, 'Relationship')
      .find((relationship) => relationship.getAttribute('Id') === relationshipId)

    if (targetRelationship) {
      return resolveZipTarget('xl', targetRelationship.getAttribute('Target') || '')
    }
  }

  const fallbackPath = 'xl/worksheets/sheet1.xml'
  if (entries.has(fallbackPath)) return fallbackPath

  const [firstWorksheetPath] = Array.from(entries.keys()).filter((path) => path.startsWith('xl/worksheets/'))
  if (!firstWorksheetPath) {
    throw new Error('Excel 文件缺少工作表内容。')
  }

  return firstWorksheetPath
}

function parseSharedStrings(text) {
  if (!text) return []

  const document = parseXml(text)
  return getElementsByLocalName(document, 'si').map((item) => {
    const textNodes = getElementsByLocalName(item, 't')
    return textNodes.map((node) => node.textContent || '').join('')
  })
}

function cleanFormatCode(formatCode) {
  return String(formatCode || '')
    .replace(/"[^"]*"/g, '')
    .replace(/\\./g, '')
    .replace(/\[[^\]]*]/g, '')
    .toLowerCase()
}

function isCustomDateFormat(formatCode) {
  const cleaned = cleanFormatCode(formatCode)
  return /[ymdhs]/.test(cleaned)
}

function isCustomTimeOnlyFormat(formatCode) {
  const cleaned = cleanFormatCode(formatCode)
  return /[hs]/.test(cleaned) && !/[yd]/.test(cleaned)
}

function parseStyles(text) {
  if (!text) {
    return {
      dateStyleIndexes: new Set(),
      timeStyleIndexes: new Set(),
    }
  }

  const document = parseXml(text)
  const customFormats = new Map()

  getElementsByLocalName(document, 'numFmt').forEach((element) => {
    customFormats.set(Number(element.getAttribute('numFmtId')), element.getAttribute('formatCode') || '')
  })

  const cellXfs = getElementsByLocalName(document, 'cellXfs')[0]
  const dateStyleIndexes = new Set()
  const timeStyleIndexes = new Set()

  if (!cellXfs) {
    return { dateStyleIndexes, timeStyleIndexes }
  }

  Array.from(cellXfs.children)
    .filter((element) => element.localName === 'xf')
    .forEach((element, index) => {
      const numFmtId = Number(element.getAttribute('numFmtId') || 0)
      const customFormat = customFormats.get(numFmtId)

      if (BUILT_IN_DATE_FORMAT_IDS.has(numFmtId) || BUILT_IN_TIME_FORMAT_IDS.has(numFmtId) || isCustomDateFormat(customFormat)) {
        dateStyleIndexes.add(index)
      }

      if (BUILT_IN_TIME_FORMAT_IDS.has(numFmtId) || isCustomTimeOnlyFormat(customFormat)) {
        timeStyleIndexes.add(index)
      }
    })

  return { dateStyleIndexes, timeStyleIndexes }
}

function padTimePart(value) {
  return String(value).padStart(2, '0')
}

function formatExcelDate(serial) {
  const epoch = Date.UTC(1899, 11, 30)
  const date = new Date(epoch + Math.floor(serial) * 24 * 60 * 60 * 1000)
  const year = date.getUTCFullYear()
  const month = padTimePart(date.getUTCMonth() + 1)
  const day = padTimePart(date.getUTCDate())

  return `${year}-${month}-${day}`
}

function formatExcelTime(serial) {
  const totalMinutes = Math.round(serial * 24 * 60)

  if (totalMinutes === 24 * 60) {
    return '24:00'
  }

  const minutesOfDay = ((totalMinutes % (24 * 60)) + (24 * 60)) % (24 * 60)
  const hours = Math.floor(minutesOfDay / 60)
  const minutes = minutesOfDay % 60

  return `${padTimePart(hours)}:${padTimePart(minutes)}`
}

function getDirectChildByLocalName(parent, localName) {
  return Array.from(parent.children).find((element) => element.localName === localName)
}

function getCellValue(cell, sharedStrings, styles) {
  const type = cell.getAttribute('t')

  if (type === 'inlineStr') {
    const inlineString = getDirectChildByLocalName(cell, 'is')
    return inlineString ? getElementsByLocalName(inlineString, 't').map((node) => node.textContent || '').join('') : ''
  }

  const valueElement = getDirectChildByLocalName(cell, 'v')
  const rawValue = valueElement?.textContent || ''

  if (type === 's') {
    return sharedStrings[Number(rawValue)] || ''
  }

  if (type === 'b') {
    return rawValue === '1' ? 'TRUE' : 'FALSE'
  }

  const styleIndex = Number(cell.getAttribute('s') || -1)
  const numericValue = Number(rawValue)

  if (rawValue && Number.isFinite(numericValue) && styles.dateStyleIndexes.has(styleIndex)) {
    return styles.timeStyleIndexes.has(styleIndex) ? formatExcelTime(numericValue) : formatExcelDate(numericValue)
  }

  return rawValue
}

function parseWorksheetRows(text, sharedStrings, styles) {
  const document = parseXml(text, 'Excel 文件缺少工作表内容。')

  return getElementsByLocalName(document, 'row').map((row, rowIndex) => {
    const cells = []
    const rowNumber = Number(row.getAttribute('r')) || rowIndex + 1

    Array.from(row.children)
      .filter((element) => element.localName === 'c')
      .forEach((cell) => {
        const ref = cell.getAttribute('r') || ''
        const [, columnName] = ref.match(/^([A-Z]+)/) || []
        const columnIndex = columnName ? columnIndexFromName(columnName) : cells.length

        cells[columnIndex] = getCellValue(cell, sharedStrings, styles)
      })

    return {
      rowNumber,
      cells: cells.map((cell) => cell ?? ''),
    }
  })
}

async function parseRecordsExcel(buffer) {
  const entries = await readZipEntries(buffer)
  const worksheetPath = getFirstWorksheetPath(entries)
  const rows = parseWorksheetRows(
    readZipText(entries, worksheetPath),
    parseSharedStrings(readZipText(entries, 'xl/sharedStrings.xml')),
    parseStyles(readZipText(entries, 'xl/styles.xml')),
  )

  return normalizeRowsToRecords(rows)
}

function parseRecordsHtmlTable(text) {
  const document = new DOMParser().parseFromString(text, 'text/html')
  const table = document.querySelector('table')

  if (!table) {
    throw new Error('Excel 文件缺少可导入的表格。')
  }

  const rows = Array.from(table.querySelectorAll('tr')).map((row, rowIndex) => ({
    rowNumber: rowIndex + 1,
    cells: Array.from(row.children)
      .filter((cell) => ['TD', 'TH'].includes(cell.tagName))
      .map((cell) => cell.textContent || ''),
  }))

  return normalizeRowsToRecords(rows)
}

export function downloadRecordsExcel(records, filename = 'daily-grind-records.xlsx') {
  const bytes = createZip(buildExcelEntries(records))
  const blob = new Blob([bytes], { type: EXCEL_MIME_TYPE })
  downloadBlob(blob, filename)
}

export function parseRecordsCsv(text) {
  const normalized = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const rows = normalized
    .split('\n')
    .map((line, index) => ({
      rowNumber: index + 1,
      cells: splitCsvLine(line),
    }))
    .filter((row) => row.cells.some((cell) => String(cell).trim()))

  return normalizeRowsToRecords(rows)
}

export async function parseRecordsFile(file) {
  const fileName = String(file.name || '').toLowerCase()
  const fileType = String(file.type || '').toLowerCase()

  if (fileName.endsWith('.csv') || fileType.includes('csv')) {
    return parseRecordsCsv(await file.text())
  }

  if (fileName.endsWith('.xlsx') || fileName.endsWith('.xlsm') || fileName.endsWith('.xls') || fileType.includes('excel') || fileType.includes('spreadsheet')) {
    const buffer = await file.arrayBuffer()

    if (isZipBuffer(buffer)) {
      return parseRecordsExcel(buffer)
    }

    const text = textDecoder.decode(buffer)
    if (/<table[\s>]/i.test(text)) {
      return parseRecordsHtmlTable(text)
    }

    throw new Error('暂不支持旧版二进制 .xls，请另存为 .xlsx 或 CSV 后导入。')
  }

  throw new Error('请选择 Excel 或 CSV 文件。')
}
