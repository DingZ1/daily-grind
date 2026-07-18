import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ForgotPasswordPage from './ForgotPasswordPage.vue'

const mocks = vi.hoisted(() => ({
  sendPasswordReset: vi.fn(),
  warning: vi.fn(),
}))

vi.mock('../stores/auth', () => ({
  useAuthStore: () => ({ sendPasswordReset: mocks.sendPasswordReset }),
}))

vi.mock('element-plus', () => ({
  ElMessage: {
    error: vi.fn(),
    warning: mocks.warning,
  },
}))

function mountPage() {
  return mount(ForgotPasswordPage, {
    global: {
      stubs: {
        RouterLink: { template: '<a><slot /></a>' },
      },
    },
  })
}

describe('password reset cooldown', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-18T08:00:00Z'))
    localStorage.clear()
    mocks.sendPasswordReset.mockReset()
    mocks.sendPasswordReset.mockResolvedValue(undefined)
    mocks.warning.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('disables repeat sending for 60 seconds after success', async () => {
    const wrapper = mountPage()
    await wrapper.get('input[type="email"]').setValue('user@example.com')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(mocks.sendPasswordReset).toHaveBeenCalledTimes(1)
    expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('60 秒后可以重新发送')

    await vi.advanceTimersByTimeAsync(60_000)

    expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeUndefined()
    expect(wrapper.get('button[type="submit"]').text()).toBe('重新发送重置邮件')
    wrapper.unmount()
  })

  it('restores the remaining cooldown after a page reload', async () => {
    localStorage.setItem('daily-grind-password-reset-available-at', String(Date.now() + 45_000))

    const wrapper = mountPage()
    await flushPromises()

    expect(wrapper.get('button[type="submit"]').text()).toBe('45 秒后可重新发送')
    expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeDefined()
    wrapper.unmount()
  })
})
