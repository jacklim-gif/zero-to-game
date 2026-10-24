// 内置素材库：用简单形状拼出来的低多边形小物件，本项目自己做的，可以自由使用（CC0）。
// 每个零件：g 形状（box 方块 / cyl 圆柱 / cone 圆锥 / sphere 球 / ico 多面体），s 尺寸（米），p 位置，r 旋转（度），c 颜色，
// e 发光颜色（可选），main 表示「拖材质上来时要换颜色的那个零件」。模型的原点在底部中间，放在地上 y=0 就好。
(() => {
'use strict';
window.ZTG = window.ZTG || {};
const P = {
  tree:   { zh: '树', en: 'Tree', parts: [
    { g: 'cyl', s: [.3, 1.2, .3], p: [0, .6, 0], c: '#7a5230' },
    { g: 'ico', s: [1.6, 1.5, 1.6], p: [0, 1.85, 0], c: '#4f8a3b', main: true }] },
  pine:   { zh: '松树', en: 'Pine', parts: [
    { g: 'cyl', s: [.25, .8, .25], p: [0, .4, 0], c: '#6b4528' },
    { g: 'cone', s: [1.5, 1.2, 1.5], p: [0, 1.3, 0], c: '#2f6b3a', main: true },
    { g: 'cone', s: [1.15, 1, 1.15], p: [0, 1.95, 0], c: '#2f6b3a' },
    { g: 'cone', s: [.75, .8, .75], p: [0, 2.55, 0], c: '#2f6b3a' }] },
  rock:   { zh: '石头', en: 'Rock', parts: [
    { g: 'ico', s: [1.2, .8, 1], p: [0, .35, 0], r: [0, 20, 0], c: '#8a8c8e', main: true },
    { g: 'ico', s: [.5, .4, .5], p: [.6, .15, .3], r: [10, 40, 0], c: '#7b7d80' }] },
  bush:   { zh: '灌木', en: 'Bush', parts: [
    { g: 'sphere', s: [.9, .7, .9], p: [0, .35, 0], c: '#5b9a45', main: true },
    { g: 'sphere', s: [.6, .5, .6], p: [.45, .25, .1], c: '#548f40' },
    { g: 'sphere', s: [.5, .45, .5], p: [-.4, .22, -.15], c: '#62a24b' }] },
  crate:  { zh: '木箱', en: 'Crate', parts: [
    { g: 'box', s: [.9, .9, .9], p: [0, .45, 0], c: '#9a6b3c', main: true },
    { g: 'box', s: [.94, .1, .94], p: [0, .2, 0], c: '#6e4a28' },
    { g: 'box', s: [.94, .1, .94], p: [0, .7, 0], c: '#6e4a28' }] },
  barrel: { zh: '木桶', en: 'Barrel', parts: [
    { g: 'cyl', s: [.7, 1, .7], p: [0, .5, 0], c: '#8a5a34', main: true },
    { g: 'cyl', s: [.74, .07, .74], p: [0, .18, 0], c: '#3d3d40' },
    { g: 'cyl', s: [.74, .07, .74], p: [0, .82, 0], c: '#3d3d40' }] },
  lamp:   { zh: '路灯', en: 'Lamp Post', parts: [
    { g: 'cyl', s: [.12, 2.4, .12], p: [0, 1.2, 0], c: '#2d2f33', main: true },
    { g: 'box', s: [.36, .24, .36], p: [0, 2.48, 0], c: '#2d2f33' },
    { g: 'sphere', s: [.24, .24, .24], p: [0, 2.3, 0], c: '#ffd27a', e: '#ffc35c' }] },
  fence:  { zh: '栅栏', en: 'Fence', parts: [
    { g: 'box', s: [.12, 1, .12], p: [-1, .5, 0], c: '#8a6440' },
    { g: 'box', s: [.12, 1, .12], p: [0, .5, 0], c: '#8a6440' },
    { g: 'box', s: [.12, 1, .12], p: [1, .5, 0], c: '#8a6440' },
    { g: 'box', s: [2.2, .1, .07], p: [0, .35, 0], c: '#9b7249', main: true },
    { g: 'box', s: [2.2, .1, .07], p: [0, .75, 0], c: '#9b7249' }] },
  mushroom: { zh: '蘑菇', en: 'Mushroom', parts: [
    { g: 'cyl', s: [.18, .4, .18], p: [0, .2, 0], c: '#e8e0d0' },
    { g: 'sphere', s: [.6, .35, .6], p: [0, .42, 0], c: '#d0453a', main: true }] },
  flowers: { zh: '花丛', en: 'Flowers', parts: [
    { g: 'sphere', s: [.7, .25, .7], p: [0, .1, 0], c: '#4f8a3b' },
    { g: 'sphere', s: [.16, .16, .16], p: [.15, .3, .1], c: '#f2c230', main: true },
    { g: 'sphere', s: [.16, .16, .16], p: [-.2, .28, -.05], c: '#e5484d' },
    { g: 'sphere', s: [.16, .16, .16], p: [0, .32, -.22], c: '#7a4fd0' }] },
};
// 碰撞体用所有零件的包围盒
for (const k in P) {
  const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
  for (const q of P[k].parts) for (let i = 0; i < 3; i++) { mn[i] = Math.min(mn[i], q.p[i] - q.s[i] / 2); mx[i] = Math.max(mx[i], q.p[i] + q.s[i] / 2); }
  P[k].bounds = [mn.map(v => Math.round(v * 100) / 100), mx.map(v => Math.round(v * 100) / 100)];
}
ZTG.props = P;
})();
