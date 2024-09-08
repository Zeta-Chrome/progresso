const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  onAppQuitting: (callback) => ipcRenderer.on('app-quitting', callback),
  dataSaved: () => ipcRenderer.send('data-saved')
});
