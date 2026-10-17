import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import RecordTable from './RecordTable.vue'

describe('daily meal allowance records', () => {
  it('calculates historical amounts and updates the displayed value after editing', async () => {
    const records = [
      { date: '2026-10-19', dayKind: 'workday', startTime: '19:00', endTime: '20:30', overtimeHours: 1.5, status: 'valid' },
      { date: '2026-10-18', dayKind: 'weekend', startTime: '08:30', endTime: '20:30', overtimeHours: 9.5, status: 'valid' },
    ]
    const wrapper = mount(RecordTable, { props: { records } })
    expect(wrapper.findAll('tbody tr').map((row) => row.findAll('td')[5].text())).toEqual(['¥25', '¥50'])

    await wrapper.setProps({ records: [{ ...records[0], endTime: '20:00' }] })
    expect(wrapper.get('tbody tr').findAll('td')[5].text()).toBe('¥0')

    await wrapper.setProps({ records: [] })
    expect(wrapper.get('.empty-cell').attributes('colspan')).toBe('8')
    wrapper.unmount()
  })
})
