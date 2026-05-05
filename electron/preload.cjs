const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  saveCapture: (dataUrl) => ipcRenderer.invoke('save-capture', dataUrl),
})
