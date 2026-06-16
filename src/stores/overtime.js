import { defineStore } from 'pinia'
import dayjs from 'dayjs'
import { loadStore, saveStore } from '../services/storage'
import { buildRecordPayload } from '../utils/overtime'
import { getDayKind } from '../utils/holiday'
import { formatDate } from '../utils/date'
import { DAY_KIND_LABELS } from '../constants/rules'

function createDefaultState() {
  return {
    settings: {
      workdayStart: '08:30',
      workdayEnd: '18:00',
    },
    records: {},
    theme: 'auto',
  }
}

function normalizeRecord(record) {
  if (!record) return record

  return {
    ...record,
    note: record.note || '',
    status: record.status || (record.overtimeHours >= 1 ? 'valid' : 'invalid'),
  }
}

function normalizeRecords(records) {
  return Object.entries(records || {}).reduce((map, [date, record]) => {
    map[date] = normalizeRecord(record)
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

function isValidTime(value) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value) || value === '24:00'
}

export const useOvertimeStore = defineStore('overtime', {
  state: () => ({
    ...createDefaultState(),
    loaded: false,
  }),
  getters: {
    recordList(state) {
      return Object.values(state.records).sort((left, right) => right.date.localeCompare(left.date))
    },
  },
  actions: {
    initialize() {
      if (this.loaded) return

      const saved = loadStore()
      if (saved) {
        this.settings = saved.settings || this.settings
        this.records = normalizeRecords(saved.records)
        this.theme = saved.theme || this.theme
      }

      this.loaded = true
    },
    persist() {
      saveStore({
        settings: this.settings,
        records: this.records,
        theme: this.theme,
      })
    },
    saveRecord(form) {
      const date = formatDate(form.date)
      const payload = buildRecordPayload({
        date,
        dayKind: form.dayKind || getDayKind(date),
        startTime: form.startTime,
        endTime: form.endTime,
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

        if (!isValidTime(startTime) || !isValidTime(endTime)) {
          skipped += 1
          errors.push(`第 ${rowNumber} 行时间格式无效。`)
          return
        }

        const date = formatDate(rawDate)
        const payload = buildRecordPayload({
          date,
          dayKind: normalizeDayKind(row.dayKind || row.dayKindLabel, date),
          startTime,
          endTime,
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
