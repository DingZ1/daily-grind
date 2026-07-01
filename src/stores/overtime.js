import { defineStore } from 'pinia'
import dayjs from 'dayjs'
import {
  bindDataFile,
  createSyncMeta,
  createDataFile,
  disconnectDataFile,
  getStorageKind,
  isFileStorageSupported,
  loadBoundStoreFile,
  loadStore,
  mergeStorePayloads,
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
    syncMeta: createSyncMeta(),
  }
}

function createStorageState() {
  return {
    supported: isFileStorageSupported(),
    kind: getStorageKind(),
    status: 'checking',
    fileName: '',
    filePath: '',
    lastSyncedAt: '',
    error: '',
  }
}

function getErrorMessage(error, fallback = '操作失败，请稍后重试。') {
  return error?.message || fallback
}

function nowIso() {
  return new Date().toISOString()
}

function normalizeSyncMetaState(syncMeta) {
  const normalized = createSyncMeta()

  if (!syncMeta || typeof syncMeta !== 'object') {
    return normalized
  }

  normalized.settings = { ...(syncMeta.settings || {}) }
  normalized.records = { ...(syncMeta.records || {}) }
  normalized.quarterTargets = { ...(syncMeta.quarterTargets || {}) }
  normalized.theme = syncMeta.theme || ''
  normalized.deleted = {
    records: { ...(syncMeta.deleted?.records || {}) },
    quarterTargets: { ...(syncMeta.deleted?.quarterTargets || {}) },
  }

  return normalized
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
    hasLocalPayload: false,
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
      this.syncMeta = normalizeSyncMetaState(saved.syncMeta)
    },
    buildPersistPayload() {
      return {
        settings: this.settings,
        records: this.records,
        quarterTargets: this.quarterTargets,
        theme: this.theme,
        syncMeta: normalizeSyncMetaState(this.syncMeta),
      }
    },
    applyStorageReady(result) {
      this.storage.status = 'ready'
      this.storage.kind = getStorageKind()
      this.storage.fileName = result.fileName || ''
      this.storage.filePath = result.filePath || ''
      this.storage.lastSyncedAt = result.savedAt || this.storage.lastSyncedAt
      this.storage.error = ''
    },
    ensureSyncMeta() {
      this.syncMeta = normalizeSyncMetaState(this.syncMeta)
      return this.syncMeta
    },
    touchSettings(fields, timestamp = nowIso()) {
      const meta = this.ensureSyncMeta()

      fields.forEach((field) => {
        meta.settings[field] = timestamp
      })
    },
    touchRecord(date, timestamp = nowIso()) {
      const meta = this.ensureSyncMeta()

      meta.records[date] = timestamp
      delete meta.deleted.records[date]
    },
    tombstoneRecord(date, timestamp = nowIso()) {
      const meta = this.ensureSyncMeta()

      delete meta.records[date]
      meta.deleted.records[date] = timestamp
    },
    touchQuarterTarget(quarterKey, timestamp = nowIso()) {
      const meta = this.ensureSyncMeta()

      meta.quarterTargets[quarterKey] = timestamp
      delete meta.deleted.quarterTargets[quarterKey]
    },
    tombstoneQuarterTarget(quarterKey, timestamp = nowIso()) {
      const meta = this.ensureSyncMeta()

      delete meta.quarterTargets[quarterKey]
      meta.deleted.quarterTargets[quarterKey] = timestamp
    },
    touchTheme(timestamp = nowIso()) {
      const meta = this.ensureSyncMeta()
      meta.theme = timestamp
    },
    async initialize() {
      if (this.loaded) return

      const saved = loadStore()
      if (saved) {
        this.applyPayload(saved)
        this.hasLocalPayload = true
        saveStore(this.buildPersistPayload())
      }

      this.loaded = true

      this.storage.supported = isFileStorageSupported()
      this.storage.kind = getStorageKind()

      if (!this.storage.supported) {
        this.storage.status = 'unsupported'
        return
      }

      this.storage.status = 'checking'

      const fileResult = await loadBoundStoreFile()

      if (fileResult.status === 'ready') {
        const payload = this.hasLocalPayload
          ? mergeStorePayloads(this.buildPersistPayload(), fileResult.payload)
          : fileResult.payload

        this.applyPayload(payload)
        this.hasLocalPayload = true
        saveStore(this.buildPersistPayload())
        this.applyStorageReady(fileResult)
        await this.syncStorageFile(this.buildPersistPayload()).catch(() => {})
        return
      }

      if (fileResult.status === 'needs-permission') {
        this.storage.status = 'needs-permission'
        this.storage.fileName = fileResult.fileName
        this.storage.filePath = fileResult.filePath || ''
        this.storage.error = ''
        return
      }

      if (fileResult.status === 'error') {
        this.storage.status = 'error'
        this.storage.fileName = fileResult.fileName
        this.storage.filePath = fileResult.filePath || ''
        this.storage.error = getErrorMessage(fileResult.error, '读取 JSON 数据文件失败。')
        return
      }

      this.storage.status = 'cache-only'
    },
    persist() {
      const payload = this.buildPersistPayload()

      this.hasLocalPayload = true
      saveStore(payload)

      if (this.storage.status === 'ready' || this.storage.status === 'syncing') {
        void this.syncStorageFile(payload).catch(() => {})
      }
    },
    async createStorageFile() {
      if (!this.storage.supported) {
        throw new Error('当前环境不支持直接保存 JSON 数据文件。')
      }

      const previousStorage = { ...this.storage }
      this.storage.status = 'syncing'
      this.storage.error = ''

      try {
        const result = await createDataFile(this.buildPersistPayload())

        if (result.payload) {
          this.applyPayload(result.payload)
        }

        this.hasLocalPayload = true
        saveStore(this.buildPersistPayload())
        this.applyStorageReady(result)
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
        throw new Error('当前环境不支持直接打开 JSON 数据文件。')
      }

      return previewDataFile()
    },
    async openStorageFile(filePreview) {
      if (!this.storage.supported) {
        throw new Error('当前环境不支持直接打开 JSON 数据文件。')
      }

      if ((!filePreview?.handle && !filePreview?.filePath) || !filePreview?.payload) {
        throw new Error('没有可打开的 JSON 数据文件。')
      }

      const previousStorage = { ...this.storage }
      const previousPayload = this.buildPersistPayload()
      const previousHasLocalPayload = this.hasLocalPayload
      this.storage.status = 'syncing'
      this.storage.error = ''

      try {
        const mergedPayload = this.hasLocalPayload
          ? mergeStorePayloads(previousPayload, filePreview.payload)
          : filePreview.payload

        this.applyPayload(mergedPayload)
        const payload = this.buildPersistPayload()
        const result = await bindDataFile(filePreview, payload)

        if (result.payload) {
          this.applyPayload(result.payload)
        }

        this.hasLocalPayload = true
        saveStore(this.buildPersistPayload())

        this.applyStorageReady(result)
        return {
          ...result,
          payload: this.buildPersistPayload(),
        }
      } catch (error) {
        this.applyPayload(previousPayload)
        saveStore(previousPayload)
        this.hasLocalPayload = previousHasLocalPayload
        this.storage = {
          ...previousStorage,
          error: error?.name === 'AbortError' ? previousStorage.error : getErrorMessage(error),
        }
        throw error
      }
    },
    async reconnectStorageFile() {
      if (!this.storage.supported) {
        throw new Error('当前环境不支持直接保存 JSON 数据文件。')
      }

      this.storage.status = 'syncing'
      this.storage.error = ''

      const result = await reconnectBoundStoreFile()

      if (result.status === 'ready') {
        const payload = this.hasLocalPayload
          ? mergeStorePayloads(this.buildPersistPayload(), result.payload)
          : result.payload

        this.applyPayload(payload)
        this.hasLocalPayload = true
        saveStore(this.buildPersistPayload())
        this.applyStorageReady(result)
        await this.syncStorageFile(this.buildPersistPayload()).catch(() => {})
        return result
      }

      if (result.status === 'needs-permission') {
        this.storage.status = 'needs-permission'
        this.storage.fileName = result.fileName
        this.storage.filePath = result.filePath || ''
        return result
      }

      this.storage.status = 'cache-only'
      this.storage.fileName = ''
      this.storage.filePath = ''
      return result
    },
    async refreshFromStorageFile() {
      if (
        !this.loaded ||
        !this.storage.supported ||
        !this.storage.fileName ||
        this.storage.status === 'checking' ||
        this.storage.status === 'syncing'
      ) {
        return null
      }

      const previousStorage = { ...this.storage }

      try {
        const result = await reconnectBoundStoreFile()

        if (result.status === 'ready') {
          const payload = this.hasLocalPayload
            ? mergeStorePayloads(this.buildPersistPayload(), result.payload)
            : result.payload

          this.applyPayload(payload)
          this.hasLocalPayload = true
          saveStore(this.buildPersistPayload())
          this.applyStorageReady(result)
          await this.syncStorageFile(this.buildPersistPayload()).catch(() => {})
          return result
        }

        if (result.status === 'needs-permission') {
          this.storage.status = 'needs-permission'
          this.storage.fileName = result.fileName
          this.storage.filePath = result.filePath || ''
          return result
        }

        return result
      } catch (error) {
        this.storage = {
          ...previousStorage,
          error: getErrorMessage(error, previousStorage.error),
        }
        return null
      }
    },
    async syncStorageFile(payload = this.buildPersistPayload()) {
      if (!this.storage.supported || !this.storage.fileName) return null

      this.storage.status = 'syncing'
      this.storage.error = ''

      try {
        const result = await syncBoundStoreFile(payload)

        if (result.payload) {
          this.applyPayload(result.payload)
          this.hasLocalPayload = true
          saveStore(this.buildPersistPayload())
        }

        this.applyStorageReady(result)
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
      this.storage.filePath = ''
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
      this.touchRecord(date)
      this.persist()
      return payload
    },
    importRecords(rows) {
      let created = 0
      let updated = 0
      let skipped = 0
      const errors = []
      const changedDates = []

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
        changedDates.push(date)
      })

      if (created || updated) {
        const timestamp = nowIso()
        changedDates.forEach((date) => this.touchRecord(date, timestamp))
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
      const formattedDate = formatDate(date)

      delete this.records[formattedDate]
      this.tombstoneRecord(formattedDate)
      this.persist()
    },
    updateSettings(nextSettings) {
      const changedFields = Object.entries(nextSettings || {})
        .filter(([field, value]) => this.settings[field] !== value)
        .map(([field]) => field)

      if (!changedFields.length) return

      this.settings = {
        ...this.settings,
        ...nextSettings,
      }
      this.touchSettings(changedFields)
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
      this.touchQuarterTarget(getQuarterKey(referenceDate))
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
      this.tombstoneQuarterTarget(quarterKey)
      this.persist()
    },
    updateTheme(theme) {
      if (this.theme === theme) return

      this.theme = theme
      this.touchTheme()
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
