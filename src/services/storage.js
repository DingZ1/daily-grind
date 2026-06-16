const STORAGE_KEY = 'daily-grind-store'

export function loadStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveStore(payload) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
}
