const STORAGE_KEY = 'daily-grind-store'
const DATA_VERSION = 5
const SYNC_META_VERSION = 1
const SOFT_THEME_DEFAULT_VERSION = 3
const DB_NAME = 'daily-grind-file-handles'
const DB_VERSION = 1
const HANDLE_STORE = 'handles'
const HANDLE_KEY = 'primary-data-file'
const DEFAULT_FILE_NAME = 'daily-grind-data.json'

let activeFileHandle = null
let writeQueue = Promise.resolve()

function nowIso() {
  return new Date().toISOString()
}

function isPlainObject(value) {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object || {}, key)
}

function cloneMap(value) {
  return isPlainObject(value) ? { ...value } : {}
}

export function createSyncMeta() {
  return {
    version: SYNC_META_VERSION,
    settings: {},
    records: {},
    quarterTargets: {},
    theme: '',
    deleted: {
      records: {},
      quarterTargets: {},
    },
  }
}

function normalizeTheme(payload) {
  if (payload.theme === 'auto' && Number(payload.version || 1) < SOFT_THEME_DEFAULT_VERSION) {
    return 'soft'
  }

  return payload.theme || undefined
}

function hasStoreShape(payload) {
  return Boolean(
    isPlainObject(payload) &&
    (payload.settings ||
      payload.records ||
      payload.quarterTargets ||
      payload.theme ||
      payload.syncMeta),
  )
}

function isTimestamp(value) {
  return typeof value === 'string' && value.length > 0
}

function hasMeaningfulSyncMeta(syncMeta) {
  if (!isPlainObject(syncMeta)) return false

  return Boolean(
    Object.keys(syncMeta.settings || {}).length ||
    Object.keys(syncMeta.records || {}).length ||
    Object.keys(syncMeta.quarterTargets || {}).length ||
    syncMeta.theme ||
    Object.keys(syncMeta.deleted?.records || {}).length ||
    Object.keys(syncMeta.deleted?.quarterTargets || {}).length,
  )
}

function resolveBackfillMeta(payload, options) {
  if (typeof options.backfillMissingMeta === 'boolean') {
    return options.backfillMissingMeta
  }

  return Boolean(payload.version || payload.savedAt || hasMeaningfulSyncMeta(payload.syncMeta))
}

function normalizeSyncMap(sourceMap, valueMap, fallbackTimestamp, shouldBackfill) {
  const normalized = {}
  const source = cloneMap(sourceMap)
  const keys = new Set([
    ...Object.keys(valueMap || {}),
    ...Object.keys(source),
  ])

  keys.forEach((key) => {
    const timestamp = isTimestamp(source[key])
      ? source[key]
      : (shouldBackfill && hasOwn(valueMap, key) ? fallbackTimestamp : '')

    if (timestamp) {
      normalized[key] = timestamp
    }
  })

  return normalized
}

function normalizeDeletedMap(sourceMap) {
  return Object.entries(cloneMap(sourceMap)).reduce((map, [key, timestamp]) => {
    if (isTimestamp(timestamp)) {
      map[key] = timestamp
    }

    return map
  }, {})
}

function normalizeSyncMeta(syncMeta, payload, fallbackTimestamp, shouldBackfill) {
  const source = isPlainObject(syncMeta) ? syncMeta : {}
  const deleted = isPlainObject(source.deleted) ? source.deleted : {}
  const normalized = createSyncMeta()

  normalized.settings = normalizeSyncMap(
    source.settings,
    payload.settings,
    fallbackTimestamp,
    shouldBackfill,
  )
  normalized.records = normalizeSyncMap(
    source.records,
    payload.records,
    fallbackTimestamp,
    shouldBackfill,
  )
  normalized.quarterTargets = normalizeSyncMap(
    source.quarterTargets,
    payload.quarterTargets,
    fallbackTimestamp,
    shouldBackfill,
  )
  normalized.theme = isTimestamp(source.theme)
    ? source.theme
    : (shouldBackfill && payload.hasTheme ? fallbackTimestamp : '')
  normalized.deleted = {
    records: normalizeDeletedMap(deleted.records),
    quarterTargets: normalizeDeletedMap(deleted.quarterTargets),
  }

  return normalized
}

export function normalizeStorePayload(payload, fallbackTimestamp = nowIso(), options = {}) {
  if (!hasStoreShape(payload)) return null

  const settings = cloneMap(payload.settings)
  const records = cloneMap(payload.records)
  const quarterTargets = cloneMap(payload.quarterTargets)
  const hasTheme = hasOwn(payload, 'theme')
  const theme = normalizeTheme(payload) || 'soft'
  const shouldBackfill = resolveBackfillMeta(payload, options)
  const syncMeta = normalizeSyncMeta(
    payload.syncMeta,
    {
      settings,
      records,
      quarterTargets,
      theme,
      hasTheme,
    },
    payload.savedAt || fallbackTimestamp,
    shouldBackfill,
  )

  return {
    settings,
    records,
    quarterTargets,
    theme,
    syncMeta,
  }
}

function createStoreSnapshot(payload) {
  const savedAt = nowIso()
  const normalized = normalizeStorePayload(payload, savedAt, {
    backfillMissingMeta: true,
  }) || {
    settings: {},
    records: {},
    quarterTargets: {},
    theme: 'soft',
    syncMeta: createSyncMeta(),
  }

  return {
    version: DATA_VERSION,
    savedAt,
    settings: normalized.settings,
    records: normalized.records,
    quarterTargets: normalized.quarterTargets,
    theme: normalized.theme || 'soft',
    syncMeta: normalized.syncMeta,
  }
}

function parseStoreSnapshot(text) {
  const parsed = JSON.parse(text)
  const payload = normalizeStorePayload(parsed)

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

function compareTimestamps(left, right) {
  if (!left && !right) return 0
  if (!left) return -1
  if (!right) return 1

  const leftTime = Date.parse(left)
  const rightTime = Date.parse(right)

  if (!Number.isNaN(leftTime) && !Number.isNaN(rightTime)) {
    return leftTime - rightTime
  }

  return left.localeCompare(right)
}

function chooseTimedValue(left, right, preferRightOnTie) {
  if (!left.exists) return right
  if (!right.exists) return left

  const comparison = compareTimestamps(left.timestamp, right.timestamp)
  if (comparison > 0) return left
  if (comparison < 0) return right
  return preferRightOnTie ? right : left
}

function getCollectionEvent(payload, collectionName, key) {
  const values = payload[collectionName] || {}
  const meta = payload.syncMeta || createSyncMeta()
  const updatedAt = meta[collectionName]?.[key] || ''
  const deletedAt = meta.deleted?.[collectionName]?.[key] || ''
  const hasValue = hasOwn(values, key)

  if (hasValue && compareTimestamps(updatedAt, deletedAt) >= 0) {
    return {
      exists: true,
      kind: 'value',
      timestamp: updatedAt,
      value: values[key],
    }
  }

  if (deletedAt) {
    return {
      exists: true,
      kind: 'delete',
      timestamp: deletedAt,
    }
  }

  if (hasValue) {
    return {
      exists: true,
      kind: 'value',
      timestamp: updatedAt,
      value: values[key],
    }
  }

  return {
    exists: false,
    kind: 'none',
    timestamp: '',
  }
}

function mergeCollection(left, right, collectionName, preferRightOnTie) {
  const values = {}
  const updated = {}
  const deleted = {}
  const keys = new Set([
    ...Object.keys(left[collectionName] || {}),
    ...Object.keys(right[collectionName] || {}),
    ...Object.keys(left.syncMeta?.[collectionName] || {}),
    ...Object.keys(right.syncMeta?.[collectionName] || {}),
    ...Object.keys(left.syncMeta?.deleted?.[collectionName] || {}),
    ...Object.keys(right.syncMeta?.deleted?.[collectionName] || {}),
  ])

  keys.forEach((key) => {
    const winner = chooseTimedValue(
      getCollectionEvent(left, collectionName, key),
      getCollectionEvent(right, collectionName, key),
      preferRightOnTie,
    )

    if (!winner.exists) return

    if (winner.kind === 'delete') {
      deleted[key] = winner.timestamp
      return
    }

    values[key] = winner.value
    if (winner.timestamp) {
      updated[key] = winner.timestamp
    }
  })

  return {
    values,
    updated,
    deleted,
  }
}

function mergeSettings(left, right, preferRightOnTie) {
  const settings = {}
  const updated = {}
  const keys = new Set([
    ...Object.keys(left.settings || {}),
    ...Object.keys(right.settings || {}),
    ...Object.keys(left.syncMeta?.settings || {}),
    ...Object.keys(right.syncMeta?.settings || {}),
  ])

  keys.forEach((key) => {
    const winner = chooseTimedValue(
      {
        exists: hasOwn(left.settings, key),
        timestamp: left.syncMeta?.settings?.[key] || '',
        value: left.settings?.[key],
      },
      {
        exists: hasOwn(right.settings, key),
        timestamp: right.syncMeta?.settings?.[key] || '',
        value: right.settings?.[key],
      },
      preferRightOnTie,
    )

    if (!winner.exists) return

    settings[key] = winner.value
    if (winner.timestamp) {
      updated[key] = winner.timestamp
    }
  })

  return {
    settings,
    updated,
  }
}

function mergeTheme(left, right, preferRightOnTie) {
  const winner = chooseTimedValue(
    {
      exists: Boolean(left.theme),
      timestamp: left.syncMeta?.theme || '',
      value: left.theme,
    },
    {
      exists: Boolean(right.theme),
      timestamp: right.syncMeta?.theme || '',
      value: right.theme,
    },
    preferRightOnTie,
  )

  return {
    theme: winner.exists ? winner.value : 'soft',
    updatedAt: winner.timestamp || '',
  }
}

export function mergeStorePayloads(leftPayload, rightPayload, options = {}) {
  const preferRightOnTie = options.preferRightOnTie !== false
  const left = normalizeStorePayload(leftPayload) || normalizeStorePayload({})
  const right = normalizeStorePayload(rightPayload) || normalizeStorePayload({})

  if (!left) return right
  if (!right) return left

  const settingsResult = mergeSettings(left, right, preferRightOnTie)
  const recordsResult = mergeCollection(left, right, 'records', preferRightOnTie)
  const quarterTargetsResult = mergeCollection(left, right, 'quarterTargets', preferRightOnTie)
  const themeResult = mergeTheme(left, right, preferRightOnTie)

  return {
    settings: settingsResult.settings,
    records: recordsResult.values,
    quarterTargets: quarterTargetsResult.values,
    theme: themeResult.theme,
    syncMeta: {
      version: SYNC_META_VERSION,
      settings: settingsResult.updated,
      records: recordsResult.updated,
      quarterTargets: quarterTargetsResult.updated,
      theme: themeResult.updatedAt,
      deleted: {
        records: recordsResult.deleted,
        quarterTargets: quarterTargetsResult.deleted,
      },
    },
  }
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

function getDesktopBridge() {
  return typeof window !== 'undefined' ? window.dailyGrindDesktop : null
}

function isDesktopStorageSupported() {
  return Boolean(getDesktopBridge()?.isDesktop)
}

function createAbortError() {
  const error = new Error('操作已取消。')
  error.name = 'AbortError'
  return error
}

function getSnapshotText(payload) {
  return JSON.stringify(createStoreSnapshot(payload), null, 2)
}

function createPreview(fileInfo, snapshot, payload) {
  return {
    fileName: fileInfo.fileName,
    filePath: fileInfo.filePath || '',
    handle: fileInfo.handle || null,
    payload,
    rawText: JSON.stringify(createStoreSnapshot(payload), null, 2),
    savedAt: snapshot.savedAt || '',
    version: snapshot.version || '',
    recordCount: Object.keys(payload.records || {}).length,
    quarterTargetCount: Object.keys(payload.quarterTargets || {}).length,
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
    filePath: '',
    savedAt: snapshot.savedAt,
    payload: normalizeStorePayload(snapshot),
  }
}

async function loadDesktopFileResult(result) {
  if (result.status !== 'ready') {
    return {
      ...result,
      error: result.message ? new Error(result.message) : undefined,
    }
  }

  const { payload } = parseStoreSnapshot(result.rawText)

  return {
    status: 'ready',
    fileName: result.fileName,
    filePath: result.filePath,
    payload,
  }
}

export function getStorageKind() {
  return isDesktopStorageSupported() ? 'desktop' : 'web'
}

export function isFileStorageSupported() {
  if (isDesktopStorageSupported()) return true

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
    return raw ? normalizeStorePayload(JSON.parse(raw)) : null
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

  if (isDesktopStorageSupported()) {
    try {
      return await loadDesktopFileResult(await getDesktopBridge().loadBoundDataFile())
    } catch (error) {
      return {
        status: 'error',
        fileName: '',
        filePath: '',
        error,
      }
    }
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
      filePath: '',
    }
  }

  try {
    return {
      status: 'ready',
      fileName: handle.name,
      filePath: '',
      payload: await readStoreFile(handle),
    }
  } catch (error) {
    return {
      status: 'error',
      fileName: handle.name,
      filePath: '',
      error,
    }
  }
}

export async function createDataFile(payload) {
  const snapshot = createStoreSnapshot(payload)

  if (isDesktopStorageSupported()) {
    const result = await getDesktopBridge().createDataFile(JSON.stringify(snapshot, null, 2))

    if (result.canceled) {
      throw createAbortError()
    }

    return {
      ...result,
      savedAt: snapshot.savedAt,
      payload: normalizeStorePayload(snapshot),
    }
  }

  const handle = await window.showSaveFilePicker(getFilePickerOptions())
  const result = await writeStoreFile(handle, payload)

  await saveFileHandle(handle)
  return result
}

export async function previewDataFile() {
  if (isDesktopStorageSupported()) {
    const result = await getDesktopBridge().previewDataFile()

    if (result.canceled) {
      throw createAbortError()
    }

    const { snapshot, payload } = parseStoreSnapshot(result.rawText)
    return createPreview(result, snapshot, payload)
  }

  const [handle] = await window.showOpenFilePicker(getFilePickerOptions())

  if (!await requestFilePermission(handle)) {
    throw new Error('没有获得数据文件的读写权限。')
  }

  const file = await handle.getFile()
  const rawText = await file.text()
  const { snapshot, payload } = parseStoreSnapshot(rawText)

  return createPreview(
    {
      fileName: handle.name,
      filePath: '',
      handle,
    },
    snapshot,
    payload,
  )
}

export async function bindDataFile(filePreview, payload) {
  const snapshot = createStoreSnapshot(payload)

  if (isDesktopStorageSupported()) {
    const result = await getDesktopBridge().bindDataFile({
      filePath: filePreview.filePath,
      rawText: JSON.stringify(snapshot, null, 2),
    })

    return {
      ...result,
      savedAt: snapshot.savedAt,
      payload: normalizeStorePayload(snapshot),
    }
  }

  const handle = filePreview.handle || filePreview
  const result = await writeStoreFile(handle, payload)

  await saveFileHandle(handle)
  return result
}

export async function openDataFile() {
  const preview = await previewDataFile()
  await bindDataFile(preview, preview.payload)

  return {
    fileName: preview.fileName,
    filePath: preview.filePath,
    payload: preview.payload,
  }
}

export async function reconnectBoundStoreFile() {
  if (isDesktopStorageSupported()) {
    try {
      return await loadDesktopFileResult(await getDesktopBridge().readBoundDataFile())
    } catch (error) {
      return {
        status: 'error',
        fileName: '',
        filePath: '',
        error,
      }
    }
  }

  const handle = activeFileHandle || await getSavedFileHandle()

  if (!handle) {
    return { status: 'unbound' }
  }

  if (!await requestFilePermission(handle)) {
    return {
      status: 'needs-permission',
      fileName: handle.name,
      filePath: '',
    }
  }

  activeFileHandle = handle

  return {
    status: 'ready',
    fileName: handle.name,
    filePath: '',
    payload: await readStoreFile(handle),
  }
}

export function syncBoundStoreFile(payload) {
  const task = writeQueue.catch(() => {}).then(async () => {
    if (isDesktopStorageSupported()) {
      const current = await getDesktopBridge().readBoundDataFile()

      if (current.status !== 'ready') {
        throw new Error(current.message || '还没有绑定 JSON 数据文件。')
      }

      const filePayload = parseStoreText(current.rawText)
      const mergedPayload = mergeStorePayloads(payload, filePayload)
      const snapshot = createStoreSnapshot(mergedPayload)
      const result = await getDesktopBridge().writeBoundDataFile(JSON.stringify(snapshot, null, 2))

      return {
        ...result,
        savedAt: snapshot.savedAt,
        payload: normalizeStorePayload(snapshot),
      }
    }

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

    const filePayload = await readStoreFile(handle)
    const mergedPayload = mergeStorePayloads(payload, filePayload)
    return writeStoreFile(handle, mergedPayload)
  })

  writeQueue = task
  return task
}

export async function disconnectDataFile() {
  if (isDesktopStorageSupported()) {
    await getDesktopBridge().disconnectDataFile()
    return
  }

  await clearSavedFileHandle()
}
