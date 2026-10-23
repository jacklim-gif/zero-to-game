// 第 0 章：Unity 入门 —— 教练步骤、完成页、代码讲解。
// 这个文件只放"内容"：每段文字写成 {zh, en}；conds 判断是否做完；auto 是「帮我做这一步」；
// point 返回箭头/拖动提示（数组时按顺序取第一个能在屏幕上找到的）。
// 引擎（状态、渲染、交互）在 ../editor.js，通过 window.ZTG 暴露给这里。
(() => {
'use strict';
window.ZTG = window.ZTG || {};
const G = window.ZTG; // 同一个对象：G.xxx 在任何时候读，都是 editor.js 挂上去的最新值。

const H = () => G.hint;
const setTo = v => ({zh:`改成 ${v}，按 Enter`, en:`Set to ${v}, press Enter`});
const fix = (k, want, cur) => {
  const i = want.findIndex((v, j) => Math.abs(cur[j] - v) >= .001);
  return i < 0 ? null : {at:H().field(k + '.' + i), label:setTo(want[i])};
};
const viaMenu = (plus, keys, label) => [...keys.slice().reverse().map(k => ({at:H().mi(k), label})), {at:plus, label}];
const selFirst = o => H().isSel(o) ? null : {at:H().row(o.id), label:G.t('hSelect')};
const cam = () => G.S.objs.find(o => o.type === 'camera');

const STEPS = [
 {title:{zh:'认识五个窗口', en:'Meet the five windows'},
  glow:()=>{const n=G.WORDER.find(k=>!G.S.flags.win.includes(k));return n?[G.WSEL[n]]:[];},
  point:()=>{const n=G.WORDER.find(k=>!G.S.flags.win.includes(k));return n&&{at:G.WSEL[n],label:{zh:'点一下这里',en:'Click here'}};},
  body:{zh:'Unity 的界面看着复杂，前期其实只用五个窗口。<b>依次点一下发亮的窗口</b>，我会告诉你它是做什么的。',
        en:"The Unity editor looks busy, but at first you only need five windows. <b>Click each glowing window in turn</b> and I'll tell you what it does."},
  conds:[[{zh:'层级（Hierarchy）',en:'Hierarchy'},()=>G.S.flags.win.includes('hier')],
         [{zh:'场景（Scene）',en:'Scene'},()=>G.S.flags.win.includes('scene')],
         [{zh:'游戏（Game，点上方的「游戏」标签）',en:'Game (click the Game tab at the top)'},()=>G.S.flags.win.includes('game')],
         [{zh:'检查器（Inspector）',en:'Inspector'},()=>G.S.flags.win.includes('insp')],
         [{zh:'项目（Project）',en:'Project'},()=>G.S.flags.win.includes('proj')]],
  hint:{zh:'控制台（Console）是项目旁边的另一个标签，报错都会出现在那里。以后遇到问题，第一件事就是看控制台。',
        en:'Console is the tab next to Project. Every error shows up there. When something goes wrong, check the Console first.'},
  auto:()=>{G.S.flags.win=G.WORDER.slice();}},

 {title:{zh:'创建一个方块', en:'Create a cube'},glow:()=>['#p-hier'],enter:()=>{G.S.tab='scene';},
  point:()=>G.S.objs.some(o=>o.type==='cube')?null:viaMenu('#hier-plus',['go3d','cube'],{zh:'点 +，选 3D 对象 → 立方体',en:'Click +, then 3D Object → Cube'}),
  body:{zh:'Unity 场景里的每样东西都叫 <b>游戏对象（GameObject）</b>。先做一个方块，它会变成你的玩家。',
        en:'Everything in a Unity scene is a <b>GameObject</b>. Make a cube first — it will become your player.'},
  conds:[[{zh:'场景里有一个立方体',en:'The scene has a Cube'},()=>G.S.objs.some(o=>o.type==='cube')]],
  hint:{zh:'在层级的空白处点右键，选 3D 对象 → 立方体。也可以点标题栏的 + 号。',
        en:'Right-click an empty spot in the Hierarchy and choose 3D Object → Cube. Or click the + in the title bar.'},
  auto:()=>{if(!G.S.objs.some(o=>o.type==='cube'))G.select('obj',G.mkObj('cube',G.t('nCube')).id);}},

 {title:{zh:'改名并放好位置', en:'Rename and place it'},glow:()=>['#p-insp'],
  point:()=>{const c=G.P()||G.S.objs.find(o=>o.type==='cube');if(!c)return null;
    return selFirst(c)||(!G.P()&&{at:H().field('name'),label:{zh:'改成 Player，按 Enter',en:'Type Player, press Enter'}})||fix('pos',[0,.5,0],c.pos);},
  body:{zh:'在层级里点选立方体，到右边 <b>检查器</b> 修改它。',
        en:'Select the cube in the Hierarchy, then change it in the <b>Inspector</b> on the right.'},
  conds:[[{zh:'名字改成 Player',en:'Name it Player'},()=>!!G.P()],
         [{zh:'位置改成 X 0、Y 0.5、Z 0',en:'Set Position to X 0, Y 0.5, Z 0'},()=>!!G.P()&&G.near(G.P().pos,[0,.5,0])]],
  hint:{zh:'检查器最上面是名字栏；变换（Transform）里的位置有 X、Y、Z 三个格子，输入数字后按 Enter。',
        en:'The name field is at the top of the Inspector. Under Transform, Position has X, Y and Z boxes. Type a number and press Enter.'},
  note:{zh:'为什么 Y 是 0.5？方块边长是 1，中心点在正中间。地板放在高度 0，方块的一半（0.5）刚好落在地板上，不会埋进去。',
        en:'Why Y 0.5? The cube is 1 unit tall and its center is in the middle. The floor sits at height 0, so lifting the cube by half its height (0.5) puts it right on top.'},
  auto:()=>{const c=G.P()||G.S.objs.find(o=>o.type==='cube');if(c){c.name='Player';c.pos=[0,.5,0];G.select('obj',c.id);}}},

 {title:{zh:'移动、旋转、缩放', en:'Move, rotate, scale'},glow:()=>['#p-scene'],
  point:()=>{const p=G.P();if(!p)return null;const F=G.S.flags,h=H();
    if(G.S.tab!=='scene')return {at:'#tab-scene',label:G.t('hToScene')};
    const s=selFirst(p);if(s)return s;
    const tool=(k,lab)=>G.S.tool===k?null:{at:`#tools [data-tool="${k}"]`,label:lab};
    const sideDrag=lab=>{const c=h.objScreen(p.id);return c?{from:{x:c.x-50,y:c.y},to:{x:c.x+70,y:c.y},label:lab}:{at:'#cwrap',label:lab};};
    if(!F.moved){const a=h.handleAt(0);const lab={zh:'拖动箭头',en:'Drag an arrow'};
      return tool('w',{zh:'按 W 或点这里',en:'Press W or click here'})||(a?{from:a.b,to:{x:a.b.x+(a.b.x-a.a.x),y:a.b.y+(a.b.y-a.a.y)},label:lab}:{at:'#cwrap',label:lab});}
    if(!F.rotated)return tool('e',{zh:'按 E 或点这里',en:'Press E or click here'})||sideDrag({zh:'按住左右拖',en:'Drag left or right'});
    if(!F.scaled)return tool('r',{zh:'按 R 或点这里',en:'Press R or click here'})||sideDrag({zh:'按住左右拖',en:'Drag left or right'});
    return fix('pos',[0,.5,0],p.pos)||fix('rot',[0,0,0],p.rot)||fix('scl',[1,1,1],G.effScale(p));},
  body:{zh:'点选 Player，把鼠标放在场景里，按 <b>W</b>、<b>E</b>、<b>R</b> 切换工具（也可以点右上角的按钮）。',
        en:'Select Player, hover over the Scene, and press <b>W</b>, <b>E</b>, <b>R</b> to switch tools (or click the buttons at the top right).'},
  conds:[[{zh:'W：拖动彩色箭头，移动方块',en:'W: drag a colored arrow to move the cube'},()=>G.S.flags.moved],
         [{zh:'E：左右拖动，旋转方块',en:'E: drag left or right to rotate it'},()=>G.S.flags.rotated],
         [{zh:'R：左右拖动，缩放方块',en:'R: drag left or right to scale it'},()=>G.S.flags.scaled],
         [{zh:'在检查器把数值改回：位置 0、0.5、0，旋转 0、0、0，缩放 1、1、1',en:'In the Inspector, set it back: Position 0, 0.5, 0, Rotation 0, 0, 0, Scale 1, 1, 1'},
          ()=>G.S.flags.moved&&G.S.flags.rotated&&G.S.flags.scaled&&!!G.P()&&G.near(G.P().pos,[0,.5,0])&&G.near(G.P().rot,[0,0,0])&&G.near(G.effScale(G.P()),[1,1,1])]],
  hint:{zh:'玩够了可以按 Ctrl+Z（Mac 是 Cmd+Z）一步步撤销，或者直接在检查器里输入数字改回去。Q 是手形工具，左键拖动可以旋转视角。',
        en:"When you're done, press Ctrl+Z (Cmd+Z on Mac) to undo step by step, or type the numbers back in the Inspector. Q is the Hand tool: left-drag to orbit the view."},
  auto:()=>{const p=G.P();Object.assign(G.S.flags,{moved:true,rotated:true,scaled:true});if(p){p.pos=[0,.5,0];p.rot=[0,0,0];p.scale=[1,1,1];}}},

 {title:{zh:'做地板', en:'Make a floor'},glow:()=>['#p-hier'],
  point:()=>{const f=G.FL()||G.S.objs.find(o=>o.type==='plane');
    if(!f)return viaMenu('#hier-plus',['go3d','plane'],{zh:'点 +，选 3D 对象 → 平面',en:'Click +, then 3D Object → Plane'});
    return selFirst(f)||(!G.FL()&&{at:H().field('name'),label:{zh:'改成 Floor，按 Enter',en:'Type Floor, press Enter'}})||fix('pos',[0,0,0],f.pos)||fix('scl',[3,1,3],G.effScale(f));},
  body:{zh:'再创建一个 <b>平面（Plane）</b>当地板，改名为 Floor。',
        en:'Create a <b>Plane</b> to use as the floor and name it Floor.'},
  conds:[[{zh:'新建平面并命名为 Floor',en:'Create a Plane named Floor'},()=>!!G.FL()&&G.FL().type==='plane'],
         [{zh:'位置是 0、0、0',en:'Position is 0, 0, 0'},()=>!!G.FL()&&G.near(G.FL().pos,[0,0,0])],
         [{zh:'缩放是 3、1、3',en:'Scale is 3, 1, 3'},()=>!!G.FL()&&G.near(G.effScale(G.FL()),[3,1,3])]],
  hint:{zh:'层级右键 → 3D 对象 → 平面。然后在检查器改名字和缩放。',
        en:'Hierarchy right-click → 3D Object → Plane. Then change its name and Scale in the Inspector.'},
  note:{zh:'平面默认是 10 乘 10，放大 3 倍后变成 30 乘 30，够走动了。',
        en:'A Plane is 10 × 10 by default. Scaled by 3 it becomes 30 × 30 — plenty of room to walk.'},
  auto:()=>{let f=G.FL()||G.S.objs.find(o=>o.type==='plane')||G.mkObj('plane','Floor');f.name='Floor';f.pos=[0,0,0];f.scale=[3,1,3];G.select('obj',f.id);}},

 {title:{zh:'新建两个材质', en:'Create two materials'},glow:()=>['#p-proj'],
  point:()=>{if(G.S.renaming!=null)return {at:'#rn',label:{zh:'输入名字，按 Enter',en:'Type a name, press Enter'}};
    return G.mats().length>=2?null:viaMenu('#proj-plus',['create','mat'],{zh:'点 +，选 创建 → 材质',en:'Click +, then Create → Material'});},
  body:{zh:'<b>材质（Material）</b>是物体的「皮肤」：物体只是形状，颜色靠材质。在项目窗口新建两个材质，一个给地板，一个给方块。',
        en:"A <b>Material</b> is an object's skin: the object is just a shape, the color comes from its material. Create two materials in the Project window — one for the floor, one for the cube."},
  conds:[[{zh:'做出 2 个材质',en:'Make 2 materials'},()=>G.mats().length>=2]],
  hint:{zh:'在项目的空白处右键 → 创建 → 材质，输入名字后按 Enter。建议名字：Floor_Mat 和 Player_Mat。想整洁的话，先 创建 → 文件夹 建一个 Materials 文件夹，双击进去再建。',
        en:'Right-click an empty spot in Project → Create → Material, type a name and press Enter. Suggested names: Floor_Mat and Player_Mat. To stay tidy, first Create → Folder named Materials, double-click it, and create them inside.'},
  auto:()=>{G.ensureMats();}},

 {title:{zh:'上色并拖到物体上', en:'Color them and drag them on'},glow:()=>['#p-proj'],
  point:()=>{const f=G.FL(),p=G.P(),ms=G.mats();
    const fm=(f&&G.matOf(f))||ms.find(m=>/floor/i.test(m.name))||ms[0];
    const pm=(p&&G.matOf(p))||ms.find(m=>/player/i.test(m.name))||ms.find(m=>m!==fm);
    const jobs=[[f,fm,G.isGray,'#4a4d52',{zh:'点深灰色',en:'Pick dark gray'}],[p,pm,G.isOrange,'#ff8a1f',{zh:'点橙色',en:'Pick orange'}]];
    for(const [o,m,ok,col,pick] of jobs){
      if(!o||!m)continue;const cur=G.matOf(o);if(cur&&ok(cur.color))continue;
      const r=H().reach(m);if(r.nav)return r;
      if(!ok(m.color))return H().isSel(m)?{at:`#insp-body [data-c="${col}"]`,label:pick}:{at:r.at,label:{zh:'点选这个材质',en:'Select this material'}};
      return {from:r.at,to:H().row(o.id),label:{zh:`拖到 ${o.name} 上`,en:`Drag onto ${o.name}`}};}
    return null;},
  body:{zh:'点选材质，在检查器的 <b>基础贴图（Base Map）</b>选颜色；再把材质从项目窗口 <b>拖到物体上</b>（拖到场景里的物体，或层级里的名字上都行）。',
        en:'Select a material and pick a color under <b>Base Map</b> in the Inspector. Then <b>drag the material onto an object</b> — onto the object in the Scene, or onto its name in the Hierarchy.'},
  conds:[[{zh:'地板用了一个深灰色材质',en:'The floor uses a dark gray material'},()=>{const f=G.FL(),m=f&&G.matOf(f);return !!m&&G.isGray(m.color);}],
         [{zh:'Player 用了一个橙色材质',en:'Player uses an orange material'},()=>{const p=G.P(),m=p&&G.matOf(p);return !!m&&G.isOrange(m.color);}]],
  hint:{zh:'颜色现在随便选，这一章不用追求好看，第 4 章会教怎么用调色盘。',
        en:"Any colors are fine for now. Looks don't matter yet — Chapter 4 teaches color palettes."},
  auto:()=>{const m=G.ensureMats();m[0].color='#4a4d52';m[1].color='#ff8a1f';if(G.FL())G.FL().mat=m[0].id;if(G.P())G.P().mat=m[1].id;}},

 {title:{zh:'认识预制件', en:'Meet Prefabs'},glow:()=>['#p-hier','#p-proj'],
  point:()=>{const p=G.P();if(!p)return null;const F=G.S.flags,h=H();
    if(!p.prefab)return [{from:h.row(p.id),to:'#projgrid',label:{zh:'把 Player 拖进项目窗口',en:'Drag Player into the Project window'}},{at:'#ptab-project',label:G.t('hBackProject')}];
    const pa=G.asset(G.S.prefabs[p.prefab].assetId);if(!pa)return null;const r=h.reach(pa);
    if(F.maxInst<3){if(r.nav)return r;if(G.S.tab!=='scene')return {at:'#tab-scene',label:G.t('hToScene')};
      return {from:r.at,to:'#cwrap',label:{zh:'拖进场景（要两次）',en:'Drag into the Scene (twice)'}};}
    const pf=G.S.prefabs[p.prefab];
    const scaleTo=v=>{if(r.nav)return r;return h.isSel(pa)?{at:h.field('pscl.0'),label:setTo(v)}:{at:r.at,label:{zh:'点选预制件',en:'Select the Prefab'}};};
    if(!F.wide)return scaleTo(2);
    if(Math.abs(pf.scale[0]-1)>=.001)return scaleTo(1);
    const extra=G.S.objs.find(o=>o.prefab===p.prefab&&o!==p);
    if(extra)return h.isSel(extra)?{at:h.row(extra.id),label:{zh:'按 Delete 键删除',en:'Press Delete'}}:{at:h.row(extra.id),label:{zh:'点选多出来的方块',en:'Select the extra cube'}};
    return null;},
  body:{zh:'<b>预制件（Prefab）</b>是可以反复使用的物体模板。改一次模板，所有副本一起更新。后面做怪物、树、背包物品，全靠它。',
        en:'A <b>Prefab</b> is a reusable object template. Change the template once and every copy updates. Monsters, trees, inventory items — all built on this.'},
  conds:[[{zh:'把层级里的 Player 拖进项目窗口，做成预制件',en:'Drag Player from the Hierarchy into the Project window to make a Prefab'},()=>{const p=G.P();return !!p&&!!p.prefab;}],
         [{zh:'把预制件从项目窗口拖进场景两次，场景里有 3 个方块',en:'Drag the Prefab into the Scene twice, so there are 3 cubes'},()=>G.S.flags.maxInst>=3],
         [{zh:'选中项目里的预制件，把缩放的 X 改成 2，三个方块一起变宽',en:'Select the Prefab in Project and set Scale X to 2 — all three cubes get wider'},()=>G.S.flags.wide],
         [{zh:'把 X 改回 1，并删掉多出来的两个（选中后按 Delete），只留一个',en:'Set X back to 1 and delete the two extra cubes (select, then press Delete), leaving one'},
          ()=>G.S.flags.wide&&G.instCount()===1&&G.S.prefabs[(G.P()||{}).prefab]&&G.near([G.S.prefabs[G.P().prefab].scale[0]],[1])]],
  hint:{zh:'拖动：按住物体名字拖到项目窗口空白处。多出来的方块叫 Player (1)、Player (2)。',
        en:'To drag: hold the object name and drop it on an empty spot in Project. The extra cubes are called Player (1) and Player (2).'},
  auto:()=>{const p=G.P();if(!p)return;if(!p.prefab)G.makePrefab(p,G.S.cwd);const a=G.asset(G.S.prefabs[p.prefab].assetId);G.spawn(a,[3,.5,0]);G.spawn(a,[-3,.5,0]);G.S.flags.maxInst=3;G.S.flags.wide=true;
      G.S.objs=G.S.objs.filter(o=>!(o.prefab===p.prefab&&o!==p));G.select('obj',p.id);}},

 {title:{zh:'第一段 C# 脚本', en:'Your first C# script'},glow:()=>['#p-proj'],
  point:()=>{const h=H();if(G.S.renaming!=null)return {at:'#rn',label:{zh:'输入 PlayerMove，按 Enter',en:'Type PlayerMove, press Enter'}};
    const s=G.S.assets.find(a=>a.type==='script'&&a.name==='PlayerMove');
    if(!s){const w=G.S.assets.find(a=>a.type==='script');
      if(w){const r=h.reach(w);if(r.nav)return r;return h.isSel(w)?{at:h.field('aname'),label:{zh:'改成 PlayerMove，按 Enter',en:'Rename to PlayerMove, press Enter'}}:{at:r.at,label:{zh:'点选这个脚本',en:'Select this script'}};}
      return viaMenu('#proj-plus',['create','script'],{zh:'点 +，选 创建 → MonoBehaviour 脚本',en:'Click +, then Create → MonoBehaviour Script'});}
    if(G.codeOpen()===s.id){
      const bad=SCRIPT.blanks.find(b=>G.codeDraft(b.id)===''||(s.comp&&s.comp.errs.some(e=>e.b===b.id)&&G.codeDraft(b.id)===String(s.blanks[b.id]||'')));
      if(bad)return {at:`#modal .blank[data-b="${bad.id}"]`,label:bad.tip};
      if(G.codeDirty())return {at:'#csave',label:G.t('hSaveCode')};
      if(!(s.comp&&s.comp.ok))return {at:'#csave',label:G.t('hSaveCode')};
      return null;}
    const r=h.reach(s);if(r.nav)return r;
    if(!(s.comp&&s.comp.ok))return {at:r.at,label:{zh:'双击打开代码',en:'Double-click to open the code'}};
    const p=G.P();if(p&&!p.scripts.some(x=>x.asset===s.id))return {from:r.at,to:h.row(p.id),label:{zh:'拖到 Player 上',en:'Drag onto Player'}};
    return null;},
  body:{zh:'<b>脚本</b>是写给物体的指令。新建一个脚本，打开它，把代码里空着的地方填好，再把它拖到 Player 身上。',
        en:"A <b>script</b> is a set of instructions for an object. Create one, open it, fill in the blanks in the code, then drag it onto Player."},
  conds:[[{zh:'新建脚本，名字必须是 PlayerMove（和代码里的 class 名字一致）',en:'Create a script named exactly PlayerMove (it must match the class name in the code)'},()=>G.S.assets.some(a=>a.type==='script'&&a.name==='PlayerMove')],
         [{zh:'双击打开，把代码里的 4 个空填好，按「保存」，控制台没有红字',en:'Double-click it, fill in the 4 blanks, press Save, and get no red errors in the Console'},()=>G.S.assets.some(a=>a.type==='script'&&a.name==='PlayerMove'&&a.comp&&a.comp.ok)],
         [{zh:'把脚本拖到层级里的 Player 上',en:'Drag the script onto Player in the Hierarchy'},()=>{const p=G.P();return !!p&&p.scripts.some(s=>(G.asset(s.asset)||{}).name==='PlayerMove');}]],
  hint:{zh:'每个空格都有提示。填错了没关系：保存后控制台会出现红字，点红字会跳到出错的那一行。点代码的任意一行，会告诉你这行在做什么。',
        en:"Every blank has a tip. Mistakes are fine: after saving, the Console shows red errors, and clicking one jumps to that line. Click any line of code to see what it does."},
  note:{zh:'真实 Unity 里，名字必须和 class 一模一样，包括大小写，否则脚本挂不上去，这是新手最常见的错误之一。',
        en:"In real Unity the file name must match the class name exactly, including upper and lower case. Otherwise the script won't attach — one of the most common beginner mistakes."},
  auto:()=>{let a=G.S.assets.find(x=>x.type==='script'&&x.name==='PlayerMove');if(!a){const f=G.S.assets.find(x=>x.type==='folder'&&x.name==='Scripts')||G.mkAsset('folder','Scripts',0);a=G.mkAsset('script','PlayerMove',f.id);}
      G.closeCode();a.blanks=Object.assign({},SCRIPT.answers);G.compileScript(a);G.S.flags.viewed=true;const p=G.P();if(p&&!p.scripts.some(s=>s.asset===a.id))G.addScript(p,a);}},

 {title:{zh:'调整摄像机', en:'Adjust the camera'},glow:()=>['#p-insp'],
  point:()=>{const c=cam();if(!c)return null;return selFirst(c)||fix('pos',[0,8,-8],c.pos)||fix('rot',[45,0,0],c.rot);},
  body:{zh:'现在摄像机太低，玩家一走就出画面。点选 <b>主摄像机</b>，从斜上方往下看。改完点上面的 <b>游戏</b> 标签，看看玩家会看到什么。',
        en:'The camera is too low — the player walks out of view right away. Select the <b>Main Camera</b> and have it look down from above at an angle. Then click the <b>Game</b> tab to see what the player sees.'},
  conds:[[{zh:'主摄像机的位置是 0、8、-8',en:"Main Camera's Position is 0, 8, -8"},()=>{const c=cam();return !!c&&G.near(c.pos,[0,8,-8]);}],
         [{zh:'主摄像机的旋转是 45、0、0',en:"Main Camera's Rotation is 45, 0, 0"},()=>{const c=cam();return !!c&&G.near(c.rot,[45,0,0]);}]],
  hint:{zh:'在场景里，摄像机是那个线框的小金字塔。改数字后，它会跟着转。',
        en:'In the Scene, the camera is the small wireframe pyramid. It turns as you change the numbers.'},
  auto:()=>{const c=cam();if(c){c.pos=[0,8,-8];c.rot=[45,0,0];G.select('obj',c.id);}}},

 {title:{zh:'点播放', en:'Press Play'},glow:()=>['#playbtn'],play:true,
  point:()=>{const F=G.S.flags;
    if(!G.S.playing)return F.movedInPlay?null:{at:'#playbtn',label:{zh:'点播放',en:'Click Play'}};
    if(!F.movedInPlay)return {at:'#cwrap',label:{zh:'按 W A S D 走动',en:'Press W A S D to walk'}};
    return {at:'#playbtn',label:{zh:'再点一次停止',en:'Click again to stop'}};},
  body:{zh:'按顶部的 <b>播放</b>，用 <b>W、A、S、D</b> 走动，走出至少 2 个单位，再点一次播放停止。',
        en:'Press <b>Play</b> at the top, walk with <b>W, A, S, D</b> for at least 2 units, then press Play again to stop.'},
  conds:[[{zh:'点播放开始',en:'Press Play'},()=>G.S.flags.played],
         [{zh:'按 WASD，让方块走动',en:'Walk the cube with WASD'},()=>G.S.flags.movedInPlay],
         [{zh:'再点一次播放停止',en:'Press Play again to stop'},()=>G.S.flags.stopped]],
  hint:{zh:'如果按键没反应，先点一下游戏画面再按。试试：播放的时候，到检查器把 Player Move 的 Speed 改成 10，方块立刻变快；停止后再看，Speed 变回 5。',
        en:"If the keys don't respond, click the Game view first. Try this: while playing, change Player Move's Speed to 10 in the Inspector — the cube speeds up right away. After you stop, Speed is back to 5."},
  note:{zh:'在播放模式下做的任何修改，停止后都会还原。所以编辑物体一定要在停止状态下做。另外留意：走出地板时方块会浮在空中——它现在不受重力影响，下一步解决。',
        en:'Any change you make in Play mode is undone when you stop, so always edit objects while stopped. Also notice: if you walk off the floor, the cube floats in mid-air — it ignores gravity for now. The next step fixes that.'},
  auto:()=>{if(G.S.playing)G.stopPlay();Object.assign(G.S.flags,{played:true,movedInPlay:true,stopped:true});}},

 {title:{zh:'加刚体，让方块会掉', en:'Add a Rigidbody so it can fall'},glow:()=>G.P()&&G.P().rb?['#playbtn']:['#p-insp'],play:true,
  point:()=>{const p=G.P();if(!p)return null;const F=G.S.flags,h=H();
    if(!p.rb){if(G.S.playing)return {at:'#playbtn',label:G.t('hStopFirst')};
      const lab={zh:'点 添加组件 → 物理 → 刚体',en:'Add Component → Physics → Rigidbody'};
      return selFirst(p)||[{at:h.mi('rigidbody'),label:lab},{at:h.mi('physics'),label:lab},{at:'#addcomp',label:lab}];}
    if(!F.fell)return G.S.playing?{at:'#cwrap',label:{zh:'按住 W，一直走出地板',en:'Hold W and walk off the floor'}}:{at:'#playbtn',label:{zh:'点播放',en:'Click Play'}};
    return G.S.playing?{at:'#playbtn',label:{zh:'点一下停止',en:'Click to stop'}}:null;},
  body:{zh:'方块现在不受重力。给它加一个 <b>刚体（Rigidbody）</b>组件，重力就会拉住它：站在地板上不会掉，走出地板就会掉下去。',
        en:'Right now the cube ignores gravity. Add a <b>Rigidbody</b> component and gravity takes hold: it stays on the floor, and falls once it walks off the edge.'},
  conds:[[{zh:'选中 Player，在检查器点「添加组件」→ 物理 → 刚体',en:'Select Player, then in the Inspector click Add Component → Physics → Rigidbody'},()=>!!G.P()&&!!G.P().rb],
         [{zh:'点播放，一直走出地板，看方块掉下去',en:'Press Play and walk off the floor — watch it fall'},()=>G.S.flags.fell],
         [{zh:'再点一次播放停止',en:'Press Play again to stop'},()=>G.S.flags.fellStopped]],
  hint:{zh:'方块能站在地板上，是因为立方体自带盒状碰撞体（Box Collider），平面自带网格碰撞体（Mesh Collider）。刚体负责重力，碰撞体负责「碰到」。',
        en:'The cube can stand on the floor because a Cube comes with a Box Collider and a Plane with a Mesh Collider. The Rigidbody handles gravity; colliders handle touching.'},
  note:{zh:'要在停止状态下加刚体。如果在播放时加，停止后它会消失，和其他播放中的修改一样。停止后方块也会回到原位。',
        en:'Add the Rigidbody while stopped. If you add it during Play, it disappears when you stop, like any other Play-mode change. Stopping also puts the cube back where it started.'},
  auto:()=>{if(G.S.playing)G.stopPlay();const p=G.P();if(p&&!p.rb)G.addRigidbody(p);Object.assign(G.S.flags,{fell:true,fellStopped:true});}},

 {title:{zh:'保存场景', en:'Save the scene'},glow:()=>['#menu-file'],
  point:()=>[{at:H().mi('save'),label:{zh:'点保存',en:'Click Save'}},{at:'#menu-file',label:{zh:'点 文件 → 保存（或按 Ctrl/Cmd+S）',en:'File → Save (or Ctrl/Cmd+S)'}}],
  body:{zh:'场景不会自动保存，关掉没存就没了。看看层级里的 SampleScene，名字后面的 <b>*</b> 表示还没保存。',
        en:"Scenes don't save themselves — close without saving and the work is gone. See the <b>*</b> after SampleScene in the Hierarchy? It means there are unsaved changes."},
  conds:[[{zh:'按 Ctrl+S（Mac 是 Cmd+S），或 文件 → 保存',en:'Press Ctrl+S (Cmd+S on Mac), or File → Save'},()=>G.S.flags.saved&&!G.S.dirty]],
  hint:{zh:'如果快捷键没反应，用顶部的文件菜单。',en:"If the shortcut doesn't work, use the File menu at the top."},
  auto:()=>{if(G.S.playing)G.stopPlay();G.saveScene();}}
];

const FINISH={
 zh:`<div class="finish"><div class="gstep">完成</div><h2>第 0 章完成：方块能走了</h2>
<p>你认识了五个窗口，做了方块、地板、材质、预制件和第一段 C#，还学会了播放、刚体和保存。</p>
<div class="note">下一章：恐怖游戏。黑暗走廊、手电筒、脚步声和一个会追你的怪物。（这个原型暂时只有第 0 章）</div>
<div class="gact"><button class="btn primary" data-act="reset">再玩一遍</button><button class="btn" data-act="home">回到主页</button></div></div>`,
 en:`<div class="finish"><div class="gstep">Done</div><h2>Chapter 0 complete: your cube can walk</h2>
<p>You met the five windows, made a cube, a floor, materials, a Prefab and your first C# script, and learned Play, Rigidbody and saving.</p>
<div class="note">Next: a horror game. A dark corridor, a flashlight, footsteps, and a monster that chases you. (This prototype only has Chapter 0 so far.)</div>
<div class="gact"><button class="btn primary" data-act="reset">Play again</button><button class="btn" data-act="home">Back to home</button></div></div>`};

// PlayerMove.cs：代码模板。每行 c 是片段（字符串或空格 {b}），x 是点这一行时的解释，
// run 标记播放时这一行什么时候亮（start / update / move），key 是按住哪个键时亮。
const B = id => ({b:id});
const SCRIPT = {
 name:'PlayerMove',
 blanks:[
  {id:'speed',w:4,tip:{zh:'填一个数字，例如 5f',en:'Type a number, e.g. 5f'}},
  {id:'msg',w:14,tip:{zh:'随便写一句话，播放时会出现在控制台',en:'Any message — it shows in the Console when you press Play'}},
  {id:'semi',w:1,tip:{zh:'每句 C# 都要用分号 ; 结尾',en:'Every C# statement ends with a semicolon ;'}},
  {id:'dt',w:14,tip:{zh:'填 Time.deltaTime（注意大小写）',en:'Type Time.deltaTime (mind the capitals)'}}],
 answers:{speed:'5f',msg:'Hello, world!',semi:';',dt:'Time.deltaTime'},
 lines:[
  {c:['using UnityEngine;'],x:{zh:'引入 Unity 的工具箱。没有它，Vector3、Time 这些词都不认识。',en:"Brings in Unity's toolbox. Without it, words like Vector3 and Time mean nothing."}},
  {c:['using UnityEngine.InputSystem;'],x:{zh:'引入新版输入系统，用来读键盘。Unity 6 的新项目默认只用它。',en:'Brings in the new Input System to read the keyboard. New Unity 6 projects use only this by default.'}},
  {c:['']},
  {c:['public class PlayerMove : MonoBehaviour'],x:{zh:'宣布这是一个脚本，名字叫 PlayerMove。名字必须和文件名一致。继承 MonoBehaviour，才能挂到物体上。',en:'Declares a script called PlayerMove. The name must match the file name. Inheriting from MonoBehaviour lets it attach to objects.'}},
  {c:['{'],x:{zh:'大括号成对出现，里面是这个脚本的全部内容。',en:'Braces come in pairs. Everything in this script goes inside.'}},
  {c:['    public float speed = ',B('speed'),';'],x:{zh:'速度变量。public 让它出现在检查器里，不改代码就能调。C# 里带小数点的数字后面要加 f，例如 5.5f。',en:'A speed variable. public makes it show up in the Inspector, so you can tweak it without editing code. In C#, a number with a decimal point needs an f at the end, like 5.5f.'}},
  {c:['']},
  {c:['    void Start()'],run:'start',x:{zh:'开始播放时执行一次。',en:'Runs once, when Play starts.'}},
  {c:['    {'],run:'start',x:{zh:'Start 的开始。',en:'Start of Start.'}},
  {c:['        Debug.Log("',B('msg'),'");'],run:'start',x:{zh:'把引号里的话打印到控制台。用来确认代码有没有跑到这里。',en:'Prints the text in quotes to the Console. Handy for checking that the code got here.'}},
  {c:['    }'],run:'start',x:{zh:'Start 的结束。',en:'End of Start.'}},
  {c:['']},
  {c:['    void Update()'],run:'update',x:{zh:'每一帧都会执行一次。画面每刷新一次，这里面的代码就跑一遍。',en:'Runs once per frame. Every time the screen refreshes, the code inside runs.'}},
  {c:['    {'],run:'update',x:{zh:'Update 的开始。',en:'Start of Update.'}},
  {c:['        Keyboard keyboard = Keyboard.current;'],run:'update',x:{zh:'取得当前连接的键盘。',en:"Gets the keyboard that's connected right now."}},
  {c:['        if (keyboard == null) return;'],run:'update',x:{zh:'没有键盘就直接结束，避免报错。',en:'No keyboard? Stop here to avoid an error.'}},
  {c:[''],run:'update'},
  {c:['        float x = 0f',B('semi')],run:'update',x:{zh:'x 是左右方向的输入，先设成 0。每一句 C# 都要用分号结尾，就像中文句子用句号。',en:'x is the left/right input. Start at 0. Every C# statement ends with a semicolon, like a full stop at the end of a sentence.'}},
  {c:['        float z = 0f;'],run:'update',x:{zh:'z 是前后方向的输入，先设成 0。',en:'z is the forward/back input. Start at 0.'}},
  {c:[''],run:'update'},
  {c:['        if (keyboard.aKey.isPressed) x -= 1f;'],run:'update',key:'KeyA',x:{zh:'按住 A：x 减 1，往左。',en:'Holding A: x minus 1, go left.'}},
  {c:['        if (keyboard.dKey.isPressed) x += 1f;'],run:'update',key:'KeyD',x:{zh:'按住 D：x 加 1，往右。',en:'Holding D: x plus 1, go right.'}},
  {c:['        if (keyboard.sKey.isPressed) z -= 1f;'],run:'update',key:'KeyS',x:{zh:'按住 S：z 减 1，往后。',en:'Holding S: z minus 1, go back.'}},
  {c:['        if (keyboard.wKey.isPressed) z += 1f;'],run:'update',key:'KeyW',x:{zh:'按住 W：z 加 1，往前。',en:'Holding W: z plus 1, go forward.'}},
  {c:[''],run:'update'},
  {c:['        Vector3 direction = new Vector3(x, 0f, z).normalized;'],run:'update',x:{zh:'把输入做成一个三维箭头，并把长度调成 1。这样同时按 W 和 D 斜着走，不会比直走更快。',en:"Turns the input into a 3D arrow and makes its length 1, so walking diagonally (W + D) isn't faster than walking straight."}},
  {c:['        transform.Translate(direction * speed * ',B('dt'),', Space.World);'],run:'move',x:{zh:'把物体沿箭头方向移动一段距离。乘上 Time.deltaTime，电脑跑 30 帧还是 144 帧，实际速度都一样。',en:'Moves the object along that arrow. Multiplying by Time.deltaTime keeps the real speed the same at 30 or 144 frames per second.'}},
  {c:['    }'],run:'update',x:{zh:'Update 的结束。',en:'End of Update.'}},
  {c:['}'],x:{zh:'脚本的结束。',en:'End of the script.'}}],
 // 模拟 C# 编译器：只检查空格里填的东西，报和真 Unity 一样的错误代码。
 // 返回 errors（b = 哪个空格）和 rt（运行时用到的值）。
 compile(b){
  const E=[],rt={speed:5,msg:'',dt:'dt'};
  const v=k=>String(b[k]==null?'':b[k]).trim();
  const s=v('speed');
  if(!s)E.push({b:'speed',code:'CS1525',en:"Invalid expression term ';'",zh:'等号后面空着，要填一个数字。'});
  else if(/^-?\d+(\.\d+)?[fF]$/.test(s)||/^-?\d+$/.test(s))rt.speed=parseFloat(s);
  else if(/^-?(\d*\.\d+|\d+\.)$/.test(s))E.push({b:'speed',code:'CS0664',en:"Literal of type double cannot be implicitly converted to type 'float'; use an 'F' suffix to create a literal of this type",zh:'带小数点的数字后面要加 f，例如 5.5f。'});
  else E.push({b:'speed',code:'CS0103',en:`The name '${s}' does not exist in the current context`,zh:`电脑不认识「${s}」这个词。这里要填一个数字。`});
  const m=String(b.msg==null?'':b.msg);
  if(m.includes('"'))E.push({b:'msg',code:'CS1010',en:'Newline in constant',zh:'双引号 " 会提前结束这句话。句子里不要再写双引号。'});else rt.msg=m;
  if(v('semi')!==';')E.push({b:'semi',code:'CS1002',en:'; expected',zh:'这一句的末尾少了分号 ;'});
  const d=v('dt');
  if(d==='Time.deltaTime')rt.dt='dt';
  else if(/^\d+(\.\d+)?[fF]?$/.test(d))rt.dt=parseFloat(d);
  else if(!d)E.push({b:'dt',code:'CS1525',en:"Invalid expression term ','",zh:'这里空着。要填 Time.deltaTime。'});
  else{const mm=/^([A-Za-z_]\w*)(?:\.(\w*))?$/.exec(d);
    if(mm&&mm[1]!=='Time')E.push({b:'dt',code:'CS0103',en:`The name '${mm[1]}' does not exist in the current context`,zh:`电脑不认识「${mm[1]}」。C# 区分大小写：要写 Time，T 大写。`});
    else if(mm)E.push({b:'dt',code:'CS0117',en:`'Time' does not contain a definition for '${mm[2]||''}'`,zh:`Time 里没有「${mm[2]||''}」。要写 deltaTime：d 小写，T 大写。`});
    else E.push({b:'dt',code:'CS1525',en:`Invalid expression term '${d}'`,zh:'这里要填 Time.deltaTime。'});}
  return {errors:E,rt};}
};

G.chapters = G.chapters || {};
G.chapters.ch0 = {title:{zh:'Unity 入门', en:'Unity Basics'}, steps:STEPS, finish:FINISH, script:SCRIPT};
})();
