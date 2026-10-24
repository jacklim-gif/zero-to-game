// 声音：所有音效都用代码合成（不用下载文件，离线可用）。
// 编辑器用 ZTG.audio.play(key, {loop, volume}) 播放，返回一个句柄，可以随时改音量和左右声道（3D 声音用）。
(() => {
'use strict';
window.ZTG = window.ZTG || {};

// 项目窗口里出现的音频剪辑：key → 名字和说明
const CLIPS = {
  footstep: { name: 'Footstep', zh: '脚步声', en: 'Footstep', len: 0.3 },
  drone:    { name: 'Drone',    zh: '低沉的环境音（可循环）', en: 'Dark ambience (loops)', len: 6 },
  growl:    { name: 'Growl',    zh: '怪物低吼', en: 'Monster growl', len: 1.4 },
};

let ctx = null, master = null, muted = false;
const buffers = {};
function ensure() {
  if (ctx) return ctx;
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = muted ? 0 : 0.8; master.connect(ctx.destination);
  } catch (e) { ctx = null; }
  return ctx;
}

// 简单的伪随机数，让每次生成的声音都一样
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 * 2 - 1; }; }

function synth(key) {
  const sr = ctx.sampleRate, len = Math.round(CLIPS[key].len * sr), d = new Float32Array(len), r = rng(key.length * 977);
  if (key === 'footstep') {
    // 低频「咚」+ 一小段沙沙的噪音
    let lp = 0;
    for (let i = 0; i < len; i++) {
      const t = i / sr, env = Math.exp(-t * 28), envN = Math.exp(-t * 45);
      lp += (r() - lp) * 0.18;
      d[i] = Math.sin(2 * Math.PI * 72 * t) * env * 0.9 + lp * envN * 1.6;
    }
  } else if (key === 'drone') {
    // 几个低音（6 秒内都是整数个周期，循环时不会有接缝）+ 慢慢起伏的风声
    let lp = 0, lp2 = 0;
    const noise = new Float32Array(len);
    for (let i = 0; i < len; i++) { lp += (r() - lp) * 0.02; lp2 += (lp - lp2) * 0.05; noise[i] = lp2; }
    const fade = Math.round(sr * 0.6);
    for (let i = 0; i < len; i++) {
      const t = i / sr, swell = 0.6 + 0.4 * Math.sin(2 * Math.PI * t / 6);
      let n = noise[i];
      if (i < fade) n = n * (i / fade) + noise[len - fade + i] * (1 - i / fade);
      d[i] = 0.32 * Math.sin(2 * Math.PI * 55 * t) + 0.22 * Math.sin(2 * Math.PI * 55.5 * t) + 0.12 * Math.sin(2 * Math.PI * 82.5 * t) * swell + n * 6 * swell;
    }
  } else if (key === 'growl') {
    let ph = 0, lp = 0;
    for (let i = 0; i < len; i++) {
      const t = i / sr, f = 62 + 14 * Math.sin(2 * Math.PI * 5.5 * t) + 6 * r();
      ph += f / sr; const saw = 2 * (ph % 1) - 1;
      lp += (saw + r() * 0.5 - lp) * 0.12;
      const env = Math.min(1, t * 6) * Math.exp(-Math.max(0, t - 0.8) * 5);
      d[i] = lp * env * 1.1;
    }
  }
  let peak = 0; for (let i = 0; i < len; i++) peak = Math.max(peak, Math.abs(d[i]));
  const buf = ctx.createBuffer(1, len, sr); const out = buf.getChannelData(0);
  for (let i = 0; i < len; i++) out[i] = d[i] / (peak || 1) * 0.9;
  return buf;
}

// 播放一个剪辑。返回 {set(gain, pan), stop(), playing()}
function play(key, opts) {
  opts = opts || {};
  if (!CLIPS[key] || !ensure()) return null;
  try {
    if (ctx.state === 'suspended') ctx.resume();
    if (!buffers[key]) buffers[key] = synth(key);
    const src = ctx.createBufferSource(); src.buffer = buffers[key]; src.loop = !!opts.loop;
    if (opts.rate) src.playbackRate.value = opts.rate;
    const g = ctx.createGain(); g.gain.value = opts.volume == null ? 1 : opts.volume;
    const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    src.connect(g); if (p) { g.connect(p); p.connect(master); } else g.connect(master);
    let alive = true; src.onended = () => { alive = false; };
    src.start();
    return {
      set(gain, pan) { g.gain.setTargetAtTime(Math.max(0, gain), ctx.currentTime, 0.03); if (p && pan != null) p.pan.setTargetAtTime(Math.max(-1, Math.min(1, pan)), ctx.currentTime, 0.03); },
      stop() { if (alive) { try { src.stop(); } catch (e) {} alive = false; } },
      playing: () => alive,
    };
  } catch (e) { return null; }
}

function setMuted(m) { muted = !!m; if (master) master.gain.value = muted ? 0 : 0.8; }

ZTG.audio = { clips: CLIPS, play, setMuted };
})();
