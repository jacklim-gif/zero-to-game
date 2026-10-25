// 第 1 章下篇：恐怖游戏进阶 —— 按 F 互动、捡手电筒、钥匙和锁着的门、录制开门动画 + Animator、Jumpscare（协程）。
// 开场就是做完第 1 章的走廊（用第 1 章每一步的「帮我做」搭出来），怪物先关掉，最后一步再打开。
// 写法和 ch0.js / ch1.js 一样。
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
const P = () => G.P();
const scriptA = n => G.S.assets.find(a => a.type === 'script' && a.name === n);
const scriptOn = (o, n) => o ? o.scripts.find(s => (G.asset(s.asset) || {}).name === n) : null;
const near1 = (a, b) => Math.abs(a - b) < .001;
const hex = c => { const n = parseInt(String(c).slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };
const lum = c => { const [r, g, b] = hex(c); return .2126 * r + .7152 * g + .0722 * b; };
const isGold = c => { const [r, g, b] = hex(c); return r > .8 && g > .55 && b < .45; };
const isRed = c => { const [r, g, b] = hex(c); return r > .8 && g < .4 && b < .4; };
const playStep = (doneFlag, during, stopLab) => {
  if (!G.S.playing) return doneFlag ? null : {at:'#playbtn', label:T('点播放', 'Click Play')};
  return doneFlag ? {at:'#playbtn', label:stopLab || T('点一下停止', 'Click to stop')} : during;
};
const winMenu = (keys, label) => viaMenu('.mbtn[data-menu="window"]', keys, label);
const compMenu = (cat, item, lab) => [{at:H().mi(item), label:lab}, {at:H().mi(cat), label:lab}, {at:'#addcomp', label:lab}];
const nameIt = (o, want) => o.name === want ? null : selFirst(o) || {at:H().field('name'), label:T(`改成 ${want}，按 Enter`, `Type ${want}, press Enter`)};
const freshEmpty = () => G.S.objs.find(o => o.type === 'empty' && !o.audio && !o.vol && !o.col && !o.anim && /^(gameobject|游戏对象)/i.test(o.name) && o.parent == null);
const isTriggerBox = (o, pos, scl) => !!o && o.type === 'empty' && G.near(o.pos, pos) && G.near(G.effScale(o), scl) && !!o.col && o.col.kind === 'box' && o.col.trigger;
const audioDef = () => ({clip:null, volume:1, loop:false, awake:true, blend:0, minDist:1, maxDist:500, seq:Date.now()});
const clipA = n => G.S.assets.find(a => a.type === 'audio' && a.name === n);

// 脚本：新建 → 改名 → 填空、保存 → 拖到物体上（和 ch1.js 一样）
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
const attach = (o, name) => { (G.lib()[name].deps || []).forEach(ensureScript); const a = ensureScript(name); let s = scriptOn(o, name); if (!s) { G.addScript(o, a); s = scriptOn(o, name); } return s; };
const scriptOk = n => { const a = scriptA(n); return !!a && !!a.comp && a.comp.ok; };
function refSlot(host, name, fid, target) {
  const s = scriptOn(host, name); if (!s || s.vals[fid] === target.id) return null;
  return selFirst(host) || {from:H().row(target.id), to:`#insp-body [data-drop="ref:${host.id}:${host.scripts.indexOf(s)}:${fid}"]`, label:T(`把 ${target.name} 拖进 ${fid} 格子`, `Drag ${target.name} into the ${fid} slot`)};
}
const refOk = (host, name, fid, target) => { const s = scriptOn(host, name); return !!s && !!target && s.vals[fid] === target.id; };

// ---------- 物体 ----------
const hinge = () => byName('DoorHinge'), door = () => byName('Door'), torch = () => byName('Torch'), flash = () => byName('Flashlight'), keyO = () => byName('Key');
const ghost = () => byName('Ghost'), zone = () => byName('ScareZone'), sLight = () => byName('ScareLight'), monster = () => byName('Monster');
const prompt = () => G.S.objs.find(o => o.type === 'uitext' && o.name === 'Prompt');
const HINGE = [12, 1.5, 2.25];
// ---------- 动画 ----------
const ctrlOf = o => o && o.anim ? G.asset(o.anim.ctrl) : null;
const clipNamed = n => G.S.assets.find(a => a.type === 'anim' && a.name === n);
const keyAt = (ks, t, y) => !!ks && ks.some(k => Math.abs(k[0] - t) < .03 && Math.abs(k[1][1] - y) < .5);
const clipOk = () => { const c = clipNamed('DoorOpen'); return !!c && !!c.curves.rot && keyAt(c.curves.rot, 0, 0) && keyAt(c.curves.rot, 1, 90); };
const stNamed = (c, n) => c ? c.states.find(s => s.name === n) : null;
const openState = c => c ? c.states.find(s => { const cl = s.clip != null ? G.asset(s.clip) : null; return cl && cl.name === 'DoorOpen'; }) : null;
const closedOk = () => { const c = ctrlOf(hinge()), s = stNamed(c, 'Closed'); return !!s && s.clip == null && c.def === s.id; };
const paramOk = () => { const c = ctrlOf(hinge()); return !!c && c.params.some(p => p.name === 'Open' && p.type === 'trigger'); };
const transOf = () => { const c = ctrlOf(hinge()), a = stNamed(c, 'Closed'), b = openState(c); return a && b ? c.trans.find(x => x.from === a.id && x.to === b.id) : null; };
const transOk = () => { const tr = transOf(); return !!tr && !tr.exit && tr.conds.includes('Open'); };
const animWinOpen = () => G.floatOpen() === 'anim', animrOpen = () => G.floatOpen() === 'animator';

function buildAnim() {
  const h = hinge(); if (!h) return;
  let c = ctrlOf(h);
  if (!c) { c = G.mkAsset('animctrl', 'DoorHinge', 0, {states:[], def:null, params:[], trans:[]}); h.anim = {ctrl:c.id, seq:Date.now()}; }
  let clip = clipNamed('DoorOpen') || G.mkAsset('anim', 'DoorOpen', 0, {loop:true, curves:{}});
  clip.curves.rot = [[0, [0, 0, 0]], [1, [0, 90, 0]]];
  let os = openState(c); if (!os) { os = {id:Date.now() + 1, name:'DoorOpen', clip:clip.id, x:300, y:150}; c.states.push(os); }
  if (c.def == null) c.def = os.id;
  return {c, clip, os};
}

const STEPS = [
 // 1
 {title:T('门轴：让门绕着边转', 'A hinge: make the door swing on its edge'), glow:() => ['#p-hier', '#p-insp'],
  enter:() => { G.S.tab = 'scene'; G.setView([11, 0, 3], 14, -40, 40); },
  point:() => { let h = hinge(); const d = door(), tr = byName('DoorTrigger');
    if (!h) { const e = freshEmpty(); if (e) return nameIt(e, 'DoorHinge'); return viaMenu('#hier-plus', ['empty'], T('点 +，选 创建空物体', 'Click +, then Create Empty')); }
    const n = nameIt(h, 'DoorHinge'); if (n) return n;
    if (!G.near(h.pos, HINGE)) return selFirst(h) || fix('pos', HINGE, h.pos);
    if (d && d.parent !== h.id) return {from:H().row(d.id), to:H().row(h.id), label:T('把 Door 拖到 DoorHinge 上', 'Drag Door onto DoorHinge')};
    if (tr) return H().isSel(tr) ? {at:H().row(tr.id), label:T('按 Delete 删除', 'Press Delete')} : {at:H().row(tr.id), label:T('点选 DoorTrigger', 'Select DoorTrigger')};
    return null; },
  body:T('物体旋转时绕着 <b>轴心</b> 转。立方体的轴心在正中间，直接转的话门会在原地打转。做法：在门的边上放一个空物体当 <b>门轴</b>，把门放进去，以后转门轴就好。旧的「走近就升起来」用不到了，把 DoorTrigger 删掉。',
         'Objects turn around their <b>pivot</b>. A cube’s pivot is its center, so turning it directly makes the door spin in place. Instead, put an empty object at the door’s edge as a <b>hinge</b>, put the door inside it, and turn the hinge. The old walk-up trigger is no longer needed, so delete DoorTrigger.'),
  conds:[[T('新建空物体 DoorHinge，位置 12、1.5、2.25（门的南边）', 'Create an Empty named DoorHinge at 12, 1.5, 2.25 (the door’s south edge)'), () => !!hinge() && G.near(hinge().pos, HINGE)],
         [T('把 Door 拖到 DoorHinge 上，变成它的子物体', 'Drag Door onto DoorHinge to make it a child'), () => !!hinge() && !!door() && door().parent === hinge().id],
         [T('删掉 DoorTrigger', 'Delete DoorTrigger'), () => !byName('DoorTrigger')]],
  hint:T('试试看：选中 DoorHinge，把旋转 Y 改成 90，门就像真的门一样绕着边打开。看完记得改回 0。', 'Try it: select DoorHinge and set Rotation Y to 90 — the door swings open on its edge like a real door. Set it back to 0 afterwards.'),
  auto:() => { let h = hinge() || G.mkObj('empty', 'DoorHinge'); h.name = 'DoorHinge'; h.pos = HINGE.slice(); h.rot = [0, 0, 0]; const d = door(); if (d && d.parent !== h.id) G.setParent(d, h);
    G.S.objs = G.S.objs.filter(o => o.name !== 'DoorTrigger'); G.select('obj', h.id); }},

 // 2
 {title:T('录制开门动画', 'Record the door-opening animation'), glow:() => ['.mbtn[data-menu="window"]', '#p-insp'],
  point:() => { const h = hinge(); if (!h) return null; const clip = clipNamed('DoorOpen');
    if (!clipOk()) {
      const s = selFirst(h); if (s) return s;
      if (!animWinOpen()) return winMenu(['animwin', 'animation'], T('窗口 → 动画 → 动画', 'Window → Animation → Animation'));
      if (!clip || !h.anim) return document.querySelector('#awname') && document.querySelector('#awname').value !== 'DoorOpen' ? {at:'#awname', label:T('改成 DoorOpen', 'Type DoorOpen')} : {at:'#float [data-aw="create"]', label:T('点创建', 'Click Create')};
      if (!document.querySelector('#float .awrec.on')) return {at:'#float [data-aw="rec"]', label:T('点录制', 'Click Record')};
      const tm = document.querySelector('#float [data-aw="time"]');
      if (!(clip.curves.rot && keyAt(clip.curves.rot, 1, 90))) { if (tm && Math.abs(parseFloat(tm.value) - 1) > .01) return {at:'#float [data-aw="time"]', label:setTo(1)}; return fix('rot', [0, 90, 0], h.rot); }
      return null; }
    if (animWinOpen() && document.querySelector('#float .awrec.on')) return {at:'#float [data-aw="rec"]', label:T('再点一次，停止录制', 'Click again to stop recording')};
    return null; },
  body:T('选中 DoorHinge，打开 <b>窗口 → 动画 → 动画</b>（Window → Animation → Animation）。点「创建」做一个叫 DoorOpen 的 <b>动画剪辑</b>。再点红色的「录制」，把时间改成 1 秒，在检查器把旋转 Y 改成 90：Unity 会在 0 秒记下「关着」，在 1 秒记下「开着」，这两个点叫 <b>关键帧</b>。',
         'Select DoorHinge and open <b>Window → Animation → Animation</b>. Click Create to make an <b>Animation Clip</b> named DoorOpen. Click the red Record button, set the time to 1 second, and set Rotation Y to 90 in the Inspector: Unity stores “closed” at 0 seconds and “open” at 1 second. Those two points are <b>keyframes</b>.'),
  conds:[[T('动画窗口里点「创建」，剪辑名 DoorOpen（DoorHinge 会多一个 Animator 组件）', 'In the Animation window click Create and name the clip DoorOpen (DoorHinge gets an Animator)'), () => !!clipNamed('DoorOpen') && !!hinge() && !!hinge().anim],
         [T('录制：0 秒旋转 Y 是 0，1 秒旋转 Y 是 90', 'Record: Rotation Y is 0 at 0 seconds and 90 at 1 second'), clipOk],
         [T('再点一次「录制」，停止录制', 'Click Record again to stop recording'), () => clipOk() && !(animWinOpen() && document.querySelector('#float .awrec.on'))]],
  hint:T('点时间尺可以移动白色的播放头，场景里的门会跟着显示那一刻的样子。菱形就是关键帧，点它会跳过去。', 'Click the time ruler to move the white playhead; the door in the Scene shows that moment. The diamonds are keyframes — click one to jump to it.'),
  note:T('Unity 还顺便建了一个动画控制器（也叫 DoorHinge），并给 DoorHinge 加上了 Animator 组件。下两步会用到它们。', 'Unity also created an Animator Controller (also called DoorHinge) and added an Animator component to DoorHinge. You’ll use both in the next two steps.'),
  auto:() => { buildAnim(); G.closeFloat(); const h = hinge(); if (h) { h.rot = [0, 0, 0]; G.select('obj', h.id); } }},

 // 3
 {title:T('门怎么自己开了？Loop Time', 'Why does the door open by itself? Loop Time'), glow:() => G.S.playing ? ['#playbtn'] : ['#playbtn', '#p-proj'], play:true,
  point:() => { const F = G.S.flags, clip = clipNamed('DoorOpen');
    if (!F.animStopped) return playStep(F.animLooped, {at:'#cwrap', label:T('看出口的门（场景窗口看得更清楚）', 'Watch the exit door (easier in the Scene view)')});
    if (clip && clip.loop) { const r = H().reach(clip); if (r.nav) return r; return H().isSel(clip) ? {at:H().field('aloopt'), label:T('取消勾选', 'Uncheck it')} : {at:r.at, label:T('点选 DoorOpen 剪辑', 'Select the DoorOpen clip')}; }
    return null; },
  body:T('点播放，看看出口的门：一开始就自己打开，然后「啪」地关上再开，一直重复。两个原因：剪辑默认 <b>循环</b>（Loop Time）；而且 Animator 一开始就播放默认状态，也就是 DoorOpen。这一步先解决循环。',
         'Press Play and watch the exit door: it opens by itself right away, then snaps shut and opens again, over and over. Two reasons: clips <b>loop</b> by default (Loop Time), and the Animator plays its default state — DoorOpen — from the start. This step fixes the looping.'),
  conds:[[T('点播放：门自己打开，还一直重复', 'Press Play: the door opens by itself, over and over'), () => G.S.flags.animLooped],
         [T('停止播放', 'Stop Play'), () => G.S.flags.animStopped],
         [T('在项目里选中 DoorOpen 剪辑，取消勾选 Loop Time', 'Select the DoorOpen clip in the Project window and uncheck Loop Time'), () => !!clipNamed('DoorOpen') && !clipNamed('DoorOpen').loop]],
  hint:T('在场景窗口里看最清楚：播放时点上面的「场景」标签，转到出口那里。', 'It’s easiest to see in the Scene view: click the Scene tab during Play and look at the exit.'),
  auto:() => { if (G.S.playing) G.stopPlay(); const c = clipNamed('DoorOpen') || buildAnim().clip; c.loop = false; Object.assign(G.S.flags, {animLooped:true, animStopped:true}); }},

 // 4
 {title:T('Animator：先关着，收到 Open 才开', 'Animator: closed until it gets Open'), glow:() => ['.mbtn[data-menu="window"]'],
  point:() => { const h = hinge(), c = ctrlOf(h); if (!h || !c) return null;
    if (!animrOpen()) return selFirst(h) || winMenu(['animatorwin', 'animation'], T('窗口 → 动画 → Animator', 'Window → Animation → Animator'));
    const node = s => `#float .anode[data-id="${s.id}"]`, sel = document.querySelector('#float .anode.sel');
    let cl = stNamed(c, 'Closed');
    if (!cl) { const ns = c.states.find(s => s.clip == null && s.name !== 'Closed');
      if (ns) return sel && sel.dataset.id === String(ns.id) ? {at:'#float [data-ar="sname"]', label:T('改成 Closed，按 Enter', 'Type Closed, press Enter')} : {at:node(ns), label:T('点选这个状态', 'Click this state')};
      return [{at:H().mi('emptystate'), label:T('空状态', 'Empty')}, {at:H().mi('createstate'), label:T('新建状态', 'Create State')}, {at:'#float .agraph', label:T('在空白处点右键', 'Right-click an empty spot')}]; }
    if (c.def !== cl.id) return [{at:H().mi('setdefault'), label:T('设为默认状态', 'Set as Layer Default State')}, {at:node(cl), label:T('在 Closed 上点右键', 'Right-click Closed')}];
    if (!paramOk()) { const p = c.params.find(x => x.type === 'trigger');
      if (p) return {at:`#float [data-ar="pname"][data-i="${c.params.indexOf(p)}"]`, label:T('改成 Open，按 Enter', 'Type Open, press Enter')};
      return [{at:H().mi('param_trigger'), label:T('Trigger', 'Trigger')}, {at:'#float [data-ar="addparam"]', label:T('点 + 加一个参数', 'Click + to add a parameter')}]; }
    const tr = transOf();
    if (!tr) { const os = openState(c); if (!os) return null;
      if (document.querySelector('#float .alinkhint')) return {at:node(os), label:T('点 DoorOpen', 'Click DoorOpen')};
      return [{at:H().mi('maketrans'), label:T('建立过渡', 'Make Transition')}, {at:node(cl), label:T('在 Closed 上点右键', 'Right-click Closed')}]; }
    if (!document.querySelector('#float [data-ar="exit"]')) return {at:`#float [data-ar="tr"][data-id="${tr.id}"]`, label:T('点这条箭头', 'Click this arrow')};
    if (tr.exit) return {at:'#float [data-ar="exit"]', label:T('取消勾选', 'Uncheck it')};
    if (!tr.conds.includes('Open')) return tr.conds.length ? {at:'#float [data-ar="cond"]', label:T('选 Open', 'Choose Open')} : {at:'#float [data-ar="addcond"]', label:T('加一个条件', 'Add a condition')};
    return null; },
  body:T('打开 <b>窗口 → 动画 → Animator</b>。Animator 决定「现在播哪段动画」：<br>① 右键空白处新建一个空状态，改名 Closed，右键它「设为默认状态」：一开始门就关着。<br>② 左边「参数」点 +，加一个 Trigger，名字叫 Open。<br>③ 右键 Closed「建立过渡」，再点 DoorOpen。点那条箭头，取消勾选 Has Exit Time，条件选 Open。',
         'Open <b>Window → Animation → Animator</b>. The Animator decides which animation plays now:<br>① Right-click empty space to create an Empty state, rename it Closed, and right-click it → Set as Layer Default State, so the door starts closed.<br>② Under Parameters, click + and add a Trigger named Open.<br>③ Right-click Closed → Make Transition, then click DoorOpen. Click the arrow, uncheck Has Exit Time, and set the condition to Open.'),
  conds:[[T('新建空状态 Closed，设为默认状态（变成橙色）', 'An Empty state named Closed, set as the default (it turns orange)'), closedOk],
         [T('参数：一个叫 Open 的 Trigger', 'Parameter: a Trigger named Open'), paramOk],
         [T('Closed → DoorOpen 的过渡：条件 Open，取消勾选 Has Exit Time', 'A Closed → DoorOpen transition: condition Open, Has Exit Time unchecked'), transOk]],
  hint:T('Has Exit Time 勾着的话，要等前一个状态播到一定位置才会切换，按了 F 门会慢半拍才开。', 'With Has Exit Time checked, the switch waits until the current state reaches a certain point, so the door opens a beat late after you press F.'),
  note:T('点播放看看：门现在乖乖关着了。它在等一个叫 Open 的信号，下面几步用脚本发出这个信号。', 'Press Play: the door now stays shut. It’s waiting for a signal called Open — the next steps send it from a script.'),
  auto:() => { const {c} = buildAnim(); let cl = stNamed(c, 'Closed'); if (!cl) { cl = {id:Date.now() + 2, name:'Closed', clip:null, x:60, y:40}; c.states.push(cl); } cl.clip = null; c.def = cl.id;
    if (!c.params.some(p => p.name === 'Open' && p.type === 'trigger')) c.params.push({name:'Open', type:'trigger'});
    let tr = transOf(); if (!tr) { tr = {id:Date.now() + 3, from:cl.id, to:openState(c).id, exit:true, conds:[]}; c.trans.push(tr); } tr.exit = false; if (!tr.conds.includes('Open')) tr.conds = ['Open']; G.closeFloat(); }},

 // 5
 {title:T('互动系统：看着东西按 F', 'Interaction: look at something, press F'), glow:() => ['#p-hier', '#p-proj'],
  point:() => { const c = cam(); let t = prompt();
    if (!t) { const u = G.S.objs.find(o => o.type === 'uitext' && o.name !== 'Prompt' && o.name !== 'Message'); if (u) return nameIt(u, 'Prompt');
      return viaMenu('#hier-plus', ['ui', 'uitext'], T('点 +，选 UI → 文本', 'Click +, then UI → Text')); }
    if (t.ui.anchor !== 'bc' || !near1(t.ui.y, 140) || t.ui.text !== '' || !near1(t.ui.size, 40)) { const s = selFirst(t); if (s) return s;
      if (t.ui.anchor !== 'bc') return {at:H().field('anchor'), label:T('选 下中', 'Choose Bottom Center')};
      if (!near1(t.ui.x, 0) || !near1(t.ui.y, 140)) return fixNum('ux', 0, t.ui.x) || fixNum('uy', 140, t.ui.y);
      if (t.ui.text !== '') return {at:H().field('utext'), label:T('把字删光', 'Delete all the text')};
      return fixNum('usize', 40, t.ui.size); }
    if (!scriptOk('Interactable')) return scriptFlow('Interactable', null);
    const sf = scriptFlow('Interact', c); if (sf) return sf;
    return refSlot(c, 'Interact', 'prompt', t); },
  body:T('做一个所有互动共用的系统：<br>① 屏幕下方放一个空的 UI 文本 Prompt，用来显示「按 F……」。<br>② 新建脚本 <b>Interactable</b>：「可以互动的东西」的共同模板，手电筒、钥匙、门都会继承它。<br>③ 新建脚本 <b>Interact</b>（填空），挂到主摄像机上：从眼睛往前射一条线，打中可以互动的东西就显示提示，按 F 就使用它。',
         'Build one interaction system for everything:<br>① An empty UI Text called Prompt at the bottom of the screen, to show “Press F…”.<br>② A script named <b>Interactable</b>: the shared template for things you can use. The flashlight, key and door will all inherit it.<br>③ A script named <b>Interact</b> (fill in the blanks) on the Main Camera: it shoots a line from your eyes, shows a hint when it hits something interactable, and uses it when you press F.'),
  conds:[[T('UI 文本 Prompt：锚点 下中，位置 0、140，字删光，字号 40', 'UI Text named Prompt: anchor Bottom Center, position 0, 140, text deleted, Font Size 40'),
          () => { const t = prompt(); return !!t && t.ui.anchor === 'bc' && near1(t.ui.y, 140) && t.ui.text === '' && near1(t.ui.size, 40); }],
         [T('新建脚本 Interactable', 'Create a script named Interactable'), () => scriptOk('Interactable')],
         [T('新建脚本 Interact，填好 2 个空，挂到主摄像机上', 'Create a script named Interact, fill in 2 blanks, and put it on the Main Camera'), () => scriptOk('Interact') && !!scriptOn(cam(), 'Interact')],
         [T('把 Prompt 拖进 Interact 的 Prompt 格子', 'Drag Prompt into Interact’s Prompt slot'), () => refOk(cam(), 'Interact', 'prompt', prompt())]],
  hint:T('先建 Interact 也可以，但会看到红字「找不到 Interactable」：脚本用到的东西必须先存在。', 'You can create Interact first, but you’ll get a red error saying Interactable can’t be found: what a script uses has to exist first.'),
  auto:() => { const c = cam(); let t = prompt();
    if (!t) { t = G.S.objs.find(o => o.type === 'uitext' && o.name !== 'Message'); }
    if (!t) { const cv = G.S.objs.find(o => o.type === 'canvas'); t = G.mkObj('uitext', 'Prompt'); t.parent = cv ? cv.id : null; t.ui = {anchor:'bc', x:0, y:140, w:900, h:60, text:'', size:40, color:'#ffffff'}; }
    t.name = 'Prompt'; Object.assign(t.ui, {anchor:'bc', x:0, y:140, text:'', size:40, w:Math.max(t.ui.w, 900)});
    ensureScript('Interactable'); if (c) { const s = attach(c, 'Interact'); s.vals.prompt = t.id; } }},

 // 6
 {title:T('把手电筒放到地上', 'Put the flashlight on the floor'), glow:() => ['#p-hier', '#p-insp'],
  enter:() => { G.setView([0, 0, -3], 9, -30, 45); },
  point:() => { let t = torch();
    if (!t) { const c = G.S.objs.find(o => o.type === 'cylinder'); if (c) return nameIt(c, 'Torch'); return viaMenu('#hier-plus', ['go3d', 'cylinder'], T('点 +，选 3D 对象 → 圆柱体', 'Click +, then 3D Object → Cylinder')); }
    const n = nameIt(t, 'Torch'); if (n) return n;
    const s = (!G.near(t.pos, [.6, .08, -2.5]) || !G.near(t.rot, [0, 0, 90]) || !G.near(G.effScale(t), [.15, .2, .15])) && (selFirst(t) || fix('scl', [.15, .2, .15], G.effScale(t)) || fix('rot', [0, 0, 90], t.rot) || fix('pos', [.6, .08, -2.5], t.pos)); if (s) return s;
    const f = flash(); if (f && f.light.enabled !== false) return selFirst(f) || {at:H().field('len'), label:T('取消勾选灯光组件', 'Uncheck the Light component')};
    return null; },
  body:T('开场时手里没有手电筒：在玩家前面的地上放一支（一个小圆柱体，叫 Torch）。再把手里那支（主摄像机下面的 Flashlight）的灯光关掉：取消勾选检查器里 <b>灯光</b> 组件名字旁边的勾。',
         'You start without a flashlight: put one on the floor in front of the player (a small Cylinder named Torch). Then switch off the one in your hand (Flashlight, under the Main Camera): uncheck the box next to the <b>Light</b> component in the Inspector.'),
  conds:[[T('圆柱体 Torch：缩放 0.15、0.2、0.15，旋转 0、0、90（横躺），位置 0.6、0.08、-2.5', 'A Cylinder named Torch: Scale 0.15, 0.2, 0.15, Rotation 0, 0, 90 (lying down), Position 0.6, 0.08, -2.5'),
          () => !!torch() && torch().type === 'cylinder' && G.near(torch().pos, [.6, .08, -2.5]) && G.near(torch().rot, [0, 0, 90]) && G.near(G.effScale(torch()), [.15, .2, .15])],
         [T('选中 Flashlight，取消勾选灯光组件（游戏一开始是黑的）', 'Select Flashlight and uncheck its Light component (it’s dark at the start)'), () => !!flash() && flash().light.enabled === false]],
  hint:T('组件的勾只关掉那一个组件（灯不亮，但物体还在）。名字旁边的勾会关掉整个物体。', 'A component’s checkbox turns off just that component (no light, but the object is still there). The checkbox by the name turns off the whole object.'),
  auto:() => { let t = torch() || G.mkObj('cylinder', 'Torch'); t.name = 'Torch'; t.pos = [.6, .08, -2.5]; t.rot = [0, 0, 90]; t.scale = [.15, .2, .15]; t.scaleOverride = false; const f = flash(); if (f) f.light.enabled = false; G.select('obj', t.id); }},

 // 7
 {title:T('按 F 捡起手电筒', 'Press F to pick up the flashlight'), glow:() => G.S.playing ? ['#playbtn'] : ['#p-proj', '#p-insp'], play:true,
  point:() => { const t = torch(), f = flash(); if (!t) return null;
    if (!G.S.playing) { const sf = scriptFlow('FlashlightPickup', t); if (sf) return sf; const r = f && refSlot(t, 'FlashlightPickup', 'flashlight', f); if (r) return r; }
    return playStep(G.S.flags.torchTaken, {at:'#cwrap', label:T('低头看着地上的手电筒，按 F', 'Look down at the flashlight and press F')}); },
  body:T('新建脚本 <b>FlashlightPickup</b>，挂到 Torch 上，把 Flashlight 拖进格子。它继承 Interactable，所以 Interact 认得它。点播放：低头看着地上的手电筒，屏幕下方会出现提示，按 F：地上那支不见了，手里的灯亮了。',
         'Create a script named <b>FlashlightPickup</b>, put it on Torch, and drag Flashlight into its slot. It inherits Interactable, so Interact recognizes it. Press Play, look down at the flashlight — a hint appears at the bottom — and press F: the one on the floor disappears and the light in your hand comes on.'),
  conds:[[T('新建脚本 FlashlightPickup，挂到 Torch 上', 'Create a script named FlashlightPickup and put it on Torch'), () => !!scriptOn(torch(), 'FlashlightPickup') && scriptOk('FlashlightPickup')],
         [T('把 Flashlight 拖进 Flashlight 格子', 'Drag Flashlight into the Flashlight slot'), () => refOk(torch(), 'FlashlightPickup', 'flashlight', flash())],
         [T('点播放，看着手电筒按 F，捡起来', 'Press Play, look at the flashlight, and press F to pick it up'), () => G.S.flags.torchTaken]],
  hint:T('Prompt Text 是看着它时显示的字，可以在检查器里改。真 Unity 的默认字体没有中文，所以这里先用英文。', 'Prompt Text is what shows while you look at it — change it in the Inspector. Real Unity’s default font has no Chinese characters, so English is used here.'),
  note:T('「捡起来」其实是个小把戏：把地上那支藏起来（SetActive），再把手里那支打开（enabled）。游戏里很多「捡东西」都是这样做的。', 'Picking it up is a little trick: hide the one on the floor (SetActive) and switch on the one in your hand (enabled). Lots of games do pickups this way.'),
  auto:() => { if (G.S.playing) G.stopPlay(); const t = torch(), f = flash(); if (!t) return; const s = attach(t, 'FlashlightPickup'); if (f) s.vals.flashlight = f.id; G.S.flags.torchTaken = true; G.select('obj', t.id); }},

 // 8
 {title:T('钥匙', 'The key'), glow:() => ['#p-hier', '#p-proj'],
  enter:() => { G.setView([-1, 0, 4], 8, -40, 45); },
  point:() => { let k = keyO();
    if (!k) { const c = G.S.objs.find(o => o.type === 'cube' && !/^wall/i.test(o.name) && o.name !== 'Door' && o.name !== 'Key'); if (c && /^(cube|立方体)/i.test(c.name)) return nameIt(c, 'Key');
      return viaMenu('#hier-plus', ['go3d', 'cube'], T('点 +，选 3D 对象 → 立方体', 'Click +, then 3D Object → Cube')); }
    const n = nameIt(k, 'Key'); if (n) return n;
    const s = (!G.near(k.pos, [-1.2, .05, 4.8]) || !G.near(G.effScale(k), [.12, .06, .35])) && (selFirst(k) || fix('scl', [.12, .06, .35], G.effScale(k)) || fix('pos', [-1.2, .05, 4.8], k.pos)); if (s) return s;
    const m = G.matOf(k); if (!m || !isGold(m.color)) { const km = G.mats().find(x => /key/i.test(x.name));
      if (G.S.renaming != null) return {at:'#rn', label:T('输入 Key_Mat，按 Enter', 'Type Key_Mat, press Enter')};
      if (!km) return viaMenu('#proj-plus', ['create', 'mat'], T('点 +，选 创建 → 材质（名字 Key_Mat）', 'Click +, then Create → Material (name: Key_Mat)'));
      const r = H().reach(km); if (r.nav) return r;
      if (!isGold(km.color)) return H().isSel(km) ? {at:'#insp-body [data-c="#f2c230"]', label:T('点金黄色', 'Pick gold')} : {at:r.at, label:T('点选这个材质', 'Select this material')};
      return {from:r.at, to:H().row(k.id), label:T('拖到 Key 上', 'Drag onto Key')}; }
    return scriptFlow('KeyPickup', k); },
  body:T('在走廊转角的地上放一把钥匙：一个扁扁的金色小方块。新建脚本 <b>KeyPickup</b> 挂上去。它也继承 Interactable；按 F 时把 <code>KeyPickup.hasKey</code> 设成 true，再把自己藏起来。',
         'Put a key on the floor at the corridor corner: a small, flat, gold cube. Create a script named <b>KeyPickup</b> and put it on. It also inherits Interactable; pressing F sets <code>KeyPickup.hasKey</code> to true and hides the key.'),
  conds:[[T('立方体 Key：缩放 0.12、0.06、0.35，位置 -1.2、0.05、4.8（转角）', 'A Cube named Key: Scale 0.12, 0.06, 0.35, Position -1.2, 0.05, 4.8 (at the corner)'), () => !!keyO() && G.near(keyO().pos, [-1.2, .05, 4.8]) && G.near(G.effScale(keyO()), [.12, .06, .35])],
         [T('新建材质 Key_Mat，选金黄色，用在 Key 上', 'Create a material Key_Mat in gold and put it on Key'), () => !!keyO() && !!G.matOf(keyO()) && isGold(G.matOf(keyO()).color)],
         [T('新建脚本 KeyPickup，挂到 Key 上', 'Create a script named KeyPickup and put it on Key'), () => !!scriptOn(keyO(), 'KeyPickup') && scriptOk('KeyPickup')]],
  hint:T('static 的变量整个游戏只有一份，所以别的脚本可以直接写 KeyPickup.hasKey 来问「拿到钥匙了吗」。', 'A static variable exists only once for the whole game, so other scripts can simply ask KeyPickup.hasKey.'),
  auto:() => { let k = keyO() || G.mkObj('cube', 'Key'); k.name = 'Key'; k.pos = [-1.2, .05, 4.8]; k.scale = [.12, .06, .35]; k.scaleOverride = false;
    const f = G.S.assets.find(x => x.type === 'folder' && x.name === 'Materials' && x.parent === 0) || G.mkAsset('folder', 'Materials', 0);
    const km = G.mats().find(x => /key/i.test(x.name)) || G.mkAsset('material', 'Key_Mat', f.id, {color:'#f2c230'}); if (!isGold(km.color)) km.color = '#f2c230'; k.mat = km.id;
    attach(k, 'KeyPickup'); G.select('obj', k.id); }},

 // 9
 {title:T('锁着的门', 'The locked door'), glow:() => G.S.playing ? ['#playbtn'] : ['#p-proj', '#p-hier'], play:true,
  enter:() => { G.setView([11, 0, 3], 14, -40, 40); },
  point:() => { const h = hinge(), F = G.S.flags; if (!h) return null;
    if (!G.S.playing) { const sf = scriptFlow('LockedDoor', h); if (sf) return sf; }
    if (!F.lockedSeen) return playStep(false, {at:'#cwrap', label:T('先别拿钥匙，走到门前看着门按 F', 'Without the key, walk to the door, look at it and press F')});
    return playStep(F.doorUsed && F.animDone, {at:'#cwrap', label:T(F.keyTaken ? '回到门前按 F' : '去转角拿钥匙（按 F），再回来开门', F.keyTaken ? 'Go back to the door and press F' : 'Get the key at the corner (F), then come back')}); },
  body:T('新建脚本 <b>LockedDoor</b>，挂到 DoorHinge 上（有 Animator 的那个）。没钥匙时按 F，提示变成「Locked」；有钥匙时按 F，它会 <code>animator.SetTrigger("Open")</code>：Animator 收到 Open，就从 Closed 切到 DoorOpen，门打开。',
         'Create a script named <b>LockedDoor</b> and put it on DoorHinge (the one with the Animator). Press F without the key and the hint changes to “Locked”. With the key, it calls <code>animator.SetTrigger("Open")</code>: the Animator gets Open, switches from Closed to DoorOpen, and the door swings open.'),
  conds:[[T('新建脚本 LockedDoor，挂到 DoorHinge 上', 'Create a script named LockedDoor and put it on DoorHinge'), () => !!scriptOn(hinge(), 'LockedDoor') && scriptOk('LockedDoor')],
         [T('点播放：没钥匙时看着门按 F，提示「锁着」', 'Press Play: without the key, look at the door and press F — it says locked'), () => G.S.flags.lockedSeen],
         [T('拿到钥匙后，再看着门按 F，门打开', 'After getting the key, look at the door and press F — it opens'), () => G.S.flags.doorUsed && G.S.flags.animDone]],
  hint:T('射线打中的是 Door（门板），脚本却在它的父物体 DoorHinge 上。没关系：Interact 用的是 GetComponentInParent，会往上找。', 'The ray hits Door (the panel), but the script is on its parent DoorHinge. That’s fine: Interact uses GetComponentInParent, which searches upward.'),
  auto:() => { if (G.S.playing) G.stopPlay(); const h = hinge(); if (h) attach(h, 'LockedDoor'); Object.assign(G.S.flags, {lockedSeen:true, doorUsed:true, animDone:true, keyTaken:true}); }},

 // 10
 {title:T('鬼（先藏起来）', 'A ghost (hidden for now)'), glow:() => ['#p-hier', '#p-proj', '#p-insp'],
  enter:() => { G.setView([6, 0, 3], 12, -40, 40); },
  point:() => { let g = ghost();
    if (!g) { const c = G.S.objs.find(o => o.type === 'capsule' && o.name !== 'Player' && o.name !== 'Monster'); if (c) return nameIt(c, 'Ghost');
      return viaMenu('#hier-plus', ['go3d', 'capsule'], T('点 +，选 3D 对象 → 胶囊', 'Click +, then 3D Object → Capsule')); }
    const n = nameIt(g, 'Ghost'); if (n) return n;
    if (!G.near(g.pos, [8, 1, 4])) return selFirst(g) || fix('pos', [8, 1, 4], g.pos);
    const m = G.matOf(g);
    if (!m || m.shader !== 'URP/Unlit' || lum(m.color) < .75) { const gm = G.mats().find(x => /ghost/i.test(x.name));
      if (G.S.renaming != null) return {at:'#rn', label:T('输入 Ghost_Mat，按 Enter', 'Type Ghost_Mat, press Enter')};
      if (!gm) return viaMenu('#proj-plus', ['create', 'mat'], T('点 +，选 创建 → 材质（名字 Ghost_Mat）', 'Click +, then Create → Material (name: Ghost_Mat)'));
      const r = H().reach(gm); if (r.nav) return r;
      if (gm.shader !== 'URP/Unlit') return H().isSel(gm) ? {at:H().field('shader'), label:T('选 URP/Unlit', 'Choose URP/Unlit')} : {at:r.at, label:T('点选这个材质', 'Select this material')};
      if (lum(gm.color) < .75) return H().isSel(gm) ? {at:'#insp-body [data-c="#ffffff"]', label:T('点白色', 'Pick white')} : {at:r.at, label:T('点选这个材质', 'Select this material')};
      return {from:r.at, to:H().row(g.id), label:T('拖到 Ghost 上', 'Drag onto Ghost')}; }
    if (g.active !== false) return selFirst(g) || {at:H().field('active'), label:T('取消勾选', 'Uncheck it')};
    return null; },
  body:T('在走廊第二段放一个白色的人影：胶囊 Ghost。材质用 <b>URP/Unlit</b> 着色器：不受灯光影响，在黑暗里也亮得发白，很吓人。最后取消勾选检查器里名字旁边的勾，把它整个藏起来，等着吓人。',
         'Put a pale figure in the second part of the corridor: a Capsule named Ghost. Give it a material with the <b>URP/Unlit</b> shader: it ignores lighting, so it glows white even in the dark — creepy. Finally uncheck the box next to its name in the Inspector to hide it completely until the scare.'),
  conds:[[T('胶囊 Ghost，位置 8、1、4', 'A Capsule named Ghost at 8, 1, 4'), () => !!ghost() && ghost().type === 'capsule' && G.near(ghost().pos, [8, 1, 4])],
         [T('材质 Ghost_Mat：着色器 URP/Unlit，颜色白色', 'Material Ghost_Mat: shader URP/Unlit, color white'), () => { const m = ghost() && G.matOf(ghost()); return !!m && m.shader === 'URP/Unlit' && lum(m.color) >= .75; }],
         [T('取消勾选 Ghost 名字旁边的勾（藏起来）', 'Uncheck the box next to Ghost’s name (hide it)'), () => !!ghost() && ghost().active === false]],
  hint:T('藏起来的物体在层级里会变灰。它还在场景里，只是看不见、碰不到，脚本也不跑。', 'A hidden object turns gray in the Hierarchy. It’s still in the scene — just invisible, untouchable, and its scripts don’t run.'),
  auto:() => { let g = ghost() || G.mkObj('capsule', 'Ghost'); g.name = 'Ghost'; g.pos = [8, 1, 4];
    const f = G.S.assets.find(x => x.type === 'folder' && x.name === 'Materials' && x.parent === 0) || G.mkAsset('folder', 'Materials', 0);
    const gm = G.mats().find(x => /ghost/i.test(x.name)) || G.mkAsset('material', 'Ghost_Mat', f.id, {color:'#ffffff'}); gm.shader = 'URP/Unlit'; if (lum(gm.color) < .75) gm.color = '#ffffff'; g.mat = gm.id; g.active = false; G.select('obj', g.id); }},

 // 11
 {title:T('吓人区和尖叫声', 'The scare zone and a scream'), glow:() => ['#p-hier', '#p-insp'],
  point:() => { let z = zone();
    if (!z) { const e = freshEmpty(); if (e) return nameIt(e, 'ScareZone'); return viaMenu('#hier-plus', ['empty'], T('点 +，选 创建空物体', 'Click +, then Create Empty')); }
    const n = nameIt(z, 'ScareZone'); if (n) return n;
    if (!isTriggerBox(z, [5, 1.5, 4], [2, 3, 3.5])) return selFirst(z) || fix('pos', [5, 1.5, 4], z.pos) || fix('scl', [2, 3, 3.5], G.effScale(z)) ||
      (!z.col ? compMenu('physics', 'boxCol', T('添加组件 → 物理 → 盒状碰撞体', 'Add Component → Physics → Box Collider')) : {at:H().field('trig'), label:T('勾选「是触发器」', 'Check Is Trigger')});
    const sc = clipA('Scream');
    if (!z.audio) return selFirst(z) || compMenu('audiocat', 'audiosrc', T('添加组件 → 音频 → 音频源', 'Add Component → Audio → Audio Source'));
    if (sc && z.audio.clip !== sc.id) { const r = H().reach(sc); if (r.nav) return r; return selFirst(z) || {from:r.at, to:`#insp-body [data-drop="aclip:${z.id}"]`, label:T('把 Scream 拖进音频格子', 'Drag Scream into the Audio slot')}; }
    if (z.audio.awake) return selFirst(z) || {at:H().field('aawake'), label:T('取消勾选', 'Uncheck it')};
    return null; },
  body:T('在鬼前面一段放一个看不见的触发区 ScareZone。再给它加一个音频源，放进 Audio 文件夹里的 Scream（尖叫），取消勾选「唤醒时播放」：只在吓人的那一刻才响。',
         'Put an invisible trigger zone called ScareZone a little before the ghost. Give it an Audio Source with Scream from the Audio folder, and uncheck Play On Awake so it only sounds at the moment of the scare.'),
  conds:[[T('空物体 ScareZone：位置 5、1.5、4，缩放 2、3、3.5，盒状碰撞体勾选「是触发器」', 'An Empty named ScareZone at 5, 1.5, 4, Scale 2, 3, 3.5, with a Box Collider set to Is Trigger'), () => isTriggerBox(zone(), [5, 1.5, 4], [2, 3, 3.5])],
         [T('加音频源，音频选 Scream，取消勾选「唤醒时播放」', 'Add an Audio Source with Scream, and uncheck Play On Awake'), () => { const z = zone(), c = clipA('Scream'); return !!z && !!z.audio && !!c && z.audio.clip === c.id && !z.audio.awake; }]],
  hint:T('空间混合保持 0（2D）：吓人的声音要在耳边，不要分远近。', 'Keep Spatial Blend at 0 (2D): a scare sound should be right in your ears, not far away.'),
  auto:() => { let z = zone() || G.mkObj('empty', 'ScareZone'); z.name = 'ScareZone'; z.pos = [5, 1.5, 4]; z.scale = [2, 3, 3.5]; z.col = {kind:'box', trigger:true, seq:Date.now()};
    if (!z.audio) z.audio = audioDef(); const c = clipA('Scream') || (G.importSound('scream'), clipA('Scream')); Object.assign(z.audio, {clip:c.id, awake:false, blend:0}); G.select('obj', z.id); }},

 // 12
 {title:T('Jumpscare 脚本（协程）', 'The Jumpscare script (a coroutine)'), glow:() => G.S.playing ? ['#playbtn'] : ['#p-proj', '#p-insp'], play:true,
  point:() => { const z = zone(), g = ghost(), c = cam(); if (!z) return null;
    if (!G.S.playing) { const sf = scriptFlow('Jumpscare', z); if (sf) return sf; const r1 = g && refSlot(z, 'Jumpscare', 'ghost', g); if (r1) return r1; const r2 = c && refSlot(z, 'Jumpscare', 'cam', c); if (r2) return r2; }
    return playStep(G.S.flags.scared, {at:'#cwrap', label:T('走进走廊第二段', 'Walk into the second part of the corridor')}); },
  body:T('新建脚本 <b>Jumpscare</b>（填 2 个空），挂到 ScareZone 上，把 Ghost 和主摄像机拖进格子。它用 <b>协程</b>：鬼出现 → 尖叫 → 镜头抖 0.6 秒 → 鬼消失。协程可以「等一下再继续」，不会让画面卡住。',
         'Create a script named <b>Jumpscare</b> (2 blanks), put it on ScareZone, and drag Ghost and the Main Camera into its slots. It uses a <b>coroutine</b>: ghost appears → scream → the camera shakes for 0.6 seconds → the ghost vanishes. A coroutine can pause and continue later without freezing the game.'),
  conds:[[T('新建脚本 Jumpscare，填好 2 个空，挂到 ScareZone 上', 'Create a script named Jumpscare, fill in 2 blanks, and put it on ScareZone'), () => !!scriptOn(zone(), 'Jumpscare') && scriptOk('Jumpscare')],
         [T('把 Ghost 拖进 Ghost 格子，主摄像机拖进 Cam 格子', 'Drag Ghost into Ghost and Main Camera into Cam'), () => refOk(zone(), 'Jumpscare', 'ghost', ghost()) && refOk(zone(), 'Jumpscare', 'cam', cam())],
         [T('点播放，走进去，被吓一跳', 'Press Play, walk in, and get scared'), () => G.S.flags.scared]],
  hint:T('门已经锁上了，所以不用急；吓完之后鬼又藏起来了，只吓一次（done 变量）。', 'The door is locked, so no rush. After the scare the ghost hides again, and it only happens once (the done variable).'),
  auto:() => { if (G.S.playing) G.stopPlay(); const z = zone(); if (!z) return; const s = attach(z, 'Jumpscare'); if (ghost()) s.vals.ghost = ghost().id; if (cam()) s.vals.cam = cam().id; G.S.flags.scared = true; G.select('obj', z.id); }},

 // 13
 {title:T('美化：红光一闪', 'Polish: a flash of red light'), glow:() => G.S.playing ? ['#playbtn'] : ['#p-hier', '#p-insp'], play:true,
  point:() => { const z = zone(); let l = sLight();
    if (!G.S.playing) {
      if (!l) { const pl = G.S.objs.find(o => o.type === 'light' && o.light && o.light.kind === 'point' && o.name !== 'Lamp'); if (pl) return nameIt(pl, 'ScareLight');
        return viaMenu('#hier-plus', ['lightm', 'pointlight'], T('点 +，选 灯光 → 点光源', 'Click +, then Light → Point Light')); }
      const n = nameIt(l, 'ScareLight'); if (n) return n;
      const s = selFirst(l) || fix('pos', [7, 2.5, 4], l.pos) || (!isRed(l.light.color) && {at:'#insp-body [data-act="setc"][data-c="#ff3b2f"]', label:T('点红色', 'Pick red')}) || fixNum('lint', 4, l.light.intensity) || (l.light.enabled !== false && {at:H().field('len'), label:T('取消勾选灯光组件', 'Uncheck the Light component')});
      if (s) return s; const r = z && refSlot(z, 'Jumpscare', 'scareLight', l); if (r) return r; }
    return playStep(G.S.flags.scaredLit, {at:'#cwrap', label:T('再走进去一次', 'Walk in again')}); },
  body:T('吓人的那一刻加一道红光：新建点光源 ScareLight，红色、强度 4，先关掉（取消勾选灯光组件），再拖进 Jumpscare 的 Scare Light 格子。脚本里写了 <code>if (scareLight != null)</code>：格子空着也不会报错，拖进去了才会用。',
         'Add a red flash at the moment of the scare: create a Point Light named ScareLight, red, Intensity 4, switch it off (uncheck the Light component), and drag it into Jumpscare’s Scare Light slot. The script says <code>if (scareLight != null)</code>, so an empty slot is fine — it’s only used once you fill it.'),
  conds:[[T('点光源 ScareLight：位置 7、2.5、4，红色，强度 4，取消勾选灯光组件', 'A Point Light named ScareLight at 7, 2.5, 4, red, Intensity 4, with its Light component unchecked'),
          () => { const l = sLight(); return !!l && !!l.light && l.light.kind === 'point' && G.near(l.pos, [7, 2.5, 4]) && isRed(l.light.color) && near1(l.light.intensity, 4) && l.light.enabled === false; }],
         [T('把 ScareLight 拖进 Jumpscare 的 Scare Light 格子', 'Drag ScareLight into Jumpscare’s Scare Light slot'), () => refOk(zone(), 'Jumpscare', 'scareLight', sLight())],
         [T('点播放，再被吓一次', 'Press Play and get scared again'), () => G.S.flags.scaredLit]],
  hint:T('好的 Jumpscare = 突然的画面 + 突然的声音 + 一点点镜头抖动。三样一起，比单独一样吓人得多。', 'A good jumpscare = a sudden image + a sudden sound + a little camera shake. All three together are far scarier than any one alone.'),
  auto:() => { if (G.S.playing) G.stopPlay(); let l = sLight(); if (!l) { l = G.mkObj('light', 'ScareLight'); l.light = G.mkLight('point'); } l.name = 'ScareLight'; l.light.kind = 'point'; l.pos = [7, 2.5, 4];
    Object.assign(l.light, {color:'#ff3b2f', intensity:4, range:10, enabled:false}); const z = zone(); if (z) { const s = attach(z, 'Jumpscare'); s.vals.scareLight = l.id; } G.S.flags.scaredLit = true; G.select('obj', l.id); }},

 // 14
 {title:T('放出怪物，保存', 'Release the monster and save'), glow:() => ['#p-hier', '#menu-file'],
  point:() => { const m = monster(); if (m && m.active === false) return selFirst(m) || {at:H().field('active'), label:T('勾选', 'Check it')};
    return [{at:H().mi('save'), label:T('点保存', 'Click Save')}, {at:'#menu-file', label:T('点 文件 → 保存', 'File → Save')}]; },
  body:T('开场时怪物是关着的，方便你练习。现在勾选 Monster 名字旁边的勾，把它放出来，保存场景，然后完整玩一遍：捡手电筒 → 去转角拿钥匙 → 被吓一跳 → 开门逃出去。',
         'The monster was switched off at the start so you could practise. Now check the box next to Monster’s name to release it, save the scene, and play the whole thing: grab the flashlight → get the key at the corner → get scared → open the door and escape.'),
  conds:[[T('勾选 Monster 名字旁边的勾', 'Check the box next to Monster’s name'), () => !!monster() && monster().active !== false],
         [T('保存场景', 'Save the scene'), () => G.S.flags.saved && !G.S.dirty]],
  hint:T('怪物太快就把它的 Start Delay 调大，或者把钥匙放近一点。', 'If the monster is too fast, raise its Start Delay or move the key closer.'),
  auto:() => { if (G.S.playing) G.stopPlay(); const m = monster(); if (m) m.active = true; G.saveScene(); }},
];

const FINISH = {
 zh:`<div class="finish"><div class="gstep">完成</div><h2>第 1 章下篇完成：会互动的恐怖游戏</h2>
<p>你做了一套互动系统（射线 + 继承），按 F 捡手电筒和钥匙；用动画窗口录了开门动画，用 Animator 控制它什么时候播；还用协程做了一个 Jumpscare。</p>
<div class="note">想再练练？主页的「第 1 章下篇 · 找 Bug 挑战」已经解锁。下一个课程：主菜单和暂停菜单。</div>
<div class="gact"><button class="btn primary" data-act="quiz">章末小测验</button><button class="btn" data-act="export">导出到真 Unity</button><button class="btn" data-act="reset">再玩一遍</button><button class="btn quiet" data-act="home">回到主页</button></div></div>`,
 en:`<div class="finish"><div class="gstep">Done</div><h2>Chapter 1 part 2 complete: an interactive horror game</h2>
<p>You built an interaction system (a raycast plus inheritance) to pick up a flashlight and a key with F, recorded a door animation in the Animation window and controlled it with an Animator, and made a jumpscare with a coroutine.</p>
<div class="note">Want more practice? “Chapter 1 part 2 · Bug Hunt” is now unlocked on the home screen. Next course: a main menu and a pause menu.</div>
<div class="gact"><button class="btn primary" data-act="quiz">Chapter quiz</button><button class="btn" data-act="export">Export to real Unity</button><button class="btn" data-act="reset">Play again</button><button class="btn quiet" data-act="home">Back to home</button></div></div>`};

// 开场：第 1 章做完的走廊。怪物先关掉；多一个 Scream 声音
function setup() {
  const ch1 = G.chapters.ch1; ch1.setup(); ch1.steps.forEach(st => st.auto()); G.closeFloat(); G.select(null);
  const m = monster(); if (m) m.active = false;
  if (!clipA('Scream')) { const f = G.S.assets.find(x => x.type === 'folder' && x.name === 'Audio' && x.parent === 0); G.mkAsset('audio', 'Scream', f ? f.id : 0, {clip:'scream'}); }
  Object.keys(G.S.flags).forEach(k => { if (typeof G.S.flags[k] === 'boolean') G.S.flags[k] = false; }); G.S.flags.steps = 0; G.S.flags.win = [];
  G.S.cwd = 0; G.S.tab = 'scene'; G.setView([4, 0, -2], 30, -35, 48);
}

// 找 Bug 挑战：做完整个下篇，再弄坏 4 个地方
const BUGS = {
 setup:() => {
  setup(); STEPS.forEach(st => { if (st.enter) st.enter(); st.auto(); }); G.closeFloat(); G.select(null);
  Object.keys(G.S.flags).forEach(k => { if (typeof G.S.flags[k] === 'boolean') G.S.flags[k] = false; });
  const c = ctrlOf(hinge()); if (c) { const os = openState(c); if (os) c.def = os.id; const p = c.params.find(x => x.name === 'Open'); if (p) p.name = 'open'; c.trans.forEach(tr => { tr.conds = tr.conds.map(n => n === 'Open' ? 'open' : n); }); }
  const t = torch(); if (t) t.col = null;
  const g = ghost(); if (g) g.active = true; },
 list:[
  {title:T('一按播放，门就自己打开了', 'The door opens by itself as soon as you press Play'),
   hint:T('打开 Animator 窗口：哪个状态是橙色（默认）的？门一开始应该在 Closed。', 'Open the Animator window: which state is orange (the default)? The door should start in Closed.'),
   check:() => { const c = ctrlOf(hinge()), d = c && c.states.find(s => s.id === c.def); return !!d && d.clip == null; }},
  {title:T('看着地上的手电筒，没有任何提示', 'Looking at the flashlight on the floor shows no hint'),
   hint:T('射线只打得到有碰撞体的东西。选中 Torch，看看它有没有碰撞体。', 'A raycast only hits objects with colliders. Select Torch and check whether it has one.'),
   check:() => !!torch() && !!torch().col},
  {title:T('拿了钥匙，门还是打不开（控制台有黄字）', 'With the key, the door still won’t open (yellow warning in the Console)'),
   hint:T('脚本里写的是 SetTrigger("Open")。去 Animator 窗口看看参数的名字，大小写要一模一样，过渡的条件也要跟着改。', 'The script calls SetTrigger("Open"). Check the parameter’s name in the Animator window — the capitals must match — and fix the transition’s condition too.'),
   check:() => { const c = ctrlOf(hinge()); if (!c || !c.params.some(p => p.name === 'Open' && p.type === 'trigger')) return false; const os = openState(c); return c.trans.some(tr => os && tr.to === os.id && tr.conds.includes('Open')); }},
  {title:T('鬼一直站在走廊里，一点都不吓人', 'The ghost just stands in the corridor — not scary at all'),
   hint:T('它应该一开始藏起来，被吓的时候才出现。选中 Ghost，看名字旁边的勾。', 'It should be hidden at first and only appear for the scare. Select Ghost and look at the checkbox next to its name.'),
   check:() => !!ghost() && ghost().active === false}]};

const QUIZ = [
 {q:T('想让门绕着边转，而不是绕中心转，要怎么做？', 'How do you make a door swing on its edge instead of spinning around its center?'),
  o:[T('把旋转改成 180', 'Set its rotation to 180'), T('把门放进一个放在门边的空物体里，转那个空物体', 'Put the door inside an empty object at its edge and turn that'), T('给门加刚体', 'Add a Rigidbody'), T('把门缩放成 0', 'Scale the door to 0')], a:1,
  w:T('物体绕着轴心转。空物体当门轴，门是它的子物体，转门轴门就绕着边开。', 'Objects turn around their pivot. With an empty as the hinge and the door as its child, turning the hinge swings the door on its edge.')},
 {q:T('门的动画一直重复开开关关，要改哪里？', 'The door animation keeps opening and snapping shut over and over. What do you change?'),
  o:[T('把动画剪辑的 Loop Time 取消勾选', 'Uncheck Loop Time on the animation clip'), T('删掉 Animator', 'Delete the Animator'), T('把时间改成 0', 'Set the time to 0'), T('重新开 Unity', 'Restart Unity')], a:0,
  w:T('Loop Time 勾着，剪辑播完会从头再来。开门只要播一次。', 'With Loop Time on, the clip starts over when it ends. A door only needs to open once.')},
 {q:T('Animator 的「默认状态」（橙色的那个）是什么意思？', 'What does the Animator’s default state (the orange one) mean?'),
  o:[T('最好看的动画', 'The best-looking animation'), T('最后播的动画', 'The last animation to play'), T('一开始就播的状态', 'The state it starts in'), T('出错时播的动画', 'The animation played on errors')], a:2,
  w:T('所以门要先待在 Closed（空状态），收到 Open 才切到 DoorOpen。', 'That’s why the door starts in Closed (an empty state) and only switches to DoorOpen when it gets Open.')},
 {q:T('SetActive(false) 和 enabled = false 有什么不一样？', 'What’s the difference between SetActive(false) and enabled = false?'),
  o:[T('完全一样', 'They’re identical'), T('SetActive 关掉整个物体，enabled 只关掉一个组件', 'SetActive turns off the whole object; enabled turns off one component'), T('enabled 会删掉物体', 'enabled deletes the object'), T('SetActive 只在编辑器里有用', 'SetActive only works in the editor')], a:1,
  w:T('捡手电筒就用了两种：地上那支 SetActive(false)，手里那支的灯 enabled = true。', 'Picking up the flashlight used both: SetActive(false) on the one on the floor, enabled = true on the light in your hand.')},
 {q:T('协程里的 yield return null; 是什么意思？', 'In a coroutine, what does yield return null; mean?'),
  o:[T('结束游戏', 'End the game'), T('返回空的东西，什么都不做', 'Return nothing and do nothing'), T('先停在这里，下一帧再继续', 'Pause here and continue next frame'), T('报一个错', 'Throw an error')], a:2,
  w:T('所以 while 循环可以一帧一帧地抖镜头，而不会让游戏卡住。', 'That’s how the while loop shakes the camera frame by frame without freezing the game.')},
 {q:T('FlashlightPickup 为什么要写成 : Interactable？', 'Why is FlashlightPickup written as : Interactable?'),
  o:[T('Unity 规定的', 'Unity requires it'), T('为了让它跑得更快', 'To make it run faster'), T('继承之后，Interact 可以用同一种方法找到它、调用它的 Use', 'By inheriting, Interact can find it the same way and call its Use'), T('为了改它的颜色', 'To change its color')], a:2,
  w:T('手电筒、钥匙、门都是 Interactable，Interact 只要认得 Interactable 就够了。以后加新的互动物品，不用改 Interact。', 'The flashlight, key and door are all Interactables, so Interact only needs to know Interactable. New interactive items won’t require changing Interact.')}];

const EXPORT_INTRO = {
 zh:'# 在真 Unity 里重做「会互动的恐怖走廊」\n\n1. 先照第 1 章的清单做好走廊（或者直接接着你的第 1 章项目）。\n2. 把这个压缩包里的 `Assets/Scripts` 文件夹拖进 Unity 的项目窗口。\n3. 动画：选中 DoorHinge，Window → Animation → Animation，点 Create；按下面的关键帧录制。再用 Window → Animation → Animator 照下面的状态、参数和过渡做好。\n4. 真 Unity 的 TextMeshPro 默认字体没有中文，提示文字先用英文。\n5. 照下面的清单，一个一个建出物体、材质和设置。\n',
 en:'# Rebuild the interactive horror corridor in real Unity\n\n1. Build the corridor from the Chapter 1 list first (or continue your Chapter 1 project).\n2. Drag the `Assets/Scripts` folder from this zip into Unity’s Project window.\n3. Animation: select DoorHinge, open Window → Animation → Animation and click Create; record the keyframes listed below. Then use Window → Animation → Animator to set up the states, parameters and transitions below.\n4. Real Unity’s default TextMeshPro font has no Chinese characters, so keep the prompts in English.\n5. Follow the list below to create each object, material and setting.\n'};

G.chapters = G.chapters || {};
G.chapters.ch1b = {title:T('恐怖游戏进阶：互动、动画、Jumpscare', 'Horror, part 2: interaction, animation, jumpscares'), label:T('第 1 章 · 下篇', 'Chapter 1 · Part 2'),
  steps:STEPS, finish:FINISH, setup, bugs:BUGS, quiz:QUIZ, exportIntro:EXPORT_INTRO};
})();
