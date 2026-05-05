const { app, BrowserWindow, session, ipcMain } = require('electron')
const path = require('path')
const fs = require('fs')
const os = require('os')

function createWindow() {
  const win = new BrowserWindow({
    width: 1600,
    height: 1000,
    backgroundColor: '#000000',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  })

  // Both handlers required: check handler answers "already granted?",
  // request handler handles new requests. Without the check handler,
  // getUserMedia is silently blocked before it reaches the request handler.
  session.defaultSession.setPermissionCheckHandler((_wc, permission) => {
    if (permission === 'media') return true
    return null
  })

  session.defaultSession.setPermissionRequestHandler((_wc, permission, callback) => {
    callback(permission === 'media')
  })

  if (!app.isPackaged) {
    win.loadURL('http://localhost:5173')
    win.webContents.openDevTools({ mode: 'detach' })
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(createWindow)

const captureDir = path.join(os.homedir(), 'Downloads', 'capture')
fs.mkdirSync(captureDir, { recursive: true })

ipcMain.handle('save-capture', (_event, dataUrl) => {
  const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '')
  const filename = path.join(captureDir, `capture_${Date.now()}.jpg`)
  fs.writeFileSync(filename, Buffer.from(base64, 'base64'))
  console.log('[capture] saved', filename)
  return filename
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
