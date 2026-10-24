// 桌面 app 和网页之间的小桥：只开放这几个功能，网页拿不到 Node.js。
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('ztgApp', {
  info: () => ipcRenderer.invoke('app-info'),
  checkUpdate: () => ipcRenderer.invoke('check-update'),
  openRelease: () => ipcRenderer.invoke('open-release'),
  setZoom: (z) => ipcRenderer.invoke('set-zoom', z),
});
