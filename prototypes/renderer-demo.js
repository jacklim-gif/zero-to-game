// 渲染器技术验证：用 Three.js 做一条恐怖走廊，确认第 1 章、第 4 章要教的效果都做得出来：
// 手电筒（Spot Light）、闪烁灯泡（Point Light）、雾、阴影、金属 / 发光 / 贴图材质、后期处理
// （Bloom、Vignette、Film Grain、Color Adjustments）、前后对比滑块。
(() => {
'use strict';
const T = window.THREE;
const $ = id => document.getElementById(id);
const canvas = $('c');

const renderer = new T.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = T.PCFShadowMap;
renderer.toneMapping = T.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

const scene = new T.Scene();
const camera = new T.PerspectiveCamera(70, 1, 0.05, 80);
scene.add(camera);

/* ---------- 程序生成的贴图（不需要任何图片文件） ---------- */
function tex(draw, rep) {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d'); draw(g);
  const img = g.getImageData(0, 0, 256, 256);
  for (let i = 0; i < img.data.length; i += 4) { const n = (Math.random() - 0.5) * 26; img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n; }
  g.putImageData(img, 0, 0);
  const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(rep[0], rep[1]); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
const stains = (g, n, col) => { for (let i = 0; i < n; i++) { g.fillStyle = col.replace('A', (Math.random() * 0.18).toFixed(3)); g.beginPath(); g.ellipse(Math.random() * 256, Math.random() * 256, 8 + Math.random() * 40, 6 + Math.random() * 60, Math.random() * 3, 0, 7); g.fill(); } };
const concrete = rep => tex(g => { g.fillStyle = '#6b6862'; g.fillRect(0, 0, 256, 256); stains(g, 26, 'rgba(25,20,15,A)'); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, 200, 256, 56); }, rep);
const tiles = rep => tex(g => { g.fillStyle = '#4c4f4a'; g.fillRect(0, 0, 256, 256); g.strokeStyle = 'rgba(0,0,0,.55)'; g.lineWidth = 4; for (let i = 0; i <= 256; i += 64) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 256); g.moveTo(0, i); g.lineTo(256, i); g.stroke(); } stains(g, 18, 'rgba(40,30,15,A)'); }, rep);
const wood = rep => tex(g => { g.fillStyle = '#7a5532'; g.fillRect(0, 0, 256, 256); g.strokeStyle = 'rgba(40,22,8,.6)'; g.lineWidth = 6; for (let i = 0; i <= 256; i += 64) { g.beginPath(); g.moveTo(0, i); g.lineTo(256, i); g.stroke(); } g.lineWidth = 14; g.strokeRect(7, 7, 242, 242); }, rep);

/* ---------- 材质：每个物体有「美化后」和「灰盒」两种 ---------- */
const GREY = new T.MeshStandardMaterial({ color: 0x9a9a9a, roughness: 1 });
const M = {
  wall: new T.MeshStandardMaterial({ map: concrete([7, 1]), roughness: 0.92 }),
  floor: new T.MeshStandardMaterial({ map: tiles([2, 14]), roughness: 0.6, metalness: 0.05 }),
  ceil: new T.MeshStandardMaterial({ map: concrete([2, 14]), roughness: 1, color: 0x8a8a8a }),
  crate: new T.MeshStandardMaterial({ map: wood([1, 1]), roughness: 0.8 }),
  metal: new T.MeshStandardMaterial({ color: 0x5b6470, metalness: 0.9, roughness: 0.32 }),
  rust: new T.MeshStandardMaterial({ color: 0x6e3b22, metalness: 0.6, roughness: 0.7 }),
  door: new T.MeshStandardMaterial({ color: 0x4a1612, roughness: 0.65, metalness: 0.2 }),
  exit: new T.MeshStandardMaterial({ color: 0x0c2a12, emissive: 0x33ff66, emissiveIntensity: 2.4 }),
  bulb: new T.MeshStandardMaterial({ color: 0x332211, emissive: 0xffb36b, emissiveIntensity: 3 }),
};
const meshes = [];
function add(geo, mat, x, y, z, ry) {
  const m = new T.Mesh(geo, mat); m.position.set(x, y, z); if (ry) m.rotation.y = ry;
  m.castShadow = m.receiveShadow = true; m.userData.full = mat; scene.add(m); meshes.push(m); return m;
}

/* ---------- 走廊：宽 4、高 3、长 28，单位和 Unity 一样是米 ---------- */
const L = 28, W = 4, H = 3;
const floor = add(new T.PlaneGeometry(W, L), M.floor, 0, 0, 0); floor.rotation.x = -Math.PI / 2;
const ceil = add(new T.PlaneGeometry(W, L), M.ceil, 0, H, 0); ceil.rotation.x = Math.PI / 2;
add(new T.PlaneGeometry(L, H), M.wall, -W / 2, H / 2, 0, Math.PI / 2);
add(new T.PlaneGeometry(L, H), M.wall, W / 2, H / 2, 0, -Math.PI / 2);
add(new T.PlaneGeometry(W, H), M.wall, 0, H / 2, -L / 2);
add(new T.PlaneGeometry(W, H), M.wall, 0, H / 2, L / 2, Math.PI);
for (let z = -12; z <= 12; z += 4) {           // 柱子：手电筒照过去会投出长长的影子
  add(new T.BoxGeometry(0.3, H, 0.3), M.wall, -W / 2 + 0.15, H / 2, z);
  add(new T.BoxGeometry(0.3, H, 0.3), M.wall, W / 2 - 0.15, H / 2, z);
}
add(new T.CylinderGeometry(0.07, 0.07, L, 10), M.metal, -1.3, H - 0.18, 0).rotation.x = Math.PI / 2;   // 天花板水管
add(new T.CylinderGeometry(0.05, 0.05, L, 10), M.rust, -1.0, H - 0.14, 0).rotation.x = Math.PI / 2;
const box = new T.BoxGeometry(0.8, 0.8, 0.8);
add(box, M.crate, 1.35, 0.4, 3, 0.2); add(box, M.crate, 1.25, 1.2, 3.1, -0.15); add(box, M.crate, -1.3, 0.4, -5, 0.5);
add(new T.CylinderGeometry(0.35, 0.35, 1, 18), M.rust, 1.4, 0.5, -2);
add(new T.CylinderGeometry(0.35, 0.35, 1, 18), M.metal, -1.4, 0.5, 7.5);
add(new T.BoxGeometry(1.2, 2.2, 0.12), M.door, 0, 1.1, -L / 2 + 0.07);
add(new T.BoxGeometry(0.8, 0.28, 0.06), M.exit, 0, 2.5, -L / 2 + 0.1);
const bulbMesh = add(new T.SphereGeometry(0.09, 16, 12), M.bulb, 0, H - 0.35, -4); bulbMesh.castShadow = false;

/* ---------- 灯光 ---------- */
const hemi = new T.HemisphereLight(0x3a4c6a, 0x0a0806, 0.6); scene.add(hemi);
// 手电筒挂在摄像机下面（父子关系），跟着玩家走
const flash = new T.SpotLight(0xfff1d6, 30, 24, 0.42, 0.5, 1.6);
flash.position.set(0.18, -0.15, 0); flash.castShadow = true; flash.shadow.mapSize.set(1024, 1024); flash.shadow.bias = -0.0004; flash.shadow.camera.near = 0.1;
camera.add(flash); camera.add(flash.target); flash.target.position.set(0, -0.05, -3);
const bulb = new T.PointLight(0xffb36b, 6, 9, 1.8); bulb.position.copy(bulbMesh.position).y -= 0.15; bulb.castShadow = true; bulb.shadow.mapSize.set(512, 512); scene.add(bulb);
const exitLight = new T.PointLight(0x33ff66, 1.2, 4, 2); exitLight.position.set(0, 2.4, -L / 2 + 0.5); scene.add(exitLight);
// 「之前」用的平光：像没调过灯光的新场景
const flat = new T.DirectionalLight(0xffffff, 2.2); flat.position.set(2, 5, 3); scene.add(flat);
const flatAmb = new T.AmbientLight(0xffffff, 0.9); scene.add(flatAmb);

const FOG = new T.FogExp2(0x05070a, 0.085), BG_AFTER = new T.Color(0x05070a), BG_BEFORE = new T.Color(0x8fa6bd);

/* ---------- 后期处理：Bloom（发光）→ 色调映射 → 调色 + 暗角 + 胶片噪点 ---------- */
const composer = new T.EffectComposer(renderer);
composer.addPass(new T.RenderPass(scene, camera));
const bloom = new T.UnrealBloomPass(new T.Vector2(256, 256), 0.9, 0.6, 0.55);
composer.addPass(bloom);
composer.addPass(new T.OutputPass());
const grade = new T.ShaderPass({
  uniforms: { tDiffuse: { value: null }, time: { value: 0 }, vignette: { value: 0.85 }, grain: { value: 0.07 }, saturation: { value: 0.72 }, contrast: { value: 1.12 }, tint: { value: new T.Vector3(0.95, 1.0, 1.06) } },
  vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
  fragmentShader: `uniform sampler2D tDiffuse;uniform float time,vignette,grain,saturation,contrast;uniform vec3 tint;varying vec2 vUv;
    float rnd(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
    void main(){vec3 c=texture2D(tDiffuse,vUv).rgb;
      float l=dot(c,vec3(.299,.587,.114));c=mix(vec3(l),c,saturation);c=(c-.5)*contrast+.5;c*=tint;
      c*=1.-smoothstep(.3,.85,distance(vUv,vec2(.5)))*vignette;
      c+=(rnd(vUv*vec2(1.7,2.3)+fract(time))-.5)*grain;
      gl_FragColor=vec4(c,1.);}`,
});
composer.addPass(grade);

/* ---------- 开关 ---------- */
const opt = () => ({ flash: $('o-flash').checked, bulb: $('o-bulb').checked, fog: $('o-fog').checked, shadow: $('o-shadow').checked, mat: $('o-mat').checked, post: $('o-post').checked });
function setMode(after, o) {
  for (const m of meshes) m.material = after && o.mat ? m.userData.full : GREY;
  scene.fog = after && o.fog ? FOG : null;
  scene.background = after ? BG_AFTER : BG_BEFORE;
  flash.visible = after && o.flash; bulb.visible = after && o.bulb; exitLight.visible = after;
  hemi.visible = after; flat.visible = flatAmb.visible = !after;
  flash.castShadow = bulb.castShadow = after && o.shadow; flat.castShadow = false;
  renderer.toneMappingExposure = after ? 1.15 : 1;
}

/* ---------- 第一人称：WASD 走动，拖动鼠标看四周 ---------- */
const pos = new T.Vector3(0, 1.6, 11.5); let yaw = 0, pitch = -0.05;
const keys = new Set();
addEventListener('keydown', e => keys.add(e.code)); addEventListener('keyup', e => keys.delete(e.code)); addEventListener('blur', () => keys.clear());
let dragging = null;
canvas.addEventListener('pointerdown', e => { dragging = [e.clientX, e.clientY]; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener('pointermove', e => { if (!dragging) return; yaw -= (e.clientX - dragging[0]) * 0.004; pitch = Math.max(-1.2, Math.min(1.2, pitch - (e.clientY - dragging[1]) * 0.004)); dragging = [e.clientX, e.clientY]; });
canvas.addEventListener('pointerup', () => { dragging = null; });

function resize() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); composer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();

/* ---------- 主循环 ---------- */
let last = performance.now(), bob = 0, frames = 0, fpsT = last, flick = 1;
const sway = new T.Vector2();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  const f = new T.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw)), r = new T.Vector3(-f.z, 0, f.x);
  const mv = new T.Vector3();
  if (keys.has('KeyW')) mv.add(f); if (keys.has('KeyS')) mv.sub(f); if (keys.has('KeyD')) mv.add(r); if (keys.has('KeyA')) mv.sub(r);
  if (mv.lengthSq()) { mv.normalize().multiplyScalar(2.6 * dt); pos.add(mv); bob += dt * 9; }
  pos.x = Math.max(-1.55, Math.min(1.55, pos.x)); pos.z = Math.max(-13.4, Math.min(13.4, pos.z));
  camera.position.set(pos.x, pos.y + Math.sin(bob) * 0.025, pos.z);
  camera.rotation.set(pitch, yaw, 0, 'YXZ');
  // 手电筒稍微慢半拍跟着视线，看起来像拿在手里
  sway.lerp(new T.Vector2(Math.sin(bob * 0.5) * 0.04, Math.cos(bob) * 0.02), 0.1);
  flash.target.position.set(sway.x, -0.05 + sway.y, -3);
  // 灯泡偶尔闪一下
  if (Math.random() < 0.03) flick = Math.random() < 0.5 ? 0.15 : 1;
  flick += (1 - flick) * 0.08; bulb.intensity = 6 * flick; M.bulb.emissiveIntensity = 3 * flick;
  grade.uniforms.time.value = now / 1000;

  const o = opt(), split = +$('o-split').value / 100, w = innerWidth, h = innerHeight;
  setMode(true, o);
  renderer.setScissorTest(false);
  if (o.post) composer.render(dt); else renderer.render(scene, camera);
  if (split > 0) {   // 左边画「之前」：同一个场景，灰盒材质 + 平光 + 没有雾和后期
    setMode(false, o);
    renderer.setScissorTest(true); renderer.setScissor(0, 0, split * w, h);
    renderer.render(scene, camera);
    renderer.setScissorTest(false);
  }
  $('split').hidden = $('tagL').hidden = $('tagR').hidden = !(split > 0);
  $('split').style.left = $('tagL').style.left = $('tagR').style.left = (split * w) + 'px';

  frames++;
  if (now - fpsT > 500) { window.__fps = Math.round(frames * 1000 / (now - fpsT)); $('fps').textContent = `${window.__fps} FPS · three.js r${T.REVISION}`; frames = 0; fpsT = now; }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
window.__demo = { setView(p, y, pt) { pos.set(p[0], p[1], p[2]); yaw = y; pitch = pt; } };
})();
