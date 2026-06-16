import { holidayRegistry } from '../data/holidays'
import dayjs from 'dayjs'

function expandDateRange(range) {
  const [start, end] = range
  const dates = []
  let cursor = dayjs(start)
  const boundary = dayjs(end)

  while (cursor.isBefore(boundary) || cursor.isSame(boundary, 'day')) {
    dates.push(cursor.format('YYYY-MM-DD'))
    cursor = cursor.add(1, 'day')
  }

  return dates
}

function uniq(list) {
  return [...new Set(list)]
}

export function getHolidayConfig(year) {
  const raw = holidayRegistry[year]

  if (!raw) {
    return {
      year,
      holidays: [],
      workdays: [],
      holidayPeriods: [],
      festivalMap: {},
      source: '',
    }
  }

  const holidayPeriods = raw.holidayPeriods || []
  const periodDates = holidayPeriods.flatMap((item) => expandDateRange(item.range))
  const holidays = uniq([...(raw.holidays || []), ...periodDates])
  const festivalMap = holidayPeriods.reduce((map, item) => {
    expandDateRange(item.range).forEach((date) => {
      map[date] = item.name
    })
    return map
  }, {})

  return {
    year,
    holidays,
    workdays: uniq(raw.workdays || []),
    holidayPeriods,
    festivalMap,
    source: raw.source || '',
  }
}
