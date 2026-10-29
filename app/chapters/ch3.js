// 第 3 章：沙盒游戏 —— 像 Minecraft 一样在地图上盖房子（画面不是像素风，方块用平滑的颜色）。
// 开场：一张做好的地图（沙滩、土地、城市）和一个做好的第一人称玩家。
// 现在有前 9 步：准备（四种方块、透明的玻璃、标签 Block 和预制件）+ 瞄准（预览方块、BuildSystem 射线和网格、hit.normal）+ 放和拆（Instantiate、CompareTag + Destroy、Physics.CheckBox）。
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
const nameIt = (o, want) => o.name === want ? null : selFirst(o) || {at:H().field('name'), label:T(`改成 ${want}，按 Enter`, `Type ${want}, press Enter`)};
const scriptA = n => G.S.assets.find(a => a.type === 'script' && a.name === n);
const scriptOn = (o, n) => o ? o.scripts.find(s => (G.asset(s.asset) || {}).name === n) : null;
const rgb = c => { const n = parseInt(String(c).slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };
const isBlue = c => { const [r, g, b] = rgb(c); return b > .4 && b > r + .15; };
const cam = () => G.S.objs.find(o => o.type === 'camera');

// ver：分版本的脚本（BuildSystem）要到第几版
function ensureScript(name, ver) {
  let a = scriptA(name);
  if (!a) { const f = G.S.assets.find(x => x.type === 'folder' && x.name === 'Scripts' && x.parent === 0) || G.mkAsset('folder', 'Scripts', 0); a = G.mkAsset('script', name, f.id); }
  G.closeCode(); if (ver != null && (a.ver == null || a.ver < ver)) a.ver = ver; a.blanks = Object.assign({}, G.lib()[name].answers); G.compileScript(a); return a;
}
const attach = (o, name, ver) => { const a = ensureScript(name, ver); let s = scriptOn(o, name); if (!s) { G.addScript(o, a); s = scriptOn(o, name); } return s; };
// 脚本编译好了，而且到了第 ver 版
const codeOk = (name, ver) => { const a = scriptA(name); return !!a && !!a.comp && a.comp.ok && (a.comp.rt.ver || 0) >= (ver || 0); };
// 脚本流程：新建 → 改名 → （要加新代码时）打开、点「加入这一步的新代码」→ 填空 → 保存 → 拖到物体上
function scriptFlow(name, host, ver) {
  const h = H();
  if (G.S.renaming != null) return {at:'#rn', label:T(`输入 ${name}，按 Enter`, `Type ${name}, press Enter`)};
  const s = scriptA(name);
  if (!s) {
    const w = G.S.assets.find(a => a.type === 'script' && !G.lib()[a.name]);
    if (w) { const r = h.reach(w); if (r.nav) return r; return h.isSel(w) ? {at:h.field('aname'), label:T(`改成 ${name}，按 Enter`, `Rename to ${name}, press Enter`)} : {at:r.at, label:T('点选这个脚本', 'Select this script')}; }
    return viaMenu('#proj-plus', ['create', 'script'], T('点 +，选 创建 → MonoBehaviour 脚本', 'Click +, then Create → MonoBehaviour Script'));
  }
  const needUp = ver != null && G.verOf(s) < ver;
  if (G.codeOpen() === s.id) {
    if (needUp) return {at:'#cup', label:T('点「加入这一步的新代码」', 'Click “Add this step’s code”')};
    const tm = G.tmplOf(s);
    const bad = tm.blanks.find(b => G.codeDraft(b.id) === '' || (s.comp && s.comp.errs.some(e => e.b === b.id) && G.codeDraft(b.id) === String((s.blanks || {})[b.id] || '')));
    if (bad) return {at:`#modal .blank[data-b="${bad.id}"]`, label:bad.tip};
    if (G.codeDirty() || !codeOk(name, ver)) return {at:'#csave', label:G.t('hSaveCode')};
    return null;
  }
  const r = h.reach(s); if (r.nav) return r;
  if (needUp) return {at:r.at, label:T('双击打开代码', 'Double-click to open the code')};
  if (!codeOk(name, ver)) return {at:r.at, label:T('双击打开代码，把空填好', 'Double-click to open the code and fill the blanks')};
  if (host && !scriptOn(host, name)) return {from:r.at, to:h.row(host.id), label:T(`拖到 ${host.name} 上`, `Drag onto ${host.name}`)};
  return null;
}
const slotSel = (host, name, fid, kind) => { const s = scriptOn(host, name); return `#insp-body [data-drop="${kind}:${host.id}:${host.scripts.indexOf(s)}:${fid}"]`; };
function refSlot(host, name, fid, target) {
  const s = scriptOn(host, name); if (!s || !target || s.vals[fid] === target.id) return null;
  return selFirst(host) || {from:H().row(target.id), to:slotSel(host, name, fid, 'ref'), label:T(`把 ${target.name} 拖进 ${fid} 格子`, `Drag ${target.name} into the ${fid} slot`)};
}
// 把项目窗口里的预制件拖进脚本的 GameObject 格子
function prefabSlot(host, name, fid, pa) {
  const s = scriptOn(host, name); if (!s || !pa || s.vals[fid] === pa.id) return null;
  const r = H().reach(pa); if (r.nav) return r;
  return selFirst(host) || {from:r.at, to:slotSel(host, name, fid, 'pref'), label:T(`把预制件 ${pa.name} 拖进 ${fid} 格子`, `Drag the ${pa.name} prefab into the ${fid} slot`)};
}
const refOk = (host, name, fid, target) => { const s = scriptOn(host, name); return !!s && !!target && s.vals[fid] === target.id; };
const playStep = (doneFlag, during) => {
  if (!G.S.playing) return doneFlag ? null : {at:'#playbtn', label:T('点播放', 'Click Play')};
  return doneFlag ? {at:'#playbtn', label:T('点一下停止', 'Click to stop')} : during;
};
function ensureMat(name, color) { const f = G.S.assets.find(x => x.type === 'folder' && x.name === 'Materials' && x.parent === 0) || G.mkAsset('folder', 'Materials', 0); const m = G.mats().find(x => x.name === name) || G.mkAsset('material', name, f.id, {color}); m.color = color; return m; }
function makeModel(key, name, pos) { const o = G.mkObj('model', G.uniqueName(name, null), pos.slice()); o.model = key; o.col = {kind:'box', trigger:false, seq:0}; return o; }

// ---------- 四种方块：排在玩家前面，中心都在 0.5 的格子上（方块边长 1，刚好对齐网格） ----------
const BLOCKS = [['Dirt', -1.5, 'Dirt_Mat'], ['Sand', -.5, 'Sand_Mat'], ['Brick', .5, 'Brick_Mat'], ['Glass', 1.5, 'Glass_Mat']];
const NAMES = BLOCKS.map(b => b[0]);
const ROW_Z = -3.5, posOf = x => [x, .5, ROW_Z];
const cube = n => G.S.objs.find(o => o.type === 'cube' && o.name === n);
const freshCube = () => G.S.objs.find(o => o.type === 'cube' && !NAMES.includes(o.name) && o.name !== 'Preview' && !/^Building/.test(o.name));
const matNamed = n => G.mats().find(m => m.name === n);
const glassMat = () => matNamed('Glass_Mat');
const glassOk = m => !!m && m.surface === 'transparent' && m.alpha != null && m.alpha <= .6 && m.alpha >= .05 && isBlue(m.color);
const prefabOf = n => Object.values(G.S.prefabs).find(pf => pf.name === n && G.asset(pf.assetId));
const hasTag = () => G.allTags().includes('Block');
const prefabAsset = n => { const pf = prefabOf(n); return pf ? G.asset(pf.assetId) : null; };
const bsRt = () => { const a = scriptA('BuildSystem'); return a && a.comp ? a.comp.rt : {}; };
const preview = () => G.S.objs.find(o => o.type === 'cube' && o.name === 'Preview');
const lum = c => { const [r, g, b] = rgb(c); return .2126 * r + .7152 * g + .0722 * b; };
const isLight = c => lum(c) > .75;
const previewOk = m => !!m && m.surface === 'transparent' && m.alpha != null && m.alpha <= .6 && m.alpha >= .1 && isLight(m.color);
// 新建一个透明材质（新建 → 改名 → 颜色 → 表面类型透明 → 透明度）再拖到物体上
function seeThroughFlow(o, name, okColor, hex, alpha, ok) {
  const m = matNamed(name);
  if (G.S.renaming != null) return {at:'#rn', label:T(`输入 ${name}，按 Enter`, `Type ${name}, press Enter`)};
  if (!m) { const nw = G.mats().find(x => /^(New Material|新材质)/.test(x.name)); if (nw) { const r = H().reach(nw); if (r.nav) return r; return H().isSel(nw) ? {at:H().field('aname'), label:T(`改成 ${name}，按 Enter`, `Rename to ${name}, press Enter`)} : {at:r.at, label:T('点选这个材质', 'Select this material')}; }
    return viaMenu('#proj-plus', ['create', 'mat'], T(`点 +，选 创建 → 材质（名字 ${name}）`, `Click +, then Create → Material (name: ${name})`)); }
  if (!ok(m)) { const r = H().reach(m); if (r.nav) return r; if (!H().isSel(m)) return {at:r.at, label:T(`点选 ${name}`, `Select ${name}`)};
    if (!okColor(m.color)) return {at:H().field('hex'), label:T(`输入 ${hex}，按 Enter`, `Type ${hex}, press Enter`)};
    if (m.surface !== 'transparent') return {at:H().field('surface'), label:T('选 透明（Transparent）', 'Choose Transparent')};
    return fixNum('malpha', alpha, m.alpha == null ? 1 : m.alpha); }
  if (G.matOf(o) !== m) return dragMat(o, m);
  return null;
}

// 把项目窗口里的材质拖到物体上
function dragMat(o, m) { const r = H().reach(m); if (r.nav) return r; return {from:r.at, to:H().row(o.id), label:T(`把 ${m.name} 拖到 ${o.name} 上`, `Drag ${m.name} onto ${o.name}`)}; }

const STEPS = [
 // 1
 {title:T('四种方块', 'Four kinds of blocks'), glow:() => ['#p-hier', '#p-insp', '#p-proj'],
  enter:() => { G.S.tab = 'scene'; G.setView([0, .5, ROW_Z], 9, -20, 30); },
  ghosts:() => BLOCKS.map(([n, x]) => { const o = cube(n); return {min:[x - .5, 0, ROW_Z - .5], max:[x + .5, 1, ROW_Z + .5], done:!!o && G.near(o.pos, posOf(x)), label:n}; }),
  point:() => {
    for (const [n, x, mn] of BLOCKS) {
      const o = cube(n);
      if (!o) { const f = freshCube(); if (f) return nameIt(f, n);
        const made = BLOCKS.map(b => cube(b[0])).find(Boolean);
        if (made) return H().isSel(made) ? {at:H().row(made.id), label:T('按 Ctrl+D 复制', 'Press Ctrl+D to duplicate')} : selFirst(made);
        return viaMenu('#hier-plus', ['go3d', 'cube'], T('点 +，选 3D 对象 → 立方体', 'Click +, then 3D Object → Cube')); }
      if (!G.near(o.pos, posOf(x))) return selFirst(o) || fix('pos', posOf(x), o.pos);
      if (n !== 'Glass') { const m = matNamed(mn); if (m && G.matOf(o) !== m) return dragMat(o, m); } }
    return null; },
  body:T('地图已经做好了：左边是沙滩，中间是土地，右边是城市。我们要盖房子，先做四种方块：土 <b>Dirt</b>、沙 <b>Sand</b>、砖 <b>Brick</b>、玻璃 <b>Glass</b>。每种都是一个立方体，排在玩家前面的蓝框里。项目窗口的 Materials 文件夹里已经有土、沙、砖的材质，拖上去就好。',
         'The map is ready: beach on the left, field in the middle, city on the right. To build houses we first need four kinds of blocks: <b>Dirt</b>, <b>Sand</b>, <b>Brick</b> and <b>Glass</b>. Each one is a Cube, lined up in the blue boxes in front of the player. The Materials folder in the Project window already has dirt, sand and brick materials — just drag them on.'),
  conds:[[T('四个立方体 Dirt、Sand、Brick、Glass，放进蓝框（Y 都是 0.5，Z 都是 -3.5）', 'Four Cubes named Dirt, Sand, Brick and Glass in the blue boxes (Y 0.5, Z -3.5)'), () => BLOCKS.every(([n, x]) => !!cube(n) && G.near(cube(n).pos, posOf(x)))],
         [T('Dirt 用 Dirt_Mat，Sand 用 Sand_Mat，Brick 用 Brick_Mat（玻璃下一步做）', 'Dirt uses Dirt_Mat, Sand uses Sand_Mat, Brick uses Brick_Mat (glass is next)'), () => BLOCKS.slice(0, 3).every(([n, , mn]) => !!cube(n) && !!G.matOf(cube(n)) && G.matOf(cube(n)).name === mn)]],
  hint:T('做好 Dirt 以后，按 Ctrl+D 复制，改名字、改 X、换材质，比每次从头建快得多。位置都是 .5：方块边长 1，中心在 0.5 上，四条边才会刚好压在网格线上。', 'Once Dirt is done, Ctrl+D duplicates it — rename, change X, swap the material. Much faster than starting over. The positions end in .5: a block is 1 wide, so with its center on .5 its edges sit exactly on the grid lines.'),
  auto:() => { BLOCKS.forEach(([n, x, mn]) => { let o = cube(n); if (!o) { const f = freshCube(); o = f || G.mkObj('cube', n); o.name = n; } o.pos = posOf(x); o.rot = [0, 0, 0];
    if (n !== 'Glass') o.mat = ensureMat(mn, {Dirt_Mat:'#7a5a3c', Sand_Mat:'#e2c88f', Brick_Mat:'#b5523b'}[mn]).id; }); G.select('obj', cube('Dirt').id); }},

 // 2
 {title:T('透明的玻璃', 'See-through glass'), glow:() => ['#p-proj', '#p-insp'],
  enter:() => { G.setView([1, .5, ROW_Z], 6, -25, 20); },
  point:() => { const g = cube('Glass'); if (!g) return null; return seeThroughFlow(g, 'Glass_Mat', isBlue, '#9ad7ff', .35, glassOk); },
  body:T('玻璃要看得穿。新建材质 <b>Glass_Mat</b>，颜色浅蓝（#9ad7ff）。光改颜色还不够：材质默认是「不透明」，要把 <b>表面类型</b>（Surface Type）改成 <b>透明</b>（Transparent），再把透明度 A 调到 0.35。最后拖到 Glass 上。',
         'Glass should be see-through. Create a material named <b>Glass_Mat</b> in light blue (#9ad7ff). Color alone isn’t enough: materials are Opaque by default, so change the <b>Surface Type</b> to <b>Transparent</b>, then set Alpha (A) to 0.35. Finally drag it onto Glass.'),
  conds:[[T('新建材质 Glass_Mat，浅蓝色', 'A new material Glass_Mat in light blue'), () => !!glassMat() && isBlue(glassMat().color)],
         [T('表面类型改成透明，透明度 A 0.35', 'Surface Type Transparent, Alpha 0.35'), () => glassOk(glassMat())],
         [T('Glass_Mat 拖到 Glass 上', 'Drag Glass_Mat onto Glass'), () => !!cube('Glass') && G.matOf(cube('Glass')) === glassMat()]],
  hint:T('A 是透明度：1 = 完全不透明，0 = 完全看不见。只有表面类型是「透明」时，A 才有用。', 'A is alpha: 1 is fully solid, 0 is invisible. It only does anything when the Surface Type is Transparent.'),
  note:T('等一下的「预览方块」（瞄准的地方出现的半透明方块）也是用同样的方法做的。', 'The preview block later on (the see-through block where you aim) is made the same way.'),
  auto:() => { const m = ensureMat('Glass_Mat', '#9ad7ff'); m.surface = 'transparent'; m.alpha = .35; G.S.renaming = null; const g = cube('Glass'); if (g) g.mat = m.id; G.select('asset', m.id); }},

 // 3
 {title:T('标签 Block 和预制件', 'The Block tag and prefabs'), glow:() => ['#p-insp', '#p-proj'],
  point:() => { const first = BLOCKS.map(b => cube(b[0])).find(Boolean); if (!first) return null;
    if (!hasTag()) { if (G.floatOpen() === 'tags') return {at:'#float [data-tg="new"]', label:T('输入 Block，按 Enter', 'Type Block, press Enter')};
      return selFirst(first) || {at:H().field('tag'), label:T('在 Tag 里选 Add Tag…', 'Choose Add Tag… under Tag')}; }
    if (G.floatOpen() === 'tags') return {at:'#fclose', label:G.t('hClose')};
    for (const [n] of BLOCKS) { const o = cube(n); if (o && o.tag !== 'Block' && !prefabOf(n)) return selFirst(o) || {at:H().field('tag'), label:T('在 Tag 里选 Block', 'Choose Block under Tag')}; }
    if (G.S.ptab !== 'project') return {at:'#ptab-project', label:G.t('hBackProject')};
    for (const [n] of BLOCKS) { const o = cube(n), pf = prefabOf(n);
      if (o && !pf) return {from:H().row(o.id), to:'#projgrid', label:T(`把 ${n} 拖进项目窗口`, `Drag ${n} into the Project window`)};
      if (pf && pf.tag !== 'Block') { const a = G.asset(pf.assetId), r = H().reach(a); if (r.nav) return r; return H().isSel(a) ? {at:H().field('ptag'), label:T('在 Tag 里选 Block', 'Choose Block under Tag')} : {at:r.at, label:T(`点选预制件 ${n}`, `Select the ${n} prefab`)}; } }
    return null; },
  body:T('等一下按右键拆方块时，只能拆「方块」，不能把城市里的楼也拆掉。所以给方块贴一个名牌：新的 <b>标签</b> Block。选中 Dirt，在检查器上面的 Tag 里选「Add Tag…」，加一个 Block，再回来把四个方块的 Tag 都选成 Block。最后把四个方块从层级拖进项目窗口，做成 <b>预制件</b>：播放时脚本会用它们复制出新方块。',
         'Later, right-click will remove blocks — but only blocks, not the city buildings. So give the blocks a name badge: a new <b>Tag</b> called Block. Select Dirt, choose “Add Tag…” in the Tag dropdown at the top of the Inspector, add Block, then come back and set all four blocks’ Tag to Block. Finally drag the four blocks from the Hierarchy into the Project window to make <b>Prefabs</b>: during Play the script will copy new blocks from them.'),
  conds:[[T('Tag → Add Tag…，加一个新标签 Block', 'Tag → Add Tag…: add a new tag called Block'), () => hasTag()],
         [T('四个方块的 Tag 都是 Block', 'All four blocks have the Tag Block'), () => BLOCKS.every(([n]) => { const o = cube(n), pf = prefabOf(n); return o ? o.tag === 'Block' : !!pf && pf.tag === 'Block'; })],
         [T('四个方块都拖进项目窗口，变成预制件（预制件的 Tag 也是 Block）', 'All four dragged into the Project window as prefabs (the prefabs’ Tag is Block too)'), () => BLOCKS.every(([n]) => { const pf = prefabOf(n); return !!pf && pf.tag === 'Block'; })]],
  hint:T('先贴标签，再做预制件：这样预制件本身就带着 Block 标签。如果先做了预制件，就在项目窗口点选那个预制件，在它的检查器里改 Tag。', 'Tag first, then make the prefab, so the prefab itself carries the Block tag. If you made the prefab first, select it in the Project window and change its Tag in its Inspector.'),
  note:T('标签名要一字不差：脚本里写 CompareTag("Block")，大小写错了 Unity 会报错。', 'Tag names must match exactly: the script will say CompareTag("Block"), and a wrong capital letter makes Unity report an error.'),
  auto:() => { G.closeFloat(); if (!hasTag()) G.S.tags.push('Block');
    const f = G.S.assets.find(x => x.type === 'folder' && x.name === 'Prefabs' && x.parent === 0) || G.mkAsset('folder', 'Prefabs', 0);
    BLOCKS.forEach(([n]) => { const o = cube(n); if (o) o.tag = 'Block'; if (!prefabOf(n) && o) G.makePrefab(o, f.id); const pf = prefabOf(n); if (pf) pf.tag = 'Block'; }); G.S.ptab = 'project'; G.S.cwd = f.id; }},

 // 4
 {title:T('预览方块', 'The preview block'), glow:() => ['#p-hier', '#p-insp', '#p-proj'],
  enter:() => { G.setView([0, .5, -2], 9, -20, 30); },
  point:() => { let pv = preview();
    if (!pv) { const f = freshCube(); if (f) return nameIt(f, 'Preview'); return viaMenu('#hier-plus', ['go3d', 'cube'], T('点 +，选 3D 对象 → 立方体', 'Click +, then 3D Object → Cube')); }
    const mf = seeThroughFlow(pv, 'Preview_Mat', isLight, '#ffffff', .4, previewOk); if (mf) return mf;
    if (pv.col) return selFirst(pv) || {at:'#insp-body [data-act="rmcomp"][data-c="col"]', label:T('点 ✕ 移除盒碰撞体', 'Click ✕ to remove the Box Collider')};
    return null; },
  body:T('瞄准的时候，要先看到方块会放在哪里：一个半透明的 <b>预览方块</b>。新建一个立方体 <b>Preview</b>，再新建材质 <b>Preview_Mat</b>：白色、表面类型透明、透明度 0.4（和玻璃的做法一样）。最后把它的 <b>盒碰撞体</b>（Box Collider）移除。',
         'Before placing, you need to see where the block will go: a see-through <b>preview block</b>. Create a Cube named <b>Preview</b>, then a material named <b>Preview_Mat</b>: white, Surface Type Transparent, Alpha 0.4 (just like the glass). Finally remove its <b>Box Collider</b>.'),
  conds:[[T('立方体 Preview', 'A Cube named Preview'), () => !!preview()],
         [T('材质 Preview_Mat：白色、透明、透明度 0.4，用在 Preview 上', 'Material Preview_Mat: white, Transparent, Alpha 0.4, on Preview'), () => !!preview() && previewOk(G.matOf(preview()))],
         [T('移除 Preview 的盒碰撞体', 'Remove Preview’s Box Collider'), () => !!preview() && !preview().col]],
  hint:T('盒碰撞体在检查器里，右上角的 ✕ 就是移除组件。', 'The Box Collider is in the Inspector; the ✕ at its top right removes the component.'),
  note:T('为什么要移除碰撞体？射线只打得到有碰撞体的东西：预览有碰撞体的话，射线会打中预览自己，预览就一直往你脸上跑；玩家也会撞到它。', 'Why remove the collider? A ray only hits things with colliders. If the preview had one, the ray would hit the preview itself and it would keep creeping toward your face — and the player would bump into it.'),
  auto:() => { let pv = preview(); if (!pv) { const f = freshCube(); pv = f || G.mkObj('cube', 'Preview', [0, .5, -1]); pv.name = 'Preview'; }
    const m = ensureMat('Preview_Mat', '#ffffff'); m.surface = 'transparent'; m.alpha = .4; G.S.renaming = null; pv.mat = m.id; pv.col = null; G.select('obj', pv.id); }},

 // 5
 {title:T('BuildSystem：瞄准和网格', 'BuildSystem: aiming and the grid'), glow:() => G.S.playing ? ['#playbtn'] : ['#p-proj', '#p-insp'], play:true,
  point:() => { const c = cam(), pv = preview(); if (!c || !pv) return null;
    if (!G.S.playing) { const sf = scriptFlow('BuildSystem', c, 0); if (sf) return sf; const r = refSlot(c, 'BuildSystem', 'preview', pv); if (r) return r; }
    return playStep(G.S.flags.aimed, {at:'#cwrap', label:T('看着地面，慢慢转头', 'Look at the ground and slowly turn')}); },
  body:T('新建脚本 <b>BuildSystem</b>（填 2 个空），挂到 <b>主摄像机</b> 上（它在 Player 下面），把 Preview 拖进 Preview 格子。脚本从准星往前射一条 <b>射线</b>（Raycast），打中的点用 <b>Mathf.Floor</b> 对齐到格子中心，预览方块就一格一格地跟着你的视线跳。点播放试试。',
         'Create a script named <b>BuildSystem</b> (2 blanks), put it on the <b>Main Camera</b> (it’s under Player), and drag Preview into the Preview slot. The script shoots a <b>Raycast</b> out of the crosshair, snaps the hit point to a cell center with <b>Mathf.Floor</b>, and the preview hops from cell to cell following your gaze. Press Play and try it.'),
  conds:[[T('新建脚本 BuildSystem（填 2 个空），挂到主摄像机上', 'Create a script named BuildSystem (2 blanks) and put it on the Main Camera'), () => codeOk('BuildSystem', 0) && !!scriptOn(cam(), 'BuildSystem')],
         [T('把 Preview 拖进 Preview 格子', 'Drag Preview into the Preview slot'), () => refOk(cam(), 'BuildSystem', 'preview', preview())],
         [T('点播放，看着地面：预览一格一格地跟着准星跳', 'Press Play and look at the ground: the preview hops cell by cell with the crosshair'), () => G.S.flags.aimed]],
  hint:T('脚本要挂在主摄像机上，不是 Player 上：射线是从「眼睛」往前射的，抬头低头它也跟着。', 'Put the script on the Main Camera, not on Player: the ray shoots from the “eyes”, so it follows when you look up and down.'),
  note:T('再走到楼旁边，看着楼的侧面：预览会钻进楼里面一半。下一步修好它。', 'Now walk up to a building and look at its side: the preview sinks halfway into the wall. The next step fixes that.'),
  auto:() => { if (G.S.playing) G.stopPlay(); const c = cam(), pv = preview(); if (!c || !pv) return; const s = attach(c, 'BuildSystem', 0); s.vals.preview = pv.id; G.S.flags.aimed = true; }},

 // 6
 {title:T('贴在面的外面', 'Sticking to the outside of a face'), glow:() => G.S.playing ? ['#playbtn'] : ['#p-proj'], play:true, upgrade:{name:'BuildSystem', ver:1},
  point:() => { const c = cam(); if (!c) return null;
    if (!G.S.playing) { const sf = scriptFlow('BuildSystem', c, 1); if (sf) return sf; }
    return playStep(G.S.flags.sideAim, {at:'#cwrap', label:T('走到楼旁边，看着楼的侧面', 'Walk up to a building and look at its side')}); },
  body:T('对着侧面时，射线打中的点刚好在墙面上，对齐以后会落进墙里。打开 BuildSystem，点上面的「加入这一步的新代码」：多出来的一行用 <b>hit.normal</b>，就是打中的那一面朝外的方向。从打中的点往外走半格，预览就一定在墙外面那一格。填空、保存，再到楼旁边看看。',
         'On a side face the hit point lies right on the wall, so after snapping it lands inside. Open BuildSystem and click “Add this step’s code” at the top: the new line uses <b>hit.normal</b>, the direction the hit face points outward. Stepping half a cell outward from the hit point always lands in the cell just outside. Fill the blank, save, and look at a building again.'),
  conds:[[T('打开 BuildSystem，加入这一步的新代码，填好空并保存', 'Open BuildSystem, add this step’s code, fill the blank and save'), () => codeOk('BuildSystem', 1) && (scriptA('BuildSystem').comp.rt.normal === 'normal')],
         [T('点播放，看着楼的侧面：预览贴在墙外面', 'Press Play and look at the side of a building: the preview sits outside the wall'), () => G.S.flags.sideAim]],
  hint:T('新加的那一行左边有一条绿线。真 Unity 里没有这个按钮，你要自己把这一行打进去。', 'The new line has a green bar on its left. Real Unity has no such button — you’d type the line yourself.'),
  note:T('现在对着方块的顶面、侧面，预览都会贴在外面：下一步就可以放方块了。', 'Now the preview sits outside both the top and the sides of a block — ready for placing blocks next.'),
  auto:() => { if (G.S.playing) G.stopPlay(); const c = cam(); if (!c) return; const pv = preview(); const s = attach(c, 'BuildSystem', 1); if (pv) s.vals.preview = pv.id; G.S.flags.sideAim = true; }},

 // 7
 {title:T('左键放方块', 'Left-click to place a block'), glow:() => G.S.playing ? ['#playbtn'] : ['#p-proj', '#p-insp'], play:true, upgrade:{name:'BuildSystem', ver:2},
  point:() => { const c = cam(); if (!c) return null;
    if (!G.S.playing) { const sf = scriptFlow('BuildSystem', c, 2); if (sf) return sf; const r = prefabSlot(c, 'BuildSystem', 'block', prefabAsset('Dirt')); if (r) return r; }
    return playStep((G.S.flags.placed || 0) >= 3, {at:'#cwrap', label:T('看着地面按鼠标左键，放 3 个方块', 'Look at the ground and left-click to place 3 blocks')}); },
  body:T('打开 BuildSystem，点「加入这一步的新代码」：按鼠标 <b>左键</b> 就调用 Place()，它用 <b>Instantiate</b> 照着预制件复制出一个新方块，放在预览的位置。填好 2 个空，保存，再把项目窗口里的 <b>Dirt 预制件</b> 拖进检查器的 Block 格子。点播放，放几个方块，还可以叠高。',
         'Open BuildSystem and click “Add this step’s code”: a <b>left-click</b> calls Place(), which uses <b>Instantiate</b> to make a new copy of the prefab where the preview is. Fill the 2 blanks, save, then drag the <b>Dirt prefab</b> from the Project window into the Block slot in the Inspector. Press Play and place a few blocks — you can stack them too.'),
  conds:[[T('加入这一步的新代码，填好 2 个空并保存', 'Add this step’s code, fill the 2 blanks and save'), () => codeOk('BuildSystem', 2) && bsRt().left === 'Mouse0'],
         [T('把 Dirt 预制件拖进 Block 格子', 'Drag the Dirt prefab into the Block slot'), () => { const s = scriptOn(cam(), 'BuildSystem'), pa = prefabAsset('Dirt'); return !!s && !!pa && s.vals.block === pa.id; }],
         [T('点播放，用左键放 3 个方块', 'Press Play and place 3 blocks with left-click'), () => (G.S.flags.placed || 0) >= 3]],
  hint:T('第一次点画面是让鼠标锁住（用来转头），这一下也会放一个方块，和真 Unity 一样。放出来的方块会出现在层级最下面；停止播放后它们都会消失，这是播放模式，存档在后面做。', 'The first click locks the mouse (for looking around), and that click also places a block — same as real Unity. New blocks appear at the bottom of the Hierarchy; they all vanish when you stop, because it’s Play mode. Saving comes later.'),
  note:T('低头看脚下再按左键试试：方块会放在你站的地方，你会被弹到方块上面（有时会卡住）。第 9 步修好它。', 'Look down at your feet and left-click: the block lands where you stand and pops you up on top of it (sometimes you get stuck). Step 9 fixes that.'),
  auto:() => { if (G.S.playing) G.stopPlay(); const c = cam(); if (!c) return; const s = attach(c, 'BuildSystem', 2); const pv = preview(), pa = prefabAsset('Dirt'); if (pv) s.vals.preview = pv.id; if (pa) s.vals.block = pa.id; G.S.flags.placed = 3; }},

 // 8
 {title:T('右键拆方块', 'Right-click to remove a block'), glow:() => G.S.playing ? ['#playbtn'] : ['#p-proj'], play:true, upgrade:{name:'BuildSystem', ver:3},
  point:() => { const c = cam(); if (!c) return null; const F = G.S.flags;
    if (!G.S.playing) { const sf = scriptFlow('BuildSystem', c, 3); if (sf) return sf; }
    if (!(F.removed >= 1)) return playStep(false, {at:'#cwrap', label:T('看着一个方块按鼠标右键', 'Look at a block and right-click')});
    return playStep(F.removeRefused, {at:'#cwrap', label:T('看着楼或地面按右键：拆不掉', 'Right-click a building or the ground: it won’t go')}); },
  body:T('再加一步代码：按 <b>右键</b> 调用 Remove()。它先用 <b>CompareTag</b> 看打中的东西是不是贴着 Block 标签（第 3 步贴的），是的话才用 <b>Destroy</b> 删掉。填好 2 个空，保存。播放：右键能拆方块，但楼和地面拆不掉。',
         'One more piece of code: a <b>right-click</b> calls Remove(). It first uses <b>CompareTag</b> to check that what we hit wears the Block tag (from step 3), and only then deletes it with <b>Destroy</b>. Fill the 2 blanks and save. Play: right-click removes blocks, but buildings and the ground stay.'),
  conds:[[T('加入这一步的新代码，填好 2 个空并保存', 'Add this step’s code, fill the 2 blanks and save'), () => codeOk('BuildSystem', 3) && bsRt().tag === 'Block'],
         [T('点播放，右键拆掉一个方块', 'Press Play and remove a block with right-click'), () => (G.S.flags.removed || 0) >= 1],
         [T('右键点楼或地面：拆不掉', 'Right-click a building or the ground: it won’t be removed'), () => !!G.S.flags.removeRefused]],
  hint:T('标签名要一字不差：写成 block（小写）的话，控制台会报「Tag: block is not defined」。', 'The tag must match exactly: writing block (lowercase) makes the Console say “Tag: block is not defined”.'),
  note:T('一开始排好的四个方块也贴着 Block，所以也拆得掉。', 'The four blocks you lined up at the start also wear Block, so they can be removed too.'),
  auto:() => { if (G.S.playing) G.stopPlay(); const c = cam(); if (!c) return; attach(c, 'BuildSystem', 3); Object.assign(G.S.flags, {removed:1, removeRefused:true}); }},

 // 9
 {title:T('不能放在自己身上', 'Not inside yourself'), glow:() => G.S.playing ? ['#playbtn'] : ['#p-proj'], play:true, upgrade:{name:'BuildSystem', ver:4},
  point:() => { const c = cam(); if (!c) return null;
    if (!G.S.playing) { const sf = scriptFlow('BuildSystem', c, 4); if (sf) return sf; }
    return playStep(G.S.flags.blockedSelf, {at:'#cwrap', label:T('低头看脚下，按左键：放不下去', 'Look down at your feet and left-click: nothing is placed')}); },
  body:T('现在低头看脚下按左键，方块会放在你站的地方，把你弹到上面或卡住。加最后一行代码：放之前先用 <b>Physics.CheckBox</b> 问「这一格里有没有东西」。你自己（角色控制器）也算东西，所以就放不下去了；已经有方块的格子也一样。',
         'Right now, looking down at your feet and left-clicking puts a block where you stand, popping you up or getting you stuck. Add one last line: before placing, ask <b>Physics.CheckBox</b> “is anything in this cell?”. You (the Character Controller) count, so nothing is placed — same for a cell that already holds a block.'),
  conds:[[T('加入这一步的新代码，填好空并保存', 'Add this step’s code, fill the blank and save'), () => codeOk('BuildSystem', 4)],
         [T('点播放，低头看脚下按左键：放不下去', 'Press Play, look down at your feet and left-click: nothing is placed'), () => !!G.S.flags.blockedSelf]],
  hint:T('Vector3.one * 0.45f 是盒子的「半边长」：整个盒子 0.9 米，比一格小一点，旁边贴着的方块才不会算进去。', 'Vector3.one * 0.45f is the box’s half-size: the whole box is 0.9 m, a bit smaller than a cell, so blocks touching from the side don’t count.'),
  note:T('放和拆都做好了：现在可以盖东西了。下一部分：按 1-4 换方块。', 'Placing and removing both work: you can build now. Next part: switching blocks with 1-4.'),
  auto:() => { if (G.S.playing) G.stopPlay(); const c = cam(); if (!c) return; attach(c, 'BuildSystem', 4); G.S.flags.blockedSelf = true; }},
];



const FINISH = {
 zh:`<div class="finish"><div class="gstep">完成</div><h2>第 3 章前 9 步完成：准备、瞄准、放和拆</h2>
<p>你做好了四种方块（土、沙、砖、玻璃）、透明的玻璃、标签 Block 和预制件；还做了半透明的预览方块，用射线（Raycast）和 Mathf.Floor 让它对齐网格，用 hit.normal 让它贴在面的外面；最后用 Instantiate 放方块、CompareTag 和 Destroy 拆方块、Physics.CheckBox 不让方块放在自己身上。</p>
<div class="note">下一部分：按 1-4 换方块、快捷栏、灰尘和声音、JSON 存档。这部分还在制作中。</div>
<div class="gact"><button class="btn primary" data-act="quiz">小测验</button><button class="btn" data-act="export">导出到真 Unity</button><button class="btn" data-act="reset">再做一遍</button><button class="btn quiet" data-act="home">回到主页</button></div></div>`,
 en:`<div class="finish"><div class="gstep">Done</div><h2>Chapter 3, first 9 steps complete: getting ready, aiming, placing and removing</h2>
<p>You made four kinds of blocks (dirt, sand, brick, glass), see-through glass, a Block tag and prefabs; then a see-through preview block that snaps to the grid with a Raycast and Mathf.Floor, and sits outside faces thanks to hit.normal; finally Instantiate places blocks, CompareTag and Destroy remove them, and Physics.CheckBox keeps blocks out of your own body.</p>
<div class="note">Next part: switching blocks with 1-4, a hotbar, dust and sounds, and JSON saving. It’s still being made.</div>
<div class="gact"><button class="btn primary" data-act="quiz">Quiz</button><button class="btn" data-act="export">Export to real Unity</button><button class="btn" data-act="reset">Do it again</button><button class="btn quiet" data-act="home">Back to home</button></div></div>`};

// 开场地图：海在最下面兜底；沙滩、土地、城市三块地并排（每块 10 × 20 米）；城市里有马路、四栋楼和路灯
function setup() {
  const mat = {sand:ensureMat('Sand_Mat', '#e2c88f'), dirt:ensureMat('Dirt_Mat', '#7a5a3c'), brick:ensureMat('Brick_Mat', '#b5523b'), conc:ensureMat('Concrete_Mat', '#9a9ea6'),
    road:ensureMat('Road_Mat', '#3a3d42'), sea:ensureMat('Sea_Mat', '#2c7fd1'), tower:ensureMat('Tower_Mat', '#6f8fb0'), stucco:ensureMat('Stucco_Mat', '#d9c7a8')};
  const plane = (n, pos, sc, m) => { const o = G.mkObj('plane', n, pos, sc); o.mat = m.id; return o; };
  plane('Sea', [0, -.3, 0], [8, 1, 8], mat.sea); plane('Beach', [-10, 0, 0], [1, 1, 2], mat.sand); plane('Field', [0, 0, 0], [1, 1, 2], mat.dirt);
  plane('City', [10, 0, 0], [1, 1, 2], mat.conc); plane('Road', [10, .01, 0], [.2, 1, 2], mat.road);
  // 楼的边都压在整数上，以后方块可以贴着楼盖
  [[[7.5, 2.5, 5.5], [3, 5, 3], mat.brick], [[13, 3.5, 5], [4, 7, 4], mat.tower], [[7.5, 1.5, -5], [3, 3, 4], mat.stucco], [[13, 2, -5.5], [4, 4, 3], mat.brick]]
    .forEach(([p, s, m]) => { const o = G.mkObj('cube', G.uniqueName('Building', null), p, s); o.mat = m.id; });
  [[-2, 0, 6], [3, 0, 7.5], [-3.5, 0, -1]].forEach(p => makeModel('tree', 'Tree', p)); makeModel('bush', 'Bush', [2.5, 0, 2]);
  [[-11, 0, 4], [-8, 0, -6]].forEach(p => makeModel('rock', 'Rock', p)); [[8.6, 0, 0], [11.4, 0, -2]].forEach(p => makeModel('lamp', 'Lamp Post', p));
  const p = G.mkObj('capsule', 'Player', [0, 1, -7]); p.cc = {seq:Date.now()}; p.tag = 'Player';
  const c = cam(); G.setParent(c, p); c.pos = [0, .6, 0]; c.rot = [0, 0, 0];
  attach(p, 'FirstPersonMove');
  G.closeCode(); G.select(null); G.S.cwd = 0; G.S.tab = 'scene'; G.setView([0, 0, 0], 30, -30, 45);
  Object.keys(G.S.flags).forEach(k => { if (typeof G.S.flags[k] === 'boolean') G.S.flags[k] = false; });
  G.saveScene(); G.S.flags.saved = false; G.S.logs.length = 0;
}

// 找 Bug 挑战：做完前面的步骤，再弄坏 4 个地方
const BUGS = {
 setup:() => {
  setup(); STEPS.forEach(st => { if (st.enter) st.enter(); st.auto(); }); G.closeFloat(); G.select(null);
  Object.keys(G.S.flags).forEach(k => { if (typeof G.S.flags[k] === 'boolean') G.S.flags[k] = false; });
  const m = glassMat(); if (m) m.surface = 'opaque';
  const pf = prefabOf('Glass'); if (pf) pf.tag = 'Untagged'; const g = cube('Glass'); if (g) g.tag = 'Untagged';
  const pv = preview(); if (pv) pv.col = {kind:'box', trigger:false, seq:1};
  const bs = scriptA('BuildSystem'); if (bs) { bs.blanks.tag = 'block'; G.compileScript(bs); }
  G.S.cwd = 0; G.saveScene(); },
 list:[
  {title:T('玻璃一点都不透明', 'The glass isn’t see-through at all'),
   hint:T('选中 Glass_Mat。透明度 A 已经是 0.35 了，为什么没用？看看表面类型。', 'Select Glass_Mat. Alpha is already 0.35 — so why doesn’t it work? Check the Surface Type.'),
   check:() => glassOk(glassMat())},
  {title:T('玻璃预制件没有 Block 标签（以后拆不掉）', 'The Glass prefab has no Block tag (it couldn’t be removed later)'),
   hint:T('在项目窗口点选 Glass 预制件，看检查器最上面的 Tag。', 'Select the Glass prefab in the Project window and look at the Tag at the top of the Inspector.'),
   check:() => { const pf = prefabOf('Glass'); return !!pf && pf.tag === 'Block'; }},
  {title:T('播放时预览方块一直往你脸上跑，还一闪一闪的', 'In Play the preview block keeps creeping toward your face and flickering'),
   hint:T('射线打中了谁？看游戏视图下面的「射线打中」。选中 Preview，看它有没有不该有的组件。', 'What is the ray hitting? Check “Ray hits” at the bottom of the Game view. Select Preview and look for a component it shouldn’t have.'),
   check:() => !!preview() && !preview().col},
  {title:T('右键拆不掉方块，控制台还有红字', 'Right-click doesn’t remove blocks, and the Console shows a red error'),
   hint:T('播放后右键点一个方块，看控制台的红字说哪个标签不存在。打开 BuildSystem，看 CompareTag 里写的标签名，大小写对吗？', 'Play, right-click a block, and read the red error: which tag doesn’t exist? Open BuildSystem and check the tag name in CompareTag — are the capitals right?'),
   check:() => { const a = scriptA('BuildSystem'); return !!a && !!a.comp && a.comp.ok && a.comp.rt.tag === 'Block'; }}]};

const QUIZ = [
 {q:T('Glass_Mat 的透明度 A 是 0.35，可是玻璃还是不透明。最可能是什么原因？', 'Glass_Mat has Alpha 0.35, but the glass is still solid. What’s the most likely reason?'),
  o:[T('颜色选错了', 'The wrong color'), T('表面类型还是「不透明」（Opaque）', 'The Surface Type is still Opaque'), T('方块太大', 'The block is too big'), T('没有保存场景', 'The scene isn’t saved')], a:1,
  w:T('只有表面类型是「透明」（Transparent）时，A 才有用。', 'Alpha only matters when the Surface Type is Transparent.')},
 {q:T('为什么要给方块加 Block 标签？', 'Why give the blocks a Block tag?'),
  o:[T('让方块变好看', 'To make them look nicer'), T('让脚本分得出「这是方块」，只拆方块、不拆楼', 'So scripts can tell “this is a block” and remove only blocks, not buildings'), T('让方块会掉下来', 'So they fall'), T('Unity 规定每个物体都要有', 'Unity requires every object to have one')], a:1,
  w:T('脚本会用 CompareTag("Block") 检查打中的是不是方块。', 'The script will use CompareTag("Block") to check whether it hit a block.')},
 {q:T('方块边长 1。为什么位置都写成 0.5、1.5、-3.5 这种数？', 'A block is 1 wide. Why are the positions numbers like 0.5, 1.5 and -3.5?'),
  o:[T('随便写的', 'No reason'), T('中心在 .5 上，方块的边才会刚好压在网格线上', 'With the center on .5, the block’s edges land exactly on the grid lines'), T('这样方块会发光', 'So the block glows'), T('Unity 只认小数', 'Unity only accepts decimals')], a:1,
  w:T('中心 0.5、边长 1，就是从 0 到 1：刚好占满一格。', 'Center 0.5, width 1 means from 0 to 1 — exactly one grid cell.')},
 {q:T('Mathf.Floor(2.7) + 0.5f 等于多少？', 'What is Mathf.Floor(2.7) + 0.5f?'),
  o:[T('3.5', '3.5'), T('2.5', '2.5'), T('3.2', '3.2'), T('2.7', '2.7')], a:1,
  w:T('Floor 往下取整：2.7 → 2，加 0.5 就是 2.5，那一格的中心。', 'Floor rounds down: 2.7 → 2, plus 0.5 is 2.5, the center of that cell.')},
 {q:T('为什么要写 hit.point + hit.normal * 0.5f？', 'Why write hit.point + hit.normal * 0.5f?'),
  o:[T('让射线射得更远', 'To make the ray go farther'), T('从打中的面往外走半格，预览才不会钻进墙里', 'Step half a cell out from the hit face so the preview doesn’t sink into the wall'), T('让方块变大', 'To make the block bigger'), T('让预览变透明', 'To make the preview see-through')], a:1,
  w:T('normal 是那一面朝外的方向：顶面朝上，侧面朝左右前后。', 'normal is the direction the face points: up for the top, sideways for the sides.')},
 {q:T('预览方块为什么要移除碰撞体？', 'Why remove the preview block’s collider?'),
  o:[T('让它变透明', 'To make it see-through'), T('不然射线会打中预览自己，它会一直往你脸上跑', 'Otherwise the ray hits the preview itself and it creeps toward your face'), T('让它掉下去', 'So it falls'), T('省电', 'To save power')], a:1,
  w:T('射线只打得到有碰撞体的东西；预览只是给你看的，不需要碰撞。', 'Rays only hit colliders; the preview is just for show and needs no collisions.')},
 {q:T('Instantiate(block, target, Quaternion.identity) 做了什么？', 'What does Instantiate(block, target, Quaternion.identity) do?'),
  o:[T('删掉 block', 'Deletes block'), T('照着预制件 block 复制一个新物体，放在 target', 'Makes a new copy of the block prefab at target'), T('把 block 变透明', 'Makes block see-through'), T('存档', 'Saves the game')], a:1,
  w:T('Quaternion.identity 是「不旋转」。播放时复制出来的物体，停止后会消失。', 'Quaternion.identity means “no rotation”. Copies made during Play vanish when you stop.')},
 {q:T('Physics.CheckBox 在放方块之前问的是什么？', 'What does Physics.CheckBox ask before a block is placed?'),
  o:[T('这一格里有没有碰撞体（例如你自己）', 'Is any collider in this cell (like you)?'), T('鼠标有没有按下', 'Is the mouse pressed?'), T('方块是什么颜色', 'What color is the block?'), T('标签对不对', 'Is the tag right?')], a:0,
  w:T('有东西就不放：不会把方块放进自己身体里，也不会两个方块叠在同一格。', 'If something is there, nothing is placed: no blocks inside your body, and never two blocks in one cell.')}];

const EXPORT_INTRO = {
 zh:'# 在真 Unity 里做「沙盒游戏」的准备\n\n1. 用 Unity Hub 安装 Unity 6.3 LTS，新建项目，模板选 **Universal 3D**。\n2. 把这个压缩包里的 `Assets/Scripts` 文件夹拖进 Unity 的项目窗口。\n3. 透明材质：选中材质，在 Surface Options 里把 Surface Type 改成 Transparent，再点 Base Map 的颜色，把 A 调低。\n4. 新标签：选中物体，检查器最上面 Tag → Add Tag…，在 Tags 下面点 +。\n5. 照下面的清单，一个一个建出物体、材质和设置。\n',
 en:'# Get ready for the sandbox game in real Unity\n\n1. Install Unity 6.3 LTS with Unity Hub and create a project with the **Universal 3D** template.\n2. Drag the `Assets/Scripts` folder from this zip into Unity’s Project window.\n3. Transparent material: select the material, set Surface Options → Surface Type to Transparent, then click the Base Map color and lower A.\n4. A new tag: select an object, choose Tag → Add Tag… at the top of the Inspector, and click + under Tags.\n5. Follow the list below to create each object, material and setting.\n'};

G.chapters = G.chapters || {};
G.chapters.ch3 = {title:T('沙盒游戏', 'Sandbox Game'), scriptVer:{BuildSystem:0}, steps:STEPS, finish:FINISH, setup, bugs:BUGS, quiz:QUIZ, exportIntro:EXPORT_INTRO};
})();
