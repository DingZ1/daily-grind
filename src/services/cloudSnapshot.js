import { supabase } from './supabase'

const PENDING_PREFIX = 'daily-grind-pending:'

export class SnapshotConflictError extends Error {
  constructor(remote) {
    super('云端数据已在其他设备更新，请选择要保留的版本。')
    this.name = 'SnapshotConflictError'
    this.remote = remote
  }
}

function ensureClient() {
  if (!supabase) throw new Error('Supabase 尚未配置。')
  return supabase
}

export async function loadSnapshot(userId) {
  const client = ensureClient()
  const { data, error } = await client
    .from('user_snapshots')
    .select('payload, revision, updated_at')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  return {
    payload: data.payload,
    revision: Number(data.revision),
    updatedAt: data.updated_at,
  }
}

export async function createSnapshot(payload) {
  const client = ensureClient()
  const { data: userResult, error: userError } = await client.auth.getUser()
  if (userError) throw userError
  const { data, error } = await client
    .from('user_snapshots')
    .insert({ user_id: userResult.user.id, payload, revision: 1 })
    .select('payload, revision, updated_at')
    .single()

  if (error?.code === '23505') {
    throw new SnapshotConflictError(await loadSnapshot(userResult.user.id))
  }
  if (error) throw error

  return {
    payload: data.payload,
    revision: Number(data.revision),
    updatedAt: data.updated_at,
  }
}

export async function saveSnapshot(payload, expectedRevision) {
  const client = ensureClient()
  const { data: userResult, error: userError } = await client.auth.getUser()
  if (userError) throw userError
  const nextRevision = expectedRevision + 1
  const { data, error } = await client
    .from('user_snapshots')
    .update({ payload, revision: nextRevision, updated_at: new Date().toISOString() })
    .eq('user_id', userResult.user.id)
    .eq('revision', expectedRevision)
    .select('payload, revision, updated_at')
    .maybeSingle()

  if (error) throw error
  if (!data) {
    throw new SnapshotConflictError(await loadSnapshot(userResult.user.id))
  }

  return {
    payload: data.payload,
    revision: Number(data.revision),
    updatedAt: data.updated_at,
  }
}

export function savePendingSnapshot(userId, payload) {
  const pending = {
    payload,
    queuedAt: new Date().toISOString(),
  }
  localStorage.setItem(`${PENDING_PREFIX}${userId}`, JSON.stringify(pending))
  return pending
}

export function loadPendingSnapshot(userId) {
  try {
    const raw = localStorage.getItem(`${PENDING_PREFIX}${userId}`)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function clearPendingSnapshot(userId) {
  localStorage.removeItem(`${PENDING_PREFIX}${userId}`)
}
