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
  del:'删除', rename:'重命名', save:'保存   Ctrl+S', saveAs:'另存为…（模拟器不支持）', undo:'撤销（模拟器不支持）',
  layouts:'布局', default:'默认', physics:'物理', rigidbodyM:'刚体',

  nCamera:'主摄像机', nLight:'方向光', nCube:'立方体', nPlane:'平面', nFolder:'新建文件夹', nMaterial:'新建材质',

  emptyFolder:'这个文件夹是空的。右键空白处，选「创建」新建文件。', consoleEmpty:'（空）', renameAria:'重命名',
  nothingSel:'没有选中任何东西。点一个物体或文件，这里就会显示它的属性。',
  objName:'物体名字', prefabInst:'预制件实例',
  transform:'变换', position:'位置', rotation:'旋转', scale:'缩放', fromPrefab:'来自预制件',
  camera:'摄像机', clearFlags:'清除标志', skybox:'天空盒', fov:'视野', projection:'投影', perspective:'透视',
  light:'光源', type:'类型', directional:'方向光', intensity:'强度',
  meshRenderer:'网格渲染器', matSlot:'材质（把材质拖到这里）',
  boxCollider:'盒状碰撞体', meshCollider:'网格碰撞体', isTrigger:'是触发器',
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
  lOnlyPrefab:'这个教程里只有方块和平面可以做成预制件',
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
  hStopFirst:'先点这里停止播放', hToScene:'先切回场景',
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
  del:'Delete', rename:'Rename', save:'Save   Ctrl+S', saveAs:'Save As… (not in simulator)', undo:'Undo (not in simulator)',
  layouts:'Layouts', default:'Default', physics:'Physics', rigidbodyM:'Rigidbody',

  nCamera:'Main Camera', nLight:'Directional Light', nCube:'Cube', nPlane:'Plane', nFolder:'New Folder', nMaterial:'New Material',

  emptyFolder:'This folder is empty. Right-click empty space and choose Create.', consoleEmpty:'(empty)', renameAria:'Rename',
  nothingSel:'Nothing selected. Click an object or file to see its properties here.',
  objName:'Object name', prefabInst:'Prefab instance',
  transform:'Transform', position:'Position', rotation:'Rotation', scale:'Scale', fromPrefab:'from Prefab',
  camera:'Camera', clearFlags:'Clear Flags', skybox:'Skybox', fov:'Field of View', projection:'Projection', perspective:'Perspective',
  light:'Light', type:'Type', directional:'Directional', intensity:'Intensity',
  meshRenderer:'Mesh Renderer', matSlot:'Material (drag a material here)',
  boxCollider:'Box Collider', meshCollider:'Mesh Collider', isTrigger:'Is Trigger',
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
  lOnlyPrefab:'In this tutorial only cubes and planes can become Prefabs',
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
  hStopFirst:'Stop Play first', hToScene:'Switch back to Scene',
},
};

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
