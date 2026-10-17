import { reactive, ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useQuarterStats } from './useQuarterStats'

const mocks = vi.hoisted(() => ({ store: null }))

vi.mock('../stores/overtime', () => ({
  useOvertimeStore: () => mocks.store,
}))

function record(date, dayKind, startTime = '19:00', endTime = '20:30') {
  return { date, dayKind, startTime, endTime }
}

describe('quarter meal allowance', () => {
  beforeEach(() => {
    mocks.store = reactive({
      recordList: [],
      quarterTargets: {},
      settings: { workdayStart: '08:30', workdayEnd: '18:00' },
      getQuarterTotals: () => 0,
    })
  })

  it('includes the full selected quarter with weekends and holidays and follows quarter changes', () => {
    mocks.store.recordList = [
      record('2026-09-30', 'workday'),
      record('2026-10-01', 'holiday', '08:30', '20:30'),
      record('2026-10-10', 'makeup-workday'),
      record('2026-10-17', 'weekend', '08:30', '16:00'),
      record('2026-12-31', 'workday'),
      record('2027-01-01', 'holiday', '08:30', '20:30'),
    ]
    const referenceDate = ref('2026-10-17')
    const { mealAllowanceTotal } = useQuarterStats(referenceDate)

    expect(mealAllowanceTotal.value).toBe(125)
    referenceDate.value = '2026-07-01'
    expect(mealAllowanceTotal.value).toBe(25)
    referenceDate.value = '2027-01-01'
    expect(mealAllowanceTotal.value).toBe(50)
  })

  it('recalculates record changes without depending on attendance settings or quarter targets', () => {
    mocks.store.recordList = [
      record('2026-10-08', 'workday'),
      record('2026-10-17', 'weekend', '08:30', '20:30'),
    ]
    const { mealAllowanceTotal } = useQuarterStats(ref('2026-10-01'))

    expect(mealAllowanceTotal.value).toBe(75)
    mocks.store.settings = { workdayStart: '10:00', workdayEnd: '16:00' }
    mocks.store.quarterTargets['2026-Q4'] = 100
    expect(mealAllowanceTotal.value).toBe(75)

    mocks.store.recordList[0].endTime = '20:29'
    expect(mealAllowanceTotal.value).toBe(50)
    mocks.store.recordList.splice(1, 1)
    expect(mealAllowanceTotal.value).toBe(0)
  })
})
