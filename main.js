// 从零到游戏（Zero to Game）：桌面 app 入口
const { app, BrowserWindow, Menu, shell, ipcMain, net } = require('electron');
const path = require('path');

const REPO = 'jacklim-gif/zero-to-game';
let releaseUrl = `https://github.com/${REPO}/releases`;

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    title: '从零到游戏',
    backgroundColor: '#12151a',
    icon: path.join(__dirname, 'build', 'icon.png'),
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  win.once('ready-to-show', () => win.show());
  win.loadFile(path.join(__dirname, 'app', 'index.html'));

  // 外部链接用系统浏览器打开，不在 app 里开新窗口
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
}

// 版本号比较：1.2.10 > 1.2.9
function newer(a, b) {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0), pb = b.split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) > (pb[i] || 0);
  return false;
}

ipcMain.handle('app-info', () => ({ version: app.getVersion() }));
ipcMain.handle('set-zoom', (e, z) => {
  const v = Math.min(1.5, Math.max(0.75, Number(z) || 1));
  e.sender.setZoomFactor(v);
  return v;
});
// 只会打开本项目在 GitHub 上的发布页
ipcMain.handle('open-release', () => shell.openExternal(releaseUrl));
// 检查更新：问 GitHub 最新发布的版本号，比现在的新就提示用户去下载（不会自动安装）
ipcMain.handle('check-update', async () => {
  const current = app.getVersion();
  try {
    const r = await net.fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'ZeroToGame' },
    });
    if (r.status === 404) return { current, latest: null };
    if (!r.ok) return { current, error: 'http ' + r.status };
    const j = await r.json();
    const latest = String(j.tag_name || '').replace(/^v/, '');
    if (typeof j.html_url === 'string' && j.html_url.startsWith(`https://github.com/${REPO}/`)) releaseUrl = j.html_url;
    return { current, latest, newer: !!latest && newer(latest, current) };
  } catch (err) {
    return { current, error: String((err && err.message) || err) };
  }
});

// 不显示默认菜单栏，让界面更像一个独立的编辑器
Menu.setApplicationMenu(null);

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
