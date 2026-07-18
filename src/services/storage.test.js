import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  bindDataFile,
  loadLegacyStore,
  loadStore,
  previewDataFile,
  saveStore,
  setStorageUser,
} from './storage'

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

  it('previews an existing JSON file with read permission only', async () => {
    const requestPermission = vi.fn(async ({ mode }) => mode === 'read' ? 'granted' : 'denied')
    const handle = {
      name: 'daily-grind-data.json',
      queryPermission: vi.fn(async () => 'prompt'),
      requestPermission,
      getFile: vi.fn(async () => ({
        text: async () => JSON.stringify({
          version: 4,
          records: {
            '2026-06-01': { date: '2026-06-01', startTime: '19:00', endTime: '20:30' },
          },
        }),
      })),
    }
    window.showOpenFilePicker = vi.fn(async () => [handle])

    const preview = await previewDataFile()

    expect(preview.recordCount).toBe(1)
    expect(preview.payload.records['2026-06-01']).toBeTruthy()
    expect(requestPermission).toHaveBeenCalledWith({ mode: 'read' })
  })

  it('keeps imported data usable when write permission is denied', async () => {
    const handle = {
      name: 'daily-grind-data.json',
      queryPermission: vi.fn(async () => 'prompt'),
      requestPermission: vi.fn(async () => 'denied'),
    }

    const result = await bindDataFile(handle)

    expect(result).toMatchObject({
      fileName: 'daily-grind-data.json',
      writable: false,
    })
  })
})
