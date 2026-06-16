import dayjs from 'dayjs'
import { getHolidayConfig } from '../services/holidayService'

export function getDayKind(date) {
  const current = dayjs(date)
  const dateString = current.format('YYYY-MM-DD')
  const config = getHolidayConfig(current.year())

  if (config.workdays.includes(dateString)) {
    return 'makeup-workday'
  }

  if (config.holidays.includes(dateString)) {
    return 'holiday'
  }

  const weekday = current.day()
  return weekday === 0 || weekday === 6 ? 'weekend' : 'workday'
}

export function getHolidayLabel(date) {
  const current = dayjs(date)
  const config = getHolidayConfig(current.year())
  return config.festivalMap[current.format('YYYY-MM-DD')] || ''
}
