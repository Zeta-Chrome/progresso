const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

const dataPath = path.join(app.getPath('userData'), 'data.json');
console.log(dataPath);
let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1300,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      enableRemoteModule: false,
      nodeIntegration: false
    },
    icon: path.join(__dirname, 'build', 'icons', '64x64.png')
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.loadFile(path.join(__dirname, './renderer/index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // Remove the default menu bar
  Menu.setApplicationMenu(null);

  createWindow();

  ipcMain.handle('saveData', async (event, data) => {
    try {
      fs.writeFileSync(dataPath, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save data:', error);
    }
  });

  ipcMain.handle('loadData', async () => {
    try {
      if (fs.existsSync(dataPath)) {
        const data = JSON.parse(fs.readFileSync(dataPath));
        return data;
      } else {
        return { skills: [], currentTheme: 'light' };
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      return { skills: [], currentTheme: 'light' };
    }
  });

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

app.on('before-quit', () => {
  if (mainWindow) {
    mainWindow.webContents.send('app-closing');
  }
});
