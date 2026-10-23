# 虚拟 Unity 教室：项目说明（给 Claude Code）

## 这个项目是什么

一个桌面 app（Electron），里面是一个**模拟的 Unity 编辑器**，加上一个**教练面板**，一步一步带完全没做过游戏的新手学做游戏。

- 用户下载 app，打开后先到主页选章节，再进入编辑器界面。
- 左边的教练告诉用户下一步点哪里、拖什么、改哪个数字。做对了，清单自动打勾，才能进下一步。
- 卡住可以点「帮我做这一步」。
- 目标是让新手先在一个不会弄坏的环境里熟悉 Unity 的操作，再去真正的 Unity 里照着做一遍。

**读者是完全新手。** 所有文字、步骤、提示都要以此为准：每一步只改一件事，每一步结束都能看到结果，不假设读者懂任何术语。

**发起人的出发点：** 他自己做过游戏，觉得最难熬的是「逻辑做完了，但颜色、灯光、装饰品让画面很丑」。所以美化（调色盘、灯光、后期处理、装饰品摆放）是这个项目的差异化重点，每个类型章节都要有美化环节，最好有「前后对比」。

## 语言和用词

- 界面和教学内容用**简体中文**。
- Unity 的专有名词保留英文原文，第一次出现时附中文解释，例如「Prefab（预制体）」「Material（材质）」。界面上的按钮和窗口名字（Hierarchy、Inspector、Play）跟 Unity 一样用英文，这样用户换到真 Unity 时认得出来。
- 写作风格：短句、直接、具体。不要说「非常简单」「轻松」之类的话。

## 课程大纲

| 章 | 内容 | 小成品 | 状态 |
| --- | --- | --- | --- |
| 0 | Unity 入门 | 能用 WASD 走动的方块 | 已完成（12 步） |
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

加新内容时，凡是涉及 Unity 界面、菜单路径、默认设置的，先查官方文档确认，不要凭记忆。

## 代码结构

```
app/index.html        全部界面、样式、逻辑（目前是单文件，见下方「建议的下一步」）
main.js               Electron 入口：无菜单栏，sandbox + contextIsolation，外链用系统浏览器打开
build/icon.png        app 图标（1024×1024，electron-builder 会转换成各平台格式）
scripts/smoke.js      冒烟测试：打开 app，截主页和编辑器两张图到 docs/，console 有 error 就失败
.github/workflows/build.yml  推送 v* tag 时在 Windows/macOS/Linux 打包并发布到 Releases
```

### app/index.html 里的关键部分

- **状态 `S`**：`objs`（场景物体）、`assets`（Project 文件）、`prefabs`、`sel`（当前选中）、`tool`（q/w/e/r）、`tab`（scene/game）、`step`（教练步骤）、`playing`、`flags`（教练用的进度标记）。`init()` 建初始场景。
- **`commit()`**：任何状态改动后调用，会重新渲染顶栏、Hierarchy、Project、Inspector、教练，并更新发光提示。高频变化（拖动、Play 中）用 `syncInspector()` + `checkGuide()`，避免整块重绘打断输入。
- **物体类型**：`cube`、`plane`、`camera`、`light`。Prefab 实例通过 `o.prefab` 指向 `S.prefabs[id]`，缩放没有被单独改过时（`scaleOverride=false`）跟随 Prefab。
- **文件类型**：`folder`、`material`（有 `color`）、`script`、`prefab`、`scene`。
- **3D 视图**：canvas 2D 手写的简易渲染器。`rotV` / `rotInv` 按 Unity 的欧拉角顺序（Z、X、Y），画家算法排序面，简单方向光明暗，近裁剪面在 `clipNear`。没有阴影、雾、后期处理。Scene 视角是绕 `V.target` 旋转的轨道相机；Game 视图用场景里的 Main Camera。
- **交互**：右键菜单（`openMenu`，手机长按也会触发）；面板之间的拖放是自己用 pointer 事件写的（`data-drag` / `data-drop`），不是 HTML5 drag-and-drop；W 工具可拖彩色箭头沿轴移动，E/R 左右拖动旋转/缩放。
- **Play 模式**：`startPlay()` 存快照，`stopPlay()` 还原，模拟「Play 模式下的修改会丢失」。只有挂了名为 `PlayerMove` 的脚本的物体会响应 WASD。
- **故意重现的新手错误**：脚本文件名 ≠ `PlayerMove` 时挂到物体上会在 Console 报红字；未保存场景显示 `*`。
- **教练 `STEPS`**：每步是一个对象：
  - `title`、`body`（可含少量 HTML）、`hint`、`note`（完成后才显示）
  - `conds`：`[文字, 检查函数]` 数组，全部为 true 才能点「下一步」
  - `auto()`：「帮我做这一步」，必须能从任何中间状态把这一步做完
  - `glow()`：返回要发亮的 CSS 选择器
  - `enter()`（可选）：进入这一步时执行
- **主页**：`#home` 覆盖层，章节卡片。完成第 0 章会在 localStorage 写 `vu.ch0.done`（所有 localStorage 读写都包在 try/catch 里）。
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
2. 改了教练步骤的话：从头到尾手动走一遍新步骤；再对每一步点「帮我做这一步」，确认都能直接完成。
3. 不要只靠「代码看起来对」就说完成了。

## 规则和约束

- app 要能**完全离线**运行。不要依赖 CDN 加载脚本；需要库就放进项目里一起打包。（目前 Google Fonts 是唯一的网络请求，断网时会退回系统字体，这是可以接受的。）
- Electron 安全设置保持：`contextIsolation: true`、`nodeIntegration: false`、`sandbox: true`。需要和系统交互时用 preload + IPC，不要打开 nodeIntegration。
- 不要用 `alert` / `confirm` / `prompt`，确认步骤做在界面里。
- **商标**：名字里含「Unity」只适合内部练习。公开发布前要和发起人确认改名。不要使用 Unity 的 logo 或任何官方视觉素材，界面只做「风格接近」，不做像素级复制。README 和主页要保留「本项目与 Unity Technologies 没有关联」。
- 提交信息用约定式格式（`feat:`、`fix:`、`docs:` 等）。

## 已知限制

- 没有撤销（Ctrl+Z）。
- 触屏上的拖放不太顺。
- 只有第 0 章。
- 渲染器做不出灯光、阴影、雾、后期处理，而这些正是恐怖章和美化章的核心。
- 进度只记录「第 0 章是否完成」，中途关掉 app 会从头开始。

## 建议的下一步（按顺序）

1. **拆分 `app/index.html`**：拆成 `styles.css`、编辑器核心（状态、渲染、交互）、每章一个步骤文件（例如 `chapters/ch0.js`）。拆完行为必须完全不变，用冒烟测试和手动走一遍第 0 章确认。
2. **章节系统**：主页卡片从章节数据生成；每章可以有自己的初始场景；保存每章的进度（做到第几步、场景状态），重开 app 可以继续。
3. **撤销**：至少支持 Ctrl+Z 撤销 Inspector 修改、创建、删除。
4. **为第 1 章升级渲染器**：评估改用 Three.js（打包进项目，不走 CDN），需要能演示：点光源/聚光灯（手电筒）、雾、阴影、后期处理（Vignette、Film Grain、Color Adjustments）。先做一个最小的技术验证，和发起人确认效果后再写第 1 章。
5. **写第 1 章：恐怖游戏**。先列出步骤大纲给发起人确认，再实现。美化环节要有「灰盒 → 加材质 → 加灯光 → 加后期」的前后对比。
6. 发布到 GitHub，推 `v0.1.0` tag，确认 Actions 产出三个平台的安装包。

做任何会改变课程内容或方向的决定（章节顺序、步骤内容、换渲染技术、改名）之前，先问发起人。
