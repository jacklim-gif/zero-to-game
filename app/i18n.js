// 界面文字（中文 / English）。Unity 专有名词的中文叫法也都在这里，要改译名只改这个文件。
// 章节内容（教练文字）的翻译在 chapters/ 里，每段文字写成 {zh, en}。
(()=>{
'use strict';
window.ZTG = window.ZTG || {};
const G = window.ZTG;
const KEY = 'ztg.lang';
let lang = 'zh';
try { const v = localStorage.getItem(KEY); if (v === 'zh' || v === 'en') lang = v; } catch (e) {}

const D = {
zh: {
  appTitle:'从零到游戏',
  homeIntro:'在一个模拟的 Unity 编辑器里，跟着教练一步一步做出你的第一个游戏。不用安装 Unity，做错了也不会弄坏任何东西。',
  chN:n=>`第 ${n} 章`,
  ch0desc:n=>`认识界面，做一个能用 WASD 走动的方块。${n} 步，约 30 分钟。`,
  ch1t:'恐怖游戏', ch1d:'黑暗走廊、手电筒、脚步声，和一个会追你的怪物。',
  ch2t:'生存游戏', ch2d:'饥饿和口渴、采集、合成斧头、昼夜变化。',
  ch3t:'沙盒游戏', ch3d:'网格建造：放置、删除、半透明预览。',
  ch4t:'美化通用篇', ch4d:'调色盘、灯光三件套、挑 Asset、摆放装饰品。',
  soon:'即将推出',
  fine:'界面仿照 Unity 6.3 LTS，是练习用的模拟器。学会之后，请在真正的 Unity 里照着同样的步骤再做一遍。本项目与 Unity Technologies 没有关联。',
  start:'开始', doneAgain:'已完成 · 再玩一遍', cont:n=>`继续（步骤 ${n}）`,

  mFile:'文件', mEdit:'编辑', mGo:'游戏对象', mWindow:'窗口',
  playBtn:'▶ 播放', play:'播放', pause:'暂停',
  home:'主页', restart:'重新开始',
  coach:'教练',
  hier:'层级', scene:'场景', game:'游戏', insp:'检查器', proj:'项目', console:'控制台',
  tQ:'Q 手形', tW:'W 移动', tE:'E 旋转', tR:'R 缩放',
  view3d:'3D 视图', newObj:'新建物体', newAsset:'新建文件',
  banner:'播放模式：现在做的改动，停止后会全部还原',
  tip_q:'Q 手形：左键拖动旋转视角，滚轮缩放',
  tip_w:'W 移动：拖动彩色箭头；空白处拖动可旋转视角',
  tip_e:'E 旋转：选中物体后左右拖动',
  tip_r:'R 缩放：选中物体后左右拖动',
  tipGame:'游戏视图：这是玩家会看到的画面',

  win_hier:'层级：场景里所有物体的清单。',
  win_scene:'场景：摆放和编辑物体的地方（编辑视角）。右键拖动旋转视角，滚轮缩放。',
  win_game:'游戏：玩家实际看到的画面，由主摄像机拍出来。',
  win_insp:'检查器：选中一个物体后，在这里看和修改它的所有属性。',
  win_proj:'项目：项目里所有的文件，脚本、材质、预制件都放这里。',

  stepOf:(a,b)=>`步骤 ${a} / ${b}`, done:'完成', next:'下一步', finishCh:'完成本章', auto:'帮我做这一步',

  go3d:'3D 对象', cube:'立方体', plane:'平面',
  create:'创建', folderM:'文件夹', materialM:'材质', scriptM:'MonoBehaviour 脚本',
  del:'删除', rename:'重命名', save:'保存   Ctrl+S', saveAs:'另存为…（模拟器不支持）',
  undo:'撤销   Ctrl+Z', redo:'重做   Ctrl+Shift+Z', dup:'复制一份   Ctrl+D', copy:'拷贝   Ctrl+C', paste:'粘贴   Ctrl+V',
  createEmpty:'创建空物体', sphere:'球体', capsule:'胶囊', cylinder:'圆柱体', quad:'四边形',
  layouts:'布局', default:'默认', physics:'物理', rigidbodyM:'刚体',

  nCamera:'主摄像机', nLight:'方向光', nCube:'立方体', nPlane:'平面', nFolder:'新建文件夹', nMaterial:'新建材质',
  nSphere:'球体', nCapsule:'胶囊', nCylinder:'圆柱体', nQuad:'四边形', nEmpty:'游戏对象',

  emptyFolder:'这个文件夹是空的。右键空白处，选「创建」新建文件。', consoleEmpty:'（空）', renameAria:'重命名',
  nothingSel:'没有选中任何东西。点一个物体或文件，这里就会显示它的属性。',
  objName:'物体名字', prefabInst:'预制件实例',
  transform:'变换', position:'位置', rotation:'旋转', scale:'缩放', fromPrefab:'来自预制件',
  camera:'摄像机', clearFlags:'清除标志', skybox:'天空盒', fov:'视野', projection:'投影', perspective:'透视',
  light:'光源', type:'类型', directional:'方向光', intensity:'强度',
  meshRenderer:'网格渲染器', matSlot:'材质（把材质拖到这里）',
  boxCollider:'盒状碰撞体', meshCollider:'网格碰撞体', sphereCollider:'球形碰撞体', capsuleCollider:'胶囊碰撞体', isTrigger:'是触发器',
  nSelected:n=>`选中了 ${n} 个物体`,
  rigidbody:'刚体', mass:'质量', useGravity:'使用重力', isKinematic:'运动学',
  script:'脚本', scriptComp:'Player Move (脚本)', enabled:'启用', missing:'缺失',
  fileName:'文件名字', material:'材质', shader:'着色器', baseMap:'基础贴图（颜色）',
  colorAria:c=>`颜色 ${c}`, hexAria:'十六进制颜色',
  monoscript:'脚本文件', openCode:'打开代码',
  nameMismatch:n=>`文件名是 ${n}，但代码里的 class 叫 PlayerMove。两者必须一致，否则挂不到物体上。`,
  prefabAsset:'预制件资源', instances:'实例数量', pscl:'缩放（改这里，所有实例一起变）',
  folder:'文件夹', sceneT:'场景', addComponent:'添加组件',

  codeAria:'代码查看', codeVs:'模拟 Visual Studio · 只读', close:'关闭',
  codeMismatch:n=>`文件名是 ${n}，代码里的 class 叫 PlayerMove，两者不一致。`,
  codeTip:'点任意一行（行号是蓝色的），我告诉你这行在做什么。',

  created:n=>`已创建 ${n}`, saved:'场景已保存',
  alreadyPrefab:n=>`${n} 已经是预制件了`, nowPrefab:n=>`${n} 现在是预制件（蓝色图标）`,
  applied:(a,o)=>`${a} 已应用到 ${o}`, seeConsole:'出错了，看控制台',
  addedScript:n=>`已给 ${n} 添加 Player Move`, addedRb:n=>`已给 ${n} 添加刚体`,
  layoutReset:'已还原默认布局', stopBeforeSave:'先停止播放再保存',

  lReady:'模拟器已就绪：Unity 6.3 LTS，Universal 3D 模板',
  lCreated:n=>`已创建 ${n}`, lDeleted:n=>`已删除 ${n}`,
  lSaved:'已保存场景：Assets/Scenes/SampleScene.unity',
  lOnlyPrefab:'这个教程里只有 3D 物体和空物体可以做成预制件',
  lPrefabMade:(n,a)=>`${n} 已创建为预制件：${a}.prefab`,
  lInst:n=>`已实例化 ${n}`,
  lMat:(a,o)=>`材质 ${a} → ${o}`,
  lNoRenderer:n=>`${n} 没有网格渲染器，不能用材质`,
  lScriptErr:n=>`无法添加脚本组件“${n}”，因为找不到脚本类。文件名必须和代码里的 class 名字一致（这里是 PlayerMove）`,
  lHasScript:n=>`${n} 已经有这个脚本了`,
  lAddedScript:n=>`已给 ${n} 添加组件 Player Move (脚本)`,
  lBadDrop:'这种文件不能拖到物体上',
  lMissed:'没有拖到物体上，试试拖到方块或地板上',
  lPlay:'进入播放模式', lStop:'退出播放模式 — 所有改动已还原',
  lRbOnlyCube:'这个模拟器里只有方块可以加刚体',
  lHasRb:n=>`${n} 已经有刚体了`,
  lAddedRb:n=>`已给 ${n} 添加组件 刚体`,

  hSelect:'先点选它', hClose:'看完点这里关闭', hNext:'做完了，点「下一步」',
  hBackProject:'点这里切回项目', hOpenFolder:'双击打开这个文件夹', hBackAssets:'点这里回到 Assets',
  hStopFirst:'先点这里停止播放', hToScene:'先切回场景', hSaveCode:'点保存（Ctrl+S）',

  lRbNoMesh:'平面和四边形用的是网格碰撞体，不能直接加刚体',
  lPrefabKids:'这个模拟器暂时不能把带子物体的物体做成预制件',
  lParentLoop:'不能把物体放到它自己的子物体下面',
  lNotSaved:n=>`${n} 还没写完：双击打开，填好空格并保存`,
  lScriptBroken:n=>`无法添加脚本组件“${n}”：脚本有编译错误。先修好控制台里的红字。`,
  fixBeforePlay:'控制台有红字（编译错误），修好才能播放',
  raw:m=>m,
  codeSave:'保存', unsaved:'未保存',
  compiledOk:'编译成功，没有错误。',
  compiledErr:n=>`有 ${n} 个错误。红色标出的地方要改；点控制台里的红字也能跳过来。`,
  notCompiled:'还没保存过', scriptOk:'编译成功', scriptErrs:n=>`${n} 个编译错误`,
  runCount:n=>`Update() 已执行 ${n} 次`,
  errMeaning:'意思：',
},
en: {
  appTitle:'Zero to Game',
  homeIntro:'Make your first game step by step with a coach, inside a simulated Unity editor. No Unity install needed, and nothing you do can break anything.',
  chN:n=>`Chapter ${n}`,
  ch0desc:n=>`Learn the interface and make a cube you can walk around with WASD. ${n} steps, about 30 minutes.`,
  ch1t:'Horror Game', ch1d:'A dark corridor, a flashlight, footsteps, and a monster that chases you.',
  ch2t:'Survival Game', ch2d:'Hunger and thirst, gathering, crafting an axe, day and night.',
  ch3t:'Sandbox Game', ch3d:'Grid building: place, delete, see-through preview.',
  ch4t:'Making It Pretty', ch4d:'Color palettes, three-point lighting, picking assets, placing decorations.',
  soon:'Coming soon',
  fine:"The interface is modeled on Unity 6.3 LTS — it's a practice simulator. Once you've learned it, repeat the same steps in real Unity. This project is not affiliated with Unity Technologies.",
  start:'Start', doneAgain:'Done · Play again', cont:n=>`Continue (step ${n})`,

  mFile:'File', mEdit:'Edit', mGo:'GameObject', mWindow:'Window',
  playBtn:'▶ Play', play:'Play', pause:'Pause',
  home:'Home', restart:'Restart',
  coach:'Coach',
  hier:'Hierarchy', scene:'Scene', game:'Game', insp:'Inspector', proj:'Project', console:'Console',
  tQ:'Q Hand', tW:'W Move', tE:'E Rotate', tR:'R Scale',
  view3d:'3D view', newObj:'Create object', newAsset:'Create asset',
  banner:'Play mode: anything you change now is undone when you stop',
  tip_q:'Q Hand: left-drag to orbit, scroll to zoom',
  tip_w:'W Move: drag a colored arrow; drag empty space to orbit',
  tip_e:'E Rotate: select an object, then drag left or right',
  tip_r:'R Scale: select an object, then drag left or right',
  tipGame:'Game view: this is what the player sees',

  win_hier:'Hierarchy: a list of every object in the scene.',
  win_scene:'Scene: where you place and edit objects. Right-drag to orbit, scroll to zoom.',
  win_game:'Game: what the player actually sees, filmed by the Main Camera.',
  win_insp:'Inspector: select something to see and change all its properties here.',
  win_proj:'Project: every file in your project — scripts, materials, prefabs.',

  stepOf:(a,b)=>`Step ${a} of ${b}`, done:'Done', next:'Next', finishCh:'Finish chapter', auto:'Do this step for me',

  go3d:'3D Object', cube:'Cube', plane:'Plane',
  create:'Create', folderM:'Folder', materialM:'Material', scriptM:'MonoBehaviour Script',
  del:'Delete', rename:'Rename', save:'Save   Ctrl+S', saveAs:'Save As… (not in simulator)',
  undo:'Undo   Ctrl+Z', redo:'Redo   Ctrl+Shift+Z', dup:'Duplicate   Ctrl+D', copy:'Copy   Ctrl+C', paste:'Paste   Ctrl+V',
  createEmpty:'Create Empty', sphere:'Sphere', capsule:'Capsule', cylinder:'Cylinder', quad:'Quad',
  layouts:'Layouts', default:'Default', physics:'Physics', rigidbodyM:'Rigidbody',

  nCamera:'Main Camera', nLight:'Directional Light', nCube:'Cube', nPlane:'Plane', nFolder:'New Folder', nMaterial:'New Material',
  nSphere:'Sphere', nCapsule:'Capsule', nCylinder:'Cylinder', nQuad:'Quad', nEmpty:'GameObject',

  emptyFolder:'This folder is empty. Right-click empty space and choose Create.', consoleEmpty:'(empty)', renameAria:'Rename',
  nothingSel:'Nothing selected. Click an object or file to see its properties here.',
  objName:'Object name', prefabInst:'Prefab instance',
  transform:'Transform', position:'Position', rotation:'Rotation', scale:'Scale', fromPrefab:'from Prefab',
  camera:'Camera', clearFlags:'Clear Flags', skybox:'Skybox', fov:'Field of View', projection:'Projection', perspective:'Perspective',
  light:'Light', type:'Type', directional:'Directional', intensity:'Intensity',
  meshRenderer:'Mesh Renderer', matSlot:'Material (drag a material here)',
  boxCollider:'Box Collider', meshCollider:'Mesh Collider', sphereCollider:'Sphere Collider', capsuleCollider:'Capsule Collider', isTrigger:'Is Trigger',
  nSelected:n=>`${n} objects selected`,
  rigidbody:'Rigidbody', mass:'Mass', useGravity:'Use Gravity', isKinematic:'Is Kinematic',
  script:'Script', scriptComp:'Player Move (Script)', enabled:'Enabled', missing:'Missing',
  fileName:'File name', material:'Material', shader:'Shader', baseMap:'Base Map (color)',
  colorAria:c=>`Color ${c}`, hexAria:'Hex color',
  monoscript:'MonoScript', openCode:'Open',
  nameMismatch:n=>`The file is named ${n}, but the class in the code is PlayerMove. They must match, or it won't attach to an object.`,
  prefabAsset:'Prefab Asset', instances:'Instances', pscl:'Scale (change it here and every instance follows)',
  folder:'Folder', sceneT:'Scene', addComponent:'Add Component',

  codeAria:'Code viewer', codeVs:'Simulated Visual Studio · read-only', close:'Close',
  codeMismatch:n=>`The file is named ${n}, but the class is PlayerMove. They don't match.`,
  codeTip:"Click any line (blue line numbers) and I'll explain what it does.",

  created:n=>`Created ${n}`, saved:'Scene saved',
  alreadyPrefab:n=>`${n} is already a Prefab`, nowPrefab:n=>`${n} is now a Prefab (blue icon)`,
  applied:(a,o)=>`Applied ${a} to ${o}`, seeConsole:'Something went wrong — check the Console',
  addedScript:n=>`Added Player Move to ${n}`, addedRb:n=>`Added Rigidbody to ${n}`,
  layoutReset:'Layout reset', stopBeforeSave:'Stop Play before saving',

  lReady:'Simulator ready: Unity 6.3 LTS, Universal 3D template',
  lCreated:n=>`Created ${n}`, lDeleted:n=>`Deleted ${n}`,
  lSaved:'Saved scene: Assets/Scenes/SampleScene.unity',
  lOnlyPrefab:'In this tutorial only 3D objects and empty objects can become Prefabs',
  lPrefabMade:(n,a)=>`Created Prefab ${a}.prefab from ${n}`,
  lInst:n=>`Instantiated ${n}`,
  lMat:(a,o)=>`Material ${a} → ${o}`,
  lNoRenderer:n=>`${n} has no Mesh Renderer, so it can't use a material`,
  lScriptErr:n=>`Can't add script component '${n}' because the script class cannot be found. Make sure that there are no compile errors and that the file name and class name match (here: PlayerMove).`,
  lHasScript:n=>`${n} already has this script`,
  lAddedScript:n=>`Added component Player Move (Script) to ${n}`,
  lBadDrop:"This kind of file can't be dropped on an object",
  lMissed:'Not dropped on an object. Try the cube or the floor.',
  lPlay:'Entered Play mode', lStop:'Exited Play mode — all changes reverted',
  lRbOnlyCube:'In this simulator only cubes can have a Rigidbody',
  lHasRb:n=>`${n} already has a Rigidbody`,
  lAddedRb:n=>`Added component Rigidbody to ${n}`,

  hSelect:'Select it first', hClose:'Close it when you are done', hNext:'Done! Click Next',
  hBackProject:'Switch back to Project', hOpenFolder:'Double-click to open this folder', hBackAssets:'Back to Assets',
  hStopFirst:'Stop Play first', hToScene:'Switch back to Scene', hSaveCode:'Click Save (Ctrl+S)',

  lRbNoMesh:'Planes and Quads use a Mesh Collider, which cannot be used with a non-kinematic Rigidbody',
  lPrefabKids:"This simulator can't make a Prefab from an object with children yet",
  lParentLoop:"Can't make an object a child of its own child",
  lNotSaved:n=>`${n} isn't finished: double-click it, fill in the blanks and save`,
  lScriptBroken:n=>`Can't add script component '${n}' because the script class cannot be found. Make sure that there are no compile errors and that the file name and class name match.`,
  fixBeforePlay:'All compiler errors have to be fixed before you can enter playmode!',
  raw:m=>m,
  codeSave:'Save', unsaved:'Unsaved',
  compiledOk:'Compiled with no errors.',
  compiledErr:n=>`${n} error(s). Fix the parts marked in red — clicking a red line in the Console jumps here too.`,
  notCompiled:'Not saved yet', scriptOk:'Compiled OK', scriptErrs:n=>`${n} compile error(s)`,
  runCount:n=>`Update() has run ${n} times`,
  errMeaning:'',
},
};

// 术语解释：鼠标停在这些词上会弹出一句话。names 用来在教练文字里自动找到这些词。
const TERMS = {
  gameobject:{zh:['游戏对象'],en:['GameObject'],t:{zh:'场景里的每一样东西都是游戏对象：方块、灯、摄像机。它本身是空的，靠组件决定它是什么。',en:"Everything in a scene is a GameObject — cubes, lights, cameras. On its own it's empty; its components decide what it is."}},
  component:{zh:['组件'],en:['Component'],t:{zh:'挂在游戏对象上的一块功能，例如变换、刚体、脚本。检查器里一块一块显示的就是组件。',en:'A piece of functionality on a GameObject, like Transform, Rigidbody or a script. Each block in the Inspector is a component.'}},
  transform:{zh:['变换'],en:['Transform'],t:{zh:'每个游戏对象都有：位置、旋转、缩放。有父物体时，这些数字是相对父物体的。',en:'Every GameObject has one: position, rotation, scale. When it has a parent, the numbers are relative to the parent.'}},
  prefab:{zh:['预制件'],en:['Prefab'],t:{zh:'可以反复使用的物体模板。改模板，场景里所有副本一起变。',en:'A reusable object template. Change the template and every copy in the scene follows.'}},
  material:{zh:['材质'],en:['Material'],t:{zh:'物体的「皮肤」：颜色、亮不亮、像不像金属，都由材质决定。',en:"An object's skin: color, shininess, metal or not — all set by the material."}},
  shader:{zh:['着色器'],en:['Shader'],t:{zh:'材质背后的小程序，决定光照怎么算。URP 项目用 URP/Lit。材质变粉红 = 着色器不对。',en:'The small program behind a material that decides how lighting works. URP projects use URP/Lit. A pink material means the shader is wrong.'}},
  meshRenderer:{zh:['网格渲染器'],en:['Mesh Renderer'],t:{zh:'负责把形状画出来，并决定用哪个材质。关掉它，物体就看不见了（但还在）。',en:"Draws the shape and decides which material it uses. Turn it off and the object is invisible (but still there)."}},
  collider:{zh:['碰撞体'],en:['Collider'],t:{zh:'物体的「碰撞外形」。没有碰撞体，东西会互相穿过去。',en:'The shape used for collisions. Without one, things pass right through each other.'}},
  rigidbody:{zh:['刚体'],en:['Rigidbody'],t:{zh:'让物体受物理影响：重力、被推、掉下去。',en:'Puts an object under physics: gravity, being pushed, falling.'}},
  isTrigger:{zh:['是触发器'],en:['Is Trigger'],t:{zh:'打勾后碰撞体不再挡东西，而是在有东西进入时通知脚本。用来做开门、捡东西。',en:'When checked, the collider stops blocking things and tells scripts when something enters instead. Used for doors and pickups.'}},
  useGravity:{zh:['使用重力'],en:['Use Gravity'],t:{zh:'打勾才会往下掉。',en:'Checked means it falls.'}},
  isKinematic:{zh:['运动学'],en:['Is Kinematic'],t:{zh:'打勾后物理不再推它，只能用代码移动它。',en:'Checked means physics no longer pushes it; only code moves it.'}},
  mass:{zh:['质量'],en:['Mass'],t:{zh:'有多重。重的东西更难被推动。',en:'How heavy it is. Heavier things are harder to push.'}},
  script:{zh:['脚本'],en:['script'],t:{zh:'用 C# 写给物体的指令。文件名必须和代码里的 class 名一样。',en:'Instructions for an object, written in C#. The file name must match the class name.'}},
  scene:{zh:['场景'],en:['Scene'],t:{zh:'一个关卡或一个画面。记得保存。',en:'One level or screen of your game. Remember to save it.'}},
  hierarchy:{zh:['层级'],en:['Hierarchy'],t:{zh:'场景里所有物体的清单。把一个物体拖到另一个上面，它就变成子物体。',en:'A list of every object in the scene. Drag one onto another to make it a child.'}},
  inspector:{zh:['检查器'],en:['Inspector'],t:{zh:'显示和修改选中物体的所有组件。',en:'Shows and edits every component of what you selected.'}},
  project:{zh:['项目窗口'],en:['Project window'],t:{zh:'项目里所有的文件（资源）：脚本、材质、预制件。',en:'Every file (asset) in your project: scripts, materials, prefabs.'}},
  console:{zh:['控制台'],en:['Console'],t:{zh:'报错和 Debug.Log 的信息都在这里。红字是错误，点一下可以跳到出错的那一行。',en:'Errors and Debug.Log messages show up here. Red means error — click it to jump to that line.'}},
  camera:{zh:['摄像机'],en:['Camera'],t:{zh:'游戏视图里看到的画面，就是摄像机拍到的。',en:'The Game view shows what the camera sees.'}},
  light:{zh:['光源'],en:['Light'],t:{zh:'照亮场景。方向光像太阳，所有东西都从同一个方向被照到。',en:'Lights up the scene. A Directional Light works like the sun: everything is lit from the same direction.'}},
  parent:{zh:['子物体','父物体'],en:['child','parent'],t:{zh:'子物体会跟着父物体移动、旋转、缩放。例如把摄像机放到玩家下面，摄像机就跟着玩家走。',en:"A child follows its parent's moves, turns and scale. Put the camera under the player and it follows the player."}},
  emptyObj:{zh:['空物体'],en:['Empty'],t:{zh:'只有变换、看不见的物体。用来整理层级，或当一组物体的父物体。',en:'An invisible object with only a Transform. Used to organize the Hierarchy or as the parent of a group.'}},
  baseMap:{zh:['基础贴图'],en:['Base Map'],t:{zh:'材质的主要颜色（或图片）。',en:"The material's main color (or image)."}},
  fov:{zh:['视野'],en:['Field of View'],t:{zh:'摄像机能看多宽。数字越大，看到的越多，东西显得越小。',en:'How wide the camera sees. Bigger means you see more and things look smaller.'}},
  playMode:{zh:['播放模式'],en:['Play mode'],t:{zh:'按播放后游戏真的在跑。这时做的修改，停止后都会还原。',en:'After you press Play the game is really running. Changes made now are undone when you stop.'}},
  monobehaviour:{zh:['MonoBehaviour'],en:['MonoBehaviour'],t:{zh:'脚本要继承它，才能挂到游戏对象上。',en:'A script must inherit from it to attach to a GameObject.'}},
  deltaTime:{zh:['Time.deltaTime'],en:['Time.deltaTime'],t:{zh:'上一帧用了多少秒。乘上它，不管电脑快慢，移动速度都一样。',en:'How many seconds the last frame took. Multiply by it and speed stays the same on fast and slow computers.'}},
  update:{zh:['Update'],en:['Update'],t:{zh:'每一帧都会执行一次的方法。',en:'A method that runs once every frame.'}},
  debugLog:{zh:['Debug.Log'],en:['Debug.Log'],t:{zh:'把一句话打印到控制台，用来确认代码跑到了这里。',en:'Prints a message to the Console so you can check the code reached that line.'}},
};
G.terms = TERMS;
G.termName = (k, l) => TERMS[k] ? TERMS[k][l || lang][0] : k;

G.lang = () => lang;
G.setLang = v => {
  lang = v;
  try { localStorage.setItem(KEY, v); } catch (e) {}
  document.documentElement.lang = v === 'zh' ? 'zh-CN' : 'en';
};
G.tl = (l, k, ...a) => {
  const s = D[l][k];
  if (s == null) { console.error('i18n missing [' + l + ']: ' + k); return D.zh[k] == null ? k : (typeof D.zh[k] === 'function' ? D.zh[k](...a) : D.zh[k]); }
  return typeof s === 'function' ? s(...a) : s;
};
G.t = (k, ...a) => G.tl(lang, k, ...a);
G.L = v => (v && typeof v === 'object' && !Array.isArray(v) && ('zh' in v || 'en' in v)) ? (v[lang] != null ? v[lang] : v.zh) : v;
document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
})();
