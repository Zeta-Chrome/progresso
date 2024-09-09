const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');

// Create a flag to check if we're in development mode
const isDevelopment = process.env.NODE_ENV === 'development';

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1300,
    height: 700,
    minWidth: 650,
    minHeight: 200,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      enableRemoteModule: false,
      nodeIntegration: false
    },
    icon: path.join(__dirname, 'build', 'icons', '64x64.png')
  });

  // Open DevTools if in development mode
  if (isDevelopment)
    mainWindow.webContents.openDevTools();

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Listen for the app to be ready to quit
app.on('before-quit', (event) => {
  event.preventDefault(); // Prevent the app from quitting immediately
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('app-quitting');
  } else {
    // If the window is already closed, just quit the app
    app.exit();
  }
});

// Listen for the renderer process to confirm data has been saved
ipcMain.on('data-saved', () => {
  app.quit();
});

app.whenReady().then(() => {
  // Remove the default menu bar
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
