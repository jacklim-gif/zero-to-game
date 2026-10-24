# 从零到游戏 Zero to Game：项目说明（给 Claude Code）

GitHub：https://github.com/jacklim-gif/zero-to-game

## 这个项目是什么

一个桌面 app（Electron），里面是一个**模拟的 Unity 编辑器**，加上一个**教练面板**，一步一步带完全没做过游戏的新手学做游戏。

- 用户下载 app，打开后先到主页选章节，再进入编辑器界面。
- 左边的教练告诉用户下一步点哪里、拖什么、改哪个数字。做对了，清单自动打勾，才能进下一步。
- 卡住可以点「帮我做这一步」。
- 目标是让新手先在一个不会弄坏的环境里熟悉 Unity 的操作，再去真正的 Unity 里照着做一遍。

**读者是完全新手。** 所有文字、步骤、提示都要以此为准：每一步只改一件事，每一步结束都能看到结果，不假设读者懂任何术语。

**发起人的出发点：** 他自己做过游戏，觉得最难熬的是「逻辑做完了，但颜色、灯光、装饰品让画面很丑」。所以美化（调色盘、灯光、后期处理、装饰品摆放）是这个项目的差异化重点，每个类型章节都要有美化环节，最好有「前后对比」。

## 语言和用词

- app 有**中文 / English 两种语言**，主页右上角和顶栏可以切换（存在 localStorage `ztg.lang`，默认中文）。中文模式下**全部**是中文，包括窗口名、菜单、物体默认名字（立方体、主摄像机、新建文件夹）；英文模式下全部是英文。（发起人 2026-10-23 决定，取代原来「界面按钮保留英文」的规则。）
- 中文译名尽量跟 Unity 官方中文语言包一致（层级、检查器、项目、场景、游戏、控制台、预制件、刚体……）。Unity 6 的中文语言包还是实验性的，这些词没有逐个核实过；全部集中在 `app/i18n.js`，要改译名只改那里。中文模式下，鼠标停在这些名词上会显示英文原名（`title`），方便对照英文版 Unity。
- 教练文字中，Unity 名词第一次出现时附另一种语言，例如「预制件（Prefab）」。用户给物体起的名字（Player、Floor、Floor_Mat、PlayerMove）两种语言都一样。
- 写作风格：短句、直接、具体。不要说「非常简单」「轻松」之类的话。英文同样。

## 课程大纲

| 章 | 内容 | 小成品 | 状态 |
| --- | --- | --- | --- |
| 0 | Unity 入门 | 能用 WASD 走动、走出地板会掉下去的方块 | 已完成（13 步） |
| 1 | 恐怖游戏 | 黑暗走廊、手电筒、脚步声、会追你的怪物 | 未开始 |
| 2 | 生存游戏 | 小岛、饥饿口渴、采集、合成斧头、昼夜、存档 | 未开始 |
| 3 | 沙盒游戏 | 网格建造：放置、删除、选建材、半透明预览 | 未开始 |
| 4 | 美化通用篇 | 调色盘、灯光三件套、挑 Asset、装饰品摆放、后期速查、性能 | 未开始 |

每章统一结构：成品预览 → 准备 → 步骤（每步只改一件事）→ 美化环节 → 常见错误 → 下一步。

另有一份配套的文字版第 0 章（Claude Docs 文档），内容和 app 里的第 0 章对应。

## 要和真实 Unity 保持一致的事实（核对于 2026 年 10 月）

- 版本：Unity 6.3 LTS，用 Unity Hub 安装。
- 项目模板：**Universal 3D**（以前叫 3D (URP)）。
- Unity 6 新项目默认 **Active Input Handling = Input System Package (New)**，旧的 `Input.GetAxis` 会抛 `InvalidOperationException`。所以本项目的 C# 示例一律用新输入系统（`UnityEngine.InputSystem`、`Keyboard.current`）。
- 建脚本：Project 右键 → Create → MonoBehaviour Script（较新版本在 Scripting 子菜单下）。文件名必须和 class 名一致。
- 坐标系：左手坐标系，Y 向上，Z 向前。Cube 边长 1，Plane 是 10×10。
- 材质 Shader：URP 的 Lit。材质变粉红 = Shader 和渲染管线不匹配。
- 物理：只有挂了 **Rigidbody** 的物体才受重力；没有 Rigidbody 时，走出地板会浮在空中。Cube 默认带 Box Collider，Plane 默认带 Mesh Collider，所以加了 Rigidbody 的方块能站在地板上。物理只在 Play 模式下运行。

加新内容时，凡是涉及 Unity 界面、菜单路径、默认设置的，先查官方文档确认，不要凭记忆。

## 代码结构

```
app/index.html        页面结构（固定文字用 data-i18n 标记，由 JS 填入当前语言）
app/styles.css        全部样式
app/i18n.js           界面文字（中文 / English）和 ZTG.t() / ZTG.L()，最先加载
app/chapters/ch0.js   第 0 章内容：STEPS、完成页、代码讲解、找 Bug 挑战（BUGS）、章末小测验（QUIZ）、导出说明，文字都写成 {zh, en}
app/vendor/three.js   Three.js r186（esbuild 打包的普通脚本，window.THREE），离线可用
app/scripts.js        内置 C# 脚本模板：FirstPersonMove、EnemyChase、SurvivalStats、DayNightCycle、SaveLoad、ItemData、Inventory（PlayerMove 在 ch0.js）
app/props.js          素材库：10 个用基本形状拼出来的低多边形装饰品（树、石头、木箱……），不用下载，CC0
app/editor.js         编辑器核心：状态、Three.js 渲染、交互、物理、脚本执行、NavMesh、UI、美化工具、教练提示层，最后加载
main.js               Electron 入口：无菜单栏，sandbox + contextIsolation，外链用系统浏览器打开；IPC：版本号、字体缩放、检查更新
preload.js            用 contextBridge 暴露 window.ztgApp（info / checkUpdate / openRelease / setZoom），不开放 Node
build/icon.png        app 图标（1024×1024，electron-builder 会转换成各平台格式）
scripts/smoke.js      冒烟测试：打开 app，截主页和编辑器两张图到 docs/，console 有 error 就失败
.github/workflows/build.yml  推送 v* tag 时在 Windows/macOS/Linux 打包并发布到 Releases
```

### 关键部分

脚本按 `i18n.js` → `vendor/three.js` → `scripts.js` → `props.js` → `chapters/ch0.js` → `editor.js` 的顺序加载（普通 `<script>`，不用 ES module：`file://` 下 module 容易被 CORS 挡）。它们通过全局命名空间 `window.ZTG` 互相访问：`editor.js` 把 `S`（getter）、`mkObj`、`select`、`P`、`FL` 等挂到 `ZTG` 上，章节文件里的函数用 `G.xxx` 在调用时读取。

- **语言**：`ZTG.t(key, ...参数)` 取界面文字；`ZTG.L({zh, en})` 取章节文字。找不到 key 会 `console.error`，冒烟测试会因此失败。Console 日志存的是 key + 参数，切换语言后旧日志也会跟着变。切换语言时，没改过名字的默认物体（主摄像机 ↔ Main Camera 等）一起改名。
- **状态 `S`**：`objs`（场景物体）、`assets`（Project 文件）、`prefabs`、`sel`（当前选中）、`tool`（q/w/e/r）、`tab`（scene/game）、`step`（教练步骤）、`playing`、`flags`（教练用的进度标记）。`init()` 建初始场景。
- **`commit()`**：任何状态改动后调用，会重新渲染顶栏、Hierarchy、Project、Inspector、教练，并更新发光提示。高频变化（拖动、Play 中）用 `syncInspector()` + `checkGuide()`，避免整块重绘打断输入。
- **物体类型**：`cube`、`sphere`、`capsule`、`cylinder`、`plane`、`quad`、`empty`、`camera`、`light`、`model`（素材库装饰品），以及 UI：`canvas`、`eventsystem`、`uitext`、`uiimage`、`uislider`、`uibutton`。每个物体还有 `parent`（父物体 id）、`tag`、`layer`，以及组件 `col`（碰撞体 `{kind: box|sphere|capsule|mesh, trigger}`，3D 物体创建时自带）、`rb`、`cc`（角色控制器）、`agent`（NavMesh 代理）、`navs`（NavMesh 表面，烘焙结果在 `navs.baked`）、`scripts`（`{asset, vals, enabled, seq}`）。组件按 `seq` 排序显示，都能用 ✕ 移除。Prefab 实例通过 `o.prefab` 指向 `S.prefabs[id]`，缩放没有被单独改过时（`scaleOverride=false`）跟随 Prefab。
- **文件类型**：`folder`、`material`（有 `color` 和 `shader`：`URP/Lit`、`URP/Unlit`、`Standard`；`Standard` 会变粉红，和真 Unity 一样）、`script`、`prefab`、`scene`、`model`（素材库导入的装饰品）、`itemdata`（模拟 ScriptableObject，项目里有 ItemData 脚本后 Create 菜单才出现）。在 Project 里双击文件夹进入、双击脚本打开（自己检测两次点击，因为第一次点击会重绘 DOM，原生 dblclick 收不到）。
- **3D 视图**：Three.js（`#cv`）画物体、灯光、阴影、网格、NavMesh 蓝色区域、选中物体的橙色轮廓；上面叠一层 2D canvas（`#gz`）画 Unity 风格的辅助线：移动箭头、摄像机/灯图标、绿色碰撞体线框、红色射线、蓝色导航路径、准星。场景数据一律是 Unity 坐标（左手、Y 上、Z 前，欧拉角顺序 Z→X→Y，`eulerM` / `mEuler`），交给 Three.js 前用 `tMat()` 两边各乘一个 Z 翻转矩阵。世界坐标用 `wPoint` / `wPos` / `wRot` / `wScale` 一层层套父物体；`reparent` 换父物体时保持世界位置。Scene 视角是绕 `V.target` 旋转的轨道相机；Game 视图用场景里的 Main Camera（可以是玩家的子物体）。点选用 Three.js 的 Raycaster。
- **物理**（只在 Play 中跑）：碰撞体用世界包围盒（AABB）近似。`rbPhysics` 让有刚体的物体落在任何非触发器碰撞体上；`ccMove`（角色控制器的 SimpleMove）水平方向被挡、上 0.3 米台阶、受重力；`triggers()` 在有刚体/角色控制器/代理的物体进出触发器时往控制台写「[模拟器提示] OnTriggerEnter」。
- **NavMesh**：`bakeNav` 在没有旋转的 Plane 上切 0.5 米格子，挡住的格子（静态碰撞体 + 0.5 米半径）不能走；`findPath` 是 8 方向 A*。
- **脚本模板**：文件名决定模板（`LIB()` = ch0 的 PlayerMove + `scripts.js`）。`kind` 决定怎么模拟：`translate`（PlayerMove）、`fps`（FirstPersonMove：鼠标转头 + 角色控制器走路，Game 视图里点一下锁定鼠标，拖动也行）、`chase`（EnemyChase：每 0.25 秒重新找路追 target）。缺组件、没指定 target、没烘焙 NavMesh 时，报和真 Unity 一样的 NullReferenceException / UnassignedReferenceException / SetDestination 错误（每次 Play 每种只报一次），点错误跳到那一行。第一人称时从摄像机正前方做 Physics.Raycast，显示打中什么。
- **UI**：Screen Space – Overlay，用 HTML 层 `#uilayer` 画（参考分辨率 1920×1080，按宽度缩放）。UI 物体有 Rect Transform（`ui.anchor` 九宫格锚点、`pos`、`size`）。建第一个 UI 物体时自动建 Canvas 和 EventSystem。
- **生存系统脚本**：`survival`（SurvivalStats：饥饿/口渴随时间下降，驱动 UI Slider）、`daynight`（DayNightCycle：旋转方向光，天空和环境光跟着变，`setSky`）、`saveload`（SaveLoad：F5 存 F9 读，模拟 PlayerPrefs，存在 `ztg.prefs`，Window → PlayerPrefs 查看，Edit 菜单可清空）、`inventory`（Inventory：引用 itemdata 列表，按 1/2/3 拾取并显示在 UI Text）。字段类型：`float`、`transform`、`ref`（只接受某种 UI 物体）、`assetlist`。
- **美化工具**：前后对比滑块（`#cmpx`，左边灰盒、右边真材质，用 scissor 画两遍）；调色盘（`paletteOf`：相近色 / 互补 / 三色 / 单色，一键生成材质）；素材库（Window → Asset Library，`propThumb` 离屏渲染缩略图）；摆放检查（`layoutCheck`：同角度、排成一线、大小差不多、空角落，用黄色标记）；截图对比（`ztg.snaps`，最多几张并排看）。浮动小窗口用 `openFloat` / `closeFloat`。
- **模式**：`MODE` = `ch0`（教学）、`free`（自由模式，没有教练步骤）、`bugs`（找 Bug 挑战，第 0 章完成后解锁）。每种模式各存一份进度：`ztg.ch0.save`、`ztg.free.save`、`ztg.bugs.save`。
- **提示分级**：教学模式下每步先只发亮（0 级），点「给我提示」显示提示文字（1 级），再点「指给我看」才出箭头和「帮我做这一步」（2 级）；同一步卡 25 秒自动升一级。设置里可改成「一直显示箭头」（`ztg.settings.hints = 'always'`）。
- **学习**：章末小测验（6 题，最好成绩存在 `ztg.ch0.quiz`）；导出到真 Unity（`exportUnity()` 自己写 zip，内含用户的 .cs 脚本 + 「在真 Unity 里怎么做」清单）。
- **设置**：齿轮按钮（语言、字体大小 90–130%、提示方式、检查更新、关于），「?」键或按钮打开快捷键说明。设置存在 `ztg.settings`。字体缩放在桌面 app 里走 `ztgApp.setZoom`（`setZoomFactor`），没有 preload 时退回 CSS zoom。
- **检查更新**：桌面 app 每天自动查一次 GitHub Releases 最新版本（`ztg.updchk`），有新版顶部出横条，点了用系统浏览器打开发布页。不会自动安装（macOS 自动安装需要付费代码签名）。
- **交互**：右键菜单（`openMenu`，手机长按也会触发）；面板之间的拖放是自己用 pointer 事件写的（`data-drag` / `data-drop`），不是 HTML5 drag-and-drop；W 工具可拖彩色箭头沿轴移动，E/R 左右拖动旋转/缩放。
- **Play 模式**：`startPlay()` 存快照，`stopPlay()` 还原，模拟「Play 模式下的修改会丢失」。只有挂了名为 `PlayerMove` 的脚本的物体会响应 WASD。
- **组件**：Inspector 底部有「添加组件 / Add Component」（目前只有 物理 → 刚体）。`o.rb = {useGravity, isKinematic, seq}`；脚本和刚体按 `seq`（添加顺序）显示。Cube 显示只读的 Box Collider，Plane 显示 Mesh Collider。
- **物理**：`physics(dt)` 只在 Play 中跑。挂了 Rigidbody 的方块受重力（9.81），落在没有旋转的 Plane 范围内（10×10 × 缩放）就停住，走出范围就一直往下掉。掉到 y < -3 会设 `flags.fell`。
- **故意重现的新手错误**：脚本文件名 ≠ `PlayerMove` 时挂到物体上会在 Console 报红字；未保存场景显示 `*`。
- **教练 `STEPS`**（在 `chapters/ch0.js`）：每步是一个对象：
  - `title`、`body`（可含少量 HTML）、`hint`、`note`（完成后才显示），都写成 `{zh, en}`
  - `conds`：`[{zh, en}, 检查函数]` 数组，全部为 true 才能点「下一步」
  - `auto()`：「帮我做这一步」，必须能从任何中间状态把这一步做完
  - `glow()`：返回要发亮的 CSS 选择器
  - `point()`：返回箭头提示。`{at: 选择器或{x,y}, label}` 是箭头指向某处；`{from, to, label}` 是动画演示从哪拖到哪。返回数组时，按顺序用第一个在屏幕上找得到的（用来做「菜单打开前指 + 号，打开后指菜单项」）。辅助工具在 `ZTG.hint`：`row(id)`、`field(bind)`、`mi(菜单 k)`、`isSel`、`reach(asset)`（资源不在当前文件夹时先指路）、`objScreen`、`handleAt`
  - `enter()`（可选）：进入这一步时执行
  - `play: true`（可选）：这一步需要在 Play 中进行；其他步骤 Play 时会提示先停止
- **提示层**：`#hintlayer`（`editor.js` 的 `updateHint()`），每 140ms 和每次 `commit()` 更新。一步做完后箭头自动指向「下一步」；代码窗口打开时指向关闭按钮。菜单项用 `data-k` 定位，不依赖文字，所以两种语言都能用。
- **主页**：`#home` 覆盖层，章节卡片。完成第 0 章会在 localStorage 写 `ztg.ch0.done`（所有 localStorage 读写都包在 try/catch 里）。
- **主题**：颜色全部是 CSS 变量，跟随系统亮/暗色。

## 怎么跑和怎么验证

```bash
npm install
npm start                                   # 打开 app
npm run smoke                               # 冒烟测试 + 更新 docs/ 截图
npm run dist:win / dist:mac / dist:linux    # 打包安装包到 dist/
```

在没有显示器的 Linux 环境里跑冒烟测试：

```bash
xvfb-run -a -s "-screen 0 1600x1000x24" npx electron --no-sandbox --disable-gpu scripts/smoke.js
```

**每次改动后的最低验证：**
1. `npm run smoke` 输出 `SMOKE OK`，并实际看一下两张截图有没有排版问题。
2. 改了教练步骤的话：从头到尾手动走一遍新步骤；再对每一步点「帮我做这一步」，确认都能直接完成。中文和英文都要走。
3. 不要只靠「代码看起来对」就说完成了。
4. 自己写的测试脚本请用内存 partition（`webPreferences.partition` 不带 `persist:`），否则会把 `ztg.ch0.done` 写进冒烟测试共用的 localStorage，主页截图会变成「已完成」。

## 规则和约束

- app 要能**完全离线**运行。不要依赖 CDN 加载脚本；需要库就放进项目里一起打包。（目前 Google Fonts 是唯一的网络请求，断网时会退回系统字体，这是可以接受的。）
- Electron 安全设置保持：`contextIsolation: true`、`nodeIntegration: false`、`sandbox: true`。需要和系统交互时用 preload + IPC，不要打开 nodeIntegration。
- 不要用 `alert` / `confirm` / `prompt`，确认步骤做在界面里。
- **商标**：项目名是「从零到游戏 / Zero to Game」，不要在 app 名字、图标、标题里用「Unity」。界面里提到 Unity 是为了说明教的是什么，这没问题。不要使用 Unity 的 logo 或任何官方视觉素材，界面只做「风格接近」，不做像素级复制。README 和主页要保留「本项目与 Unity Technologies 没有关联」。
- 提交信息用约定式格式（`feat:`、`fix:`、`docs:` 等）。
- 提交信息和 PR 里**不要加任何 AI 署名**（`Co-Authored-By: Claude`、`Claude-Session:`、「Generated with Claude Code」都不要）。这是发起人的个人项目。

## 已知限制

- 触屏上的拖放不太顺。
- 只有第 0 章（另有自由模式和找 Bug 挑战）。
- 素材库是程序生成的简单模型，不是 Kenney 的真素材（下载外部素材要先问发起人）。
- 更新只会提示，不会自动下载安装。
- 编辑器里还只有方向光，没有点光源 / 聚光灯组件、雾、后期处理（Three.js 都做得到，demo 里已有，等写第 1 章时接进编辑器）。
- 物理是简化版：碰撞体用包围盒，物体之间不会互相推，刚体不会翻倒。

## 建议的下一步（按顺序）

1. ~~拆分 `app/index.html`~~（已完成 2026-10-23）。之后又加了：中英文切换、教练箭头 / 拖动演示、刚体和掉落。
2. **章节系统**：主页卡片从章节数据生成；每章可以有自己的初始场景。（进度保存已完成。）
3. ~~撤销~~（已完成）。
4. ~~为第 1 章升级渲染器~~（已完成）：评估改用 Three.js（打包进项目，不走 CDN），需要能演示：点光源/聚光灯（手电筒）、雾、阴影、后期处理（Vignette、Film Grain、Color Adjustments）。先做一个最小的技术验证，和发起人确认效果后再写第 1 章。
   - 技术验证已做（2026-10-24）：`npm run demo` 打开 `prototypes/renderer-demo.html`，恐怖走廊 + 手电筒 + 闪烁灯泡 + 雾 + 阴影 + 金属/发光/贴图材质 + 后期处理 + 前后对比滑块，60 FPS。发起人已确认效果，编辑器已换成 Three.js（2026-10-24）。
   - Three.js r186 用 esbuild 打包成普通脚本 `app/vendor/three.js`（`window.THREE`，含 EffectComposer、RenderPass、UnrealBloomPass、ShaderPass、OutputPass）。入口 `scripts/three-entry.js`，改了跑 `npm run vendor`，打包结果要提交。r186 已没有 `PCFSoftShadowMap`，用 `PCFShadowMap`。
5. **写第 1 章：恐怖游戏**。先列出步骤大纲给发起人确认，再实现。美化环节要有「灰盒 → 加材质 → 加灯光 → 加后期」的前后对比。
6. 发布到 GitHub，推 `v0.1.0` tag，确认 Actions 产出三个平台的安装包。

做任何会改变课程内容或方向的决定（章节顺序、步骤内容、换渲染技术）之前，先问发起人。

## 功能清单（发起人 2026-10-23 提供）

「用在」是章节号。⚠ = 渲染器已换成 Three.js，做得出来，但编辑器里还没接上。做之前先和发起人确认顺序。

**A. Inspector 组件**
1. Add Component 按钮 + 搜索（全部）— 按钮已有，还没有搜索
2. Collider（Box、Sphere、Capsule），Scene 里显示绿色线框；没有 Collider 会穿墙（1、2、3）— 已完成
3. Rigidbody（重力、质量、Is Kinematic），教「有 Collider 但没 Rigidbody」的差别（3）— 第 0 章已有基础版
4. Character Controller：第一人称移动的标准做法（1）— 已完成（配合 FirstPersonMove 脚本）
5. Is Trigger + 触发事件：开门、捡东西、进入区域触发怪物（1、2）— 部分完成：触发检测和控制台提示有了，OnTriggerEnter 脚本模板等第 1 章
6. Audio Source / Audio Listener：脚步声、环境音（1）
7. Light 组件（Point、Spot，颜色、强度、范围）⚠ 手电筒就是 Spot Light（1、4）
8. 简单动画：门打开、灯闪烁，不用完整 Animator（1）
9. NavMesh 烘焙 + NavMesh Agent：怪物追人，重现「AI 不动」（1）— 已完成（NavMesh Surface + Agent + EnemyChase）
10. Particle System：火、灰尘、放置特效（3、4）

**B. 编辑器操作**
11. 撤销 / 重做（Ctrl+Z / Ctrl+Shift+Z）（全部）— 已完成
12. 父子关系：在 Hierarchy 把物体拖到另一个物体下（摄像机挂玩家、手电筒挂摄像机）（1）— 已完成（拖到物体上变子物体，拖到空白处取消；保持世界位置）
13. 复制（Ctrl+D）、复制粘贴（1、2）— 已完成
14. 更多物体：Sphere、Capsule、Cylinder、Quad、Empty GameObject（全部）— 已完成
15. 网格吸附（拖动时按住 Ctrl）（1、3）
16. Tags 和 Layers：触发器判断「碰到的是不是 Player」（1、2）— 已完成（检查器下拉选单；Layer 还没有实际作用）
17. 多选（Shift / Cmd 点选）（全部）— 已完成（层级里）
18. Prefab 覆盖（Overrides：Apply / Revert）（1、3）
19. Scene 里的辅助显示：灯光范围、Collider 线框、声音范围（1）— Collider 线框、导航路径、射线已有

**C. 写代码**
20. 填空式代码编辑：模板留几个空让用户自己打（全部）— 第 0 章已有（4 个空）
21. 模拟编译错误：少分号、拼错字、大小写错，显示和真 Unity 一样的红字（全部）— 已完成（CS1002、CS0103、CS0117、CS0664 等）
22. public 变量自动出现在 Inspector（全部）
23. Debug.Log 和 Console：点报错能跳到对应那行代码（全部）— 已完成
24. 执行顺序可视化：Play 时 Start、Update、OnTriggerEnter 被调用的那一刻代码亮一下（全部）— 已完成（Start、Update、按键行；OnTriggerEnter 等第 1 章）

**D. 美化（发起人说最难的部分）**
25. Lighting 窗口：天空盒、环境光颜色、雾 ⚠（1、2、4）
26. Post-processing Volume：Vignette、Film Grain、Bloom、Color Adjustments ⚠（1、4）
27. 阴影 ⚠（1、4）
28. 完整材质属性：Metallic、Smoothness、Emission（发光）、贴图（2、4）
29. 前后对比滑块：一边灰盒，一边美化后（每章）— 已完成
30. 调色盘工具：选一个主色，自动推荐 3 到 5 个搭配色（4）— 已完成
31. 内置免费素材库（例如 Kenney 的 CC0 低多边形模型），附授权说明（2、3、4）— 部分完成：10 个程序生成的装饰品；要换 Kenney 真素材需发起人同意下载
32. 装饰摆放检查：提示「太整齐」「大中小比例不对」「这个角落是空的」（4）— 已完成
33. 截图对比模式：保存场景的几个版本，并排对比（每章）— 已完成

**E. 游戏系统**
34. UI Canvas：文字、按钮、图片、血条 / 饥饿条（2）— 已完成
35. 昼夜循环（Directional Light 随时间旋转）（2）— 已完成
36. 存档 / 读档（模拟 PlayerPrefs 或 JSON）（2）— 已完成（PlayerPrefs）
37. 物品数据（模拟 ScriptableObject）（2）— 已完成
38. Raycast 可视化：从摄像机射出的线，显示打中了什么（1、3）— 已完成（第一人称时）

**F. 教练和学习体验**
39. 每章进度保存：关掉 app 再打开，从同一步继续（全部）— 已完成（localStorage `ztg.ch0.save`）
40. 提示分级：先轻轻提示，再指出位置，最后才「帮我做」（全部）— 已完成
41. 找 Bug 挑战：给一个坏掉的场景（材质粉红、画面全黑、AI 不动）让用户修好（每章末尾）— 第 0 章已有（4 个 Bug）
42. 术语悬停解释：鼠标停在 Prefab、Collider 上弹出一句话解释（全部）— 已完成（术语表在 i18n.js 的 TERMS）
43. 章末小测验（每章）— 第 0 章已有（6 题）
44. 自由模式：关掉教练自己随便做（学完后）— 已完成
45. 导出到真 Unity：把用户写的脚本导出成 .cs，加一张「在真 Unity 里怎么做」的清单（每章）— 已完成（zip）

**G. App 本身**
46. 自动更新（从 GitHub Releases 检查新版本）— 部分完成：会检查和提示，不自动安装
47. 中英文切换 — 已完成
48. 字体大小、快捷键说明页 — 已完成
