import { describe, expect, it } from 'vitest'
import { calculateMealAllowance, sumMealAllowance } from './mealAllowance'

const emptyAllowance = {
  daytimeMinutes: 0,
  eveningMinutes: 0,
  daytimeAmount: 0,
  eveningAmount: 0,
  totalAmount: 0,
}

describe('meal allowance', () => {
  it.each([
    ['19:00', '20:29', 89, 0],
    ['19:00', '20:30', 90, 25],
    ['19:00', '20:31', 91, 25],
    ['19:00', '21:00', 120, 25],
    ['19:30', '21:00', 90, 25],
    ['20:00', '21:30', 90, 25],
    ['18:00', '20:29', 89, 0],
    ['18:00', '20:30', 90, 25],
    ['08:30', '18:00', 0, 0],
    ['22:30', '24:00', 90, 25],
    ['22:31', '24:00', 89, 0],
  ])('calculates evening minutes for %s–%s', (startTime, endTime, eveningMinutes, totalAmount) => {
    expect(calculateMealAllowance({ dayKind: 'workday', startTime, endTime })).toEqual({
      daytimeMinutes: 0,
      eveningMinutes,
      daytimeAmount: 0,
      eveningAmount: totalAmount,
      totalAmount,
    })
  })

  it.each([
    ['08:30', '15:59', 359, 0],
    ['08:30', '16:00', 360, 25],
    ['08:30', '16:01', 361, 25],
    ['08:30', '18:00', 480, 25],
    ['07:00', '16:00', 360, 25],
    ['10:30', '18:00', 360, 25],
    ['10:31', '18:00', 359, 0],
    ['08:30', '12:30', 210, 0],
    ['12:30', '18:00', 270, 0],
    ['12:00', '13:30', 0, 0],
    ['06:00', '08:00', 0, 0],
    ['18:00', '19:00', 0, 0],
  ])('calculates daytime minutes for %s–%s', (startTime, endTime, daytimeMinutes, totalAmount) => {
    expect(calculateMealAllowance({ dayKind: 'weekend', startTime, endTime })).toEqual({
      daytimeMinutes,
      eveningMinutes: 0,
      daytimeAmount: totalAmount,
      eveningAmount: 0,
      totalAmount,
    })
  })

  it.each([
    ['workday', 0, 25],
    ['makeup-workday', 0, 25],
    ['weekend', 25, 50],
    ['holiday', 25, 50],
  ])('applies the correct rules to %s', (dayKind, daytimeAmount, totalAmount) => {
    expect(calculateMealAllowance({ dayKind, startTime: '08:30', endTime: '20:30' })).toMatchObject({
      daytimeAmount,
      eveningAmount: 25,
      totalAmount,
    })
  })

  it('caps a full non-working day at two meals', () => {
    expect(calculateMealAllowance({
      dayKind: 'holiday',
      startTime: '00:00',
      endTime: '24:00',
    })).toEqual({
      daytimeMinutes: 480,
      eveningMinutes: 300,
      daytimeAmount: 25,
      eveningAmount: 25,
      totalAmount: 50,
    })
  })

  it.each([
    ['', '20:30'],
    [undefined, '20:30'],
    ['19:00', null],
    ['invalid', '20:30'],
    ['19:00', '25:00'],
    ['19:00', '24:01'],
    ['19:00', '20:60'],
    ['19:00', '20:30:00'],
    ['9:00', '20:30'],
    [' 19:00', '20:30'],
    [1900, '20:30'],
    [{ toString: () => '19:00' }, '20:30'],
    ['20:30', '19:00'],
    ['19:00', '19:00'],
    ['23:00', '01:00'],
    ['24:00', '24:00'],
  ])('rejects invalid or non-increasing times %s–%s', (startTime, endTime) => {
    expect(calculateMealAllowance({ dayKind: 'weekend', startTime, endTime })).toEqual(emptyAllowance)
  })

  it.each([undefined, null, '', 'unknown', 'weekday'])('rejects unknown day kind %s', (dayKind) => {
    expect(calculateMealAllowance({ dayKind, startTime: '08:30', endTime: '24:00' }))
      .toEqual(emptyAllowance)
  })

  it('accepts an empty record', () => {
    expect(calculateMealAllowance()).toEqual(emptyAllowance)
  })

  it('recalculates historical records independently of stored totals and company settings', () => {
    const record = Object.freeze({
      date: '2025-01-04',
      dayKind: 'weekend',
      startTime: '08:30',
      endTime: '20:30',
      overtimeHours: 0,
      status: 'invalid',
      mealAllowance: 999,
      settings: Object.freeze({ workdayStart: '10:00', workdayEnd: '22:00' }),
    })

    expect(calculateMealAllowance(record).totalAmount).toBe(50)
    expect(record.mealAllowance).toBe(999)
  })

  it('sums records without requiring stored allowance fields or mutating inputs', () => {
    const records = Object.freeze([
      Object.freeze({ date: '2026-10-12', dayKind: 'workday', startTime: '19:00', endTime: '20:30' }),
      Object.freeze({ date: '2026-10-17', dayKind: 'weekend', startTime: '08:30', endTime: '20:30' }),
      Object.freeze({ date: '2026-10-18', dayKind: 'weekend', startTime: '08:30', endTime: '16:00' }),
      Object.freeze({ date: '2026-10-19', dayKind: 'workday', startTime: '', endTime: '' }),
      null,
    ])

    expect(sumMealAllowance(records)).toBe(100)
    expect(records[0]).not.toHaveProperty('mealAllowance')
    expect(records).toHaveLength(5)
    expect(sumMealAllowance()).toBe(0)
  })
})
