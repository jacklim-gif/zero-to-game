// 内置的 C# 脚本模板（第 0 章的 PlayerMove 在 chapters/ch0.js）。
// 新建 MonoBehaviour 脚本后改名成这里的名字，就会得到对应的代码。
// 每行 c 是片段（字符串或空格 {b}），x 是点这一行时的解释，run / key 控制播放时这一行什么时候亮。
// fields 是 public 变量，会出现在检查器里；kind 决定模拟器怎么执行这个脚本。
(() => {
'use strict';
window.ZTG = window.ZTG || {};
const noBlanks = () => ({ errors: [], rt: {} });
const B = id => ({ b: id });
const val = (b, k) => String(b[k] == null ? '' : b[k]).trim();
// 和第 0 章一样的数字检查：5f、5 都可以；5.5 少了 f 会报 CS0664
function floatBlank(E, b, k, rt) {
  const s = val(b, k);
  if (!s) E.push({ b: k, code: 'CS1525', en: "Invalid expression term ';'", zh: '等号后面空着，要填一个数字。' });
  else if (/^-?\d+(\.\d+)?[fF]$/.test(s) || /^-?\d+$/.test(s)) rt[k] = parseFloat(s);
  else if (/^-?(\d*\.\d+|\d+\.)$/.test(s)) E.push({ b: k, code: 'CS0664', en: "Literal of type double cannot be implicitly converted to type 'float'; use an 'F' suffix to create a literal of this type", zh: '带小数点的数字后面要加 f，例如 4.5f。' });
  else E.push({ b: k, code: 'CS0103', en: `The name '${s}' does not exist in the current context`, zh: `电脑不认识「${s}」这个词。这里要填一个数字。` });
}

// 第 1 章要填 3 个空：速度、要找的组件、用来走路的方法
const FirstPersonMove = {
  name: 'FirstPersonMove', kind: 'fps',
  blanks: [
    { id: 'speed', w: 4, tip: { zh: '走路速度，填一个数字，例如 4f', en: 'Walking speed: a number, e.g. 4f' } },
    { id: 'comp', w: 19, tip: { zh: '要找的组件：CharacterController（注意大小写，中间没有空格）', en: 'The component to find: CharacterController (mind the capitals, no space)' } },
    { id: 'move', w: 10, tip: { zh: '角色控制器用来走路的方法：SimpleMove', en: "The Character Controller's walking method: SimpleMove" } }],
  answers: { speed: '4f', comp: 'CharacterController', move: 'SimpleMove' },
  compile(b) {
    const E = [], rt = { speed: 4 };
    floatBlank(E, b, 'speed', rt);
    const c = val(b, 'comp');
    if (!c) E.push({ b: 'comp', code: 'CS1525', en: "Invalid expression term '>'", zh: '尖括号 <> 里空着，要填组件的名字 CharacterController。' });
    else if (c !== 'CharacterController') E.push({ b: 'comp', code: 'CS0246', en: `The type or namespace name '${c}' could not be found (are you missing a using directive or an assembly reference?)`, zh: `找不到叫「${c}」的组件。要写 CharacterController，两个大写字母 C，中间没有空格。` });
    const m = val(b, 'move');
    if (!m) E.push({ b: 'move', code: 'CS1001', en: 'Identifier expected', zh: '点号后面空着，要填方法名 SimpleMove。' });
    else if (m !== 'SimpleMove') E.push({ b: 'move', code: 'CS1061', en: `'CharacterController' does not contain a definition for '${m}' and no accessible extension method '${m}' accepting a first argument of type 'CharacterController' could be found (are you missing a using directive or an assembly reference?)`, zh: `角色控制器没有「${m}」这个方法。要写 SimpleMove（S 和 M 大写）。` });
    return { errors: E, rt };
  },
  fields: [{ id: 'speed', label: 'Speed', type: 'float', def: 4 }, { id: 'mouseSensitivity', label: 'Mouse Sensitivity', type: 'float', def: 0.15 }],
  lines: [
    { c: ['using UnityEngine;'], x: { zh: '引入 Unity 的工具箱。', en: "Brings in Unity's toolbox." } },
    { c: ['using UnityEngine.InputSystem;'], x: { zh: '引入新版输入系统，用来读键盘和鼠标。', en: 'Brings in the new Input System to read the keyboard and mouse.' } },
    { c: [''] },
    { c: ['public class FirstPersonMove : MonoBehaviour'], x: { zh: '第一人称移动脚本。挂在玩家身上，玩家下面要有一个摄像机（子物体）。', en: 'A first-person movement script. Put it on the player, with a camera as a child object.' } },
    { c: ['{'] },
    { c: ['    public float speed = ', B('speed'), ';'], x: { zh: '走路速度，每秒几米。', en: 'Walking speed, in meters per second.' } },
    { c: ['    public float mouseSensitivity = 0.15f;'], x: { zh: '鼠标灵敏度：鼠标动一点，视角转多少。', en: 'Mouse sensitivity: how far the view turns when the mouse moves.' } },
    { c: ['    CharacterController controller;'], x: { zh: '用来存角色控制器。它负责走路时被墙挡住、受重力。', en: 'Holds the Character Controller, which stops you at walls and applies gravity.' } },
    { c: ['    Transform cam;'], x: { zh: '用来存摄像机，抬头低头时转它。', en: 'Holds the camera, which tilts when you look up and down.' } },
    { c: ['    float pitch;'], x: { zh: '现在抬头（负数）或低头（正数）多少度。', en: 'How far you are looking up (negative) or down (positive), in degrees.' } },
    { c: [''] },
    { c: ['    void Start()'], run: 'start', x: { zh: '开始播放时执行一次。', en: 'Runs once, when Play starts.' } },
    { c: ['    {'], run: 'start' },
    { c: ['        controller = GetComponent<', B('comp'), '>();'], run: 'start', err: 'noCC', x: { zh: '在同一个物体上找角色控制器。找不到会得到 null（空的）。', en: "Finds the Character Controller on this object. If there isn't one, you get null (nothing)." } },
    { c: ['        cam = GetComponentInChildren<Camera>().transform;'], run: 'start', err: 'noCam', x: { zh: '在子物体里找摄像机。找不到就会报 NullReferenceException：把摄像机拖到玩家下面就好。', en: 'Finds a camera among the children. If there is none you get a NullReferenceException — drag the camera under the player.' } },
    { c: ['        Cursor.lockState = CursorLockMode.Locked;'], run: 'start', x: { zh: '把鼠标锁在画面中间并隐藏。按 Esc 可以放开。', en: 'Locks the mouse to the center of the screen and hides it. Press Esc to release it.' } },
    { c: ['    }'], run: 'start' },
    { c: [''] },
    { c: ['    void Update()'], run: 'update', x: { zh: '每一帧执行一次。', en: 'Runs once per frame.' } },
    { c: ['    {'], run: 'update' },
    { c: ['        Vector2 look = Mouse.current.delta.ReadValue() * mouseSensitivity;'], run: 'look', x: { zh: '读这一帧鼠标移动了多少。', en: 'Reads how far the mouse moved this frame.' } },
    { c: ['        transform.Rotate(0f, look.x, 0f);'], run: 'look', x: { zh: '鼠标左右动：整个玩家左右转身。', en: 'Mouse left/right: the whole player turns.' } },
    { c: ['        pitch = Mathf.Clamp(pitch - look.y, -80f, 80f);'], run: 'look', x: { zh: '鼠标上下动：抬头或低头，最多 80 度，不会翻过去。', en: "Mouse up/down: look up or down, at most 80 degrees so you can't flip over." } },
    { c: ['        cam.localEulerAngles = new Vector3(pitch, 0f, 0f);'], run: 'look', err: 'noCam', x: { zh: '只转摄像机，不转身体，所以抬头时脚不会离地。', en: "Tilts only the camera, not the body, so your feet stay on the ground when you look up." } },
    { c: [''], run: 'update' },
    { c: ['        Keyboard keyboard = Keyboard.current;'], run: 'update' },
    { c: ['        float x = 0f, z = 0f;'], run: 'update' },
    { c: ['        if (keyboard.aKey.isPressed) x -= 1f;'], run: 'update', key: 'KeyA' },
    { c: ['        if (keyboard.dKey.isPressed) x += 1f;'], run: 'update', key: 'KeyD' },
    { c: ['        if (keyboard.sKey.isPressed) z -= 1f;'], run: 'update', key: 'KeyS' },
    { c: ['        if (keyboard.wKey.isPressed) z += 1f;'], run: 'update', key: 'KeyW' },
    { c: [''], run: 'update' },
    { c: ['        Vector3 move = transform.right * x + transform.forward * z;'], run: 'update', x: { zh: '按「玩家面向的方向」算出要走的方向。按 W 永远是往前看的方向走。', en: 'Works out the direction relative to where the player faces. W always walks the way you look.' } },
    { c: ['        controller.', B('move'), '(move.normalized * speed);'], run: 'move', err: 'noCC', x: { zh: '用角色控制器走路：碰到有碰撞体的墙会停下，脚下没东西会往下掉。和 transform.Translate 不一样，不会穿墙。', en: 'Walks with the Character Controller: it stops at walls that have colliders and falls when there is nothing below. Unlike transform.Translate, it never goes through walls.' } },
    { c: ['    }'], run: 'update' },
    { c: ['}'] }],
};

const EnemyChase = {
  name: 'EnemyChase', kind: 'chase', blanks: [], answers: {}, compile: noBlanks,
  fields: [{ id: 'target', label: 'Target', type: 'transform', def: null }, { id: 'startDelay', label: 'Start Delay', type: 'float', def: 3 }],
  lines: [
    { c: ['using UnityEngine;'], x: { zh: '引入 Unity 的工具箱。', en: "Brings in Unity's toolbox." } },
    { c: ['using UnityEngine.AI;'], x: { zh: '引入 AI 导航，用来找路。', en: 'Brings in AI navigation, used for pathfinding.' } },
    { c: [''] },
    { c: ['public class EnemyChase : MonoBehaviour'], x: { zh: '追人的怪物。要挂在有 NavMesh Agent 的物体上，场景里要先烘焙 NavMesh。', en: 'A chasing monster. Put it on an object with a NavMesh Agent, and bake a NavMesh in the scene first.' } },
    { c: ['{'] },
    { c: ['    public Transform target;'], err: 'noTarget', x: { zh: '要追谁。public 的 Transform 会在检查器里出现一个空格，把玩家从层级拖进去。', en: 'Who to chase. A public Transform shows up as a slot in the Inspector — drag the player into it from the Hierarchy.' } },
    { c: ['    public float startDelay = 3f;'], x: { zh: '开始播放后先等几秒才开始追，给玩家一点时间。', en: 'Seconds to wait after Play starts before chasing, to give the player a head start.' } },
    { c: ['    NavMeshAgent agent;'], x: { zh: '用来存导航代理，它会自己沿着能走的路径移动。', en: 'Holds the NavMesh Agent, which moves along walkable paths by itself.' } },
    { c: [''] },
    { c: ['    void Start()'], run: 'start', x: { zh: '开始播放时执行一次。', en: 'Runs once, when Play starts.' } },
    { c: ['    {'], run: 'start' },
    { c: ['        agent = GetComponent<NavMeshAgent>();'], run: 'start', x: { zh: '在同一个物体上找导航代理。', en: 'Finds the NavMesh Agent on this object.' } },
    { c: ['    }'], run: 'start' },
    { c: [''] },
    { c: ['    void Update()'], run: 'update', x: { zh: '每一帧执行一次。', en: 'Runs once per frame.' } },
    { c: ['    {'], run: 'update' },
    { c: ['        if (Time.timeSinceLevelLoad < startDelay) return;'], run: 'update', x: { zh: 'Time.timeSinceLevelLoad 是场景开始后过了几秒。还没到 startDelay 就先不动。', en: 'Time.timeSinceLevelLoad is how many seconds since the scene started. Until startDelay has passed, do nothing.' } },
    { c: ['        agent.SetDestination(target.position);'], run: 'move', err: 'chase', x: { zh: '每一帧都告诉代理「目的地是目标现在的位置」，它会自己绕过障碍物走过去。', en: "Every frame, tells the agent “go to where the target is now”. It finds its own way around obstacles." } },
    { c: ['    }'], run: 'update' },
    { c: ['}'] }],
};

const SurvivalStats = {
  name: 'SurvivalStats', kind: 'survival', blanks: [], answers: {}, compile: noBlanks,
  fields: [{ id: 'hungerBar', label: 'Hunger Bar', type: 'ref', accept: 'uislider', def: null },
           { id: 'hunger', label: 'Hunger', type: 'float', def: 100 }, { id: 'drainPerSecond', label: 'Drain Per Second', type: 'float', def: 5 }],
  lines: [
    { c: ['using UnityEngine;'] },
    { c: ['using UnityEngine.UI;'], x: { zh: '引入 UI，才能用 Slider（滑动条）。', en: 'Brings in UI so we can use Slider.' } },
    { c: ['using UnityEngine.InputSystem;'] },
    { c: [''] },
    { c: ['public class SurvivalStats : MonoBehaviour'], x: { zh: '生存数值：饥饿会慢慢下降，按 E 吃东西，血条（滑动条）跟着变。', en: 'Survival stats: hunger slowly drops, press E to eat, and the bar (a Slider) follows.' } },
    { c: ['{'] },
    { c: ['    public Slider hungerBar;'], err: 'noBar', x: { zh: '要显示饥饿的滑动条。在检查器里把层级里的滑动条拖进这一格。', en: 'The Slider that shows hunger. Drag the Slider from the Hierarchy into this slot in the Inspector.' } },
    { c: ['    public float hunger = 100f;'], x: { zh: '现在的饥饿值，满是 100。', en: 'Current hunger, 100 is full.' } },
    { c: ['    public float drainPerSecond = 5f;'], x: { zh: '每秒少多少。', en: 'How much it drops per second.' } },
    { c: [''] },
    { c: ['    void Update()'], run: 'update' },
    { c: ['    {'], run: 'update' },
    { c: ['        hunger -= drainPerSecond * Time.deltaTime;'], run: 'move', x: { zh: '每一帧扣一点。乘上 Time.deltaTime，变成「每秒扣 drainPerSecond」。', en: 'Takes a little off every frame. Multiplying by Time.deltaTime makes it “drainPerSecond per second”.' } },
    { c: ['        hunger = Mathf.Clamp(hunger, 0f, 100f);'], run: 'update', x: { zh: '限制在 0 到 100 之间，不会变成负数。', en: 'Keeps it between 0 and 100 so it never goes negative.' } },
    { c: [''], run: 'update' },
    { c: ['        if (Keyboard.current.eKey.wasPressedThisFrame)'], run: 'update', key: 'KeyE', x: { zh: 'wasPressedThisFrame：只在按下的那一帧是 true，按住不放不会一直吃。', en: 'wasPressedThisFrame is true only on the frame the key goes down, so holding E does not keep eating.' } },
    { c: ['            hunger = Mathf.Min(hunger + 30f, 100f);'], run: 'update', key: 'KeyE', x: { zh: '吃东西：加 30，最多 100。', en: 'Eat: add 30, up to 100.' } },
    { c: [''], run: 'update' },
    { c: ['        hungerBar.value = hunger / 100f;'], run: 'update', err: 'noBar', x: { zh: '滑动条的值是 0 到 1，所以除以 100。', en: "A Slider's value goes from 0 to 1, so divide by 100." } },
    { c: ['    }'], run: 'update' },
    { c: ['}'] }],
};

const DayNightCycle = {
  name: 'DayNightCycle', kind: 'daynight', blanks: [], answers: {}, compile: noBlanks,
  fields: [{ id: 'dayLengthSeconds', label: 'Day Length Seconds', type: 'float', def: 30 }],
  lines: [
    { c: ['using UnityEngine;'] },
    { c: [''] },
    { c: ['public class DayNightCycle : MonoBehaviour'], x: { zh: '昼夜循环：挂在方向光上，让「太阳」一直转。太阳转到地平线下面就是晚上。', en: 'Day and night: put it on the Directional Light so the “sun” keeps turning. When it goes below the horizon, it is night.' } },
    { c: ['{'] },
    { c: ['    public float dayLengthSeconds = 30f;'], x: { zh: '一整天（转一圈）要几秒。', en: 'How many seconds a full day (one full turn) takes.' } },
    { c: [''] },
    { c: ['    void Update()'], run: 'update' },
    { c: ['    {'], run: 'update' },
    { c: ['        float degreesPerSecond = 360f / dayLengthSeconds;'], run: 'update', x: { zh: '一圈 360 度，除以秒数，就是每秒转几度。', en: 'A full turn is 360 degrees; divide by the seconds to get degrees per second.' } },
    { c: ['        transform.Rotate(degreesPerSecond * Time.deltaTime, 0f, 0f);'], run: 'move', x: { zh: '绕 X 轴转一点点。光的方向变了，场景的明暗和天空颜色就跟着变。', en: 'Turns a little around the X axis. As the light direction changes, the scene brightness and sky color follow.' } },
    { c: ['    }'], run: 'update' },
    { c: ['}'] }],
};

const SaveLoad = {
  name: 'SaveLoad', kind: 'saveload', blanks: [], answers: {}, compile: noBlanks, fields: [],
  lines: [
    { c: ['using UnityEngine;'] },
    { c: ['using UnityEngine.InputSystem;'] },
    { c: [''] },
    { c: ['public class SaveLoad : MonoBehaviour'], x: { zh: '存档和读档：按 K 存下现在的位置，按 L 回到存的位置。停止播放、甚至关掉 app 再开，存档都还在。', en: 'Save and load: press K to save your position, L to go back to it. The save survives stopping Play and even restarting the app.' } },
    { c: ['{'] },
    { c: ['    void Update()'], run: 'update' },
    { c: ['    {'], run: 'update' },
    { c: ['        Keyboard keyboard = Keyboard.current;'], run: 'update' },
    { c: [''], run: 'update' },
    { c: ['        if (keyboard.kKey.wasPressedThisFrame)'], run: 'update', key: 'KeyK' },
    { c: ['        {'], run: 'update', key: 'KeyK' },
    { c: ['            PlayerPrefs.SetFloat("playerX", transform.position.x);'], run: 'update', key: 'KeyK', x: { zh: 'PlayerPrefs 是 Unity 自带的小存档：用一个名字（键）存一个数字或文字。', en: "PlayerPrefs is Unity's built-in small save: store a number or text under a name (a key)." } },
    { c: ['            PlayerPrefs.SetFloat("playerZ", transform.position.z);'], run: 'update', key: 'KeyK' },
    { c: ['            PlayerPrefs.Save();'], run: 'update', key: 'KeyK', x: { zh: '马上写进硬盘。', en: 'Writes it to disk right away.' } },
    { c: ['            Debug.Log("Saved");'], run: 'update', key: 'KeyK' },
    { c: ['        }'], run: 'update', key: 'KeyK' },
    { c: [''], run: 'update' },
    { c: ['        if (keyboard.lKey.wasPressedThisFrame)'], run: 'update', key: 'KeyL' },
    { c: ['        {'], run: 'update', key: 'KeyL' },
    { c: ['            float x = PlayerPrefs.GetFloat("playerX", 0f);'], run: 'update', key: 'KeyL', x: { zh: '读出存的数字。后面的 0f 是「没存过的话用 0」。', en: 'Reads the saved number. The 0f means “use 0 if nothing was saved”.' } },
    { c: ['            float z = PlayerPrefs.GetFloat("playerZ", 0f);'], run: 'update', key: 'KeyL' },
    { c: ['            transform.position = new Vector3(x, transform.position.y, z);'], run: 'update', key: 'KeyL', x: { zh: '把自己放回存的位置（高度不变）。', en: 'Puts the object back at the saved spot (keeping its height).' } },
    { c: ['            Debug.Log("Loaded");'], run: 'update', key: 'KeyL' },
    { c: ['        }'], run: 'update', key: 'KeyL' },
    { c: ['    }'], run: 'update' },
    { c: ['}'] }],
};

const ItemData = {
  name: 'ItemData', kind: 'data', blanks: [], answers: {}, compile: noBlanks, fields: [],
  lines: [
    { c: ['using UnityEngine;'] },
    { c: [''] },
    { c: ['[CreateAssetMenu(menuName = "Item Data")]'], x: { zh: '加了这一行，项目窗口右键「创建」菜单里就会多一个「Item Data」。', en: 'With this line, the Project window’s Create menu gets an “Item Data” entry.' } },
    { c: ['public class ItemData : ScriptableObject'], x: { zh: '继承 ScriptableObject，不是 MonoBehaviour：它不挂在物体上，而是在项目窗口里建成一个个「数据文件」，例如木头、石头、苹果。', en: 'Inherits ScriptableObject, not MonoBehaviour: it does not go on objects. Instead you create “data files” in the Project window, like Wood, Stone, Apple.' } },
    { c: ['{'] },
    { c: ['    public string itemName;'], x: { zh: '物品名称。', en: 'The item name.' } },
    { c: ['    public Color iconColor = Color.white;'], x: { zh: '图标颜色。', en: 'The icon color.' } },
    { c: ['    public bool stackable = true;'], x: { zh: '能不能叠在一起（10 个木头占一格）。', en: 'Whether it stacks (10 wood in one slot).' } },
    { c: ['    public int maxStack = 20;'], x: { zh: '一格最多几个。', en: 'How many fit in one slot.' } },
    { c: ['}'] }],
};

const Inventory = {
  name: 'Inventory', kind: 'inventory', blanks: [], answers: {}, compile: noBlanks,
  fields: [{ id: 'startItems', label: 'Start Items', type: 'assetlist', accept: 'itemdata', def: [] },
           { id: 'listText', label: 'List Text', type: 'ref', accept: 'uitext', def: null }],
  lines: [
    { c: ['using UnityEngine;'] },
    { c: ['using TMPro;'], x: { zh: '引入 TextMeshPro，才能改 UI 文本的字。', en: 'Brings in TextMeshPro so we can change UI text.' } },
    { c: [''] },
    { c: ['public class Inventory : MonoBehaviour'], x: { zh: '背包：开始时把带着的物品列出来。物品本身是 ItemData 数据文件，不写死在代码里。', en: 'Inventory: lists the starting items when Play begins. The items are ItemData files, not hard-coded in the script.' } },
    { c: ['{'] },
    { c: ['    public ItemData[] startItems;'], x: { zh: '方括号 [] 表示「一组」。在检查器里把物品数据一个个拖进来。', en: 'The [] means “a list”. Drag Item Data files into it in the Inspector.' } },
    { c: ['    public TMP_Text listText;'], err: 'noText', x: { zh: '用来显示清单的 UI 文本。', en: 'The UI text that shows the list.' } },
    { c: [''] },
    { c: ['    void Start()'], run: 'start' },
    { c: ['    {'], run: 'start' },
    { c: ['        string text = "Inventory:";'], run: 'start' },
    { c: ['        foreach (ItemData item in startItems)'], run: 'start', x: { zh: 'foreach：对清单里的每一个物品，都做一次下面这行。', en: 'foreach: do the next line once for every item in the list.' } },
    { c: ['            text += "\\n- " + item.itemName;'], run: 'start', x: { zh: '\\n 是换行。把每个物品的名字接在后面。', en: '\\n is a line break. Adds each item name to the text.' } },
    { c: ['        listText.text = text;'], run: 'start', err: 'noText', x: { zh: '把清单写到 UI 文本上。', en: 'Puts the list on the UI text.' } },
    { c: ['        Debug.Log(text);'], run: 'start' },
    { c: ['    }'], run: 'start' },
    { c: ['}'] }],
};


// ---------- 第 1 章：恐怖游戏 ----------
const LightFlicker = {
  name: 'LightFlicker', kind: 'flicker', blanks: [], answers: {}, compile: noBlanks,
  fields: [{ id: 'minIntensity', label: 'Min Intensity', type: 'float', def: 0.2 }, { id: 'maxIntensity', label: 'Max Intensity', type: 'float', def: 2 },
           { id: 'flickerSpeed', label: 'Flicker Speed', type: 'float', def: 0.08 }],
  lines: [
    { c: ['using UnityEngine;'] },
    { c: [''] },
    { c: ['public class LightFlicker : MonoBehaviour'], x: { zh: '让灯一闪一闪：每隔一小段时间，随机换一个亮度。挂在有灯光组件的物体上。', en: 'Makes a light flicker: every short moment it picks a random brightness. Put it on an object with a Light.' } },
    { c: ['{'] },
    { c: ['    public float minIntensity = 0.2f;'], x: { zh: '最暗的时候有多暗。', en: 'How dim it gets.' } },
    { c: ['    public float maxIntensity = 2f;'], x: { zh: '最亮的时候有多亮。', en: 'How bright it gets.' } },
    { c: ['    public float flickerSpeed = 0.08f;'], x: { zh: '隔几秒换一次亮度。越小闪得越快。', en: 'Seconds between changes. Smaller means faster flicker.' } },
    { c: ['    Light lamp;'] },
    { c: ['    float timer;'], x: { zh: '倒数计时：减到 0 就换一次亮度。', en: 'A countdown: when it reaches 0, change the brightness.' } },
    { c: [''] },
    { c: ['    void Start()'], run: 'start' },
    { c: ['    {'], run: 'start' },
    { c: ['        lamp = GetComponent<Light>();'], run: 'start', x: { zh: '找同一个物体上的灯光组件。挂错物体的话会得到 null。', en: 'Finds the Light on this object. On the wrong object you get null.' } },
    { c: ['    }'], run: 'start' },
    { c: [''] },
    { c: ['    void Update()'], run: 'update' },
    { c: ['    {'], run: 'update' },
    { c: ['        timer -= Time.deltaTime;'], run: 'update' },
    { c: ['        if (timer <= 0f)'], run: 'update' },
    { c: ['        {'], run: 'update' },
    { c: ['            lamp.intensity = Random.Range(minIntensity, maxIntensity);'], run: 'move', err: 'noLight', x: { zh: 'Random.Range 在两个数之间随便挑一个。', en: 'Random.Range picks any number between the two.' } },
    { c: ['            timer = flickerSpeed;'], run: 'update' },
    { c: ['        }'], run: 'update' },
    { c: ['    }'], run: 'update' },
    { c: ['}'] }],
};

const Footsteps = {
  name: 'Footsteps', kind: 'footsteps', blanks: [], answers: {}, compile: noBlanks,
  fields: [{ id: 'stepInterval', label: 'Step Interval', type: 'float', def: 0.5 }],
  lines: [
    { c: ['using UnityEngine;'] },
    { c: [''] },
    { c: ['public class Footsteps : MonoBehaviour'], x: { zh: '走路时每隔一段时间播放一次脚步声。要和音频源、角色控制器挂在同一个物体上。', en: 'Plays a footstep every so often while walking. Needs an Audio Source and a Character Controller on the same object.' } },
    { c: ['{'] },
    { c: ['    public float stepInterval = 0.5f;'], x: { zh: '两步之间隔几秒。', en: 'Seconds between steps.' } },
    { c: ['    AudioSource source;'] },
    { c: ['    CharacterController controller;'] },
    { c: ['    float timer;'] },
    { c: [''] },
    { c: ['    void Start()'], run: 'start' },
    { c: ['    {'], run: 'start' },
    { c: ['        source = GetComponent<AudioSource>();'], run: 'start', x: { zh: '找同一个物体上的音频源（喇叭）。', en: 'Finds the Audio Source (the speaker) on this object.' } },
    { c: ['        controller = GetComponent<CharacterController>();'], run: 'start' },
    { c: ['    }'], run: 'start' },
    { c: [''] },
    { c: ['    void Update()'], run: 'update' },
    { c: ['    {'], run: 'update' },
    { c: ['        bool walking = controller.velocity.magnitude > 0.1f;'], run: 'update', err: 'noCC', x: { zh: 'velocity 是现在的速度。比 0.1 大，就当作在走路。', en: 'velocity is the current speed. Above 0.1 counts as walking.' } },
    { c: ['        if (!walking) return;'], run: 'update', x: { zh: '没在走路就到此为止，不播声音。', en: 'Not walking? Stop here, no sound.' } },
    { c: [''], run: 'update' },
    { c: ['        timer -= Time.deltaTime;'], run: 'move' },
    { c: ['        if (timer <= 0f)'], run: 'move' },
    { c: ['        {'], run: 'move' },
    { c: ['            source.Play();'], run: 'move', err: 'noAudio', x: { zh: '让音频源播放一次它的音频。', en: 'Tells the Audio Source to play its sound once.' } },
    { c: ['            timer = stepInterval;'], run: 'move' },
    { c: ['        }'], run: 'move' },
    { c: ['    }'], run: 'update' },
    { c: ['}'] }],
};

// 门：填 2 个空。方法名拼错不会报错（真 Unity 也一样），只是永远不会被调用。
const DoorOpen = {
  name: 'DoorOpen', kind: 'door',
  fields: [{ id: 'door', label: 'Door', type: 'transform', def: null }, { id: 'liftHeight', label: 'Lift Height', type: 'float', def: 3.5 },
           { id: 'speed', label: 'Speed', type: 'float', def: 2 }],
  blanks: [
    { id: 'method', w: 14, tip: { zh: '有东西走进触发器时 Unity 会调用的方法：OnTriggerEnter（大小写要一模一样）', en: 'The method Unity calls when something enters a trigger: OnTriggerEnter (exact capitals)' } },
    { id: 'tag', w: 6, tip: { zh: '只对贴了这个标签的物体开门：Player', en: 'Only open for objects with this tag: Player' } }],
  answers: { method: 'OnTriggerEnter', tag: 'Player' },
  compile(b) {
    const E = [], rt = {};
    const m = val(b, 'method');
    if (!m || !/^[A-Za-z_]\w*$/.test(m)) E.push({ b: 'method', code: 'CS1001', en: 'Identifier expected', zh: 'void 后面要写一个方法名（只能有字母、数字、下划线）。这里要写 OnTriggerEnter。' });
    else rt.method = m;
    const tg = String(b.tag == null ? '' : b.tag);
    if (tg.includes('"')) E.push({ b: 'tag', code: 'CS1010', en: 'Newline in constant', zh: '双引号 " 会提前结束这段文字。里面只写 Player。' });
    else rt.tag = tg;
    return { errors: E, rt };
  },
  lines: [
    { c: ['using UnityEngine;'] },
    { c: [''] },
    { c: ['public class DoorOpen : MonoBehaviour'], x: { zh: '挂在门前的触发区上。玩家走进来，门就往上升。', en: 'Goes on the trigger zone in front of the door. When the player walks in, the door rises.' } },
    { c: ['{'] },
    { c: ['    public Transform door;'], err: 'noDoor', x: { zh: '要打开哪一扇门。在检查器把层级里的 Door 拖进这一格。', en: 'Which door to open. Drag Door from the Hierarchy into this slot in the Inspector.' } },
    { c: ['    public float liftHeight = 3.5f;'], x: { zh: '门要升多高。', en: 'How high the door rises.' } },
    { c: ['    public float speed = 2f;'], x: { zh: '每秒升几米。', en: 'Meters per second.' } },
    { c: ['    bool open;'], x: { zh: '门开了没有。bool 只有 true（是）和 false（否）。', en: 'Whether the door is open. A bool is only true or false.' } },
    { c: ['    Vector3 openPosition;'] },
    { c: [''] },
    { c: ['    void Start()'], run: 'start' },
    { c: ['    {'], run: 'start' },
    { c: ['        openPosition = door.position + Vector3.up * liftHeight;'], run: 'start', err: 'noDoor', x: { zh: '门打开后的位置：现在的位置再往上 liftHeight 米。', en: 'Where the open door ends up: liftHeight meters above where it is now.' } },
    { c: ['    }'], run: 'start' },
    { c: [''] },
    { c: ['    void ', B('method'), '(Collider other)'], run: 'trigger', x: { zh: '有东西走进这个触发器时，Unity 会自动调用叫 OnTriggerEnter 的方法。名字拼错不会报错，但 Unity 就永远不会调用它。other 是走进来的那个物体。', en: 'When something enters this trigger, Unity calls a method named OnTriggerEnter. A misspelled name gives no error — Unity just never calls it. other is whatever walked in.' } },
    { c: ['    {'], run: 'trigger' },
    { c: ['        if (other.CompareTag("', B('tag'), '"))'], run: 'trigger', x: { zh: '检查走进来的物体的标签。只有玩家能开门，怪物不行。', en: "Checks the tag of whatever walked in. Only the player opens the door, not the monster." } },
    { c: ['            open = true;'], run: 'trigger' },
    { c: ['    }'], run: 'trigger' },
    { c: [''] },
    { c: ['    void Update()'], run: 'update' },
    { c: ['    {'], run: 'update' },
    { c: ['        if (!open) return;'], run: 'update' },
    { c: ['        door.position = Vector3.MoveTowards(door.position, openPosition, speed * Time.deltaTime);'], run: 'move', x: { zh: 'MoveTowards：每一帧朝目标位置移动一小段，到了就停。', en: 'MoveTowards: each frame, move a little toward the target and stop when you get there.' } },
    { c: ['    }'], run: 'update' },
    { c: ['}'] }],
};

const CatchPlayer = {
  name: 'CatchPlayer', kind: 'catch', blanks: [], answers: {}, compile: noBlanks,
  fields: [{ id: 'target', label: 'Target', type: 'transform', def: null }, { id: 'message', label: 'Message', type: 'ref', accept: 'uitext', def: null },
           { id: 'catchDistance', label: 'Catch Distance', type: 'float', def: 1.2 }],
  lines: [
    { c: ['using UnityEngine;'] },
    { c: ['using TMPro;'] },
    { c: [''] },
    { c: ['public class CatchPlayer : MonoBehaviour'], x: { zh: '挂在怪物身上：离玩家够近，就显示 GAME OVER，游戏停住。', en: 'Goes on the monster: when it gets close enough to the player, show GAME OVER and freeze the game.' } },
    { c: ['{'] },
    { c: ['    public Transform target;'], err: 'noTarget', x: { zh: '要抓谁：把 Player 拖进来。', en: 'Who to catch: drag Player in.' } },
    { c: ['    public TMP_Text message;'], err: 'noMsg', x: { zh: '显示结果的 UI 文本。', en: 'The UI text that shows the result.' } },
    { c: ['    public float catchDistance = 1.2f;'], x: { zh: '多近算抓到，单位是米。', en: 'How close counts as caught, in meters.' } },
    { c: [''] },
    { c: ['    void Update()'], run: 'update' },
    { c: ['    {'], run: 'update' },
    { c: ['        float distance = Vector3.Distance(transform.position, target.position);'], run: 'update', err: 'noTarget', x: { zh: '算出怪物和玩家相距几米。', en: 'Works out how many meters apart the monster and the player are.' } },
    { c: ['        if (distance < catchDistance)'], run: 'update' },
    { c: ['        {'], run: 'update' },
    { c: ['            message.text = "GAME OVER";'], run: 'move', err: 'noMsg' },
    { c: ['            Time.timeScale = 0f;'], run: 'move', x: { zh: '把游戏时间调成 0：所有东西都停住。', en: 'Sets game time to 0, so everything freezes.' } },
    { c: ['        }'], run: 'update' },
    { c: ['    }'], run: 'update' },
    { c: ['}'] }],
};

const ExitZone = {
  name: 'ExitZone', kind: 'exit', blanks: [], answers: {}, compile: noBlanks,
  fields: [{ id: 'message', label: 'Message', type: 'ref', accept: 'uitext', def: null }],
  lines: [
    { c: ['using UnityEngine;'] },
    { c: ['using TMPro;'] },
    { c: [''] },
    { c: ['public class ExitZone : MonoBehaviour'], x: { zh: '挂在出口的触发区上：玩家走进来，就显示「逃出去了」。', en: 'Goes on the exit trigger: when the player walks in, show that they escaped.' } },
    { c: ['{'] },
    { c: ['    public TMP_Text message;'], err: 'noMsg' },
    { c: [''] },
    { c: ['    void OnTriggerEnter(Collider other)'], run: 'trigger' },
    { c: ['    {'], run: 'trigger' },
    { c: ['        if (!other.CompareTag("Player")) return;'], run: 'trigger' },
    { c: ['        message.text = "YOU ESCAPED";'], run: 'trigger', err: 'noMsg' },
    { c: ['        Time.timeScale = 0f;'], run: 'trigger' },
    { c: ['    }'], run: 'trigger' },
    { c: ['}'] }],
};

ZTG.scriptLib = { FirstPersonMove, EnemyChase, SurvivalStats, DayNightCycle, SaveLoad, ItemData, Inventory, LightFlicker, Footsteps, DoorOpen, CatchPlayer, ExitZone };
})();
