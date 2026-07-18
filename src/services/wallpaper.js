import { supabase } from './supabase'

const BUCKET = 'lock-wallpapers'
const DB_NAME = 'daily-grind-wallpapers'
const DB_VERSION = 1
const STORE_NAME = 'wallpapers'
const VALID_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MAX_SIZE = 5 * 1024 * 1024

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function cacheLockWallpaper(userId, blob) {
  const db = await openDatabase()
  await new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    transaction.objectStore(STORE_NAME).put(blob, userId)
    transaction.oncomplete = resolve
    transaction.onerror = () => reject(transaction.error)
  })
  db.close()
}

async function loadCachedWallpaper(userId) {
  try {
    const db = await openDatabase()
    const blob = await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly')
      const request = transaction.objectStore(STORE_NAME).get(userId)
      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
    db.close()
    return blob
  } catch {
    return null
  }
}

async function clearCachedWallpaper(userId) {
  try {
    const db = await openDatabase()
    await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite')
      transaction.objectStore(STORE_NAME).delete(userId)
      transaction.oncomplete = resolve
      transaction.onerror = () => reject(transaction.error)
    })
    db.close()
  } catch {
    // A stale cached image is harmless if IndexedDB cannot be opened.
  }
}

async function listUserWallpapers(userId) {
  const { data, error } = await supabase.storage.from(BUCKET).list(userId)
  if (error) throw error
  return data || []
}

export function validateWallpaper(file) {
  if (!VALID_TYPES.has(file?.type)) throw new Error('仅支持 JPEG、PNG 或 WebP 图片。')
  if (file.size > MAX_SIZE) throw new Error('锁屏壁纸不能超过 5 MB。')
}

export async function uploadLockWallpaper(userId, file) {
  validateWallpaper(file)
  const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
  const existing = await listUserWallpapers(userId)
  if (existing.length) {
    const paths = existing.map((item) => `${userId}/${item.name}`)
    const { error } = await supabase.storage.from(BUCKET).remove(paths)
    if (error) throw error
  }

  const path = `${userId}/wallpaper.${extension}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type,
  })
  if (error) throw error
  await cacheLockWallpaper(userId, file)
  return file
}

export async function loadLockWallpaper(userId) {
  if (navigator.onLine && supabase) {
    try {
      const items = await listUserWallpapers(userId)
      if (items.length) {
        const { data, error } = await supabase.storage
          .from(BUCKET)
          .download(`${userId}/${items[0].name}`)
        if (error) throw error
        await cacheLockWallpaper(userId, data)
        return data
      }
      await clearCachedWallpaper(userId)
      return null
    } catch {
      // Fall through to the device cache during connectivity failures.
    }
  }

  return loadCachedWallpaper(userId)
}

export async function removeLockWallpaper(userId) {
  const items = await listUserWallpapers(userId)
  if (items.length) {
    const { error } = await supabase.storage
      .from(BUCKET)
      .remove(items.map((item) => `${userId}/${item.name}`))
    if (error) throw error
  }
  await clearCachedWallpaper(userId)
}
