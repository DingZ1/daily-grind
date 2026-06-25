import dayjs from 'dayjs'
import { OVERTIME_RULES, DAY_KIND_LABELS } from '../constants/rules'
import {
  isAttendanceDay,
  normalizeAttendanceSegments,
  parseClockTimeToMinutes,
} from './attendance'

const FREE_LATE_LIMIT = 3
const FREE_LATE_MAX_MINUTES = 20
const PAID_LATE_MAX_MINUTES = 30
const LATE_FINE_AMOUNT = 20
const LEAVE_ROUND_MINUTES = 30

function getTimeOrDefault(time, fallback) {
  return parseClockTimeToMinutes(time) ?? parseClockTimeToMinutes(fallback)
}

function formatClockTime(minutes) {
  if (minutes === 24 * 60) return '24:00'

  const hours = Math.floor(minutes / 60)
  const remain = minutes % 60
  return `${String(hours).padStart(2, '0')}:${String(remain).padStart(2, '0')}`
}

function getWorkIntervals(settings) {
  const workStart = getTimeOrDefault(settings?.workdayStart, OVERTIME_RULES.defaultWorkdayStart)
  const workEnd = getTimeOrDefault(settings?.workdayEnd, OVERTIME_RULES.defaultWorkdayEnd)
  const lunchStart = parseClockTimeToMinutes(OVERTIME_RULES.lunchBreak[0])
  const lunchEnd = parseClockTimeToMinutes(OVERTIME_RULES.lunchBreak[1])

  if (workStart === null || workEnd === null || workEnd <= workStart) {
    return {
      workStart: parseClockTimeToMinutes(OVERTIME_RULES.defaultWorkdayStart),
      intervals: [],
    }
  }

  const intervals = []

  if (lunchStart !== null && lunchEnd !== null && lunchStart > workStart && lunchStart < workEnd) {
    intervals.push([workStart, Math.min(lunchStart, workEnd)])

    if (lunchEnd < workEnd) {
      intervals.push([Math.max(lunchEnd, workStart), workEnd])
    }
  } else {
    intervals.push([workStart, workEnd])
  }

  return {
    workStart,
    intervals: intervals.filter(([start, end]) => end > start),
  }
}

function buildAttendanceIntervals(segments) {
  return normalizeAttendanceSegments(segments)
    .map((segment) => {
      const start = parseClockTimeToMinutes(segment.startTime)
      const end = parseClockTimeToMinutes(segment.endTime)

      return start !== null && end !== null && end > start ? [start, end] : null
    })
    .filter(Boolean)
}

function mergeIntervals(intervals) {
  return [...intervals]
    .sort((left, right) => left[0] - right[0])
    .reduce((merged, interval) => {
      const previous = merged[merged.length - 1]

      if (!previous || interval[0] > previous[1]) {
        merged.push([...interval])
        return merged
      }

      previous[1] = Math.max(previous[1], interval[1])
      return merged
    }, [])
}

function subtractCoveredIntervals(workIntervals, coveredIntervals) {
  const covered = mergeIntervals(coveredIntervals)
  const gaps = []

  workIntervals.forEach(([workStart, workEnd]) => {
    let cursor = workStart

    covered.forEach(([coverStart, coverEnd]) => {
      if (coverEnd <= cursor || coverStart >= workEnd) return

      if (coverStart > cursor) {
        gaps.push([cursor, Math.min(coverStart, workEnd)])
      }

      cursor = Math.max(cursor, coverEnd)
    })

    if (cursor < workEnd) {
      gaps.push([cursor, workEnd])
    }
  })

  return gaps.filter(([start, end]) => end > start)
}

function roundLeaveMinutes(minutes) {
  if (minutes <= 0) return 0
  return Math.ceil(minutes / LEAVE_ROUND_MINUTES) * LEAVE_ROUND_MINUTES
}

function buildLeaveRanges(gaps) {
  return gaps.map(([start, end]) => ({
    startTime: formatClockTime(start),
    endTime: formatClockTime(end),
    minutes: end - start,
  }))
}

function formatDateLabel(date) {
  return dayjs(date).format('M月D日')
}

export function formatAttendanceHours(hours) {
  return `${Number(hours || 0).toFixed(1)}h`
}

export function buildMonthlyAttendanceSummary({ records, referenceDate, settings }) {
  const monthKey = dayjs(referenceDate).format('YYYY-MM')
  const workConfig = getWorkIntervals(settings)
  const freeLateRecords = []
  const paidLateRecords = []
  const leaveRecords = []
  let freeLateCount = 0

  const monthlyRecords = [...(records || [])]
    .filter((record) => record?.date?.startsWith(monthKey) && isAttendanceDay(record.dayKind))
    .sort((left, right) => left.date.localeCompare(right.date))

  monthlyRecords.forEach((record) => {
    const attendanceIntervals = buildAttendanceIntervals(record.attendanceSegments)
    const firstStart = attendanceIntervals.length
      ? Math.min(...attendanceIntervals.map(([start]) => start))
      : null
    const lateMinutes = firstStart !== null
      ? Math.max(0, firstStart - workConfig.workStart)
      : 0
    const coveredForLeave = [...attendanceIntervals]

    if (lateMinutes > 0 && lateMinutes <= PAID_LATE_MAX_MINUTES) {
      coveredForLeave.push([workConfig.workStart, firstStart])

      if (lateMinutes <= FREE_LATE_MAX_MINUTES && freeLateCount < FREE_LATE_LIMIT) {
        freeLateCount += 1
        freeLateRecords.push({
          date: record.date,
          dateLabel: formatDateLabel(record.date),
          dayKindLabel: DAY_KIND_LABELS[record.dayKind] || '',
          minutes: lateMinutes,
          startTime: formatClockTime(firstStart),
        })
      } else {
        paidLateRecords.push({
          date: record.date,
          dateLabel: formatDateLabel(record.date),
          dayKindLabel: DAY_KIND_LABELS[record.dayKind] || '',
          minutes: lateMinutes,
          fineAmount: LATE_FINE_AMOUNT,
          startTime: formatClockTime(firstStart),
        })
      }
    }

    const leaveRanges = buildLeaveRanges(
      subtractCoveredIntervals(workConfig.intervals, coveredForLeave),
    )
    const leaveMinutes = leaveRanges.reduce((sum, range) => sum + range.minutes, 0)
    const roundedLeaveMinutes = roundLeaveMinutes(leaveMinutes)

    if (roundedLeaveMinutes > 0) {
      leaveRecords.push({
        date: record.date,
        dateLabel: formatDateLabel(record.date),
        dayKindLabel: DAY_KIND_LABELS[record.dayKind] || '',
        rawMinutes: leaveMinutes,
        roundedMinutes: roundedLeaveMinutes,
        hours: roundedLeaveMinutes / 60,
        ranges: leaveRanges,
      })
    }
  })

  const paidLateCount = paidLateRecords.length
  const leaveMinutes = leaveRecords.reduce((sum, record) => sum + record.roundedMinutes, 0)

  return {
    monthKey,
    trackedDayCount: monthlyRecords.length,
    freeLateLimit: FREE_LATE_LIMIT,
    freeLateCount,
    paidLateCount,
    lateFineAmount: paidLateCount * LATE_FINE_AMOUNT,
    leaveHours: leaveMinutes / 60,
    freeLateRecords,
    paidLateRecords,
    leaveRecords,
  }
}
