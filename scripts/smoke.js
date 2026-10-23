// 冒烟测试：打开 app，截两张图（主页和编辑器），然后退出。
// 用法：npm run smoke   截图会保存在 docs/ 文件夹
const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

const outDir = path.join(__dirname, '..', 'docs');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 1440, height: 900, show: true, webPreferences: { sandbox: true, backgroundThrottling: false } });
  const errors = [];
  win.webContents.on('console-message', (_e, level, msg) => { if (level >= 3) errors.push(msg); });
  await win.loadFile(path.join(__dirname, '..', 'app', 'index.html'));
  await wait(1500);

  const shot = async (name) => {
    const img = await win.webContents.capturePage();
    fs.writeFileSync(path.join(outDir, name), img.toPNG());
  };

  await shot('screenshot-home.png');
  // 进入第 0 章，并让教练自动完成前 7 步，展示一个做到一半的场景
  await win.webContents.executeJavaScript(`
    document.getElementById('chap0').click();
    for (let i = 0; i < 7; i++) {
      document.querySelector('[data-act=auto]').click();
      document.querySelector('[data-act=next]').click();
    }
    document.querySelector('[data-obj]:nth-child(4)')?.click();
  `);
  await wait(800);
  await shot('screenshot-editor.png');

  console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'SMOKE OK');
  app.exit(errors.length ? 1 : 0);
});
