import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import RecordEditorDrawer from './RecordEditorDrawer.vue'

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
})
