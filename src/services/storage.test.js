import { beforeEach, describe, expect, it } from 'vitest'
import { loadLegacyStore, loadStore, saveStore, setStorageUser } from './storage'

const payload = (theme) => ({ settings: {}, records: {}, quarterTargets: {}, theme })

describe('account-scoped local storage', () => {
  beforeEach(() => {
    localStorage.clear()
    setStorageUser('')
  })

  it('keeps each account snapshot separate', () => {
    setStorageUser('user-a')
    saveStore(payload('dark'))
    setStorageUser('user-b')
    saveStore(payload('light'))

    expect(loadStore().theme).toBe('light')
    setStorageUser('user-a')
    expect(loadStore().theme).toBe('dark')
  })

  it('reads the legacy unscoped snapshot explicitly', () => {
    localStorage.setItem('daily-grind-store', JSON.stringify(payload('soft')))
    setStorageUser('user-a')

    expect(loadStore()).toBeNull()
    expect(loadLegacyStore().theme).toBe('soft')
  })
})
