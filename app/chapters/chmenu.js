// 菜单课：主菜单（一个新场景，开始 / 退出按钮）+ 暂停菜单（按 Esc）。
// 开场就是做完第 1 章下篇的走廊（存在 SampleScene 里）。学会：新建 / 打开场景、Scene List、按钮的 On Click、Time.timeScale。
// 写法和其他章节文件一样。
(() => {
'use strict';
const G = window.ZTG;
const H = () => G.hint;
const T = (zh, en) => ({zh, en});
const setTo = v => T(`改成 ${v}，按 Enter`, `Set to ${v}, press Enter`);
const fixNum = (bind, want, cur) => Math.abs(cur - want) < .001 ? null : {at:H().field(bind), label:setTo(want)};
const viaMenu = (plus, keys, label) => [...keys.slice().reverse().map(k => ({at:H().mi(k), label})), {at:plus, label}];
const selFirst = o => H().isSel(o) ? null : {at:H().row(o.id), label:G.t('hSelect')};
const near1 = (a, b) => Math.abs(a - b) < .001;
const byName = n => G.S.objs.find(o => o.name === n);
const nameIt = (o, want) => o.name === want ? null : selFirst(o) || {at:H().field('name'), label:T(`改成 ${want}，按 Enter`, `Type ${want}, press Enter`)};
const scriptA = n => G.S.assets.find(a => a.type === 'script' && a.name === n);
const scriptOn = (o, n) => o ? o.scripts.find(s => (G.asset(s.asset) || {}).name === n) : null;
const scriptOk = n => { const a = scriptA(n); return !!a && !!a.comp && a.comp.ok; };
const lum = c => { const n = parseInt(String(c).slice(1), 16); return (.2126 * (n >> 16 & 255) + .7152 * (n >> 8 & 255) + .0722 * (n & 255)) / 255; };
const isRed = c => { const n = parseInt(String(c).slice(1), 16); return (n >> 16 & 255) > 180 && (n >> 8 & 255) < 110 && (n & 255) < 110; };
const playStep = (doneFlag, during, stopLab) => {
  if (!G.S.playing) return doneFlag ? null : {at:'#playbtn', label:T('点播放', 'Click Play')};
  return doneFlag ? {at:'#playbtn', label:stopLab || T('点一下停止', 'Click to stop')} : during;
};
const saveHint = () => [{at:H().mi('save'), label:T('点保存', 'Click Save')}, {at:'#menu-file', label:T('点 文件 → 保存（或按 Ctrl/Cmd+S）', 'File → Save (or Ctrl/Cmd+S)')}];
const savedNow = () => G.S.flags.saved && !G.S.dirty;

// ---------- 场景 ----------
const scenesFolder = () => G.S.assets.find(a => a.type === 'folder' && a.name === 'Scenes' && a.parent === 0);
const sceneA = n => G.S.assets.find(a => a.type === 'scene' && a.name === n);
const cur = () => G.curScene();
const inScene = (sn, on) => { const sc = sceneA(sn); return sc ? G.sceneObjs(sc.id).find(o => o.name === on) : null; };
const inList = n => { const sc = sceneA(n); return !!sc && G.S.sceneList.some(x => x.id === sc.id && x.on); };
const firstInList = n => { const sc = sceneA(n), l = G.S.sceneList.filter(x => x.on); return !!sc && !!l.length && l[0].id === sc.id; };
function openHint(n) {
  if (G.floatOpen() === 'scenesave') return {at:'#float [data-sd="save"]', label:T('点保存', 'Click Save')};
  const sc = sceneA(n); if (!sc) return null; const r = H().reach(sc); if (r.nav) return r;
  return {at:r.at, label:T(`双击打开 ${n}`, `Double-click to open ${n}`)};
}
function ensureOpen(n) { const sc = sceneA(n); if (!sc || cur() === n) return; if (G.S.dirty) G.saveScene(); G.openScene(sc.id, true); }

// ---------- 脚本 ----------
function scriptFlow(name, host) {
  const h = H();
  if (G.S.renaming != null) return {at:'#rn', label:T(`输入 ${name}，按 Enter`, `Type ${name}, press Enter`)};
  const s = scriptA(name);
  if (!s) {
    const w = G.S.assets.find(a => a.type === 'script' && !G.lib()[a.name]);
    if (w) { const r = h.reach(w); if (r.nav) return r; return h.isSel(w) ? {at:h.field('aname'), label:T(`改成 ${name}，按 Enter`, `Rename to ${name}, press Enter`)} : {at:r.at, label:T('点选这个脚本', 'Select this script')}; }
    return viaMenu('#proj-plus', ['create', 'script'], T('点 +，选 创建 → MonoBehaviour 脚本', 'Click +, then Create → MonoBehaviour Script'));
  }
  const tm = G.lib()[name];
  if (G.codeOpen() === s.id) {
    const bad = tm.blanks.find(b => G.codeDraft(b.id) === '' || (s.comp && s.comp.errs.some(e => e.b === b.id) && G.codeDraft(b.id) === String((s.blanks || {})[b.id] || '')));
    if (bad) return {at:`#modal .blank[data-b="${bad.id}"]`, label:bad.tip};
    if (G.codeDirty() || !(s.comp && s.comp.ok)) return {at:'#csave', label:G.t('hSaveCode')};
    return null;
  }
  const r = h.reach(s); if (r.nav) return r;
  if (!(s.comp && s.comp.ok)) return {at:r.at, label:T('双击打开代码，把空填好', 'Double-click to open the code and fill the blanks')};
  if (host && !scriptOn(host, name)) return {from:r.at, to:h.row(host.id), label:T(`拖到 ${host.name} 上`, `Drag onto ${host.name}`)};
  return null;
}
function ensureScript(name) {
  let a = scriptA(name);
  if (!a) { const f = G.S.assets.find(x => x.type === 'folder' && x.name === 'Scripts' && x.parent === 0) || G.mkAsset('folder', 'Scripts', 0); a = G.mkAsset('script', name, f.id); }
  G.closeCode(); a.blanks = Object.assign({}, G.lib()[name].answers); G.compileScript(a); return a;
}
const attach = (o, name) => { const a = ensureScript(name); let s = scriptOn(o, name); if (!s) { G.addScript(o, a); s = scriptOn(o, name); } return s; };
const freshEmpty = () => G.S.objs.find(o => o.type === 'empty' && !o.audio && !o.vol && !o.col && !o.anim && !o.scripts.length && /^(gameobject|游戏对象)/i.test(o.name) && o.parent == null);

// ---------- UI ----------
const uiOf = (type, name) => G.S.objs.find(o => o.type === type && o.name === name);
const fresh = (type, used) => G.S.objs.find(o => o.type === type && !used.includes(o.name));
function makeUI(kind, name, props) { let o = uiOf(kind, name); if (!o) { o = G.createUI(kind); o.name = name; } Object.assign(o.ui, props); return o; }
function uiFlow(kind, menuK, name, used, want, menuLab) {
  let o = uiOf(kind, name);
  if (!o) { const f = fresh(kind, used); if (f) return nameIt(f, name); return viaMenu('#hier-plus', ['ui', menuK], menuLab); }
  const s = selFirst(o); const u = o.ui;
  for (const [k, bind, v] of want) {
    const curv = u[k];
    if (typeof v === 'number') { if (!near1(curv, v)) return s || {at:H().field(bind), label:setTo(v)}; }
    else if (k === 'align') { if (curv !== v) return s || {at:H().field(bind), label:T('选 居中', 'Choose Center')}; }
    else if (String(curv) !== v) return s || {at:H().field(bind), label:v === '' ? T('把字删光', 'Delete all the text') : T(`改成 ${v}，按 Enter`, `Type ${v}, press Enter`)};
  }
  return null;
}
const uiMatch = (o, want) => !!o && want.every(([k, , v]) => typeof v === 'number' ? near1(o.ui[k], v) : String(o.ui[k]) === v);
const ocOk = (btn, host, fn) => !!btn && !!host && (btn.ui.onClick || []).some(e => e.obj === host.id && e.fn === fn);
function ocFlow(btn, host, fn) {
  if (!btn || !host || ocOk(btn, host, fn)) return null;
  const s = selFirst(btn); if (s) return s;
  const oc = btn.ui.onClick || []; if (!oc.length) return {at:'#insp-body [data-act="ocadd"]', label:T('点 + 加一项', 'Click + to add an entry')};
  if (oc[0].obj !== host.id) return {from:H().row(host.id), to:`#insp-body [data-drop="onclick:${btn.id}:0"]`, label:T(`把 ${host.name} 拖进来`, `Drag ${host.name} in`)};
  return {at:'#insp-body [data-bind="ocfn.0"]', label:T(`选 ${fn.replace('.', ' → ')}`, `Choose ${fn.replace('.', ' → ')}`)};
}
function setOc(btn, host, fn) { btn.ui.onClick = [{obj:host.id, fn}]; }
const btnIn = id => `#uilayer [data-uibtn="${id}"]`;

const BG_W = [['alpha', 'ualpha', 1]];
const TITLE_W = [['text', 'utext', 'THE CORRIDOR'], ['size', 'usize', 110], ['align', 'ualign', 'center'], ['y', 'uy', 250], ['w', 'uw', 1400]];
const START_W = [['text', 'utext', 'START'], ['w', 'uw', 420], ['h', 'uh', 90], ['y', 'uy', 0]];
const QUIT_W = [['text', 'utext', 'QUIT'], ['w', 'uw', 420], ['h', 'uh', 90], ['y', 'uy', -140]];
const PAUSED_W = [['text', 'utext', 'PAUSED'], ['size', 'usize', 90], ['align', 'ualign', 'center'], ['y', 'uy', 200], ['w', 'uw', 800]];
const RESUME_W = [['text', 'utext', 'RESUME'], ['w', 'uw', 420], ['h', 'uh', 90], ['y', 'uy', 0]];
const MENU_W = [['text', 'utext', 'MAIN MENU'], ['w', 'uw', 420], ['h', 'uh', 90], ['y', 'uy', -140]];
const mm = () => byName('MenuManager'), pm = () => byName('PauseManager'), panel = () => uiOf('uipanel', 'PausePanel');

const STEPS = [
 // 1
 {title:T('新建场景 MainMenu', 'Create a MainMenu scene'), glow:() => ['#p-proj'],
  point:() => { if (G.S.renaming != null) return {at:'#rn', label:T('输入 MainMenu，按 Enter', 'Type MainMenu, press Enter')};
    const f = scenesFolder(); if (sceneA('MainMenu') && sceneA('MainMenu').parent === (f ? f.id : 0)) return null;
    const ns = G.S.assets.find(a => a.type === 'scene' && /^New Scene/.test(a.name)); if (ns) { const r = H().reach(ns); if (r.nav) return r; return H().isSel(ns) ? {at:H().field('aname'), label:T('改成 MainMenu，按 Enter', 'Rename to MainMenu, press Enter')} : {at:r.at, label:T('点选它', 'Select it')}; }
    const r = H().reach(sceneA('SampleScene')); if (r.nav) return r;
    return viaMenu('#proj-plus', ['create', 'scene'], T('点 +，选 创建 → 场景', 'Click +, then Create → Scene')); },
  body:T('游戏通常不止一个 <b>场景</b>：主菜单是一个，关卡是另一个。你做好的走廊就在 Scenes 文件夹的 SampleScene 里。在同一个文件夹里新建一个场景，叫 MainMenu。',
         'A game usually has more than one <b>scene</b>: the main menu is one, each level another. Your corridor lives in SampleScene in the Scenes folder. Create a new scene in the same folder called MainMenu.'),
  conds:[[T('Scenes 文件夹里：创建 → 场景，改名 MainMenu', 'In the Scenes folder: Create → Scene, named MainMenu'), () => { const f = scenesFolder(), s = sceneA('MainMenu'); return !!s && !!f && s.parent === f.id; }]],
  hint:T('先双击 Scenes 文件夹进去，再点项目窗口的 +。', 'Double-click the Scenes folder first, then click + in the Project window.'),
  auto:() => { const f = scenesFolder(); let s = sceneA('MainMenu') || G.S.assets.find(a => a.type === 'scene' && /^New Scene/.test(a.name)); if (!s) s = G.createSceneAsset('MainMenu', f ? f.id : 0); s.name = 'MainMenu'; if (f) s.parent = f.id; G.S.renaming = null; }},

 // 2
 {title:T('打开 MainMenu', 'Open MainMenu'), glow:() => ['#p-proj', '#p-hier'],
  point:() => cur() === 'MainMenu' ? null : openHint('MainMenu'),
  body:T('在项目窗口 <b>双击</b> MainMenu 打开它。层级窗口会变成新场景的内容：只有主摄像机和方向光。走廊没有不见，它还好好地存在 SampleScene 里。',
         '<b>Double-click</b> MainMenu in the Project window to open it. The Hierarchy switches to the new scene: just a Main Camera and a Directional Light. The corridor isn’t gone — it’s safe in SampleScene.'),
  conds:[[T('双击打开 MainMenu（层级最上面写着 MainMenu）', 'Double-click MainMenu (the Hierarchy header says MainMenu)'), () => cur() === 'MainMenu']],
  hint:T('如果场景有没保存的改动，Unity 会先问要不要保存。选「保存」最安全。', 'If the scene has unsaved changes, Unity asks whether to save first. Save is the safe choice.'),
  auto:() => ensureOpen('MainMenu')},

 // 3
 {title:T('背景和标题', 'Background and title'), glow:() => ['#p-hier', '#p-insp'],
  point:() => { if (cur() !== 'MainMenu') return openHint('MainMenu');
    const bg = uiOf('uipanel', 'Background');
    if (!bg) { const f = fresh('uipanel', ['Background']); if (f) return nameIt(f, 'Background'); return viaMenu('#hier-plus', ['ui', 'uipanel'], T('点 +，选 UI → 面板', 'Click +, then UI → Panel')); }
    if (lum(bg.ui.color) > .15) return selFirst(bg) || {at:H().field('ucolor'), label:T('输入 #0d0e12，按 Enter', 'Type #0d0e12, press Enter')};
    const bgF = uiFlow('uipanel', 'uipanel', 'Background', ['Background'], BG_W, T('点 +，选 UI → 面板', 'Click +, then UI → Panel')); if (bgF) return bgF;
    return uiFlow('uitext', 'uitext', 'Title', ['Title'], TITLE_W, T('点 +，选 UI → 文本', 'Click +, then UI → Text')); },
  body:T('用 UI 做主菜单。先放一个 <b>面板</b>（Panel）当背景：面板会自动铺满整个画面，不管屏幕是什么形状。再放一个大标题。<b>层级里排在后面的 UI 会画在上面</b>，所以先做背景，再做标题。',
         'Build the menu out of UI. First a <b>Panel</b> as the background: a panel always stretches to fill the screen, whatever its shape. Then a big title. <b>UI lower in the Hierarchy draws on top</b>, so make the background first and the title second.'),
  conds:[[T('UI → 面板，改名 Background：颜色很暗（例如 #0d0e12），透明度 1（不透明）', 'UI → Panel named Background: a very dark color (e.g. #0d0e12), Alpha 1 (solid)'),
          () => { const b = uiOf('uipanel', 'Background'); return uiMatch(b, BG_W) && lum(b.ui.color) <= .15; }],
         [T('UI → 文本，改名 Title：写 THE CORRIDOR，字号 110，居中，宽 1400，位置 Y 250，排在 Background 下面', 'UI → Text named Title: THE CORRIDOR, Font Size 110, centered, Width 1400, Position Y 250, below Background in the Hierarchy'),
          () => { const tt = uiOf('uitext', 'Title'), b = uiOf('uipanel', 'Background'); return uiMatch(tt, TITLE_W) && !!b && G.S.objs.indexOf(tt) > G.S.objs.indexOf(b); }]],
  hint:T('标题颜色可以改成红色（#e5484d），和走廊的气氛一样。', 'Make the title red (#e5484d) to match the corridor’s mood.'),
  note:T('建第一个 UI 时，Unity 自动加了画布（Canvas）和事件系统（EventSystem）。事件系统负责「点击」，等一下按钮要靠它。', 'With your first UI element, Unity added a Canvas and an EventSystem. The EventSystem handles clicks — the buttons will need it.'),
  auto:() => { ensureOpen('MainMenu'); const b = makeUI('uipanel', 'Background', {color:'#0d0e12', alpha:1});
    const tt = makeUI('uitext', 'Title', {text:'THE CORRIDOR', size:110, align:'center', y:250, x:0, w:1400, h:160, anchor:'mc', color:'#e5484d'});
    if (G.S.objs.indexOf(tt) < G.S.objs.indexOf(b)) { G.S.objs.splice(G.S.objs.indexOf(tt), 1); G.S.objs.push(tt); } }},

 // 4
 {title:T('两个按钮', 'Two buttons'), glow:() => ['#p-hier', '#p-insp'],
  point:() => { if (cur() !== 'MainMenu') return openHint('MainMenu');
    const used = ['StartButton', 'QuitButton'];
    const a = uiFlow('uibutton', 'uibutton', 'StartButton', used, START_W, T('点 +，选 UI → 按钮', 'Click +, then UI → Button')); if (a) return a;
    const b = uiFlow('uibutton', 'uibutton', 'QuitButton', used, QUIT_W, T('点 +，选 UI → 按钮', 'Click +, then UI → Button')); if (b) return b;
    for (const n of used) { const o = uiOf('uibutton', n); if (!isRed(o.ui.hl)) return selFirst(o) || {at:H().field('uhl'), label:T('输入 #e5484d，按 Enter', 'Type #e5484d, press Enter')}; }
    return null; },
  body:T('加两个 <b>按钮</b>：「START」和「QUIT」。再把它们的「鼠标移上去的颜色」（Highlighted Color）改成红色：播放时鼠标移到按钮上，按钮会变红，玩家就知道可以点。',
         'Add two <b>buttons</b>: START and QUIT. Set each one’s Highlighted Color to red: during Play, a button turns red when the mouse is over it, so players know it’s clickable.'),
  conds:[[T('按钮 StartButton：文字 START，大小 420 × 90，位置 Y 0', 'Button StartButton: text START, size 420 × 90, Position Y 0'), () => uiMatch(uiOf('uibutton', 'StartButton'), START_W)],
         [T('按钮 QuitButton：文字 QUIT，大小 420 × 90，位置 Y -140', 'Button QuitButton: text QUIT, size 420 × 90, Position Y -140'), () => uiMatch(uiOf('uibutton', 'QuitButton'), QUIT_W)],
         [T('两个按钮的「鼠标移上去的颜色」都改成红色（#e5484d）', 'Set both buttons’ Highlighted Color to red (#e5484d)'), () => ['StartButton', 'QuitButton'].every(n => { const o = uiOf('uibutton', n); return !!o && isRed(o.ui.hl); })]],
  hint:T('做好一个按钮后，可以选中它按 Ctrl+D 复制，再改名字、文字和位置。', 'After making one button, select it and press Ctrl+D to copy it, then change the name, text and position.'),
  auto:() => { ensureOpen('MainMenu'); makeUI('uibutton', 'StartButton', {text:'START', w:420, h:90, x:0, y:0, size:46, anchor:'mc', hl:'#e5484d'}); makeUI('uibutton', 'QuitButton', {text:'QUIT', w:420, h:90, x:0, y:-140, size:46, anchor:'mc', hl:'#e5484d'}); }},

 // 5
 {title:T('MainMenu 脚本', 'The MainMenu script'), glow:() => ['#p-hier', '#p-proj'],
  point:() => { if (cur() !== 'MainMenu') return openHint('MainMenu');
    let m = mm(); if (!m) { const e = freshEmpty(); if (e) return nameIt(e, 'MenuManager'); return viaMenu('#hier-plus', ['empty'], T('点 +，选 创建空物体', 'Click +, then Create Empty')); }
    return scriptFlow('MainMenu', m); },
  body:T('新建一个空物体 MenuManager，再新建脚本 <b>MainMenu</b>（填 2 个空）挂上去。它有两个 <code>public</code> 方法：StartGame 用 <code>SceneManager.LoadScene</code> 打开走廊，QuitGame 关掉游戏。',
         'Create an empty object called MenuManager, then a script named <b>MainMenu</b> (2 blanks) on it. It has two <code>public</code> methods: StartGame opens the corridor with <code>SceneManager.LoadScene</code>, and QuitGame quits the game.'),
  conds:[[T('新建空物体 MenuManager', 'Create an Empty named MenuManager'), () => !!mm()],
         [T('新建脚本 MainMenu，填好 2 个空，挂到 MenuManager 上', 'Create a script named MainMenu, fill in 2 blanks, and put it on MenuManager'), () => scriptOk('MainMenu') && !!scriptOn(mm(), 'MainMenu')]],
  hint:T('场景名字要和项目窗口里的一模一样，包括大小写：SampleScene。', 'The scene name must match the Project window exactly, including capitals: SampleScene.'),
  auto:() => { ensureOpen('MainMenu'); let m = mm() || G.mkObj('empty', 'MenuManager'); m.name = 'MenuManager'; attach(m, 'MainMenu'); }},

 // 6
 {title:T('按钮的 On Click', 'The buttons’ On Click'), glow:() => ['#p-insp'],
  point:() => { if (cur() !== 'MainMenu') return openHint('MainMenu');
    return ocFlow(uiOf('uibutton', 'StartButton'), mm(), 'MainMenu.StartGame') || ocFlow(uiOf('uibutton', 'QuitButton'), mm(), 'MainMenu.QuitGame'); },
  body:T('告诉按钮「被点的时候做什么」：选中 StartButton，在检查器的 <b>On Click ()</b> 点 +，把层级里的 MenuManager 拖进格子，再在右边选 <b>MainMenu → StartGame</b>。QuitButton 也一样，选 QuitGame。',
         'Tell each button what to do when clicked: select StartButton, click + under <b>On Click ()</b> in the Inspector, drag MenuManager from the Hierarchy into the slot, then choose <b>MainMenu → StartGame</b> on the right. Do the same for QuitButton with QuitGame.'),
  conds:[[T('StartButton 的 On Click：MenuManager → MainMenu.StartGame', 'StartButton On Click: MenuManager → MainMenu.StartGame'), () => ocOk(uiOf('uibutton', 'StartButton'), mm(), 'MainMenu.StartGame')],
         [T('QuitButton 的 On Click：MenuManager → MainMenu.QuitGame', 'QuitButton On Click: MenuManager → MainMenu.QuitGame'), () => ocOk(uiOf('uibutton', 'QuitButton'), mm(), 'MainMenu.QuitGame')]],
  hint:T('下拉菜单里只会出现 public 的方法。', 'Only public methods appear in the dropdown.'),
  auto:() => { ensureOpen('MainMenu'); const m = mm(); if (!m) return; setOc(uiOf('uibutton', 'StartButton'), m, 'MainMenu.StartGame'); setOc(uiOf('uibutton', 'QuitButton'), m, 'MainMenu.QuitGame'); }},

 // 7
 {title:T('保存，播放：故意出错', 'Save and play: an error on purpose'), glow:() => G.S.playing ? ['#cwrap'] : ['#menu-file', '#playbtn'], play:true,
  point:() => { if (!G.S.playing && !savedNow()) return saveHint();
    const sb = uiOf('uibutton', 'StartButton');
    return playStep(G.S.flags.sceneErr, sb && !G.S.flags.sceneErr ? {at:btnIn(sb.id), label:T('点 START', 'Click START')} : null); },
  body:T('保存场景，点播放，再点游戏画面里的 START。控制台会出现红字：<i>couldn’t be loaded</i>。Unity 只能打开 <b>Scene List</b>（场景列表）里的场景，而我们还没把场景加进去。这是故意的，下一步修好。',
         'Save the scene, press Play, and click START in the Game view. The Console shows a red error: <i>couldn’t be loaded</i>. Unity can only open scenes that are in the <b>Scene List</b>, and we haven’t added any yet. That’s on purpose — the next step fixes it.'),
  conds:[[T('保存场景（Ctrl/Cmd+S）', 'Save the scene (Ctrl/Cmd+S)'), () => savedNow() || G.S.flags.sceneErr],
         [T('点播放，点 START：控制台报红字', 'Press Play and click START: a red error appears'), () => G.S.flags.sceneErr]],
  hint:T('鼠标移到按钮上，它会变红：这就是上一步设的 Highlighted Color。', 'Hover over a button and it turns red — that’s the Highlighted Color you set.'),
  auto:() => { if (G.S.playing) G.stopPlay(); ensureOpen('MainMenu'); G.saveScene(); G.S.flags.sceneErr = true; }},

 // 8
 {title:T('Scene List：把两个场景加进去', 'Scene List: add both scenes'), glow:() => ['#menu-file'], play:true,
  point:() => { const F = G.S.flags, ok = firstInList('MainMenu') && inList('SampleScene');
    if (!ok) {
      if (G.S.playing) return {at:'#playbtn', label:G.t('hStopFirst')};
      if (G.floatOpen() !== 'build') return [{at:H().mi('buildprofiles'), label:T('Build Profiles', 'Build Profiles')}, {at:'#menu-file', label:T('点 文件 → Build Profiles', 'File → Build Profiles')}];
      if (!inList('MainMenu')) return cur() === 'MainMenu' ? {at:'#float [data-sl="addopen"]', label:T('点这里', 'Click here')} : openHint('MainMenu');
      if (!inList('SampleScene')) { const sc = sceneA('SampleScene'), r = H().reach(sc); if (r.nav) return r; return {from:r.at, to:'#float .slist', label:T('把 SampleScene 拖进列表', 'Drag SampleScene into the list')}; }
      const i = G.S.sceneList.findIndex(x => x.id === sceneA('MainMenu').id); return {at:`#float [data-sl="up"][data-i="${i}"]`, label:T('移到最上面', 'Move it to the top')}; }
    if (cur() !== 'MainMenu' && !G.S.playing) return openHint('MainMenu');
    const loaded = (F.loaded || []).includes('SampleScene');
    if (!G.S.playing) return F.quitClicked && loaded ? null : {at:'#playbtn', label:T('点播放', 'Click Play')};
    if (!F.quitClicked) { const q = uiOf('uibutton', 'QuitButton'); return q ? {at:btnIn(q.id), label:T('先点 QUIT', 'Click QUIT first')} : null; }
    if (!loaded) { const sb = uiOf('uibutton', 'StartButton'); return sb ? {at:btnIn(sb.id), label:T('再点 START', 'Now click START')} : null; }
    return {at:'#playbtn', label:T('点一下停止', 'Click to stop')}; },
  body:T('打开 <b>文件 → Build Profiles</b>，在 Scene List 里点「Add Open Scenes」，加入现在打开的 MainMenu；再把项目窗口里的 SampleScene 拖进列表。MainMenu 要在第 0 个：打包后的游戏一打开，先看到的就是 0 号场景。然后播放试试两个按钮。',
         'Open <b>File → Build Profiles</b>. In the Scene List click Add Open Scenes to add the open MainMenu, then drag SampleScene in from the Project window. MainMenu must be number 0: a built game opens scene 0 first. Then play and try both buttons.'),
  conds:[[T('Scene List：MainMenu 是第 0 个', 'Scene List: MainMenu is number 0'), () => firstInList('MainMenu')],
         [T('Scene List：SampleScene 也在列表里', 'Scene List: SampleScene is in it too'), () => inList('SampleScene')],
         [T('播放，点 QUIT：控制台出现 Quit', 'Play and click QUIT: the Console says Quit'), () => G.S.flags.quitClicked],
         [T('点 START：走廊打开了', 'Click START: the corridor opens'), () => (G.S.flags.loaded || []).includes('SampleScene')]],
  hint:T('点 QUIT 游戏不会关掉：Application.Quit 在编辑器里不起作用，只有打包后的游戏才会关。所以代码先打印一句「Quit」，确认按钮有用。', 'QUIT doesn’t close anything here: Application.Quit is ignored in the editor and only works in a built game. That’s why the code prints “Quit” first, to prove the button works.'),
  note:T('停止播放后，编辑器会回到 MainMenu：播放时打开的场景只在播放期间有效。', 'When you stop, the editor returns to MainMenu: scenes opened during Play only last until you stop.'),
  auto:() => { if (G.S.playing) G.stopPlay(); ensureOpen('MainMenu'); const m = sceneA('MainMenu'), s = sceneA('SampleScene'); const L = G.S.sceneList.filter(x => x.id !== m.id && x.id !== s.id);
    G.S.sceneList.length = 0; G.S.sceneList.push({id:m.id, on:true}, {id:s.id, on:true}, ...L); G.closeFloat(); Object.assign(G.S.flags, {quitClicked:true, loaded:(G.S.flags.loaded || []).concat('SampleScene')}); }},

 // 9
 {title:T('回到走廊：暂停面板', 'Back to the corridor: a pause panel'), glow:() => ['#p-proj', '#p-hier'],
  point:() => { if (cur() !== 'SampleScene') return G.S.playing ? {at:'#playbtn', label:G.t('hStopFirst')} : openHint('SampleScene');
    let p = panel(); if (!p) { const f = fresh('uipanel', ['PausePanel', 'Background']); if (f) return nameIt(f, 'PausePanel'); return viaMenu('#hier-plus', ['ui', 'uipanel'], T('点 +，选 UI → 面板', 'Click +, then UI → Panel')); }
    if (lum(p.ui.color) > .05) return selFirst(p) || {at:H().field('ucolor'), label:T('输入 #000000，按 Enter', 'Type #000000, press Enter')};
    return selFirst(p) || fixNum('ualpha', .7, p.ui.alpha); },
  body:T('双击打开 SampleScene（你的走廊）。加一个 UI <b>面板</b>（Panel），改名 PausePanel：它会铺满整个画面。颜色改成黑色、透明度 0.7：暂停时画面变暗，但还看得到后面的走廊。',
         'Double-click SampleScene (your corridor) to open it. Add a UI <b>Panel</b> named PausePanel — it covers the whole screen. Make it black with Alpha 0.7: when paused the screen dims, but you can still see the corridor behind it.'),
  conds:[[T('双击打开 SampleScene', 'Double-click SampleScene to open it'), () => cur() === 'SampleScene'],
         [T('UI → 面板，改名 PausePanel，颜色黑色（#000000），透明度 0.7', 'UI → Panel named PausePanel, black (#000000), Alpha 0.7'), () => { const p = panel(); return !!p && lum(p.ui.color) <= .05 && near1(p.ui.alpha, .7); }]],
  hint:T('透明度（A）0 是完全透明，1 是完全不透明。', 'Alpha (A) 0 is fully transparent, 1 is fully solid.'),
  auto:() => { if (G.S.playing) G.stopPlay(); ensureOpen('SampleScene'); makeUI('uipanel', 'PausePanel', {color:'#000000', alpha:.7}); }},

 // 10
 {title:T('面板里的字和按钮', 'Text and buttons on the panel'), glow:() => ['#p-hier', '#p-insp'],
  point:() => { if (cur() !== 'SampleScene') return openHint('SampleScene'); const p = panel(); if (!p) return null;
    const used = ['PausedText', 'Message', 'Prompt'];
    const a = uiFlow('uitext', 'uitext', 'PausedText', used, PAUSED_W, T('点 +，选 UI → 文本', 'Click +, then UI → Text')); if (a) return a;
    const bu = ['ResumeButton', 'MenuButton'];
    const b = uiFlow('uibutton', 'uibutton', 'ResumeButton', bu, RESUME_W, T('点 +，选 UI → 按钮', 'Click +, then UI → Button')); if (b) return b;
    const c = uiFlow('uibutton', 'uibutton', 'MenuButton', bu, MENU_W, T('点 +，选 UI → 按钮', 'Click +, then UI → Button')); if (c) return c;
    for (const o of [uiOf('uitext', 'PausedText'), uiOf('uibutton', 'ResumeButton'), uiOf('uibutton', 'MenuButton')]) if (o.parent !== p.id) return {from:H().row(o.id), to:H().row(p.id), label:T(`把 ${o.name} 拖到 PausePanel 上`, `Drag ${o.name} onto PausePanel`)};
    return null; },
  body:T('在面板上放一个大字「PAUSED」和两个按钮：「RESUME」（继续）和「MAIN MENU」（回主菜单）。再把这三个都拖到 PausePanel 上，变成它的子物体：等一下只要关掉面板，里面的东西就一起消失。',
         'Put a big “PAUSED” text and two buttons — RESUME and MAIN MENU — on the panel. Then drag all three onto PausePanel to make them its children: switching the panel off later hides everything inside it at once.'),
  conds:[[T('文本 PausedText：PAUSED，字号 90，居中，宽 800，位置 Y 200', 'Text PausedText: PAUSED, Font Size 90, centered, Width 800, Position Y 200'), () => uiMatch(uiOf('uitext', 'PausedText'), PAUSED_W)],
         [T('按钮 ResumeButton（RESUME，Y 0）和 MenuButton（MAIN MENU，Y -140），大小都是 420 × 90', 'Buttons ResumeButton (RESUME, Y 0) and MenuButton (MAIN MENU, Y -140), both 420 × 90'), () => uiMatch(uiOf('uibutton', 'ResumeButton'), RESUME_W) && uiMatch(uiOf('uibutton', 'MenuButton'), MENU_W)],
         [T('把这三个都拖进 PausePanel（变成它的子物体）', 'Drag all three into PausePanel (as its children)'), () => { const p = panel(); return !!p && ['PausedText', 'ResumeButton', 'MenuButton'].every(n => { const o = byName(n); return !!o && o.parent === p.id; }); }]],
  hint:T('先做好、再拖进去：拖进去以后层级会缩进一格。', 'Make them first, then drag them in: they indent under PausePanel in the Hierarchy.'),
  auto:() => { ensureOpen('SampleScene'); const p = panel(); if (!p) return;
    const list = [makeUI('uitext', 'PausedText', Object.assign({anchor:'mc', x:0, h:140, color:'#ffffff'}, {text:'PAUSED', size:90, align:'center', y:200, w:800})),
      makeUI('uibutton', 'ResumeButton', {text:'RESUME', w:420, h:90, x:0, y:0, size:46, anchor:'mc', hl:'#e5484d'}), makeUI('uibutton', 'MenuButton', {text:'MAIN MENU', w:420, h:90, x:0, y:-140, size:46, anchor:'mc', hl:'#e5484d'})];
    list.forEach(o => { if (o.parent !== p.id) G.setParent(o, p); }); }},

 // 11
 {title:T('PauseMenu 脚本', 'The PauseMenu script'), glow:() => ['#p-hier', '#p-proj'],
  point:() => { if (cur() !== 'SampleScene') return openHint('SampleScene'); const p = panel();
    let m = pm(); if (!m) { const e = freshEmpty(); if (e) return nameIt(e, 'PauseManager'); return viaMenu('#hier-plus', ['empty'], T('点 +，选 创建空物体', 'Click +, then Create Empty')); }
    const sf = scriptFlow('PauseMenu', m); if (sf) return sf;
    const s = scriptOn(m, 'PauseMenu'); if (p && s.vals.pausePanel !== p.id) return selFirst(m) || {from:H().row(p.id), to:`#insp-body [data-drop="ref:${m.id}:${m.scripts.indexOf(s)}:pausePanel"]`, label:T('把 PausePanel 拖进格子', 'Drag PausePanel into the slot')};
    if (p && p.active !== false) return selFirst(p) || {at:H().field('active'), label:T('取消勾选', 'Uncheck it')};
    return null; },
  body:T('新建空物体 PauseManager，挂上新脚本 <b>PauseMenu</b>（填 2 个空），把 PausePanel 拖进格子。最后取消勾选 PausePanel 名字旁边的勾：开始时看不到它，按 Esc 才出现。',
         'Create an empty object called PauseManager with a new script <b>PauseMenu</b> (2 blanks), and drag PausePanel into its slot. Finally uncheck the box next to PausePanel’s name so it’s hidden at the start and only appears when you press Esc.'),
  conds:[[T('空物体 PauseManager，挂上 PauseMenu（填好 2 个空）', 'An Empty named PauseManager with PauseMenu (2 blanks filled)'), () => scriptOk('PauseMenu') && !!scriptOn(pm(), 'PauseMenu')],
         [T('把 PausePanel 拖进 Pause Panel 格子', 'Drag PausePanel into the Pause Panel slot'), () => { const s = scriptOn(pm(), 'PauseMenu'), p = panel(); return !!s && !!p && s.vals.pausePanel === p.id; }],
         [T('取消勾选 PausePanel 名字旁边的勾（开始时藏起来）', 'Uncheck the box next to PausePanel’s name (hidden at start)'), () => !!panel() && panel().active === false]],
  hint:T('脚本为什么不挂在 PausePanel 上？因为面板一开始是关着的，关着的物体上的脚本不会跑，按 Esc 就没反应了。', 'Why not put the script on PausePanel? It starts switched off, and scripts on switched-off objects don’t run — Esc would do nothing.'),
  auto:() => { ensureOpen('SampleScene'); let m = pm() || G.mkObj('empty', 'PauseManager'); m.name = 'PauseManager'; const s = attach(m, 'PauseMenu'); const p = panel(); if (p) { s.vals.pausePanel = p.id; p.active = false; } }},

 // 12
 {title:T('暂停菜单按钮的 On Click', 'On Click for the pause buttons'), glow:() => ['#p-insp'],
  point:() => { if (cur() !== 'SampleScene') return openHint('SampleScene');
    return ocFlow(uiOf('uibutton', 'ResumeButton'), pm(), 'PauseMenu.Resume') || ocFlow(uiOf('uibutton', 'MenuButton'), pm(), 'PauseMenu.BackToMenu'); },
  body:T('和主菜单一样：ResumeButton 的 On Click 选 PauseManager → <b>PauseMenu → Resume</b>；MenuButton 选 <b>PauseMenu → BackToMenu</b>。',
         'Same as the main menu: ResumeButton’s On Click gets PauseManager → <b>PauseMenu → Resume</b>; MenuButton gets <b>PauseMenu → BackToMenu</b>.'),
  conds:[[T('ResumeButton 的 On Click：PauseManager → PauseMenu.Resume', 'ResumeButton On Click: PauseManager → PauseMenu.Resume'), () => ocOk(uiOf('uibutton', 'ResumeButton'), pm(), 'PauseMenu.Resume')],
         [T('MenuButton 的 On Click：PauseManager → PauseMenu.BackToMenu', 'MenuButton On Click: PauseManager → PauseMenu.BackToMenu'), () => ocOk(uiOf('uibutton', 'MenuButton'), pm(), 'PauseMenu.BackToMenu')]],
  hint:T('下拉菜单里找不到 Pause？因为它没写 public，只给 Esc 键用。', 'Can’t find Pause in the dropdown? It isn’t public — only the Esc key uses it.'),
  auto:() => { ensureOpen('SampleScene'); const m = pm(); if (!m) return; setOc(uiOf('uibutton', 'ResumeButton'), m, 'PauseMenu.Resume'); setOc(uiOf('uibutton', 'MenuButton'), m, 'PauseMenu.BackToMenu'); }},

 // 13
 {title:T('保存，玩一遍', 'Save and play it through'), glow:() => G.S.playing ? ['#cwrap'] : ['#menu-file', '#playbtn'], play:true,
  point:() => { const F = G.S.flags; if (!G.S.playing && !savedNow() && !F.backToMenu) return saveHint();
    if (!G.S.playing) return F.backToMenu ? null : {at:'#playbtn', label:T('点播放', 'Click Play')};
    if (!F.paused) return {at:'#cwrap', label:T('按 Esc', 'Press Esc')};
    if (!F.resumed) { const r = uiOf('uibutton', 'ResumeButton'); return r && G.S.timeScale === 0 ? {at:btnIn(r.id), label:T('点 RESUME', 'Click RESUME')} : {at:'#cwrap', label:T('按 Esc', 'Press Esc')}; }
    if (!F.backToMenu) { const mb = uiOf('uibutton', 'MenuButton'); return mb && G.S.timeScale === 0 ? {at:btnIn(mb.id), label:T('点 MAIN MENU', 'Click MAIN MENU')} : {at:'#cwrap', label:T('再按一次 Esc', 'Press Esc again')}; }
    return {at:'#playbtn', label:T('点一下停止', 'Click to stop')}; },
  body:T('保存场景，点播放。按 <b>Esc</b>：画面变暗，一切停住（<code>Time.timeScale = 0</code>）。点 RESUME 继续玩；再按 Esc，点 MAIN MENU 回到主菜单。',
         'Save the scene and press Play. Press <b>Esc</b>: the screen dims and everything freezes (<code>Time.timeScale = 0</code>). Click RESUME to keep playing; press Esc again and click MAIN MENU to go back to the main menu.'),
  conds:[[T('保存场景', 'Save the scene'), () => savedNow() || G.S.flags.backToMenu],
         [T('播放，按 Esc 暂停', 'Play and press Esc to pause'), () => G.S.flags.paused],
         [T('点 RESUME 继续', 'Click RESUME to continue'), () => G.S.flags.resumed],
         [T('再按 Esc，点 MAIN MENU 回到主菜单', 'Press Esc again and click MAIN MENU to return to the menu'), () => G.S.flags.backToMenu]],
  hint:T('在编辑器里按 Esc 也会放开鼠标，这是正常的。点 RESUME 后，点一下游戏画面就能继续用鼠标转头。', 'In the editor, Esc also frees the mouse — that’s normal. After RESUME, click the Game view to look around again.'),
  note:T('BackToMenu 里先写了 Time.timeScale = 1f：timeScale 换场景也不会自己变回 1，忘了的话，从主菜单再进游戏会一直停住。', 'BackToMenu sets Time.timeScale = 1f first: timeScale doesn’t reset when the scene changes, so forgetting it would leave the game frozen next time.'),
  auto:() => { if (G.S.playing) G.stopPlay(); ensureOpen('SampleScene'); G.saveScene(); Object.assign(G.S.flags, {paused:true, resumed:true, backToMenu:true}); }},
];

const FINISH = {
 zh:`<div class="finish"><div class="gstep">完成</div><h2>菜单课完成：你的游戏有主菜单了</h2>
<p>你做了第二个场景，用 Scene List 和 SceneManager.LoadScene 在场景之间切换；用按钮的 On Click 调用脚本的 public 方法；还用 Time.timeScale 做了暂停菜单。</p>
<div class="note">想再练练？主页的「菜单课 · 找 Bug 挑战」已经解锁。</div>
<div class="gact"><button class="btn primary" data-act="quiz">章末小测验</button><button class="btn" data-act="export">导出到真 Unity</button><button class="btn" data-act="reset">再玩一遍</button><button class="btn quiet" data-act="home">回到主页</button></div></div>`,
 en:`<div class="finish"><div class="gstep">Done</div><h2>Menu lesson complete: your game has a main menu</h2>
<p>You made a second scene and switched between scenes with the Scene List and SceneManager.LoadScene, called public script methods from buttons’ On Click, and built a pause menu with Time.timeScale.</p>
<div class="note">Want more practice? “Menu lesson · Bug Hunt” is now unlocked on the home screen.</div>
<div class="gact"><button class="btn primary" data-act="quiz">Chapter quiz</button><button class="btn" data-act="export">Export to real Unity</button><button class="btn" data-act="reset">Play again</button><button class="btn quiet" data-act="home">Back to home</button></div></div>`};

// 开场：第 1 章下篇做完的走廊（SampleScene，已保存）
function setup() {
  const ch = G.chapters.ch1b; ch.setup(); ch.steps.forEach(st => { if (st.enter) st.enter(); st.auto(); }); G.closeFloat(); G.select(null);
  Object.keys(G.S.flags).forEach(k => { if (typeof G.S.flags[k] === 'boolean') G.S.flags[k] = false; }); G.S.flags.steps = 0; G.S.flags.win = []; G.S.flags.loaded = []; G.S.flags.opened = [];
  G.S.sceneList.length = 0; G.S.cwd = 0; G.S.tab = 'scene'; G.setView([4, 0, -2], 30, -35, 48);
}

// 找 Bug 挑战：做完整个菜单课，再弄坏 4 个地方
const BUGS = {
 setup:() => {
  setup(); STEPS.forEach(st => st.auto()); G.closeFloat(); G.select(null);
  Object.keys(G.S.flags).forEach(k => { if (typeof G.S.flags[k] === 'boolean') G.S.flags[k] = false; });
  const ss = G.S.sceneList.find(x => x.id === sceneA('SampleScene').id); if (ss) ss.on = false;
  const mmId = sceneA('MainMenu').id; let objs = G.sceneObjs(mmId);
  objs = objs.filter(o => o.type !== 'eventsystem'); const sb = objs.find(o => o.name === 'StartButton'); if (sb) sb.ui.onClick.forEach(e => { e.fn = ''; }); G.setSceneObjs(mmId, objs);
  const m = pm(), p = panel(); if (m && p) { const s = m.scripts.find(x => (G.asset(x.asset) || {}).name === 'PauseMenu'); m.scripts = m.scripts.filter(x => x !== s); p.scripts.push(s); }
  G.saveScene(); },
 list:[
  {title:T('点 START，控制台红字：场景打不开', 'Click START: a red error says the scene can’t be loaded'),
   hint:T('打开 文件 → Build Profiles，看看 Scene List：SampleScene 有没有勾选？', 'Open File → Build Profiles and look at the Scene List: is SampleScene checked?'),
   check:() => inList('SampleScene')},
  {title:T('主菜单的按钮点了没反应，鼠标移上去也不变色', 'The menu buttons don’t react, not even on hover'),
   hint:T('UI 要能点击，场景里必须有一个东西……看看 MainMenu 的层级，少了什么？（层级右键 → UI → 事件系统）', 'For UI to be clickable, the scene needs one special object… Check MainMenu’s Hierarchy — what’s missing? (Hierarchy right-click → UI → Event System)'),
   check:() => { const sc = sceneA('MainMenu'); return !!sc && G.sceneObjs(sc.id).some(o => o.type === 'eventsystem'); }},
  {title:T('点 QUIT 有用，点 START 却什么都没发生', 'QUIT works, but START does nothing'),
   hint:T('选中 StartButton，看它的 On Click：选了要调用的方法吗？', 'Select StartButton and look at its On Click: is a function chosen?'),
   check:() => { const sc = sceneA('MainMenu'); const os = sc ? G.sceneObjs(sc.id) : []; const b = os.find(o => o.name === 'StartButton'), m = os.find(o => o.name === 'MenuManager'); return !!b && !!m && (b.ui.onClick || []).some(e => e.obj === m.id && e.fn === 'MainMenu.StartGame'); }},
  {title:T('在走廊里按 Esc，什么都没发生', 'In the corridor, Esc does nothing'),
   hint:T('PauseMenu 脚本挂在哪里？挂在一开始就关着的物体上，它的 Update 根本不会跑。', 'Where is the PauseMenu script? On an object that starts switched off, its Update never runs.'),
   check:() => { const sc = sceneA('SampleScene'); const os = sc ? G.sceneObjs(sc.id) : []; const act = o => { let q = o; while (q) { if (q.active === false) return false; q = q.parent != null ? os.find(x => x.id === q.parent) : null; } return true; };
     return os.some(o => act(o) && o.scripts.some(s => (G.asset(s.asset) || {}).name === 'PauseMenu')); }}]};

const QUIZ = [
 {q:T('SceneManager.LoadScene 报错 “couldn’t be loaded”，最可能的原因？', 'SceneManager.LoadScene says “couldn’t be loaded”. What’s most likely?'),
  o:[T('电脑太慢', 'The computer is too slow'), T('场景没加进 Scene List（或名字写错了）', 'The scene isn’t in the Scene List (or the name is misspelled)'), T('场景里没有摄像机', 'The scene has no camera'), T('按钮颜色不对', 'The button color is wrong')], a:1,
  w:T('只有 File → Build Profiles 的 Scene List 里的场景，才能用代码打开。名字也要一模一样。', 'Only scenes in the Scene List (File → Build Profiles) can be opened from code, and the name must match exactly.')},
 {q:T('打包后的游戏一打开，先显示哪个场景？', 'Which scene does a built game show first?'),
  o:[T('最后保存的场景', 'The last scene you saved'), T('名字最短的场景', 'The scene with the shortest name'), T('Scene List 里的第 0 个', 'Scene 0 in the Scene List'), T('随机', 'A random one')], a:2,
  w:T('所以主菜单要放在 Scene List 的最上面。', 'That’s why the main menu goes at the top of the Scene List.')},
 {q:T('在编辑器里点 QUIT，游戏没有关掉，为什么？', 'You click QUIT in the editor and nothing closes. Why?'),
  o:[T('代码写错了', 'The code is wrong'), T('Application.Quit 在编辑器里不起作用，打包后的游戏才会关', 'Application.Quit does nothing in the editor; it only quits a built game'), T('要按两次', 'You have to click twice'), T('要先保存场景', 'You have to save first')], a:1,
  w:T('所以我们先用 Debug.Log 打印一句，确认按钮真的有调用到。', 'That’s why we print with Debug.Log first, to confirm the button really calls it.')},
 {q:T('按钮 On Click 的下拉菜单里找不到 Pause 方法，为什么？', 'Pause doesn’t appear in a button’s On Click dropdown. Why?'),
  o:[T('Pause 没写 public', 'Pause isn’t public'), T('Pause 名字太短', 'The name is too short'), T('要先播放', 'You must press Play first'), T('按钮坏了', 'The button is broken')], a:0,
  w:T('On Click 只看得到 public 的方法。', 'On Click can only see public methods.')},
 {q:T('PauseMenu 挂在一开始就关着的 PausePanel 上，会怎样？', 'PauseMenu is on PausePanel, which starts switched off. What happens?'),
  o:[T('一切正常', 'Everything works'), T('按 Esc 没反应：关着的物体上的脚本不会跑 Update', 'Esc does nothing: scripts on switched-off objects don’t run Update'), T('游戏会当掉', 'The game crashes'), T('面板会一直显示', 'The panel stays visible')], a:1,
  w:T('所以要挂在一直开着的 PauseManager 上。', 'That’s why it goes on PauseManager, which is always on.')},
 {q:T('从暂停菜单回主菜单之前，为什么要写 Time.timeScale = 1f？', 'Why set Time.timeScale = 1f before going back to the main menu?'),
  o:[T('让菜单更好看', 'So the menu looks nicer'), T('Unity 规定的', 'Unity requires it'), T('timeScale 换场景也不会自己变回 1，不改的话下一局会一直停住', 'timeScale doesn’t reset when the scene changes; otherwise the next game stays frozen'), T('让游戏跑得更快', 'To make the game faster')], a:2,
  w:T('Time.timeScale 是整个游戏共用的，换场景也一直保持。', 'Time.timeScale is shared by the whole game and survives scene changes.')}];

const EXPORT_INTRO = {
 zh:'# 在真 Unity 里做主菜单和暂停菜单\n\n1. 接着你的走廊项目（第 1 章下篇）。\n2. 把这个压缩包里的 `Assets/Scripts` 文件夹拖进 Unity 的项目窗口。\n3. 新场景：在项目窗口的 Scenes 文件夹右键 → 创建 → 场景，改名 MainMenu，双击打开。\n4. 场景列表：File → Build Profiles → Scene List，把 MainMenu 放在第 0 个，SampleScene 第 1 个。\n5. 照下面的清单，一个一个建出两个场景里的物体。\n',
 en:'# Build the main menu and pause menu in real Unity\n\n1. Continue your corridor project (Chapter 1 part 2).\n2. Drag the `Assets/Scripts` folder from this zip into Unity’s Project window.\n3. New scene: in the Project window, right-click the Scenes folder → Create → Scene, name it MainMenu, and double-click to open it.\n4. Scene List: File → Build Profiles → Scene List, with MainMenu at index 0 and SampleScene at 1.\n5. Follow the list below to create the objects in both scenes.\n'};

G.chapters = G.chapters || {};
G.chapters.chmenu = {title:T('菜单：主菜单和暂停菜单', 'Menus: a main menu and a pause menu'), label:T('加餐课', 'Bonus lesson'),
  steps:STEPS, finish:FINISH, setup, bugs:BUGS, quiz:QUIZ, exportIntro:EXPORT_INTRO};
})();
