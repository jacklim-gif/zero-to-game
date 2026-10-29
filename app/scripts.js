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

// ---------- 第 1 章下篇：互动、钥匙、锁着的门、Jumpscare ----------
// 子类（FlashlightPickup 等）继承 Interactable：项目里没有 Interactable 脚本时，会报和真 Unity 一样的 CS0246
const hasScript = n => !!(window.ZTG.S && window.ZTG.S.assets.some(a => a.type === 'script' && a.name === n));
const needs = (lines, names) => names.filter(n => !hasScript(n)).map(n => ({ line: lines.findIndex(l => l.c.some(x => typeof x === 'string' && x.includes(n))), code: 'CS0246',
  en: `The type or namespace name '${n}' could not be found (are you missing a using directive or an assembly reference?)`, zh: `找不到「${n}」。先在项目里建一个叫 ${n} 的脚本。` }));

const Interactable = {
  name: 'Interactable', kind: 'base', interactable: true, blanks: [], answers: {}, compile: noBlanks,
  fields: [{ id: 'promptText', label: 'Prompt Text', type: 'text', def: 'Press F' }],
  lines: [
    { c: ['using UnityEngine;'] },
    { c: [''] },
    { c: ['public class Interactable : MonoBehaviour'], x: { zh: '「可以互动的东西」的共同模板。手电筒、钥匙、门都继承它。它自己不做什么事。', en: 'The shared template for things you can interact with. The flashlight, key and door all inherit from it. On its own it does nothing.' } },
    { c: ['{'] },
    { c: ['    public string promptText = "Press F";'], x: { zh: '看着它时，屏幕上显示的提示。', en: 'The hint shown on screen while you look at it.' } },
    { c: [''] },
    { c: ['    public virtual void Use()'], x: { zh: 'virtual：子类可以用 override 改写这个方法，各自决定「按 F 之后做什么」。', en: 'virtual means subclasses can override this method and decide for themselves what happens when you press F.' } },
    { c: ['    {'] },
    { c: ['    }'] },
    { c: ['}'] }],
};

const Interact = {
  name: 'Interact', kind: 'interact', deps: ['Interactable'],
  fields: [{ id: 'prompt', label: 'Prompt', type: 'ref', accept: 'uitext', def: null }],
  blanks: [
    { id: 'reach', w: 4, tip: { zh: '手能伸多远（米），例如 3f', en: 'How far you can reach, in meters, e.g. 3f' } },
    { id: 'key', w: 5, tip: { zh: '要按的键：fKey（F 键）', en: 'The key to press: fKey (the F key)' } }],
  answers: { reach: '3f', key: 'fKey' },
  compile(b) {
    const E = [], rt = { reach: 3, key: 'KeyF' };
    floatBlank(E, b, 'reach', rt);
    const k = val(b, 'key'), m = /^([a-z])Key$/.exec(k);
    if (!k) E.push({ b: 'key', code: 'CS1001', en: 'Identifier expected', zh: '点号后面空着，要填 fKey。' });
    else if (!m) E.push({ b: 'key', code: 'CS1061', en: `'Keyboard' does not contain a definition for '${k}' and no accessible extension method '${k}' accepting a first argument of type 'Keyboard' could be found (are you missing a using directive or an assembly reference?)`, zh: `键盘没有「${k}」。F 键要写 fKey（f 小写，K 大写）。` });
    else rt.key = 'Key' + m[1].toUpperCase();
    return { errors: E.concat(needs(Interact.lines, ['Interactable'])), rt };
  },
  lines: [
    { c: ['using UnityEngine;'] },
    { c: ['using UnityEngine.InputSystem;'] },
    { c: ['using TMPro;'] },
    { c: [''] },
    { c: ['public class Interact : MonoBehaviour'], x: { zh: '挂在主摄像机上：看着可以互动的东西，就显示提示；按 F 就使用它。', en: 'Goes on the Main Camera: when you look at something interactable, show its hint; press F to use it.' } },
    { c: ['{'] },
    { c: ['    public TMP_Text prompt;'], err: 'noPrompt', x: { zh: '显示提示的 UI 文本。', en: 'The UI text that shows the hint.' } },
    { c: ['    public float reach = ', B('reach'), ';'], x: { zh: '射线多长：太远的东西够不到。', en: 'How long the ray is: things farther away are out of reach.' } },
    { c: [''] },
    { c: ['    void Update()'], run: 'update' },
    { c: ['    {'], run: 'update' },
    { c: ['        prompt.text = "";'], run: 'update', err: 'noPrompt', x: { zh: '每一帧先把提示清空，看着东西时才写上。', en: 'Clear the hint every frame; it is only filled in while you look at something.' } },
    { c: ['        if (!Physics.Raycast(transform.position, transform.forward, out RaycastHit hit, reach)) return;'], run: 'update', x: { zh: '从摄像机往正前方射一条看不见的线。没打中东西就到此为止。打中了，hit 里就有打中的东西。', en: 'Shoot an invisible line straight ahead from the camera. If it hits nothing, stop. If it hits, hit tells you what.' } },
    { c: ['        Interactable thing = hit.collider.GetComponentInParent<Interactable>();'], run: 'update', x: { zh: '在打中的物体（或它的父物体）上找 Interactable。手电筒、钥匙、门的脚本都算，因为它们都继承了 Interactable。', en: 'Look for an Interactable on the object that was hit (or its parents). The flashlight, key and door scripts all count, because they inherit Interactable.' } },
    { c: ['        if (thing == null) return;'], run: 'update' },
    { c: ['        prompt.text = thing.promptText;'], run: 'update' },
    { c: ['        if (Keyboard.current.', B('key'), '.wasPressedThisFrame)'], run: 'update', key: 'KeyF' },
    { c: ['            thing.Use();'], run: 'move', x: { zh: '调用它的 Use。具体做什么由各自的脚本决定。', en: 'Calls its Use. What actually happens is up to each script.' } },
    { c: ['    }'], run: 'update' },
    { c: ['}'] }],
};

const FlashlightPickup = {
  name: 'FlashlightPickup', kind: 'pickupLight', interactable: true, deps: ['Interactable'], blanks: [], answers: {},
  compile() { return { errors: needs(FlashlightPickup.lines, ['Interactable']), rt: {} }; },
  fields: [{ id: 'promptText', label: 'Prompt Text', type: 'text', def: 'Press F to take the flashlight' }, { id: 'flashlight', label: 'Flashlight', type: 'ref', accept: 'light', def: null }],
  lines: [
    { c: ['using UnityEngine;'] },
    { c: [''] },
    { c: ['public class FlashlightPickup : Interactable'], x: { zh: '继承 Interactable：自动有 promptText 和 Use，只要改写 Use 就好。', en: 'Inherits Interactable: it gets promptText and Use for free, and only needs to override Use.' } },
    { c: ['{'] },
    { c: ['    public Light flashlight;'], err: 'noLight2', x: { zh: '手里那支（摄像机下面的）手电筒的灯光。', en: 'The Light of the flashlight in your hand (under the camera).' } },
    { c: [''] },
    { c: ['    public override void Use()'], run: 'trigger', x: { zh: 'override：改写父类的 Use。', en: 'override replaces the parent class’s Use.' } },
    { c: ['    {'], run: 'trigger' },
    { c: ['        flashlight.enabled = true;'], run: 'trigger', err: 'noLight2', x: { zh: '把手里的灯打开。enabled 是组件的开关（检查器里组件名字旁边的勾）。', en: 'Turns on the light in your hand. enabled is the component’s on/off switch (the checkbox next to its name in the Inspector).' } },
    { c: ['        gameObject.SetActive(false);'], run: 'trigger', x: { zh: '把地上这支藏起来。SetActive 是整个物体的开关（名字旁边的勾）。看起来就像「捡起来了」。', en: 'Hides the one on the floor. SetActive switches the whole object (the checkbox next to its name). It looks like you picked it up.' } },
    { c: ['    }'], run: 'trigger' },
    { c: ['}'] }],
};

const KeyPickup = {
  name: 'KeyPickup', kind: 'pickupKey', interactable: true, deps: ['Interactable'], blanks: [], answers: {},
  compile() { return { errors: needs(KeyPickup.lines, ['Interactable']), rt: {} }; },
  fields: [{ id: 'promptText', label: 'Prompt Text', type: 'text', def: 'Press F to take the key' }],
  lines: [
    { c: ['using UnityEngine;'] },
    { c: [''] },
    { c: ['public class KeyPickup : Interactable'] },
    { c: ['{'] },
    { c: ['    public static bool hasKey;'], x: { zh: 'static：整个游戏只有一份，别的脚本可以直接用 KeyPickup.hasKey 读它。', en: 'static means there is only one for the whole game, so other scripts can read it as KeyPickup.hasKey.' } },
    { c: [''] },
    { c: ['    public override void Use()'], run: 'trigger' },
    { c: ['    {'], run: 'trigger' },
    { c: ['        hasKey = true;'], run: 'trigger', x: { zh: '记下：拿到钥匙了。', en: 'Remember that we have the key.' } },
    { c: ['        gameObject.SetActive(false);'], run: 'trigger' },
    { c: ['    }'], run: 'trigger' },
    { c: ['}'] }],
};

const LockedDoor = {
  name: 'LockedDoor', kind: 'lockedDoor', interactable: true, deps: ['Interactable', 'KeyPickup'], blanks: [], answers: {},
  compile() { return { errors: needs(LockedDoor.lines, ['Interactable', 'KeyPickup']), rt: {} }; },
  fields: [{ id: 'promptText', label: 'Prompt Text', type: 'text', def: 'Press F to open' }, { id: 'lockedText', label: 'Locked Text', type: 'text', def: 'Locked. Find the key.' }],
  lines: [
    { c: ['using UnityEngine;'] },
    { c: [''] },
    { c: ['public class LockedDoor : Interactable'], x: { zh: '挂在门轴（有 Animator 的物体）上。没钥匙就提示锁着，有钥匙就播放开门动画。', en: 'Goes on the door hinge (the object with the Animator). Without the key it says locked; with the key it plays the opening animation.' } },
    { c: ['{'] },
    { c: ['    public string lockedText = "Locked. Find the key.";'] },
    { c: ['    Animator animator;'] },
    { c: ['    bool opened;'] },
    { c: [''] },
    { c: ['    void Start()'], run: 'start' },
    { c: ['    {'], run: 'start' },
    { c: ['        animator = GetComponent<Animator>();'], run: 'start' },
    { c: ['    }'], run: 'start' },
    { c: [''] },
    { c: ['    public override void Use()'], run: 'trigger' },
    { c: ['    {'], run: 'trigger' },
    { c: ['        if (opened) return;'], run: 'trigger' },
    { c: ['        if (!KeyPickup.hasKey)'], run: 'trigger', x: { zh: '读 KeyPickup 里那个 static 的 hasKey。', en: 'Reads the static hasKey from KeyPickup.' } },
    { c: ['        {'], run: 'trigger' },
    { c: ['            promptText = lockedText;'], run: 'trigger' },
    { c: ['            return;'], run: 'trigger' },
    { c: ['        }'], run: 'trigger' },
    { c: ['        animator.SetTrigger("Open");'], run: 'trigger', err: 'noAnim', x: { zh: '告诉 Animator：触发 Open 参数。Animator 里要有一个叫 Open 的 Trigger 参数，大小写都要一样。', en: 'Tells the Animator to fire the Open parameter. The Animator needs a Trigger parameter named exactly Open.' } },
    { c: ['        opened = true;'], run: 'trigger' },
    { c: ['        promptText = "";'], run: 'trigger' },
    { c: ['    }'], run: 'trigger' },
    { c: ['}'] }],
};

const Jumpscare = {
  name: 'Jumpscare', kind: 'jumpscare',
  fields: [{ id: 'ghost', label: 'Ghost', type: 'transform', go: true, def: null }, { id: 'cam', label: 'Cam', type: 'transform', def: null },
           { id: 'scareLight', label: 'Scare Light', type: 'ref', accept: 'light', def: null },
           { id: 'showTime', label: 'Show Time', type: 'float', def: 0.6 }, { id: 'shakeAmount', label: 'Shake Amount', type: 'float', def: 0.08 }],
  blanks: [
    { id: 'co', w: 14, tip: { zh: '启动协程的方法：StartCoroutine', en: 'The method that starts a coroutine: StartCoroutine' } },
    { id: 'ie', w: 11, tip: { zh: '协程的返回类型：IEnumerator', en: 'A coroutine’s return type: IEnumerator' } }],
  answers: { co: 'StartCoroutine', ie: 'IEnumerator' },
  compile(b) {
    const E = [], rt = {};
    const co = val(b, 'co');
    if (!co) E.push({ b: 'co', code: 'CS1525', en: "Invalid expression term '('", zh: '这里空着，要填 StartCoroutine。' });
    else if (co !== 'StartCoroutine') E.push({ b: 'co', code: 'CS0103', en: `The name '${co}' does not exist in the current context`, zh: `电脑不认识「${co}」。要写 StartCoroutine（S 和 C 大写）。` });
    const ie = val(b, 'ie');
    if (!ie) E.push({ b: 'ie', code: 'CS1519', en: "Invalid token '(' in class, record, struct, or interface member declaration", zh: '方法名前面要写返回类型：IEnumerator。' });
    else if (ie === 'void') E.push({ b: 'ie', code: 'CS1624', en: "The body of 'Jumpscare.Scare()' cannot be an iterator block because 'void' is not an iterator interface type", zh: '里面用了 yield，返回类型就不能是 void，要写 IEnumerator。' });
    else if (ie !== 'IEnumerator') E.push({ b: 'ie', code: 'CS0246', en: `The type or namespace name '${ie}' could not be found (are you missing a using directive or an assembly reference?)`, zh: `找不到「${ie}」。要写 IEnumerator（I 和 E 大写）。` });
    return { errors: E, rt };
  },
  lines: [
    { c: ['using UnityEngine;'] },
    { c: ['using System.Collections;'], x: { zh: '协程要用的 IEnumerator 在这里面。', en: 'IEnumerator, which coroutines need, lives here.' } },
    { c: [''] },
    { c: ['public class Jumpscare : MonoBehaviour'], x: { zh: '挂在触发区上：玩家走进来，鬼突然出现、尖叫、镜头抖，一下子又消失。', en: 'Goes on a trigger zone: when the player walks in, a ghost appears, screams, the camera shakes, and it vanishes again.' } },
    { c: ['{'] },
    { c: ['    public GameObject ghost;'], err: 'noGhost' },
    { c: ['    public Transform cam;'], err: 'noCamRef' },
    { c: ['    public Light scareLight;'] },
    { c: ['    public float showTime = 0.6f;'], x: { zh: '鬼出现几秒。', en: 'How many seconds the ghost shows.' } },
    { c: ['    public float shakeAmount = 0.08f;'], x: { zh: '镜头抖多厉害（米）。', en: 'How hard the camera shakes, in meters.' } },
    { c: ['    bool done;'], x: { zh: '只吓一次。', en: 'Only scare once.' } },
    { c: [''] },
    { c: ['    void OnTriggerEnter(Collider other)'], run: 'trigger' },
    { c: ['    {'], run: 'trigger' },
    { c: ['        if (done || !other.CompareTag("Player")) return;'], run: 'trigger', x: { zh: '|| 是「或者」：已经吓过了，或者进来的不是玩家，就什么都不做。', en: '|| means “or”: if we already scared them, or it isn’t the player, do nothing.' } },
    { c: ['        done = true;'], run: 'trigger' },
    { c: ['        ', B('co'), '(Scare());'], run: 'trigger', x: { zh: '启动协程：Scare 会一边跑，一边让游戏继续，不会卡住画面。', en: 'Starts a coroutine: Scare runs over several frames while the game keeps going.' } },
    { c: ['    }'], run: 'trigger' },
    { c: [''] },
    { c: ['    ', B('ie'), ' Scare()'], x: { zh: '协程：可以「等一下再继续」的方法。返回类型必须是 IEnumerator。', en: 'A coroutine: a method that can pause and continue later. Its return type must be IEnumerator.' } },
    { c: ['    {'] },
    { c: ['        ghost.SetActive(true);'], run: 'trigger', err: 'noGhost', x: { zh: '把藏起来的鬼打开。', en: 'Switches the hidden ghost on.' } },
    { c: ['        GetComponent<AudioSource>().Play();'], run: 'trigger', err: 'noAudio', x: { zh: '播放这个物体上的声音（尖叫）。', en: 'Plays the sound on this object (the scream).' } },
    { c: ['        if (scareLight != null) scareLight.enabled = true;'], run: 'trigger', x: { zh: '!= null：格子里有拖东西进来才用它。没有的话跳过，不会报错。', en: '!= null: only use it if something was dragged into the slot. Otherwise skip it — no error.' } },
    { c: ['        Vector3 start = cam.localPosition;'], run: 'trigger', err: 'noCamRef' },
    { c: ['        float t = 0f;'], run: 'trigger' },
    { c: ['        while (t < showTime)'], run: 'move', x: { zh: 'while：只要还没到时间，就一直重复下面这段。', en: 'while: keep repeating the block below until time is up.' } },
    { c: ['        {'], run: 'move' },
    { c: ['            cam.localPosition = start + Random.insideUnitSphere * shakeAmount;'], run: 'move', x: { zh: '每一帧把摄像机往随便一个方向挪一点点，就是「抖」。', en: 'Each frame, nudge the camera a little in a random direction — that’s the shake.' } },
    { c: ['            t += Time.deltaTime;'], run: 'move' },
    { c: ['            yield return null;'], run: 'move', x: { zh: 'yield return null：先停在这里，下一帧再继续。', en: 'yield return null: pause here and continue next frame.' } },
    { c: ['        }'], run: 'move' },
    { c: ['        cam.localPosition = start;'] },
    { c: ['        ghost.SetActive(false);'] },
    { c: ['        if (scareLight != null) scareLight.enabled = false;'] },
    { c: ['    }'] },
    { c: ['}'] }],
};

// ---------- 菜单课：主菜单、暂停菜单 ----------
// methods：public 方法，会出现在按钮 On Click 的下拉菜单里
const MainMenu = {
  name: 'MainMenu', kind: 'menu', methods: ['StartGame', 'QuitGame'], fields: [],
  blanks: [
    { id: 'ns', w: 26, tip: { zh: '切换场景的工具在 UnityEngine.SceneManagement 里', en: 'Scene loading lives in UnityEngine.SceneManagement' } },
    { id: 'scene', w: 11, tip: { zh: '要打开的场景名字：SampleScene（和项目里的名字一模一样）', en: 'The scene to open: SampleScene (exactly as it is named in the Project)' } }],
  answers: { ns: 'UnityEngine.SceneManagement', scene: 'SampleScene' },
  compile(b) {
    const E = [], rt = { scene: '' };
    const ns = val(b, 'ns'), L = MainMenu.lines, ln = re => L.findIndex(l => l.c.some(x => typeof x === 'string' && re.test(x)));
    if (!ns) E.push({ b: 'ns', code: 'CS1001', en: 'Identifier expected', zh: 'using 后面空着，要填 UnityEngine.SceneManagement。' });
    else if (ns !== 'UnityEngine.SceneManagement') {
      E.push({ b: 'ns', code: 'CS0246', en: `The type or namespace name '${ns.split('.').pop()}' could not be found (are you missing a using directive or an assembly reference?)`, zh: `找不到「${ns}」。要写 UnityEngine.SceneManagement（注意大小写和点）。` });
      E.push({ line: ln(/SceneManager\.LoadScene/), code: 'CS0103', en: "The name 'SceneManager' does not exist in the current context", zh: '因为上面的 using 写错了，电脑不认识 SceneManager。' });
    }
    const sc = String(b.scene == null ? '' : b.scene);
    if (sc.includes('"')) E.push({ b: 'scene', code: 'CS1010', en: 'Newline in constant', zh: '双引号 " 会提前结束这段文字。里面只写场景名字。' });
    else rt.scene = sc;
    return { errors: E, rt };
  },
  lines: [
    { c: ['using UnityEngine;'] },
    { c: ['using ', B('ns'), ';'], x: { zh: '引入切换场景用的 SceneManager。', en: 'Brings in SceneManager, used to switch scenes.' } },
    { c: [''] },
    { c: ['public class MainMenu : MonoBehaviour'], x: { zh: '主菜单的按钮会调用这里的方法。挂在一个空物体（MenuManager）上。', en: 'The main menu buttons call the methods here. Put it on an empty object (MenuManager).' } },
    { c: ['{'] },
    { c: ['    public void StartGame()'], run: 'trigger', x: { zh: 'public：按钮的 On Click 才看得到它。点「开始」时调用。', en: 'public, so a button’s On Click can see it. Called when you click Start.' } },
    { c: ['    {'], run: 'trigger' },
    { c: ['        SceneManager.LoadScene("', B('scene'), '");'], run: 'trigger', x: { zh: '关掉现在的场景，打开另一个。那个场景必须在 Scene List（File → Build Profiles）里。', en: 'Closes this scene and opens another. That scene must be in the Scene List (File → Build Profiles).' } },
    { c: ['    }'], run: 'trigger' },
    { c: [''] },
    { c: ['    public void QuitGame()'], run: 'trigger', x: { zh: '点「退出」时调用。', en: 'Called when you click Quit.' } },
    { c: ['    {'], run: 'trigger' },
    { c: ['        Debug.Log("Quit");'], run: 'trigger', x: { zh: '在编辑器里看不出有没有退出，所以先打印一句话确认按钮有用。', en: 'In the editor you can’t tell whether it quit, so print a line to confirm the button works.' } },
    { c: ['        Application.Quit();'], run: 'trigger', x: { zh: '关掉游戏。在编辑器里不会有反应，只有打包出来的游戏才会关掉。', en: 'Quits the game. It does nothing in the editor — only in a built game.' } },
    { c: ['    }'], run: 'trigger' },
    { c: ['}'] }],
};

const PauseMenu = {
  name: 'PauseMenu', kind: 'pause', methods: ['Resume', 'BackToMenu'],
  fields: [{ id: 'pausePanel', label: 'Pause Panel', type: 'transform', go: true, def: null }],
  blanks: [
    { id: 'esc', w: 9, tip: { zh: '要按的键：escapeKey（Esc 键）', en: 'The key to press: escapeKey (the Esc key)' } },
    { id: 'zero', w: 3, tip: { zh: '暂停时游戏时间的速度：0f', en: 'Game speed while paused: 0f' } }],
  answers: { esc: 'escapeKey', zero: '0f' },
  compile(b) {
    const E = [], rt = { key: 'Escape', zero: 0 };
    const k = val(b, 'esc'), m = /^([a-z]+)Key$/.exec(k);
    if (!k) E.push({ b: 'esc', code: 'CS1001', en: 'Identifier expected', zh: '点号后面空着，要填 escapeKey。' });
    else if (!m) E.push({ b: 'esc', code: 'CS1061', en: `'Keyboard' does not contain a definition for '${k}' and no accessible extension method '${k}' accepting a first argument of type 'Keyboard' could be found (are you missing a using directive or an assembly reference?)`, zh: `键盘没有「${k}」。Esc 键要写 escapeKey（e 小写，K 大写）。` });
    else rt.key = m[1].length === 1 ? 'Key' + m[1].toUpperCase() : m[1][0].toUpperCase() + m[1].slice(1);
    floatBlank(E, b, 'zero', rt);
    return { errors: E, rt };
  },
  lines: [
    { c: ['using UnityEngine;'] },
    { c: ['using UnityEngine.InputSystem;'] },
    { c: ['using UnityEngine.SceneManagement;'] },
    { c: [''] },
    { c: ['public class PauseMenu : MonoBehaviour'], x: { zh: '按 Esc 暂停 / 继续。要挂在一直开着的物体上（PauseManager），不要挂在会被关掉的面板上。', en: 'Esc pauses and resumes. Put it on an object that stays on (PauseManager), not on the panel that gets switched off.' } },
    { c: ['{'] },
    { c: ['    public GameObject pausePanel;'], err: 'noPanel', x: { zh: '暂停时显示的面板。', en: 'The panel shown while paused.' } },
    { c: ['    bool paused;'] },
    { c: [''] },
    { c: ['    void Update()'], run: 'update' },
    { c: ['    {'], run: 'update' },
    { c: ['        if (Keyboard.current.', B('esc'), '.wasPressedThisFrame)'], run: 'update', key: 'Escape', x: { zh: '在编辑器里按 Esc 也会放开鼠标，这是正常的。', en: 'In the editor, Esc also frees the mouse — that’s normal.' } },
    { c: ['        {'], run: 'update' },
    { c: ['            if (paused) Resume();'], run: 'update' },
    { c: ['            else Pause();'], run: 'update' },
    { c: ['        }'], run: 'update' },
    { c: ['    }'], run: 'update' },
    { c: [''] },
    { c: ['    void Pause()'], run: 'trigger', x: { zh: '没写 public，所以按钮的 On Click 里看不到它。', en: 'Not public, so a button’s On Click can’t see it.' } },
    { c: ['    {'], run: 'trigger' },
    { c: ['        pausePanel.SetActive(true);'], run: 'trigger', err: 'noPanel' },
    { c: ['        Time.timeScale = ', B('zero'), ';'], run: 'trigger', x: { zh: 'Time.timeScale 是游戏时间的速度。0 = 全部停住，1 = 正常。', en: 'Time.timeScale is the speed of game time. 0 freezes everything, 1 is normal.' } },
    { c: ['        Cursor.lockState = CursorLockMode.None;'], run: 'trigger', x: { zh: '放开鼠标，才能点菜单上的按钮。', en: 'Frees the mouse so you can click the menu buttons.' } },
    { c: ['        paused = true;'], run: 'trigger' },
    { c: ['    }'], run: 'trigger' },
    { c: [''] },
    { c: ['    public void Resume()'], run: 'trigger', x: { zh: '「继续」按钮调用它。', en: 'The Resume button calls this.' } },
    { c: ['    {'], run: 'trigger' },
    { c: ['        pausePanel.SetActive(false);'], run: 'trigger' },
    { c: ['        Time.timeScale = 1f;'], run: 'trigger' },
    { c: ['        Cursor.lockState = CursorLockMode.Locked;'], run: 'trigger' },
    { c: ['        paused = false;'], run: 'trigger' },
    { c: ['    }'], run: 'trigger' },
    { c: [''] },
    { c: ['    public void BackToMenu()'], run: 'trigger', x: { zh: '「主菜单」按钮调用它。', en: 'The Main Menu button calls this.' } },
    { c: ['    {'], run: 'trigger' },
    { c: ['        Time.timeScale = 1f;'], run: 'trigger', x: { zh: '一定要先改回 1：Time.timeScale 换场景也不会自己恢复，不然下次开始游戏会一直停住。', en: 'Set it back to 1 first: Time.timeScale does not reset when the scene changes, or the next game would stay frozen.' } },
    { c: ['        SceneManager.LoadScene("MainMenu");'], run: 'trigger' },
    { c: ['    }'], run: 'trigger' },
    { c: ['}'] }],
};

// ---------- 第 2 章：生存游戏 ----------
// 共用：找场景里第一个某种脚本（FindFirstObjectByType）
const dtBlank = (E, b, k, rt, after) => {
  const d = val(b, k);
  if (d === 'Time.deltaTime') rt[k] = 'dt';
  else if (/^\d+(\.\d+)?[fF]?$/.test(d)) rt[k] = parseFloat(d);
  else if (!d) E.push({ b: k, code: 'CS1525', en: `Invalid expression term '${after}'`, zh: '这里空着。要填 Time.deltaTime。' });
  else { const mm = /^([A-Za-z_]\w*)(?:\.(\w*))?$/.exec(d);
    if (mm && mm[1] !== 'Time') E.push({ b: k, code: 'CS0103', en: `The name '${mm[1]}' does not exist in the current context`, zh: `电脑不认识「${mm[1]}」。要写 Time.deltaTime（T 大写）。` });
    else if (mm) E.push({ b: k, code: 'CS0117', en: `'Time' does not contain a definition for '${mm[2] || ''}'`, zh: `Time 里没有「${mm[2] || ''}」。要写 deltaTime。` });
    else E.push({ b: k, code: 'CS1525', en: `Invalid expression term '${d}'`, zh: '这里要填 Time.deltaTime。' }); }
};
// || 或者、&& 而且：两个都能编译，但意思不一样（写错不会报错，游戏会表现奇怪）
const opBlank = (E, b, k, rt) => {
  const o = val(b, k);
  if (o === '||' || o === '|') rt[k] = 'or'; else if (o === '&&' || o === '&') rt[k] = 'and';
  else E.push({ b: k, code: 'CS1525', en: `Invalid expression term '${o || ')'}'`, zh: '这里要填一个逻辑符号：|| 是「或者」，&& 是「而且」。' });
};
const keyBlank = (E, b, k, rt, word) => {
  const v = val(b, k), m = /^([a-z]+)Key$/.exec(v);
  if (!v) E.push({ b: k, code: 'CS1001', en: 'Identifier expected', zh: `点号后面空着，要填 ${word}。` });
  else if (!m) E.push({ b: k, code: 'CS1061', en: `'Keyboard' does not contain a definition for '${v}' and no accessible extension method '${v}' accepting a first argument of type 'Keyboard' could be found (are you missing a using directive or an assembly reference?)`, zh: `键盘没有「${v}」。要写 ${word}。` });
  else rt.key = m[1].length === 1 ? 'Key' + m[1].toUpperCase() : m[1][0].toUpperCase() + m[1].slice(1);
};

const SurvivalStats = {
  name: 'SurvivalStats', kind: 'survival',
  fields: [{ id: 'hungerBar', label: 'Hunger Bar', type: 'ref', accept: 'uislider', def: null }, { id: 'thirstBar', label: 'Thirst Bar', type: 'ref', accept: 'uislider', def: null },
           { id: 'healthBar', label: 'Health Bar', type: 'ref', accept: 'uislider', def: null },
           { id: 'hunger', label: 'Hunger', type: 'float', def: 100 }, { id: 'thirst', label: 'Thirst', type: 'float', def: 100 }, { id: 'health', label: 'Health', type: 'float', def: 100 },
           { id: 'hungerDrain', label: 'Hunger Drain', type: 'float', def: 0.5 }, { id: 'thirstDrain', label: 'Thirst Drain', type: 'float', def: 1 }, { id: 'damage', label: 'Damage', type: 'float', def: 5 }],
  blanks: [
    { id: 'dt', w: 14, tip: { zh: '每帧扣多少要乘上 Time.deltaTime，才变成「每秒」', en: 'Multiply by Time.deltaTime to make it “per second”' } },
    { id: 'or', w: 2, tip: { zh: '「饿到 0 或者渴到 0」：或者要写 ||', en: '“hunger is 0 OR thirst is 0”: OR is written ||' } }],
  answers: { dt: 'Time.deltaTime', or: '||' },
  compile(b) { const E = [], rt = {}; dtBlank(E, b, 'dt', rt, ','); opBlank(E, b, 'or', rt); return { errors: E, rt }; },
  lines: [
    { c: ['using UnityEngine;'] },
    { c: ['using UnityEngine.UI;'], x: { zh: '引入 UI，才能用 Slider（滑动条）。', en: 'Brings in UI so we can use Slider.' } },
    { c: [''] },
    { c: ['public class SurvivalStats : MonoBehaviour'], x: { zh: '生存数值：饥饿、口渴会慢慢下降；有一样降到 0 就开始掉血；血没了游戏结束。挂在 Player 上。', en: 'Survival stats: hunger and thirst slowly drop; if either hits 0 you lose health; at 0 health the game is over. Put it on Player.' } },
    { c: ['{'] },
    { c: ['    public Slider hungerBar;'], err: 'nohungerBar' },
    { c: ['    public Slider thirstBar;'], err: 'nothirstBar' },
    { c: ['    public Slider healthBar;'], err: 'nohealthBar' },
    { c: ['    public float hunger = 100f;'] },
    { c: ['    public float thirst = 100f;'] },
    { c: ['    public float health = 100f;'] },
    { c: ['    public float hungerDrain = 0.5f;'], x: { zh: '每秒少多少饥饿。', en: 'Hunger lost per second.' } },
    { c: ['    public float thirstDrain = 1f;'], x: { zh: '每秒少多少口渴（渴得比饿得快）。', en: 'Thirst lost per second (you get thirsty faster than hungry).' } },
    { c: ['    public float damage = 5f;'], x: { zh: '饿到或渴到 0 时，每秒掉多少血。', en: 'Health lost per second when starving or dehydrated.' } },
    { c: [''] },
    { c: ['    void Update()'], run: 'update' },
    { c: ['    {'], run: 'update' },
    { c: ['        hunger = Mathf.Max(hunger - hungerDrain * ', B('dt'), ', 0f);'], run: 'move', x: { zh: 'Mathf.Max(…, 0f)：最小只到 0，不会变成负数。', en: 'Mathf.Max(…, 0f): never goes below 0.' } },
    { c: ['        thirst = Mathf.Max(thirst - thirstDrain * Time.deltaTime, 0f);'], run: 'move' },
    { c: ['        if (hunger <= 0f ', B('or'), ' thirst <= 0f)'], run: 'update', x: { zh: '|| 是「或者」：只要有一样到 0 就成立。写成 &&（而且）也能编译，但要两样都到 0 才会掉血：不报错，只是游戏不对。', en: '|| means OR: true if either is 0. && (AND) also compiles but needs both at 0 — no error, the game just behaves wrong.' } },
    { c: ['            health -= damage * Time.deltaTime;'], run: 'update' },
    { c: [''], run: 'update' },
    { c: ['        hungerBar.value = hunger / 100f;'], run: 'update', err: 'nohungerBar' },
    { c: ['        thirstBar.value = thirst / 100f;'], run: 'update', err: 'nothirstBar' },
    { c: ['        healthBar.value = health / 100f;'], run: 'update', err: 'nohealthBar' },
    { c: [''], run: 'update' },
    { c: ['        if (health <= 0f)'], run: 'update' },
    { c: ['        {'], run: 'update' },
    { c: ['            Debug.Log("Game Over");'], run: 'update' },
    { c: ['            Time.timeScale = 0f;'], run: 'update' },
    { c: ['        }'], run: 'update' },
    { c: ['    }'], run: 'update' },
    { c: [''] },
    { c: ['    public void Eat(float amount)'], run: 'trigger', x: { zh: '别的脚本（例如灌木）会调用它。', en: 'Other scripts (like the bush) call this.' } },
    { c: ['    {'], run: 'trigger' },
    { c: ['        hunger = Mathf.Min(hunger + amount, 100f);'], run: 'trigger' },
    { c: ['    }'], run: 'trigger' },
    { c: [''] },
    { c: ['    public void Drink(float amount)'], run: 'trigger' },
    { c: ['    {'], run: 'trigger' },
    { c: ['        thirst = Mathf.Min(thirst + amount, 100f);'], run: 'trigger' },
    { c: ['    }'], run: 'trigger' },
    { c: ['}'] }],
};

const DrinkWater = {
  name: 'DrinkWater', kind: 'drink', interactable: true, deps: ['Interactable', 'SurvivalStats'], blanks: [], answers: {},
  compile() { return { errors: needs(DrinkWater.lines, ['Interactable', 'SurvivalStats']), rt: {} }; },
  fields: [{ id: 'promptText', label: 'Prompt Text', type: 'text', def: 'Press F to drink' }, { id: 'water', label: 'Water', type: 'float', def: 30 }],
  lines: [
    { c: ['using UnityEngine;'] },
    { c: [''] },
    { c: ['public class DrinkWater : Interactable'], x: { zh: '挂在海上：看着水按 F 就喝水。', en: 'Goes on the sea: look at the water and press F to drink.' } },
    { c: ['{'] },
    { c: ['    public float water = 30f;'] },
    { c: [''] },
    { c: ['    public override void Use()'], run: 'trigger' },
    { c: ['    {'], run: 'trigger' },
    { c: ['        SurvivalStats stats = FindFirstObjectByType<SurvivalStats>();'], run: 'trigger', x: { zh: '在场景里找到第一个 SurvivalStats（就是 Player 身上那个）。', en: 'Finds the first SurvivalStats in the scene (the one on Player).' } },
    { c: ['        stats.Drink(water);'], run: 'trigger', err: 'noStats' },
    { c: ['    }'], run: 'trigger' },
    { c: ['}'] }],
};

const BerryBush = {
  name: 'BerryBush', kind: 'eat', interactable: true, deps: ['Interactable', 'SurvivalStats'], blanks: [], answers: {},
  compile() { return { errors: needs(BerryBush.lines, ['Interactable', 'SurvivalStats']), rt: {} }; },
  fields: [{ id: 'promptText', label: 'Prompt Text', type: 'text', def: 'Press F to eat berries' }, { id: 'food', label: 'Food', type: 'float', def: 25 }],
  lines: [
    { c: ['using UnityEngine;'] },
    { c: [''] },
    { c: ['public class BerryBush : Interactable'], x: { zh: '挂在灌木上：按 F 吃莓果。', en: 'Goes on a bush: press F to eat berries.' } },
    { c: ['{'] },
    { c: ['    public float food = 25f;'] },
    { c: [''] },
    { c: ['    public override void Use()'], run: 'trigger' },
    { c: ['    {'], run: 'trigger' },
    { c: ['        FindFirstObjectByType<SurvivalStats>().Eat(food);'], run: 'trigger', err: 'noStats' },
    { c: ['    }'], run: 'trigger' },
    { c: ['}'] }],
};

const Inventory = {
  name: 'Inventory', kind: 'inventory', deps: ['ItemData'],
  fields: [{ id: 'panel', label: 'Panel', type: 'transform', go: true, def: null }, { id: 'listText', label: 'List Text', type: 'ref', accept: 'uitext', def: null }],
  blanks: [{ id: 'tab', w: 6, tip: { zh: 'Tab 键：tabKey', en: 'The Tab key: tabKey' } }],
  answers: { tab: 'tabKey' },
  compile(b) { const E = [], rt = { key: 'Tab' }; keyBlank(E, b, 'tab', rt, 'tabKey'); return { errors: E.concat(needs(Inventory.lines, ['ItemData'])), rt }; },
  lines: [
    { c: ['using UnityEngine;'] },
    { c: ['using UnityEngine.InputSystem;'] },
    { c: ['using System.Collections.Generic;'], x: { zh: 'Dictionary（字典）在这里面。', en: 'Dictionary lives here.' } },
    { c: ['using TMPro;'] },
    { c: [''] },
    { c: ['public class Inventory : MonoBehaviour'], x: { zh: '背包：记住每样物品有几个。按 Tab 打开 / 关上背包面板。挂在 Player 上。', en: 'The backpack: remembers how many of each item you have. Tab opens and closes the panel. Put it on Player.' } },
    { c: ['{'] },
    { c: ['    public GameObject panel;'], err: 'noPanel' },
    { c: ['    public TMP_Text listText;'], err: 'noList' },
    { c: ['    Dictionary<ItemData, int> items = new Dictionary<ItemData, int>();'], x: { zh: '字典：用「物品」查「数量」。例如 Stick → 2。', en: 'A dictionary: look up a count by item, e.g. Stick → 2.' } },
    { c: [''] },
    { c: ['    public void Add(ItemData item, int amount)'], run: 'trigger' },
    { c: ['    {'], run: 'trigger' },
    { c: ['        items[item] = Count(item) + amount;'], run: 'trigger' },
    { c: ['        Refresh();'], run: 'trigger' },
    { c: ['    }'], run: 'trigger' },
    { c: [''] },
    { c: ['    public void Remove(ItemData item, int amount)'], run: 'trigger' },
    { c: ['    {'], run: 'trigger' },
    { c: ['        items[item] = Count(item) - amount;'], run: 'trigger' },
    { c: ['        Refresh();'], run: 'trigger' },
    { c: ['    }'], run: 'trigger' },
    { c: [''] },
    { c: ['    public int Count(ItemData item)'] },
    { c: ['    {'] },
    { c: ['        return items.ContainsKey(item) ? items[item] : 0;'], x: { zh: '有这样东西就回答数量，没有就回答 0。? : 是「如果…就…不然…」。', en: 'Return the count if we have it, otherwise 0. ? : means “if … then … else …”.' } },
    { c: ['    }'] },
    { c: [''] },
    { c: ['    void Update()'], run: 'update' },
    { c: ['    {'], run: 'update' },
    { c: ['        if (Keyboard.current.', B('tab'), '.wasPressedThisFrame)'], run: 'update', key: 'Tab' },
    { c: ['        {'], run: 'update', key: 'Tab' },
    { c: ['            panel.SetActive(!panel.activeSelf);'], run: 'update', key: 'Tab', err: 'noPanel', x: { zh: '! 是「相反」：开着就关，关着就开。', en: '! means “the opposite”: open becomes closed and closed becomes open.' } },
    { c: ['            Cursor.lockState = panel.activeSelf ? CursorLockMode.None : CursorLockMode.Locked;'], run: 'update', key: 'Tab', x: { zh: '背包开着就放开鼠标（才能点按钮），关上就锁回去（继续转头）。', en: 'Free the mouse while the backpack is open (so you can click), lock it again when closed (to look around).' } },
    { c: ['        }'], run: 'update', key: 'Tab' },
    { c: ['    }'], run: 'update' },
    { c: [''] },
    { c: ['    void Refresh()'], run: 'trigger' },
    { c: ['    {'], run: 'trigger' },
    { c: ['        string text = "";'], run: 'trigger' },
    { c: ['        foreach (var pair in items)'], run: 'trigger' },
    { c: ['            if (pair.Value > 0) text += pair.Key.itemName + " x" + pair.Value + "\\n";'], run: 'trigger' },
    { c: ['        listText.text = text;'], run: 'trigger', err: 'noList' },
    { c: ['    }'], run: 'trigger' },
    { c: ['}'] }],
};

const ItemPickup = {
  name: 'ItemPickup', kind: 'pickupItem', interactable: true, deps: ['Interactable', 'Inventory', 'ItemData'], blanks: [], answers: {},
  compile() { return { errors: needs(ItemPickup.lines, ['Interactable', 'Inventory', 'ItemData']), rt: {} }; },
  fields: [{ id: 'promptText', label: 'Prompt Text', type: 'text', def: 'Press F to pick up' }, { id: 'item', label: 'Item', type: 'aref', accept: 'itemdata', def: null }, { id: 'amount', label: 'Amount', type: 'float', def: 1 }],
  lines: [
    { c: ['using UnityEngine;'] },
    { c: [''] },
    { c: ['public class ItemPickup : Interactable'], x: { zh: '地上可以捡的东西：按 F 放进背包。Item 格子放它是哪一种物品。', en: 'Something on the ground you can pick up: press F to put it in the backpack. The Item slot says which item it is.' } },
    { c: ['{'] },
    { c: ['    public ItemData item;'], x: { zh: '把项目窗口里的物品数据（例如 Stick）拖进这一格。', en: 'Drag an Item Data file (like Stick) from the Project window into this slot.' } },
    { c: ['    public int amount = 1;'] },
    { c: [''] },
    { c: ['    public override void Use()'], run: 'trigger' },
    { c: ['    {'], run: 'trigger' },
    { c: ['        FindFirstObjectByType<Inventory>().Add(item, amount);'], run: 'trigger', err: 'noInv' },
    { c: ['        gameObject.SetActive(false);'], run: 'trigger' },
    { c: ['    }'], run: 'trigger' },
    { c: ['}'] }],
};

const Crafting = {
  name: 'Crafting', kind: 'craft', methods: ['CraftAxe'], deps: ['Inventory', 'ItemData'],
  fields: [{ id: 'stick', label: 'Stick', type: 'aref', accept: 'itemdata', def: null }, { id: 'stone', label: 'Stone', type: 'aref', accept: 'itemdata', def: null }, { id: 'axe', label: 'Axe', type: 'aref', accept: 'itemdata', def: null }],
  blanks: [{ id: 'and', w: 2, tip: { zh: '「树枝够了而且石头也够了」：而且要写 &&', en: '“enough sticks AND enough stones”: AND is written &&' } }],
  answers: { and: '&&' },
  compile(b) { const E = [], rt = {}; opBlank(E, b, 'and', rt); return { errors: E.concat(needs(Crafting.lines, ['Inventory', 'ItemData'])), rt }; },
  lines: [
    { c: ['using UnityEngine;'] },
    { c: [''] },
    { c: ['public class Crafting : MonoBehaviour'], x: { zh: '合成：材料够就扣掉材料、做出新东西。挂在 Player 上，背包里的按钮调用 CraftAxe。', en: 'Crafting: if you have the materials, use them up and make something new. Put it on Player; the backpack button calls CraftAxe.' } },
    { c: ['{'] },
    { c: ['    public ItemData stick;'] },
    { c: ['    public ItemData stone;'] },
    { c: ['    public ItemData axe;'] },
    { c: ['    Inventory inventory;'] },
    { c: [''] },
    { c: ['    void Start()'], run: 'start' },
    { c: ['    {'], run: 'start' },
    { c: ['        inventory = GetComponent<Inventory>();'], run: 'start', x: { zh: '同一个物体（Player）上的背包。', en: 'The Inventory on the same object (Player).' } },
    { c: ['    }'], run: 'start' },
    { c: [''] },
    { c: ['    public void CraftAxe()'], run: 'trigger' },
    { c: ['    {'], run: 'trigger' },
    { c: ['        if (inventory.Count(stick) >= 2 ', B('and'), ' inventory.Count(stone) >= 1)'], run: 'trigger', err: 'noInv', x: { zh: '&& 是「而且」：两个都成立才行。写成 ||（或者）也能编译，但只有树枝也能做出斧头。', en: '&& means AND: both must be true. || (OR) also compiles, but then sticks alone would make an axe.' } },
    { c: ['        {'], run: 'trigger' },
    { c: ['            inventory.Remove(stick, 2);'], run: 'trigger' },
    { c: ['            inventory.Remove(stone, 1);'], run: 'trigger' },
    { c: ['            inventory.Add(axe, 1);'], run: 'trigger' },
    { c: ['            Debug.Log("Crafted an axe!");'], run: 'trigger' },
    { c: ['        }'], run: 'trigger' },
    { c: ['        else Debug.Log("Not enough materials");'], run: 'trigger' },
    { c: ['    }'], run: 'trigger' },
    { c: ['}'] }],
};

const ChopTree = {
  name: 'ChopTree', kind: 'chop', interactable: true, deps: ['Interactable', 'Inventory', 'ItemData'], blanks: [], answers: {},
  compile() { return { errors: needs(ChopTree.lines, ['Interactable', 'Inventory', 'ItemData']), rt: {} }; },
  fields: [{ id: 'promptText', label: 'Prompt Text', type: 'text', def: 'Press F to chop' }, { id: 'needText', label: 'Need Text', type: 'text', def: 'You need an axe' },
           { id: 'axe', label: 'Axe', type: 'aref', accept: 'itemdata', def: null }, { id: 'wood', label: 'Wood', type: 'aref', accept: 'itemdata', def: null }, { id: 'woodAmount', label: 'Wood Amount', type: 'float', def: 3 }],
  lines: [
    { c: ['using UnityEngine;'] },
    { c: ['using System.Collections;'] },
    { c: [''] },
    { c: ['public class ChopTree : Interactable'], x: { zh: '挂在树上：有斧头才能砍。砍了得到木头，树慢慢倒下再消失（协程）。', en: 'Goes on a tree: you need an axe. Chopping gives wood, and the tree falls over then disappears (a coroutine).' } },
    { c: ['{'] },
    { c: ['    public string needText = "You need an axe";'] },
    { c: ['    public ItemData axe;'] },
    { c: ['    public ItemData wood;'] },
    { c: ['    public int woodAmount = 3;'] },
    { c: [''] },
    { c: ['    public override void Use()'], run: 'trigger' },
    { c: ['    {'], run: 'trigger' },
    { c: ['        Inventory inventory = FindFirstObjectByType<Inventory>();'], run: 'trigger' },
    { c: ['        if (inventory.Count(axe) < 1)'], run: 'trigger', err: 'noInv' },
    { c: ['        {'], run: 'trigger' },
    { c: ['            promptText = needText;'], run: 'trigger' },
    { c: ['            return;'], run: 'trigger' },
    { c: ['        }'], run: 'trigger' },
    { c: ['        inventory.Add(wood, woodAmount);'], run: 'trigger' },
    { c: ['        StartCoroutine(Fall());'], run: 'trigger' },
    { c: ['    }'], run: 'trigger' },
    { c: [''] },
    { c: ['    IEnumerator Fall()'], x: { zh: '协程：一帧一帧把树转倒，转完再藏起来。', en: 'A coroutine: tip the tree over frame by frame, then hide it.' } },
    { c: ['    {'] },
    { c: ['        for (float t = 0f; t < 1f; t += Time.deltaTime)'], run: 'move', x: { zh: 'for 循环：t 从 0 慢慢加到 1，大约 1 秒。', en: 'A for loop: t climbs from 0 to 1 over about a second.' } },
    { c: ['        {'], run: 'move' },
    { c: ['            transform.rotation = Quaternion.Euler(t * 90f, 0f, 0f);'], run: 'move' },
    { c: ['            yield return null;'], run: 'move' },
    { c: ['        }'], run: 'move' },
    { c: ['        gameObject.SetActive(false);'] },
    { c: ['    }'] },
    { c: ['}'] }],
};

const Campfire = {
  name: 'Campfire', kind: 'campfire', interactable: true, deps: ['Interactable', 'Inventory', 'ItemData'], blanks: [], answers: {},
  compile() { return { errors: needs(Campfire.lines, ['Interactable', 'Inventory', 'ItemData']), rt: {} }; },
  fields: [{ id: 'promptText', label: 'Prompt Text', type: 'text', def: 'Press F to light the fire (3 Wood)' }, { id: 'needText', label: 'Need Text', type: 'text', def: 'You need 3 Wood' },
           { id: 'wood', label: 'Wood', type: 'aref', accept: 'itemdata', def: null }, { id: 'fire', label: 'Fire', type: 'transform', go: true, def: null },
           { id: 'fireLight', label: 'Fire Light', type: 'ref', accept: 'light', def: null }, { id: 'woodNeeded', label: 'Wood Needed', type: 'float', def: 3 }],
  lines: [
    { c: ['using UnityEngine;'] },
    { c: [''] },
    { c: ['public class Campfire : Interactable'], x: { zh: '挂在营火底座上：有 3 块木头才能生火。生火 = 打开火焰粒子和火光。', en: 'Goes on the campfire base: you need 3 Wood. Lighting it switches on the flame particles and the firelight.' } },
    { c: ['{'] },
    { c: ['    public string needText = "You need 3 Wood";'] },
    { c: ['    public ItemData wood;'] },
    { c: ['    public GameObject fire;'], err: 'noFire' },
    { c: ['    public Light fireLight;'], err: 'noFireLight' },
    { c: ['    public int woodNeeded = 3;'] },
    { c: ['    bool lit;'] },
    { c: [''] },
    { c: ['    public override void Use()'], run: 'trigger' },
    { c: ['    {'], run: 'trigger' },
    { c: ['        if (lit) return;'], run: 'trigger' },
    { c: ['        Inventory inventory = FindFirstObjectByType<Inventory>();'], run: 'trigger' },
    { c: ['        if (inventory.Count(wood) < woodNeeded)'], run: 'trigger', err: 'noInv' },
    { c: ['        {'], run: 'trigger' },
    { c: ['            promptText = needText;'], run: 'trigger' },
    { c: ['            return;'], run: 'trigger' },
    { c: ['        }'], run: 'trigger' },
    { c: ['        inventory.Remove(wood, woodNeeded);'], run: 'trigger' },
    { c: ['        fire.SetActive(true);'], run: 'trigger', err: 'noFire' },
    { c: ['        fireLight.enabled = true;'], run: 'trigger', err: 'noFireLight' },
    { c: ['        lit = true;'], run: 'trigger' },
    { c: ['        promptText = "";'], run: 'trigger' },
    { c: ['    }'], run: 'trigger' },
    { c: ['}'] }],
};

const SaveGame = {
  name: 'SaveGame', kind: 'savegame', deps: ['SurvivalStats', 'Inventory', 'ItemData'],
  fields: [{ id: 'items', label: 'Items', type: 'assetlist', accept: 'itemdata', def: [] }],
  blanks: [
    { id: 'set', w: 8, tip: { zh: '存一个小数：SetFloat', en: 'Save a decimal number: SetFloat' } },
    { id: 'get', w: 8, tip: { zh: '读一个小数：GetFloat', en: 'Read a decimal number: GetFloat' } }],
  answers: { set: 'SetFloat', get: 'GetFloat' },
  compile(b) {
    const E = [];
    for (const [k, want, zh] of [['set', 'SetFloat', '存小数要写 SetFloat'], ['get', 'GetFloat', '读小数要写 GetFloat']]) {
      const v = val(b, k);
      if (!v) E.push({ b: k, code: 'CS1001', en: 'Identifier expected', zh: `点号后面空着。${zh}。` });
      else if (v !== want) E.push({ b: k, code: 'CS0117', en: `'PlayerPrefs' does not contain a definition for '${v}'`, zh: `PlayerPrefs 没有「${v}」。${zh}（大小写要对）。` });
    }
    return { errors: E.concat(needs(SaveGame.lines, ['SurvivalStats', 'Inventory', 'ItemData'])), rt: {} };
  },
  lines: [
    { c: ['using UnityEngine;'] },
    { c: ['using UnityEngine.InputSystem;'] },
    { c: [''] },
    { c: ['public class SaveGame : MonoBehaviour'], x: { zh: '存档：按 K 存下位置、数值和背包，按 L 读回来。挂在 Player 上。关掉 app 再打开也还在。', en: 'Saving: K saves your position, stats and backpack; L loads them back. Put it on Player. It survives closing the app.' } },
    { c: ['{'] },
    { c: ['    public ItemData[] items;'], x: { zh: '要存哪些物品：把物品数据一个个拖进来。', en: 'Which items to save: drag the Item Data files in.' } },
    { c: ['    SurvivalStats stats;'] },
    { c: ['    Inventory inventory;'] },
    { c: [''] },
    { c: ['    void Start()'], run: 'start' },
    { c: ['    {'], run: 'start' },
    { c: ['        stats = GetComponent<SurvivalStats>();'], run: 'start' },
    { c: ['        inventory = GetComponent<Inventory>();'], run: 'start' },
    { c: ['    }'], run: 'start' },
    { c: [''] },
    { c: ['    void Update()'], run: 'update' },
    { c: ['    {'], run: 'update' },
    { c: ['        if (Keyboard.current.kKey.wasPressedThisFrame) Save();'], run: 'update', key: 'KeyK' },
    { c: ['        if (Keyboard.current.lKey.wasPressedThisFrame) Load();'], run: 'update', key: 'KeyL' },
    { c: ['    }'], run: 'update' },
    { c: [''] },
    { c: ['    void Save()'], run: 'trigger' },
    { c: ['    {'], run: 'trigger' },
    { c: ['        PlayerPrefs.SetFloat("x", transform.position.x);'], run: 'trigger' },
    { c: ['        PlayerPrefs.SetFloat("z", transform.position.z);'], run: 'trigger' },
    { c: ['        PlayerPrefs.', B('set'), '("hunger", stats.hunger);'], run: 'trigger', err: 'noStats', x: { zh: 'PlayerPrefs 用名字（键）存数字：SetFloat 存小数，SetInt 存整数。', en: 'PlayerPrefs stores numbers by name (key): SetFloat for decimals, SetInt for whole numbers.' } },
    { c: ['        PlayerPrefs.SetFloat("thirst", stats.thirst);'], run: 'trigger' },
    { c: ['        PlayerPrefs.SetFloat("health", stats.health);'], run: 'trigger' },
    { c: ['        foreach (ItemData item in items)'], run: 'trigger' },
    { c: ['            PlayerPrefs.SetInt(item.itemName, inventory.Count(item));'], run: 'trigger', err: 'noInv', x: { zh: '每样物品用它的名字当键，存数量。', en: 'Each item’s count is saved under its name.' } },
    { c: ['        PlayerPrefs.Save();'], run: 'trigger' },
    { c: ['        Debug.Log("Saved");'], run: 'trigger' },
    { c: ['    }'], run: 'trigger' },
    { c: [''] },
    { c: ['    void Load()'], run: 'trigger' },
    { c: ['    {'], run: 'trigger' },
    { c: ['        CharacterController controller = GetComponent<CharacterController>();'], run: 'trigger' },
    { c: ['        controller.enabled = false;'], run: 'trigger', x: { zh: '先关掉角色控制器再搬位置，不然它会把你拉回原地。', en: 'Turn the Character Controller off before moving, or it pulls you back.' } },
    { c: ['        transform.position = new Vector3(PlayerPrefs.GetFloat("x"), transform.position.y, PlayerPrefs.GetFloat("z"));'], run: 'trigger' },
    { c: ['        controller.enabled = true;'], run: 'trigger' },
    { c: ['        stats.hunger = PlayerPrefs.', B('get'), '("hunger", 100f);'], run: 'trigger', err: 'noStats', x: { zh: '后面的 100f 是「没存过的话用 100」。', en: 'The 100f means “use 100 if nothing was saved”.' } },
    { c: ['        stats.thirst = PlayerPrefs.GetFloat("thirst", 100f);'], run: 'trigger' },
    { c: ['        stats.health = PlayerPrefs.GetFloat("health", 100f);'], run: 'trigger' },
    { c: ['        foreach (ItemData item in items)'], run: 'trigger' },
    { c: ['        {'], run: 'trigger' },
    { c: ['            inventory.Remove(item, inventory.Count(item));'], run: 'trigger' },
    { c: ['            inventory.Add(item, PlayerPrefs.GetInt(item.itemName, 0));'], run: 'trigger' },
    { c: ['        }'], run: 'trigger' },
    { c: ['        Debug.Log("Loaded");'], run: 'trigger' },
    { c: ['    }'], run: 'trigger' },
    { c: ['}'] }],
};


// ---------- 第 3 章：沙盒游戏 ----------
// BuildSystem 是分版本的脚本：每一步在代码窗口点「加入这一步的新代码」，多出几行（v 从第几版开始有，upto 到第几版被换掉）
const BuildSystem = {
  name: 'BuildSystem', kind: 'build', maxVer: 4,
  fields: [{ id: 'preview', label: 'Preview', type: 'transform', go: true, def: null }, { id: 'reach', label: 'Reach', type: 'float', def: 6 },
           { id: 'block', label: 'Block', type: 'prefab', v: 2, def: null }],
  blanks: [
    { id: 'ray', w: 7, tip: { zh: '从一个点往一个方向射线：Raycast', en: 'Shoot a ray from a point in a direction: Raycast' } },
    { id: 'floor', w: 5, tip: { zh: '往下取整：Floor', en: 'Round down: Floor' } },
    { id: 'normal', w: 6, v: 1, tip: { zh: '打中的那一面朝外的方向：normal', en: 'The direction the hit face points: normal' } },
    { id: 'left', w: 10, v: 2, tip: { zh: '鼠标左键：leftButton', en: 'The left mouse button: leftButton' } },
    { id: 'inst', w: 11, v: 2, tip: { zh: '照着预制件复制一个：Instantiate', en: 'Make a copy of a prefab: Instantiate' } },
    { id: 'tag', w: 5, v: 3, tip: { zh: '方块的标签名：Block', en: 'The blocks’ tag name: Block' } },
    { id: 'destroy', w: 7, v: 3, tip: { zh: '删掉物体：Destroy', en: 'Delete an object: Destroy' } },
    { id: 'box', w: 8, v: 4, tip: { zh: '看一个盒子里有没有东西：CheckBox', en: 'Check whether anything is inside a box: CheckBox' } }],
  answers: { ray: 'Raycast', floor: 'Floor', normal: 'normal', left: 'leftButton', inst: 'Instantiate', tag: 'Block', destroy: 'Destroy', box: 'CheckBox' },
  compile(b, ver) {
    const E = [], rt = {};
    const r = val(b, 'ray');
    if (!r) E.push({ b: 'ray', code: 'CS1001', en: 'Identifier expected', zh: '点号后面空着，要填 Raycast。' });
    else if (r !== 'Raycast') E.push({ b: 'ray', code: 'CS0117', en: `'Physics' does not contain a definition for '${r}'`, zh: `Physics 没有「${r}」。要写 Raycast（R 大写）。` });
    const f = val(b, 'floor');
    if (!f) E.push({ b: 'floor', code: 'CS1001', en: 'Identifier expected', zh: '点号后面空着，要填 Floor。' });
    else if (['Floor', 'Round', 'Ceil'].includes(f)) rt.floor = f;
    else E.push({ b: 'floor', code: 'CS0117', en: `'Mathf' does not contain a definition for '${f}'`, zh: `Mathf 没有「${f}」。往下取整要写 Floor（F 大写）。` });
    if (ver >= 1) {
      const n = val(b, 'normal');
      if (!n) E.push({ b: 'normal', code: 'CS1001', en: 'Identifier expected', zh: '点号后面空着，要填 normal。' });
      else if (n === 'normal' || n === 'point') rt.normal = n;
      else E.push({ b: 'normal', code: 'CS1061', en: `'RaycastHit' does not contain a definition for '${n}' and no accessible extension method '${n}' accepting a first argument of type 'RaycastHit' could be found (are you missing a using directive or an assembly reference?)`, zh: `RaycastHit 没有「${n}」。那一面朝外的方向叫 normal（全小写）。` });
    }
    if (ver >= 2) {
      // 鼠标的三个键都能编译；写成 rightButton 的话，左右就反了
      const l = val(b, 'left'), btn = { leftButton: 'Mouse0', middleButton: 'Mouse1', rightButton: 'Mouse2' };
      if (!l) E.push({ b: 'left', code: 'CS1001', en: 'Identifier expected', zh: '点号后面空着，要填 leftButton。' });
      else if (btn[l]) rt.left = btn[l];
      else E.push({ b: 'left', code: 'CS1061', en: `'Mouse' does not contain a definition for '${l}' and no accessible extension method '${l}' accepting a first argument of type 'Mouse' could be found (are you missing a using directive or an assembly reference?)`, zh: `鼠标没有「${l}」。左键要写 leftButton（B 大写）。` });
      const ins = val(b, 'inst');
      if (!ins) E.push({ b: 'inst', code: 'CS1525', en: "Invalid expression term '('", zh: '等号后面空着，要填 Instantiate。' });
      else if (ins !== 'Instantiate') E.push({ b: 'inst', code: 'CS0103', en: `The name '${ins}' does not exist in the current context`, zh: `电脑不认识「${ins}」。复制预制件要写 Instantiate（I 大写）。` });
    }
    if (ver >= 3) {
      rt.tag = val(b, 'tag');
      if (/"/.test(rt.tag)) E.push({ b: 'tag', code: 'CS1026', en: ') expected', zh: '引号里面只写标签名 Block，不用再加引号。' });
      const d = val(b, 'destroy');
      if (!d) E.push({ b: 'destroy', code: 'CS1525', en: "Invalid expression term '('", zh: '这里空着，要填 Destroy。' });
      else if (d !== 'Destroy') E.push({ b: 'destroy', code: 'CS0103', en: `The name '${d}' does not exist in the current context`, zh: `电脑不认识「${d}」。删掉物体要写 Destroy（D 大写）。` });
    }
    if (ver >= 4) {
      const x = val(b, 'box');
      if (!x) E.push({ b: 'box', code: 'CS1001', en: 'Identifier expected', zh: '点号后面空着，要填 CheckBox。' });
      else if (x !== 'CheckBox') E.push({ b: 'box', code: 'CS0117', en: `'Physics' does not contain a definition for '${x}'`, zh: `Physics 没有「${x}」。看盒子里有没有东西要写 CheckBox（C、B 大写）。` });
    }
    return { errors: E, rt };
  },
  lines: [
    { c: ['using UnityEngine;'] },
    { c: ['using UnityEngine.InputSystem;'], v: 2, x: { zh: '引入新版输入系统，才能读鼠标按键。', en: 'Brings in the new Input System so we can read the mouse buttons.' } },
    { c: [''] },
    { c: ['public class BuildSystem : MonoBehaviour'], x: { zh: '盖房子的脚本，挂在主摄像机上：从屏幕中间（准星）往前射一条线，打中哪里，预览方块就对齐网格放到哪里。', en: 'The building script, on the Main Camera: it shoots a ray straight out of the screen center (the crosshair), and the preview block snaps to the grid wherever it hits.' } },
    { c: ['{'] },
    { c: ['    public GameObject preview;'], err: 'noPreview', x: { zh: '半透明的预览方块。把层级里的 Preview 拖进检查器的这一格。', en: 'The see-through preview block. Drag Preview from the Hierarchy into this slot in the Inspector.' } },
    { c: ['    public GameObject block;'], v: 2, x: { zh: '要放的方块：把项目窗口里的预制件（例如 Dirt）拖进检查器的这一格。', en: 'The block to place: drag a prefab (like Dirt) from the Project window into this slot in the Inspector.' } },
    { c: ['    public float reach = 6f;'], x: { zh: '手能伸多远：射线最远 6 米。太远的地方放不了。', en: 'How far you can reach: the ray goes at most 6 meters. You can’t build farther away.' } },
    { c: ['    RaycastHit hit;'], x: { zh: '用来存射线打中的东西：打中了谁、打中的点、那一面朝哪。', en: 'Holds what the ray hit: which object, the hit point, and which way that face points.' } },
    { c: ['    Vector3 target;'], x: { zh: '方块要放进去的那一格的中心。', en: 'The center of the grid cell the block will go into.' } },
    { c: [''] },
    { c: ['    void Update()'], run: 'update' },
    { c: ['    {'], run: 'update' },
    { c: ['        bool hasTarget = Physics.', B('ray'), '(transform.position, transform.forward, out hit, reach);'], run: 'update', x: { zh: 'Physics.Raycast：从摄像机的位置，朝摄像机前方（transform.forward）射线，最远 reach 米。打中东西就回答 true，打中的资料放进 hit。只打得到有碰撞体的东西。', en: 'Physics.Raycast: shoots from the camera’s position along its forward direction (transform.forward), up to reach meters. It answers true if it hits something and puts the details in hit. It only hits objects with colliders.' } },
    { c: ['        preview.SetActive(hasTarget);'], run: 'update', err: 'noPreview', x: { zh: '打中了才显示预览；看着天空时把它藏起来。', en: 'Show the preview only when something is hit; hide it when you look at the sky.' } },
    { c: ['        if (!hasTarget) return;'], run: 'update', x: { zh: '没打中就到此为止，下面的不用做。', en: 'If nothing was hit, stop here.' } },
    { c: [''], run: 'update' },
    { c: ['        Vector3 p = hit.point;'], upto: 1, run: 'update', x: { zh: 'hit.point：射线打中的那一点。对着地面没问题；对着侧面时，这一点刚好在面上，对齐以后可能落进被打中的方块里面。', en: 'hit.point: where the ray hit. Fine on the ground; on a side face the point sits right on the surface, so after snapping it can land inside the block you hit.' } },
    { c: ['        Vector3 p = hit.point + hit.', B('normal'), ' * 0.5f;'], v: 1, run: 'update', x: { zh: 'hit.normal 是打中的那一面「朝外」的方向（例如顶面朝上、左边那面朝左）。从打中的点往外走半格，就一定落在旁边那一格里，不会钻进方块。', en: 'hit.normal is the direction the hit face points outward (the top points up, the left side points left). Stepping half a cell outward from the hit point always lands in the neighboring cell, never inside the block.' } },
    { c: ['        target = new Vector3(Snap(p.x), Snap(p.y), Snap(p.z));'], run: 'update', x: { zh: 'X、Y、Z 三个方向都对齐到格子中心。', en: 'Snap X, Y and Z to the center of a grid cell.' } },
    { c: ['        preview.transform.position = target;'], run: 'move', x: { zh: '把预览方块搬到那一格。', en: 'Move the preview block to that cell.' } },
    { c: [''], v: 2, run: 'update' },
    { c: ['        if (Mouse.current.', B('left'), '.wasPressedThisFrame) Place();'], v: 2, run: 'update', key: 'Mouse0', x: { zh: 'wasPressedThisFrame：这一帧刚按下去（按住不放不会一直放）。按左键就放一个方块。', en: 'wasPressedThisFrame: pressed down this very frame (holding it doesn’t keep placing). Left-click places a block.' } },
    { c: ['        if (Mouse.current.rightButton.wasPressedThisFrame) Remove();'], v: 3, run: 'update', key: 'Mouse2', x: { zh: '按右键就拆掉看着的那个方块。', en: 'Right-click removes the block you’re looking at.' } },
    { c: ['    }'], run: 'update' },
    { c: [''] },
    { c: ['    void Place()'], v: 2, run: 'trigger' },
    { c: ['    {'], v: 2, run: 'trigger' },
    { c: ['        if (Physics.', B('box'), '(target, Vector3.one * 0.45f)) return;'], v: 4, run: 'trigger', x: { zh: 'Physics.CheckBox：在 target 放一个看不见的盒子，问「里面有没有碰撞体」。有（例如你自己站在那里）就不放。半边长 0.45 比 0.5 小一点，旁边贴着的方块才不算。', en: 'Physics.CheckBox: puts an invisible box at target and asks “is any collider inside?”. If so (say, you’re standing there), don’t place. The half-size 0.45 is a bit less than 0.5, so blocks touching from the side don’t count.' } },
    { c: ['        GameObject b = ', B('inst'), '(block, target, Quaternion.identity);'], v: 2, run: 'trigger', err: 'noBlock', x: { zh: 'Instantiate：照着预制件复制一个新物体，放在 target，不旋转（Quaternion.identity）。播放时新出来的方块会出现在层级里。', en: 'Instantiate: makes a new copy of the prefab at target with no rotation (Quaternion.identity). New blocks show up in the Hierarchy during Play.' } },
    { c: ['        b.name = block.name;'], v: 2, run: 'trigger', x: { zh: '复制出来的名字会叫「Dirt(Clone)」，改回「Dirt」，层级比较好看，存档时也用得到。', en: 'Copies are named “Dirt(Clone)”; renaming them to “Dirt” keeps the Hierarchy tidy and helps with saving later.' } },
    { c: ['    }'], v: 2, run: 'trigger' },
    { c: [''], v: 2 },
    { c: ['    void Remove()'], v: 3, run: 'trigger' },
    { c: ['    {'], v: 3, run: 'trigger' },
    { c: ['        if (hit.collider.CompareTag("', B('tag'), '"))'], v: 3, run: 'trigger', x: { zh: 'CompareTag：看打中的东西是不是贴着这个标签。只有方块贴了 Block，所以楼和地面拆不掉。标签名要一字不差，写错了 Unity 会报错。', en: 'CompareTag: checks whether what we hit has this tag. Only blocks have Block, so buildings and the ground can’t be removed. The name must match exactly or Unity reports an error.' } },
    { c: ['            ', B('destroy'), '(hit.collider.gameObject);'], v: 3, run: 'trigger', x: { zh: 'Destroy：把这个物体删掉。', en: 'Destroy: deletes that object.' } },
    { c: ['    }'], v: 3, run: 'trigger' },
    { c: [''], v: 3 },
    { c: ['    float Snap(float v)'], run: 'update', x: { zh: '对齐网格：把任何数变成它所在那一格的中心。', en: 'Snap to the grid: turn any number into the center of the cell it falls in.' } },
    { c: ['    {'], run: 'update' },
    { c: ['        return Mathf.', B('floor'), '(v) + 0.5f;'], run: 'update', x: { zh: 'Mathf.Floor 是往下取整：2.7 → 2，-0.3 → -1。再加 0.5 就是这一格的中心（方块边长 1，中心在 .5 上）。写成 Round（四舍五入）也能编译，但方块会差半格。', en: 'Mathf.Floor rounds down: 2.7 → 2, -0.3 → -1. Adding 0.5 gives the cell’s center (blocks are 1 wide, centered on .5). Round also compiles, but blocks end up half a cell off.' } },
    { c: ['    }'], run: 'update' },
    { c: ['}'] }],
};

ZTG.scriptLib = { FirstPersonMove, EnemyChase, SurvivalStats, DayNightCycle, SaveLoad, ItemData, Inventory, LightFlicker, Footsteps, DoorOpen, CatchPlayer, ExitZone,
  Interactable, Interact, FlashlightPickup, KeyPickup, LockedDoor, Jumpscare, MainMenu, PauseMenu,
  DrinkWater, BerryBush, ItemPickup, Crafting, ChopTree, Campfire, SaveGame, BuildSystem };
})();
