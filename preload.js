const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  saveData: (data) => ipcRenderer.invoke('saveData', data),
  loadData: () => ipcRenderer.invoke('loadData')
});

