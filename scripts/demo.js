// 打开渲染器技术验证 demo：npm run demo
const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

Menu.setApplicationMenu(null);
app.whenReady().then(() => {
  const win = new BrowserWindow({
    width: 1440, height: 900, title: 'Renderer demo', backgroundColor: '#05070a',
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  win.loadFile(path.join(__dirname, '..', 'prototypes', 'renderer-demo.html'));
});
app.on('window-all-closed', () => app.quit());
