const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');

let mainWindow;
const isDevelopment = process.env.NODE_ENV === 'development';

// Import and initialize electron-store once
(async () => {
  const ElectronStore = (await import('electron-store')).default;
  global.store = new ElectronStore(); // Store it in global scope
})();

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1500,
    height: 900,
    minWidth: 1000,
    minHeight: 650,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      enableRemoteModule: false,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, 'build', 'icons', '64x64.png'),
  });

  // Open DevTools if in development mode
  if (isDevelopment)
    mainWindow.webContents.openDevTools();

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));


  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Ensure store is initialized before using it
const ensureStore = async () => {
  if (!global.store) {
    const ElectronStore = (await import('electron-store')).default;
    global.store = new ElectronStore();
  }
};

// Handle Saving Data
ipcMain.on('save-data', async (_event, key, data) => {
  await ensureStore();
  global.store.set(key, data);
});

// Handle Loading Data
ipcMain.handle('load-data', async (_event, key) => {
  await ensureStore();
  return global.store.get(key, null); // Return stored data or null if not found
});

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  createWindow();

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('activate', () => {
    if (mainWindow === null) {
      createWindow();
    }
  });
});
