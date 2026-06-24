const STORAGE_KEY = 'daily-grind-store'
const DATA_VERSION = 3
const SOFT_THEME_DEFAULT_VERSION = 3
const DB_NAME = 'daily-grind-file-handles'
const DB_VERSION = 1
const HANDLE_STORE = 'handles'
const HANDLE_KEY = 'primary-data-file'
const DEFAULT_FILE_NAME = 'daily-grind-data.json'

let activeFileHandle = null
let writeQueue = Promise.resolve()

function normalizeTheme(payload) {
  if (payload.theme === 'auto' && Number(payload.version || 1) < SOFT_THEME_DEFAULT_VERSION) {
    return 'soft'
  }

  return payload.theme || undefined
}

function createStoreSnapshot(payload) {
  return {
    version: DATA_VERSION,
    savedAt: new Date().toISOString(),
    settings: payload.settings || {},
    records: payload.records || {},
    quarterTargets: payload.quarterTargets || {},
    theme: payload.theme || 'soft',
  }
}

function extractStorePayload(payload) {
  if (!payload || typeof payload !== 'object') return null

  if (!payload.settings && !payload.records && !payload.quarterTargets && !payload.theme) {
    return null
  }

  return {
    settings: payload.settings || undefined,
    records: payload.records || {},
    quarterTargets: payload.quarterTargets || {},
    theme: normalizeTheme(payload),
  }
}

function parseStoreSnapshot(text) {
  const parsed = JSON.parse(text)
  const payload = extractStorePayload(parsed)

  if (!payload) {
    throw new Error('数据文件格式不正确。')
  }

  return {
    snapshot: parsed,
    payload,
  }
}

function parseStoreText(text) {
  return parseStoreSnapshot(text).payload
}

function getFilePickerOptions() {
  return {
    suggestedName: DEFAULT_FILE_NAME,
    types: [
      {
        description: 'Daily Grind data',
        accept: {
          'application/json': ['.json'],
        },
      },
    ],
  }
}

function openHandleDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      request.result.createObjectStore(HANDLE_STORE)
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function getSavedFileHandle() {
  try {
    const db = await openHandleDatabase()

    return await new Promise((resolve, reject) => {
      const transaction = db.transaction(HANDLE_STORE, 'readonly')
      const request = transaction.objectStore(HANDLE_STORE).get(HANDLE_KEY)

      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
      transaction.oncomplete = () => db.close()
      transaction.onerror = () => {
        db.close()
        reject(transaction.error)
      }
    })
  } catch {
    return null
  }
}

async function saveFileHandle(handle) {
  activeFileHandle = handle

  try {
    await new Promise((resolve, reject) => {
      const dbRequest = indexedDB.open(DB_NAME, DB_VERSION)

      dbRequest.onupgradeneeded = () => {
        dbRequest.result.createObjectStore(HANDLE_STORE)
      }

      dbRequest.onsuccess = () => {
        const db = dbRequest.result
        const transaction = db.transaction(HANDLE_STORE, 'readwrite')
        const request = transaction.objectStore(HANDLE_STORE).put(handle, HANDLE_KEY)

        request.onerror = () => reject(request.error)
        transaction.oncomplete = () => {
          db.close()
          resolve()
        }
        transaction.onerror = () => {
          db.close()
          reject(transaction.error)
        }
      }
      dbRequest.onerror = () => reject(dbRequest.error)
    })
  } catch {
    // The file itself remains the durable backup even if handle caching fails.
  }
}

export async function clearSavedFileHandle() {
  activeFileHandle = null

  try {
    await new Promise((resolve, reject) => {
      const dbRequest = indexedDB.open(DB_NAME, DB_VERSION)

      dbRequest.onupgradeneeded = () => {
        dbRequest.result.createObjectStore(HANDLE_STORE)
      }

      dbRequest.onsuccess = () => {
        const db = dbRequest.result
        const transaction = db.transaction(HANDLE_STORE, 'readwrite')
        const request = transaction.objectStore(HANDLE_STORE).delete(HANDLE_KEY)

        request.onerror = () => reject(request.error)
        transaction.oncomplete = () => {
          db.close()
          resolve()
        }
        transaction.onerror = () => {
          db.close()
          reject(transaction.error)
        }
      }
      dbRequest.onerror = () => reject(dbRequest.error)
    })
  } catch {
    // Nothing else to clear.
  }
}

function isPermissionGranted(result) {
  return result === 'granted'
}

async function queryFilePermission(handle, mode = 'readwrite') {
  if (!handle?.queryPermission) return false
  return isPermissionGranted(await handle.queryPermission({ mode }))
}

async function requestFilePermission(handle, mode = 'readwrite') {
  if (await queryFilePermission(handle, mode)) return true
  if (!handle?.requestPermission) return false
  return isPermissionGranted(await handle.requestPermission({ mode }))
}

async function readStoreFile(handle) {
  const file = await handle.getFile()
  return parseStoreText(await file.text())
}

async function writeStoreFile(handle, payload) {
  const snapshot = createStoreSnapshot(payload)
  const writable = await handle.createWritable()

  await writable.write(JSON.stringify(snapshot, null, 2))
  await writable.close()

  return {
    fileName: handle.name,
    savedAt: snapshot.savedAt,
  }
}

export function isFileStorageSupported() {
  return Boolean(
    typeof window !== 'undefined' &&
    window.isSecureContext &&
    window.showOpenFilePicker &&
    window.showSaveFilePicker &&
    typeof indexedDB !== 'undefined',
  )
}

export function loadStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? extractStorePayload(JSON.parse(raw)) : null
  } catch {
    return null
  }
}

export function saveStore(payload) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(createStoreSnapshot(payload)))
}

export async function loadBoundStoreFile() {
  if (!isFileStorageSupported()) {
    return { status: 'unsupported' }
  }

  const handle = await getSavedFileHandle()

  if (!handle) {
    return { status: 'unbound' }
  }

  activeFileHandle = handle

  if (!await queryFilePermission(handle)) {
    return {
      status: 'needs-permission',
      fileName: handle.name,
    }
  }

  try {
    return {
      status: 'ready',
      fileName: handle.name,
      payload: await readStoreFile(handle),
    }
  } catch (error) {
    return {
      status: 'error',
      fileName: handle.name,
      error,
    }
  }
}

export async function createDataFile(payload) {
  const handle = await window.showSaveFilePicker(getFilePickerOptions())
  const result = await writeStoreFile(handle, payload)

  await saveFileHandle(handle)
  return result
}

export async function previewDataFile() {
  const [handle] = await window.showOpenFilePicker(getFilePickerOptions())

  if (!await requestFilePermission(handle)) {
    throw new Error('没有获得数据文件的读写权限。')
  }

  const file = await handle.getFile()
  const rawText = await file.text()
  const { snapshot, payload } = parseStoreSnapshot(rawText)

  return {
    fileName: handle.name,
    handle,
    payload,
    rawText: JSON.stringify(snapshot, null, 2),
    savedAt: snapshot.savedAt || '',
    version: snapshot.version || '',
    recordCount: Object.keys(payload.records || {}).length,
    quarterTargetCount: Object.keys(payload.quarterTargets || {}).length,
  }
}

export async function bindDataFile(handle, payload) {
  const result = await writeStoreFile(handle, payload)

  await saveFileHandle(handle)
  return result
}

export async function openDataFile() {
  const preview = await previewDataFile()
  await bindDataFile(preview.handle, preview.payload)

  return {
    fileName: preview.fileName,
    payload: preview.payload,
  }
}

export async function reconnectBoundStoreFile() {
  const handle = activeFileHandle || await getSavedFileHandle()

  if (!handle) {
    return { status: 'unbound' }
  }

  if (!await requestFilePermission(handle)) {
    return {
      status: 'needs-permission',
      fileName: handle.name,
    }
  }

  activeFileHandle = handle

  return {
    status: 'ready',
    fileName: handle.name,
    payload: await readStoreFile(handle),
  }
}

export function syncBoundStoreFile(payload) {
  const task = writeQueue.catch(() => {}).then(async () => {
    const handle = activeFileHandle || await getSavedFileHandle()

    if (!handle) {
      throw new Error('还没有绑定 JSON 数据文件。')
    }

    if (!await requestFilePermission(handle)) {
      const error = new Error('需要重新授权才能写入 JSON 数据文件。')
      error.name = 'NotAllowedError'
      throw error
    }

    activeFileHandle = handle
    return writeStoreFile(handle, payload)
  })

  writeQueue = task
  return task
}

export async function disconnectDataFile() {
  await clearSavedFileHandle()
}
