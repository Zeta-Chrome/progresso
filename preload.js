const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  saveData: (key, data) => ipcRenderer.send('save-data', key, data),
  loadData: (key) => ipcRenderer.invoke('load-data', key),
  onAppQuitting: (callback) => ipcRenderer.on('app-quitting', (_event, data) => callback(data))
});
