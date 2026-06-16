import dayjs from 'dayjs'
import { OVERTIME_RULES } from '../constants/rules'

function parseTimeToMinutes(time) {
  if (!time) return null
  if (time === '24:00') return 24 * 60

  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

function getOverlapMinutes(rangeA, rangeB) {
  const start = Math.max(rangeA[0], rangeB[0])
  const end = Math.min(rangeA[1], rangeB[1])
  return Math.max(0, end - start)
}

function subtractBreaks(start, end) {
  const breakRanges = [
    {
      label: '午休 12:00-13:30',
      range: OVERTIME_RULES.lunchBreak.map(parseTimeToMinutes),
    },
    {
      label: '晚休 18:00-19:00',
      range: OVERTIME_RULES.dinnerBreak.map(parseTimeToMinutes),
    },
  ]

  const overlaps = breakRanges
    .map((item) => {
      const minutes = getOverlapMinutes([start, end], item.range)
      return minutes > 0 ? { label: item.label, minutes } : null
    })
    .filter(Boolean)

  const breakMinutes = overlaps.reduce((sum, item) => sum + item.minutes, 0)

  return {
    minutes: end - start - breakMinutes,
    overlaps,
  }
}

function normalizeHours(hours) {
  if (hours < OVERTIME_RULES.minimumEffectiveHours) {
    return 0
  }

  const steps = Math.floor(hours / OVERTIME_RULES.stepHours)
  return Number((steps * OVERTIME_RULES.stepHours).toFixed(1))
}

function formatMinutes(minutes) {
  const hours = Math.floor(minutes / 60)
  const remain = minutes % 60
  return `${hours}小时${remain ? `${remain}分钟` : ''}`
}

export function explainOvertime({ dayKind, startTime, endTime, settings }) {
  const companySettings = {
    workdayStart: settings?.workdayStart || OVERTIME_RULES.defaultWorkdayStart,
    workdayEnd: settings?.workdayEnd || OVERTIME_RULES.defaultWorkdayEnd,
  }

  const start = parseTimeToMinutes(startTime)
  const end = parseTimeToMinutes(endTime)

  if (start === null || end === null || end <= start) {
    return {
      normalizedHours: 0,
      rawMinutes: 0,
      effectiveMinutes: 0,
      overlaps: [],
      message: '结束时间需要晚于开始时间。',
    }
  }

  if (dayKind === 'workday' || dayKind === 'makeup-workday') {
    const effectiveStart = Math.max(
      start,
      parseTimeToMinutes(OVERTIME_RULES.weekdayOvertimeStart),
      parseTimeToMinutes(companySettings.workdayEnd),
    )

    if (end <= effectiveStart) {
      return {
        normalizedHours: 0,
        rawMinutes: end - start,
        effectiveMinutes: 0,
        overlaps: [],
        message: '工作日只统计 19:00 之后的加班时间。',
      }
    }

    const result = subtractBreaks(effectiveStart, end)
    return {
      normalizedHours: normalizeHours(result.minutes / 60),
      rawMinutes: end - start,
      effectiveMinutes: result.minutes,
      overlaps: result.overlaps,
      message: '',
    }
  }

  const weekendStart = Math.max(start, parseTimeToMinutes(OVERTIME_RULES.weekendWindow[0]))
  const weekendEnd = Math.min(end, parseTimeToMinutes(OVERTIME_RULES.weekendWindow[1]))

  if (weekendEnd <= weekendStart) {
    return {
      normalizedHours: 0,
      rawMinutes: end - start,
      effectiveMinutes: 0,
      overlaps: [],
      message: '休息日只支持 08:30 到 24:00 之间的时间。',
    }
  }

  const result = subtractBreaks(weekendStart, weekendEnd)
  return {
    normalizedHours: normalizeHours(result.minutes / 60),
    rawMinutes: end - start,
    effectiveMinutes: result.minutes,
    overlaps: result.overlaps,
    message: '',
  }
}

export function calculateOvertimeHours({ dayKind, startTime, endTime, settings }) {
  return explainOvertime({ dayKind, startTime, endTime, settings }).normalizedHours
}

export function buildOvertimePreviewText(explanation) {
  if (explanation.message) {
    return explanation.message
  }

  const parts = [
    `原始时段 ${formatMinutes(explanation.rawMinutes)}`,
    `扣减后 ${formatMinutes(Math.max(explanation.effectiveMinutes, 0))}`,
  ]

  if (explanation.overlaps.length) {
    parts.push(`已扣除 ${explanation.overlaps.map((item) => `${item.label}（${formatMinutes(item.minutes)}）`).join('、')}`)
  }

  if (explanation.normalizedHours < 1) {
    parts.push('不足 1 小时，本次不会计入')
  } else {
    parts.push(`最终计入 ${explanation.normalizedHours.toFixed(1)}h`)
  }

  return parts.join('，')
}

export function buildRecordPayload({ date, dayKind, startTime, endTime, note, settings }) {
  const overtimeHours = calculateOvertimeHours({ dayKind, startTime, endTime, settings })

  return {
    date,
    dayKind,
    startTime,
    endTime,
    note: note || '',
    overtimeHours,
    status: overtimeHours >= OVERTIME_RULES.minimumEffectiveHours ? 'valid' : 'invalid',
    updatedAt: dayjs().format(),
  }
}
