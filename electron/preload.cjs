const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('dailyGrindDesktop', {
  isDesktop: true,
  loadBoundDataFile: () => ipcRenderer.invoke('daily-grind:load-bound-data-file'),
  createDataFile: (rawText) => ipcRenderer.invoke('daily-grind:create-data-file', rawText),
  previewDataFile: () => ipcRenderer.invoke('daily-grind:preview-data-file'),
  bindDataFile: (payload) => ipcRenderer.invoke('daily-grind:bind-data-file', payload),
  readBoundDataFile: () => ipcRenderer.invoke('daily-grind:read-bound-data-file'),
  writeBoundDataFile: (rawText) => ipcRenderer.invoke('daily-grind:write-bound-data-file', rawText),
  disconnectDataFile: () => ipcRenderer.invoke('daily-grind:disconnect-data-file'),
})
