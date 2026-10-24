// 第 1 章：恐怖游戏 —— 黑暗的 L 形走廊、手电筒、闪烁的灯、脚步声、会升起来的门、追你的怪物。
// 写法和 ch0.js 一样：文字写成 {zh, en}；conds 判断是否做完；auto 是「帮我做这一步」（从任何中间状态都能做完）；
// point 返回箭头 / 拖动提示；ghosts 返回场景里要画的蓝图框。
// 场景布局（单位：米）：地板中心 (6, 0, -2)；第一段走廊沿 Z 往北，第二段沿 X 往东，出口在 x = 14。
(() => {
'use strict';
const G = window.ZTG;
const H = () => G.hint;
const T = (zh, en) => ({zh, en});
const setTo = v => T(`改成 ${v}，按 Enter`, `Set to ${v}, press Enter`);
const fix = (k, want, cur) => {
  const i = want.findIndex((v, j) => Math.abs(cur[j] - v) >= .001);
  return i < 0 ? null : {at:H().field(k + '.' + i), label:setTo(want[i])};
};
const fixNum = (bind, want, cur) => Math.abs(cur - want) < .001 ? null : {at:H().field(bind), label:setTo(want)};
const viaMenu = (plus, keys, label) => [...keys.slice().reverse().map(k => ({at:H().mi(k), label})), {at:plus, label}];
const selFirst = o => H().isSel(o) ? null : {at:H().row(o.id), label:G.t('hSelect')};
const byName = n => G.S.objs.find(o => o.name.trim().toLowerCase() === n.toLowerCase());
const cam = () => G.S.objs.find(o => o.type === 'camera');
const P = () => G.P(), FLR = () => G.FL();
const scriptA = n => G.S.assets.find(a => a.type === 'script' && a.name === n);
const scriptOn = (o, n) => o ? o.scripts.find(s => (G.asset(s.asset) || {}).name === n) : null;
const near1 = (a, b) => Math.abs(a - b) < .001;
const isChildOf = (o, p) => { let q = o && o.parent != null ? G.S.objs.find(x => x.id === o.parent) : null; while (q) { if (q === p) return true; q = q.parent != null ? G.S.objs.find(x => x.id === q.parent) : null; } return false; };
const hex = c => { const n = parseInt(String(c).slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };
const lum = c => { const [r, g, b] = hex(c); return .2126 * r + .7152 * g + .0722 * b; };
const isWarm = c => { const [r, g, b] = hex(c); return r >= .9 && g >= .45 && b <= .66; };
const isRedish = c => { const [r, g, b] = hex(c); return r >= .6 && g <= .45 && b <= .45; };
const playStep = (doneFlag, during, stopLab) => {
  if (!G.S.playing) return doneFlag ? null : {at:'#playbtn', label:T('点播放', 'Click Play')};
  return doneFlag ? {at:'#playbtn', label:stopLab || T('点一下停止', 'Click to stop')} : during;
};

// ---------- 走廊的墙：第 1 面自己做，其余 4 面复制后放进蓝框 ----------
const WALLS = [
  {pos:[-2, 1.5, -2], rot:[0, 0, 0], scl:[.5, 3, 16]},
  {pos:[6, 1.5, 6], rot:[0, 90, 0], scl:[.5, 3, 16]},
  {pos:[2, 1.5, -4], rot:[0, 0, 0], scl:[.5, 3, 12]},
  {pos:[8, 1.5, 2], rot:[0, 90, 0], scl:[.5, 3, 12]},
  {pos:[0, 1.5, -10], rot:[0, 90, 0], scl:[.5, 3, 4]}];
const BOX = [[-.5, -.5, -.5], [.5, .5, .5]];
const wallBox = w => { const h = w.rot[1] ? [w.scl[2] / 2, w.scl[1] / 2, w.scl[0] / 2] : w.scl.map(v => v / 2); return [w.pos.map((v, i) => v - h[i]), w.pos.map((v, i) => v + h[i])]; };
const isWall = o => o.type === 'cube' && /^wall/i.test(o.name.trim());
const fits = (o, w) => { const a = G.wAABB(o, BOX), b = wallBox(w); return [0, 1].every(k => a[k].every((v, i) => Math.abs(v - b[k][i]) < .15)); };
// 每个蓝框配一面墙（一面墙只算一次）
function wallFit() {
  const used = new Set(), res = [];
  for (const w of WALLS) { const o = G.S.objs.find(q => isWall(q) && !used.has(q.id) && fits(q, w)); if (o) used.add(o.id); res.push(o || null); }
  return {res, spare:G.S.objs.filter(q => isWall(q) && !used.has(q.id))};
}
const BOXNO = ['', '①', '②', '③', '④'];
function makeWall(i, base) {
  const w = WALLS[i], o = G.mkObj('cube', G.uniqueName('Wall', null), w.pos.slice(), w.scl.slice());
  o.rot = w.rot.slice(); if (base) o.mat = base.mat; return o;
}

// ---------- 写脚本的通用提示：新建 → 改名 → 填空、保存 → 拖到物体上 ----------
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
  if (tm.blanks.length && !(s.comp && s.comp.ok)) return {at:r.at, label:T('双击打开代码，把空填好', 'Double-click to open the code and fill the blanks')};
  if (host && !scriptOn(host, name)) return {from:r.at, to:h.row(host.id), label:T(`拖到 ${host.name} 上`, `Drag onto ${host.name}`)};
  return null;
}
function ensureScript(name) {
  let a = scriptA(name);
  if (!a) { const f = G.S.assets.find(x => x.type === 'folder' && x.name === 'Scripts' && x.parent === 0) || G.mkAsset('folder', 'Scripts', 0); a = G.mkAsset('script', name, f.id); }
  G.closeCode(); a.blanks = Object.assign({}, G.lib()[name].answers); G.compileScript(a); return a;
}
const attach = (o, name) => { const a = ensureScript(name); let s = scriptOn(o, name); if (!s) { G.addScript(o, a); s = scriptOn(o, name); } return s; };
// 把层级里的物体拖进脚本的格子（Transform / UI 文本）
function refSlot(host, name, fid, target) {
  const s = scriptOn(host, name); if (!s || s.vals[fid] === target.id) return null;
  return selFirst(host) || {from:H().row(target.id), to:`#insp-body [data-drop="ref:${host.id}:${host.scripts.indexOf(s)}:${fid}"]`, label:T(`把 ${target.name} 拖进 ${fid} 格子`, `Drag ${target.name} into the ${fid} slot`)};
}
const refOk = (host, name, fid, target) => { const s = scriptOn(host, name); return !!s && !!target && s.vals[fid] === target.id; };
const compMenu = (cat, item, lab) => [{at:H().mi(item), label:lab}, {at:H().mi(cat), label:lab}, {at:'#addcomp', label:lab}];
const audioDef = () => ({clip:null, volume:1, loop:false, awake:true, blend:0, minDist:1, maxDist:500, seq:Date.now()});
const clipA = n => G.S.assets.find(a => a.type === 'audio' && a.name === n);
function nameIt(o, want) {
  if (o.name === want) return null;
  return selFirst(o) || {at:H().field('name'), label:T(`改成 ${want}，按 Enter`, `Type ${want}, press Enter`)};
}
const lightOf = kind => G.S.objs.filter(o => o.type === 'light' && o.light && o.light.kind === kind);
const sceneLink = '#tab-scene';
const toScene = () => G.S.tab !== 'scene' ? {at:sceneLink, label:G.t('hToScene')} : null;
const winMenu = keys => viaMenu('.mbtn[data-menu="window"]', keys, T('窗口 → 渲染 → 灯光', 'Window → Rendering → Lighting'));
const lightingOpen = () => G.floatOpen() === 'lighting';
const flash = () => byName('Flashlight');
const lamp = () => byName('Lamp');
const amb = () => byName('Ambience');
const door = () => byName('Door');
const dtrig = () => byName('DoorTrigger');
const monster = () => byName('Monster');
const exitZ = () => byName('Exit');
const msgT = () => G.S.objs.find(o => o.type === 'uitext' && o.name === 'Message');
const vol = () => G.S.objs.find(o => o.vol);
const isTriggerBox = (o, pos, scl) => !!o && o.type === 'empty' && G.near(o.pos, pos) && G.near(G.effScale(o), scl) && !!o.col && o.col.kind === 'box' && o.col.trigger;
const wallMat = () => { const ws = G.S.objs.filter(isWall); const m = ws.length ? G.matOf(ws[0]) : null; return m; };
const darkWalls = () => G.S.objs.filter(o => isWall(o) && G.matOf(o) && lum(G.matOf(o).color) < .35).length;

const STEPS = [
 // 1
 {title:T('用方块做一面墙', 'Build one wall'), glow:() => ['#p-hier', '#p-insp'],
  enter:() => { G.S.tab = 'scene'; },
  ghosts:() => { const f = wallFit(); return [{min:wallBox(WALLS[0])[0], max:wallBox(WALLS[0])[1], done:!!f.res[0], label:T('第一面墙', 'First wall')[G.lang()]}]; },
  point:() => { const w = byName('Wall') || G.S.objs.find(o => o.type === 'cube');
    if (!w) return viaMenu('#hier-plus', ['go3d', 'cube'], T('点 +，选 3D 对象 → 立方体', 'Click +, then 3D Object → Cube'));
    return nameIt(w, 'Wall') || selFirst(w) || fix('scl', WALLS[0].scl, G.effScale(w)) || fix('pos', WALLS[0].pos, w.pos) || fix('rot', [0, 0, 0], w.rot); },
  body:T('走廊由墙围成。先做第一面：新建一个 <b>立方体</b>，改名 Wall，再在检查器里把它拉长、放好。场景里的蓝色虚线框就是它要去的位置。',
         'A corridor is made of walls. Build the first one: create a <b>Cube</b>, name it Wall, then stretch it and place it in the Inspector. The dashed blue box in the Scene shows where it goes.'),
  conds:[[T('新建立方体，改名 Wall', 'Create a Cube named Wall'), () => { const w = byName('Wall'); return !!w && w.type === 'cube'; }],
         [T('缩放改成 0.5、3、16（薄、高 3 米、长 16 米）', 'Set Scale to 0.5, 3, 16 (thin, 3 m tall, 16 m long)'), () => { const w = byName('Wall'); return !!w && G.near(G.effScale(w), WALLS[0].scl); }],
         [T('位置改成 -2、1.5、-2', 'Set Position to -2, 1.5, -2'), () => { const w = byName('Wall'); return !!w && G.near(w.pos, WALLS[0].pos) && G.near(w.rot, [0, 0, 0]); }]],
  hint:T('Y 是 1.5，因为墙高 3 米，中心在一半的地方，这样墙刚好站在地板上。', 'Y is 1.5 because the wall is 3 m tall and its center is halfway up, so it stands right on the floor.'),
  auto:() => { let w = byName('Wall') || G.S.objs.find(o => o.type === 'cube') || G.mkObj('cube', 'Wall'); w.name = 'Wall'; w.pos = WALLS[0].pos.slice(); w.rot = [0, 0, 0]; w.scale = WALLS[0].scl.slice(); w.scaleOverride = false; G.select('obj', w.id); }},

 // 2
 {title:T('复制出其他墙', 'Duplicate the other walls'), glow:() => ['#p-hier', '#p-insp'],
  ghosts:() => { const f = wallFit(); return WALLS.map((w, i) => ({min:wallBox(w)[0], max:wallBox(w)[1], done:!!f.res[i], label:BOXNO[i] || ''})); },
  point:() => { const f = wallFit(), i = f.res.findIndex((x, k) => k > 0 && !x); if (i < 0) return null;
    const sc = toScene(); if (sc) return sc;
    const sp = f.spare.find(o => H().isSel(o)) || f.spare[0];
    if (!sp) { const any = G.S.objs.find(isWall); if (!any) return null;
      return H().isSel(any) ? {at:H().row(any.id), label:T('按 Ctrl+D（Mac：Cmd+D）复制', 'Press Ctrl+D (Mac: Cmd+D) to duplicate')} : {at:H().row(any.id), label:T('先选中一面墙', 'Select a wall first')}; }
    const w = WALLS[i];
    return selFirst(sp) || fix('rot', w.rot, sp.rot) || fix('scl', w.scl, G.effScale(sp)) || fix('pos', w.pos, sp.pos); },
  body:T('选中 Wall，按 <b>Ctrl+D</b>（Mac 是 Cmd+D）复制一份，再把复制出来的墙放进蓝框。旋转 Y 改成 90，墙就会横过来。拖动箭头时按住 <b>Ctrl</b>（Mac 是 Cmd），会一格一格地移动，比较好对齐。',
         'Select Wall, press <b>Ctrl+D</b> (Cmd+D on Mac) to duplicate it, then move the copy into a blue box. Set Rotation Y to 90 to turn a wall sideways. Hold <b>Ctrl</b> (Cmd on Mac) while dragging an arrow to move in steps, which makes lining up easier.'),
  conds:[[T('蓝框 ①：位置 6、1.5、6，旋转 Y 90', 'Box ①: Position 6, 1.5, 6, Rotation Y 90'), () => !!wallFit().res[1]],
         [T('蓝框 ②：位置 2、1.5、-4，缩放 Z 12', 'Box ②: Position 2, 1.5, -4, Scale Z 12'), () => !!wallFit().res[2]],
         [T('蓝框 ③：位置 8、1.5、2，旋转 Y 90，缩放 Z 12', 'Box ③: Position 8, 1.5, 2, Rotation Y 90, Scale Z 12'), () => !!wallFit().res[3]],
         [T('蓝框 ④：位置 0、1.5、-10，旋转 Y 90，缩放 Z 4', 'Box ④: Position 0, 1.5, -10, Rotation Y 90, Scale Z 4'), () => !!wallFit().res[4]]],
  hint:T('复制出来的墙叫 Wall (1)、Wall (2)……它和原来的墙叠在同一个位置，所以看起来像没变。直接在检查器里改数字最准。', 'Copies are called Wall (1), Wall (2)… They sit exactly on top of the original, so it looks like nothing happened. Typing numbers in the Inspector is the most precise.'),
  note:T('一条 L 形走廊做好了。出口在东边尽头（蓝框 ① 和 ③ 之间的开口），后面会在那里放一扇门。', 'Your L-shaped corridor is done. The exit is the opening at the east end, between boxes ① and ③. A door goes there later.'),
  auto:() => { const base = byName('Wall'); const f = wallFit(); f.res.forEach((x, i) => { if (!x) { const sp = wallFit().spare[0]; if (sp) { const w = WALLS[i]; sp.pos = w.pos.slice(); sp.rot = w.rot.slice(); sp.scale = w.scl.slice(); sp.scaleOverride = false; } else makeWall(i, base); } }); }},

 // 3
 {title:T('做玩家：胶囊 + 角色控制器', 'Make the player: capsule + Character Controller'), glow:() => ['#p-hier', '#p-insp'],
  point:() => { const p = P() || G.S.objs.find(o => o.type === 'capsule');
    if (!p) return viaMenu('#hier-plus', ['go3d', 'capsule'], T('点 +，选 3D 对象 → 胶囊', 'Click +, then 3D Object → Capsule'));
    return nameIt(p, 'Player') || selFirst(p) || fix('pos', [0, 1, -6], p.pos) || (!p.cc && compMenu('physics', 'cc', T('添加组件 → 物理 → 角色控制器', 'Add Component → Physics → Character Controller'))); },
  body:T('第一人称游戏里，玩家通常是一个看不见的 <b>胶囊</b>。给它加一个 <b>角色控制器（Character Controller）</b>：走路时会被墙挡住，也会受重力。',
         'In a first-person game the player is usually an invisible <b>Capsule</b>. Give it a <b>Character Controller</b>: it stops at walls and falls with gravity.'),
  conds:[[T('新建胶囊，改名 Player', 'Create a Capsule named Player'), () => !!P() && P().type === 'capsule'],
         [T('位置改成 0、1、-6（走廊南边）', 'Set Position to 0, 1, -6 (the south end)'), () => !!P() && G.near(P().pos, [0, 1, -6])],
         [T('添加组件 → 物理 → 角色控制器', 'Add Component → Physics → Character Controller'), () => !!P() && !!P().cc]],
  hint:T('胶囊高 2 米，中心在 1 米高的地方，所以 Y 是 1。', 'A Capsule is 2 m tall with its center 1 m up, so Y is 1.'),
  note:T('角色控制器本身就是一个胶囊形状的碰撞体。原来的胶囊碰撞体留着也行，很多人会点 ✕ 把它删掉。', 'The Character Controller is itself a capsule-shaped collider. You can keep the old Capsule Collider, but many people remove it with ✕.'),
  auto:() => { let p = P() || G.S.objs.find(o => o.type === 'capsule') || G.mkObj('capsule', 'Player'); p.name = 'Player'; p.pos = [0, 1, -6]; if (!p.cc) p.cc = {seq:Date.now()}; G.select('obj', p.id); }},

 // 4
 {title:T('把摄像机变成眼睛', 'Turn the camera into eyes'), glow:() => ['#p-hier', '#p-insp'],
  point:() => { const c = cam(), p = P(); if (!c || !p) return null;
    if (c.parent !== p.id) return {from:H().row(c.id), to:H().row(p.id), label:T('把主摄像机拖到 Player 上', 'Drag Main Camera onto Player')};
    return selFirst(c) || fix('pos', [0, .6, 0], c.pos) || fix('rot', [0, 0, 0], c.rot); },
  body:T('在层级里把 <b>主摄像机</b> 拖到 Player 上，它就变成 Player 的 <b>子物体</b>：玩家走到哪，摄像机跟到哪。',
         'In the Hierarchy, drag the <b>Main Camera</b> onto Player. It becomes a <b>child</b> of Player: wherever the player goes, the camera follows.'),
  conds:[[T('主摄像机是 Player 的子物体（缩进在 Player 下面）', 'Main Camera is a child of Player (indented under it)'), () => !!cam() && !!P() && cam().parent === P().id],
         [T('摄像机位置改成 0、0.6、0', 'Set the camera Position to 0, 0.6, 0'), () => !!cam() && !!P() && cam().parent === P().id && G.near(cam().pos, [0, .6, 0])],
         [T('摄像机旋转改成 0、0、0', 'Set the camera Rotation to 0, 0, 0'), () => !!cam() && G.near(cam().rot, [0, 0, 0])]],
  hint:T('拖过去之后，摄像机的位置数字会变：子物体的位置是「相对父物体」的。', 'After you drag it, the camera’s numbers change: a child’s position is relative to its parent.'),
  note:T('0.6 表示在玩家中心上面 0.6 米，也就是离地 1.6 米，差不多是眼睛的高度。', '0.6 means 0.6 m above the player’s center — 1.6 m off the ground, about eye height.'),
  auto:() => { const c = cam(), p = P(); if (!c || !p) return; if (c.parent !== p.id) G.setParent(c, p); c.pos = [0, .6, 0]; c.rot = [0, 0, 0]; G.select('obj', c.id); }},

 // 5
 {title:T('第一人称走路（填空）', 'Walk in first person (fill in the blanks)'), glow:() => G.S.playing || (scriptOn(P(), 'FirstPersonMove')) ? ['#playbtn'] : ['#p-proj'], play:true,
  point:() => { const F = G.S.flags, p = P(); if (!p) return null;
    if (!scriptOn(p, 'FirstPersonMove')) { if (G.S.playing) return {at:'#playbtn', label:G.t('hStopFirst')}; return scriptFlow('FirstPersonMove', p); }
    return playStep(F.hitWall, {at:'#cwrap', label:T('按住 W 一直往前走，走到墙边', 'Hold W and walk until you reach a wall')}); },
  body:T('新建脚本 <b>FirstPersonMove</b>，打开它，填好 3 个空，再拖到 Player 上。然后点播放：<b>W A S D</b> 走路，在游戏画面里点一下（或按住拖动）用鼠标转头。走到墙边，你会被挡住。',
         'Create a script named <b>FirstPersonMove</b>, open it, fill in the 3 blanks, then drag it onto Player. Press Play: <b>W A S D</b> to walk, click the Game view (or drag in it) to look around with the mouse. Walk into a wall and it stops you.'),
  conds:[[T('新建脚本 FirstPersonMove', 'Create a script named FirstPersonMove'), () => !!scriptA('FirstPersonMove')],
         [T('填好 3 个空，保存，控制台没有红字', 'Fill in the 3 blanks, save, no red errors'), () => { const a = scriptA('FirstPersonMove'); return !!a && !!a.comp && a.comp.ok; }],
         [T('把脚本拖到 Player 上', 'Drag the script onto Player'), () => !!scriptOn(P(), 'FirstPersonMove')],
         [T('点播放，走到墙边被挡住', 'Press Play and walk into a wall'), () => G.S.flags.hitWall],
         [T('再点一次播放停止', 'Press Play again to stop'), () => G.S.flags.fpsStopped]],
  hint:T('鼠标锁在画面里时，按 Esc 放开。画面现在还很亮，下一步就关灯。', 'When the mouse is locked to the view, press Esc to free it. It’s still bright in here — next step turns the lights off.'),
  note:T('角色控制器的 SimpleMove 会自己处理「撞墙」和「重力」。第 0 章的 transform.Translate 做不到，会直接穿墙。', 'The Character Controller’s SimpleMove handles walls and gravity for you. Chapter 0’s transform.Translate can’t — it walks straight through walls.'),
  auto:() => { if (G.S.playing) G.stopPlay(); const p = P(); if (p) attach(p, 'FirstPersonMove'); Object.assign(G.S.flags, {hitWall:true, fpsStopped:true}); }},

 // 6
 {title:T('关灯：让场景变黑', 'Lights out: make it dark'), glow:() => ['.mbtn[data-menu="window"]', '#p-hier'],
  point:() => { const e = G.S.env;
    if (e.skybox || e.src !== 'color' || lum(e.amb) > .05) {
      if (!lightingOpen()) return winMenu(['lighting', 'rendering']);
      if (e.skybox) return {at:'#float [data-env="skybox"]', label:T('选 None', 'Choose None')};
      if (e.src !== 'color') return {at:'#float [data-env="src"]', label:T('选 颜色', 'Choose Color')};
      return {at:'#float [data-envc="amb"][data-c="#000000"]', label:T('点黑色', 'Click black')}; }
    const d = lightOf('directional')[0]; if (d) return H().isSel(d) ? {at:H().row(d.id), label:T('按 Delete 删除', 'Press Delete')} : {at:H().row(d.id), label:T('点选方向光', 'Select the Directional Light')};
    return null; },
  body:T('恐怖游戏要先够黑。打开菜单 <b>窗口 → 渲染 → 灯光</b>（Window → Rendering → Lighting），把天空和 <b>环境光</b> 关掉；再把「太阳」（方向光）删掉。',
         'Horror needs darkness first. Open <b>Window → Rendering → Lighting</b>, turn off the sky and the <b>ambient light</b>, then delete the “sun” (the Directional Light).'),
  conds:[[T('天空盒材质改成 None', 'Set Skybox Material to None'), () => !G.S.env.skybox],
         [T('环境光来源改成「颜色」，环境光颜色选黑色', 'Set Environment Lighting Source to Color, and Ambient Color to black'), () => G.S.env.src === 'color' && lum(G.S.env.amb) <= .05],
         [T('在层级里删掉方向光', 'Delete the Directional Light in the Hierarchy'), () => !lightOf('directional').length]],
  hint:T('环境光是从四面八方来的柔和的光。它不关掉，阴影里永远不会全黑。', 'Ambient light is soft light from every direction. Leave it on and shadows are never truly dark.'),
  note:T('游戏画面现在全黑了，这是对的。场景窗口太暗不好编辑的话，点场景右上角的「灯光」按钮，用明亮的灯光编辑（不影响游戏画面）。', 'The Game view is pitch black now — that’s right. If the Scene is too dark to edit, click the Lighting button at the top right of the Scene to edit with bright lights (the Game view isn’t affected).'),
  auto:() => { Object.assign(G.S.env, {skybox:false, src:'color', amb:'#000000'}); G.S.objs = G.S.objs.filter(o => !(o.type === 'light' && o.light && o.light.kind === 'directional')); G.closeFloat(); G.select(null); }},

 // 7
 {title:T('手电筒：聚光灯', 'A flashlight: Spot Light'), glow:() => ['#p-hier', '#p-insp'],
  point:() => { const c = cam(); let f = flash() || lightOf('spot')[0];
    if (!f) return viaMenu('#hier-plus', ['lightm', 'spotlight'], T('点 +，选 灯光 → 聚光灯', 'Click +, then Light → Spotlight'));
    const n = nameIt(f, 'Flashlight'); if (n) return n;
    if (c && f.parent !== c.id) return {from:H().row(f.id), to:H().row(c.id), label:T('拖到主摄像机上', 'Drag onto Main Camera')};
    return selFirst(f) || fix('pos', [.3, -.2, 0], f.pos) || fix('rot', [0, 0, 0], f.rot) || fixNum('lrange', 15, f.light.range) || fixNum('langle', 50, f.light.angle) || fixNum('lint', 3, f.light.intensity); },
  body:T('新建一个 <b>聚光灯（Spot Light）</b>，改名 Flashlight，拖到 <b>主摄像机</b> 上当子物体。这样你转头，手电筒也跟着转。',
         'Create a <b>Spot Light</b>, name it Flashlight, and drag it onto the <b>Main Camera</b> as a child. Now when you turn your head, the flashlight turns too.'),
  conds:[[T('新建聚光灯，改名 Flashlight', 'Create a Spot Light named Flashlight'), () => !!flash() && flash().type === 'light' && flash().light.kind === 'spot'],
         [T('拖到主摄像机下面，变成子物体', 'Drag it under Main Camera as a child'), () => !!flash() && !!cam() && flash().parent === cam().id],
         [T('位置 0.3、-0.2、0（在右手边），旋转 0、0、0（朝前）', 'Position 0.3, -0.2, 0 (in your right hand), Rotation 0, 0, 0 (facing forward)'), () => !!flash() && G.near(flash().pos, [.3, -.2, 0]) && G.near(flash().rot, [0, 0, 0])],
         [T('范围 15、外部聚光角 50、强度 3', 'Range 15, Outer Spot Angle 50, Intensity 3'), () => { const f = flash(); return !!f && !!f.light && near1(f.light.range, 15) && near1(f.light.angle, 50) && near1(f.light.intensity, 3); }]],
  hint:T('范围是光能照多远（米），外部聚光角是光圈有多宽（度）。在场景里选中它，会看到黄色的光锥。', 'Range is how far the light reaches (meters); Outer Spot Angle is how wide the beam is (degrees). Select it in the Scene to see the yellow cone.'),
  note:T('点播放试试：转头时手电筒跟着转，光照到哪里才看得见哪里。', 'Press Play and try it: the beam follows your head, and you only see what it lights.'),
  auto:() => { const c = cam(); let f = flash() || lightOf('spot')[0]; if (!f) { f = G.mkObj('light', 'Flashlight'); f.light = G.mkLight('spot'); }
    f.name = 'Flashlight'; f.light.kind = 'spot'; if (c && f.parent !== c.id) G.setParent(f, c); f.pos = [.3, -.2, 0]; f.rot = [0, 0, 0]; Object.assign(f.light, {range:15, angle:50, intensity:3}); G.select('obj', f.id); }},

 // 8
 {title:T('会闪的灯泡：点光源', 'A flickering bulb: Point Light'), glow:() => ['#p-hier', '#p-insp', '#p-proj'],
  point:() => { let l = lamp() || lightOf('point')[0];
    if (!l) return viaMenu('#hier-plus', ['lightm', 'pointlight'], T('点 +，选 灯光 → 点光源', 'Click +, then Light → Point Light'));
    const n = nameIt(l, 'Lamp'); if (n) return n;
    const s = selFirst(l) || fix('pos', [0, 2.7, -1], l.pos) || (!isWarm(l.light.color) && {at:'#insp-body [data-act="setc"][data-c="#ffb46b"]', label:T('点橙黄色', 'Pick orange-yellow')}) || fixNum('lrange', 8, l.light.range);
    return s || (G.S.playing ? null : scriptFlow('LightFlicker', l)); },
  body:T('在走廊天花板挂一个 <b>点光源（Point Light）</b>，像一个旧灯泡。再写一个 LightFlicker 脚本让它一闪一闪。',
         'Hang a <b>Point Light</b> from the corridor ceiling, like an old light bulb. Then add a LightFlicker script so it flickers.'),
  conds:[[T('新建点光源，改名 Lamp', 'Create a Point Light named Lamp'), () => !!lamp() && lamp().type === 'light' && lamp().light.kind === 'point'],
         [T('位置 0、2.7、-1（走廊中间，靠近天花板）', 'Position 0, 2.7, -1 (mid-corridor, near the ceiling)'), () => !!lamp() && G.near(lamp().pos, [0, 2.7, -1])],
         [T('颜色选橙黄色，范围 8', 'Pick an orange-yellow color, Range 8'), () => !!lamp() && isWarm(lamp().light.color) && near1(lamp().light.range, 8)],
         [T('新建脚本 LightFlicker，拖到 Lamp 上', 'Create a script named LightFlicker and drag it onto Lamp'), () => !!scriptOn(lamp(), 'LightFlicker')]],
  hint:T('点光源像灯泡，往四面八方照；选中它，场景里会看到黄色的范围圈。', 'A Point Light shines every way like a bulb. Select it to see the yellow range circles in the Scene.'),
  note:T('暖色的灯配上冷色的黑暗，是恐怖游戏常见的配色。播放时灯会闪，检查器里的强度也跟着跳。', 'A warm light against cold darkness is a classic horror look. During Play the light flickers and its Intensity jumps in the Inspector.'),
  auto:() => { let l = lamp() || lightOf('point')[0]; if (!l) { l = G.mkObj('light', 'Lamp'); l.light = G.mkLight('point'); } l.name = 'Lamp'; l.light.kind = 'point'; l.pos = [0, 2.7, -1]; l.light.color = '#ffb46b'; l.light.range = 8; attach(l, 'LightFlicker'); G.select('obj', l.id); }},

 // 9
 {title:T('脚步声', 'Footsteps'), glow:() => G.S.playing ? ['#playbtn'] : ['#p-insp', '#p-proj'], play:true,
  point:() => { const p = P(), F = G.S.flags; if (!p) return null; const fs = clipA('Footstep');
    if (!G.S.playing) {
      if (!p.audio) return selFirst(p) || compMenu('audiocat', 'audiosrc', T('添加组件 → 音频 → 音频源', 'Add Component → Audio → Audio Source'));
      if (fs && p.audio.clip !== fs.id) { const r = H().reach(fs); if (r.nav) return r; return selFirst(p) || {from:r.at, to:`#insp-body [data-drop="aclip:${p.id}"]`, label:T('把 Footstep 拖进音频格子', 'Drag Footstep into the Audio slot')}; }
      if (p.audio.awake) return selFirst(p) || {at:H().field('aawake'), label:T('取消勾选', 'Uncheck it')};
      const sf = scriptFlow('Footsteps', p); if (sf) return sf; }
    return playStep(F.steps >= 3, {at:'#cwrap', label:T('按 W 走几步', 'Walk a few steps with W')}); },
  body:T('给 Player 加一个 <b>音频源（Audio Source）</b>，放进 Footstep 声音，再用 Footsteps 脚本在走路时播放它。项目窗口的 Audio 文件夹里已经准备好了几个声音。',
         'Give Player an <b>Audio Source</b> with the Footstep sound, then use a Footsteps script to play it while walking. A few sounds are ready in the Audio folder of the Project window.'),
  conds:[[T('Player：添加组件 → 音频 → 音频源，把 Footstep 拖进「音频」格子', 'Player: Add Component → Audio → Audio Source, and drag Footstep into its Audio slot'), () => { const p = P(), c = clipA('Footstep'); return !!p && !!p.audio && !!c && p.audio.clip === c.id; }],
         [T('取消勾选「唤醒时播放」（不然一开始就会响一下）', 'Uncheck Play On Awake (or it plays once at the start)'), () => !!P() && !!P().audio && !P().audio.awake],
         [T('新建脚本 Footsteps，拖到 Player 上', 'Create a script named Footsteps and drag it onto Player'), () => !!scriptOn(P(), 'Footsteps')],
         [T('点播放，走几步，听到脚步声', 'Press Play, walk a few steps, and hear footsteps'), () => G.S.flags.steps >= 3]],
  hint:T('听不到声音？看看右上角「设置」里的声音有没有关掉。播放时游戏画面左下角也会显示正在响的声音。', 'No sound? Check that Sound isn’t off in Settings (top right). During Play, the bottom-left of the Game view also lists the sounds that are playing.'),
  auto:() => { if (G.S.playing) G.stopPlay(); const p = P(); if (!p) return; if (!p.audio) p.audio = audioDef(); const c = clipA('Footstep') || (G.importSound('footstep'), clipA('Footstep')); p.audio.clip = c.id; p.audio.awake = false; attach(p, 'Footsteps'); G.S.flags.steps = Math.max(3, G.S.flags.steps); G.select('obj', p.id); }},

 // 10
 {title:T('环境音：越近越大声', 'Ambience: louder as you get closer'), glow:() => ['#p-hier', '#p-insp'],
  point:() => { let a = amb();
    if (!a) { const e = G.S.objs.find(o => o.type === 'empty' && !o.vol && !o.col && /^(gameobject|游戏对象)/i.test(o.name)); if (e) return nameIt(e, 'Ambience');
      return viaMenu('#hier-plus', ['empty'], T('点 +，选 创建空物体', 'Click +, then Create Empty')); }
    const s = selFirst(a) || fix('pos', [13, 1.5, 4], a.pos); if (s) return s;
    if (!a.audio) return compMenu('audiocat', 'audiosrc', T('添加组件 → 音频 → 音频源', 'Add Component → Audio → Audio Source'));
    const d = clipA('Drone'); if (d && a.audio.clip !== d.id) { const r = H().reach(d); if (r.nav) return r; return {from:r.at, to:`#insp-body [data-drop="aclip:${a.id}"]`, label:T('把 Drone 拖进音频格子', 'Drag Drone into the Audio slot')}; }
    if (!a.audio.loop) return {at:H().field('aloop'), label:T('勾选循环', 'Check Loop')};
    if (a.audio.blend < 1) return {at:H().field('ablend'), label:T('拖到最右边（3D）', 'Drag all the way right (3D)')};
    return fixNum('amin', 3, a.audio.minDist) || fixNum('amax', 20, a.audio.maxDist); },
  body:T('在走廊尽头放一个看不见的「喇叭」，一直播放低沉的声音。把 <b>空间混合（Spatial Blend）</b> 拉到 3D：越走近越大声，还分得出左右。',
         'Put an invisible speaker at the end of the corridor that keeps playing a low drone. Slide <b>Spatial Blend</b> to 3D: it gets louder as you approach, and you can tell left from right.'),
  conds:[[T('新建空物体，改名 Ambience，位置 13、1.5、4（出口那边）', 'Create an Empty named Ambience at Position 13, 1.5, 4 (by the exit)'), () => !!amb() && G.near(amb().pos, [13, 1.5, 4])],
         [T('加音频源，音频选 Drone，勾选循环', 'Add an Audio Source with Drone, and check Loop'), () => { const a = amb(), d = clipA('Drone'); return !!a && !!a.audio && !!d && a.audio.clip === d.id && a.audio.loop; }],
         [T('空间混合拉到 1（3D）', 'Slide Spatial Blend to 1 (3D)'), () => !!amb() && !!amb().audio && amb().audio.blend >= 1],
         [T('最小距离 3、最大距离 20', 'Min Distance 3, Max Distance 20'), () => !!amb() && !!amb().audio && near1(amb().audio.minDist, 3) && near1(amb().audio.maxDist, 20)]],
  hint:T('最小距离以内声音最大；离得越远越小声，到最大距离以后就不再变小。选中它，场景里的蓝色圈就是这两个距离。', 'Inside Min Distance the sound is at full volume; it gets quieter with distance until Max Distance, then stays the same. Select it to see both distances as blue circles in the Scene.'),
  note:T('「唤醒时播放」保持勾选：一按播放就开始响。主摄像机上的「音频监听器」就是耳朵，声音大小按离它多远来算。', 'Keep Play On Awake checked so it starts when you press Play. The Audio Listener on the Main Camera is the ears: volume depends on how far the sound is from it.'),
  auto:() => { let a = amb() || G.mkObj('empty', 'Ambience'); a.name = 'Ambience'; a.pos = [13, 1.5, 4]; if (!a.audio) a.audio = audioDef(); const d = clipA('Drone') || (G.importSound('drone'), clipA('Drone'));
    Object.assign(a.audio, {clip:d.id, loop:true, awake:true, blend:1, minDist:3, maxDist:20}); G.select('obj', a.id); }},

 // 11
 {title:T('出口的门和触发区', 'The exit door and its trigger'), glow:() => G.S.playing ? ['#playbtn'] : ['#p-hier', '#p-insp'], play:true,
  point:() => { const F = G.S.flags, p = P(); let d = door(), tr = dtrig();
    if (!G.S.playing) {
      if (!d) { const c = G.S.objs.find(o => o.type === 'cube' && !isWall(o) && o.name !== 'Door'); if (c) return nameIt(c, 'Door');
        return viaMenu('#hier-plus', ['go3d', 'cube'], T('点 +，选 3D 对象 → 立方体', 'Click +, then 3D Object → Cube')); }
      if (!G.near(d.pos, [12, 1.5, 4]) || !G.near(G.effScale(d), [.3, 3, 3.5])) return selFirst(d) || fix('pos', [12, 1.5, 4], d.pos) || fix('scl', [.3, 3, 3.5], G.effScale(d));
      if (!tr) { const e = G.S.objs.find(o => o.type === 'empty' && !o.audio && !o.vol && /^(gameobject|游戏对象)/i.test(o.name)); if (e) return nameIt(e, 'DoorTrigger');
        return viaMenu('#hier-plus', ['empty'], T('点 +，选 创建空物体', 'Click +, then Create Empty')); }
      if (!isTriggerBox(tr, [10, 1.5, 4], [3, 3, 3.5])) return selFirst(tr) || fix('pos', [10, 1.5, 4], tr.pos) || fix('scl', [3, 3, 3.5], G.effScale(tr)) ||
        (!tr.col ? compMenu('physics', 'boxCol', T('添加组件 → 物理 → 盒状碰撞体', 'Add Component → Physics → Box Collider')) : {at:H().field('trig'), label:T('勾选「是触发器」', 'Check Is Trigger')});
      if (p && p.tag !== 'Player') return selFirst(p) || {at:H().field('tag'), label:T('选 Player', 'Choose Player')};
      const sf = scriptFlow('DoorOpen', tr); if (sf) return sf;
      const rs = refSlot(tr, 'DoorOpen', 'door', d); if (rs) return rs; }
    return playStep(F.doorOpened, {at:'#cwrap', label:T('走到走廊尽头的门前', 'Walk to the door at the end of the corridor')}); },
  body:T('在出口放一扇门（一个扁的立方体），门前放一个看不见的 <b>触发区（Trigger）</b>。玩家走进触发区，DoorOpen 脚本就让门升起来。',
         'Put a door (a flat cube) at the exit, and an invisible <b>trigger</b> zone in front of it. When the player walks into the zone, a DoorOpen script lifts the door.'),
  conds:[[T('立方体 Door：位置 12、1.5、4，缩放 0.3、3、3.5', 'A Cube named Door: Position 12, 1.5, 4, Scale 0.3, 3, 3.5'), () => !!door() && G.near(door().pos, [12, 1.5, 4]) && G.near(G.effScale(door()), [.3, 3, 3.5])],
         [T('空物体 DoorTrigger：位置 10、1.5、4，缩放 3、3、3.5，加盒状碰撞体并勾选「是触发器」', 'An Empty named DoorTrigger: Position 10, 1.5, 4, Scale 3, 3, 3.5, with a Box Collider set to Is Trigger'), () => isTriggerBox(dtrig(), [10, 1.5, 4], [3, 3, 3.5])],
         [T('Player 的标签改成 Player', 'Set Player’s Tag to Player'), () => !!P() && P().tag === 'Player'],
         [T('DoorOpen 脚本：填好 2 个空，挂到 DoorTrigger 上，把 Door 拖进 Door 格子', 'DoorOpen script: fill in 2 blanks, put it on DoorTrigger, and drag Door into its Door slot'),
          () => { const a = scriptA('DoorOpen'); return !!a && !!a.comp && a.comp.ok && refOk(dtrig(), 'DoorOpen', 'door', door()); }],
         [T('点播放，走到门前，门升起来', 'Press Play and walk to the door — it rises'), () => G.S.flags.doorOpened]],
  hint:T('触发器不会挡路，只会在有东西进来时通知脚本。脚本用 CompareTag 检查进来的是不是贴了 Player 标签的物体。方法名 OnTriggerEnter 要一模一样，拼错不会报错，但门永远不会开。', 'A trigger doesn’t block anything; it just tells scripts when something enters. The script uses CompareTag to check the visitor has the Player tag. OnTriggerEnter must be spelled exactly — a typo gives no error, the door just never opens.'),
  auto:() => { if (G.S.playing) G.stopPlay(); let d = door() || G.mkObj('cube', 'Door'); d.name = 'Door'; d.pos = [12, 1.5, 4]; d.rot = [0, 0, 0]; d.scale = [.3, 3, 3.5]; d.scaleOverride = false;
    let tr = dtrig() || G.mkObj('empty', 'DoorTrigger'); tr.name = 'DoorTrigger'; tr.pos = [10, 1.5, 4]; tr.scale = [3, 3, 3.5]; tr.col = {kind:'box', trigger:true, seq:Date.now()};
    const p = P(); if (p) p.tag = 'Player'; const s = attach(tr, 'DoorOpen'); s.vals.door = d.id; G.S.flags.doorOpened = true; G.select('obj', tr.id); }},

 // 12
 {title:T('怪物（它还不会动）', 'The monster (it can’t move yet)'), glow:() => G.S.playing ? ['#playbtn'] : ['#p-hier', '#p-insp'], play:true,
  point:() => { const F = G.S.flags, p = P(); let m = monster();
    if (!G.S.playing) {
      if (!m) { const c = G.S.objs.find(o => o.type === 'capsule' && o !== p); if (c) return nameIt(c, 'Monster');
        return viaMenu('#hier-plus', ['go3d', 'capsule'], T('点 +，选 3D 对象 → 胶囊', 'Click +, then 3D Object → Capsule')); }
      const s = selFirst(m) || fix('pos', [0, 1, -9], m.pos); if (s) return s;
      if (!m.agent) return compMenu('nav', 'agent', T('添加组件 → 导航 → NavMesh 代理', 'Add Component → Navigation → NavMesh Agent'));
      const f = fixNum('agspd', 2.5, m.agent.speed); if (f) return f;
      const sf = scriptFlow('EnemyChase', m); if (sf) return sf;
      const rs = p && refSlot(m, 'EnemyChase', 'target', p); if (rs) return rs; }
    return playStep(F.navErr, {at:'#ptab-console', label:T('看控制台', 'Look at the Console')}); },
  body:T('怪物就躲在你身后。新建一个胶囊当怪物，加 <b>NavMesh 代理</b> 和 EnemyChase 脚本。点播放：怪物不会动，控制台还有红字。这是故意的，下一步解决。',
         'The monster hides right behind you. Make a capsule monster with a <b>NavMesh Agent</b> and the EnemyChase script. Press Play: it doesn’t move, and the Console shows a red error. That’s on purpose — the next step fixes it.'),
  conds:[[T('胶囊 Monster，位置 0、1、-9（玩家背后）', 'A Capsule named Monster at Position 0, 1, -9 (behind the player)'), () => !!monster() && monster().type === 'capsule' && G.near(monster().pos, [0, 1, -9])],
         [T('添加组件 → 导航 → NavMesh 代理，速度 2.5（比你慢一点）', 'Add Component → Navigation → NavMesh Agent, Speed 2.5 (a bit slower than you)'), () => !!monster() && !!monster().agent && near1(monster().agent.speed, 2.5)],
         [T('新建脚本 EnemyChase，挂到 Monster 上，把 Player 拖进 Target 格子', 'Create a script named EnemyChase, put it on Monster, and drag Player into Target'), () => refOk(monster(), 'EnemyChase', 'target', P())],
         [T('点播放：怪物不动，控制台报红字', 'Press Play: the monster stays put and the Console shows red'), () => G.S.flags.navErr]],
  hint:T('红字的意思是：导航代理只能站在烘焙好的 NavMesh（能走的地图）上。现在还没有这张地图。', 'The red error means a NavMesh Agent can only stand on a baked NavMesh (a map of walkable ground). There isn’t one yet.'),
  auto:() => { if (G.S.playing) G.stopPlay(); const p = P(); let m = monster() || G.mkObj('capsule', 'Monster'); m.name = 'Monster'; m.pos = [0, 1, -9]; m.agent = m.agent || {speed:2.5, seq:Date.now()}; m.agent.speed = 2.5;
    const s = attach(m, 'EnemyChase'); if (p) s.vals.target = p.id; G.S.flags.navErr = true; G.select('obj', m.id); }},

 // 13
 {title:T('烘焙导航网格', 'Bake the NavMesh'), glow:() => G.S.playing ? ['#playbtn'] : ['#p-hier', '#p-insp'], play:true,
  point:() => { const F = G.S.flags, f = FLR(); if (!f) return null;
    if (!G.S.playing && !(f.navs && f.navs.baked)) { const s = selFirst(f); if (s) return s;
      if (!f.navs) return compMenu('nav', 'surface', T('添加组件 → 导航 → NavMesh 表面', 'Add Component → Navigation → NavMesh Surface'));
      return {at:'#insp-body [data-act="bake"]', label:T('点烘焙', 'Click Bake')}; }
    return playStep(F.chased, {at:'#cwrap', label:T('快跑！', 'Run!')}); },
  body:T('选中 Floor，加 <b>NavMesh 表面</b> 组件，点「烘焙」。地板上会出现蓝色区域，那就是怪物能走的地方。墙和门的旁边没有蓝色：怪物会绕开它们。',
         'Select Floor, add a <b>NavMesh Surface</b>, and click Bake. Blue areas appear on the floor — that’s where the monster can walk. There’s no blue next to walls and the door: the monster walks around them.'),
  conds:[[T('Floor：添加组件 → 导航 → NavMesh 表面，点「烘焙」', 'Floor: Add Component → Navigation → NavMesh Surface, then click Bake'), () => !!FLR() && !!FLR().navs && !!FLR().navs.baked],
         [T('点播放：怪物追过来了', 'Press Play: the monster comes after you'), () => G.S.flags.chased]],
  hint:T('场景窗口里，怪物要走的路线会画成蓝线。被追上也不会怎样——下一步才加「被抓到」。', 'In the Scene view the monster’s route is drawn as a blue line. Getting caught does nothing yet — that comes next.'),
  note:T('门关着时，门那里是挡住的，怪物过不去。门升起来后 NavMesh 并不会自己更新，所以穿过门的你是安全的。', 'While the door is shut it blocks the NavMesh, so the monster can’t get through. The NavMesh doesn’t update when the door rises, so once you’re past the door you’re safe.'),
  auto:() => { if (G.S.playing) G.stopPlay(); const f = FLR(); if (!f) return; if (!f.navs) f.navs = {baked:null, seq:Date.now()}; G.bakeNav(f); G.S.flags.chased = true; }},

 // 14
 {title:T('被抓到，或者逃出去', 'Get caught, or escape'), glow:() => G.S.playing ? ['#playbtn'] : ['#p-hier', '#p-insp'], play:true,
  point:() => { const F = G.S.flags, p = P(), m = monster(); let t = msgT(), x = exitZ();
    if (!G.S.playing) {
      if (!t) { const u = G.S.objs.find(o => o.type === 'uitext' && o.name !== 'Message'); if (u) return nameIt(u, 'Message');
        return viaMenu('#hier-plus', ['ui', 'uitext'], T('点 +，选 UI → 文本', 'Click +, then UI → Text')); }
      if (t.ui.text !== '' || t.ui.size < 80) { const s = selFirst(t); if (s) return s; return t.ui.text !== '' ? {at:H().field('utext'), label:T('把字删光', 'Delete all the text')} : fixNum('usize', 120, t.ui.size); }
      if (m) { const sf = scriptFlow('CatchPlayer', m); if (sf) return sf; const r1 = p && refSlot(m, 'CatchPlayer', 'target', p); if (r1) return r1; const r2 = refSlot(m, 'CatchPlayer', 'message', t); if (r2) return r2; }
      if (!x) { const e = G.S.objs.find(o => o.type === 'empty' && !o.audio && !o.vol && /^(gameobject|游戏对象)/i.test(o.name)); if (e) return nameIt(e, 'Exit');
        return viaMenu('#hier-plus', ['empty'], T('点 +，选 创建空物体', 'Click +, then Create Empty')); }
      if (!isTriggerBox(x, [13.5, 1.5, 4], [1, 3, 3.5])) return selFirst(x) || fix('pos', [13.5, 1.5, 4], x.pos) || fix('scl', [1, 3, 3.5], G.effScale(x)) ||
        (!x.col ? compMenu('physics', 'boxCol', T('添加组件 → 物理 → 盒状碰撞体', 'Add Component → Physics → Box Collider')) : {at:H().field('trig'), label:T('勾选「是触发器」', 'Check Is Trigger')});
      const sf = scriptFlow('ExitZone', x); if (sf) return sf; const r3 = refSlot(x, 'ExitZone', 'message', t); if (r3) return r3; }
    return playStep(F.caught || F.escaped, {at:'#cwrap', label:T('跑向出口！', 'Run for the exit!')}); },
  body:T('最后加上胜负：一个空的 UI 文本 Message 用来显示结果；怪物身上的 CatchPlayer 脚本负责「被抓到」；出口的 ExitZone 触发区负责「逃出去」。',
         'Finally, add winning and losing: an empty UI Text called Message shows the result; a CatchPlayer script on the monster handles getting caught; an ExitZone trigger at the exit handles escaping.'),
  conds:[[T('UI → 文本，改名 Message，把字删光，字号 120', 'UI → Text named Message, with the text deleted and Font Size 120'), () => !!msgT() && msgT().ui.text === '' && msgT().ui.size >= 80],
         [T('CatchPlayer 脚本挂到 Monster 上，Target 拖入 Player，Message 拖入 Message', 'CatchPlayer on Monster, with Player in Target and Message in Message'), () => refOk(monster(), 'CatchPlayer', 'target', P()) && refOk(monster(), 'CatchPlayer', 'message', msgT())],
         [T('空物体 Exit：位置 13.5、1.5、4，缩放 1、3、3.5，盒状碰撞体勾选「是触发器」，挂 ExitZone 并拖入 Message', 'An Empty named Exit at 13.5, 1.5, 4, Scale 1, 3, 3.5, Box Collider set to Is Trigger, with ExitZone and Message dragged in'),
          () => isTriggerBox(exitZ(), [13.5, 1.5, 4], [1, 3, 3.5]) && refOk(exitZ(), 'ExitZone', 'message', msgT())],
         [T('点播放：被抓到，或者跑出出口', 'Press Play: get caught, or run out the exit'), () => G.S.flags.caught || G.S.flags.escaped]],
  hint:T('文字颜色可以在检查器里改成红色，更吓人。Time.timeScale = 0 会让游戏停住；停止播放就恢复。', 'Set the text color to red in the Inspector for extra fear. Time.timeScale = 0 freezes the game; stopping Play brings it back.'),
  auto:() => { if (G.S.playing) G.stopPlay(); const p = P(), m = monster();
    let t = msgT(); if (!t) { t = G.S.objs.find(o => o.type === 'uitext'); }
    if (!t) { let c = G.S.objs.find(o => o.type === 'canvas'); if (!c) { c = G.mkObj('canvas', G.t('nCanvas')); if (!G.S.objs.some(o => o.type === 'eventsystem')) G.mkObj('eventsystem', G.t('nEventSystem')); } t = G.mkObj('uitext', 'Message'); t.parent = c.id; t.ui = {anchor:'mc', x:0, y:0, w:1200, h:200, text:'', size:120, color:'#ff3b2f'}; }
    t.name = 'Message'; Object.assign(t.ui, {text:'', size:120, w:Math.max(t.ui.w, 1200), h:Math.max(t.ui.h, 200)});
    if (m) { const s = attach(m, 'CatchPlayer'); if (p) s.vals.target = p.id; s.vals.message = t.id; }
    let x = exitZ() || G.mkObj('empty', 'Exit'); x.name = 'Exit'; x.pos = [13.5, 1.5, 4]; x.scale = [1, 3, 3.5]; x.col = {kind:'box', trigger:true, seq:Date.now()};
    const s2 = attach(x, 'ExitZone'); s2.vals.message = t.id; G.S.flags.escaped = true; G.select('obj', x.id); }},

 // 15
 {title:T('美化 1：暗色材质', 'Polish 1: dark materials'), glow:() => ['#p-proj', '#p-hier'],
  point:() => { const ms = G.mats(); const walls = G.S.objs.filter(isWall), f = FLR();
    if (G.S.renaming != null) return {at:'#rn', label:T('输入名字，按 Enter', 'Type a name, press Enter')};
    const wm = ms.find(m => /wall/i.test(m.name)), fm = ms.find(m => /floor/i.test(m.name));
    if (!wm || !fm) return viaMenu('#proj-plus', ['create', 'mat'], T(`点 +，选 创建 → 材质（名字：${!wm ? 'Wall_Mat' : 'Floor_Mat'}）`, `Click +, then Create → Material (name: ${!wm ? 'Wall_Mat' : 'Floor_Mat'})`));
    for (const [m, col] of [[wm, '#5c5650'], [fm, '#34302c']]) if (lum(m.color) >= .35) { const r = H().reach(m); if (r.nav) return r; return H().isSel(m) ? {at:`#insp-body [data-c="${col}"]`, label:T('点深色', 'Pick a dark color')} : {at:r.at, label:T('点选这个材质', 'Select this material')}; }
    const bad = walls.find(o => G.matOf(o) !== wm);
    if (bad) { const r = H().reach(wm); if (r.nav) return r; return {from:r.at, to:H().row(bad.id), label:T(`拖到 ${bad.name} 上`, `Drag onto ${bad.name}`)}; }
    if (f && G.matOf(f) !== fm) { const r = H().reach(fm); if (r.nav) return r; return {from:r.at, to:H().row(f.id), label:T('拖到 Floor 上', 'Drag onto Floor')}; }
    return null; },
  body:T('现在开始美化。新建两个材质 Wall_Mat 和 Floor_Mat，都选深色，用在 5 面墙和地板上。用场景右上角的 <b>对比</b> 滑块看看前后差别。',
         'Time to polish. Create two materials, Wall_Mat and Floor_Mat, give both dark colors, and put them on the 5 walls and the floor. Use the <b>Compare</b> slider at the top right of the Scene to see before and after.'),
  conds:[[T('材质 Wall_Mat 选深色，用在全部 5 面墙上', 'Wall_Mat in a dark color, on all 5 walls'), () => darkWalls() >= 5],
         [T('材质 Floor_Mat 选深色，用在 Floor 上', 'Floor_Mat in a dark color, on Floor'), () => { const f = FLR(), m = f && G.matOf(f); return !!m && lum(m.color) < .35; }]],
  hint:T('省时间的方法：在层级里按住 Shift 点选第一面和最后一面墙，选中全部墙，再把材质拖到检查器的材质格子里，5 面墙一起换。', 'Shortcut: in the Hierarchy, Shift-click the first and last wall to select them all, then drop the material on the Material slot in the Inspector to change all 5 at once.'),
  note:T('恐怖场景的颜色要暗、灰、少：光才是主角。但也别全黑，太黑的墙连手电筒都照不亮。', 'Horror colors should be dark, gray and few — the light is the star. But not pitch black: walls that dark swallow even the flashlight.'),
  auto:() => { const f = G.S.assets.find(x => x.type === 'folder' && x.name === 'Materials' && x.parent === 0) || G.mkAsset('folder', 'Materials', 0);
    const wm = G.mats().find(m => /wall/i.test(m.name)) || G.mkAsset('material', 'Wall_Mat', f.id, {color:'#5c5650'}); const fm = G.mats().find(m => /floor/i.test(m.name)) || G.mkAsset('material', 'Floor_Mat', f.id, {color:'#34302c'});
    if (lum(wm.color) >= .35) wm.color = '#5c5650'; if (lum(fm.color) >= .35) fm.color = '#34302c';
    G.S.objs.filter(isWall).forEach(o => { o.mat = wm.id; }); if (FLR()) FLR().mat = fm.id; }},

 // 16
 {title:T('美化 2：雾', 'Polish 2: fog'), glow:() => ['.mbtn[data-menu="window"]'],
  point:() => { const e = G.S.env; if (e.fog && lum(e.fogColor) < .08 && e.fogMode === 'exp2' && near1(e.density, .09)) return null;
    if (!lightingOpen()) return winMenu(['lighting', 'rendering']);
    if (!e.fog) return {at:'#float [data-env="fog"]', label:T('勾选雾', 'Check Fog')};
    if (lum(e.fogColor) >= .08) return {at:'#float [data-envc="fogColor"][data-c="#0b0c10"]', label:T('点很暗的颜色', 'Pick a very dark color')};
    if (e.fogMode !== 'exp2') return {at:'#float [data-env="fogMode"]', label:T('选 指数平方', 'Choose Exponential Squared')};
    return {at:'#float [data-env="density"]', label:setTo(0.09)}; },
  body:T('打开 <b>窗口 → 渲染 → 灯光</b>，在「其他设置」里勾选 <b>雾</b>。远处被黑暗吞掉，你永远不知道前面有什么。',
         'Open <b>Window → Rendering → Lighting</b> and check <b>Fog</b> under Other Settings. The distance disappears into darkness, so you never know what’s ahead.'),
  conds:[[T('勾选雾，颜色选很暗的颜色', 'Check Fog and pick a very dark color'), () => G.S.env.fog && lum(G.S.env.fogColor) < .08],
         [T('模式选 指数平方，密度 0.09', 'Mode Exponential Squared, Density 0.09'), () => G.S.env.fogMode === 'exp2' && near1(G.S.env.density, .09)]],
  hint:T('用对比滑块看看：右边加了雾，走廊尽头变得看不清。', 'Use the Compare slider: on the right, with fog, the end of the corridor fades away.'),
  note:T('雾还有一个好处：看不到的地方不用画得很精细，游戏跑得更顺。', 'Fog has another upside: what you can’t see doesn’t need much detail, so the game runs smoother.'),
  auto:() => { Object.assign(G.S.env, {fog:true, fogColor:'#0b0c10', fogMode:'exp2', density:.09}); G.closeFloat(); }},

 // 17
 {title:T('美化 3：后期处理', 'Polish 3: post-processing'), glow:() => ['#p-hier', '#p-insp'],
  point:() => { const v = vol(), c = cam();
    if (!v) return viaMenu('#hier-plus', ['volume', 'globalvol'], T('点 +，选 体积 → 全局体积', 'Click +, then Volume → Global Volume'));
    const ov = v.vol.ov;
    if (!v.vol.profile || !ov.vignette || ov.vignette.intensity < .3 || !ov.grain || ov.grain.intensity < .3 || !ov.color || ov.color.saturation > -20) {
      const s = selFirst(v); if (s) return s;
      if (!v.vol.profile) return {at:'#insp-body [data-act="volnew"]', label:T('点新建', 'Click New')};
      for (const [k, p, want] of [['vignette', 'intensity', .45], ['grain', 'intensity', .5], ['color', 'saturation', -40]]) {
        if (!ov[k]) return [{at:H().mi('ov_' + k), label:T('添加覆盖 → 后期处理 → ' + G.t({vignette:'vignette', grain:'filmGrain', color:'colorAdj'}[k]), 'Add Override → Post-processing → ' + G.tl('en', {vignette:'vignette', grain:'filmGrain', color:'colorAdj'}[k]))}, {at:H().mi('postproc'), label:T('后期处理', 'Post-processing')}, {at:'#addov', label:T('点添加覆盖', 'Click Add Override')}];
        if (k === 'color' ? ov[k][p] > -20 : ov[k][p] < .3) return {at:H().field(`vo.${k}.${p}`), label:setTo(want)}; } }
    if (c && !(c.cam && c.cam.post)) return selFirst(c) || {at:H().field('campost'), label:T('勾选后期处理', 'Check Post Processing')};
    return G.S.tab !== 'game' ? {at:'#tab-game', label:T('看看游戏画面', 'Look at the Game view')} : null; },
  body:T('<b>后期处理</b> 是画面拍好之后再加的滤镜。新建一个 <b>全局体积（Global Volume）</b>，加三个效果：暗角让四周变暗，胶片颗粒让画面像旧录像带，色彩调整把颜色变淡。最后记得在摄像机上勾选「后期处理」。',
         '<b>Post-processing</b> adds filters after the image is rendered. Create a <b>Global Volume</b> and add three effects: Vignette darkens the edges, Film Grain makes it look like old tape, Color Adjustments drains the color. Finally, check Post Processing on the camera.'),
  conds:[[T('层级 + → 体积 → 全局体积，配置文件点「新建」', 'Hierarchy + → Volume → Global Volume, then click New for the Profile'), () => !!vol() && !!vol().vol.profile],
         [T('添加覆盖：暗角，强度 0.45', 'Add Override: Vignette, Intensity 0.45'), () => !!vol() && !!vol().vol.ov.vignette && vol().vol.ov.vignette.intensity >= .3],
         [T('添加覆盖：胶片颗粒，强度 0.5', 'Add Override: Film Grain, Intensity 0.5'), () => !!vol() && !!vol().vol.ov.grain && vol().vol.ov.grain.intensity >= .3],
         [T('添加覆盖：色彩调整，饱和度 -40', 'Add Override: Color Adjustments, Saturation -40'), () => !!vol() && !!vol().vol.ov.color && vol().vol.ov.color.saturation <= -20],
         [T('选中主摄像机，勾选「后期处理」', 'Select Main Camera and check Post Processing'), () => !!cam() && !!cam().cam && cam().cam.post]],
  hint:T('加了效果却没变化？最常见的原因：摄像机没勾选「后期处理」。URP 的新场景默认不开后期处理。', 'Effects added but nothing changed? Most often the camera’s Post Processing box isn’t checked. New URP scenes don’t use post-processing by default.'),
  note:T('点「快照」存一张，和第 15 步之前的样子比一比。美化就是一层一层叠上去：材质 → 灯光 → 雾 → 后期。', 'Take a Snapshot and compare it with how things looked before step 15. Polish stacks up layer by layer: materials → lights → fog → post-processing.'),
  auto:() => { let v = vol(); if (!v) { v = G.mkObj('empty', G.uniqueName(G.t('nGlobalVolume'), null)); v.vol = {profile:null, ov:{}, seq:Date.now()}; }
    v.vol.profile = v.vol.profile || 'Global Volume Profile'; const ov = v.vol.ov;
    ov.vignette = Object.assign({intensity:0}, ov.vignette); if (ov.vignette.intensity < .3) ov.vignette.intensity = .45;
    ov.grain = Object.assign({intensity:0}, ov.grain); if (ov.grain.intensity < .3) ov.grain.intensity = .5;
    ov.color = Object.assign({postExposure:0, contrast:0, saturation:0}, ov.color); if (ov.color.saturation > -20) ov.color.saturation = -40;
    const c = cam(); if (c) c.cam = Object.assign({}, c.cam, {post:true}); G.select('obj', v.id); }},

 // 18
 {title:T('保存场景，玩一遍', 'Save the scene and play it'), glow:() => ['#menu-file'],
  point:() => [{at:H().mi('save'), label:T('点保存', 'Click Save')}, {at:'#menu-file', label:T('点 文件 → 保存（或按 Ctrl/Cmd+S）', 'File → Save (or Ctrl/Cmd+S)')}],
  body:T('保存场景。然后从头玩一遍：拿着手电筒走过闪烁的走廊，听着尽头的声音越来越近，在怪物抓到你之前跑出那扇门。',
         'Save the scene. Then play it from the start: walk the flickering corridor with your flashlight, hear the sound at the end getting closer, and get out the door before the monster catches you.'),
  conds:[[T('按 Ctrl+S（Mac 是 Cmd+S），或 文件 → 保存', 'Press Ctrl+S (Cmd+S on Mac), or File → Save'), () => G.S.flags.saved && !G.S.dirty]],
  hint:T('觉得太难？把怪物的速度调低一点，或者把它放远一点。觉得太简单？反过来。调手感也是做游戏的一部分。', 'Too hard? Lower the monster’s Speed or move it farther back. Too easy? Do the opposite. Tuning is part of making games.'),
  auto:() => { if (G.S.playing) G.stopPlay(); G.saveScene(); }},
];

const FINISH = {
 zh:`<div class="finish"><div class="gstep">完成</div><h2>第 1 章完成：你做了一个恐怖游戏</h2>
<p>你搭了走廊，做了第一人称玩家、手电筒、会闪的灯、脚步声和 3D 环境音，用触发器开门，用 NavMesh 让怪物追你，还用材质、雾和后期处理把画面变得吓人。</p>
<div class="note">想再练练？主页的「第 1 章 · 找 Bug 挑战」已经解锁：一个坏掉的恐怖走廊，把 4 个问题找出来。</div>
<div class="gact"><button class="btn primary" data-act="quiz">章末小测验</button><button class="btn" data-act="export">导出到真 Unity</button><button class="btn" data-act="reset">再玩一遍</button><button class="btn quiet" data-act="home">回到主页</button></div></div>`,
 en:`<div class="finish"><div class="gstep">Done</div><h2>Chapter 1 complete: you made a horror game</h2>
<p>You built a corridor and made a first-person player, a flashlight, a flickering light, footsteps and 3D ambience. A trigger opens the door, a NavMesh lets the monster chase you, and materials, fog and post-processing make it scary.</p>
<div class="note">Want more practice? “Chapter 1 · Bug Hunt” is now unlocked on the home screen: a broken horror corridor with 4 problems to find.</div>
<div class="gact"><button class="btn primary" data-act="quiz">Chapter quiz</button><button class="btn" data-act="export">Export to real Unity</button><button class="btn" data-act="reset">Play again</button><button class="btn quiet" data-act="home">Back to home</button></div></div>`};

// 开场：只有地板。Audio 文件夹里放好 3 个声音。
function setup() {
  G.mkObj('plane', 'Floor', [6, 0, -2], [1.7, 1, 1.7]);
  const f = G.mkAsset('folder', 'Audio', 0);
  for (const k of ['footstep', 'drone', 'growl']) G.mkAsset('audio', G.audio.clips[k].name, f.id, {clip:k});
  G.setView([4, 0, -2], 30, -35, 48);
}

// 找 Bug 挑战：先把整章做完，再弄坏 4 个地方
const BUGS = {
 setup:() => {
  setup(); STEPS.forEach(st => st.auto()); G.select(null);
  Object.assign(G.S.flags, {hitWall:false, fpsStopped:false, steps:0, doorOpened:false, navErr:false, chased:false, caught:false, escaped:false, saved:false});
  const f = flash(), c = cam(); if (f && c) G.setParent(f, null);
  const p = P(); if (p) p.tag = 'Untagged';
  const fl = FLR(); if (fl && fl.navs) fl.navs.baked = null;
  const wm = G.mats().find(m => /wall/i.test(m.name)); if (wm) wm.shader = 'Standard'; },
 list:[
  {title:T('墙是粉红色的', 'The walls are bright pink'),
   hint:T('粉红色 = 材质的着色器和渲染管线不匹配。选中 Wall_Mat，把着色器改成 URP/Lit。', 'Pink means the shader doesn’t match the render pipeline. Select Wall_Mat and set its Shader to URP/Lit.'),
   check:() => G.mats().every(m => (m.shader || 'URP/Lit') !== 'Standard')},
  {title:T('转头时手电筒不跟着转', 'The flashlight doesn’t turn with your head'),
   hint:T('看看层级：Flashlight 在哪里？它要是主摄像机的子物体，才会跟着摄像机转。', 'Check the Hierarchy: where is Flashlight? It must be a child of the Main Camera to turn with it.'),
   check:() => !!flash() && !!cam() && isChildOf(flash(), cam())},
  {title:T('走到门前，门不开', 'The door won’t open'),
   hint:T('DoorOpen 只对贴了 Player 标签的物体开门。选中 Player，看看它的标签。', 'DoorOpen only opens for objects tagged Player. Select Player and check its Tag.'),
   check:() => !!P() && P().tag === 'Player'},
  {title:T('怪物站着不动，控制台报红字', 'The monster won’t move and the Console shows red'),
   hint:T('红字说代理不在 NavMesh 上。选中 Floor，在 NavMesh 表面里点「烘焙」。', 'The error says the agent isn’t on a NavMesh. Select Floor and click Bake on its NavMesh Surface.'),
   check:() => G.S.objs.some(o => o.navs && o.navs.baked)}]};

const QUIZ = [
 {q:T('想让手电筒跟着你转头，聚光灯应该放在哪里？', 'To make the flashlight turn with your head, where should the Spot Light go?'),
  o:[T('场景正中间', 'In the middle of the scene'), T('主摄像机下面（当子物体）', 'Under the Main Camera, as a child'), T('地板下面', 'Under the floor'), T('项目窗口里', 'In the Project window')], a:1,
  w:T('子物体跟着父物体移动和旋转。摄像机转，手电筒就跟着转。', 'A child moves and turns with its parent. When the camera turns, so does the flashlight.')},
 {q:T('第一人称走路为什么用角色控制器，而不是直接改位置？', 'Why walk with a Character Controller instead of changing the position directly?'),
  o:[T('会被墙挡住，也会受重力', 'It stops at walls and falls with gravity'), T('画面更好看', 'It looks better'), T('代码比较短', 'The code is shorter'), T('Unity 不允许改位置', 'Unity doesn’t allow changing position')], a:0,
  w:T('直接改位置会穿墙。SimpleMove 会处理碰撞和重力。', 'Changing the position directly walks through walls. SimpleMove handles collisions and gravity.')},
 {q:T('怪物不动，控制台说 SetDestination 只能用在 NavMesh 上的代理。要做什么？', 'The monster won’t move, and the Console says SetDestination only works on an agent on a NavMesh. What do you do?'),
  o:[T('给怪物加刚体', 'Add a Rigidbody to the monster'), T('把怪物改名', 'Rename the monster'), T('在地板的 NavMesh 表面点「烘焙」', 'Click Bake on the floor’s NavMesh Surface'), T('删掉怪物重做', 'Delete the monster and start over')], a:2,
  w:T('导航代理要站在烘焙好的 NavMesh（蓝色区域）上才能找路。', 'An agent needs a baked NavMesh (the blue area) under it to find its way.')},
 {q:T('把 OnTriggerEnter 写成 onTriggerEnter（o 小写），会怎样？', 'You write onTriggerEnter (lowercase o) instead of OnTriggerEnter. What happens?'),
  o:[T('控制台报编译错误', 'A compile error in the Console'), T('不报错，但 Unity 永远不会调用它', 'No error, but Unity never calls it'), T('Unity 自动改对', 'Unity fixes it for you'), T('游戏会当掉', 'The game crashes')], a:1,
  w:T('C# 区分大小写。名字不一样，Unity 就当它是你自己的普通方法，不会在触发时调用。', 'C# is case-sensitive. With a different name, Unity treats it as an ordinary method of yours and never calls it on a trigger.')},
 {q:T('空间混合（Spatial Blend）设成 1 的声音，会怎样？', 'What happens to a sound with Spatial Blend set to 1?'),
  o:[T('在哪里听都一样大声', 'Same volume everywhere'), T('离得越远越小声，还分左右', 'Quieter with distance, and it comes from a side'), T('不会播放', 'It doesn’t play'), T('只在暂停时播放', 'It plays only when paused')], a:1,
  w:T('1 是 3D 声音，0 是 2D 声音（像背景音乐）。', '1 is 3D sound; 0 is 2D (like background music).')},
 {q:T('加了全局体积和暗角，游戏画面却没变化。最可能是什么原因？', 'You added a Global Volume and a Vignette, but the Game view didn’t change. What’s most likely?'),
  o:[T('电脑太慢', 'The computer is too slow'), T('暗角只能在手机上看', 'Vignette only shows on phones'), T('雾把它盖住了', 'The fog covers it'), T('摄像机没勾选「后期处理」', 'The camera’s Post Processing box isn’t checked')], a:3,
  w:T('URP 的新场景默认不开后期处理，要在摄像机上勾选。', 'New URP scenes don’t use post-processing by default — check it on the camera.')}];

const EXPORT_INTRO = {
 zh:'# 在真 Unity 里重做「恐怖走廊」\n\n1. 用 Unity Hub 安装 Unity 6.3 LTS，新建项目，模板选 **Universal 3D**。\n2. 把这个压缩包里的 `Assets/Scripts` 文件夹拖进 Unity 的项目窗口。\n3. 组件菜单里找不到 NavMesh Surface 的话：窗口 → 包管理器（Window → Package Manager），安装 **AI Navigation**。\n4. 第一次建 UI 文本时，Unity 会问要不要导入 TextMeshPro 的资源，点导入。\n5. 照下面的清单，一个一个建出物体、材质和设置。\n',
 en:'# Rebuild the horror corridor in real Unity\n\n1. Install Unity 6.3 LTS with Unity Hub and create a project with the **Universal 3D** template.\n2. Drag the `Assets/Scripts` folder from this zip into Unity’s Project window.\n3. If NavMesh Surface is missing from the component menu, open Window → Package Manager and install **AI Navigation**.\n4. The first time you create a UI Text, Unity asks to import the TextMeshPro resources — click Import.\n5. Follow the list below to create each object, material and setting.\n'};

G.chapters = G.chapters || {};
G.chapters.ch1 = {title:T('恐怖游戏', 'Horror Game'), steps:STEPS, finish:FINISH, setup, bugs:BUGS, quiz:QUIZ, exportIntro:EXPORT_INTRO};
})();
