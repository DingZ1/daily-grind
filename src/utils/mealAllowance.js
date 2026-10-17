import { parseClockTimeToMinutes } from './attendance'

export const MEAL_ALLOWANCE_RULES = {
  amount: 25,
  daytimeWindow: ['08:30', '18:00'],
  lunchBreak: ['12:00', '13:30'],
  eveningStart: '19:00',
  daytimeMinimumMinutes: 360,
  eveningMinimumMinutes: 90,
}

const DAY_KINDS = new Set(['workday', 'makeup-workday', 'weekend', 'holiday'])

function overlapMinutes(start, end, windowStart, windowEnd) {
  return Math.max(0, Math.min(end, windowEnd) - Math.max(start, windowStart))
}

export function calculateMealAllowance({ dayKind, startTime, endTime } = {}) {
  const result = {
    daytimeMinutes: 0,
    eveningMinutes: 0,
    daytimeAmount: 0,
    eveningAmount: 0,
    totalAmount: 0,
  }

  if (!DAY_KINDS.has(dayKind) || typeof startTime !== 'string' || typeof endTime !== 'string') {
    return result
  }

  const start = parseClockTimeToMinutes(startTime)
  const end = parseClockTimeToMinutes(endTime)

  if (start === null || end === null || end <= start) return result

  if (dayKind === 'weekend' || dayKind === 'holiday') {
    const daytimeStart = Math.max(start, parseClockTimeToMinutes(MEAL_ALLOWANCE_RULES.daytimeWindow[0]))
    const daytimeEnd = Math.min(end, parseClockTimeToMinutes(MEAL_ALLOWANCE_RULES.daytimeWindow[1]))
    const lunchStart = parseClockTimeToMinutes(MEAL_ALLOWANCE_RULES.lunchBreak[0])
    const lunchEnd = parseClockTimeToMinutes(MEAL_ALLOWANCE_RULES.lunchBreak[1])

    result.daytimeMinutes = Math.max(0, daytimeEnd - daytimeStart)
      - overlapMinutes(daytimeStart, daytimeEnd, lunchStart, lunchEnd)
    result.daytimeAmount = result.daytimeMinutes >= MEAL_ALLOWANCE_RULES.daytimeMinimumMinutes
      ? MEAL_ALLOWANCE_RULES.amount
      : 0
  }

  result.eveningMinutes = overlapMinutes(
    start,
    end,
    parseClockTimeToMinutes(MEAL_ALLOWANCE_RULES.eveningStart),
    24 * 60,
  )
  result.eveningAmount = result.eveningMinutes >= MEAL_ALLOWANCE_RULES.eveningMinimumMinutes
    ? MEAL_ALLOWANCE_RULES.amount
    : 0
  result.totalAmount = result.daytimeAmount + result.eveningAmount

  return result
}

export function sumMealAllowance(records = []) {
  return records.reduce((sum, record) => sum + calculateMealAllowance(record || {}).totalAmount, 0)
}
