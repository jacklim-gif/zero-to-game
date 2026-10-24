// 内置的 C# 脚本模板（第 0 章的 PlayerMove 在 chapters/ch0.js）。
// 新建 MonoBehaviour 脚本后改名成这里的名字，就会得到对应的代码。
// 每行 c 是片段（字符串或空格 {b}），x 是点这一行时的解释，run / key 控制播放时这一行什么时候亮。
// fields 是 public 变量，会出现在检查器里；kind 决定模拟器怎么执行这个脚本。
(() => {
'use strict';
window.ZTG = window.ZTG || {};
const noBlanks = () => ({ errors: [], rt: {} });

const FirstPersonMove = {
  name: 'FirstPersonMove', kind: 'fps', blanks: [], answers: {}, compile: noBlanks,
  fields: [{ id: 'speed', label: 'Speed', type: 'float', def: 4 }, { id: 'mouseSensitivity', label: 'Mouse Sensitivity', type: 'float', def: 0.15 }],
  lines: [
    { c: ['using UnityEngine;'], x: { zh: '引入 Unity 的工具箱。', en: "Brings in Unity's toolbox." } },
    { c: ['using UnityEngine.InputSystem;'], x: { zh: '引入新版输入系统，用来读键盘和鼠标。', en: 'Brings in the new Input System to read the keyboard and mouse.' } },
    { c: [''] },
    { c: ['public class FirstPersonMove : MonoBehaviour'], x: { zh: '第一人称移动脚本。挂在玩家身上，玩家下面要有一个摄像机（子物体）。', en: 'A first-person movement script. Put it on the player, with a camera as a child object.' } },
    { c: ['{'] },
    { c: ['    public float speed = 4f;'], x: { zh: '走路速度，每秒几米。', en: 'Walking speed, in meters per second.' } },
    { c: ['    public float mouseSensitivity = 0.15f;'], x: { zh: '鼠标灵敏度：鼠标动一点，视角转多少。', en: 'Mouse sensitivity: how far the view turns when the mouse moves.' } },
    { c: ['    CharacterController controller;'], x: { zh: '用来存角色控制器。它负责走路时被墙挡住、受重力。', en: 'Holds the Character Controller, which stops you at walls and applies gravity.' } },
    { c: ['    Transform cam;'], x: { zh: '用来存摄像机，抬头低头时转它。', en: 'Holds the camera, which tilts when you look up and down.' } },
    { c: ['    float pitch;'], x: { zh: '现在抬头（负数）或低头（正数）多少度。', en: 'How far you are looking up (negative) or down (positive), in degrees.' } },
    { c: [''] },
    { c: ['    void Start()'], run: 'start', x: { zh: '开始播放时执行一次。', en: 'Runs once, when Play starts.' } },
    { c: ['    {'], run: 'start' },
    { c: ['        controller = GetComponent<CharacterController>();'], run: 'start', err: 'noCC', x: { zh: '在同一个物体上找角色控制器。找不到会得到 null（空的）。', en: "Finds the Character Controller on this object. If there isn't one, you get null (nothing)." } },
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
    { c: ['        controller.SimpleMove(move.normalized * speed);'], run: 'move', err: 'noCC', x: { zh: '用角色控制器走路：碰到有碰撞体的墙会停下，脚下没东西会往下掉。和 transform.Translate 不一样，不会穿墙。', en: 'Walks with the Character Controller: it stops at walls that have colliders and falls when there is nothing below. Unlike transform.Translate, it never goes through walls.' } },
    { c: ['    }'], run: 'update' },
    { c: ['}'] }],
};

const EnemyChase = {
  name: 'EnemyChase', kind: 'chase', blanks: [], answers: {}, compile: noBlanks,
  fields: [{ id: 'target', label: 'Target', type: 'transform', def: null }],
  lines: [
    { c: ['using UnityEngine;'], x: { zh: '引入 Unity 的工具箱。', en: "Brings in Unity's toolbox." } },
    { c: ['using UnityEngine.AI;'], x: { zh: '引入 AI 导航，用来找路。', en: 'Brings in AI navigation, used for pathfinding.' } },
    { c: [''] },
    { c: ['public class EnemyChase : MonoBehaviour'], x: { zh: '追人的怪物。要挂在有 NavMesh Agent 的物体上，场景里要先烘焙 NavMesh。', en: 'A chasing monster. Put it on an object with a NavMesh Agent, and bake a NavMesh in the scene first.' } },
    { c: ['{'] },
    { c: ['    public Transform target;'], err: 'noTarget', x: { zh: '要追谁。public 的 Transform 会在检查器里出现一个空格，把玩家从层级拖进去。', en: 'Who to chase. A public Transform shows up as a slot in the Inspector — drag the player into it from the Hierarchy.' } },
    { c: ['    NavMeshAgent agent;'], x: { zh: '用来存导航代理，它会自己沿着能走的路径移动。', en: 'Holds the NavMesh Agent, which moves along walkable paths by itself.' } },
    { c: [''] },
    { c: ['    void Start()'], run: 'start', x: { zh: '开始播放时执行一次。', en: 'Runs once, when Play starts.' } },
    { c: ['    {'], run: 'start' },
    { c: ['        agent = GetComponent<NavMeshAgent>();'], run: 'start', x: { zh: '在同一个物体上找导航代理。', en: 'Finds the NavMesh Agent on this object.' } },
    { c: ['    }'], run: 'start' },
    { c: [''] },
    { c: ['    void Update()'], run: 'update', x: { zh: '每一帧执行一次。', en: 'Runs once per frame.' } },
    { c: ['    {'], run: 'update' },
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

ZTG.scriptLib = { FirstPersonMove, EnemyChase, SurvivalStats, DayNightCycle, SaveLoad, ItemData, Inventory };
})();
