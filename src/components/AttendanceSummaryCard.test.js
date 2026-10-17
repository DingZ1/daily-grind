import { shallowMount } from '@vue/test-utils'
import { nextTick, reactive } from 'vue'
import { describe, expect, it } from 'vitest'
import AttendanceSummaryCard from './AttendanceSummaryCard.vue'

function record(date, dayKind, startTime = '19:00', endTime = '20:30') {
  return { date, dayKind, startTime, endTime }
}

function mealAmount(wrapper) {
  return wrapper.findAll('.metric-item')
    .find((item) => item.text().includes('本月餐补'))
    .get('strong').text()
}

describe('monthly meal allowance', () => {
  it('includes all day types in the selected month independently of attendance settings', async () => {
    const wrapper = shallowMount(AttendanceSummaryCard, {
      props: {
        referenceDate: '2026-10-17',
        settings: { workdayStart: '08:30', workdayEnd: '18:00' },
        records: [
          record('2026-10-08', 'workday'),
          record('2026-10-17', 'weekend', '08:30', '16:00'),
          record('2026-10-01', 'holiday', '08:30', '20:30'),
          record('2026-10-10', 'makeup-workday'),
          record('2026-09-30', 'workday'),
          record('2026-11-01', 'weekend', '08:30', '20:30'),
          record('2025-10-01', 'holiday', '08:30', '20:30'),
        ],
      },
    })

    expect(mealAmount(wrapper)).toBe('¥125')
    expect(wrapper.get('.attendance-head').text()).toContain('2 天打卡记录')

    await wrapper.setProps({ settings: { workdayStart: '10:00', workdayEnd: '16:00' } })
    expect(mealAmount(wrapper)).toBe('¥125')

    await wrapper.setProps({ referenceDate: '2026-11-01' })
    expect(mealAmount(wrapper)).toBe('¥50')
    wrapper.unmount()
  })

  it('recalculates existing records immediately after edits and deletion', async () => {
    const records = reactive([
      record('2026-10-08', 'workday'),
      record('2026-10-17', 'weekend', '08:30', '20:30'),
    ])
    const wrapper = shallowMount(AttendanceSummaryCard, {
      props: { referenceDate: '2026-10-01', records },
    })

    expect(mealAmount(wrapper)).toBe('¥75')
    records[0].endTime = '20:29'
    await nextTick()
    expect(mealAmount(wrapper)).toBe('¥50')

    records.splice(1, 1)
    await nextTick()
    expect(mealAmount(wrapper)).toBe('¥0')
    wrapper.unmount()
  })
})
