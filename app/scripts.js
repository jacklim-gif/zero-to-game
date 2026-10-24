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

ZTG.scriptLib = { FirstPersonMove, EnemyChase };
})();
