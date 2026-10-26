// 第 2 章：生存游戏 —— 小岛、饥饿口渴血量、喝水吃东西、物品数据、背包、合成斧头、砍树、营火（粒子系统）、昼夜、存档、美化。
// 开场：一块空的小岛（地面）和一个已经做好的第一人称玩家（会走路、会按 F 互动，第 1 章学过）。
// 写法和其他章节文件一样。
(() => {
'use strict';
const G = window.ZTG;
const H = () => G.hint;
const T = (zh, en) => ({zh, en});
const setTo = v => T(`改成 ${v}，按 Enter`, `Set to ${v}, press Enter`);
const fix = (k, want, cur) => { const i = want.findIndex((v, j) => Math.abs(cur[j] - v) >= .001); return i < 0 ? null : {at:H().field(k + '.' + i), label:setTo(want[i])}; };
const fixNum = (bind, want, cur) => Math.abs(cur - want) < .001 ? null : {at:H().field(bind), label:setTo(want)};
const viaMenu = (plus, keys, label) => [...keys.slice().reverse().map(k => ({at:H().mi(k), label})), {at:plus, label}];
const selFirst = o => H().isSel(o) ? null : {at:H().row(o.id), label:G.t('hSelect')};
const near1 = (a, b) => Math.abs(a - b) < .001;
const byName = n => G.S.objs.find(o => o.name === n);
const nameIt = (o, want) => o.name === want ? null : selFirst(o) || {at:H().field('name'), label:T(`改成 ${want}，按 Enter`, `Type ${want}, press Enter`)};
const scriptA = n => G.S.assets.find(a => a.type === 'script' && a.name === n);
const scriptOn = (o, n) => o ? o.scripts.find(s => (G.asset(s.asset) || {}).name === n) : null;
const scriptOk = n => { const a = scriptA(n); return !!a && !!a.comp && a.comp.ok; };
const rgb = c => { const n = parseInt(String(c).slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };
const lum = c => { const [r, g, b] = rgb(c); return .2126 * r + .7152 * g + .0722 * b; };
const isBlue = c => { const [r, g, b] = rgb(c); return b > .4 && b > r + .15; };
const isRed = c => { const [r, g, b] = rgb(c); return r > .7 && g < .45 && b < .45; };
const isSand = c => { const [r, g, b] = rgb(c); return r > .6 && r >= g && g > b && lum(c) > .5; };
const isWarm = c => { const [r, g, b] = rgb(c); return r >= .9 && g >= .6 && b <= .85 && r > b + .1; };
const playStep = (doneFlag, during) => {
  if (!G.S.playing) return doneFlag ? null : {at:'#playbtn', label:T('点播放', 'Click Play')};
  return doneFlag ? {at:'#playbtn', label:T('点一下停止', 'Click to stop')} : during;
};
const P = () => G.P(), cam = () => G.S.objs.find(o => o.type === 'camera');
const compMenu = (cat, item, lab) => [{at:H().mi(item), label:lab}, {at:H().mi(cat), label:lab}, {at:'#addcomp', label:lab}];
const freshEmpty = () => G.S.objs.find(o => o.type === 'empty' && !o.audio && !o.vol && !o.col && !o.ps && !o.scripts.length && /^(gameobject|游戏对象)/i.test(o.name) && o.parent == null);

// ---------- 脚本（新建 → 改名 → 填空 → 拖到物体上） ----------
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
  if (!(s.comp && s.comp.ok)) return {at:r.at, label:tm.blanks.length ? T('双击打开代码，把空填好', 'Double-click to open the code and fill the blanks') : T('看控制台的红字', 'Check the red error in the Console')};
  if (host && !scriptOn(host, name)) return {from:r.at, to:h.row(host.id), label:T(`拖到 ${host.name} 上`, `Drag onto ${host.name}`)};
  return null;
}
function ensureScript(name) {
  let a = scriptA(name);
  if (!a) { const f = G.S.assets.find(x => x.type === 'folder' && x.name === 'Scripts' && x.parent === 0) || G.mkAsset('folder', 'Scripts', 0); a = G.mkAsset('script', name, f.id); }
  G.closeCode(); a.blanks = Object.assign({}, G.lib()[name].answers); G.compileScript(a); return a;
}
const attach = (o, name) => { (G.lib()[name].deps || []).forEach(d => { if (!scriptOk(d)) ensureScript(d); }); const a = ensureScript(name); let s = scriptOn(o, name); if (!s) { G.addScript(o, a); s = scriptOn(o, name); } return s; };
const slotSel = (host, name, fid, kind) => { const s = scriptOn(host, name); return `#insp-body [data-drop="${kind}:${host.id}:${host.scripts.indexOf(s)}:${fid}"]`; };
function refSlot(host, name, fid, target) {
  const s = scriptOn(host, name); if (!s || !target || s.vals[fid] === target.id) return null;
  return selFirst(host) || {from:H().row(target.id), to:slotSel(host, name, fid, 'ref'), label:T(`把 ${target.name} 拖进 ${fid} 格子`, `Drag ${target.name} into the ${fid} slot`)};
}
function itemSlot(host, name, fid, item) {
  const s = scriptOn(host, name); if (!s || !item || s.vals[fid] === item.id) return null;
  const r = H().reach(item); if (r.nav) return r;
  return selFirst(host) || {from:r.at, to:slotSel(host, name, fid, 'aref'), label:T(`把 ${item.name} 拖进 ${fid} 格子`, `Drag ${item.name} into the ${fid} slot`)};
}
const refOk = (host, name, fid, target) => { const s = scriptOn(host, name); return !!s && !!target && s.vals[fid] === target.id; };

// ---------- 小岛上的东西 ----------
const isTree = o => o.type === 'model' && (o.model === 'tree' || o.model === 'pine'), models = k => G.S.objs.filter(o => o.type === 'model' && (Array.isArray(k) ? k.includes(o.model) : o.model === k));
const onIsland = o => Math.abs(o.pos[0]) < 19 && Math.abs(o.pos[2]) < 19;
const island = () => byName('Island'), sea = () => byName('Sea'), sun = () => G.S.objs.find(o => o.type === 'light' && o.light && o.light.kind === 'directional');
const item = n => G.S.assets.find(a => a.type === 'itemdata' && a.name === n);
const ITEMS = [['Stick', '#8a5a3b'], ['Stone', '#8a8f98'], ['Wood', '#a0703c'], ['Axe', '#c9ccd1']];
const slider = n => G.S.objs.find(o => o.type === 'uislider' && o.name === n);
const isOrange = c => { const [r, g, b] = rgb(c); return r > .85 && g > .35 && g < .75 && b < .3; };
const BARS = [['HungerBar', '#f2a13a', -50, isOrange], ['ThirstBar', '#4aa3ff', -100, isBlue], ['HealthBar', '#e5484d', -150, isRed]];
const panel = () => G.S.objs.find(o => o.type === 'uiimage' && o.name === 'BackpackPanel'), list = () => G.S.objs.find(o => o.type === 'uitext' && o.name === 'ItemList'), craftBtn = () => G.S.objs.find(o => o.type === 'uibutton' && o.name === 'CraftButton');
const sticks = () => G.S.objs.filter(o => o.name.startsWith('Stick') && o.type === 'cylinder'), stone = () => G.S.objs.find(o => o.name === 'Stone' && o.type === 'sphere');
const fire = () => byName('Fire'), sparks = () => byName('Sparks'), fireLight = () => byName('FireLight'), campfire = () => byName('Campfire');
const FIRE = {loop:true, lifetime:.8, speed:1.5, size:.6, color:'#ff9a3c', rate:40, angle:15, radius:.3, fade:true, gravity:0, duration:5};
const SPARKS = {loop:true, lifetime:1.5, speed:3, size:.08, color:'#ffe066', rate:8, angle:25, radius:.2, fade:true, gravity:-.1, duration:5};
const psMatch = (o, w) => !!o && !!o.ps && ['lifetime', 'speed', 'size', 'rate', 'angle', 'radius'].every(k => near1(o.ps[k], w[k])) && o.ps.color === w.color && o.ps.fade === w.fade && o.ps.loop;
function psFlow(o, w) {
  const s = selFirst(o); if (s) return s;
  for (const [k, b] of [['lifetime', 'pslife'], ['speed', 'psspd'], ['size', 'pssize'], ['rate', 'psrate'], ['angle', 'psang'], ['radius', 'psrad']]) { const f = fixNum(b, w[k], o.ps[k]); if (f) return f; }
  if (o.ps.color !== w.color) return {at:H().field('pscolor'), label:T(`输入 ${w.color}，按 Enter`, `Type ${w.color}, press Enter`)};
  if (!o.ps.fade) return {at:H().field('psfade'), label:T('勾选', 'Check it')};
  if (!o.ps.loop) return {at:H().field('psloop'), label:T('勾选循环', 'Check Looping')};
  return null;
}
function makeModel(key, name, pos) { const o = G.mkObj('model', G.uniqueName(name, null), pos.slice()); o.model = key; o.col = {kind:'box', trigger:false, seq:0}; return o; }
function ensureLibAsset(key, name) { let f = G.S.assets.find(x => x.type === 'folder' && x.name === 'Models' && x.parent === 0) || G.mkAsset('folder', 'Models', 0); return G.S.assets.find(a => a.type === 'model' && a.model === key) || G.mkAsset('model', name, f.id, {model:key}); }
function ensureMat(name, color) { const f = G.S.assets.find(x => x.type === 'folder' && x.name === 'Materials' && x.parent === 0) || G.mkAsset('folder', 'Materials', 0); const m = G.mats().find(x => x.name === name) || G.mkAsset('material', name, f.id, {color}); m.color = color; return m; }
function matFlow(o, name, test, pickColor, pickLab) {
  const m = G.matOf(o); if (m && test(m.color)) return null;
  if (G.S.renaming != null) return {at:'#rn', label:T(`输入 ${name}，按 Enter`, `Type ${name}, press Enter`)};
  const mm = G.mats().find(x => x.name === name);
  if (!mm) return viaMenu('#proj-plus', ['create', 'mat'], T(`点 +，选 创建 → 材质（名字 ${name}）`, `Click +, then Create → Material (name: ${name})`));
  const r = H().reach(mm); if (r.nav) return r;
  if (!test(mm.color)) return H().isSel(mm) ? {at:H().field('hex'), label:T(`输入 ${pickColor}，按 Enter`, `Type ${pickColor}, press Enter`)} : {at:r.at, label:T('点选这个材质', 'Select this material')};
  return {from:r.at, to:H().row(o.id), label:T(`拖到 ${o.name} 上`, `Drag onto ${o.name}`)};
}
const fresh = (type, used) => G.S.objs.find(o => o.type === type && !used.includes(o.name));
function uiCreate(kind, name, used, menuLab) { const o = G.S.objs.find(x => x.type === kind && x.name === name); if (o) return null; const f = fresh(kind, used); if (f) return nameIt(f, name); return viaMenu('#hier-plus', ['ui', kind], menuLab); }
function makeUI(kind, name, props) { let o = G.S.objs.find(x => x.type === kind && x.name === name); if (!o) { o = G.createUI(kind); o.name = name; } Object.assign(o.ui, props); return o; }

const STEPS = [
 // 1
 {title:T('海', 'The sea'), glow:() => ['#p-hier', '#p-insp'],
  enter:() => { G.S.tab = 'scene'; },
  point:() => { let s = sea();
    if (!s) { const p = G.S.objs.find(o => o.type === 'plane' && o.name !== 'Island'); if (p) return nameIt(p, 'Sea'); return viaMenu('#hier-plus', ['go3d', 'plane'], T('点 +，选 3D 对象 → 平面', 'Click +, then 3D Object → Plane')); }
    return nameIt(s, 'Sea') || ((!G.near(s.pos, [0, -.3, 0]) || !G.near(G.effScale(s), [20, 1, 20])) && (selFirst(s) || fix('pos', [0, -.3, 0], s.pos) || fix('scl', [20, 1, 20], G.effScale(s)))) || matFlow(s, 'Sea_Mat', isBlue, '#2c7fd1'); },
  body:T('小岛四周都是海。新建一个很大的 <b>平面</b> 当海，比沙地低一点点，再给它一个蓝色的材质。',
         'The island is surrounded by sea. Create a very large <b>Plane</b> as the sea, a little lower than the sand, and give it a blue material.'),
  conds:[[T('平面 Sea：位置 0、-0.3、0，缩放 20、1、20（200 × 200 米）', 'A Plane named Sea: Position 0, -0.3, 0, Scale 20, 1, 20 (200 × 200 m)'), () => !!sea() && G.near(sea().pos, [0, -.3, 0]) && G.near(G.effScale(sea()), [20, 1, 20])],
         [T('新建材质 Sea_Mat，蓝色，用在 Sea 上', 'A material Sea_Mat in blue, on Sea'), () => { const m = sea() && G.matOf(sea()); return !!m && isBlue(m.color); }]],
  hint:T('Y 是 -0.3：海比沙地低一点，看起来像小岛浮出水面。', 'Y is -0.3: the sea sits a little below the sand, so the island seems to rise out of the water.'),
  auto:() => { let s = sea() || G.mkObj('plane', 'Sea'); s.name = 'Sea'; s.pos = [0, -.3, 0]; s.scale = [20, 1, 20]; s.scaleOverride = false; s.mat = ensureMat('Sea_Mat', '#2c7fd1').id; G.select('obj', s.id); }},

 // 2
 {title:T('树、石头、灌木', 'Trees, rocks and bushes'), glow:() => ['#p-proj', '.mbtn[data-menu="window"]'],
  enter:() => { G.setView([0, 0, 0], 34, -35, 50); },
  point:() => { const need = [[['tree', 'pine'], 3, 'tree', 'Tree'], [['bush'], 2, 'bush', 'Bush'], [['rock'], 2, 'rock', 'Rock']];
    for (const [keys, n, key] of need) if (models(keys).filter(onIsland).length < n) {
      const a = G.S.assets.find(x => x.type === 'model' && keys.includes(x.model));
      if (!a) return G.floatOpen() === 'lib' ? {at:`#float [data-imp="${key}"]`, label:T('点导入', 'Click Import')} : viaMenu('.mbtn[data-menu="window"]', ['library'], T('窗口 → 素材库', 'Window → Asset Library'));
      if (G.floatOpen() === 'lib') return {at:'#fclose', label:G.t('hClose')};
      const r = H().reach(a); if (r.nav) return r; if (G.S.tab !== 'scene') return {at:'#tab-scene', label:G.t('hToScene')};
      return {from:r.at, to:'#cwrap', label:T('拖到小岛上', 'Drag onto the island')}; }
    return G.S.flags.layoutChecked ? null : {at:'#laybtn', label:T('点检查摆放', 'Click Check layout')}; },
  body:T('打开 <b>窗口 → 素材库</b>，导入树、石头、灌木，再从项目窗口拖到小岛上。最后点场景右上角的「检查摆放」：它会提醒你哪里太整齐、哪里空空的。',
         'Open <b>Window → Asset Library</b>, import a tree, a rock and a bush, then drag them from the Project window onto the island. Finally click Check layout at the top right of the Scene: it points out spots that are too tidy or too empty.'),
  conds:[[T('小岛上至少 3 棵树', 'At least 3 trees on the island'), () => models(['tree', 'pine']).filter(onIsland).length >= 3],
         [T('至少 2 丛灌木', 'At least 2 bushes'), () => models('bush').filter(onIsland).length >= 2],
         [T('至少 2 块石头', 'At least 2 rocks'), () => models('rock').filter(onIsland).length >= 2],
         [T('点「检查摆放」', 'Click Check layout'), () => G.S.flags.layoutChecked]],
  hint:T('每次拖进来都是一个新的。大小可以用 R 工具调：大中小混着放，看起来更自然。', 'Each drag adds a new one. Resize with the R tool: mixing big, medium and small looks more natural.'),
  auto:() => { G.closeFloat(); ensureLibAsset('tree', 'Tree'); ensureLibAsset('rock', 'Rock'); ensureLibAsset('bush', 'Bush');
    const want = [['tree', 'Tree', [[6, 0, 8], [-8, 0, 5], [10, 0, -6], [-5, 0, -9]]], ['bush', 'Bush', [[3, 0, -3], [-6, 0, 1]]], ['rock', 'Rock', [[8, 0, 2], [-2, 0, 9]]]];
    for (const [k, n, ps] of want) { const keys = k === 'tree' ? ['tree', 'pine'] : [k]; ps.slice(models(keys).filter(onIsland).length).forEach(p => makeModel(k, n, p)); }
    G.S.flags.layoutChecked = true; }},

 // 3
 {title:T('饥饿、口渴、血量条', 'Hunger, thirst and health bars'), glow:() => ['#p-hier', '#p-insp'],
  point:() => { const used = BARS.map(b => b[0]);
    for (const [n, col, y, test] of BARS) { const c = uiCreate('uislider', n, used, T('点 +，选 UI → 滑动条', 'Click +, then UI → Slider')); if (c) return c;
      const o = slider(n), s = selFirst(o);
      if (o.ui.anchor !== 'tl') return s || {at:H().field('anchor'), label:T('选 左上', 'Choose Top Left')};
      const f = fixNum('ux', 200, o.ui.x) || fixNum('uy', y, o.ui.y) || fixNum('uw', 300, o.ui.w); if (f) return s || f;
      if (!test(o.ui.fill)) return s || {at:H().field('ufill'), label:T(`输入 ${col}，按 Enter`, `Type ${col}, press Enter`)}; }
    return null; },
  body:T('屏幕左上角放三个 <b>滑动条</b>：饥饿（橙色）、口渴（蓝色）、血量（红色）。锚点选「左上」：不管屏幕多大，它们都贴在左上角。',
         'Put three <b>Sliders</b> in the top-left corner: hunger (orange), thirst (blue) and health (red). Set the anchor to Top Left so they stay in that corner on any screen size.'),
  conds:BARS.map(([n, col, y, test]) => [T(`滑动条 ${n}：锚点左上，位置 200、${y}，宽 300，填充颜色 ${col}`, `Slider ${n}: anchor Top Left, Position 200, ${y}, Width 300, Fill Color ${col}`),
    () => { const o = slider(n); return !!o && o.ui.anchor === 'tl' && near1(o.ui.x, 200) && near1(o.ui.y, y) && near1(o.ui.w, 300) && test(o.ui.fill); }]),
  hint:T('锚点在左上时，Y 往下是负数：-50、-100、-150 一条接一条往下排。', 'With a Top Left anchor, Y goes negative downward: -50, -100, -150 stack the bars.'),
  auto:() => { BARS.forEach(([n, col, y]) => makeUI('uislider', n, {anchor:'tl', x:200, y, w:300, h:24, fill:col, value:1})); }},

 // 4
 {title:T('SurvivalStats：会饿、会渴、会掉血', 'SurvivalStats: hunger, thirst, health'), glow:() => G.S.playing ? ['#playbtn'] : ['#p-proj', '#p-insp'], play:true,
  point:() => { const p = P(); if (!p) return null;
    if (!G.S.playing) { const sf = scriptFlow('SurvivalStats', p); if (sf) return sf; for (const [n] of BARS) { const r = refSlot(p, 'SurvivalStats', n[0].toLowerCase() + n.slice(1), slider(n)); if (r) return r; } }
    return playStep(G.S.flags.barsMoving, {at:'#tab-game', label:T('看左上角的条', 'Watch the bars in the top left')}); },
  body:T('新建脚本 <b>SurvivalStats</b>（填 2 个空），挂到 Player 上，把三个滑动条拖进对应的格子。点播放：饥饿和口渴会慢慢变少；有一样到 0，血就开始掉。',
         'Create a script named <b>SurvivalStats</b> (2 blanks), put it on Player, and drag the three sliders into the matching slots. Press Play: hunger and thirst slowly drop; when either reaches 0, health starts dropping.'),
  conds:[[T('新建脚本 SurvivalStats，填好 2 个空，挂到 Player 上', 'Create a script named SurvivalStats, fill in 2 blanks, and put it on Player'), () => scriptOk('SurvivalStats') && !!scriptOn(P(), 'SurvivalStats')],
         [T('三个滑动条分别拖进 Hunger Bar、Thirst Bar、Health Bar', 'Drag the sliders into Hunger Bar, Thirst Bar and Health Bar'), () => BARS.every(([n]) => refOk(P(), 'SurvivalStats', n[0].toLowerCase() + n.slice(1), slider(n)))],
         [T('点播放：条在慢慢变短', 'Press Play: the bars slowly shrink'), () => G.S.flags.barsMoving]],
  hint:T('测试时嫌太慢？在检查器把 Thirst Drain 调大（例如 10），很快就会渴到 0。停止播放后会还原。', 'Too slow to test? Raise Thirst Drain in the Inspector (say 10) and you’ll be parched in no time. It resets when you stop.'),
  auto:() => { if (G.S.playing) G.stopPlay(); const p = P(); if (!p) return; const s = attach(p, 'SurvivalStats'); BARS.forEach(([n]) => { const o = slider(n); if (o) s.vals[n[0].toLowerCase() + n.slice(1)] = o.id; }); G.S.flags.barsMoving = true; }},

 // 5
 {title:T('喝水', 'Drinking'), glow:() => G.S.playing ? ['#playbtn'] : ['#p-proj', '#p-hier'], play:true,
  point:() => { const s = sea(); if (!s) return null; if (!G.S.playing) { const sf = scriptFlow('DrinkWater', s); if (sf) return sf; }
    return playStep(G.S.flags.drank, {at:'#cwrap', label:T('走到海边，低头看着海水按 F', 'Walk to the shore, look down at the water and press F')}); },
  body:T('新建脚本 <b>DrinkWater</b>，挂到 Sea 上。它继承第 1 章下篇的 Interactable：看着海水，屏幕下方会出现「Press F to drink」，按 F 口渴就会回升。',
         'Create a script named <b>DrinkWater</b> and put it on Sea. It inherits Interactable from Chapter 1 part 2: look at the water, “Press F to drink” appears at the bottom, and F refills your thirst.'),
  conds:[[T('新建脚本 DrinkWater，挂到 Sea 上', 'Create a script named DrinkWater and put it on Sea'), () => scriptOk('DrinkWater') && !!scriptOn(sea(), 'DrinkWater')],
         [T('点播放，走到海边按 F 喝水', 'Press Play, walk to the shore and press F to drink'), () => G.S.flags.drank]],
  hint:T('海要有碰撞体，射线才打得到。平面自带网格碰撞体。', 'The sea needs a collider for the ray to hit it. A Plane comes with a Mesh Collider.'),
  auto:() => { if (G.S.playing) G.stopPlay(); const s = sea(); if (s) attach(s, 'DrinkWater'); G.S.flags.drank = true; }},

 // 6
 {title:T('吃莓果', 'Eating berries'), glow:() => G.S.playing ? ['#playbtn'] : ['#p-proj', '#p-hier'], play:true,
  point:() => { const b = models('bush')[0]; if (!b) return null; if (!G.S.playing) { const sf = scriptFlow('BerryBush', b); if (sf) return sf; }
    return playStep(G.S.flags.ate, {at:'#cwrap', label:T('走到灌木前按 F', 'Walk up to a bush and press F')}); },
  body:T('新建脚本 <b>BerryBush</b>，挂到灌木上（每丛都可以挂）。看着灌木按 F，就会吃到莓果，饥饿回升。',
         'Create a script named <b>BerryBush</b> and put it on a bush (on every bush, if you like). Look at a bush and press F to eat berries and refill your hunger.'),
  conds:[[T('新建脚本 BerryBush，挂到至少一丛灌木上', 'Create a script named BerryBush and put it on at least one bush'), () => scriptOk('BerryBush') && models('bush').some(b => scriptOn(b, 'BerryBush'))],
         [T('点播放，看着灌木按 F 吃东西', 'Press Play, look at a bush and press F to eat'), () => G.S.flags.ate]],
  hint:T('灌木和海用的是同一套互动系统：以后要加新的可以互动的东西，只要再写一个继承 Interactable 的脚本。', 'The bush and the sea share one interaction system: to add something new you can use, just write another script that inherits Interactable.'),
  auto:() => { if (G.S.playing) G.stopPlay(); models('bush').forEach(b => attach(b, 'BerryBush')); G.S.flags.ate = true; }},

 // 7
 {title:T('物品数据', 'Item data'), glow:() => ['#p-proj'],
  point:() => { if (!scriptOk('ItemData')) return scriptFlow('ItemData', null);
    if (G.S.renaming != null) return {at:'#rn', label:T('输入名字，按 Enter', 'Type a name, press Enter')};
    for (const [n] of ITEMS) { const it = item(n);
      if (!it) { const nw = G.S.assets.find(a => a.type === 'itemdata' && !ITEMS.some(x => x[0] === a.name)); if (nw) { const r = H().reach(nw); if (r.nav) return r; return H().isSel(nw) ? {at:H().field('aname'), label:T(`改成 ${n}，按 Enter`, `Rename to ${n}, press Enter`)} : {at:r.at, label:T('点选它', 'Select it')}; }
        return viaMenu('#proj-plus', ['create', 'itemdata'], T(`点 +，选 创建 → 物品数据（${n}）`, `Click +, then Create → Item Data (${n})`)); }
      if (it.itemName !== n) { const r = H().reach(it); if (r.nav) return r; return H().isSel(it) ? {at:H().field('iname'), label:T(`改成 ${n}，按 Enter`, `Type ${n}, press Enter`)} : {at:r.at, label:T('点选它', 'Select it')}; } }
    return null; },
  body:T('先新建脚本 <b>ItemData</b>：它不是挂在物体上的脚本，而是 <b>ScriptableObject</b>，用来在项目窗口里建「物品数据」文件。有了它，创建菜单里就会多出「物品数据」。建 4 个：Stick（树枝）、Stone（石头）、Wood（木头）、Axe（斧头），每个的 Item Name 也改成一样的名字。',
         'First create a script named <b>ItemData</b>. It isn’t attached to objects — it’s a <b>ScriptableObject</b> for making item data files in the Project window. Once it exists, the Create menu gets an Item Data entry. Make 4: Stick, Stone, Wood and Axe, and set each one’s Item Name to match.'),
  conds:[[T('新建脚本 ItemData', 'Create a script named ItemData'), () => scriptOk('ItemData')],
         [T('创建 → 物品数据，建出 Stick、Stone、Wood、Axe 四个', 'Create → Item Data: Stick, Stone, Wood and Axe'), () => ITEMS.every(([n]) => !!item(n))],
         [T('每个的 Item Name 都改成和文件名一样', 'Set each Item Name to match its file name'), () => ITEMS.every(([n]) => !!item(n) && item(n).itemName === n)]],
  hint:T('物品的名字、颜色放在数据文件里，不写死在代码里：以后想加「绳子」，只要再建一个文件。', 'Item names and colors live in data files, not in code: to add “Rope” later, just make another file.'),
  auto:() => { ensureScript('ItemData'); const f = G.S.assets.find(x => x.type === 'folder' && x.name === 'Items' && x.parent === 0) || G.mkAsset('folder', 'Items', 0);
    ITEMS.forEach(([n, c]) => { const it = item(n) || G.mkAsset('itemdata', n, f.id, {itemName:n, color:c, stackable:true, maxStack:20}); it.itemName = n; }); G.S.renaming = null; }},

 // 8
 {title:T('背包', 'The backpack'), glow:() => ['#p-hier', '#p-insp'],
  point:() => { const p = P(); if (!p) return null;
    const c = uiCreate('uiimage', 'BackpackPanel', ['BackpackPanel'], T('点 +，选 UI → 图片', 'Click +, then UI → Image')); if (c) return c;
    const pn = panel(), s = selFirst(pn);
    for (const [k, b, v] of [['w', 'uw', 600], ['h', 'uh', 420]]) if (!near1(pn.ui[k], v)) return s || {at:H().field(b), label:setTo(v)};
    if (lum(pn.ui.color) > .2) return s || {at:H().field('ucolor'), label:T('输入 #14161b，按 Enter', 'Type #14161b, press Enter')};
    const c2 = uiCreate('uitext', 'ItemList', ['ItemList', 'Prompt', 'Message'], T('点 +，选 UI → 文本', 'Click +, then UI → Text')); if (c2) return c2;
    const li = list(); if (li.parent !== pn.id) return {from:H().row(li.id), to:H().row(pn.id), label:T('把 ItemList 拖到 BackpackPanel 上', 'Drag ItemList onto BackpackPanel')};
    if (li.ui.text !== '') return selFirst(li) || {at:H().field('utext'), label:T('把字删光', 'Delete all the text')};
    const sf = scriptFlow('Inventory', p); if (sf) return sf;
    const r = refSlot(p, 'Inventory', 'panel', pn) || refSlot(p, 'Inventory', 'listText', li); if (r) return r;
    if (pn.active !== false) return selFirst(pn) || {at:H().field('active'), label:T('取消勾选', 'Uncheck it')};
    return null; },
  body:T('做一个背包：一张深色的 UI 图片 BackpackPanel，里面放一个空的文本 ItemList。再新建脚本 <b>Inventory</b>（填 1 个空）挂到 Player 上，把面板和文本拖进格子。面板一开始关着，按 Tab 才打开。',
         'Make a backpack: a dark UI Image called BackpackPanel with an empty Text called ItemList inside it. Then create a script named <b>Inventory</b> (1 blank) on Player and drag the panel and the text into its slots. The panel starts closed and opens with Tab.'),
  conds:[[T('UI → 图片 BackpackPanel：宽 600、高 420，深色（#14161b）', 'UI → Image BackpackPanel: Width 600, Height 420, dark (#14161b)'), () => { const p = panel(); return !!p && near1(p.ui.w, 600) && near1(p.ui.h, 420) && lum(p.ui.color) <= .2; }],
         [T('UI → 文本 ItemList，字删光，拖进 BackpackPanel', 'UI → Text ItemList with the text deleted, inside BackpackPanel'), () => !!list() && !!panel() && list().parent === panel().id && list().ui.text === ''],
         [T('新建脚本 Inventory（填 1 个空）挂到 Player，Panel 和 List Text 拖好', 'Create a script named Inventory (1 blank) on Player, with Panel and List Text filled'), () => scriptOk('Inventory') && refOk(P(), 'Inventory', 'panel', panel()) && refOk(P(), 'Inventory', 'listText', list())],
         [T('取消勾选 BackpackPanel（开始时关着）', 'Uncheck BackpackPanel (closed at the start)'), () => !!panel() && panel().active === false]],
  hint:T('Inventory 用 Dictionary（字典）记数量：用「哪种物品」查「有几个」。', 'Inventory uses a Dictionary to keep counts: look up “which item” to get “how many”.'),
  auto:() => { const p = P(); if (!p) return; const pn = makeUI('uiimage', 'BackpackPanel', {anchor:'mc', x:0, y:0, w:600, h:420, color:'#14161b', alpha:.92});
    const li = makeUI('uitext', 'ItemList', {anchor:'mc', x:0, y:40, w:520, h:300, text:'', size:36, color:'#ffffff'}); if (li.parent !== pn.id) G.setParent(li, pn);
    const s = attach(p, 'Inventory'); s.vals.panel = pn.id; s.vals.listText = li.id; pn.active = false; }},

 // 9
 {title:T('捡树枝和石头', 'Picking up sticks and stones'), glow:() => G.S.playing ? ['#playbtn'] : ['#p-hier', '#p-insp'], play:true,
  enter:() => { G.setView([0, 0, 3], 10, -30, 45); },
  point:() => { const F = G.S.flags;
    if (!G.S.playing) {
      if (sticks().length < 2) { const c = G.S.objs.find(o => o.type === 'cylinder' && !o.name.startsWith('Stick')); if (c) return nameIt(c, 'Stick');
        if (sticks().length) return H().isSel(sticks()[0]) ? {at:H().row(sticks()[0].id), label:T('按 Ctrl+D 复制', 'Press Ctrl+D to duplicate')} : selFirst(sticks()[0]);
        return viaMenu('#hier-plus', ['go3d', 'cylinder'], T('点 +，选 3D 对象 → 圆柱体', 'Click +, then 3D Object → Cylinder')); }
      if (!stone()) { const c = G.S.objs.find(o => o.type === 'sphere' && o.name !== 'Stone'); if (c) return nameIt(c, 'Stone'); return viaMenu('#hier-plus', ['go3d', 'sphere'], T('点 +，选 3D 对象 → 球体', 'Click +, then 3D Object → Sphere')); }
      for (const o of [...sticks(), stone()]) { const want = o.name.startsWith('Stick') ? item('Stick') : item('Stone'); const sf = scriptFlow('ItemPickup', o); if (sf) return sf; const r = itemSlot(o, 'ItemPickup', 'item', want); if (r) return r; } }
    if (!(F.picked >= 3)) return playStep(false, {at:'#cwrap', label:T('看着地上的东西按 F', 'Look at the items on the ground and press F')});
    return playStep(F.invOpened, {at:'#cwrap', label:T('按 Tab 打开背包', 'Press Tab to open the backpack')}); },
  body:T('在 Player 前面的地上放 2 根树枝（细长的 <b>圆柱体</b> Stick，横躺）和 1 块石头（小 <b>球体</b> Stone）。新建脚本 <b>ItemPickup</b> 挂上去，把对应的物品数据拖进 Item 格子。点播放，看着它们按 F 捡起来，再按 Tab 看背包。',
         'Put 2 sticks (thin <b>Cylinders</b> named Stick, lying down) and 1 stone (a small <b>Sphere</b> named Stone) on the ground in front of Player. Create a script named <b>ItemPickup</b>, put it on each, and drag the matching item data into the Item slot. Press Play, pick them up with F, then press Tab to see the backpack.'),
  conds:[[T('2 根 Stick（圆柱体，缩放 0.1、0.4、0.1，旋转 0、0、90）和 1 块 Stone（球体，缩放 0.3），放在 Player 前面', '2 Sticks (Cylinders, Scale 0.1, 0.4, 0.1, Rotation 0, 0, 90) and 1 Stone (Sphere, Scale 0.3) in front of Player'),
          () => sticks().length >= 2 && sticks().every(o => G.near(G.effScale(o), [.1, .4, .1]) && G.near(o.rot, [0, 0, 90])) && !!stone() && G.near(G.effScale(stone()), [.3, .3, .3])],
         [T('每个都挂 ItemPickup，Item 格子放对应的物品数据', 'Each has ItemPickup with the matching item data in Item'), () => sticks().length >= 2 && sticks().every(o => refOk(o, 'ItemPickup', 'item', item('Stick'))) && refOk(stone(), 'ItemPickup', 'item', item('Stone'))],
         [T('点播放，捡起 2 根树枝和 1 块石头', 'Press Play and pick up 2 sticks and 1 stone'), () => G.S.flags.picked >= 3],
         [T('按 Tab 打开背包，看到 Stick x2、Stone x1', 'Press Tab: the backpack shows Stick x2 and Stone x1'), () => G.S.flags.invOpened]],
  hint:T('做好一根树枝、挂好脚本以后，按 Ctrl+D 复制，第二根就连脚本一起有了。东西很小，要走近、低头看。', 'Make one stick with its script, then Ctrl+D copies it — script and all. They’re small, so walk close and look down.'),
  auto:() => { if (G.S.playing) G.stopPlay(); const st = item('Stick'), sn = item('Stone');
    [[1.5, .05, 3], [-1.5, .05, 3]].slice(sticks().length).forEach(p => { const o = G.mkObj('cylinder', G.uniqueName('Stick', null), p); o.rot = [0, 0, 90]; o.scale = [.1, .4, .1]; });
    sticks().forEach(o => { o.scale = [.1, .4, .1]; o.scaleOverride = false; o.rot = [0, 0, 90]; const s = attach(o, 'ItemPickup'); s.vals.item = st.id; });
    let s1 = stone(); if (!s1) s1 = G.mkObj('sphere', 'Stone', [0, .15, 4]); s1.scale = [.3, .3, .3]; s1.scaleOverride = false; attach(s1, 'ItemPickup').vals.item = sn.id;
    Object.assign(G.S.flags, {picked:3, invOpened:true}); }},

 // 10
 {title:T('合成斧头', 'Crafting an axe'), glow:() => G.S.playing ? ['#playbtn'] : ['#p-proj', '#p-insp'], play:true,
  point:() => { const p = P(), pn = panel(); if (!p || !pn) return null;
    if (!G.S.playing) { const sf = scriptFlow('Crafting', p); if (sf) return sf;
      for (const n of ['Stick', 'Stone', 'Axe']) { const r = itemSlot(p, 'Crafting', n.toLowerCase(), item(n)); if (r) return r; }
      const c = uiCreate('uibutton', 'CraftButton', ['CraftButton'], T('点 +，选 UI → 按钮', 'Click +, then UI → Button')); if (c) return c;
      const b = craftBtn(); if (b.ui.text !== 'Craft Axe') return selFirst(b) || {at:H().field('utext'), label:T('改成 Craft Axe，按 Enter', 'Type Craft Axe, press Enter')};
      const f = fixNum('uy', -150, b.ui.y); if (f) return selFirst(b) || f;
      if (b.parent !== pn.id) return {from:H().row(b.id), to:H().row(pn.id), label:T('拖到 BackpackPanel 上', 'Drag onto BackpackPanel')};
      const oc = b.ui.onClick || []; if (!oc.some(e => e.obj === p.id && e.fn === 'Crafting.CraftAxe')) { const s = selFirst(b); if (s) return s;
        if (!oc.length) return {at:'#insp-body [data-act="ocadd"]', label:T('点 + 加一项', 'Click + to add an entry')};
        if (oc[0].obj !== p.id) return {from:H().row(p.id), to:`#insp-body [data-drop="onclick:${b.id}:0"]`, label:T('把 Player 拖进来', 'Drag Player in')};
        return {at:'#insp-body [data-bind="ocfn.0"]', label:T('选 Crafting → CraftAxe', 'Choose Crafting → CraftAxe')}; } }
    return playStep(G.S.flags.crafted, {at:'#cwrap', label:T('捡齐材料，按 Tab，点 Craft Axe', 'Gather the materials, press Tab, click Craft Axe')}); },
  body:T('新建脚本 <b>Crafting</b>（填 1 个空）挂到 Player，把 Stick、Stone、Axe 三个物品数据拖进格子。再在背包面板里放一个按钮「Craft Axe」，On Click 选 Player → <b>Crafting → CraftAxe</b>。播放：捡齐 2 根树枝和 1 块石头，打开背包点按钮。',
         'Create a script named <b>Crafting</b> (1 blank) on Player and drag the Stick, Stone and Axe item data into its slots. Add a “Craft Axe” button inside the backpack panel with On Click → Player → <b>Crafting → CraftAxe</b>. Play: gather 2 sticks and 1 stone, open the backpack and click the button.'),
  conds:[[T('新建脚本 Crafting（填 1 个空）挂到 Player，Stick / Stone / Axe 拖好', 'Create a script named Crafting (1 blank) on Player, with Stick / Stone / Axe filled'), () => scriptOk('Crafting') && ['Stick', 'Stone', 'Axe'].every(n => refOk(P(), 'Crafting', n.toLowerCase(), item(n)))],
         [T('按钮 CraftButton：文字 Craft Axe，位置 Y -150，放进 BackpackPanel', 'Button CraftButton: text Craft Axe, Position Y -150, inside BackpackPanel'), () => { const b = craftBtn(); return !!b && b.ui.text === 'Craft Axe' && near1(b.ui.y, -150) && !!panel() && b.parent === panel().id; }],
         [T('CraftButton 的 On Click：Player → Crafting.CraftAxe', 'CraftButton On Click: Player → Crafting.CraftAxe'), () => { const b = craftBtn(); return !!b && (b.ui.onClick || []).some(e => e.obj === (P() || {}).id && e.fn === 'Crafting.CraftAxe'); }],
         [T('点播放，合成出一把斧头', 'Press Play and craft an axe'), () => G.S.flags.crafted]],
  hint:T('打开背包时，鼠标会放开，才能点按钮；关上背包，再点一下画面就能继续转头。', 'Opening the backpack frees the mouse so you can click; after closing it, click the view to look around again.'),
  auto:() => { if (G.S.playing) G.stopPlay(); const p = P(), pn = panel(); if (!p || !pn) return; const s = attach(p, 'Crafting'); ['Stick', 'Stone', 'Axe'].forEach(n => { s.vals[n.toLowerCase()] = item(n).id; });
    const b = makeUI('uibutton', 'CraftButton', {text:'Craft Axe', anchor:'mc', x:0, y:-150, w:360, h:70, size:36, hl:'#f2a13a'}); if (b.parent !== pn.id) G.setParent(b, pn); b.ui.onClick = [{obj:p.id, fn:'Crafting.CraftAxe'}]; G.S.flags.crafted = true; }},

 // 11
 {title:T('砍树', 'Chopping trees'), glow:() => G.S.playing ? ['#playbtn'] : ['#p-proj', '#p-insp'], play:true,
  point:() => { const tr = models(['tree', 'pine'])[0]; if (!tr) return null;
    if (!G.S.playing) { const sf = scriptFlow('ChopTree', tr); if (sf) return sf; for (const n of ['Axe', 'Wood']) { const r = itemSlot(tr, 'ChopTree', n.toLowerCase(), item(n)); if (r) return r; } }
    return playStep(G.S.flags.chopped, {at:'#cwrap', label:T('有斧头后，看着树按 F', 'With the axe, look at the tree and press F')}); },
  body:T('新建脚本 <b>ChopTree</b>，挂到树上，把 Axe 和 Wood 拖进格子。没斧头时按 F 只会提示「You need an axe」；有斧头就会得到 3 块木头，树用 <b>协程</b> 慢慢倒下再消失。',
         'Create a script named <b>ChopTree</b>, put it on a tree, and drag Axe and Wood into its slots. Without an axe, F only says “You need an axe”; with one you get 3 Wood, and the tree slowly falls over (a <b>coroutine</b>) and disappears.'),
  conds:[[T('新建脚本 ChopTree 挂到一棵树上，Axe 和 Wood 拖好', 'Create a script named ChopTree on a tree, with Axe and Wood filled'), () => scriptOk('ChopTree') && models(['tree', 'pine']).some(t => refOk(t, 'ChopTree', 'axe', item('Axe')) && refOk(t, 'ChopTree', 'wood', item('Wood')))],
         [T('点播放：合成斧头，再砍倒这棵树', 'Press Play: craft the axe, then chop the tree down'), () => G.S.flags.chopped]],
  hint:T('想每棵树都能砍？挂好一棵以后，选中其他树，用「添加组件」或从项目窗口拖脚本上去，再把格子拖好。', 'Want every tree choppable? Add the script to the other trees too and fill their slots.'),
  auto:() => { if (G.S.playing) G.stopPlay(); models(['tree', 'pine']).forEach(t => { const s = attach(t, 'ChopTree'); s.vals.axe = item('Axe').id; s.vals.wood = item('Wood').id; }); G.S.flags.chopped = true; }},

 // 12
 {title:T('白天和晚上', 'Day and night'), glow:() => G.S.playing ? ['#playbtn'] : ['#p-proj', '#p-hier'], play:true,
  point:() => { const l = sun(); if (!l) return null;
    if (!G.S.playing) { const sf = scriptFlow('DayNightCycle', l); if (sf) return sf; const s = scriptOn(l, 'DayNightCycle'); const f = fixNum(`fv.${l.scripts.indexOf(s)}.dayLengthSeconds`, 60, s.vals.dayLengthSeconds); if (f) return selFirst(l) || f; }
    return playStep(G.S.flags.sawNight, {at:'#tab-game', label:T('等天黑', 'Wait for night')}); },
  body:T('新建脚本 <b>DayNightCycle</b>，挂到方向光（太阳）上，一天设成 60 秒。点播放：太阳会转，天空从蓝色变成橘色，再变成深蓝的夜晚。',
         'Create a script named <b>DayNightCycle</b>, put it on the Directional Light (the sun), and set a day to 60 seconds. Press Play: the sun turns and the sky goes from blue to orange to a dark night.'),
  conds:[[T('新建脚本 DayNightCycle 挂到方向光上，Day Length Seconds 改成 60', 'Create a script named DayNightCycle on the Directional Light, Day Length Seconds 60'), () => { const s = scriptOn(sun(), 'DayNightCycle'); return scriptOk('DayNightCycle') && !!s && near1(s.vals.dayLengthSeconds, 60); }],
         [T('点播放，等到天黑', 'Press Play and wait until it gets dark'), () => G.S.flags.sawNight]],
  hint:T('不想等？在检查器把 Day Length Seconds 暂时改成 10。', 'Don’t want to wait? Set Day Length Seconds to 10 for now.'),
  auto:() => { if (G.S.playing) G.stopPlay(); const l = sun(); if (!l) return; attach(l, 'DayNightCycle').vals.dayLengthSeconds = 60; G.S.flags.sawNight = true; }},

 // 13
 {title:T('营火：火焰和火星（粒子系统）', 'The campfire: flames and sparks (particle systems)'), glow:() => G.S.playing ? ['#playbtn'] : ['#p-hier', '#p-insp'], play:true,
  enter:() => { G.setView([0, 0, -5], 8, -30, 30); },
  point:() => { if (!G.S.playing) {
      let cf = campfire(); if (!cf) { const c = G.S.objs.find(o => o.type === 'cylinder' && !o.name.startsWith('Stick')); if (c) return nameIt(c, 'Campfire'); return viaMenu('#hier-plus', ['go3d', 'cylinder'], T('点 +，选 3D 对象 → 圆柱体', 'Click +, then 3D Object → Cylinder')); }
      if (!G.near(cf.pos, [0, .1, -5]) || !G.near(G.effScale(cf), [.9, .1, .9])) return selFirst(cf) || fix('pos', [0, .1, -5], cf.pos) || fix('scl', [.9, .1, .9], G.effScale(cf));
      const psNew = n => { const f = G.S.objs.find(o => o.ps && !['Fire', 'Sparks'].includes(o.name)); if (f) return nameIt(f, n); return viaMenu('#hier-plus', ['effects', 'ps'], T('点 +，选 特效 → 粒子系统', 'Click +, then Effects → Particle System')); };
      let fi = fire(); if (!fi) return psNew('Fire');
      if (!G.near(fi.pos, [0, .2, -5])) return selFirst(fi) || fix('pos', [0, .2, -5], fi.pos);
      const ff = psFlow(fi, FIRE); if (ff && !psMatch(fi, FIRE)) return ff;
      let sp = sparks(); if (!sp) return psNew('Sparks');
      if (sp.parent !== fi.id) return {from:H().row(sp.id), to:H().row(fi.id), label:T('拖到 Fire 上', 'Drag onto Fire')};
      if (!G.near(sp.pos, [0, 0, 0]) || !G.near(sp.rot, [0, 0, 0])) return selFirst(sp) || fix('pos', [0, 0, 0], sp.pos) || fix('rot', [0, 0, 0], sp.rot);
      const fs = psFlow(sp, SPARKS); if (fs && !psMatch(sp, SPARKS)) return fs;
      let fl = fireLight(); if (!fl) { const pl = G.S.objs.find(o => o.type === 'light' && o.light && o.light.kind === 'point' && o.name !== 'FireLight'); if (pl) return nameIt(pl, 'FireLight'); return viaMenu('#hier-plus', ['lightm', 'pointlight'], T('点 +，选 灯光 → 点光源', 'Click +, then Light → Point Light')); }
      const sl = selFirst(fl) || fix('pos', [0, 1, -5], fl.pos) || (fl.light.color !== '#ffb46b' && {at:'#insp-body [data-act="setc"][data-c="#ffb46b"]', label:T('点橙黄色', 'Pick orange-yellow')}) || fixNum('lrange', 10, fl.light.range) || fixNum('lint', 2, fl.light.intensity);
      if (sl) return sl;
      const sf = scriptFlow('LightFlicker', fl); if (sf) return sf;
      if (fl.light.enabled !== false) return selFirst(fl) || {at:H().field('len'), label:T('取消勾选灯光组件', 'Uncheck the Light component')};
      const sc = scriptFlow('Campfire', cf); if (sc) return sc;
      const r = itemSlot(cf, 'Campfire', 'wood', item('Wood')) || refSlot(cf, 'Campfire', 'fire', fi) || refSlot(cf, 'Campfire', 'fireLight', fl); if (r) return r;
      if (fi.active !== false) return selFirst(fi) || {at:H().field('active'), label:T('取消勾选', 'Uncheck it')}; }
    return playStep(G.S.flags.litFire, {at:'#cwrap', label:T('砍树拿 3 块木头，看着营火按 F', 'Chop a tree for 3 Wood, look at the campfire and press F')}); },
  body:T('营火由几样东西组成：一个扁圆柱底座 Campfire；一个 <b>粒子系统</b> Fire（橙色火焰往上冒）；Fire 下面再放一个粒子系统 Sparks（小黄点火星）；一个点光源 FireLight（挂 LightFlicker，会闪）。新建脚本 <b>Campfire</b> 挂到底座上：有 3 块木头才能生火，生火就是把 Fire 打开、把火光点亮。',
         'A campfire is a few pieces: a flat Cylinder base called Campfire; a <b>Particle System</b> called Fire (orange flames rising); another Particle System called Sparks inside Fire (little yellow sparks); and a Point Light called FireLight with LightFlicker. Create a script named <b>Campfire</b> on the base: it needs 3 Wood, and lighting it switches Fire on and turns on the light.'),
  conds:[[T('圆柱体 Campfire：位置 0、0.1、-5，缩放 0.9、0.1、0.9', 'A Cylinder named Campfire: Position 0, 0.1, -5, Scale 0.9, 0.1, 0.9'), () => { const c = campfire(); return !!c && c.type === 'cylinder' && G.near(c.pos, [0, .1, -5]) && G.near(G.effScale(c), [.9, .1, .9]); }],
         [T('粒子系统 Fire：位置 0、0.2、-5；寿命 0.8、速度 1.5、大小 0.6、颜色 #ff9a3c、每秒 40 个、角度 15、半径 0.3，勾选「越来越暗」', 'Particle System Fire at 0, 0.2, -5: Lifetime 0.8, Speed 1.5, Size 0.6, Color #ff9a3c, Rate 40, Angle 15, Radius 0.3, Fade out checked'), () => !!fire() && G.near(fire().pos, [0, .2, -5]) && psMatch(fire(), FIRE)],
         [T('粒子系统 Sparks 放在 Fire 下面（位置、旋转都是 0）：寿命 1.5、速度 3、大小 0.08、颜色 #ffe066、每秒 8 个、角度 25、半径 0.2，勾选「越来越暗」', 'Particle System Sparks inside Fire (Position and Rotation 0): Lifetime 1.5, Speed 3, Size 0.08, Color #ffe066, Rate 8, Angle 25, Radius 0.2, Fade out checked'),
          () => { const s = sparks(); return !!s && !!fire() && s.parent === fire().id && G.near(s.pos, [0, 0, 0]) && psMatch(s, SPARKS); }],
         [T('点光源 FireLight：位置 0、1、-5，橙黄色，范围 10，强度 2，挂 LightFlicker，取消勾选灯光组件', 'Point Light FireLight at 0, 1, -5, orange-yellow, Range 10, Intensity 2, with LightFlicker, Light component unchecked'),
          () => { const l = fireLight(); return !!l && G.near(l.pos, [0, 1, -5]) && l.light.color === '#ffb46b' && near1(l.light.range, 10) && near1(l.light.intensity, 2) && !!scriptOn(l, 'LightFlicker') && l.light.enabled === false; }],
         [T('新建脚本 Campfire 挂到底座，Wood、Fire、FireLight 拖好；取消勾选 Fire（开始时没火）', 'Create a script named Campfire on the base with Wood, Fire and FireLight filled; uncheck Fire (no fire at the start)'),
          () => refOk(campfire(), 'Campfire', 'wood', item('Wood')) && refOk(campfire(), 'Campfire', 'fire', fire()) && refOk(campfire(), 'Campfire', 'fireLight', fireLight()) && !!fire() && fire().active === false],
         [T('点播放：砍树拿木头，看着营火按 F 生火', 'Press Play: chop a tree for wood, look at the campfire and press F'), () => G.S.flags.litFire]],
  hint:T('粒子系统新建时就朝上（旋转 X 是 -90）。Sparks 放进 Fire 以后位置和旋转都改成 0，它就跟着 Fire 一起往上喷、一起开关。', 'A new Particle System already points up (Rotation X is -90). Put Sparks inside Fire with Position and Rotation 0, and it sprays up with Fire and turns on and off with it.'),
  note:T('粒子的「大小」「寿命」「每秒发射数」是做特效最常调的三个数：火焰要多、要短命；火星要少、要小、飞得远。', 'Size, Lifetime and Rate over Time are the three numbers you tweak most for effects: flames are many and short-lived; sparks are few, tiny and fly far.'),
  auto:() => { if (G.S.playing) G.stopPlay();
    let cf = campfire() || G.mkObj('cylinder', 'Campfire'); cf.name = 'Campfire'; cf.pos = [0, .1, -5]; cf.scale = [.9, .1, .9]; cf.scaleOverride = false; cf.mat = ensureMat('Ash_Mat', '#3a3330').id;
    const mkPS = (name, w, pos, parent) => { let o = byName(name); if (!o || !o.ps) { o = G.mkObj('empty', name, pos); o.rot = [-90, 0, 0]; o.ps = {seq:Date.now()}; } Object.assign(o.ps, w); if (parent && o.parent !== parent.id) { o.parent = parent.id; } if (parent) { o.pos = [0, 0, 0]; o.rot = [0, 0, 0]; } else { o.pos = pos.slice(); o.rot = [-90, 0, 0]; } return o; };
    const fi = mkPS('Fire', FIRE, [0, .2, -5]); mkPS('Sparks', SPARKS, [0, 0, 0], fi);
    let fl = fireLight(); if (!fl) { fl = G.mkObj('light', 'FireLight'); fl.light = G.mkLight('point'); } fl.pos = [0, 1, -5]; Object.assign(fl.light, {kind:'point', color:'#ffb46b', range:10, intensity:2}); attach(fl, 'LightFlicker'); fl.light.enabled = false;
    const s = attach(cf, 'Campfire'); s.vals.wood = item('Wood').id; s.vals.fire = fi.id; s.vals.fireLight = fl.id; fi.active = false; G.S.flags.litFire = true; G.select('obj', cf.id); }},

 // 14
 {title:T('存档和读档', 'Saving and loading'), glow:() => G.S.playing ? ['#playbtn'] : ['#p-proj', '#p-insp'], play:true,
  point:() => { const p = P(); if (!p) return null; const F = G.S.flags;
    if (!G.S.playing) { const sf = scriptFlow('SaveGame', p); if (sf) return sf; const s = scriptOn(p, 'SaveGame'); const have = (s.vals.items || []);
      for (const [n] of ITEMS) { const it = item(n); if (it && !have.includes(it.id)) { const r = H().reach(it); if (r.nav) return r; return selFirst(p) || {from:r.at, to:slotSel(p, 'SaveGame', 'items', 'alist'), label:T(`把 ${n} 拖进 Items`, `Drag ${n} into Items`)}; } } }
    if (!F.savedGame) return playStep(false, {at:'#cwrap', label:T('捡点东西，按 K 存档', 'Pick something up, then press K to save')});
    return playStep(F.loadedGame, {at:'#cwrap', label:T('走开一点，按 L 读档', 'Walk away a bit, then press L to load')}); },
  body:T('新建脚本 <b>SaveGame</b>（填 2 个空）挂到 Player，把 4 个物品数据都拖进 Items 列表。按 K 用 <b>PlayerPrefs</b> 存下位置、三个数值和每样物品的数量；按 L 读回来。关掉 app 再打开，存档还在。',
         'Create a script named <b>SaveGame</b> (2 blanks) on Player and drag all 4 item data files into the Items list. K saves your position, the three stats and every item count with <b>PlayerPrefs</b>; L loads them back. The save survives closing the app.'),
  conds:[[T('新建脚本 SaveGame（填 2 个空）挂到 Player', 'Create a script named SaveGame (2 blanks) on Player'), () => scriptOk('SaveGame') && !!scriptOn(P(), 'SaveGame')],
         [T('Stick、Stone、Wood、Axe 都拖进 Items 列表', 'Drag Stick, Stone, Wood and Axe into the Items list'), () => { const s = scriptOn(P(), 'SaveGame'); return !!s && ITEMS.every(([n]) => !!item(n) && (s.vals.items || []).includes(item(n).id)); }],
         [T('点播放，按 K 存档', 'Press Play and press K to save'), () => G.S.flags.savedGame],
         [T('走开一点，按 L 读档：回到存档的地方', 'Walk away, then press L: you’re back where you saved'), () => G.S.flags.loadedGame]],
  hint:T('窗口 → PlayerPrefs 可以看到存了什么。读档时代码先关掉角色控制器再搬位置，不然它会把你拉回去。', 'Window → PlayerPrefs shows what was saved. When loading, the code turns off the Character Controller before moving you, or it would pull you back.'),
  auto:() => { if (G.S.playing) G.stopPlay(); const p = P(); if (!p) return; const s = attach(p, 'SaveGame'); s.vals.items = ITEMS.map(([n]) => item(n).id); Object.assign(G.S.flags, {savedGame:true, loadedGame:true}); }},

 // 15
 {title:T('美化 1：小岛配色', 'Polish 1: island colors'), glow:() => ['#p-proj', '#p-insp'],
  enter:() => { G.setView([0, 0, 0], 34, -35, 50); },
  point:() => matFlow(island(), 'Sand_Mat', isSand, '#e2c88f') || matFlow(sea(), 'Sea_Mat', isBlue, '#2c7fd1'),
  body:T('现在开始美化。给沙地一个暖暖的沙子颜色（例如 #e2c88f）。选中材质时，检查器下面的 <b>调色盘</b> 会根据这个颜色推荐搭配色：试试用「互补」给海水挑一个蓝色。打开「对比」看前后差别。',
         'Time to polish. Give the sand a warm sand color (say #e2c88f). With the material selected, the <b>palette</b> at the bottom of the Inspector suggests matching colors: try Complementary to pick a blue for the sea. Turn on Compare to see before and after.'),
  conds:[[T('材质 Sand_Mat，沙子颜色（暖、亮），用在 Island 上', 'A Sand_Mat material in a warm, light sand color, on Island'), () => { const m = island() && G.matOf(island()); return !!m && isSand(m.color); }],
         [T('Sea 还是蓝色的海水（可以用调色盘换一个更搭的蓝）', 'Sea is still blue (use the palette to pick a better-matching blue)'), () => { const m = sea() && G.matOf(sea()); return !!m && isBlue(m.color); }]],
  hint:T('沙子暖、海水冷：一冷一暖放在一起，画面就有对比、有精神。', 'Warm sand against cool water: pairing warm and cool gives the picture contrast and life.'),
  auto:() => { const i = island(); if (i) i.mat = ensureMat('Sand_Mat', '#e2c88f').id; const s = sea(); if (s && !(G.matOf(s) && isBlue(G.matOf(s).color))) s.mat = ensureMat('Sea_Mat', '#2c7fd1').id; }},

 // 16
 {title:T('美化 2：阳光和远处的雾', 'Polish 2: sunlight and distant haze'), glow:() => ['.mbtn[data-menu="window"]', '#p-insp'],
  point:() => { const l = sun(), e = G.S.env;
    if (l && !isWarm(l.light.color)) return selFirst(l) || {at:'#insp-body [data-act="setc"][data-c="#ffd6a0"]', label:T('点暖黄色', 'Pick warm yellow')};
    if (!(e.fog && e.fogMode === 'linear' && near1(e.start, 25) && near1(e.end, 90) && lum(e.fogColor) > .5 && isBlue(e.fogColor) === false && rgb(e.fogColor)[2] >= rgb(e.fogColor)[0])) {
      if (G.floatOpen() !== 'lighting') return viaMenu('.mbtn[data-menu="window"]', ['lighting', 'rendering'], T('窗口 → 渲染 → 灯光', 'Window → Rendering → Lighting'));
      if (!e.fog) return {at:'#float [data-env="fog"]', label:T('勾选雾', 'Check Fog')};
      if (e.fogColor !== '#c9d6e8') return {at:'#float [data-envc="fogColor"][data-c="#c9d6e8"]', label:T('点浅蓝色', 'Pick light blue')};
      if (e.fogMode !== 'linear') return {at:'#float [data-env="fogMode"]', label:T('选 线性', 'Choose Linear')};
      if (!near1(e.start, 25)) return {at:'#float [data-env="start"]', label:setTo(25)};
      return {at:'#float [data-env="end"]', label:setTo(90)}; }
    return null; },
  body:T('选中方向光，把颜色改成暖暖的阳光（#ffd6a0）。再打开 <b>窗口 → 渲染 → 灯光</b>，勾选雾：浅蓝色、线性，25 米开始、90 米全白。远处的海会淡淡地融进天空，小岛看起来更大。',
         'Select the Directional Light and give it warm sunlight (#ffd6a0). Then open <b>Window → Rendering → Lighting</b> and turn on Fog: light blue, Linear, starting at 25 m and solid at 90 m. The distant sea melts into the sky and the island feels bigger.'),
  conds:[[T('方向光颜色改成暖色（#ffd6a0）', 'Set the Directional Light to a warm color (#ffd6a0)'), () => !!sun() && isWarm(sun().light.color)],
         [T('雾：浅蓝色（#c9d6e8），线性，开始 25，结束 90', 'Fog: light blue (#c9d6e8), Linear, Start 25, End 90'), () => { const e = G.S.env; return e.fog && e.fogMode === 'linear' && near1(e.start, 25) && near1(e.end, 90) && lum(e.fogColor) > .5 && rgb(e.fogColor)[2] >= rgb(e.fogColor)[0]; }]],
  hint:T('恐怖游戏的雾是黑的、很近；白天的小岛用浅色、远远的雾，感觉就完全不一样。', 'Horror fog is dark and close; a daytime island uses light, distant haze — a completely different mood.'),
  auto:() => { const l = sun(); if (l) l.light.color = '#ffd6a0'; Object.assign(G.S.env, {fog:true, fogColor:'#c9d6e8', fogMode:'linear', start:25, end:90}); G.closeFloat(); }},

 // 17
 {title:T('美化 3：后期处理', 'Polish 3: post-processing'), glow:() => ['#p-hier', '#p-insp'],
  point:() => { const v = G.S.objs.find(o => o.vol), c = cam();
    if (!v) return viaMenu('#hier-plus', ['volume', 'globalvol'], T('点 +，选 体积 → 全局体积', 'Click +, then Volume → Global Volume'));
    const ov = v.vol.ov, s = selFirst(v);
    if (!v.vol.profile) return s || {at:'#insp-body [data-act="volnew"]', label:T('点新建', 'Click New')};
    if (!ov.bloom) return s || [{at:H().mi('ov_bloom'), label:T('泛光', 'Bloom')}, {at:H().mi('postproc'), label:T('后期处理', 'Post-processing')}, {at:'#addov', label:T('点添加覆盖', 'Click Add Override')}];
    if (ov.bloom.intensity < .5) return s || {at:H().field('vo.bloom.intensity'), label:setTo(.8)};
    if (!ov.color) return s || [{at:H().mi('ov_color'), label:T('色彩调整', 'Color Adjustments')}, {at:H().mi('postproc'), label:T('后期处理', 'Post-processing')}, {at:'#addov', label:T('点添加覆盖', 'Click Add Override')}];
    if (ov.color.saturation < 15) return s || {at:H().field('vo.color.saturation'), label:setTo(20)};
    if (c && !(c.cam && c.cam.post)) return selFirst(c) || {at:H().field('campost'), label:T('勾选后期处理', 'Check Post Processing')};
    return null; },
  body:T('最后加 <b>后期处理</b>：新建全局体积，加「泛光」（亮的地方会发光，营火和夕阳特别好看）和「色彩调整」（饱和度 +20，颜色更鲜艳，和恐怖章刚好相反）。别忘了在主摄像机勾选「后期处理」。',
         'Finally, <b>post-processing</b>: a Global Volume with Bloom (bright things glow — great on the campfire and the sunset) and Color Adjustments (Saturation +20 for richer color — the opposite of the horror chapter). Don’t forget to check Post Processing on the Main Camera.'),
  conds:[[T('全局体积，配置文件点「新建」', 'A Global Volume with a new Profile'), () => { const v = G.S.objs.find(o => o.vol); return !!v && !!v.vol.profile; }],
         [T('添加覆盖：泛光，强度 0.8', 'Add Override: Bloom, Intensity 0.8'), () => { const v = G.S.objs.find(o => o.vol); return !!v && !!v.vol.ov.bloom && v.vol.ov.bloom.intensity >= .5; }],
         [T('添加覆盖：色彩调整，饱和度 20', 'Add Override: Color Adjustments, Saturation 20'), () => { const v = G.S.objs.find(o => o.vol); return !!v && !!v.vol.ov.color && v.vol.ov.color.saturation >= 15; }],
         [T('主摄像机勾选「后期处理」', 'Check Post Processing on the Main Camera'), () => !!cam() && !!cam().cam && cam().cam.post]],
  hint:T('同一个工具，不同的数字，就是完全不同的气氛。', 'Same tools, different numbers, completely different mood.'),
  auto:() => { let v = G.S.objs.find(o => o.vol); if (!v) { v = G.mkObj('empty', G.uniqueName(G.t('nGlobalVolume'), null)); v.vol = {profile:null, ov:{}, seq:Date.now()}; }
    v.vol.profile = v.vol.profile || 'Global Volume Profile'; v.vol.ov.bloom = Object.assign({threshold:.9, intensity:0}, v.vol.ov.bloom); if (v.vol.ov.bloom.intensity < .5) v.vol.ov.bloom.intensity = .8;
    v.vol.ov.color = Object.assign({postExposure:0, contrast:0, saturation:0}, v.vol.ov.color); if (v.vol.ov.color.saturation < 15) v.vol.ov.color.saturation = 20; const c = cam(); if (c) c.cam = Object.assign({}, c.cam, {post:true}); }},

 // 18
 {title:T('保存，活下去', 'Save, and survive'), glow:() => ['#menu-file'],
  point:() => [{at:H().mi('save'), label:T('点保存', 'Click Save')}, {at:'#menu-file', label:T('点 文件 → 保存（或按 Ctrl/Cmd+S）', 'File → Save (or Ctrl/Cmd+S)')}],
  body:T('保存场景，然后从头玩一遍：喝水、吃莓果、捡树枝和石头、合成斧头、砍树、在天黑前生起营火，再按 K 存档。',
         'Save the scene, then play it from the start: drink, eat berries, gather sticks and a stone, craft an axe, chop a tree, light the campfire before dark, and press K to save.'),
  conds:[[T('按 Ctrl+S（Mac 是 Cmd+S），或 文件 → 保存', 'Press Ctrl+S (Cmd+S on Mac), or File → Save'), () => G.S.flags.saved && !G.S.dirty]],
  hint:T('觉得太难？把 Thirst Drain 调小。太简单？让木头更难拿：Wood Amount 改成 1。调数字也是做游戏的一部分。', 'Too hard? Lower Thirst Drain. Too easy? Make wood scarcer: set Wood Amount to 1. Tuning numbers is part of making games.'),
  auto:() => { if (G.S.playing) G.stopPlay(); G.saveScene(); }},
];

const FINISH = {
 zh:`<div class="finish"><div class="gstep">完成</div><h2>第 2 章完成：你在小岛上活下来了</h2>
<p>你做了饥饿、口渴、血量和三个 UI 条；用物品数据（ScriptableObject）和字典做了背包；能捡东西、合成斧头、砍树；用两个粒子系统做了营火；还有昼夜循环和 PlayerPrefs 存档。</p>
<div class="note">想再练练？主页的「第 2 章 · 找 Bug 挑战」已经解锁。</div>
<div class="gact"><button class="btn primary" data-act="quiz">章末小测验</button><button class="btn" data-act="export">导出到真 Unity</button><button class="btn" data-act="reset">再玩一遍</button><button class="btn quiet" data-act="home">回到主页</button></div></div>`,
 en:`<div class="finish"><div class="gstep">Done</div><h2>Chapter 2 complete: you survived the island</h2>
<p>You built hunger, thirst and health with three UI bars; a backpack from item data (ScriptableObjects) and a dictionary; picking up, crafting an axe and chopping trees; a campfire from two particle systems; plus a day-night cycle and PlayerPrefs saving.</p>
<div class="note">Want more practice? “Chapter 2 · Bug Hunt” is now unlocked on the home screen.</div>
<div class="gact"><button class="btn primary" data-act="quiz">Chapter quiz</button><button class="btn" data-act="export">Export to real Unity</button><button class="btn" data-act="reset">Play again</button><button class="btn quiet" data-act="home">Back to home</button></div></div>`};

// 开场：空的小岛 + 做好的第一人称玩家（会走路、会按 F 互动）
function setup() {
  const isl = G.mkObj('plane', 'Island', [0, 0, 0], [4, 1, 4]);
  const p = G.mkObj('capsule', 'Player', [0, 1, 0]); p.cc = {seq:Date.now()}; p.tag = 'Player';
  const c = cam(); G.setParent(c, p); c.pos = [0, .6, 0]; c.rot = [0, 0, 0];
  attach(p, 'FirstPersonMove'); ensureScript('Interactable');
  const pr = G.createUI('uitext'); pr.name = 'Prompt'; Object.assign(pr.ui, {anchor:'bc', x:0, y:140, w:900, h:60, text:'', size:40, color:'#ffffff'});
  attach(c, 'Interact').vals.prompt = pr.id;
  G.closeCode(); G.select(null); G.S.cwd = 0; G.S.tab = 'scene'; G.setView([0, 0, 0], 34, -35, 50);
  Object.keys(G.S.flags).forEach(k => { if (typeof G.S.flags[k] === 'boolean') G.S.flags[k] = false; }); G.S.flags.picked = 0;
  G.saveScene(); G.S.flags.saved = false; G.S.logs.length = 0;
}

// 找 Bug 挑战：做完整章，再弄坏 4 个地方
const BUGS = {
 setup:() => {
  setup(); STEPS.forEach(st => { if (st.enter) st.enter(); st.auto(); }); G.closeFloat(); G.select(null);
  Object.keys(G.S.flags).forEach(k => { if (typeof G.S.flags[k] === 'boolean') G.S.flags[k] = false; });
  const s = sea(); if (s) s.col = null;
  const b = craftBtn(); if (b) b.ui.onClick.forEach(e => { e.fn = ''; });
  const ss = scriptOn(P(), 'SurvivalStats'); if (ss) ss.vals.hungerBar = null;
  const f = fire(); if (f) f.ps.loop = false; G.saveScene(); },
 list:[
  {title:T('走到海边按 F，喝不到水（连提示都没有）', 'At the shore, F does nothing — not even a hint'),
   hint:T('射线只打得到有碰撞体的东西。选中 Sea，看看它的碰撞体还在不在。', 'A raycast only hits colliders. Select Sea and check its collider.'),
   check:() => !!sea() && !!sea().col && !sea().col.trigger},
  {title:T('打开背包点「Craft Axe」，什么都没发生', 'Clicking Craft Axe in the backpack does nothing'),
   hint:T('选中 CraftButton，看它的 On Click：选了要调用的方法吗？', 'Select CraftButton and check its On Click: is a function chosen?'),
   check:() => { const b = craftBtn(); return !!b && (b.ui.onClick || []).some(e => e.obj === (P() || {}).id && e.fn === 'Crafting.CraftAxe'); }},
  {title:T('播放时控制台一直报红字，饥饿条不动', 'In Play the Console keeps showing a red error and the hunger bar doesn’t move'),
   hint:T('红字是 UnassignedReferenceException：选中 Player，看 SurvivalStats 的三个格子，哪一个空着？', 'The error is UnassignedReferenceException: select Player and look at SurvivalStats’ three slots — which one is empty?'),
   check:() => refOk(P(), 'SurvivalStats', 'hungerBar', slider('HungerBar'))},
  {title:T('营火烧几秒钟就熄了', 'The campfire burns for a few seconds, then goes out'),
   hint:T('选中 Fire，看粒子系统主模块：「循环」有没有勾？没勾的话，喷完「持续时间」就停。', 'Select Fire and check the Particle System’s Main module: is Looping checked? Without it, it stops after Duration.'),
   check:() => !!fire() && !!fire().ps && fire().ps.loop}]};

const QUIZ = [
 {q:T('「饿到 0 或者渴到 0，就掉血」，中间要写哪个符号？', '“If hunger is 0 OR thirst is 0, lose health” — which symbol goes in the middle?'),
  o:[T('&&', '&&'), T('||', '||'), T('==', '=='), T('!=', '!=')], a:1,
  w:T('|| 是「或者」，&& 是「而且」。写成 && 也能编译，但要两样都到 0 才会掉血。', '|| means OR, && means AND. && also compiles, but then you only lose health when both are 0.')},
 {q:T('背包里的 Dictionary（字典）是用来做什么的？', 'What is the Dictionary in Inventory for?'),
  o:[T('翻译中文和英文', 'Translating between languages'), T('用「哪种物品」查「有几个」', 'Looking up how many of each item you have'), T('存档', 'Saving the game'), T('画 UI', 'Drawing UI')], a:1,
  w:T('例如 Stick → 2、Stone → 1。', 'For example Stick → 2, Stone → 1.')},
 {q:T('为什么物品要做成「物品数据」（ScriptableObject）文件，而不是写在代码里？', 'Why make items as Item Data files (ScriptableObjects) instead of writing them into the code?'),
  o:[T('游戏会跑得更快', 'The game runs faster'), T('Unity 规定的', 'Unity requires it'), T('加新物品、改名字颜色，只要改文件，不用改代码', 'Adding items or changing names and colors only means editing files, not code'), T('这样才能存档', 'It’s the only way to save')], a:2,
  w:T('数据和代码分开：设计物品的人不用会写程序。', 'Keeping data apart from code means whoever designs items doesn’t need to program.')},
 {q:T('营火的粒子系统没勾「循环」（Looping），会怎样？', 'The campfire’s Particle System has Looping unchecked. What happens?'),
  o:[T('火越来越大', 'The fire keeps growing'), T('喷完「持续时间」那么多秒就停了', 'It stops after Duration seconds'), T('粒子变成方块', 'The particles become cubes'), T('什么都不变', 'Nothing changes')], a:1,
  w:T('爆炸这种只要一下子的特效才不循环；营火要一直烧，要勾循环。', 'One-off effects like explosions don’t loop; a campfire burns continuously, so it should loop.')},
 {q:T('读档时为什么要先把 CharacterController 关掉（enabled = false）再改位置？', 'When loading, why turn the CharacterController off (enabled = false) before moving the player?'),
  o:[T('为了省电', 'To save power'), T('不然它会把你拉回原来的地方', 'Otherwise it pulls you back to where you were'), T('Unity 规定的', 'Unity requires it'), T('为了让画面变暗', 'To dim the screen')], a:1,
  w:T('角色控制器会管着自己的位置，直接改 transform.position 可能被它盖掉。', 'The Character Controller manages its own position, so setting transform.position directly can get overwritten.')},
 {q:T('打开背包后，为什么要把鼠标放开（Cursor.lockState = None）？', 'Why free the mouse (Cursor.lockState = None) when the backpack opens?'),
  o:[T('不然点不到背包里的按钮', 'Otherwise you can’t click the buttons in it'), T('让游戏变快', 'To make the game faster'), T('为了存档', 'To save the game'), T('没有原因', 'No reason')], a:0,
  w:T('第一人称时鼠标锁在画面中间用来转头；要点 UI，就要先放开。', 'In first person the mouse is locked to the center for looking; to click UI you have to free it.')}];

const EXPORT_INTRO = {
 zh:'# 在真 Unity 里重做「荒岛求生」\n\n1. 用 Unity Hub 安装 Unity 6.3 LTS，新建项目，模板选 **Universal 3D**。\n2. 把这个压缩包里的 `Assets/Scripts` 文件夹拖进 Unity 的项目窗口（包括第 1 章下篇的 Interactable 和 Interact）。\n3. 物品数据：有了 ItemData 脚本以后，项目窗口右键 → 创建 → Item Data，建出 Stick、Stone、Wood、Axe。\n4. 树、石头、灌木：用免费的低多边形模型代替（例如 Kenney 的 Nature Kit）。\n5. 粒子系统：层级右键 → Effects → Particle System，照下面的数值调。\n6. 照下面的清单，一个一个建出物体、材质和设置。\n',
 en:'# Rebuild the survival island in real Unity\n\n1. Install Unity 6.3 LTS with Unity Hub and create a project with the **Universal 3D** template.\n2. Drag the `Assets/Scripts` folder from this zip into Unity’s Project window (it includes Interactable and Interact from Chapter 1 part 2).\n3. Item data: once the ItemData script exists, right-click in the Project window → Create → Item Data and make Stick, Stone, Wood and Axe.\n4. Trees, rocks and bushes: use free low-poly models instead (for example Kenney’s Nature Kit).\n5. Particle systems: Hierarchy right-click → Effects → Particle System, then set the values listed below.\n6. Follow the list below to create each object, material and setting.\n'};

G.chapters = G.chapters || {};
G.chapters.ch2 = {title:T('生存游戏', 'Survival Game'), steps:STEPS, finish:FINISH, setup, bugs:BUGS, quiz:QUIZ, exportIntro:EXPORT_INTRO};
})();
