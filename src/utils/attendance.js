import { OVERTIME_RULES } from '../constants/rules'

export function isAttendanceDay(dayKind) {
  return dayKind === 'workday' || dayKind === 'makeup-workday'
}

export function isValidClockTime(value) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value) || value === '24:00'
}

export function parseClockTimeToMinutes(time) {
  if (!isValidClockTime(time)) return null
  if (time === '24:00') return 24 * 60

  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

export function createDefaultAttendanceSegments({ dayKind, settings }) {
  if (!isAttendanceDay(dayKind)) return []

  return [
    {
      startTime: settings?.workdayStart || OVERTIME_RULES.defaultWorkdayStart,
      endTime: settings?.workdayEnd || OVERTIME_RULES.defaultWorkdayEnd,
    },
  ]
}

export function normalizeAttendanceSegments(segments) {
  if (!Array.isArray(segments)) return []

  return segments
    .map((segment) => ({
      startTime: String(segment?.startTime || '').trim(),
      endTime: String(segment?.endTime || '').trim(),
    }))
    .filter((segment) => segment.startTime || segment.endTime)
    .sort((left, right) => {
      const leftMinutes = parseClockTimeToMinutes(left.startTime)
      const rightMinutes = parseClockTimeToMinutes(right.startTime)

      return (leftMinutes ?? Number.MAX_SAFE_INTEGER) - (rightMinutes ?? Number.MAX_SAFE_INTEGER)
    })
}

export function validateAttendanceSegments(segments) {
  const normalizedSegments = normalizeAttendanceSegments(segments)

  for (let index = 0; index < normalizedSegments.length; index += 1) {
    const segment = normalizedSegments[index]
    const start = parseClockTimeToMinutes(segment.startTime)
    const end = parseClockTimeToMinutes(segment.endTime)

    if (start === null || end === null) {
      return {
        valid: false,
        segments: normalizedSegments,
        message: `第 ${index + 1} 段打卡时间格式无效。`,
      }
    }

    if (end <= start) {
      return {
        valid: false,
        segments: normalizedSegments,
        message: `第 ${index + 1} 段打卡结束时间需要晚于开始时间。`,
      }
    }

    if (index > 0) {
      const previousEnd = parseClockTimeToMinutes(normalizedSegments[index - 1].endTime)

      if (previousEnd !== null && start < previousEnd) {
        return {
          valid: false,
          segments: normalizedSegments,
          message: `第 ${index} 段和第 ${index + 1} 段打卡时间不能重叠。`,
        }
      }
    }
  }

  return {
    valid: true,
    segments: normalizedSegments,
    message: '',
  }
}

export function formatAttendanceSegments(segments) {
  return normalizeAttendanceSegments(segments)
    .map((segment) => `${segment.startTime}-${segment.endTime}`)
    .join('; ')
}

export function parseAttendanceSegmentsText(value) {
  const text = String(value || '').trim()
  if (!text) return []

  return text
    .split(/[;；]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const [, startTime = item, endTime = ''] = item.match(/^(.+?)\s*(?:-|~|至|到)\s*(.+)$/) || []

      return {
        startTime: startTime.trim(),
        endTime: endTime.trim(),
      }
    })
}
