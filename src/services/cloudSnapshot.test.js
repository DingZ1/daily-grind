import { beforeEach, describe, expect, it } from 'vitest'
import { clearPendingSnapshot, loadPendingSnapshot, savePendingSnapshot } from './cloudSnapshot'

describe('pending cloud snapshots', () => {
  beforeEach(() => localStorage.clear())

  it('isolates pending payloads by user id', () => {
    savePendingSnapshot('user-a', { records: { a: true } })
    savePendingSnapshot('user-b', { records: { b: true } })

    expect(loadPendingSnapshot('user-a').payload.records).toEqual({ a: true })
    expect(loadPendingSnapshot('user-b').payload.records).toEqual({ b: true })
  })

  it('clears only the requested user queue', () => {
    savePendingSnapshot('user-a', { records: {} })
    savePendingSnapshot('user-b', { records: {} })
    clearPendingSnapshot('user-a')

    expect(loadPendingSnapshot('user-a')).toBeNull()
    expect(loadPendingSnapshot('user-b')).not.toBeNull()
  })
})
