// 把 Three.js 和要用到的后期处理打包成一个普通 <script> 文件（app/vendor/three.js），
// 不用 ES module，也不走 CDN，app 可以完全离线运行。改了这里之后跑：npm run vendor
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

window.THREE = Object.assign({}, THREE, { EffectComposer, RenderPass, UnrealBloomPass, ShaderPass, OutputPass });
