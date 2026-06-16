import dayjs from 'dayjs'
import { getDayKind } from './holiday'
import { OVERTIME_RULES } from '../constants/rules'

export function formatDate(date) {
  return dayjs(date).format('YYYY-MM-DD')
}

export function formatMonth(date) {
  return dayjs(date).format('YYYY-MM')
}

export function getMonthMatrix(viewMonth) {
  const firstDay = dayjs(viewMonth).startOf('month')
  const start = firstDay.startOf('week')
  const cells = []

  for (let index = 0; index < 42; index += 1) {
    const current = start.add(index, 'day')
    cells.push({
      date: current.format('YYYY-MM-DD'),
      day: current.date(),
      isCurrentMonth: current.month() === firstDay.month(),
    })
  }

  return cells
}

export function getQuarterLabel(date) {
  const current = dayjs(date)
  return `${current.year()} Q${current.quarter ? current.quarter() : Math.floor(current.month() / 3) + 1}`
}

export function getQuarterInfo(date) {
  const current = dayjs(date)
  const quarter = Math.floor(current.month() / 3)
  const start = dayjs(new Date(current.year(), quarter * 3, 1))
  const end = start.add(3, 'month').subtract(1, 'day')

  return {
    year: current.year(),
    quarter: quarter + 1,
    start,
    end,
  }
}

export function getQuarterTargetHours(date) {
  const { start, end } = getQuarterInfo(date)
  let workdayCount = 0
  let cursor = start

  while (cursor.isBefore(end) || cursor.isSame(end, 'day')) {
    const dayKind = getDayKind(cursor.format('YYYY-MM-DD'))
    if (dayKind === 'workday' || dayKind === 'makeup-workday') {
      workdayCount += 1
    }
    cursor = cursor.add(1, 'day')
  }

  return Number((workdayCount * OVERTIME_RULES.quarterTargetPerWorkday).toFixed(1))
}
