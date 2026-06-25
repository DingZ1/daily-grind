import { defineStore } from 'pinia'
import dayjs from 'dayjs'
import {
  bindDataFile,
  createDataFile,
  disconnectDataFile,
  isFileStorageSupported,
  loadBoundStoreFile,
  loadStore,
  previewDataFile,
  reconnectBoundStoreFile,
  saveStore,
  syncBoundStoreFile,
} from '../services/storage'
import { buildRecordPayload } from '../utils/overtime'
import { getDayKind } from '../utils/holiday'
import { formatDate, getQuarterKey } from '../utils/date'
import { DAY_KIND_LABELS } from '../constants/rules'
import {
  isAttendanceDay,
  isValidClockTime,
  normalizeAttendanceSegments,
  parseAttendanceSegmentsText,
  validateAttendanceSegments,
} from '../utils/attendance'

function createDefaultState() {
  return {
    settings: {
      workdayStart: '08:30',
      workdayEnd: '18:00',
    },
    records: {},
    quarterTargets: {},
    theme: 'soft',
  }
}

function createStorageState() {
  return {
    supported: isFileStorageSupported(),
    status: 'checking',
    fileName: '',
    lastSyncedAt: '',
    error: '',
  }
}

function getErrorMessage(error, fallback = '操作失败，请稍后重试。') {
  return error?.message || fallback
}

function normalizeRecord(record, date) {
  if (!record) return record
  const dayKind = normalizeDayKind(record.dayKind, record.date || date)

  return {
    ...record,
    date: record.date || date,
    dayKind,
    attendanceSegments: isAttendanceDay(dayKind)
      ? normalizeAttendanceSegments(record.attendanceSegments)
      : [],
    note: record.note || '',
    status: record.status || (record.overtimeHours >= 1 ? 'valid' : 'invalid'),
  }
}

function normalizeRecords(records) {
  return Object.entries(records || {}).reduce((map, [date, record]) => {
    map[date] = normalizeRecord(record, date)
    return map
  }, {})
}

function normalizeQuarterTargets(quarterTargets) {
  return Object.entries(quarterTargets || {}).reduce((map, [quarterKey, hours]) => {
    const numericHours = Number(hours)

    if (!quarterKey || !Number.isFinite(numericHours) || numericHours < 0) {
      return map
    }

    map[quarterKey] = Number(numericHours.toFixed(1))
    return map
  }, {})
}

const dayKindLabelMap = Object.entries(DAY_KIND_LABELS).reduce((map, [key, label]) => {
  map[label] = key
  return map
}, {})

function normalizeDayKind(dayKind, date) {
  if (DAY_KIND_LABELS[dayKind]) return dayKind
  if (dayKindLabelMap[dayKind]) return dayKindLabelMap[dayKind]
  return getDayKind(date)
}

function isValidDate(value) {
  return dayjs(value).isValid()
}

export const useOvertimeStore = defineStore('overtime', {
  state: () => ({
    ...createDefaultState(),
    loaded: false,
    storage: createStorageState(),
  }),
  getters: {
    recordList(state) {
      return Object.values(state.records).sort((left, right) => right.date.localeCompare(left.date))
    },
  },
  actions: {
    applyPayload(saved) {
      if (!saved) return

      this.settings = {
        ...this.settings,
        ...(saved.settings || {}),
      }
      this.records = normalizeRecords(saved.records)
      this.quarterTargets = normalizeQuarterTargets(saved.quarterTargets)
      this.theme = saved.theme || this.theme
    },
    buildPersistPayload() {
      return {
        settings: this.settings,
        records: this.records,
        quarterTargets: this.quarterTargets,
        theme: this.theme,
      }
    },
    async initialize() {
      if (this.loaded) return

      const saved = loadStore()
      this.applyPayload(saved)
      this.loaded = true

      this.storage.supported = isFileStorageSupported()

      if (!this.storage.supported) {
        this.storage.status = 'unsupported'
        return
      }

      this.storage.status = 'checking'

      const fileResult = await loadBoundStoreFile()

      if (fileResult.status === 'ready') {
        this.applyPayload(fileResult.payload)
        saveStore(this.buildPersistPayload())
        this.storage.status = 'ready'
        this.storage.fileName = fileResult.fileName
        this.storage.error = ''
        return
      }

      if (fileResult.status === 'needs-permission') {
        this.storage.status = 'needs-permission'
        this.storage.fileName = fileResult.fileName
        this.storage.error = ''
        return
      }

      if (fileResult.status === 'error') {
        this.storage.status = 'error'
        this.storage.fileName = fileResult.fileName
        this.storage.error = getErrorMessage(fileResult.error, '读取 JSON 数据文件失败。')
        return
      }

      this.storage.status = 'cache-only'
    },
    persist() {
      const payload = this.buildPersistPayload()

      saveStore(payload)

      if (this.storage.status === 'ready' || this.storage.status === 'syncing') {
        void this.syncStorageFile(payload).catch(() => {})
      }
    },
    async createStorageFile() {
      if (!this.storage.supported) {
        throw new Error('当前浏览器不支持直接保存 JSON 数据文件。')
      }

      const previousStorage = { ...this.storage }
      this.storage.status = 'syncing'
      this.storage.error = ''

      try {
        const result = await createDataFile(this.buildPersistPayload())

        this.storage.status = 'ready'
        this.storage.fileName = result.fileName
        this.storage.lastSyncedAt = result.savedAt
        this.storage.error = ''
        return result
      } catch (error) {
        this.storage = {
          ...previousStorage,
          error: error?.name === 'AbortError' ? previousStorage.error : getErrorMessage(error),
        }
        throw error
      }
    },
    async previewStorageFile() {
      if (!this.storage.supported) {
        throw new Error('当前浏览器不支持直接打开 JSON 数据文件。')
      }

      return previewDataFile()
    },
    async openStorageFile(filePreview) {
      if (!this.storage.supported) {
        throw new Error('当前浏览器不支持直接打开 JSON 数据文件。')
      }

      if (!filePreview?.handle || !filePreview?.payload) {
        throw new Error('没有可打开的 JSON 数据文件。')
      }

      const previousStorage = { ...this.storage }
      const previousPayload = this.buildPersistPayload()
      this.storage.status = 'syncing'
      this.storage.error = ''

      try {
        this.applyPayload(filePreview.payload)
        const payload = this.buildPersistPayload()
        const result = await bindDataFile(filePreview.handle, payload)

        saveStore(payload)

        this.storage.status = 'ready'
        this.storage.fileName = result.fileName
        this.storage.lastSyncedAt = result.savedAt
        this.storage.error = ''
        return {
          ...result,
          payload,
        }
      } catch (error) {
        this.applyPayload(previousPayload)
        saveStore(previousPayload)
        this.storage = {
          ...previousStorage,
          error: error?.name === 'AbortError' ? previousStorage.error : getErrorMessage(error),
        }
        throw error
      }
    },
    async reconnectStorageFile() {
      if (!this.storage.supported) {
        throw new Error('当前浏览器不支持直接保存 JSON 数据文件。')
      }

      this.storage.status = 'syncing'
      this.storage.error = ''

      const result = await reconnectBoundStoreFile()

      if (result.status === 'ready') {
        this.applyPayload(result.payload)
        saveStore(this.buildPersistPayload())
        this.storage.status = 'ready'
        this.storage.fileName = result.fileName
        this.storage.error = ''
        return result
      }

      if (result.status === 'needs-permission') {
        this.storage.status = 'needs-permission'
        this.storage.fileName = result.fileName
        return result
      }

      this.storage.status = 'cache-only'
      this.storage.fileName = ''
      return result
    },
    async syncStorageFile(payload = this.buildPersistPayload()) {
      if (!this.storage.supported || !this.storage.fileName) return null

      this.storage.status = 'syncing'
      this.storage.error = ''

      try {
        const result = await syncBoundStoreFile(payload)

        this.storage.status = 'ready'
        this.storage.fileName = result.fileName
        this.storage.lastSyncedAt = result.savedAt
        this.storage.error = ''
        return result
      } catch (error) {
        this.storage.status = error?.name === 'NotAllowedError' ? 'needs-permission' : 'error'
        this.storage.error = getErrorMessage(error, '同步 JSON 数据文件失败。')
        throw error
      }
    },
    async disconnectStorageFile() {
      await disconnectDataFile()

      this.storage.status = this.storage.supported ? 'cache-only' : 'unsupported'
      this.storage.fileName = ''
      this.storage.lastSyncedAt = ''
      this.storage.error = ''
    },
    saveRecord(form) {
      const date = formatDate(form.date)
      const payload = buildRecordPayload({
        date,
        dayKind: form.dayKind || getDayKind(date),
        startTime: form.startTime,
        endTime: form.endTime,
        attendanceSegments: form.attendanceSegments,
        note: form.note,
        settings: this.settings,
      })

      this.records[date] = payload
      this.persist()
      return payload
    },
    importRecords(rows) {
      let created = 0
      let updated = 0
      let skipped = 0
      const errors = []

      rows.forEach((row) => {
        const rowNumber = row.__rowNumber || '-'
        const rawDate = String(row.date || '').trim()
        const startTime = String(row.startTime || '').trim()
        const endTime = String(row.endTime || '').trim()

        if (!rawDate || !startTime || !endTime) {
          skipped += 1
          errors.push(`第 ${rowNumber} 行缺少日期或时间字段。`)
          return
        }

        if (!isValidDate(rawDate)) {
          skipped += 1
          errors.push(`第 ${rowNumber} 行日期格式无效。`)
          return
        }

        if (!isValidClockTime(startTime) || !isValidClockTime(endTime)) {
          skipped += 1
          errors.push(`第 ${rowNumber} 行时间格式无效。`)
          return
        }

        const date = formatDate(rawDate)
        const dayKind = normalizeDayKind(row.dayKind || row.dayKindLabel, date)
        const attendanceValidation = validateAttendanceSegments(
          isAttendanceDay(dayKind)
            ? parseAttendanceSegmentsText(row.attendanceSegments)
            : [],
        )

        if (!attendanceValidation.valid) {
          skipped += 1
          errors.push(`第 ${rowNumber} 行${attendanceValidation.message}`)
          return
        }

        const payload = buildRecordPayload({
          date,
          dayKind,
          startTime,
          endTime,
          attendanceSegments: attendanceValidation.segments,
          note: row.note || '',
          settings: this.settings,
        })

        if (this.records[date]) {
          updated += 1
        } else {
          created += 1
        }

        this.records[date] = payload
      })

      if (created || updated) {
        this.persist()
      }

      return {
        created,
        updated,
        skipped,
        errors,
      }
    },
    removeRecord(date) {
      delete this.records[formatDate(date)]
      this.persist()
    },
    updateSettings(nextSettings) {
      this.settings = {
        ...this.settings,
        ...nextSettings,
      }
      this.persist()
    },
    updateQuarterTarget(referenceDate, hours) {
      const numericHours = Number(hours)

      if (!Number.isFinite(numericHours) || numericHours < 0) {
        return
      }

      this.quarterTargets = {
        ...this.quarterTargets,
        [getQuarterKey(referenceDate)]: Number(numericHours.toFixed(1)),
      }
      this.persist()
    },
    clearQuarterTarget(referenceDate) {
      const quarterKey = getQuarterKey(referenceDate)

      if (!Object.prototype.hasOwnProperty.call(this.quarterTargets, quarterKey)) {
        return
      }

      const nextQuarterTargets = { ...this.quarterTargets }
      delete nextQuarterTargets[quarterKey]

      this.quarterTargets = nextQuarterTargets
      this.persist()
    },
    updateTheme(theme) {
      this.theme = theme
      this.persist()
    },
    getRecordByDate(date) {
      return this.records[formatDate(date)] || null
    },
    getQuarterTotals(referenceDate) {
      const current = dayjs(referenceDate)
      const quarter = Math.floor(current.month() / 3)
      const start = dayjs(new Date(current.year(), quarter * 3, 1))
      const end = start.add(3, 'month').subtract(1, 'day')

      return this.recordList
        .filter((record) => {
          const recordDate = dayjs(record.date)
          return (recordDate.isAfter(start) || recordDate.isSame(start, 'day')) &&
            (recordDate.isBefore(end) || recordDate.isSame(end, 'day'))
        })
        .reduce((sum, record) => sum + record.overtimeHours, 0)
    },
  },
})
