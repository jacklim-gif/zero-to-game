// 第 0 章：Unity 入门 —— 教练步骤、完成页、代码讲解数据。
// 这个文件只放"内容"（文字、条件、自动完成逻辑），不放引擎代码。
// 引擎（状态、渲染、交互）在 ../editor.js 里，通过全局命名空间 window.ZTG 暴露给这里用。
(() => {
'use strict';
window.ZTG = window.ZTG || {};
const G = window.ZTG; // 同一个对象的引用：G.xxx 在后面任何时候读，都会拿到 editor.js 挂上去的最新值。

const STEPS = [
 {title:'认识五个窗口',glow:()=>{const n=G.WORDER.find(k=>!G.S.flags.win.includes(k));return n?[G.WSEL[n]]:[];},
  body:'Unity 的界面看着复杂，前期其实只用五个窗口。<b>依次点一下发亮的窗口</b>，我会告诉你它是做什么的。',
  conds:[['Hierarchy',()=>G.S.flags.win.includes('hier')],['Scene',()=>G.S.flags.win.includes('scene')],['Game（点上方的 Game 标签）',()=>G.S.flags.win.includes('game')],['Inspector',()=>G.S.flags.win.includes('insp')],['Project',()=>G.S.flags.win.includes('proj')]],
  hint:'Console 是 Project 旁边的另一个标签，报错都会出现在那里。以后遇到问题，第一件事就是看 Console。',
  auto:()=>{G.S.flags.win=G.WORDER.slice();}},
 {title:'创建一个方块',glow:()=>['#p-hier'],enter:()=>{G.S.tab='scene';},
  body:'Unity 场景里的每样东西都叫 <b>GameObject</b>（游戏物体）。先做一个方块，它会变成你的玩家。',
  conds:[['场景里有一个 Cube',()=>G.S.objs.some(o=>o.type==='cube')]],
  hint:'在 Hierarchy 的空白处点右键，选 3D Object → Cube。手机上可以长按，或点标题栏的 + 号。',
  auto:()=>{if(!G.S.objs.some(o=>o.type==='cube'))G.select('obj',G.mkObj('cube','Cube').id);}},
 {title:'改名并放好位置',glow:()=>['#p-insp'],
  body:'在 Hierarchy 点选 Cube，到右边 <b>Inspector</b> 修改它。',
  conds:[['名字改成 Player',()=>!!G.P()],['Position 改成 X 0、Y 0.5、Z 0',()=>!!G.P()&&G.near(G.P().pos,[0,.5,0])]],
  hint:'Inspector 最上面是名字栏；Transform 里的 Position 有 X、Y、Z 三个格子，输入数字后按 Enter。',
  note:'为什么 Y 是 0.5？方块边长是 1，中心点在正中间。地板放在高度 0，方块的一半（0.5）刚好落在地板上，不会埋进去。',
  auto:()=>{const c=G.P()||G.S.objs.find(o=>o.type==='cube');if(c){c.name='Player';c.pos=[0,.5,0];G.select('obj',c.id);}}},
 {title:'移动、旋转、缩放',glow:()=>['#p-scene'],
  body:'点选 Player，把鼠标放在 Scene 里，按 <b>W</b>、<b>E</b>、<b>R</b> 切换工具（也可以点右上角的按钮）。',
  conds:[['W：拖动彩色箭头，移动方块',()=>G.S.flags.moved],['E：左右拖动，旋转方块',()=>G.S.flags.rotated],['R：左右拖动，缩放方块',()=>G.S.flags.scaled],['在 Inspector 把数值改回：Position 0、0.5、0，Rotation 0、0、0，Scale 1、1、1',()=>G.S.flags.moved&&G.S.flags.rotated&&G.S.flags.scaled&&!!G.P()&&G.near(G.P().pos,[0,.5,0])&&G.near(G.P().rot,[0,0,0])&&G.near(G.effScale(G.P()),[1,1,1])]],
  hint:'这个模拟器没有撤销功能，所以玩够了直接在 Inspector 里输入数字改回去。Q 是手形工具，左键拖动可以旋转视角。',
  auto:()=>{const p=G.P();Object.assign(G.S.flags,{moved:true,rotated:true,scaled:true});if(p){p.pos=[0,.5,0];p.rot=[0,0,0];p.scale=[1,1,1];}}},
 {title:'做地板',glow:()=>['#p-hier'],
  body:'再创建一个 <b>Plane</b>（平面）当地板，改名为 Floor。',
  conds:[['新建 Plane 并命名为 Floor',()=>!!G.FL()&&G.FL().type==='plane'],['Position 是 0、0、0',()=>!!G.FL()&&G.near(G.FL().pos,[0,0,0])],['Scale 是 3、1、3',()=>!!G.FL()&&G.near(G.effScale(G.FL()),[3,1,3])]],
  hint:'Hierarchy 右键 → 3D Object → Plane。然后在 Inspector 改名字和 Scale。',
  note:'Plane 默认是 10 乘 10，放大 3 倍后变成 30 乘 30，够走动了。',
  auto:()=>{let f=G.FL()||G.S.objs.find(o=>o.type==='plane')||G.mkObj('plane','Floor');f.name='Floor';f.pos=[0,0,0];f.scale=[3,1,3];G.select('obj',f.id);}},
 {title:'新建两个 Material',glow:()=>['#p-proj'],
  body:'<b>Material（材质）</b>是物体的「皮肤」：物体只是形状，颜色靠材质。在 Project 窗口新建两个材质，一个给地板，一个给方块。',
  conds:[['做出 2 个材质',()=>G.mats().length>=2]],
  hint:'在 Project 的空白处右键 → Create → Material，输入名字后按 Enter。建议名字：Floor_Mat 和 Player_Mat。想整洁的话，先 Create → Folder 建一个 Materials 文件夹，双击进去再建。',
  auto:()=>{G.ensureMats();}},
 {title:'上色并拖到物体上',glow:()=>['#p-proj'],
  body:'点选材质，在 Inspector 的 <b>Base Map</b> 选颜色；再把材质从 Project <b>拖到物体上</b>（拖到 Scene 里的物体，或 Hierarchy 里的名字上都行）。',
  conds:[['地板用了一个深灰色材质',()=>{const f=G.FL(),m=f&&G.matOf(f);return !!m&&G.isGray(m.color);}],['Player 用了一个橙色材质',()=>{const p=G.P(),m=p&&G.matOf(p);return !!m&&G.isOrange(m.color);}]],
  hint:'颜色现在随便选，这一章不用追求好看，第 4 章会教怎么用调色盘。',
  auto:()=>{const m=G.ensureMats();m[0].color='#4a4d52';m[1].color='#ff8a1f';if(G.FL())G.FL().mat=m[0].id;if(G.P())G.P().mat=m[1].id;}},
 {title:'认识 Prefab',glow:()=>['#p-hier','#p-proj'],
  body:'<b>Prefab（预制体）</b>是可以反复使用的物体模板。改一次模板，所有副本一起更新。后面做怪物、树、背包物品，全靠它。',
  conds:[['把 Hierarchy 里的 Player 拖进 Project 窗口，做成 Prefab',()=>{const p=G.P();return !!p&&!!p.prefab;}],['把 Prefab 从 Project 拖进 Scene 两次，场景里有 3 个方块',()=>G.S.flags.maxInst>=3],['选中 Project 里的 Prefab，把 Scale 的 X 改成 2，三个方块一起变宽',()=>G.S.flags.wide],['把 X 改回 1，并删掉多出来的两个（选中后按 Delete），只留一个',()=>G.S.flags.wide&&G.instCount()===1&&G.S.prefabs[(G.P()||{}).prefab]&&G.near([G.S.prefabs[G.P().prefab].scale[0]],[1])]],
  hint:'拖动：按住物体名字拖到 Project 空白处。多出来的方块叫 Player (1)、Player (2)。',
  auto:()=>{const p=G.P();if(!p)return;if(!p.prefab)G.makePrefab(p,G.S.cwd);const a=G.asset(G.S.prefabs[p.prefab].assetId);G.spawn(a,[3,.5,0]);G.spawn(a,[-3,.5,0]);G.S.flags.maxInst=3;G.S.flags.wide=true;
      G.S.objs=G.S.objs.filter(o=>!(o.prefab===p.prefab&&o!==p));G.select('obj',p.id);}},
 {title:'第一段 C# 脚本',glow:()=>['#p-proj'],
  body:'<b>脚本</b>是写给物体的指令。新建一个脚本，看一眼里面的代码，再把它拖到 Player 身上。',
  conds:[['新建脚本，名字必须是 PlayerMove（和代码里的 class 名字一致）',()=>G.S.assets.some(a=>a.type==='script'&&a.name==='PlayerMove')],['双击脚本，打开代码看一眼（点每一行有解释）',()=>G.S.flags.viewed],['把脚本拖到 Hierarchy 里的 Player 上',()=>{const p=G.P();return !!p&&p.scripts.some(s=>(G.asset(s.asset)||{}).name==='PlayerMove');}]],
  hint:'Project 空白处右键 → Create → MonoBehaviour Script。建议先建一个 Scripts 文件夹。故意把名字打错，再拖到 Player 上，看看 Console 会说什么。',
  note:'真实 Unity 里，名字必须和 class 一模一样，包括大小写，否则脚本挂不上去，这是新手最常见的错误之一。',
  auto:()=>{let a=G.S.assets.find(x=>x.type==='script'&&x.name==='PlayerMove');if(!a){const f=G.S.assets.find(x=>x.type==='folder'&&x.name==='Scripts')||G.mkAsset('folder','Scripts',0);a=G.mkAsset('script','PlayerMove',f.id);}
      G.S.flags.viewed=true;const p=G.P();if(p&&!p.scripts.some(s=>s.asset===a.id))p.scripts.push({asset:a.id,speed:5,enabled:true});}},
 {title:'调整摄像机',glow:()=>['#p-insp'],
  body:'现在摄像机太低，玩家一走就出画面。点选 <b>Main Camera</b>，从斜上方往下看。改完点上面的 <b>Game</b> 标签，看看玩家会看到什么。',
  conds:[['Main Camera 的 Position 是 0、8、-8',()=>{const c=G.S.objs.find(o=>o.type==='camera');return !!c&&G.near(c.pos,[0,8,-8]);}],['Main Camera 的 Rotation 是 45、0、0',()=>{const c=G.S.objs.find(o=>o.type==='camera');return !!c&&G.near(c.rot,[45,0,0]);}]],
  hint:'在 Scene 里，摄像机是那个线框的小金字塔。改数字后，它会跟着转。',
  auto:()=>{const c=G.S.objs.find(o=>o.type==='camera');if(c){c.pos=[0,8,-8];c.rot=[45,0,0];G.select('obj',c.id);}}},
 {title:'点 Play',glow:()=>['#playbtn'],
  body:'按顶部的 <b>Play</b>，用 <b>W、A、S、D</b> 走动，走出至少 2 个单位，再点一次 Play 停止。',
  conds:[['点 Play 开始',()=>G.S.flags.played],['按 WASD，让方块走动',()=>G.S.flags.movedInPlay],['再点一次 Play 停止',()=>G.S.flags.stopped]],
  hint:'如果按键没反应，先点一下 Game 画面再按。试试：Play 的时候，到 Inspector 把 Player Move 的 Speed 改成 10，方块立刻变快；停止后再看，Speed 变回 5。',
  note:'在 Play 模式下做的任何修改，停止后都会还原。所以编辑物体一定要在停止状态下做。',
  auto:()=>{if(G.S.playing)G.stopPlay();Object.assign(G.S.flags,{played:true,movedInPlay:true,stopped:true});}},
 {title:'保存场景',glow:()=>['#menu-file'],
  body:'场景不会自动保存，关掉没存就没了。看看 Hierarchy 里的 SampleScene，名字后面的 <b>*</b> 表示还没保存。',
  conds:[['按 Ctrl+S（Mac 是 Cmd+S），或 File → Save',()=>G.S.flags.saved&&!G.S.dirty]],
  hint:'如果快捷键没反应，用顶部的 File 菜单。',
  auto:()=>{if(G.S.playing)G.stopPlay();G.saveScene();}}
];

const FINISH=`<div class="finish"><div class="gstep">完成</div><h2>第 0 章完成：方块能走了</h2>
<p>你装好了编辑器（在真实 Unity 里），认识了五个窗口，做了方块、地板、材质、Prefab 和第一段 C#，还学会了 Play 和保存。</p>
<div class="note">下一章：恐怖游戏。黑暗走廊、手电筒、脚步声和一个会追你的怪物。（这个原型暂时只有第 0 章）</div>
<div class="gact"><button class="btn primary" data-act="reset">再玩一遍</button><button class="btn" data-act="home">回到主页</button></div></div>`;

const CODE=[
['using UnityEngine;','引入 Unity 的工具箱。没有它，Vector3、Time 这些词都不认识。'],
['using UnityEngine.InputSystem;','引入新版输入系统，用来读键盘。Unity 6 的新项目默认只用它。'],
['',''],
['public class PlayerMove : MonoBehaviour','宣布这是一个脚本，名字叫 PlayerMove。名字必须和文件名一致。继承 MonoBehaviour，才能挂到物体上。'],
['{','大括号成对出现，里面是这个脚本的全部内容。'],
['    public float speed = 5f;','速度变量。public 让它出现在 Inspector 里，不改代码就能调。'],
['',''],
['    void Update()','每一帧都会执行一次。画面每刷新一次，这里面的代码就跑一遍。'],
['    {','Update 的开始。'],
['        Keyboard keyboard = Keyboard.current;','取得当前连接的键盘。'],
['        if (keyboard == null) return;','没有键盘就直接结束，避免报错。'],
['',''],
['        float x = 0f;','x 是左右方向的输入，先设成 0。'],
['        float z = 0f;','z 是前后方向的输入，先设成 0。'],
['',''],
['        if (keyboard.aKey.isPressed) x -= 1f;','按住 A：x 减 1，往左。'],
['        if (keyboard.dKey.isPressed) x += 1f;','按住 D：x 加 1，往右。'],
['        if (keyboard.sKey.isPressed) z -= 1f;','按住 S：z 减 1，往后。'],
['        if (keyboard.wKey.isPressed) z += 1f;','按住 W：z 加 1，往前。'],
['',''],
['        Vector3 direction = new Vector3(x, 0f, z).normalized;','把输入做成一个三维箭头，并把长度调成 1。这样同时按 W 和 D 斜着走，不会比直走更快。'],
['        transform.Translate(direction * speed * Time.deltaTime, Space.World);','把物体沿箭头方向移动一段距离。乘上 Time.deltaTime，电脑跑 30 帧还是 144 帧，实际速度都一样。'],
['    }','Update 的结束。'],
['}','脚本的结束。']];

G.chapters = G.chapters || {};
G.chapters.ch0 = {steps:STEPS, finish:FINISH, code:CODE};
})();
