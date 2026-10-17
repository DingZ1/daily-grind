import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useOvertimeStore } from '../stores/overtime'
import { calculateMealAllowance } from '../utils/mealAllowance'
import RecordEditorDrawer from './RecordEditorDrawer.vue'

vi.mock('../services/supabase', () => ({ supabase: null }))

function mountEditor(props = {}) {
  return mount(RecordEditorDrawer, {
    props: {
      open: true,
      date: '2026-10-19',
      dayKind: 'workday',
      settings: { workdayStart: '08:30', workdayEnd: '18:00' },
      ...props,
    },
    global: {
      stubs: {
        ElDrawer: { template: '<div><slot /></div>' },
        ElAlert: { template: '<div><slot name="title" /></div>' },
        ElForm: { template: '<form><slot /></form>' },
        ElFormItem: { template: '<div><slot /></div>' },
        ElTimeSelect: {
          props: ['modelValue'],
          emits: ['update:modelValue'],
          template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
        },
        ElInput: true,
        ElButton: { template: '<button><slot /></button>' },
      },
    },
  })
}

describe('meal allowance preview', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('keeps the usual workday times and saves only the original record fields', async () => {
    const wrapper = mountEditor()
    const inputs = wrapper.findAll('input')
    expect(inputs.map((input) => input.element.value)).toEqual(['19:00', '20:30'])
    expect(wrapper.get('.meal-preview').text()).toContain('¥25')
    expect(wrapper.get('.meal-preview').text()).toContain('晚间：1 小时 30 分钟')

    await wrapper.get('form').trigger('submit')

    const [saved] = wrapper.emitted('save')[0]
    expect(saved).toEqual({
      date: '2026-10-19',
      dayKind: 'workday',
      startTime: '19:00',
      endTime: '20:30',
      attendanceSegments: [{ startTime: '08:30', endTime: '18:00' }],
      note: '',
    })
    wrapper.unmount()
  })

  it('previews the exact daytime threshold and updates when evening overtime is added', async () => {
    const wrapper = mountEditor({
      dayKind: 'weekend',
      record: { startTime: '08:30', endTime: '16:00' },
    })
    expect(wrapper.get('.meal-preview').text()).toContain('白天：6 小时 / 6 小时，¥25')
    expect(wrapper.get('.meal-preview-head strong').text()).toBe('¥25')

    await wrapper.findAll('input')[1].setValue('20:30')
    expect(wrapper.get('.meal-preview-head strong').text()).toBe('¥50')
    expect(wrapper.get('.meal-preview').text()).toContain('晚间：1 小时 30 分钟 / 1.5 小时，¥25')

    await wrapper.findAll('input')[1].setValue('15:59')
    expect(wrapper.get('.meal-preview-head strong').text()).toBe('¥0')
    wrapper.unmount()
  })

  it('uses an imported holiday type for the preview and preserves it when saved on a calendar workday', async () => {
    const store = useOvertimeStore()
    vi.spyOn(store, 'persist').mockImplementation(() => {})
    expect(store.importRecords([{
      date: '2026-10-19',
      dayKind: 'holiday',
      startTime: '08:30',
      endTime: '20:30',
    }])).toMatchObject({ created: 1, skipped: 0, errors: [] })

    const record = store.getRecordByDate('2026-10-19')
    expect(calculateMealAllowance(record).totalAmount).toBe(50)
    const wrapper = mountEditor({ dayKind: 'workday', record })

    expect(wrapper.get('.eyebrow').text()).toBe('节假日')
    expect(wrapper.find('.attendance-card').exists()).toBe(false)
    expect(wrapper.get('.preview-card strong').text()).toBe('9.5h')
    expect(wrapper.get('.meal-preview-head strong').text()).toBe('¥50')
    expect(wrapper.get('.meal-preview').text()).toContain('白天：8 小时 / 6 小时，¥25')

    await wrapper.get('form').trigger('submit')
    const [form] = wrapper.emitted('save')[0]
    store.saveRecord(form)

    expect(store.getRecordByDate('2026-10-19')).toMatchObject({
      dayKind: 'holiday',
      overtimeHours: 9.5,
      attendanceSegments: [],
    })
    expect(calculateMealAllowance(store.getRecordByDate('2026-10-19')).totalAmount).toBe(50)
    wrapper.unmount()
  })

  it('preserves imported makeup-workday attendance and evening-only allowance on a calendar weekend', async () => {
    const store = useOvertimeStore()
    vi.spyOn(store, 'persist').mockImplementation(() => {})
    expect(store.importRecords([{
      date: '2026-10-17',
      dayKind: 'makeup-workday',
      startTime: '08:30',
      endTime: '20:30',
      attendanceSegments: '08:30-12:00; 13:30-18:00',
    }])).toMatchObject({ created: 1, skipped: 0, errors: [] })

    const record = store.getRecordByDate('2026-10-17')
    const wrapper = mountEditor({ date: record.date, dayKind: 'weekend', record })

    expect(wrapper.get('.eyebrow').text()).toBe('调休上班')
    expect(wrapper.findAll('.attendance-row')).toHaveLength(2)
    expect(wrapper.get('.preview-card strong').text()).toBe('1.5h')
    expect(wrapper.get('.meal-preview-head strong').text()).toBe('¥25')
    expect(wrapper.get('.meal-preview').text()).toContain('工作日及调休上班日只计算晚间餐补。')

    await wrapper.get('form').trigger('submit')
    const [form] = wrapper.emitted('save')[0]
    store.saveRecord(form)

    expect(store.getRecordByDate('2026-10-17')).toMatchObject({
      dayKind: 'makeup-workday',
      overtimeHours: 1.5,
      attendanceSegments: [
        { startTime: '08:30', endTime: '12:00' },
        { startTime: '13:30', endTime: '18:00' },
      ],
    })
    expect(calculateMealAllowance(store.getRecordByDate('2026-10-17')).totalAmount).toBe(25)
    wrapper.unmount()
  })

  it('updates for a different saved day type and falls back to calendar defaults for new records', async () => {
    const wrapper = mountEditor({
      record: { dayKind: 'holiday', startTime: '08:30', endTime: '20:30' },
    })
    expect(wrapper.get('.meal-preview-head strong').text()).toBe('¥50')

    await wrapper.setProps({
      dayKind: 'weekend',
      record: {
        dayKind: 'makeup-workday',
        startTime: '19:00',
        endTime: '20:30',
        attendanceSegments: [{ startTime: '09:00', endTime: '17:00' }],
      },
    })
    expect(wrapper.get('.eyebrow').text()).toBe('调休上班')
    expect(wrapper.findAll('.attendance-row')).toHaveLength(1)
    expect(wrapper.get('.meal-preview-head strong').text()).toBe('¥25')

    await wrapper.setProps({ record: null })
    expect(wrapper.get('.eyebrow').text()).toBe('周末')
    expect(wrapper.find('.attendance-card').exists()).toBe(false)
    expect(wrapper.findAll('input').map((input) => input.element.value)).toEqual(['08:30', '18:00'])
    expect(wrapper.get('.preview-card strong').text()).toBe('8.0h')

    await wrapper.setProps({ dayKind: 'workday' })
    expect(wrapper.get('.eyebrow').text()).toBe('工作日')
    expect(wrapper.findAll('input').map((input) => input.element.value)).toEqual(['19:00', '20:30'])
    expect(wrapper.findAll('.attendance-row')).toHaveLength(1)
    await wrapper.get('form').trigger('submit')
    expect(wrapper.emitted('save')[0][0]).toMatchObject({
      dayKind: 'workday',
      startTime: '19:00',
      endTime: '20:30',
      attendanceSegments: [{ startTime: '08:30', endTime: '18:00' }],
    })
    wrapper.unmount()
  })
})
