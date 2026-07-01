const { app, BrowserWindow, dialog, ipcMain } = require('electron')
const fs = require('node:fs/promises')
const path = require('node:path')

const CONFIG_FILE = 'storage-binding.json'
const DEFAULT_FILE_NAME = 'daily-grind-data.json'

let mainWindow = null

function getConfigPath() {
  return path.join(app.getPath('userData'), CONFIG_FILE)
}

async function readBindingConfig() {
  try {
    const raw = await fs.readFile(getConfigPath(), 'utf8')
    const parsed = JSON.parse(raw)

    return {
      dataFilePath: typeof parsed.dataFilePath === 'string' ? parsed.dataFilePath : '',
    }
  } catch {
    return {
      dataFilePath: '',
    }
  }
}

async function writeBindingConfig(config) {
  await fs.mkdir(app.getPath('userData'), { recursive: true })
  await fs.writeFile(getConfigPath(), JSON.stringify(config, null, 2), 'utf8')
}

function getFileInfo(filePath) {
  return {
    fileName: path.basename(filePath),
    filePath,
  }
}

async function readJsonFile(filePath) {
  const rawText = await fs.readFile(filePath, 'utf8')

  return {
    ...getFileInfo(filePath),
    rawText,
  }
}

async function writeJsonFile(filePath, rawText) {
  await fs.writeFile(filePath, rawText, 'utf8')

  return getFileInfo(filePath)
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 980,
    minHeight: 680,
    title: 'Daily Grind',
    backgroundColor: '#f4f6f8',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  const devServerUrl = process.env.VITE_DEV_SERVER_URL

  if (devServerUrl) {
    mainWindow.loadURL(devServerUrl)
    return
  }

  mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

ipcMain.handle('daily-grind:load-bound-data-file', async () => {
  const config = await readBindingConfig()

  if (!config.dataFilePath) {
    return { status: 'unbound' }
  }

  try {
    return {
      status: 'ready',
      ...await readJsonFile(config.dataFilePath),
    }
  } catch (error) {
    return {
      status: 'error',
      ...getFileInfo(config.dataFilePath),
      message: error.message,
    }
  }
})

ipcMain.handle('daily-grind:create-data-file', async (_event, rawText) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: DEFAULT_FILE_NAME,
    filters: [
      {
        name: 'Daily Grind data',
        extensions: ['json'],
      },
    ],
  })

  if (result.canceled || !result.filePath) {
    return { canceled: true }
  }

  const fileInfo = await writeJsonFile(result.filePath, rawText)
  await writeBindingConfig({ dataFilePath: result.filePath })

  return fileInfo
})

ipcMain.handle('daily-grind:preview-data-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      {
        name: 'Daily Grind data',
        extensions: ['json'],
      },
    ],
  })

  if (result.canceled || !result.filePaths.length) {
    return { canceled: true }
  }

  return readJsonFile(result.filePaths[0])
})

ipcMain.handle('daily-grind:bind-data-file', async (_event, { filePath, rawText }) => {
  if (!filePath) {
    throw new Error('没有可绑定的 JSON 数据文件。')
  }

  const fileInfo = await writeJsonFile(filePath, rawText)
  await writeBindingConfig({ dataFilePath: filePath })

  return fileInfo
})

ipcMain.handle('daily-grind:read-bound-data-file', async () => {
  const config = await readBindingConfig()

  if (!config.dataFilePath) {
    return { status: 'unbound' }
  }

  try {
    return {
      status: 'ready',
      ...await readJsonFile(config.dataFilePath),
    }
  } catch (error) {
    return {
      status: 'error',
      ...getFileInfo(config.dataFilePath),
      message: error.message,
    }
  }
})

ipcMain.handle('daily-grind:write-bound-data-file', async (_event, rawText) => {
  const config = await readBindingConfig()

  if (!config.dataFilePath) {
    throw new Error('还没有绑定 JSON 数据文件。')
  }

  return writeJsonFile(config.dataFilePath, rawText)
})

ipcMain.handle('daily-grind:disconnect-data-file', async () => {
  await writeBindingConfig({ dataFilePath: '' })
  return { status: 'unbound' }
})
