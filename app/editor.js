// 从零到游戏：编辑器核心（状态、渲染、交互、物理、脚本执行）。
// 画面用 Three.js（app/vendor/three.js）；章节内容在 chapters/，内置脚本在 scripts.js，界面文字在 i18n.js。
// 场景数据一律用 Unity 的坐标（左手、Y 向上、Z 向前），交给 Three.js 画之前才翻转 Z。
(()=>{
'use strict';
window.ZTG = window.ZTG || {};
const t=ZTG.t, L=ZTG.L, TERMS=ZTG.terms, T3=window.THREE;
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=v=>String(Math.round(v*1000)/1000);
const near=(a,b,e=0.001)=>a.every((v,i)=>Math.abs(v-b[i])<e);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const rnd=v=>{const r=Math.round(v*1e4)/1e4;return r===0?0:r;};
// Unity 名词：有术语解释的加 data-term（悬停弹出解释），其余在中文模式下用 title 显示英文原名
const TERM_OF={audioSource:'audioSource',lightingWin:'lighting',fog:'fog',volumeComp:'volume',postProcessing:'postProcessing',vignette:'postProcessing',filmGrain:'postProcessing',colorAdj:'postProcessing',bloom:'postProcessing',spatialBlend:'spatialBlend',transform:'transform',meshRenderer:'meshRenderer',boxCollider:'collider',meshCollider:'collider',sphereCollider:'collider',capsuleCollider:'collider',
  rigidbody:'rigidbody',camera:'camera',light:'light',material:'material',prefabAsset:'prefab',prefabInst:'prefab',isTrigger:'isTrigger',useGravity:'useGravity',
  isKinematic:'isKinematic',mass:'mass',shader:'shader',baseMap:'baseMap',fov:'fov',monoscript:'script',addComponent:'component',
  characterController:'characterController',navAgent:'navAgent',navSurface:'navMesh',tag:'tag',layer:'layer'};
const tip=k=>TERM_OF[k]?` data-term="${TERM_OF[k]}"`:(ZTG.lang()==='zh'?` title="${esc(ZTG.tl('en',k))}"`:'');
let uid=1; const nid=()=>uid++;
let S=null;
const lsGet=k=>{try{return localStorage.getItem(k);}catch(e){return null;}},lsSet=(k,v)=>{try{localStorage.setItem(k,v);}catch(e){}};
// 设置：教练提示方式、字体大小（存在本机）
const SET=(()=>{const d={hints:'tiered',zoom:1};try{return Object.assign(d,JSON.parse(lsGet('ztg.settings')||'{}'));}catch(e){return d;}})();
function setSetting(k,v){SET[k]=v;lsSet('ztg.settings',JSON.stringify(SET));if(k==='zoom')applyZoom();}
function applyZoom(){const z=SET.zoom||1;if(window.ztgApp&&ztgApp.setZoom)ztgApp.setZoom(z);else document.documentElement.style.zoom=z===1?'':String(z);}
// 模式：ch0 / ch1（教学）、free（自由模式）、bugs / bugs1（第 0 / 1 章的找 Bug 挑战），各自有自己的存档
let MODE='ch0';
// 章节的 key：'0'、'1'、'1b'（第 1 章下篇）。模式名是 'ch' + key 或 'bugs' + key（第 0 章的找 Bug 是 'bugs'）
const chapKey=m=>{const r=/^(?:ch|bugs)(\w+)$/.exec(m||MODE);return r?r[1]:'0';};
const isLesson=()=>/^ch\w+$/.test(MODE),isBugs=()=>/^bugs\w*$/.test(MODE);
const CHAPS=['0','1','1b'];

/* ---------- 3D math (Unity convention: left-handed, Y up, Z forward) ---------- */
function rotV(v,e){let [x,y,z]=v;const [ax,ay,az]=e.map(d=>d*Math.PI/180);
  let c=Math.cos(az),s=Math.sin(az);[x,y]=[x*c-y*s,x*s+y*c];
  c=Math.cos(ax);s=Math.sin(ax);[y,z]=[y*c-z*s,y*s+z*c];
  c=Math.cos(ay);s=Math.sin(ay);[x,z]=[x*c+z*s,-x*s+z*c];return [x,y,z];}
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]], add=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]];
const mul=(a,k)=>[a[0]*k,a[1]*k,a[2]*k], dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const norm=a=>{const l=Math.hypot(a[0],a[1],a[2])||1;return [a[0]/l,a[1]/l,a[2]/l];};
// 3x3 旋转矩阵按列存：M[0]、M[1]、M[2] 是物体自己的 X、Y、Z 轴在世界里的方向
const eulerM=e=>[rotV([1,0,0],e),rotV([0,1,0],e),rotV([0,0,1],e)];
const mMV=(M,v)=>[M[0][0]*v[0]+M[1][0]*v[1]+M[2][0]*v[2],M[0][1]*v[0]+M[1][1]*v[1]+M[2][1]*v[2],M[0][2]*v[0]+M[1][2]*v[1]+M[2][2]*v[2]];
const mTV=(M,v)=>[dot(M[0],v),dot(M[1],v),dot(M[2],v)];
const mMM=(A,B)=>B.map(c=>mMV(A,c));
const mT=M=>[0,1,2].map(i=>[M[0][i],M[1][i],M[2][i]]);
// eulerM 的反运算（Unity 的 Z→X→Y 顺序），返回角度
function mEuler(M){const r=(i,j)=>M[j][i];const sx=clamp(-r(1,2),-1,1),ax=Math.asin(sx);let ay,az;
  if(Math.abs(sx)<.99999){ay=Math.atan2(r(0,2),r(2,2));az=Math.atan2(r(1,0),r(1,1));}else{az=0;ay=Math.atan2(-r(2,0),r(0,0));}
  return [ax,ay,az].map(a=>rnd(a*180/Math.PI));}
function clipNear(poly,n=0.3){const out=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length];const ia=a[2]>=n,ib=b[2]>=n;
  if(ia)out.push(a);if(ia!==ib){const k=(n-a[2])/(b[2]-a[2]);out.push([a[0]+(b[0]-a[0])*k,a[1]+(b[1]-a[1])*k,n]);}}return out;}
const hex2rgb=h=>{const m=/^#?([0-9a-f]{6})$/i.exec(h||'');if(!m)return [200,200,200];const n=parseInt(m[1],16);return [n>>16&255,n>>8&255,n&255];};

/* ---------- 形状和碰撞体（尺寸和 Unity 一样：Cube 边长 1，Sphere 直径 1，Capsule/Cylinder 高 2，Plane 10×10，Quad 1×1） ---------- */
const SHAPES=['cube','sphere','capsule','cylinder','plane','quad'];
const isMesh=o=>SHAPES.includes(o.type);
// 素材库里的模型（app/props.js）：由几个零件组成，原点在底部
const PROPS=()=>ZTG.props||{};
const isModel=o=>o.type==='model';
const isRender=o=>isMesh(o)||isModel(o);
// UI：画在游戏画面上面（Screen Space - Overlay），用 1920×1080 的参考分辨率按画面宽度缩放
const UI_TYPES=['canvas','uitext','uiimage','uislider','uibutton'];
const isUI=o=>UI_TYPES.includes(o.type);
const UI_DEF={uitext:{w:200,h:50,text:'New Text',size:36,color:'#ffffff'},uiimage:{w:100,h:100,color:'#ffffff'},
  uislider:{w:160,h:20,value:0,fill:'#f2f2f2',color:'#5a5f68'},uibutton:{w:160,h:30,text:'Button',color:'#ffffff',tcolor:'#323232',size:24}};
const ANCH={tl:[0,1],tc:[.5,1],tr:[1,1],ml:[0,.5],mc:[.5,.5],mr:[1,.5],bl:[0,0],bc:[.5,0],br:[1,0]};
const MESH_COL={cube:'box',sphere:'sphere',capsule:'capsule',cylinder:'capsule',plane:'mesh',quad:'mesh'};
const COL_KEY={box:'boxCollider',sphere:'sphereCollider',capsule:'capsuleCollider',mesh:'meshCollider'};
const MESH_BOUNDS={cube:[[-.5,-.5,-.5],[.5,.5,.5]],sphere:[[-.5,-.5,-.5],[.5,.5,.5]],capsule:[[-.5,-1,-.5],[.5,1,.5]],cylinder:[[-.5,-1,-.5],[.5,1,.5]],plane:[[-5,0,-5],[5,0,5]],quad:[[-.5,-.5,0],[.5,.5,0]]};
function colBounds(o){const k=o.col.kind;
  if(isModel(o)){const pd=PROPS()[o.model];return pd?pd.bounds:null;}
  if(k==='box')return [[-.5,-.5,-.5],[.5,.5,.5]];if(k==='sphere')return [[-.5,-.5,-.5],[.5,.5,.5]];if(k==='capsule')return [[-.5,-1,-.5],[.5,1,.5]];
  return MESH_BOUNDS[o.type]||null;}
const CC_BOUNDS=[[-.5,-1,-.5],[.5,1,.5]];
function wAABB(o,b){if(!b)return null;const mn=[1e9,1e9,1e9],mx=[-1e9,-1e9,-1e9];
  for(let i=0;i<8;i++){const p=wPoint(o,[b[i&1][0],b[i>>1&1][1],b[i>>2&1][2]]);for(let k=0;k<3;k++){mn[k]=Math.min(mn[k],p[k]);mx[k]=Math.max(mx[k],p[k]);}}return [mn,mx];}

/* ---------- state ---------- */
const V={yaw:-28,pitch:26,dist:13,target:[0,.5,0]};
const keys=new Set();
const TAGS=['Untagged','Respawn','Finish','EditorOnly','MainCamera','Player','GameController'];
const LAYERS=['Default','TransparentFX','Ignore Raycast','Water','UI'];
const modelJson=()=>JSON.stringify([S.objs,S.prefabs,S.assets,S.env]);
function snapJson(){return JSON.stringify([S.objs,S.prefabs,S.env]);}
// 灯光窗口（Window → Rendering → Lighting）的设置：天空盒、环境光、雾
const defEnv=()=>({skybox:true,src:'skybox',amb:'#363636',mul:1,fog:false,fogColor:'#808080',fogMode:'exp2',density:.01,start:0,end:300});
const LIGHT_DEF={directional:{color:'#fff4e5',intensity:1,range:10,angle:30},point:{color:'#ffffff',intensity:1,range:10,angle:30},spot:{color:'#ffffff',intensity:1,range:10,angle:30}};
const mkLight=k=>Object.assign({kind:k},LIGHT_DEF[k]);
function mkObj(type,name,pos,scale){const o={id:nid(),type,name,parent:null,pos:pos||[0,0,0],rot:[0,0,0],scale:scale||[1,1,1],mat:null,prefab:null,scaleOverride:false,scripts:[],rb:null,
  col:MESH_COL[type]?{kind:MESH_COL[type],trigger:false,seq:0}:null,tag:type==='camera'?'MainCamera':'Untagged',layer:'Default',cc:null,agent:null,navs:null,audio:null,vol:null,
  light:type==='light'?mkLight('directional'):null,cam:type==='camera'?{post:false}:null};S.objs.push(o);return o;}
// 旧存档里没有的字段补上默认值
function fixObj(o){if(o.col===undefined)o.col=MESH_COL[o.type]?{kind:MESH_COL[o.type],trigger:false,seq:0}:null;if(!o.tag)o.tag=o.type==='camera'?'MainCamera':'Untagged';if(!o.layer)o.layer='Default';
  for(const k of ['cc','agent','navs','rb','audio','vol','anim'])if(o[k]===undefined)o[k]=null;if(o.parent===undefined)o.parent=null;
  if(o.type==='light'&&!o.light)o.light=mkLight('directional');if(o.type==='camera'&&!o.cam)o.cam={post:false};
  (o.scripts||[]).forEach(s=>{if(!s.vals)s.vals={speed:s.speed!=null?s.speed:5};});}
function mkAsset(type,name,parent,extra){const a=Object.assign({id:nid(),type,name,parent:parent==null?S.cwd:parent},type==='script'?{blanks:{},comp:null}:{},extra||{});S.assets.push(a);return a;}
const obj=id=>S.objs.find(o=>o.id===id), asset=id=>S.assets.find(a=>a.id===id);
const freshFlags=()=>({win:[],winMsg:'',moved:false,rotated:false,scaled:false,maxInst:0,wide:false,viewed:false,played:false,playDist:0,movedInPlay:false,stopped:false,fell:false,fellStopped:false,saved:false,
  hitWall:false,fpsStopped:false,steps:0,flickered:false,doorOpened:false,navErr:false,chased:false,caught:false,escaped:false,
  animLooped:false,animStopped:false,animDone:false,lookedAt:false,torchTaken:false,keyTaken:false,lockedSeen:false,doorUsed:false,scared:false,scaredLit:false,keyed:false,recorded:false,recStopped:false});
function init(){
  S={objs:[],prefabs:{},assets:[],env:defEnv(),sel:null,multi:[],collapsed:[],tool:'w',tab:'scene',cwd:0,ptab:'project',step:0,playing:false,paused:false,snap:null,renaming:null,logs:[],savedJson:'',sig:'',dirty:false,flags:freshFlags()};
  mkObj('camera',t('nCamera'),[0,1,-10]);const l=mkObj('light',t('nLight'),[0,3,0]);l.rot=[50,-30,0];
  const f=mkAsset('folder','Scenes',0);mkAsset('scene','SampleScene',f.id);
  S.savedJson=snapJson();log('info','lReady');resetUndo();
}
// 日志存 key + 参数，渲染时才翻译，切换语言后旧日志也会跟着变；src 指向脚本里的某一行
const now8=()=>new Date().toTimeString().slice(0,8);
function log(type,k,...a){S.logs.push({t:now8(),k,a,type});}
function logSrc(type,k,a,asset,line){S.logs.push({t:now8(),k,a,type,src:line>=0?{a:asset.id,l:line}:null});}
const effScale=o=>o.prefab&&!o.scaleOverride&&S.prefabs[o.prefab]?S.prefabs[o.prefab].scale:o.scale;
const matOf=o=>o.mat?asset(o.mat):null;
const P=()=>S.objs.find(o=>o.name.trim().toLowerCase()==='player');
const FL=()=>S.objs.find(o=>o.name.trim().toLowerCase()==='floor');
const mats=()=>S.assets.filter(a=>a.type==='material');

/* ---------- parent / child ---------- */
const par=o=>o.parent!=null?obj(o.parent):null;
// 物体名字旁边的勾（SetActive）：自己或任何一层父物体没勾，就看不见、不碰撞、脚本不跑
const isActive=o=>{let q=o;while(q){if(q.active===false)return false;q=par(q);}return true;};
const kids=o=>S.objs.filter(x=>x.parent===o.id);
const subtree=o=>[o,...kids(o).flatMap(subtree)];
const isAnc=(a,o)=>{let p=par(o);while(p){if(p===a)return true;p=par(p);}return false;};
// 物体里的一个点 → 世界坐标（一层层套用父物体的缩放、旋转、位置）
function wPoint(o,p){const s=effScale(o);const q=add(rotV([p[0]*s[0],p[1]*s[1],p[2]*s[2]],o.rot),o.pos);const pp=par(o);return pp?wPoint(pp,q):q;}
const wPos=o=>wPoint(o,[0,0,0]);
function wRot(o){const R=eulerM(o.rot);const pp=par(o);return pp?mMM(wRot(pp),R):R;}
function wScale(o){const s=effScale(o);const pp=par(o);if(!pp)return s.slice();const ps=wScale(pp);return s.map((v,i)=>v*ps[i]);}
function setScale(o,s){s=s.map(rnd);if(near(s,effScale(o),1e-4))return;o.scaleOverride=true;o.scale=s;}
function setWorldPos(o,W){const pp=par(o);if(!pp){o.pos=W.slice();return;}const ps=wScale(pp);o.pos=mTV(wRot(pp),sub(W,wPos(pp))).map((v,i)=>v/(ps[i]||1));}
// 换父物体时保持它在世界里的位置不动（和真 Unity 一样），所以检查器里的数字会变
function reparent(o,p){
  const W=wPos(o),R=wRot(o),Sc=wScale(o);
  if(p){const ps=wScale(p);o.pos=mTV(wRot(p),sub(W,wPos(p))).map((v,i)=>rnd(v/(ps[i]||1)));o.rot=mEuler(mMM(mT(wRot(p)),R));o.parent=p.id;setScale(o,Sc.map((v,i)=>v/(ps[i]||1)));}
  else{o.pos=W.map(rnd);o.rot=mEuler(R);o.parent=null;setScale(o,Sc);}
  S.objs.splice(S.objs.indexOf(o),1);S.objs.push(o);
}

/* ---------- selection（可以多选：Cmd/Ctrl 点选加减，Shift 选一段） ---------- */
function select(k,id){S.sel=k?{k,id}:null;S.multi=k==='obj'?[id]:[];}
const selIds=()=>S.sel&&S.sel.k==='obj'?(S.multi&&S.multi.length?S.multi:[S.sel.id]):[];
const selObjs=()=>selIds().map(obj).filter(Boolean);
const topSel=()=>{const os=selObjs();return os.filter(o=>!os.some(a=>a!==o&&isAnc(a,o)));};
const selObj=()=>S.sel&&S.sel.k==='obj'?obj(S.sel.id):null;
const selAsset=()=>S.sel&&S.sel.k==='asset'?asset(S.sel.id):null;
function toggleSel(id){if(!S.sel||S.sel.k!=='obj'){select('obj',id);return;}const m=selIds().slice(),i=m.indexOf(id);
  if(i>=0){m.splice(i,1);if(!m.length){select(null);return;}S.multi=m;S.sel={k:'obj',id:m[m.length-1]};}else{m.push(id);S.multi=m;S.sel={k:'obj',id};}}
function hierOrder(){const out=[];const walk=o=>{out.push(o);if(!S.collapsed.includes(o.id))kids(o).forEach(walk);};S.objs.filter(o=>!par(o)).forEach(walk);return out;}
function rangeSel(id){const order=hierOrder().map(o=>o.id),a=order.indexOf(S.sel&&S.sel.k==='obj'?S.sel.id:id),b=order.indexOf(id);
  if(a<0||b<0){select('obj',id);return;}S.multi=order.slice(Math.min(a,b),Math.max(a,b)+1);S.sel={k:'obj',id};}

/* ---------- undo / redo（保存整个场景和项目文件的快照，最多 100 步） ---------- */
let undoS=[],redoS=[],lastModel='';
function resetUndo(){undoS=[];redoS=[];lastModel=modelJson();}
function trackUndo(){if(S.playing)return;const m=modelJson();if(m===lastModel)return;layMarks=[];undoS.push(lastModel);if(undoS.length>100)undoS.shift();redoS=[];lastModel=m;}
function restoreModel(m){const [o,p,a,en]=JSON.parse(m);S.objs=o;S.prefabs=p;S.assets=a;S.env=Object.assign(defEnv(),en||{});lastModel=m;S.renaming=null;
  if(S.sel){if(S.sel.k==='obj'){const ids=selIds().filter(id=>obj(id));if(!ids.length)select(null);else{S.multi=ids;if(!obj(S.sel.id))S.sel={k:'obj',id:ids[0]};}}else if(!asset(S.sel.id))select(null);}
  if(S.cwd&&!asset(S.cwd))S.cwd=0;}
function undo(){if(S.playing||!undoS.length)return;closeMenu();redoS.push(modelJson());restoreModel(undoS.pop());commit();}
function redo(){if(S.playing||!redoS.length)return;closeMenu();undoS.push(modelJson());restoreModel(redoS.pop());commit();}

/* ---------- 进度保存：关掉 app 再打开，从同一步继续 ---------- */
const saveKey=m=>'ztg.'+(m||MODE)+'.save';let saveT=0;
function saveProgress(){clearTimeout(saveT);saveT=setTimeout(saveNow,250);}
function saveNow(){clearTimeout(saveT);if(!S||S.playing)return;
  try{localStorage.setItem(saveKey(),JSON.stringify({v:1,uid,lang:ZTG.lang(),s:{objs:S.objs,prefabs:S.prefabs,assets:S.assets,env:S.env,step:S.step,flags:S.flags,cwd:S.cwd,logs:S.logs.slice(-60),savedJson:S.savedJson,collapsed:S.collapsed}}));}catch(e){}}
function loadProgress(){let d=null;try{d=JSON.parse(localStorage.getItem(saveKey())||'null');}catch(e){}
  if(!d||d.v!==1||!d.s||!Array.isArray(d.s.objs)||!Array.isArray(d.s.assets))return false;
  init();Object.assign(S,d.s);S.env=Object.assign(defEnv(),d.s.env||{});S.flags=Object.assign(freshFlags(),d.s.flags);S.collapsed=d.s.collapsed||[];uid=Math.max(uid,d.uid||1);
  S.objs.forEach(fixObj);
  if(d.lang&&d.lang!==ZTG.lang())renameDefaults(d.lang,ZTG.lang());
  resetUndo();return true;}
function clearProgress(){clearTimeout(saveT);try{localStorage.removeItem(saveKey());}catch(e){}}
const peekStep=m=>{try{const d=JSON.parse(localStorage.getItem(saveKey(m))||'null');return d&&d.s?d.s.step||0:0;}catch(e){return 0;}};

/* ---------- toast ---------- */
let toastT=0;
function toast(m){const el=$('#toast');el.textContent=m;el.classList.add('show');clearTimeout(toastT);toastT=setTimeout(()=>el.classList.remove('show'),2200);}

/* ---------- icons ---------- */
const sv=(inner,sz,st)=>`<svg viewBox="0 0 16 16" width="${sz||14}" height="${sz||14}" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round" ${st?`style="${st}"`:''}>${inner}</svg>`;
const IC={
  cube:(z,s)=>sv('<path d="M8 1.5 14 4.8v6.4L8 14.5 2 11.2V4.8z"/><path d="M2 4.8 8 8l6-3.2M8 8v6.5"/>',z,s),
  plane:(z,s)=>sv('<path d="M1.5 11 4.5 5h10L11.5 11z"/>',z,s),
  camera:(z,s)=>sv('<rect x="1.5" y="4.5" width="9" height="7" rx="1.2"/><path d="M10.5 7 14.5 5v6l-4-2z"/>',z,s),
  light:(z,s)=>sv('<circle cx="8" cy="8" r="2.6"/><path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M3.4 12.6l1.4-1.4M11.2 4.8l1.4-1.4"/>',z,s),
  empty:(z,s)=>sv('<path d="M8 1.5 14 4.8v6.4L8 14.5 2 11.2V4.8z" stroke-dasharray="2 1.6"/>',z,s),
  canvas:(z,s)=>sv('<rect x="1.5" y="2.5" width="13" height="11" rx="1.2"/><path d="M1.5 5.5h13"/>',z,s),
  uitext:(z,s)=>sv('<path d="M3 3.5h10M8 3.5v9.5M5.5 13h5"/>',z,s),
  uiimage:(z,s)=>sv('<rect x="2" y="3" width="12" height="10" rx="1"/><path d="M2 11l4-3.5 3 2.5 2-1.5 3 2.5"/><circle cx="10.5" cy="6" r="1"/>',z,s),
  uislider:(z,s)=>sv('<path d="M2 8h12"/><circle cx="6" cy="8" r="2.2"/>',z,s),
  uibutton:(z,s)=>sv('<rect x="1.5" y="4.5" width="13" height="7" rx="2"/><path d="M5.5 8h5"/>',z,s),
  eventsystem:(z,s)=>sv('<path d="M4 2.5v9l2.5-2.3 1.7 3.8 1.8-.8-1.7-3.7h3.2z"/>',z,s),
  audio:(z,s)=>sv('<path d="M2.5 6h2.5l3.5-3v10L5 10H2.5z"/><path d="M11 5.5a3.5 3.5 0 0 1 0 5M12.8 3.8a6 6 0 0 1 0 8.4"/>',z,s),
  volume:(z,s)=>sv('<rect x="2" y="2" width="12" height="12" rx="2"/><path d="M5 11l2.2-3 1.6 2L10.5 7 12 11"/>',z,s),
  bulb:(z,s)=>sv('<circle cx="8" cy="6.5" r="4"/><path d="M6.3 11.5h3.4M6.8 14h2.4"/>',z,s),
  spot:(z,s)=>sv('<path d="M5 2.5h6l-1.5 4h-3z"/><path d="M6.5 6.5 3 14h10l-3.5-7.5"/>',z,s),
  anim:(z,s)=>sv('<path d="M2 8h12"/><path d="M4 8l2-2.2L8 8l-2 2.2zM10 8l2-2.2L14 8l-2 2.2z"/>',z,s),
  animctrl:(z,s)=>sv('<rect x="1.5" y="2.5" width="5" height="4" rx="1"/><rect x="9.5" y="9.5" width="5" height="4" rx="1"/><path d="M6.5 4.5h3v5"/>',z,s),
  itemdata:(z,s)=>sv('<path d="M8 1.5 14 8 8 14.5 2 8z"/><path d="M8 5v6M5 8h6"/>',z,s),
  folder:(z,s)=>sv('<path d="M1.5 4.5h5l1.2 1.5h6.8v6.8h-13z"/>',z,s),
  script:(z,s)=>sv('<path d="M3.5 1.5h6l3 3v10h-9z"/><path d="M6 8l-1.5 1.5L6 11M10 8l1.5 1.5L10 11"/>',z,s),
  scene:(z,s)=>sv('<path d="M2 3h12v10H2z"/><path d="M2 10l4-3 3 2 2-1.5 3 2"/>',z,s),
  mat:(z,c)=>`<svg viewBox="0 0 16 16" width="${z||14}" height="${z||14}"><circle cx="8" cy="8" r="6.2" fill="${c||'#fff'}" stroke="rgba(0,0,0,.45)" stroke-width="1.1"/><path d="M4.6 5.4a4.6 4.6 0 0 1 3.4-1.7" stroke="rgba(255,255,255,.75)" stroke-width="1.2" fill="none" stroke-linecap="round"/></svg>`
};
const objIcon=(o,z)=>{const k=o.type==='light'&&o.light&&o.light.kind!=='directional'?(o.light.kind==='spot'?'spot':'bulb'):o.type==='empty'&&o.vol?'volume':o.type==='empty'&&o.audio?'audio':o.type;
  return (IC[k]||IC.cube)(z||14,o.prefab?'color:var(--accent)':'');};
const assetIcon=(a,z)=>a.type==='anim'?IC.anim(z,'color:#7fd1ff'):a.type==='animctrl'?IC.animctrl(z,'color:#f0b24a'):a.type==='audio'?IC.audio(z,'color:#7fd1ff'):a.type==='material'?IC.mat(z,a.color):a.type==='prefab'?IC.cube(z,'color:var(--accent)'):a.type==='model'?IC.cube(z,'color:var(--ok)'):a.type==='itemdata'?IC.itemdata(z,`color:${a.color||'#9a6b3c'}`):(IC[a.type]||IC.folder)(z);

/* ---------- context menu ---------- */
// 菜单项：{tk: 文字的 i18n key, k: 稳定 id（给教练箭头定位用）, fn, children, dis}
let cmEl=null;
function closeMenu(){if(cmEl){cmEl.remove();cmEl=null;}$$('.mbtn.open').forEach(b=>b.classList.remove('open'));}
function menuHTML(items){return items.map((it,i)=>{
  const sub=it.children?`<span>›</span><div class="cmsub">${menuHTML(it.children)}</div>`:'';
  const ttl=ZTG.lang()==='zh'?` title="${esc(ZTG.tl('en',it.tk))}"`:'';
  return `<div class="cmi${it.dis?' dis':''}${it.children?' hasc':''}" data-i="${i}" data-k="${it.k||''}"${ttl}>${esc(t(it.tk))}${sub}</div>`;}).join('');}
function openMenu(items,x,y){closeMenu();
  const d=document.createElement('div');d.className='cm';d.innerHTML=menuHTML(items);document.body.appendChild(d);cmEl=d;
  const r=d.getBoundingClientRect();d.style.left=clamp(x,4,innerWidth-r.width-4)+'px';d.style.top=clamp(y,4,innerHeight-r.height-4)+'px';
  const find=(el)=>{const path=[];let n=el.closest('.cmi');while(n){const i=+n.dataset.i;path.unshift(i);const p=n.parentElement.closest('.cmi');n=p;}
    let list=items,it=null;for(const i of path){it=list[i];list=it&&it.children;}return it;};
  d.addEventListener('click',e=>{const row=e.target.closest('.cmi');if(!row)return;
    const it=find(row);if(!it||it.dis)return;
    if(it.children){row.classList.toggle('open');return;}
    closeMenu();it.fn&&it.fn();});
}
document.addEventListener('pointerdown',e=>{if(cmEl&&!e.target.closest('.cm')&&!e.target.closest('.mbtn')&&!e.target.closest('[data-plus]'))closeMenu();},true);
function longPress(el,fn){let tm=0,sx=0,sy=0;
  el.addEventListener('pointerdown',e=>{if(e.pointerType!=='touch')return;sx=e.clientX;sy=e.clientY;clearTimeout(tm);tm=setTimeout(()=>fn(e.clientX,e.clientY,e),550);});
  const c=()=>clearTimeout(tm);el.addEventListener('pointerup',c);el.addEventListener('pointercancel',c);
  el.addEventListener('pointermove',e=>{if(Math.hypot(e.clientX-sx,e.clientY-sy)>8)c();});}

/* ---------- creation / editing actions ---------- */
const nameKey=k=>'n'+k[0].toUpperCase()+k.slice(1);
function create3D(kind){const o=mkObj(kind,t(nameKey(kind)));select('obj',o.id);log('info','lCreated',o.name);toast(t('created',o.name));commit();}
function createEmpty(){const o=mkObj('empty',t('nEmpty'));select('obj',o.id);log('info','lCreated',o.name);toast(t('created',o.name));commit();}
const items3D=()=>[{tk:'createEmpty',k:'empty',fn:createEmpty},{tk:'go3d',k:'go3d',children:SHAPES.map(s=>({tk:s,k:s,fn:()=>create3D(s)}))},
  {tk:'lightM',k:'lightm',children:[{tk:'dirLightM',k:'dirlight',fn:()=>createLight('directional')},{tk:'pointLightM',k:'pointlight',fn:()=>createLight('point')},{tk:'spotLightM',k:'spotlight',fn:()=>createLight('spot')}]},
  {tk:'volumeM',k:'volume',children:[{tk:'globalVolumeM',k:'globalvol',fn:createVolume}]},
  {tk:'uiM',k:'ui',children:[{tk:'uiText',k:'uitext',fn:()=>createUI('uitext')},{tk:'uiImage',k:'uiimage',fn:()=>createUI('uiimage')},{tk:'uiSlider',k:'uislider',fn:()=>createUI('uislider')},{tk:'uiButton',k:'uibutton',fn:()=>createUI('uibutton')}]}];
// 和 Unity 一样：场景里没有画布时，先自动建一个画布和事件系统，UI 放在画布下面
function createUI(kind){let c=S.objs.find(o=>o.type==='canvas');
  if(!c){c=mkObj('canvas',t('nCanvas'));if(!S.objs.some(o=>o.type==='eventsystem'))mkObj('eventsystem',t('nEventSystem'));}
  const nk={uitext:'nText',uiimage:'nImage',uislider:'nSlider',uibutton:'nButton'}[kind];
  const o=mkObj(kind,uniqueName(t(nk),c.id));o.parent=c.id;o.ui=Object.assign({anchor:'mc',x:0,y:0},UI_DEF[kind]);
  S.collapsed=S.collapsed.filter(x=>x!==c.id);select('obj',o.id);log('info','lCreated',o.name);toast(t('created',o.name));commit();}
// 灯光：方向光（像太阳）、点光源（灯泡）、聚光灯（手电筒）
function createLight(kind){const o=mkObj('light',uniqueName(t({directional:'nLight',point:'nPointLight',spot:'nSpotLight'}[kind]),null));o.light=mkLight(kind);
  if(kind==='directional')o.rot=[50,-30,0];select('obj',o.id);log('info','lCreated',o.name);toast(t('created',o.name));commit();}
function createVolume(){const o=mkObj('empty',uniqueName(t('nGlobalVolume'),null));o.vol={profile:null,ov:{},seq:nid()};select('obj',o.id);log('info','lCreated',o.name);toast(t('created',o.name));commit();}
function createItemData(){if(S.ptab!=='project')S.ptab='project';const a=mkAsset('itemdata','NewItemData',null,{itemName:'Item',color:'#9a6b3c',stackable:true,maxStack:20});
  S.renaming=a.id;select('asset',a.id);commit();setTimeout(()=>{const r=$('#rn');if(r){r.focus();r.select();}},0);}
function createAsset(kind){
  if(S.ptab!=='project')S.ptab='project';
  const a=kind==='folder'?mkAsset('folder',t('nFolder')):kind==='material'?mkAsset('material',t('nMaterial'),null,{color:'#ffffff'}):mkAsset('script','NewBehaviourScript');
  S.renaming=a.id;select('asset',a.id);commit();
  setTimeout(()=>{const r=$('#rn');if(r){r.focus();r.select();}},0);}
const itemsCreate=()=>[{tk:'create',k:'create',children:[{tk:'folderM',k:'folder',fn:()=>createAsset('folder')},{tk:'materialM',k:'mat',fn:()=>createAsset('material')},{tk:'scriptM',k:'script',fn:()=>createAsset('script')},
  // 只有项目里有 ItemData 脚本时才出现（[CreateAssetMenu] 的效果）
  ...(S.assets.some(a=>a.type==='script'&&a.name==='ItemData')?[{tk:'itemDataM',k:'itemdata',fn:createItemData}]:[])]}];
const itemsComp=()=>[
  {tk:'physics',k:'physics',children:[{tk:'rigidbodyM',k:'rigidbody',fn:()=>addRigidbody(selObj())},
    {tk:'boxColliderM',k:'boxCol',fn:()=>addCollider('box')},{tk:'sphereColliderM',k:'sphereCol',fn:()=>addCollider('sphere')},
    {tk:'capsuleColliderM',k:'capsuleCol',fn:()=>addCollider('capsule')},{tk:'meshColliderM',k:'meshCol',fn:()=>addCollider('mesh')},
    {tk:'characterControllerM',k:'cc',fn:()=>addComp('cc','characterController',()=>({seq:nid()}))}]},
  {tk:'audioCat',k:'audiocat',children:[{tk:'audioSourceM',k:'audiosrc',fn:()=>addComp('audio','audioSource',()=>({clip:null,volume:1,loop:false,awake:true,blend:0,minDist:1,maxDist:500,seq:nid()}))}]},
  {tk:'navigation',k:'nav',children:[{tk:'navAgentM',k:'agent',fn:()=>addComp('agent','navAgent',()=>({speed:3.5,seq:nid()}))},
    {tk:'navSurfaceM',k:'surface',fn:()=>addComp('navs','navSurface',()=>({baked:null,seq:nid()}))}]}];
function deleteSel(){const a=selAsset(),tg=topSel();
  if(tg.length){const kill=new Set(tg.flatMap(subtree).map(x=>x.id));S.objs=S.objs.filter(x=>!kill.has(x.id));tg.forEach(o=>log('info','lDeleted',o.name));select(null);
    S.objs.forEach(x=>x.scripts.forEach(s=>{if(s.vals)for(const k in s.vals)if(typeof s.vals[k]==='number'&&kill.has(s.vals[k])&&k!=='speed')s.vals[k]=null;}));}
  else if(a&&a.type!=='scene'){const kill=new Set([a.id]);let ch=true;while(ch){ch=false;S.assets.forEach(x=>{if(!kill.has(x.id)&&kill.has(x.parent)){kill.add(x.id);ch=true;}});}
    S.assets=S.assets.filter(x=>!kill.has(x.id));S.assets.forEach(x=>{if(x.type==='animctrl')x.states.forEach(st=>{if(kill.has(st.clip))st.clip=null;});});
    S.objs.forEach(x=>{if(kill.has(x.mat))x.mat=null;if(x.audio&&kill.has(x.audio.clip))x.audio.clip=null;if(x.anim&&kill.has(x.anim.ctrl))x.anim=null;x.scripts=x.scripts.filter(s=>!kill.has(s.asset));});select(null);}
  commit();}
// 复制出来的物体叫 "Cube (1)"、"Cube (2)"，和 Unity 6 一样
function uniqueName(name,pid){const base=name.replace(/\s\(\d+\)$/,'');const sib=S.objs.filter(o=>(o.parent==null?null:o.parent)===(pid==null?null:pid));
  if(!sib.some(o=>o.name.replace(/\s\(\d+\)$/,'')===base))return name;
  let n=0;for(const o of sib){const m=/\s\((\d+)\)$/.exec(o.name);if(m&&o.name.replace(/\s\(\d+\)$/,'')===base)n=Math.max(n,+m[1]);}
  return `${base} (${n+1})`;}
function insertTree(tree,pid,at){const map=new Map();
  const out=tree.map(x=>{const c=JSON.parse(JSON.stringify(x));map.set(x.id,c.id=nid());return c;});
  out.forEach(c=>{if(map.has(c.parent))c.parent=map.get(c.parent);c.scripts=(c.scripts||[]).map(s=>Object.assign({},s,{seq:nid()}));
    for(const k of ['rb','cc','agent','navs','audio','vol','anim'])if(c[k])c[k]=Object.assign({},c[k],{seq:nid()});
    if(c.prefab&&!S.prefabs[c.prefab])c.prefab=null;if(c.mat&&!asset(c.mat))c.mat=null;});
  out[0].parent=pid==null?null:pid;out[0].name=uniqueName(out[0].name,out[0].parent);
  S.objs.splice(at,0,...out);return out[0];}
function selectMany(list){if(!list.length)return;S.multi=list.map(o=>o.id);S.sel={k:'obj',id:list[list.length-1].id};}
function duplicateSel(){const tg=topSel();if(!tg.length)return;const made=[];
  for(const o of tg){const tree=subtree(o);const at=Math.max(...tree.map(x=>S.objs.indexOf(x)))+1;made.push(insertTree(tree,o.parent,at));}
  selectMany(made);commit();}
let clip=null;
function copySel(){const tg=topSel();if(tg.length)clip=JSON.stringify(tg.map(subtree));}
function pasteClip(){if(!clip)return;const o=selObj(),pid=o?o.parent:null;selectMany(JSON.parse(clip).map(tree=>insertTree(tree,pid,S.objs.length)));commit();}
function saveScene(){S.savedJson=snapJson();S.flags.saved=true;log('info','lSaved');toast(t('saved'));commit();}

function makePrefab(o,folder){
  if(o.prefab){toast(t('alreadyPrefab',o.name));return;}
  if(!isRender(o)&&o.type!=='empty'){log('warn','lOnlyPrefab');commit();return;}
  if(kids(o).length){log('warn','lPrefabKids');commit();return;}
  const pid=nid();const a=mkAsset('prefab',o.name,folder,{prefabId:pid});
  S.prefabs[pid]={id:pid,assetId:a.id,name:o.name,type:o.type,model:o.model||null,scale:effScale(o).slice(),mat:o.mat,rot:o.rot.slice()};
  o.prefab=pid;o.scaleOverride=false;log('info','lPrefabMade',o.name,a.name);toast(t('nowPrefab',o.name));commit();}
function spawn(a,at){const pf=S.prefabs[a.prefabId];if(!pf)return;
  const n=S.objs.filter(o=>o.prefab===pf.id).length;
  const o=mkObj(pf.type,pf.name+' ('+n+')',at||[0,.5,0]);o.mat=pf.mat;o.prefab=pf.id;o.rot=pf.rot.slice();
  if(pf.type==='model'){o.model=pf.model;o.col={kind:'box',trigger:false,seq:0};if(at)o.pos[1]=0;}
  select('obj',o.id);log('info','lInst',o.name);commit();}
// 把素材库模型从项目窗口拖进场景
function spawnModel(a,at){const pd=PROPS()[a.model];if(!pd)return;
  const o=mkObj('model',uniqueName(a.name,null),at?[at[0],0,at[2]]:[0,0,0]);o.model=a.model;o.col={kind:'box',trigger:false,seq:0};
  select('obj',o.id);log('info','lInst',o.name);commit();}
function importSound(key){const c=ZTG.audio&&ZTG.audio.clips[key];if(!c)return;
  let f=S.assets.find(x=>x.type==='folder'&&x.name==='Audio'&&x.parent===0);if(!f)f=mkAsset('folder','Audio',0);
  const a=S.assets.find(x=>x.type==='audio'&&x.clip===key)||mkAsset('audio',c.name,f.id,{clip:key});S.ptab='project';S.cwd=a.parent;select('asset',a.id);toast(t('imported',c.name));commit();}
function importProp(key){const pd=PROPS()[key];if(!pd)return;
  let f=S.assets.find(x=>x.type==='folder'&&x.name==='Models'&&x.parent===0);if(!f)f=mkAsset('folder','Models',0);
  const a=mkAsset('model',pd.en.replace(/\s/g,''),f.id,{model:key});S.ptab='project';S.cwd=f.id;select('asset',a.id);toast(t('imported',L(pd)));commit();}

/* ---------- components ---------- */
function addRigidbody(o){if(!o)return;
  if(o.type==='plane'||o.type==='quad')log('warn','lRbNoMesh');
  else if(o.rb)log('warn','lHasRb',o.name);
  else{o.rb={useGravity:true,isKinematic:false,seq:nid()};log('info','lAddedRb',o.name);toast(t('addedRb',o.name));}
  commit();}
function addCollider(kind){const o=selObj();if(!o)return;
  if(o.col)log('warn','lHasCollider');else{o.col={kind,trigger:false,seq:nid()};log('info','lAddedComp',ZTG.tl('en',COL_KEY[kind]),o.name);}commit();}
function addComp(key,tk,make){const o=selObj();if(!o)return;
  if(o[key])log('warn','lHasComp',o.name);else{o[key]=make();log('info','lAddedComp',ZTG.tl('en',tk),o.name);toast(t('lAddedComp',t(tk),o.name));}commit();}
function removeComp(o,c){if(!o)return;if(c.startsWith('script:'))o.scripts.splice(+c.slice(7),1);else o[c]=null;commit();}
// 不同脚本模板：第 0 章的 PlayerMove + scripts.js 里的内置脚本。文件名决定用哪个模板。
const PM=()=>ZTG.chapters.ch0.script;
const LIB=()=>Object.assign({PlayerMove:PM()},ZTG.scriptLib||{});
const tmplOf=a=>LIB()[a.name]||PM();
const nice=n=>n.replace(/([a-z])([A-Z])/g,'$1 $2');
function addScript(o,a){const tm=tmplOf(a),vals={};
  (tm.fields||[]).forEach(f=>{vals[f.id]=f.id==='speed'&&a.comp&&a.comp.rt&&a.comp.rt.speed!=null?a.comp.rt.speed:f.def;});
  o.scripts.push({asset:a.id,vals,enabled:true,seq:nid()});}
function applyAsset(a,o){
  if(!a||!o)return;
  if(a.type==='material'){if(isRender(o)){o.mat=a.id;log('info','lMat',a.name,o.name);toast(t('applied',a.name,o.name));}else log('warn','lNoRenderer',o.name);}
  else if(a.type==='audio'){// 和真 Unity 一样：把音频拖到物体上，会自动加一个音频源
    if(!o.audio){o.audio={clip:a.id,volume:1,loop:false,awake:true,blend:0,minDist:1,maxDist:500,seq:nid()};log('info','lAddedComp','Audio Source',o.name);}else o.audio.clip=a.id;
    select('obj',o.id);toast(t('applied',a.name,o.name));}
  else if(a.type==='script'){const tm=LIB()[a.name];
    if(tm&&!tm.blanks.length&&!a.comp)compileScript(a);
    if(!tm){log('error','lScriptErr',a.name);S.ptab='console';toast(t('seeConsole'));}
    else if(tm.kind==='data'){log('error','lNotMono',a.name);S.ptab='console';toast(t('seeConsole'));}
    else if(!a.comp){log('warn','lNotSaved',a.name);toast(t('lNotSaved',a.name));}
    else if(!a.comp.ok){log('error','lScriptBroken',a.name);S.ptab='console';toast(t('seeConsole'));}
    else if(o.scripts.some(s=>s.asset===a.id))log('warn','lHasScript',o.name);
    else{addScript(o,a);select('obj',o.id);log('info','lAddedScript',o.name);toast(t('addedScript',o.name));}
  }else log('warn','lBadDrop');
  commit();}
function moveAsset(a,folderId){if(a.id===folderId)return;let c=folderId;while(c){if(c===a.id)return;c=(asset(c)||{}).parent;}a.parent=folderId;commit();}

/* ---------- scripts: 编译、报错位置 ---------- */
function assetPath(a){const p=[];let c=a.parent;while(c){const f=asset(c);if(!f)break;p.unshift(f.name);c=f.parent;}return ['Assets',...p,a.name+'.cs'].join('/');}
function blankPos(b,vals,tm){const lines=(tm||PM()).lines;for(let i=0;i<lines.length;i++){let col=1;
  for(const seg of lines[i].c){if(typeof seg==='string')col+=seg.length;else if(seg.b===b)return {line:i,col};else col+=String(vals[seg.b]||'').length;}}return {line:-1,col:1};}
function compileOne(a){const tm=tmplOf(a),vals=a.blanks||{};const r=tm.compile(vals);
  const errs=r.errors.map(e=>e.line!=null?Object.assign({col:1},e):Object.assign({},e,blankPos(e.b,vals,tm)));a.comp={ok:!errs.length,errs,rt:r.rt};}
// 和 Unity 一样，存一个脚本会让用到它的其他脚本也重新编译（例如 FlashlightPickup 用到 Interactable）
function compileScript(a){compileOne(a);S.assets.forEach(x=>{if(x!==a&&x.type==='script'&&x.comp&&(tmplOf(x).deps||[]).includes(a.name))compileOne(x);});}
function compileErrs(){const out=[];for(const a of S.assets){if(a.type!=='script'||!a.comp||a.comp.ok)continue;
  for(const e of a.comp.errs)out.push(Object.assign({},e,{a,text:`${assetPath(a)}(${e.line+1},${e.col}): error ${e.code}: ${e.en}`}));}return out;}

/* ---------- physics (Play 模式下才跑，和真 Unity 一样) ---------- */
// 碰撞体用世界里的包围盒（AABB）近似。挂了 Rigidbody 的物体受重力，落在有碰撞体的东西上；
// 没有碰撞体的东西会一直掉；Character Controller 会被墙挡住；是触发器的碰撞体不挡路，只通知「有东西进来了」。
function inCameraView(o){const c=S.objs.find(q=>q.type==='camera');if(!c)return false;const v=mTV(wRot(c),sub(wPos(o),wPos(c)));if(v[2]<.3)return false;
  const ty=Math.tan(30*Math.PI/180),tx=ty*(CW/CH||16/9);return Math.abs(v[0]/v[2])<tx&&Math.abs(v[1]/v[2])<ty;}
const vel=new Map();let COLS=[];
function colList(){return S.objs.filter(q=>q.col&&colBounds(q)&&isActive(q)).map(q=>{const b=wAABB(q,colBounds(q));return {o:q,trig:q.col.trigger,min:b[0],max:b[1]};});}
const dyn=q=>!!(q.rb||q.cc||q.agent);
function groundAt(x,z,feet,step,self,r){let g=-Infinity;
  for(const c of COLS){if(c.trig||c.o===self||isAnc(self,c.o))continue;
    if(x+r<c.min[0]||x-r>c.max[0]||z+r<c.min[2]||z-r>c.max[2])continue;
    if(c.max[1]<=feet+step)g=Math.max(g,c.max[1]);}return g;}
function blocked(x,z,feet,head,self,r){
  for(const c of COLS){if(c.trig||c.o===self||isAnc(self,c.o))continue;
    if(c.max[1]<=feet+.3||c.min[1]>=head)continue;
    if(x+r>c.min[0]&&x-r<c.max[0]&&z+r>c.min[2]&&z-r<c.max[2])return true;}return false;}
function rbPhysics(dt){
  for(const o of S.objs){
    if(o.parent!=null||!o.rb||!o.rb.useGravity||o.rb.isKinematic||o.cc||!isActive(o))continue;
    const b=o.col?wAABB(o,colBounds(o)):null,bottom=b?o.pos[1]-b[0][1]:0;
    let v=(vel.get(o.id)||0)-9.81*dt,y=o.pos[1]+v*dt;
    if(b){const r=Math.min(b[1][0]-b[0][0],b[1][2]-b[0][2])/2*.6;const g=groundAt(o.pos[0],o.pos[2],o.pos[1]-bottom,.05,o,r);if(y-bottom<=g){y=g+bottom;v=0;}}
    o.pos[1]=y;vel.set(o.id,v);
    if(y<-3)S.flags.fell=true;
  }
}
// Character Controller 的 SimpleMove：水平方向会被挡住（贴着墙滑），会上 0.3 米以内的台阶，脚下空了就掉
function ccMove(o,dir,speed,dt){const s=wScale(o),r=.5*Math.max(Math.abs(s[0]),Math.abs(s[2])),half=Math.abs(s[1]);
  let [x,y,z]=o.pos;
  // 先站稳：身体中心以下的碰撞体都算地面（开始时陷进地板里，会被推上来，和真 Unity 一样）
  let v=(vel.get(o.id)||0)-9.81*dt,ny=y+v*dt;const g=groundAt(x,z,y-half,half,o,r*.5);
  if(ny-half<=g){ny=g+half;v=0;}
  const feet=ny-half,head=ny+half,dx=dir[0]*speed*dt,dz=dir[2]*speed*dt;
  if(!blocked(x+dx,z,feet,head,o,r))x+=dx;else if(Math.abs(dx)>1e-6)S.flags.hitWall=true;
  if(!blocked(x,z+dz,feet,head,o,r))z+=dz;else if(Math.abs(dz)>1e-6)S.flags.hitWall=true;
  vel.set(o.id,v);const moved=Math.hypot(x-o.pos[0],z-o.pos[2])>1e-5;o.pos=[x,ny,z];if(ny<-3)S.flags.fell=true;return moved;}
// 触发器：有刚体 / 角色控制器 / 导航代理的物体进出触发器时记一笔
let trigIn=new Set();
function triggers(){const bodies=S.objs.filter(o=>o.parent==null&&dyn(o)&&isActive(o));const now=new Set();
  for(const b of bodies){const bb=b.cc?wAABB(b,CC_BOUNDS):b.col?wAABB(b,colBounds(b)):null;if(!bb)continue;
    for(const c of COLS){if(!c.trig||c.o===b||isAnc(b,c.o))continue;
      if(bb[0][0]<c.max[0]&&bb[1][0]>c.min[0]&&bb[0][1]<c.max[1]&&bb[1][1]>c.min[1]&&bb[0][2]<c.max[2]&&bb[1][2]>c.min[2]){const k=c.o.id+':'+b.id;now.add(k);
        if(!trigIn.has(k)){log('info','lTrigEnter',c.o.name,b.name,b.tag);trigEnter(c.o,b);}}}}
  for(const k of trigIn)if(!now.has(k)){const [ti,bi]=k.split(':').map(Number);const tr=obj(ti),bo=obj(bi);if(tr&&bo)log('info','lTrigExit',tr.name,bo.name);}
  const changed=now.size!==trigIn.size||[...now].some(k=>!trigIn.has(k));trigIn=now;return changed;}

/* ---------- NavMesh：把能走的地方切成 0.5 米的小格子，A* 找路 ---------- */
function bakeNav(surf){const cs=.5,agentR=.5;
  const floors=S.objs.filter(q=>q.type==='plane'&&q.col&&!q.col.trigger&&near(mEuler(wRot(q)),[0,0,0],.5)).map(q=>wAABB(q,colBounds(q)));
  if(!floors.length){surf.navs.baked=null;log('warn','lBaked',0);commit();return;}
  const x0=Math.min(...floors.map(f=>f[0][0])),x1=Math.max(...floors.map(f=>f[1][0])),z0=Math.min(...floors.map(f=>f[0][2])),z1=Math.max(...floors.map(f=>f[1][2]));
  const nx=Math.min(160,Math.ceil((x1-x0)/cs)),nz=Math.min(160,Math.ceil((z1-z0)/cs)),y=Math.max(...floors.map(f=>f[1][1]));
  const obs=colList().filter(c=>!c.trig&&c.o.type!=='plane'&&!dyn(c.o)&&c.max[1]>y+.3&&c.min[1]<y+2);
  let w='',n=0;
  for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){const cx=x0+(i+.5)*cs,cz=z0+(j+.5)*cs;
    const onFloor=floors.some(f=>cx>=f[0][0]&&cx<=f[1][0]&&cz>=f[0][2]&&cz<=f[1][2]);
    const hit=obs.some(c=>cx>c.min[0]-agentR&&cx<c.max[0]+agentR&&cz>c.min[2]-agentR&&cz<c.max[2]+agentR);
    const ok=onFloor&&!hit;w+=ok?'1':'0';if(ok)n++;}
  surf.navs.baked={x0:rnd(x0),z0:rnd(z0),cs,nx,nz,y:rnd(y),w};log('info','lBaked',n);commit();}
const NAV=()=>{const s=S.objs.find(o=>o.navs&&o.navs.baked);return s?s.navs.baked:null;};
const navCell=(nv,x,z)=>[Math.floor((x-nv.x0)/nv.cs),Math.floor((z-nv.z0)/nv.cs)];
const navOk=(nv,i,j)=>i>=0&&j>=0&&i<nv.nx&&j<nv.nz&&nv.w[j*nv.nx+i]==='1';
function nearestOk(nv,i,j){if(navOk(nv,i,j))return [i,j];for(let r=1;r<6;r++)for(let dj=-r;dj<=r;dj++)for(let di=-r;di<=r;di++)if(navOk(nv,i+di,j+dj))return [i+di,j+dj];return null;}
function findPath(nv,from,to){const s=nearestOk(nv,...from),g=nearestOk(nv,...to);if(!s||!g)return null;
  const N=nv.nx,key=(i,j)=>j*N+i,gs=new Map([[key(...s),0]]),came=new Map(),open=[[0,...s]],h=(i,j)=>Math.hypot(i-g[0],j-g[1]);
  while(open.length){let bi=0;for(let k=1;k<open.length;k++)if(open[k][0]<open[bi][0])bi=k;const [,ci,cj]=open.splice(bi,1)[0];
    if(ci===g[0]&&cj===g[1]){const path=[[ci,cj]];let k=key(ci,cj);while(came.has(k)){k=came.get(k);path.unshift([k%N,Math.floor(k/N)]);}return path;}
    for(let dj=-1;dj<=1;dj++)for(let di=-1;di<=1;di++){if(!di&&!dj)continue;const ni=ci+di,nj=cj+dj;if(!navOk(nv,ni,nj))continue;if(di&&dj&&(!navOk(nv,ci+di,cj)||!navOk(nv,ci,cj+dj)))continue;
      const ng=gs.get(key(ci,cj))+(di&&dj?1.414:1);if(ng<(gs.has(key(ni,nj))?gs.get(key(ni,nj)):1e9)){gs.set(key(ni,nj),ng);came.set(key(ni,nj),key(ci,cj));open.push([ng+h(ni,nj),ni,nj]);}}}
  return null;}

/* ---------- 脚本在播放时怎么跑（模拟 C#，出错时报和真 Unity 一样的错） ---------- */
const playErr=new Set(),agentState=new Map(),pressedNow=new Set();let playT=0;let mdx=0,mdy=0,rayInfo=null;
function onceErr(a,key,fn){const k=a.id+':'+key;if(playErr.has(k))return;playErr.add(k);fn();}
const errLine=(tm,e)=>tm.lines.findIndex(l=>l.err===e);
function nre(a,tm,e,why){onceErr(a,e,()=>{const ln=errLine(tm,e);logSrc('error','lNRE',[a.name+'.cs',ln+1,why],a,ln);});}
function runPlayerMove(o,s,a,dt){const rt=a.comp.rt,stepT=rt.dt==='dt'?dt:rt.dt;
  let x=0,z=0;if(keys.has('KeyA'))x-=1;if(keys.has('KeyD'))x+=1;if(keys.has('KeyS'))z-=1;if(keys.has('KeyW'))z+=1;
  if(!x&&!z)return false;const l=Math.hypot(x,z),d=s.vals.speed*stepT;o.pos[0]+=x/l*d;o.pos[2]+=z/l*d;
  S.flags.playDist+=Math.abs(d);if(S.flags.playDist>2)S.flags.movedInPlay=true;return true;}
function runFPS(o,s,a,tm,dt){
  const cam=subtree(o).slice(1).find(q=>q.type==='camera');
  if(!cam){nre(a,tm,'noCam','whyNoCam');return false;}
  const sens=s.vals.mouseSensitivity,st=agentState.get('fps'+o.id)||{pitch:cam.rot[0]};agentState.set('fps'+o.id,st);
  o.rot[1]+=mdx*sens;st.pitch=clamp(st.pitch+mdy*sens,-80,80);cam.rot=[st.pitch,0,0];
  if(!o.cc){nre(a,tm,'noCC','whyNoCC');return false;}
  let x=0,z=0;if(keys.has('KeyA'))x-=1;if(keys.has('KeyD'))x+=1;if(keys.has('KeyS'))z-=1;if(keys.has('KeyW'))z+=1;
  const R=wRot(o),f=norm([R[2][0],0,R[2][2]]),r=norm([R[0][0],0,R[0][2]]);let dir=add(mul(r,x),mul(f,z));const l=Math.hypot(dir[0],dir[2]);dir=l?mul(dir,1/l):[0,0,0];
  const mv=ccMove(o,dir,l?s.vals.speed:0,dt)&&l>0;if(mv)walkedNow.add(o.id);return mv;}
function runChase(o,s,a,tm,dt){
  if(playT<(s.vals.startDelay==null?3:s.vals.startDelay))return false;
  if(!o.agent){nre(a,tm,'chase','whyNoAgent');return false;}
  const tg=s.vals.target!=null?obj(s.vals.target):null;
  if(!tg){onceErr(a,'target',()=>{const ln=errLine(tm,'noTarget');logSrc('error','lUnassigned',[a.name,'target'],a,ln);});return false;}
  const nv=NAV(),me=navCell(nv||{x0:0,z0:0,cs:1},o.pos[0],o.pos[2]);
  if(!nv||!nearestOk(nv,...me)){onceErr(a,'nonav',()=>{const ln=errLine(tm,'chase');logSrc('error','lNoNavMesh',[],a,ln);S.flags.navErr=true;});return false;}
  const st=agentState.get(o.id)||{t:0,path:null};agentState.set(o.id,st);
  const tp=wPos(tg);st.t-=dt;if(st.t<=0||!st.path){st.t=.25;st.path=findPath(nv,me,navCell(nv,tp[0],tp[2]));}
  const b=o.col?wAABB(o,colBounds(o)):null,bottom=b?o.pos[1]-b[0][1]:0;o.pos[1]=nv.y+bottom;
  if(!st.path||Math.hypot(tp[0]-o.pos[0],tp[2]-o.pos[2])<1.1)return false;
  while(st.path.length>1){const [i,j]=st.path[0],cx=nv.x0+(i+.5)*nv.cs,cz=nv.z0+(j+.5)*nv.cs;if(Math.hypot(cx-o.pos[0],cz-o.pos[2])<.3)st.path.shift();else break;}
  const [i,j]=st.path[0];const cx=nv.x0+(i+.5)*nv.cs,cz=nv.z0+(j+.5)*nv.cs;const dx=cx-o.pos[0],dz=cz-o.pos[2],d=Math.hypot(dx,dz);
  if(d<1e-4){st.path.shift();return false;}const step=Math.min(d,o.agent.speed*dt);
  o.pos[0]+=dx/d*step;o.pos[2]+=dz/d*step;o.rot[1]=rnd(Math.atan2(dx,dz)*180/Math.PI);st.dist=(st.dist||0)+step;if(st.dist>2)S.flags.chased=true;return true;}
/* ---------- 声音：音频源播放；3D 声音按离音频监听器（摄像机）的距离变小，并分左右 ---------- */
const sounds=new Map();let soundOn=SET.sound!==false;
function playSource(o,opt){const au=o.audio,a=au&&au.clip!=null?asset(au.clip):null;if(!a||a.type!=='audio')return false;
  const old=sounds.get(o.id);if(old&&old.h)old.h.stop();
  const h=ZTG.audio?ZTG.audio.play(a.clip,Object.assign({loop:au.loop,volume:0},opt||{})):null;sounds.set(o.id,{h,name:a.name,t:performance.now(),len:(ZTG.audio.clips[a.clip]||{}).len||1,loop:au.loop,g:0});updateSounds();return true;}
function stopSounds(){for(const v of sounds.values())if(v.h)v.h.stop();sounds.clear();}
function updateSounds(){const c=S.objs.find(q=>q.type==='camera');const lp=c?wPos(c):[0,0,0],LR=c?wRot(c):eulerM([0,0,0]);
  for(const [id,v] of sounds){const o=obj(id);if(!o||!o.audio||!isActive(o)){if(v.h)v.h.stop();sounds.delete(id);continue;}
    const au=o.audio,b=clamp(au.blend||0,0,1),rel=sub(wPos(o),lp),d=Math.hypot(rel[0],rel[1],rel[2]),mn=Math.max(.01,au.minDist||1);
    const att=d<=mn?1:mn/Math.min(d,Math.max(mn,au.maxDist||500));v.g=clamp(au.volume,0,1)*((1-b)+b*att);
    const side=d>.01?dot(LR[0],rel)/d:0;if(v.h)v.h.set(v.g,side*b);}}
function unassigned(a,tm,field,errKey){onceErr(a,'u_'+field,()=>{const ln=errLine(tm,errKey);logSrc('error','lUnassigned',[a.name,field],a,ln);});}
const logLineOf=(tm,re)=>tm.lines.findIndex(l=>l.c.some(x=>typeof x==='string'&&re.test(x)));
function runSurvival(o,s,a,tm,dt){const bar=s.vals.hungerBar!=null?obj(s.vals.hungerBar):null;
  let h=s.vals.hunger==null?100:s.vals.hunger;h=clamp(h-(s.vals.drainPerSecond||0)*dt,0,100);if(pressedNow.has('KeyE'))h=Math.min(h+30,100);s.vals.hunger=h;
  if(!bar||!bar.ui){unassigned(a,tm,'hungerBar','noBar');return false;}bar.ui.value=h/100;return true;}
function runDayNight(o,s,a,dt){const len=s.vals.dayLengthSeconds||30;o.rot[0]+=360/len*dt;if(o.rot[0]>=360)o.rot[0]-=360;return true;}
// PlayerPrefs：模拟器把它存在本机（localStorage），停止播放、关掉 app 都还在
function prefsGet(){try{return JSON.parse(localStorage.getItem('ztg.prefs')||'{}');}catch(e){return {};}}
function prefsSet(p){try{localStorage.setItem('ztg.prefs',JSON.stringify(p));}catch(e){}}
function runSaveLoad(o,s,a,tm){
  if(pressedNow.has('KeyK')){const p=prefsGet(),w=wPos(o);p.playerX=rnd(w[0]);p.playerZ=rnd(w[2]);prefsSet(p);logSrc('info','raw',['Saved'],a,logLineOf(tm,/"Saved"/));}
  if(pressedNow.has('KeyL')){const p=prefsGet(),w=wPos(o);setWorldPos(o,[p.playerX||0,w[1],p.playerZ||0]);vel.delete(o.id);logSrc('info','raw',['Loaded'],a,logLineOf(tm,/"Loaded"/));return true;}
  return false;}
function startInventory(o,s,a,tm){const tx=s.vals.listText!=null?obj(s.vals.listText):null;
  let text='Inventory:';for(const id of (s.vals.startItems||[])){const it=asset(id);if(it)text+='\n- '+(it.itemName||it.name);}
  if(!tx||!tx.ui){unassigned(a,tm,'listText','noText');return;}tx.ui.text=text;logSrc('info','raw',[text],a,logLineOf(tm,/Debug\.Log/));}
// 第 1 章：闪烁的灯、脚步声、开门、抓人、出口
let walkedPrev=new Set(),walkedNow=new Set();const trigFlash=new Map();
function runFlicker(o,s,a,tm,dt){if(!o.light){nre(a,tm,'noLight','whyNoLight');return false;}
  const st=agentState.get('fl'+o.id)||{t:0};agentState.set('fl'+o.id,st);st.t-=dt;if(st.t>0)return false;
  const lo=s.vals.minIntensity||0,hi=s.vals.maxIntensity||0;o.light.intensity=rnd(lo+Math.random()*(hi-lo));st.t=Math.max(.02,s.vals.flickerSpeed||.08);S.flags.flickered=true;return true;}
function runFootsteps(o,s,a,tm,dt){if(!o.cc){nre(a,tm,'noCC','whyNoCC');return false;}
  if(!walkedPrev.has(o.id))return false;
  const st=agentState.get('fs'+o.id)||{t:0};agentState.set('fs'+o.id,st);st.t-=dt;if(st.t>0)return true;st.t=Math.max(.1,s.vals.stepInterval||.5);
  if(!o.audio){nre(a,tm,'noAudio','whyNoAudio');return true;}
  if(playSource(o,{rate:.9+Math.random()*.2}))S.flags.steps++;return true;}
function runDoor(o,s,a,tm,dt){const st=agentState.get('door'+o.id)||{};agentState.set('door'+o.id,st);const d=s.vals.door!=null?obj(s.vals.door):null;
  if(!st.started){st.started=true;if(!d){unassigned(a,tm,'door','noDoor');return false;}st.target=add(wPos(d),[0,s.vals.liftHeight||0,0]);}
  if(!st.open||!d||!st.target)return false;const p=wPos(d),v=sub(st.target,p),l=Math.hypot(v[0],v[1],v[2]);if(l<1e-4)return false;
  setWorldPos(d,add(p,mul(v,Math.min(l,(s.vals.speed||0)*dt)/l)));S.flags.doorOpened=true;return true;}
function runCatch(o,s,a,tm){const tg=s.vals.target!=null?obj(s.vals.target):null;if(!tg){unassigned(a,tm,'target','noTarget');return false;}
  const p=wPos(o),q=wPos(tg);if(Math.hypot(p[0]-q[0],p[1]-q[1],p[2]-q[2])>=(s.vals.catchDistance||0))return false;
  const m=s.vals.message!=null?obj(s.vals.message):null;if(!m||!m.ui){unassigned(a,tm,'message','noMsg');return false;}
  m.ui.text='GAME OVER';S.frozen=true;S.flags.caught=true;log('info','lTimeScale');return true;}
// OnTriggerEnter：真 Unity 只调用名字完全对的方法；标签不存在时 CompareTag 会报错
function trigEnter(tr,body){for(const s of tr.scripts){const a=asset(s.asset),tm=a&&LIB()[a.name];if(!s.enabled||!tm||!a.comp||!a.comp.ok)continue;
  if(tm.kind==='door'){const rt=a.comp.rt;if(rt.method!=='OnTriggerEnter'){onceErr(a,'cb',()=>log('warn','lNoCallback',a.name,rt.method));continue;}
    trigFlash.set(a.id,performance.now()+900);
    if(!TAGS.includes(rt.tag)){onceErr(a,'tag',()=>{const ln=logLineOf(tm,/CompareTag/);logSrc('error','lNoTag',[rt.tag],a,ln);});continue;}
    if(body.tag===rt.tag){const st=agentState.get('door'+tr.id)||{};st.open=true;agentState.set('door'+tr.id,st);}}
  else if(tm.kind==='jumpscare'){if(body.tag!=='Player')continue;if(agentState.get('js'+tr.id))continue;
    trigFlash.set(a.id,performance.now()+900);agentState.set('js'+tr.id,{phase:'show',t:0});}
  else if(tm.kind==='exit'){trigFlash.set(a.id,performance.now()+900);if(body.tag!=='Player')continue;const m=s.vals.message!=null?obj(s.vals.message):null;
    if(!m||!m.ui){unassigned(a,tm,'message','noMsg');continue;}m.ui.text='YOU ESCAPED';S.frozen=true;S.flags.escaped=true;log('info','lTimeScale');}}}
// 互动：从摄像机往前射线，打中的物体（或它的父物体）上有 Interactable 类的脚本，就显示提示；按键就调用它的 Use
let simStatic={};
const findInteractable=o=>{let q=o;while(q){const s=q.scripts.find(sc=>{const aa=asset(sc.asset),tt=aa&&LIB()[aa.name];return sc.enabled&&tt&&tt.interactable&&aa.comp&&aa.comp.ok;});if(s)return {o:q,s};q=par(q);}return null;};
function runInteract(o,s,a,tm){const pr=s.vals.prompt!=null?obj(s.vals.prompt):null;
  if(!pr||!pr.ui){unassigned(a,tm,'prompt','noPrompt');return false;}pr.ui.text='';
  let root=o;while(par(root))root=par(root);
  const from=wPos(o),dir=mMV(wRot(o),[0,0,1]),h=raycastW(from,dir,new Set(subtree(root).map(q=>q.id)));
  if(!h||h.d>(a.comp.rt.reach||0))return false;const it=findInteractable(h.o);if(!it)return false;
  pr.ui.text=String(it.s.vals.promptText==null?'':it.s.vals.promptText);S.flags.lookedAt=true;
  if(!pressedNow.has(a.comp.rt.key))return false;useInteractable(it.o,it.s);return true;}
function useInteractable(o,s){const a=asset(s.asset),tm=LIB()[a.name];trigFlash.set(a.id,performance.now()+900);
  if(tm.kind==='pickupLight'){const l=s.vals.flashlight!=null?obj(s.vals.flashlight):null;if(!l||!l.light){unassigned(a,tm,'flashlight','noLight2');return;}
    l.light.enabled=true;o.active=false;S.flags.torchTaken=true;}
  else if(tm.kind==='pickupKey'){simStatic.hasKey=true;o.active=false;S.flags.keyTaken=true;}
  else if(tm.kind==='lockedDoor'){const st=agentState.get('ld'+o.id)||{};agentState.set('ld'+o.id,st);
    if(!simStatic.hasKey){s.vals.promptText=s.vals.lockedText;S.flags.lockedSeen=true;return;}
    if(st.opened)return;if(!o.anim){nre(a,tm,'noAnim','whyNoAnim');return;}st.opened=true;s.vals.promptText='';setTrigger(o,'Open',a,tm);S.flags.doorUsed=true;}}
/* ---------- 动画：动画剪辑（关键帧）+ 动画控制器（状态、参数、过渡） ---------- */
const animState=new Map();
const stOf=(c,id)=>c.states.find(x=>x.id===id);
function clipLen(c){let m=0;for(const k in c.curves)for(const kf of c.curves[k])m=Math.max(m,kf[0]);return m||1;}
// 两个关键帧之间平滑过渡（和 Unity 默认的曲线一样，开头结尾慢、中间快）
function sampleCurve(ks,t){if(!ks.length)return null;if(t<=ks[0][0])return ks[0][1];
  for(let i=1;i<ks.length;i++)if(t<=ks[i][0]){const [t0,a]=ks[i-1],[t1,b]=ks[i],u=(t-t0)/((t1-t0)||1),e=u*u*(3-2*u);return a.map((v,k)=>v+(b[k]-v)*e);}
  return ks[ks.length-1][1];}
function applyClip(o,c,t){for(const k of ['pos','rot','scl']){const ks=c.curves[k];if(!ks||!ks.length)continue;const v=sampleCurve(ks,t).map(rnd);if(k==='scl'){o.scale=v;o.scaleOverride=true;}else o[k]=v;}}
function setTrigger(o,name,a,tm){const c=o.anim?asset(o.anim.ctrl):null;if(!c)return;
  if(!c.params.some(p=>p.name===name&&p.type==='trigger')){onceErr(a,'p_'+name,()=>logSrc('warn','lNoParam',[name],a,logLineOf(tm,/SetTrigger/)));return;}
  let st=animState.get(o.id);if(!st){st={state:c.def,t:0,trig:new Set()};animState.set(o.id,st);}st.trig.add(name);}
// 播放时：先看能不能走过渡（条件都满足；勾了 Has Exit Time 要等到 0.75 的位置），再按当前状态的剪辑摆姿势
function runAnimators(dt){for(const o of S.objs){if(!o.anim||!isActive(o))continue;const c=asset(o.anim.ctrl);if(!c||c.type!=='animctrl')continue;
  let st=animState.get(o.id);if(!st){st={state:c.def,t:0,trig:new Set()};animState.set(o.id,st);}
  const cur=stOf(c,st.state);if(!cur)continue;const cl=cur.clip!=null?asset(cur.clip):null,len=cl?clipLen(cl):1,t0=st.t;st.t+=dt;
  for(const tr of c.trans.filter(x=>x.from===cur.id)){
    if(!tr.conds.length&&!tr.exit)continue;
    if(!tr.conds.every(n=>{const pm=c.params.find(p=>p.name===n);return pm&&pm.type==='trigger'&&st.trig.has(n);}))continue;
    if(tr.exit){const n0=t0/len,n1=st.t/len,k=Math.floor(n0-.75)+1.75;if(!(n1>=k))continue;}
    tr.conds.forEach(n=>st.trig.delete(n));st.state=tr.to;st.t=0;break;}
  const now=stOf(c,st.state),nc=now&&now.clip!=null?asset(now.clip):null;
  if(nc){const L_=clipLen(nc);applyClip(o,nc,nc.loop?st.t%L_:Math.min(st.t,L_));if(nc.loop&&st.t>L_*1.3)S.flags.animLooped=true;if(now.id!==c.def&&st.t>=L_)S.flags.animDone=true;}}}
// Jumpscare：协程。走进触发区 → 鬼出现、尖叫、镜头抖 → 等 showTime 秒 → 鬼消失
function runJumpscare(o,s,a,tm,dt){const st=agentState.get('js'+o.id);if(!st||st.phase!=='show')return false;
  const g=s.vals.ghost!=null?obj(s.vals.ghost):null,c=s.vals.cam!=null?obj(s.vals.cam):null,L_=s.vals.scareLight!=null?obj(s.vals.scareLight):null;
  if(st.t===0){if(!g){unassigned(a,tm,'ghost','noGhost');st.phase='done';return false;}if(!c){unassigned(a,tm,'cam','noCamRef');st.phase='done';return false;}
    g.active=true;if(!o.audio){nre(a,tm,'noAudio','whyNoAudio');}else playSource(o);if(L_&&L_.light)L_.light.enabled=true;st.camStart=c.pos.slice();}
  st.t+=dt;const k=s.vals.shakeAmount||0;c.pos=st.camStart.map(v=>v+(Math.random()*2-1)*k);
  if(st.t>=(s.vals.showTime||0)){g.active=false;c.pos=st.camStart.slice();if(L_&&L_.light)L_.light.enabled=false;st.phase='done';S.flags.scared=true;if(L_&&L_.light)S.flags.scaredLit=true;}
  return true;}
function runScripts(dt){let moving=false;const ran=new Set();walkedPrev=walkedNow;walkedNow=new Set();playT+=dt;
  for(const o of S.objs){if(!isActive(o))continue;for(const s of o.scripts){const a=asset(s.asset);const tm=a&&LIB()[a.name];if(!s.enabled||!tm||!a.comp||!a.comp.ok)continue;ran.add(a.id);
    if(!s.vals)s.vals={speed:5};
    let mv=false;if(tm.kind==='translate')mv=runPlayerMove(o,s,a,dt);else if(tm.kind==='fps')mv=runFPS(o,s,a,tm,dt);else if(tm.kind==='chase')mv=runChase(o,s,a,tm,dt);
    else if(tm.kind==='survival')mv=runSurvival(o,s,a,tm,dt);else if(tm.kind==='daynight')mv=runDayNight(o,s,a,dt);else if(tm.kind==='saveload')mv=runSaveLoad(o,s,a,tm);
    else if(tm.kind==='flicker')mv=runFlicker(o,s,a,tm,dt);else if(tm.kind==='footsteps')mv=runFootsteps(o,s,a,tm,dt);else if(tm.kind==='door')mv=runDoor(o,s,a,tm,dt);else if(tm.kind==='catch')mv=runCatch(o,s,a,tm);
    else if(tm.kind==='interact')mv=runInteract(o,s,a,tm);else if(tm.kind==='jumpscare')mv=runJumpscare(o,s,a,tm,dt);
    if(mv)moving=a.id;}}
  mdx=mdy=0;pressedNow.clear();return {moving,ran};}

/* ---------- Three.js 画面 ---------- */
const cv=$('#cv'),gz=$('#gz'),gctx=gz.getContext('2d');let CW=300,CH=200,DPR=1,LV=null,icons=[],handles=[];
const R3=new T3.WebGLRenderer({canvas:cv,antialias:true});
R3.shadowMap.enabled=true;R3.shadowMap.type=T3.PCFShadowMap;R3.toneMapping=T3.ACESFilmicToneMapping;R3.toneMappingExposure=1;
const scene3=new T3.Scene();
const cam3=new T3.PerspectiveCamera(60,1,.05,500);cam3.matrixAutoUpdate=false;cam3.matrixWorldAutoUpdate=false;
const sun=new T3.DirectionalLight(0xfff4e5,2.4);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
Object.assign(sun.shadow.camera,{left:-22,right:22,top:22,bottom:-22,near:.5,far:120});sun.shadow.bias=-.0006;sun.shadow.normalBias=.03;scene3.add(sun,sun.target);
const amb=new T3.HemisphereLight(0xcfdcff,0x4f4840,1.2);scene3.add(amb);
const grid=new T3.GridHelper(24,24,0xffffff,0xffffff);grid.material.transparent=true;grid.material.opacity=.13;grid.material.depthWrite=false;grid.position.y=.003;scene3.add(grid);
function gradTex(a,b){const c=document.createElement('canvas');c.width=2;c.height=256;const g=c.getContext('2d');const gr=g.createLinearGradient(0,0,0,256);gr.addColorStop(0,a);gr.addColorStop(1,b);g.fillStyle=gr;g.fillRect(0,0,2,256);const tx=new T3.CanvasTexture(c);tx.colorSpace=T3.SRGBColorSpace;return tx;}
const BG={scene:gradTex('#48536c','#2a303d'),game:gradTex('#78b0e6','#d8eaf8')};
const GEO={cube:new T3.BoxGeometry(1,1,1),sphere:new T3.SphereGeometry(.5,32,20),capsule:new T3.CapsuleGeometry(.5,1,8,24),cylinder:new T3.CylinderGeometry(.5,.5,2,32),plane:new T3.PlaneGeometry(10,10).rotateX(-Math.PI/2),quad:new T3.PlaneGeometry(1,1)};
const EDGES={plane:new T3.EdgesGeometry(GEO.plane),quad:new T3.EdgesGeometry(GEO.quad)};
// 阴影只用朝向灯的那一面（和 Unity 的 ShadowCaster 一样），所以手电筒在玩家胶囊里面也照得出去
const DEF_MAT=new T3.MeshStandardMaterial({color:0xcdcdcd,roughness:.55,shadowSide:T3.FrontSide});
const MATS=new Map();
// Standard 是旧的内置渲染管线着色器：在 URP 项目里会变成粉红色，和真 Unity 一样
function matFor(o){const m=matOf(o);if(!m)return DEF_MAT;const sh=m.shader||'URP/Lit',key=m.id+'|'+sh;let mm=MATS.get(key);
  if(!mm){mm=sh==='Standard'?new T3.MeshBasicMaterial({color:0xff00ff}):sh==='URP/Unlit'?new T3.MeshBasicMaterial({}):new T3.MeshStandardMaterial({roughness:.5});mm.shadowSide=T3.FrontSide;MATS.set(key,mm);}
  if(sh!=='Standard')mm.color.set(m.color);return mm;}
// Unity 坐标 → Three.js 坐标：两边各乘一个 Z 翻转矩阵（行列式不变，所以正反面不会反）
const FLIP=new T3.Matrix4().makeScale(1,1,-1);
function uMat(o){const R=eulerM(o.rot),s=effScale(o);const m=new T3.Matrix4().set(
  R[0][0]*s[0],R[1][0]*s[1],R[2][0]*s[2],o.pos[0], R[0][1]*s[0],R[1][1]*s[1],R[2][1]*s[2],o.pos[1], R[0][2]*s[0],R[1][2]*s[1],R[2][2]*s[2],o.pos[2], 0,0,0,1);
  const p=par(o);return p?uMat(p).multiply(m):m;}
const tMat=m=>FLIP.clone().multiply(m).multiply(FLIP);
const M3=new Map(),OUT=new Map();
const OUT_MAT=new T3.MeshBasicMaterial({color:0xff9a1f,side:T3.BackSide}),OUT_LINE=new T3.LineBasicMaterial({color:0xff9a1f});
EDGES.box=new T3.EdgesGeometry(GEO.cube);
// 素材库模型：每个零件一个 Mesh，放在一个 Group 里
const PGEO={box:new T3.BoxGeometry(1,1,1),cyl:new T3.CylinderGeometry(.5,.5,1,12),cone:new T3.ConeGeometry(.5,1,10),sphere:new T3.SphereGeometry(.5,14,10),ico:new T3.IcosahedronGeometry(.5,0)};
const PMATS=new Map();
function pmat(c,e){const k=c+'|'+(e||'');let m=PMATS.get(k);if(!m){m=new T3.MeshStandardMaterial({color:c,roughness:.8,flatShading:true,shadowSide:T3.FrontSide});if(e){m.emissive.set(e);m.emissiveIntensity=1.6;}PMATS.set(k,m);}return m;}
function partMat(q){const R=eulerM(q.r||[0,0,0]),s=q.s;return new T3.Matrix4().set(R[0][0]*s[0],R[1][0]*s[1],R[2][0]*s[2],q.p[0],R[0][1]*s[0],R[1][1]*s[1],R[2][1]*s[2],q.p[1],R[0][2]*s[0],R[1][2]*s[1],R[2][2]*s[2],q.p[2],0,0,0,1);}
function buildModel(o){const pd=PROPS()[o.model],g=new T3.Group();g.matrixAutoUpdate=false;g.userData={id:o.id,type:'model',model:o.model};if(!pd)return g;
  for(const q of pd.parts){const mesh=new T3.Mesh(PGEO[q.g],pmat(q.c,q.e));mesh.matrixAutoUpdate=false;mesh.matrix.copy(tMat(partMat(q)));
    mesh.castShadow=mesh.receiveShadow=true;mesh.userData={id:o.id,main:!!q.main,c:q.c,e:q.e};g.add(mesh);}return g;}
function sync3(selSet){const seen=new Set();
  for(const o of S.objs){if(!isRender(o)||!isActive(o))continue;let m=M3.get(o.id);
    const stale=!m||m.userData.type!==o.type||(isModel(o)&&m.userData.model!==o.model);
    if(stale){if(m)scene3.remove(m);
      if(isModel(o))m=buildModel(o);else{m=new T3.Mesh(GEO[o.type],DEF_MAT);m.matrixAutoUpdate=false;m.receiveShadow=true;m.userData={id:o.id,type:o.type};}
      scene3.add(m);M3.set(o.id,m);}
    if(isModel(o))m.children.forEach(c=>{c.material=c.userData.main&&o.mat?matFor(o):pmat(c.userData.c,c.userData.e);});
    else{m.castShadow=o.type!=='plane';m.material=matFor(o);}
    m.matrix.copy(tMat(uMat(o)));m.matrixWorldNeedsUpdate=true;seen.add(o.id);}
  for(const [id,m] of M3)if(!seen.has(id)){scene3.remove(m);M3.delete(id);}
  // 选中物体的橙色轮廓：立体形状用放大一点的背面，平面用边线，模型用包围盒
  for(const [id,m] of OUT)if(!selSet.has(id)||!M3.has(id)){scene3.remove(m);OUT.delete(id);}
  for(const id of selSet){const base=M3.get(id);if(!base)continue;const ty=base.userData.type,line=ty==='plane'||ty==='quad'||ty==='model';let m=OUT.get(id);
    if(!m||m.userData.type!==ty){if(m)scene3.remove(m);m=line?new T3.LineSegments(EDGES[ty==='model'?'box':ty],OUT_LINE):new T3.Mesh(GEO[ty],OUT_MAT);m.matrixAutoUpdate=false;m.userData.type=ty;scene3.add(m);OUT.set(id,m);}
    if(ty==='model'){const o=obj(id),b=colBounds({type:'model',model:o.model,col:{kind:'box'}});
      m.matrix.copy(tMat(uMat(o).multiply(new T3.Matrix4().makeTranslation((b[0][0]+b[1][0])/2,(b[0][1]+b[1][1])/2,(b[0][2]+b[1][2])/2)).multiply(new T3.Matrix4().makeScale(b[1][0]-b[0][0]+.04,b[1][1]-b[0][1]+.04,b[1][2]-b[0][2]+.04))));}
    else{m.matrix.copy(base.matrix);if(!line)m.matrix.multiply(new T3.Matrix4().makeScale(1.045,1.045,1.045));}
    m.matrixWorldNeedsUpdate=true;}
}
// 灯光：第一个方向光当太阳（越低越暗，落到地平线下面就是晚上）；点光源、聚光灯各对应一个 Three.js 灯。
// 场景视图可以关掉「场景灯光」，用固定的明亮灯光编辑（真 Unity 场景视图工具栏的灯泡按钮）。
let sceneLit=true;const L3=new Map(),POINT_K=12,SPOT_K=45,BLACK=new T3.Color(0);
const fogExp=new T3.FogExp2(0x808080,.01),fogLin=new T3.Fog(0x808080,0,300);
function applyLighting(game){const env=S.env,lit=game||sceneLit;
  const dl=S.objs.find(o=>o.type==='light'&&(!o.light||o.light.kind==='directional')&&isActive(o)&&(!o.light||o.light.enabled!==false));let elev=.77;
  const dir=lit?(dl?mMV(wRot(dl),[0,0,1]):null):mMV(eulerM([50,-30,0]),[0,0,1]);
  sun.visible=!!dir;
  if(dir){sun.target.position.set(0,0,0);sun.position.set(-dir[0]*40,-dir[1]*40,dir[2]*40);sun.target.updateMatrixWorld();if(lit)elev=-dir[1];
    const day=clamp(elev*3,0,1),c=new T3.Color(lit&&dl&&dl.light?dl.light.color:'#fff4e5');sun.intensity=2.4*day*(lit&&dl&&dl.light?dl.light.intensity:1);sun.color.setRGB(c.r,c.g*(.82+.18*day),c.b*(.7+.3*day));}
  if(lit&&env.src==='color'){amb.color.set(env.amb);amb.groundColor.set(env.amb);amb.intensity=1.6;}
  else{amb.color.set(0xcfdcff);amb.groundColor.set(0x4f4840);amb.intensity=(.25+.95*clamp(elev*2+.3,0,1))*(lit?env.mul:1);}
  if(lit&&env.fog){if(env.fogMode==='linear'){fogLin.color.set(env.fogColor);fogLin.near=env.start;fogLin.far=Math.max(env.start+.01,env.end);scene3.fog=fogLin;}
    else{fogExp.color.set(env.fogColor);fogExp.density=env.fogMode==='exp'?env.density*.75:env.density;scene3.fog=fogExp;}}else scene3.fog=null;
  setSky(elev);syncLights(lit);
  scene3.background=game?(env.skybox?BG.game:BLACK):BG.scene;}
function syncLights(lit){const seen=new Set();
  for(const o of S.objs){if(o.type!=='light'||!o.light||o.light.kind==='directional')continue;const k=o.light.kind;let l=L3.get(o.id);
    if(!l||l.userData.kind!==k){if(l){scene3.remove(l);if(l.target)scene3.remove(l.target);}
      l=k==='spot'?new T3.SpotLight():new T3.PointLight();l.userData.kind=k;l.decay=2;
      if(k==='spot'){l.castShadow=true;l.shadow.mapSize.set(1024,1024);l.shadow.bias=-.0004;l.shadow.normalBias=.03;l.shadow.camera.near=.1;l.penumbra=.35;scene3.add(l.target);}
      scene3.add(l);L3.set(o.id,l);}
    const p=wPos(o);l.position.set(p[0],p[1],-p[2]);l.color.set(o.light.color);l.distance=Math.max(.01,o.light.range);
    l.intensity=lit&&isActive(o)&&o.light.enabled!==false?Math.max(0,o.light.intensity)*(k==='spot'?SPOT_K:POINT_K):0;
    if(k==='spot'){const d=mMV(wRot(o),[0,0,1]);l.target.position.set(p[0]+d[0],p[1]+d[1],-(p[2]+d[2]));l.target.updateMatrixWorld();l.angle=clamp(o.light.angle,1,179)/2*Math.PI/180;}
    seen.add(o.id);}
  for(const [id,l] of L3)if(!seen.has(id)){scene3.remove(l);if(l.target)scene3.remove(l.target);L3.delete(id);}}
// 后期处理（Global Volume）：泛光（Bloom）→ 色调映射 → 暗角、颗粒、色彩调整。摄像机要勾选「后期处理」才会生效。
const GRADE={uniforms:{tDiffuse:{value:null},vig:{value:0},grain:{value:0},expo:{value:0},contrast:{value:0},sat:{value:0},time:{value:0},aspect:{value:1.7}},
  vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
  fragmentShader:`uniform sampler2D tDiffuse;uniform float vig,grain,expo,contrast,sat,time,aspect;varying vec2 vUv;
float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
void main(){vec4 c=texture2D(tDiffuse,vUv);vec3 col=c.rgb*exp2(expo);col=(col-0.5)*(1.0+contrast/100.0)+0.5;
float l=dot(col,vec3(0.2126,0.7152,0.0722));col=mix(vec3(l),col,1.0+sat/100.0);
vec2 d=(vUv-0.5)*vec2(aspect,1.0);col*=1.0-smoothstep(0.2,1.05,length(d))*vig*1.25;
col+=(h(vUv*vec2(1733.0,977.0)+time)-0.5)*grain*0.22*(1.0-l*0.6);gl_FragColor=vec4(max(col,0.0),c.a);}`};
let composer=null,bloomP=null,gradeP=null;
function postFor(game){if(!game)return null;const c=S.objs.find(o=>o.type==='camera');if(!c||!c.cam||!c.cam.post)return null;
  const v=S.objs.find(o=>o.vol&&o.vol.profile);return v&&Object.keys(v.vol.ov).length?v.vol.ov:null;}
function renderPost(ov){if(!composer){composer=new T3.EffectComposer(R3);composer.addPass(new T3.RenderPass(scene3,cam3));bloomP=new T3.UnrealBloomPass(new T3.Vector2(256,256),0,.4,.9);composer.addPass(bloomP);
    composer.addPass(new T3.OutputPass());gradeP=new T3.ShaderPass(GRADE);composer.addPass(gradeP);}
  composer.setPixelRatio(DPR);composer.setSize(CW,CH);const U=gradeP.uniforms,g=k=>ov[k]||{};
  bloomP.enabled=!!ov.bloom&&g('bloom').intensity>0;bloomP.strength=(g('bloom').intensity||0)*.6;bloomP.threshold=g('bloom').threshold==null?.9:g('bloom').threshold;
  U.vig.value=g('vignette').intensity||0;U.grain.value=g('grain').intensity||0;U.expo.value=g('color').postExposure||0;U.contrast.value=g('color').contrast||0;U.sat.value=g('color').saturation||0;
  U.time.value=(performance.now()%10000)/10000*91.7;U.aspect.value=CW/CH;composer.render();}
let skyKey=null;
const lerpC=(a,b,k)=>'#'+hex2rgb(a).map((v,i)=>Math.round(v+(hex2rgb(b)[i]-v)*k).toString(16).padStart(2,'0')).join('');
function setSky(e){const k=Math.round(e*50);if(k===skyKey)return;skyKey=k;let top,bot;
  if(e>.25){top='#78b0e6';bot='#d8eaf8';}else if(e>0){top=lerpC('#3b4a7a','#78b0e6',e/.25);bot=lerpC('#f0a060','#d8eaf8',e/.25);}
  else{const f=clamp(-e/.25,0,1);top=lerpC('#3b4a7a','#070b18',f);bot=lerpC('#f0a060','#1b2340',f);}
  const old=BG.game;BG.game=gradTex(top,bot);if(old)old.dispose();}
// 前后对比：左边用灰盒材质再画一次
const cmp={on:false,x:.5};const GREYM=new T3.MeshStandardMaterial({color:0x9a9a9a,roughness:1,shadowSide:T3.FrontSide});
function setGrey(on){for(const m of M3.values())m.traverse(n=>{if(!n.isMesh)return;if(on){n.userData._m=n.material;n.material=GREYM;}else if(n.userData._m){n.material=n.userData._m;delete n.userData._m;}});}
// NavMesh 蓝色区域（只在场景视图显示）
let navMesh3=null,navKey='';
function syncNav(){const nv=NAV(),k=nv?nv.x0+','+nv.z0+','+nv.nx+','+nv.nz+','+nv.y+nv.w:'';if(k===navKey)return;navKey=k;
  if(navMesh3){scene3.remove(navMesh3);navMesh3.geometry.dispose();navMesh3=null;}if(!nv)return;
  const pos=[];const y=nv.y+.02;for(let j=0;j<nv.nz;j++)for(let i=0;i<nv.nx;i++){if(nv.w[j*nv.nx+i]!=='1')continue;
    const a=nv.x0+i*nv.cs+.03,b=a+nv.cs-.06,c=-(nv.z0+j*nv.cs+.03),d=c-(nv.cs-.06);pos.push(a,y,c,b,y,c,b,y,d,a,y,c,b,y,d,a,y,d);}
  const g=new T3.BufferGeometry();g.setAttribute('position',new T3.Float32BufferAttribute(pos,3));
  navMesh3=new T3.Mesh(g,new T3.MeshBasicMaterial({color:0x3f8cff,transparent:true,opacity:.32,depthWrite:false,side:T3.DoubleSide}));scene3.add(navMesh3);}
function activeCam(){if(S.tab==='game'){const c=S.objs.find(o=>o.type==='camera');return c?{pos:wPos(c),M:wRot(c),fov:60}:null;}
  const M=eulerM([V.pitch,V.yaw,0]);return {pos:sub(V.target,mul(M[2],V.dist)),M,fov:60};}
function resize(){const r=$('#cwrap').getBoundingClientRect();DPR=window.devicePixelRatio||1;CW=Math.max(50,r.width);CH=Math.max(50,r.height);
  R3.setPixelRatio(DPR);R3.setSize(CW,CH,false);gz.width=CW*DPR;gz.height=CH*DPR;if(composer){composer.setPixelRatio(DPR);composer.setSize(CW,CH);}}
function segDist(px,py,a,b){const dx=b[0]-a[0],dy=b[1]-a[1];const l=dx*dx+dy*dy||1;const tt=clamp(((px-a[0])*dx+(py-a[1])*dy)/l,0,1);return Math.hypot(px-(a[0]+tt*dx),py-(a[1]+tt*dy));}
const RC=new T3.Raycaster();
// 从某个世界点朝某个方向射一条线，返回先打中的物体（模拟 Physics.Raycast：只打有碰撞体的物体）
function raycastW(from,dir,skip){RC.set(new T3.Vector3(from[0],from[1],-from[2]),new T3.Vector3(dir[0],dir[1],-dir[2]).normalize());RC.far=100;
  const list=[...M3.values()].filter(m=>{const o=obj(m.userData.id);return o&&o.col&&!skip.has(o.id);});
  const h=RC.intersectObjects(list,true)[0];return h?{o:obj(h.object.userData.id),d:h.distance,p:[h.point.x,h.point.y,-h.point.z]}:null;}
function draw(){
  const game=S.tab==='game',selSet=new Set(game?[]:selIds());const cam=activeCam();icons=[];handles=[];
  gctx.setTransform(DPR,0,0,DPR,0,0);gctx.clearRect(0,0,CW,CH);
  if(!cam){R3.setClearColor(0x000000,1);R3.clear();gctx.fillStyle='#fff';gctx.font='14px sans-serif';gctx.textAlign='center';gctx.fillText('No cameras rendering',CW/2,CH/2);LV=null;return;}
  sync3(selSet);syncNav();if(navMesh3)navMesh3.visible=!game;grid.visible=!game;applyLighting(game);
  const Mc=cam.M,p=cam.pos;cam3.matrixWorld.copy(tMat(new T3.Matrix4().set(Mc[0][0],Mc[1][0],Mc[2][0],p[0],Mc[0][1],Mc[1][1],Mc[2][1],p[1],Mc[0][2],Mc[1][2],Mc[2][2],p[2],0,0,0,1)));
  cam3.matrixWorldInverse.copy(cam3.matrixWorld).invert();cam3.fov=cam.fov;cam3.aspect=CW/CH;cam3.updateProjectionMatrix();
  const ov=postFor(game);if(ov)renderPost(ov);else R3.render(scene3,cam3);renderUI(game);
  if(cmp.on){setGrey(true);R3.setScissorTest(true);R3.setScissor(0,0,CW*cmp.x,CH);R3.render(scene3,cam3);R3.setScissorTest(false);setGrey(false);}
  const f=(CH/2)/Math.tan(cam.fov*Math.PI/360);LV={cam,f};
  const toV=q=>mTV(cam.M,sub(q,cam.pos)),pr=v=>[CW/2+v[0]/v[2]*f,CH/2-v[1]/v[2]*f];
  const line=(a,b)=>{const c=clipNear([toV(a),toV(b)],.05);if(c.length<2)return;const A=pr(c[0]),B=pr(c[1]);gctx.moveTo(A[0],A[1]);gctx.lineTo(B[0],B[1]);};
  // 第一人称时：射线（从摄像机正前方射出，显示打中了什么）
  rayInfo=null;
  if(S.playing){const fp=fpsActive();if(fp){const c=subtree(fp).slice(1).find(q=>q.type==='camera');if(c){const from=wPos(c),dir=mMV(wRot(c),[0,0,1]);const h=raycastW(from,dir,new Set(subtree(fp).map(q=>q.id)));rayInfo={from,dir,h};}}}
  if(game){if(rayInfo){gctx.strokeStyle='rgba(255,255,255,.85)';gctx.lineWidth=1.5;gctx.beginPath();gctx.moveTo(CW/2-7,CH/2);gctx.lineTo(CW/2+7,CH/2);gctx.moveTo(CW/2,CH/2-7);gctx.lineTo(CW/2,CH/2+7);gctx.stroke();
      const txt=rayInfo.h?t('rayHit',rayInfo.h.o.name,rayInfo.h.d.toFixed(1)):t('rayNone');gctx.font='12px '+getComputedStyle(document.body).fontFamily;const w=gctx.measureText(txt).width+16;
      gctx.fillStyle='rgba(10,12,16,.7)';gctx.fillRect(CW/2-w/2,CH-40,w,22);gctx.fillStyle='#fff';gctx.textAlign='center';gctx.fillText(txt,CW/2,CH-25);
      if(document.pointerLockElement!==cv){gctx.fillStyle='rgba(10,12,16,.7)';const t2=t('clickToLook'),w2=gctx.measureText(t2).width+16;gctx.fillRect(CW/2-w2/2,52,w2,22);gctx.fillStyle="#fff";gctx.fillText(t2,CW/2,67);}}
    if(S.playing&&S.frozen){gctx.font='14px '+getComputedStyle(document.body).fontFamily;gctx.textAlign='center';const t3=t('frozenTip'),w3=gctx.measureText(t3).width+24;
      gctx.fillStyle='rgba(10,12,16,.8)';gctx.fillRect(CW/2-w3/2,CH-74,w3,28);gctx.fillStyle='#fff';gctx.fillText(t3,CW/2,CH-55);}
    drawSounds();drawCompare();return;}
  // 场景视图：射线（红线）、导航路径、碰撞体线框（绿）、摄像机和灯的图标、移动箭头
  if(rayInfo){gctx.strokeStyle='#ff5050';gctx.lineWidth=2;gctx.beginPath();line(rayInfo.from,add(rayInfo.from,mul(rayInfo.dir,rayInfo.h?rayInfo.h.d:30)));gctx.stroke();
    if(rayInfo.h){const v=toV(rayInfo.h.p);if(v[2]>.1){const q=pr(v);gctx.fillStyle='#ff5050';gctx.beginPath();gctx.arc(q[0],q[1],5,0,7);gctx.fill();}}}
  if(S.playing){gctx.strokeStyle='#4f8cff';gctx.lineWidth=2;const nv=NAV();for(const [id,st] of agentState){if(typeof id!=='number'||!st.path||!nv)continue;const o=obj(id);if(!o)continue;gctx.beginPath();let prev=o.pos;
    for(const [i,j] of st.path){const q=[nv.x0+(i+.5)*nv.cs,nv.y+.05,nv.z0+(j+.5)*nv.cs];line(prev,q);prev=q;}gctx.stroke();}}
  const wire=(o,b,hot)=>{const P8=[];for(let i=0;i<8;i++)P8.push(wPoint(o,[b[i&1][0],b[i>>1&1][1],b[i>>2&1][2]]));
    gctx.strokeStyle=hot?'#d6ff6b':'rgba(130,255,140,.9)';gctx.lineWidth=hot?2.5:1.3;gctx.beginPath();
    [[0,1],[2,3],[4,5],[6,7],[0,2],[1,3],[4,6],[5,7],[0,4],[1,5],[2,6],[3,7]].forEach(([a,c])=>line(P8[a],P8[c]));gctx.stroke();};
  const ring=(o,cy,r,axis,hot)=>{gctx.strokeStyle=hot?'#d6ff6b':'rgba(130,255,140,.9)';gctx.lineWidth=hot?2.5:1.3;gctx.beginPath();let prev=null;
    for(let k=0;k<=32;k++){const a=k/32*Math.PI*2,c=Math.cos(a)*r,s=Math.sin(a)*r;const lp=axis==='y'?[c,cy,s]:axis==='x'?[0,cy+c,s]:[c,cy+s,0];const q=wPoint(o,lp);if(prev)line(prev,q);prev=q;}gctx.stroke();};
  const trigHot=new Set([...trigIn].map(k=>+k.split(':')[0]));
  for(const o of S.objs){const show=selSet.has(o.id)||(S.playing&&o.col&&o.col.trigger&&isActive(o));if(!show)continue;
    if(o.col){const k=o.col.kind,hot=trigHot.has(o.id);
      if(k==='box'||k==='mesh'){const b=colBounds(o);if(b)wire(o,b,hot);}
      else if(k==='sphere'){ring(o,0,.5,'y',hot);ring(o,0,.5,'x',hot);ring(o,0,.5,'z',hot);}
      else{ring(o,.5,.5,'y',hot);ring(o,-.5,.5,'y',hot);ring(o,0,.5,'x',hot);ring(o,0,.5,'z',hot);wire(o,[[-.5,-.5,-.5],[.5,.5,.5]],hot);}}
    if(o.cc&&selSet.has(o.id)){ring(o,1,.5,'y');ring(o,-1,.5,'y');ring(o,0,1,'x');}}
  // 选中的点光源 / 聚光灯 / 音频源：画出范围
  for(const id of selSet){const o=obj(id);if(!o)continue;const wp=wPos(o);
    const circ=(r,axis,col,dash)=>{gctx.strokeStyle=col;gctx.lineWidth=1.3;gctx.setLineDash(dash||[]);gctx.beginPath();let prev=null;
      for(let k=0;k<=48;k++){const a=k/48*Math.PI*2,c=Math.cos(a)*r,s2=Math.sin(a)*r;const q=add(wp,axis==='y'?[c,0,s2]:axis==='x'?[0,c,s2]:[c,s2,0]);if(prev)line(prev,q);prev=q;}gctx.stroke();gctx.setLineDash([]);};
    if(o.light&&o.light.kind==='point'){['x','y','z'].forEach(ax=>circ(o.light.range,ax,'rgba(255,226,120,.75)'));}
    if(o.light&&o.light.kind==='spot'){const R=wRot(o),rg=o.light.range,ha=clamp(o.light.angle,1,179)/2*Math.PI/180,rr=Math.tan(ha)*rg,end=add(wp,mul(mMV(R,[0,0,1]),rg));
      gctx.strokeStyle='rgba(255,226,120,.8)';gctx.lineWidth=1.3;gctx.beginPath();let prev=null;
      for(let k=0;k<=40;k++){const a=k/40*Math.PI*2,q=add(end,mMV(R,[Math.cos(a)*rr,Math.sin(a)*rr,0]));if(prev)line(prev,q);prev=q;if(k%10===0)line(wp,q);}gctx.stroke();}
    if(o.audio){const b=o.audio.blend||0;if(b>0){circ(Math.min(o.audio.maxDist||500,60),'y','rgba(127,209,255,.8)',[6,4]);circ(Math.max(.05,o.audio.minDist||1),'y','rgba(127,209,255,.8)');}}}
  // 教练给的蓝图：要放墙的位置（蓝色虚线框），放好了变绿
  for(const g of lessonGhosts()){const b=[g.min,g.max],P8=[];for(let i=0;i<8;i++)P8.push([b[i&1][0],b[i>>1&1][1],b[i>>2&1][2]]);
    gctx.strokeStyle=g.done?'rgba(110,230,140,.85)':'rgba(90,170,255,.95)';gctx.lineWidth=g.done?1.4:2;gctx.setLineDash(g.done?[]:[7,5]);gctx.beginPath();
    [[0,1],[2,3],[4,5],[6,7],[0,2],[1,3],[4,6],[5,7],[0,4],[1,5],[2,6],[3,7]].forEach(([a,c])=>line(P8[a],P8[c]));gctx.stroke();gctx.setLineDash([]);
    if(!g.done&&g.label){const v=toV(mul(add(g.min,g.max),.5));if(v[2]>.2){const q=pr(v);gctx.font='12px '+getComputedStyle(document.body).fontFamily;gctx.textAlign='center';
      const w=gctx.measureText(g.label).width+12;gctx.fillStyle='rgba(20,60,120,.85)';gctx.fillRect(q[0]-w/2,q[1]-11,w,18);gctx.fillStyle='#fff';gctx.fillText(g.label,q[0],q[1]+2);}}}
  // 摆放检查标出来的空角落
  for(const mk of layMarks){const v=toV(mk.p);if(v[2]<.1)continue;const q=pr(v);gctx.strokeStyle='#f2c230';gctx.lineWidth=2.5;gctx.beginPath();gctx.arc(q[0],q[1],Math.max(14,320/v[2]),0,7);gctx.stroke();
    gctx.font='12px '+getComputedStyle(document.body).fontFamily;gctx.textAlign='center';gctx.fillStyle='#f2c230';gctx.fillText(t('emptyHere'),q[0],q[1]+4);}
  const sel=selObj();
  for(const o of S.objs){
    if(o.type==='empty'&&o.audio){const wp=wPos(o),v=toV(wp);if(v[2]<.1)continue;const c=pr(v),isSel=selSet.has(o.id),age=performance.now()-((sounds.get(o.id)||{}).t||-1e9);
      const pulse=sounds.has(o.id)&&(sounds.get(o.id).loop||age<400)?1+.25*Math.sin(performance.now()/120):1;
      gctx.strokeStyle=gctx.fillStyle=isSel?'#ff9a1f':'#7fd1ff';gctx.lineWidth=1.6;gctx.beginPath();gctx.moveTo(c[0]-7,c[1]-3);gctx.lineTo(c[0]-3,c[1]-3);gctx.lineTo(c[0]+2,c[1]-7);gctx.lineTo(c[0]+2,c[1]+7);gctx.lineTo(c[0]-3,c[1]+3);gctx.lineTo(c[0]-7,c[1]+3);gctx.closePath();gctx.fill();
      gctx.beginPath();gctx.arc(c[0]+2,c[1],7*pulse,-.8,.8);gctx.stroke();icons.push({id:o.id,x:c[0],y:c[1],r:16});continue;}
    if(o.type!=='camera'&&o.type!=='light')continue;
    const wp=wPos(o),R=wRot(o),v=toV(wp);if(v[2]<.1)continue;const c=pr(v);const isSel=selSet.has(o.id);
    gctx.strokeStyle=isSel?'#ff9a1f':'rgba(235,240,248,.85)';gctx.lineWidth=isSel?2:1.2;
    if(o.type==='camera'){
      const cs=[[-.6,-.4],[.6,-.4],[.6,.4],[-.6,.4]].map(q=>toV(add(wp,mMV(R,[q[0],q[1],1.3]))));
      if(cs.every(q=>q[2]>.05)){const q2=cs.map(pr);gctx.beginPath();q2.forEach((q,i)=>i?gctx.lineTo(q[0],q[1]):gctx.moveTo(q[0],q[1]));gctx.closePath();
        q2.forEach(q=>{gctx.moveTo(c[0],c[1]);gctx.lineTo(q[0],q[1]);});gctx.stroke();}
      gctx.fillStyle=isSel?'#ff9a1f':'#cfd8e6';gctx.fillRect(c[0]-6,c[1]-4,12,8);
    }else{
      const kind=o.light?o.light.kind:'directional';
      if(kind!=='point'){const e=toV(add(wp,mul(mMV(R,[0,0,1]),2)));
        if(e[2]>.05){const q=pr(e);gctx.beginPath();gctx.moveTo(c[0],c[1]);gctx.lineTo(q[0],q[1]);gctx.stroke();}}
      gctx.fillStyle=o.light?o.light.color:'#ffd75e';gctx.beginPath();gctx.arc(c[0],c[1],6,0,7);gctx.fill();gctx.strokeStyle='rgba(0,0,0,.5)';gctx.lineWidth=1;gctx.stroke();
      if(kind==='point'){gctx.strokeStyle='rgba(255,215,94,.8)';gctx.beginPath();gctx.arc(c[0],c[1],10,0,7);gctx.stroke();}
    }
    icons.push({id:o.id,x:c[0],y:c[1],r:16});
  }
  if(sel&&!isUI(sel)&&sel.type!=='eventsystem'){
    const sp=wPos(sel),v=toV(sp);
    if(v[2]>.1){const c=pr(v);
      if(S.tool==='w'){const len=Math.max(.5,v[2]*.2);
        [[1,0,0,'#e5484d'],[0,1,0,'#3fbf6a'],[0,0,1,'#4f8cff']].forEach((a,ai)=>{
          const e=toV(add(sp,mul([a[0],a[1],a[2]],len)));if(e[2]<.05)return;const q=pr(e);
          gctx.strokeStyle=a[3];gctx.fillStyle=a[3];gctx.lineWidth=3;gctx.beginPath();gctx.moveTo(c[0],c[1]);gctx.lineTo(q[0],q[1]);gctx.stroke();
          gctx.beginPath();gctx.arc(q[0],q[1],6,0,7);gctx.fill();handles.push({axis:ai,a:c,b:q,len,dir:[a[0],a[1],a[2]]});});}
      else if(S.tool==='e'){gctx.strokeStyle='#4f8cff';gctx.lineWidth=2;gctx.beginPath();gctx.arc(c[0],c[1],38,0,7);gctx.stroke();}
      else if(S.tool==='r'){gctx.strokeStyle='#e5a13a';gctx.lineWidth=2;gctx.strokeRect(c[0]-24,c[1]-24,48,48);}
    }
  }
  drawCompare();
}
// 播放中的声音写在游戏画面左下角（听不到声音的时候也看得到）
function drawSounds(){if(!S.playing)return;const now=performance.now(),list=[...sounds.values()].filter(v=>v.loop?v.h&&v.h.playing():now-v.t<Math.max(350,v.len*700));if(!list.length)return;
  gctx.font='12px '+getComputedStyle(document.body).fontFamily;gctx.textAlign='left';
  list.slice(0,4).forEach((v,i)=>{const y=CH-30-i*24,txt='♪ '+v.name,w=gctx.measureText(txt).width+62;gctx.fillStyle='rgba(10,12,16,.7)';gctx.fillRect(10,y-15,w,20);
    gctx.fillStyle='#fff';gctx.fillText(txt,17,y);gctx.fillStyle='rgba(255,255,255,.25)';gctx.fillRect(w-40,y-8,32,5);gctx.fillStyle='#7fd1ff';gctx.fillRect(w-40,y-8,32*clamp(v.g,0,1),5);});}
function drawCompare(){if(!cmp.on)return;const x=CW*cmp.x;gctx.fillStyle='#f0b24a';gctx.fillRect(x-1,0,2,CH);
  gctx.font='12px '+getComputedStyle(document.body).fontFamily;const lab=(txt,px,al)=>{const w=gctx.measureText(txt).width+14;const bx=al==='r'?px-w-8:px+8;gctx.fillStyle='rgba(10,12,16,.72)';gctx.fillRect(bx,CH-30,w,20);gctx.fillStyle='#fff';gctx.textAlign='left';gctx.fillText(txt,bx+7,CH-16);};
  lab(t('beforeLbl'),x,'r');lab(t('afterLbl'),x,'l');}
let uiKey='';
function renderUI(game){const layer=$('#uilayer');const sel=new Set(selIds());
  const els=S.objs.filter(o=>isUI(o)&&o.ui&&par(o)&&par(o).type==='canvas'&&isActive(o));
  const key=JSON.stringify([CW,CH,game,els.map(o=>[o.id,o.type,o.ui,sel.has(o.id)])]);if(key===uiKey)return;uiKey=key;
  const sf=CW/1920;layer.className=game?'':'preview';
  layer.innerHTML=els.map(o=>{const u=o.ui,[ax,ay]=ANCH[u.anchor]||[.5,.5],w=u.w*sf,h=u.h*sf,cx=ax*CW+u.x*sf,cy=CH-(ay*CH+u.y*sf);
    const st=`left:${cx-w/2}px;top:${cy-h/2}px;width:${w}px;height:${h}px;`,sc=sel.has(o.id)?' sel':'';
    if(o.type==='uitext')return `<div class="uiel uitext${sc}" style="${st}color:${esc(u.color)};font-size:${u.size*sf}px">${esc(u.text)}</div>`;
    if(o.type==='uiimage')return `<div class="uiel${sc}" style="${st}background:${esc(u.color)}"></div>`;
    if(o.type==='uislider')return `<div class="uiel uislider${sc}" style="${st}background:${esc(u.color)}"><i style="width:${clamp(u.value,0,1)*100}%;background:${esc(u.fill)}"></i></div>`;
    return `<div class="uiel uibutton${sc}" style="${st}background:${esc(u.color)};color:${esc(u.tcolor)};font-size:${u.size*sf}px">${esc(u.text)}</div>`;}).join('');}
function fpsActive(){for(const o of S.objs)if(isActive(o))for(const s of o.scripts){const a=asset(s.asset);const tm=a&&LIB()[a.name];if(s.enabled&&tm&&tm.kind==='fps'&&a.comp&&a.comp.ok)return o;}return null;}
function rayAt(x,y){if(!LV)return null;const d=mMV(LV.cam.M,norm([(x-CW/2)/LV.f,-(y-CH/2)/LV.f,1]));return {o:LV.cam.pos,d};}
function axisParam(x,y,P0,A){const r=rayAt(x,y);if(!r)return null;const w0=sub(P0,r.o);const b=dot(A,r.d),d=dot(A,w0),e=dot(r.d,w0);const den=1-b*b;if(Math.abs(den)<1e-4)return null;return (b*e-d)/den;}
function pickAt(x,y){for(const ic of icons){if(Math.hypot(x-ic.x,y-ic.y)<ic.r)return ic.id;}
  if(!LV)return null;RC.setFromCamera(new T3.Vector2(x/CW*2-1,-(y/CH*2-1)),cam3);RC.far=Infinity;
  const h=RC.intersectObjects([...M3.values()],true)[0];return h?h.object.userData.id:null;}
function groundPt(x,y){const r=rayAt(x,y);if(!r||r.d[1]>=-.001)return null;const tt=-r.o[1]/r.d[1];return [r.o[0]+r.d[0]*tt,.5,r.o[2]+r.d[2]*tt];}
// 物体中心、W 工具箭头在屏幕上的位置（给教练的拖动演示用）
function objScreen(id){const o=obj(id);if(!o||!LV)return null;const v=mTV(LV.cam.M,sub(wPos(o),LV.cam.pos));if(v[2]<.1)return null;
  const r=cv.getBoundingClientRect();return {x:r.left+CW/2+v[0]/v[2]*LV.f,y:r.top+CH/2-v[1]/v[2]*LV.f};}
function handleAt(axis){const h=handles.find(x=>x.axis===axis);if(!h)return null;const r=cv.getBoundingClientRect();
  return {a:{x:r.left+h.a[0],y:r.top+h.a[1]},b:{x:r.left+h.b[0],y:r.top+h.b[1]}};}

/* ---------- 美化工具：摆放检查、快照、浮动窗口（素材库 / 快照对比）、调色盘 ---------- */
let layMarks=[];
function layoutCheck(){layMarks=[];
  const decor=S.objs.filter(o=>isRender(o)&&o.type!=='plane'&&o.name.trim().toLowerCase()!=='player');
  if(decor.length<3){log('info','lLayFew');toast(t('lLayFew'));commit();return;}
  const msgs=[],ps=decor.map(wPos),bb=decor.map(o=>wAABB(o,isModel(o)?colBounds(o):MESH_BOUNDS[o.type]));
  const ang=o=>{const a=((o.rot[1]%90)+90)%90;return Math.min(a,90-a);};
  const straight=decor.filter(o=>ang(o)<2);
  if(straight.length>=3&&straight.length/decor.length>=.7)msgs.push(['lLayGrid',straight.length]);
  const inLine=k=>ps.some(p=>ps.filter(q=>Math.abs(q[k]-p[k])<.15).length>=3);
  if(inLine(0)||inLine(2))msgs.push(['lLayLine']);
  const sizes=bb.map(b=>Math.max(b[1][0]-b[0][0],b[1][1]-b[0][1],b[1][2]-b[0][2]));
  if(Math.max(...sizes)/Math.max(.01,Math.min(...sizes))<1.6)msgs.push(['lLaySize']);
  // 空角落：把最大的地板分成 3×3，看四个角有没有东西
  const area=b=>(b[1][0]-b[0][0])*(b[1][2]-b[0][2]);
  const fl=S.objs.filter(o=>o.type==='plane').map(o=>wAABB(o,MESH_BOUNDS.plane)).sort((a,b)=>area(b)-area(a))[0];
  if(fl){const w=(fl[1][0]-fl[0][0])/3,d=(fl[1][2]-fl[0][2])/3;let empty=0;
    for(const [i,j] of [[0,0],[2,0],[0,2],[2,2]]){const x0=fl[0][0]+i*w,z0=fl[0][2]+j*d;
      if(!ps.some(p=>p[0]>=x0&&p[0]<=x0+w&&p[2]>=z0&&p[2]<=z0+d)){empty++;layMarks.push({p:[x0+w/2,fl[1][1]+.05,z0+d/2]});}}
    if(empty)msgs.push(['lLayEmpty',empty]);}
  if(!msgs.length){log('info','lLayOk');toast(t('lLayOk'));}else{msgs.forEach(m=>log('info',...m));toast(t('layoutDone',msgs.length));}
  commit();}
// 快照：把现在的画面缩小存起来（最多 8 张），在「快照对比」窗口并排看
let snaps=[];try{snaps=JSON.parse(localStorage.getItem('ztg.snaps')||'[]');}catch(e){snaps=[];}
let snapSeq=snaps.reduce((m,x)=>Math.max(m,x.n||0),0);
function saveSnaps(){for(let i=0;i<3;i++){try{localStorage.setItem('ztg.snaps',JSON.stringify(snaps));return;}catch(e){snaps.shift();}}}
function takeSnap(){draw();const w=480,h=Math.round(480*CH/CW),c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(cv,0,0,w,h);
  snaps.push({n:++snapSeq,img:c.toDataURL('image/jpeg',.82),t:now8()});if(snaps.length>8)snaps.shift();saveSnaps();toast(t('snapTaken',snapSeq));if(floatId==='snaps')openSnaps();}
let floatId=null;
function openFloat(id,title,html,bind,opt){if(floatId==='anim'&&id!=='anim')animPreviewEnd();floatId=id;const f=$('#float');f.classList.toggle('bottom',!!(opt&&opt.bottom));
  f.innerHTML=`<div class="win fwin${opt&&opt.wide?' wide':''}" role="dialog" aria-label="${esc(title)}"><div class="ph cph"><b>${esc(title)}</b><span class="sp"></span><button class="ibtn" id="fclose" aria-label="${t('close')}">✕</button></div><div class="fbody">${html}</div></div>`;
  // 事件绑在这一次画出来的窗口上（重画时旧窗口和它的事件一起丢掉，不会越积越多）
  f.classList.add('show');$('#fclose').onclick=closeFloat;if(bind)bind(f.firstElementChild);}
function closeFloat(){if(floatId==null)return;if(floatId==='anim')animPreviewEnd();floatId=null;const f=$('#float');f.classList.remove('show');f.innerHTML='';}
let thumbR=null;const thumbs={};
function propThumb(k){if(thumbs[k])return thumbs[k];
  if(!thumbR){thumbR=new T3.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});thumbR.setSize(120,100,false);thumbR.toneMapping=T3.ACESFilmicToneMapping;}
  const sc=new T3.Scene();sc.add(new T3.HemisphereLight(0xffffff,0x555555,2.2));const dl=new T3.DirectionalLight(0xffffff,2);dl.position.set(3,5,4);sc.add(dl);
  const g=buildModel({id:-1,model:k,mat:null});sc.add(g);const b=PROPS()[k].bounds;
  const size=Math.max(b[1][0]-b[0][0],b[1][1]-b[0][1],b[1][2]-b[0][2]),cy=(b[0][1]+b[1][1])/2;
  const cam=new T3.PerspectiveCamera(35,1.2,.05,100);cam.position.set(size*1.5,cy+size*.8,size*1.9);cam.lookAt(0,cy,0);
  thumbR.render(sc,cam);thumbs[k]=thumbR.domElement.toDataURL();return thumbs[k];}
function openLibrary(){const P=PROPS();
  const C=ZTG.audio?ZTG.audio.clips:{};
  openFloat('lib',t('library'),`<p class="fnote">${esc(t('libNote'))}</p><div class="libgrid">${Object.keys(P).map(k=>`<div class="libcard"><img src="${propThumb(k)}" alt="" width="120" height="100"><b>${esc(L(P[k]))}</b><button class="btn" data-imp="${k}">${t('importBtn')}</button></div>`).join('')}</div>
  <div class="subh">${t('soundsH')}</div><p class="fnote">${esc(t('soundsNote'))}</p><div class="libgrid">${Object.keys(C).map(k=>`<div class="libcard"><div class="sndic">${IC.audio(36)}</div><b>${esc(C[k].name)}</b><span class="fnote">${esc(L(C[k]))}</span><div class="gact"><button class="btn quiet" data-prev="${k}" aria-label="${t('previewBtn')}">▶</button><button class="btn" data-snd="${k}">${t('importBtn')}</button></div></div>`).join('')}</div>`,
    f=>f.addEventListener('click',e=>{const b=e.target.closest('[data-imp]');if(b)importProp(b.dataset.imp);const sn=e.target.closest('[data-snd]');if(sn)importSound(sn.dataset.snd);const pv=e.target.closest('[data-prev]');if(pv&&ZTG.audio)ZTG.audio.play(pv.dataset.prev,{volume:.9});}));}
function openSnaps(){
  openFloat('snaps',t('snapsT'),snaps.length?`<div class="snapgrid">${snaps.map((x,i)=>`<figure><img src="${x.img}" alt=""><figcaption>${esc(t('snapN',x.n))} · ${x.t}<span class="sp"></span><button class="ibtn rm" data-snapdel="${i}" aria-label="✕">✕</button></figcaption></figure>`).join('')}</div><div class="gact"><button class="btn quiet" data-snapclear>${t('clearAll')}</button></div>`:`<p class="fnote">${esc(t('snapsEmpty'))}</p>`,
    f=>f.addEventListener('click',e=>{const d=e.target.closest('[data-snapdel]');if(d){snaps.splice(+d.dataset.snapdel,1);saveSnaps();openSnaps();}else if(e.target.closest('[data-snapclear]')){snaps=[];saveSnaps();openSnaps();}}));}
function openPrefs(){const p=prefsGet(),ks=Object.keys(p);
  openFloat('prefs',t('prefsT'),ks.length?`<table class="ptable"><tr><th>${t('keyL')}</th><th>${t('valueCol')}</th></tr>${ks.map(k=>`<tr><td>${esc(k)}</td><td>${esc(String(p[k]))}</td></tr>`).join('')}</table>`:`<p class="fnote">${esc(t('prefsEmpty'))}</p>`);}
// 设置、快捷键说明、检查更新（更新信息由桌面 app 的主进程向 GitHub 查询，见 preload.js）
let appVersion='0.1.0';
function openSettings(){const z=SET.zoom||1;
  openFloat('settings',t('settingsT'),`<div class="setrow"><b>${t('langL')}</b><div class="seg"><button data-lang="zh" class="${ZTG.lang()==='zh'?'on':''}">中文</button><button data-lang="en" class="${ZTG.lang()==='en'?'on':''}">English</button></div></div>
  <div class="setrow"><b>${t('fontL')}</b><div class="seg">${[.9,1,1.15,1.3].map(v=>`<button data-zoom="${v}" class="${Math.abs(v-z)<.01?'on':''}">${t('font_'+Math.round(v*100))}</button>`).join('')}</div></div>
  <div class="setrow"><b>${t('soundL')}</b><div class="seg"><button data-snd="1" class="${soundOn?'on':''}">${t('on')}</button><button data-snd="0" class="${soundOn?'':'on'}">${t('off')}</button></div></div>
  <div class="setrow"><b>${t('hintsL')}</b><label class="ck"><input type="radio" name="hints" value="tiered"${SET.hints!=='always'?' checked':''}> ${t('hintsTiered')}</label><label class="ck"><input type="radio" name="hints" value="always"${SET.hints==='always'?' checked':''}> ${t('hintsAlways')}</label></div>
  <div class="setrow"><b>${t('updateL')}</b><div><button class="btn" data-upd>${t('checkUpdate')}</button></div><div class="fnote" id="updres"></div></div>
  <div class="setrow"><b>${t('aboutL')}</b><p class="fnote">${esc(t('aboutText',appVersion))}</p></div>`,
  f=>{f.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
      if(b.dataset.lang){if(b.dataset.lang!==ZTG.lang())toggleLang();}else if(b.dataset.zoom){setSetting('zoom',+b.dataset.zoom);openSettings();}
      else if(b.dataset.snd){soundOn=b.dataset.snd==='1';setSetting('sound',soundOn);if(ZTG.audio)ZTG.audio.setMuted(!soundOn);openSettings();}
      else if(b.hasAttribute('data-upd'))checkUpdates(true);else if(b.hasAttribute('data-open-rel')&&window.ztgApp)ztgApp.openRelease();});
    f.addEventListener('change',e=>{if(e.target.name==='hints'){setSetting('hints',e.target.value);hintT=performance.now();renderGuide();updateHint();}});});}
/* ---------- 动画窗口（Window → Animation → Animation）：录制关键帧 ---------- */
const animWin={obj:null,clip:null,time:0,rec:false,base:null,orig:null};let animBusy=false;
const trOf=o=>({pos:o.pos.slice(),rot:o.rot.slice(),scl:effScale(o).slice()});
function setKey(ks,tt,v){tt=Math.round(tt*100)/100;const i=ks.findIndex(k=>Math.abs(k[0]-tt)<.005);if(i>=0)ks[i][1]=v.map(rnd);else{ks.push([tt,v.map(rnd)]);ks.sort((x,y)=>x[0]-y[0]);}}
function animCtx(){const o=selObj()||(animWin.obj!=null?obj(animWin.obj):null);if(!o)return {};const c=o.anim?asset(o.anim.ctrl):null;
  const clips=c?c.states.map(x=>x.clip!=null?asset(x.clip):null).filter(Boolean):[];let clip=animWin.clip!=null?clips.find(x=>x.id===animWin.clip):null;if(!clip)clip=clips[0]||null;return {o,c,clip,clips};}
// 录制中：在检查器或场景里改了位置 / 旋转 / 缩放，就在播放头的时间点记一个关键帧（第一次还会在 0 秒记下原来的值）
function animRecordHook(){if(!animWin.rec||floatId!=='anim')return;const {o,clip}=animCtx();if(!o||!clip||o.id!==animWin.obj||!animWin.base)return;
  const now=trOf(o);for(const k of ['pos','rot','scl']){if(near(now[k],animWin.base[k],1e-4))continue;const ks=clip.curves[k]||(clip.curves[k]=[]);
    if(!ks.length&&animWin.time>0)setKey(ks,0,animWin.base[k]);setKey(ks,animWin.time,now[k]);S.flags.keyed=true;}animWin.base=now;}
function animPreview(){const {o,clip}=animCtx();if(!o||!clip)return;if(!animWin.orig||animWin.orig.id!==o.id)animWin.orig=Object.assign({id:o.id},trOf(o));applyClip(o,clip,animWin.time);animWin.base=trOf(o);}
function animPreviewEnd(){const o=animWin.orig?obj(animWin.orig.id):null;if(o){o.pos=animWin.orig.pos;o.rot=animWin.orig.rot;}animWin.orig=null;animWin.rec=false;}
function openAnimWin(refresh){if(refresh&&floatId!=='anim')return;const {o,c,clip,clips}=animCtx();
  if(o&&animWin.obj!==o.id){if(animWin.orig)animPreviewEnd();animWin.obj=o.id;animWin.time=0;animWin.rec=false;}
  if(clip)animWin.clip=clip.id;
  const span=Math.max(2,clip?Math.ceil(clipLen(clip)+.5):2),W=560,px=W/span;
  let html;
  if(!o)html=`<p class="fnote">${esc(t('awSelect'))}</p>`;
  else if(!clip)html=`<p>${t('awCreateIntro',esc(o.name))}</p><div class="awcreate"><input class="hexin" id="awname" value="New Animation" maxlength="40" aria-label="${t('animClip')}"><button class="btn primary" data-aw="create">${t('awCreate')}</button></div><p class="fnote">${esc(t('awCreateNote'))}</p>`;
  else{const rows=['pos','rot','scl'].filter(k=>clip.curves[k]);const cur=trOf(o);
    html=`<div class="awbar"><button class="btn awrec${animWin.rec?' on':''}" data-aw="rec" aria-pressed="${animWin.rec}">● ${t('awRecord')}</button>${clips.length>1?`<select class="schemesel" data-aw="clip">${clips.map(x=>`<option value="${x.id}"${x.id===clip.id?' selected':''}>${esc(x.name)}</option>`).join('')}</select>`:`<b>${esc(clip.name)}</b>`}
      <span class="sp"></span><label class="awt">${t('awTime')} <input class="hexin" data-aw="time" value="${fmt(animWin.time)}" aria-label="${t('awTime')}"> s</label><button class="btn quiet" data-aw="addprop" data-plus="1">${t('awAddProp')}</button></div>
    <div class="awgrid${animWin.rec?' rec':''}"><div class="awlab"><div class="awhead"></div>${rows.map(k=>`<div class="awrow">${esc(o.name)} : ${t('aw_'+k)} <span class="awv">(${cur[k].map(fmt).join(', ')})</span></div>`).join('')||`<div class="awrow fnote">${esc(t('awNoProp'))}</div>`}</div>
    <div class="awtl" style="width:${W}px"><div class="awhead" data-aw="ruler">${Array.from({length:span*2+1},(_,i)=>`<span style="left:${i*px/2}px">${i%2?'':i/2+'s'}</span>`).join('')}</div>
    ${rows.map(k=>`<div class="awrow">${clip.curves[k].map(kf=>`<i class="kf" data-aw="key" data-t="${kf[0]}" style="left:${kf[0]*px}px" title="${fmt(kf[0])} s"></i>`).join('')}</div>`).join('')}
    <div class="awhead2" data-aw="ruler2"></div><div class="awph" style="left:${animWin.time*px}px"></div></div></div>
    <p class="fnote">${esc(t(animWin.rec?'awRecNote':'awNote'))}</p>`;}
  openFloat('anim',t('animWinM'),html,f=>{
    f.addEventListener('click',e=>{const b=e.target.closest('[data-aw]');if(!b)return;const k=b.dataset.aw;
      if(k==='create'){const nm=($('#awname').value||'New Animation').trim().replace(/[\/\\]/g,'')||'New Animation';animCreate(o,nm);}
      else if(k==='rec'){animWin.rec=!animWin.rec;if(animWin.rec){animPreview();S.flags.recorded=true;}else S.flags.recStopped=true;openAnimWin(true);}
      else if(k==='key'){animWin.time=+b.dataset.t;animPreview();commit();}
      else if(k==='ruler'||k==='ruler2'){const r=b.getBoundingClientRect();animWin.time=Math.round(clamp((e.clientX-r.left)/px,0,span)*20)/20;animPreview();commit();}
      else if(k==='addprop'){const r=b.getBoundingClientRect();openMenu([{tk:'transform',k:'awtr',children:['pos','rot','scl'].map(pk=>({tk:'aw_'+pk,k:'aw_'+pk,dis:!!(clip&&clip.curves[pk]),fn:()=>{const v=trOf(o)[pk];clip.curves[pk]=[[0,v.slice()],[1,v.slice()]];commit();}}))}],r.left,r.bottom+2);}});
    f.addEventListener('change',e=>{const k=e.target.dataset.aw;if(k==='time'){const v=parseFloat(String(e.target.value).replace(',','.'));if(!isNaN(v)){animWin.time=clamp(v,0,60);animPreview();commit();}}
      else if(k==='clip'){animWin.clip=+e.target.value;openAnimWin(true);}});
    f.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.dataset.aw==='time')e.target.blur();if(e.key==='Enter'&&e.target.id==='awname')$('#float [data-aw="create"]').click();});},{bottom:true,wide:true});}
// 点「创建」：存一个新剪辑，Unity 会顺便建一个以物体命名的动画控制器，并给物体加上 Animator 组件
function animCreate(o,nm){const clip=mkAsset('anim',uniqueAssetName(nm,0),0,{loop:true,curves:{}});
  let c=o.anim?asset(o.anim.ctrl):null;if(!c){c=mkAsset('animctrl',uniqueAssetName(o.name,0),0,{states:[],def:null,params:[],trans:[]});o.anim={ctrl:c.id,seq:nid()};}
  const sid=nid();c.states.push({id:sid,name:clip.name,clip:clip.id,x:230+c.states.length*40,y:40+c.states.length*70});if(c.def==null)c.def=sid;
  animWin.clip=clip.id;animWin.time=0;log('info','lAnimCreated',clip.name,c.name);commit();}

/* ---------- Animator 窗口（Window → Animation → Animator）：状态、参数、过渡 ---------- */
const animrWin={ctrl:null,sel:null,link:null};
function animrCtrl(){const o=selObj();if(o&&o.anim){const c=asset(o.anim.ctrl);if(c){animrWin.ctrl=c.id;return c;}}const a=selAsset();if(a&&a.type==='animctrl'){animrWin.ctrl=a.id;return a;}
  const c=animrWin.ctrl!=null?asset(animrWin.ctrl):null;return c&&c.type==='animctrl'?c:null;}
const PTYPES=['float','int','bool','trigger'];
function openAnimator(refresh){if(refresh&&floatId!=='animator')return;const c=animrCtrl();let html;
  if(!c)html=`<p class="fnote">${esc(t('arNoCtrl'))}</p>`;
  else{const S_=animrWin.sel,selSt=S_&&S_.k==='st'?stOf(c,S_.id):null,selTr=S_&&S_.k==='tr'?c.trans.find(x=>x.id===S_.id):null;
    const ctr=st=>[st.x+70,st.y+18],EN=[60,18+150],entryXY=[20,150];
    const line=(a,b,cls,id,off)=>{const dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy)||1,nx=-dy/l*(off||0),ny=dx/l*(off||0),x1=a[0]+nx,y1=a[1]+ny,x2=b[0]+nx,y2=b[1]+ny,mx=(x1+x2)/2,my=(y1+y2)/2,ang=Math.atan2(dy,dx);
      return `<g class="${cls}"${id?` data-ar="tr" data-id="${id}"`:''}><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/><line class="hit" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/><path d="M${mx+8*Math.cos(ang)},${my+8*Math.sin(ang)} L${mx-6*Math.cos(ang)+5*Math.sin(ang)},${my-6*Math.sin(ang)-5*Math.cos(ang)} L${mx-6*Math.cos(ang)-5*Math.sin(ang)},${my-6*Math.sin(ang)+5*Math.cos(ang)}z"/></g>`;};
    const def=stOf(c,c.def);
    html=`<div class="animr"><div class="aparams"><div class="aph"><b>${t('arParams')}</b><span class="sp"></span><button class="btn small" data-ar="addparam" data-plus="1" aria-label="${t('arAddParam')}">+</button></div>
      ${c.params.map((p,i)=>`<div class="aprow"><input class="hexin" data-ar="pname" data-i="${i}" value="${esc(p.name)}" aria-label="${t('arParams')}"><span class="ptype">${t('p_'+p.type)}</span><button class="ibtn rm" data-ar="rmparam" data-i="${i}" aria-label="✕">✕</button></div>`).join('')||`<p class="fnote">${esc(t('arNoParam'))}</p>`}</div>
      <div class="agraph" data-ar="graph"><svg class="alines" width="100%" height="100%">${def?line([entryXY[0]+70,entryXY[1]+18],ctr(def),'entry'):''}
        ${c.trans.map(tr=>{const a=stOf(c,tr.from),b=stOf(c,tr.to);if(!a||!b)return '';const back=c.trans.some(x=>x.from===tr.to&&x.to===tr.from);return line(ctr(a),ctr(b),'tr'+(selTr===tr?' sel':''),tr.id,back?7:0);}).join('')}
        ${animrWin.link!=null&&stOf(c,animrWin.link)?`<line class="linking" x1="${ctr(stOf(c,animrWin.link))[0]}" y1="${ctr(stOf(c,animrWin.link))[1]}" x2="${ctr(stOf(c,animrWin.link))[0]}" y2="${ctr(stOf(c,animrWin.link))[1]}"/>`:''}</svg>
        <div class="anode entry" style="left:${entryXY[0]}px;top:${entryXY[1]}px">Entry</div>
        ${c.states.map(st=>`<div class="anode st${st.id===c.def?' def':''}${selSt===st?' sel':''}" data-ar="st" data-id="${st.id}" style="left:${st.x}px;top:${st.y}px">${esc(st.name)}</div>`).join('')}
        ${animrWin.link!=null?`<div class="alinkhint">${esc(t('arLinkHint'))}</div>`:''}</div></div>
      <div class="ainsp">${selSt?`<b>${t('arState')}</b><div class="vrow"><label>${t('arName')}</label><input class="hexin" data-ar="sname" value="${esc(selSt.name)}" aria-label="${t('arName')}"></div>
        <div class="vrow"><label>${t('arMotion')}</label><select class="schemesel" data-ar="smotion" aria-label="${t('arMotion')}"><option value="">${t('arNone')}</option>${S.assets.filter(x=>x.type==='anim').map(x=>`<option value="${x.id}"${x.id===selSt.clip?' selected':''}>${esc(x.name)}</option>`).join('')}</select></div>`
      :selTr?`<b>${esc((stOf(c,selTr.from)||{}).name)} → ${esc((stOf(c,selTr.to)||{}).name)}</b>${ck('arHasExit','',selTr.exit).replace('<input type="checkbox"','<input type="checkbox" data-ar="exit"')}
        <div class="subh">${t('arConds')}</div>${selTr.conds.map((cn,i)=>`<div class="aprow"><select class="schemesel" data-ar="cond" data-i="${i}" aria-label="${t('arConds')}">${c.params.map(p=>`<option${p.name===cn?' selected':''}>${esc(p.name)}</option>`).join('')}${c.params.some(p=>p.name===cn)?'':`<option selected>${esc(cn)}</option>`}</select><button class="ibtn rm" data-ar="rmcond" data-i="${i}" aria-label="✕">✕</button></div>`).join('')||`<p class="fnote">${esc(t('arNoCond'))}</p>`}
        <button class="btn small" data-ar="addcond"${c.params.length?'':' disabled'}>+ ${t('arAddCond')}</button>`
      :`<p class="fnote">${esc(t('arTip'))}</p>`}</div>`;}
  openFloat('animator',t('animatorWinM')+(c?' — '+c.name:''),html,f=>{if(!c)return;const g=$('.agraph',f);
    let drag=null;
    g.addEventListener('pointerdown',e=>{const n=e.target.closest('[data-ar="st"]');const tr=e.target.closest('[data-ar="tr"]');if(e.button!==0)return;
      if(n){const st=stOf(c,+n.dataset.id);if(animrWin.link!=null){if(st.id!==animrWin.link&&!c.trans.some(x=>x.from===animrWin.link&&x.to===st.id)){const tr2={id:nid(),from:animrWin.link,to:st.id,exit:true,conds:[]};c.trans.push(tr2);animrWin.sel={k:'tr',id:tr2.id};}animrWin.link=null;commit();return;}
        animrWin.sel={k:'st',id:st.id};drag={st,x:e.clientX,y:e.clientY,ox:st.x,oy:st.y,moved:false};try{n.setPointerCapture(e.pointerId);}catch(err){}animBusy=true;$$('.anode.sel',g).forEach(x=>x.classList.remove('sel'));n.classList.add('sel');return;}
      if(tr){animrWin.sel={k:'tr',id:+tr.dataset.id};animrWin.link=null;commit();return;}
      if(animrWin.link!=null){animrWin.link=null;openAnimator(true);return;}if(animrWin.sel){animrWin.sel=null;openAnimator(true);}});
    g.addEventListener('pointermove',e=>{if(animrWin.link!=null){const ln=$('.linking',g);if(ln){const r=g.getBoundingClientRect();ln.setAttribute('x2',e.clientX-r.left);ln.setAttribute('y2',e.clientY-r.top);}}
      if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.abs(dx)+Math.abs(dy)>3)drag.moved=true;drag.st.x=clamp(drag.ox+dx,0,520);drag.st.y=clamp(drag.oy+dy,0,230);const n=$(`.anode[data-id="${drag.st.id}"]`,g);if(n){n.style.left=drag.st.x+'px';n.style.top=drag.st.y+'px';}});
    g.addEventListener('pointerup',()=>{if(!drag)return;drag=null;animBusy=false;commit();});
    g.addEventListener('contextmenu',e=>{e.preventDefault();const n=e.target.closest('[data-ar="st"]');const r=g.getBoundingClientRect();
      if(n){const st=stOf(c,+n.dataset.id);animrWin.sel={k:'st',id:st.id};
        openMenu([{tk:'arMakeTrans',k:'maketrans',fn:()=>{animrWin.link=st.id;openAnimator(true);}},{tk:'arSetDefault',k:'setdefault',fn:()=>{c.def=st.id;commit();}},
          {tk:'del',k:'delstate',fn:()=>{c.states=c.states.filter(x=>x!==st);c.trans=c.trans.filter(x=>x.from!==st.id&&x.to!==st.id);if(c.def===st.id)c.def=c.states[0]?c.states[0].id:null;animrWin.sel=null;commit();}}],e.clientX,e.clientY);}
      else{const x=e.clientX-r.left,y=e.clientY-r.top;openMenu([{tk:'arCreateState',k:'createstate',children:[{tk:'arEmpty',k:'emptystate',fn:()=>{const st={id:nid(),name:uniqueState(c,'New State'),clip:null,x:clamp(x-70,0,520),y:clamp(y-18,0,230)};c.states.push(st);if(c.def==null)c.def=st.id;animrWin.sel={k:'st',id:st.id};commit();}}]}],e.clientX,e.clientY);}});
    f.addEventListener('click',e=>{const b=e.target.closest('[data-ar]');if(!b)return;const k=b.dataset.ar;
      if(k==='addparam'){const r=b.getBoundingClientRect();openMenu(PTYPES.map(pt=>({tk:'p_'+pt,k:'param_'+pt,fn:()=>{c.params.push({name:uniqueParam(c,'New '+{float:'Float',int:'Int',bool:'Bool',trigger:'Trigger'}[pt]),type:pt});commit();}})),r.left,r.bottom+2);}
      else if(k==='rmparam'){c.params.splice(+b.dataset.i,1);commit();}
      else if(k==='addcond'){const tr=c.trans.find(x=>animrWin.sel&&x.id===animrWin.sel.id);if(tr&&c.params.length){tr.conds.push(c.params[0].name);commit();}}
      else if(k==='rmcond'){const tr=c.trans.find(x=>animrWin.sel&&x.id===animrWin.sel.id);if(tr){tr.conds.splice(+b.dataset.i,1);commit();}}});
    f.addEventListener('change',e=>{const el=e.target,k=el.dataset.ar;if(!k)return;const tr=c.trans.find(x=>animrWin.sel&&animrWin.sel.k==='tr'&&x.id===animrWin.sel.id),st=animrWin.sel&&animrWin.sel.k==='st'?stOf(c,animrWin.sel.id):null;
      if(k==='pname'){const p=c.params[+el.dataset.i];const old=p.name,nv=el.value.trim()||old;c.trans.forEach(x=>{x.conds=x.conds.map(n=>n===old?nv:n);});p.name=nv;}
      else if(k==='exit'&&tr)tr.exit=el.checked;else if(k==='cond'&&tr)tr.conds[+el.dataset.i]=el.value;
      else if(k==='sname'&&st)st.name=el.value.trim()||st.name;else if(k==='smotion'&&st)st.clip=el.value?+el.value:null;commit();});
    f.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.tagName==='INPUT')e.target.blur();if(e.key==='Escape'&&animrWin.link!=null){animrWin.link=null;openAnimator(true);e.stopPropagation();}});},{bottom:true,wide:true});}
const uniqueState=(c,n)=>{let k=n,i=0;while(c.states.some(x=>x.name===k))k=n+' '+(++i);return k;};
const uniqueParam=(c,n)=>{let k=n,i=0;while(c.params.some(x=>x.name===k))k=n+' '+(++i);return k;};

// 灯光窗口（Window → Rendering → Lighting）：环境（天空盒、环境光）和雾
const ENVPAL=['#000000','#0b0c10','#1a1c22','#363636','#808080','#2a1a1a','#1a2433','#c9d6e8'];
function openLighting(){const e=S.env;
  const sel=(b,lab,opts,cur)=>`<select class="schemesel" data-env="${b}" aria-label="${esc(t(lab))}">${opts.map(([v,tk])=>`<option value="${v}"${v===cur?' selected':''}>${t(tk)}</option>`).join('')}</select>`;
  const colr=(b,lab,v)=>`<div><div class="slot"><span class="sw" style="background:${esc(v)}"></span><input class="hexin" data-env="${b}" value="${esc(v)}" maxlength="7" aria-label="${esc(t(lab))}"></div><div class="pal">${ENVPAL.map(c=>`<button data-envc="${b}" data-c="${c}" style="background:${c}" aria-label="${t('colorAria',c)}"></button>`).join('')}</div></div>`;
  const num=(b,lab,v)=>`<div class="vin" style="max-width:110px"><input inputmode="decimal" data-env="${b}" value="${fmt(v)}" aria-label="${esc(t(lab))}"></div>`;
  const row=(lab,html)=>`<div class="setrow"><b>${t(lab)}</b>${html}</div>`;
  openFloat('lighting',t('lightingT'),`<div class="subh">${t('envTab')}</div>
  ${row('skyboxMat',sel('skybox','skyboxMat',[['1','defaultSkybox'],['0','noneOpt']],e.skybox?'1':'0'))}
  ${row('envSource',sel('src','envSource',[['skybox','srcSkybox'],['color','srcColor']],e.src))}
  ${e.src==='color'?row('ambientColor',colr('amb','ambientColor',e.amb)):row('intensityMul',num('mul','intensityMul',e.mul))}
  <div class="subh">${t('otherSettings')}</div>
  <div class="setrow"><label class="ck"><input type="checkbox" data-env="fog"${e.fog?' checked':''}> <b${tip('fog')}>${t('fogL')}</b></label></div>
  ${e.fog?row('colorL',colr('fogColor','colorL',e.fogColor))+row('fogModeL',sel('fogMode','fogModeL',[['linear','fogLinear'],['exp','fogExp'],['exp2','fogExp2']],e.fogMode))+
    (e.fogMode==='linear'?row('fogStart',num('start','fogStart',e.start))+row('fogEnd',num('end','fogEnd',e.end)):row('densityL',num('density','densityL',e.density))):''}
  <p class="fnote">${esc(t('lightingNote'))}</p>`,
  f=>{f.addEventListener('change',ev=>{const k=ev.target.dataset.env;if(k)setEnv(k,ev.target.type==='checkbox'?ev.target.checked:ev.target.value);});
    f.addEventListener('keydown',ev=>{if(ev.key==='Enter'&&ev.target.dataset.env)ev.target.blur();});
    f.addEventListener('click',ev=>{const b=ev.target.closest('[data-envc]');if(b)setEnv(b.dataset.envc,b.dataset.c);});});}
function setEnv(k,v){const e=S.env;
  if(k==='skybox')e.skybox=v==='1';else if(k==='fog')e.fog=!!v;else if(k==='src'||k==='fogMode')e[k]=v;
  else if(k==='amb'||k==='fogColor'){if(/^#[0-9a-f]{6}$/i.test(v))e[k]=v.toLowerCase();}
  else{const n=parseFloat(String(v).replace(',','.'));if(!isNaN(n))e[k]=k==='mul'?clamp(n,0,8):Math.max(0,n);}
  commit();openLighting();}
function openShortcuts(){openFloat('shortcuts',t('shortcutsT'),`<table class="ptable sctable">${t('sc').map(([k,d])=>`<tr><td><kbd>${esc(k)}</kbd></td><td>${esc(d)}</td></tr>`).join('')}</table>`);}
async function checkUpdates(manual){const show=h=>{const el=$('#updres');if(el)el.innerHTML=h;};
  if(!window.ztgApp||!ztgApp.checkUpdate){if(manual)show(esc(t('updateNA')));return;}
  if(manual)show(esc(t('checking')));
  try{const r=await ztgApp.checkUpdate();if(r.error)throw new Error(r.error);
    if(!r.latest){if(manual)show(esc(t('noReleases')));return;}
    if(r.newer){const bn=$('#updbanner');bn.hidden=false;bn.textContent=t('newVersion',r.latest)+' · '+t('download');if(manual)show(`${esc(t('newVersion',r.latest))} <button class="btn" data-open-rel>${t('download')}</button>`);}
    else if(manual)show(esc(t('upToDate',r.current)));
  }catch(e){if(manual)show(esc(t('updateErr')));}}
$('#updbanner').addEventListener('click',()=>{if(window.ztgApp)ztgApp.openRelease();});
$('#setbtn').addEventListener('click',openSettings);$('#helpbtn').addEventListener('click',openShortcuts);
const FLOATS={anim:openAnimWin,animator:openAnimator,lighting:openLighting,lib:openLibrary,snaps:openSnaps,prefs:openPrefs,settings:openSettings,shortcuts:openShortcuts};

/* ---------- 导出到真 Unity：把脚本和一份「怎么做」清单打成 zip ---------- */
function crc32(b){let crc=-1;for(let i=0;i<b.length;i++){let c=(crc^b[i])&255;for(let k=0;k<8;k++)c=c&1?(c>>>1)^0xEDB88320:c>>>1;crc=(crc>>>8)^c;}return (crc^-1)>>>0;}
function makeZip(files){const enc=new TextEncoder(),parts=[],central=[];let off=0;
  for(const f of files){const name=enc.encode(f.name),data=enc.encode(f.data),crc=crc32(data);
    const h=new DataView(new ArrayBuffer(30));[[0,0x04034b50,4],[4,20,2],[6,0x0800,2],[12,0x21,2],[14,crc,4],[18,data.length,4],[22,data.length,4],[26,name.length,2]].forEach(([o,v,n])=>n===4?h.setUint32(o,v,true):h.setUint16(o,v,true));
    parts.push(new Uint8Array(h.buffer),name,data);
    const c=new DataView(new ArrayBuffer(46));[[0,0x02014b50,4],[4,20,2],[6,20,2],[8,0x0800,2],[14,0x21,2],[16,crc,4],[20,data.length,4],[24,data.length,4],[28,name.length,2],[42,off,4]].forEach(([o,v,n])=>n===4?c.setUint32(o,v,true):c.setUint16(o,v,true));
    central.push(new Uint8Array(c.buffer),name);off+=30+name.length+data.length;}
  const cs=central.reduce((n,a)=>n+a.length,0),e=new DataView(new ArrayBuffer(22));e.setUint32(0,0x06054b50,true);e.setUint16(8,files.length,true);e.setUint16(10,files.length,true);e.setUint32(12,cs,true);e.setUint32(16,off,true);
  return new Blob([...parts,...central,new Uint8Array(e.buffer)],{type:'application/zip'});}
const scriptText=a=>tmplOf(a).lines.map(l=>l.c.map(x=>typeof x==='string'?x:String((a.blanks||{})[x.b]||'/* TODO */')).join('')).join('\n')+'\n';
function exportGuide(l){const zh=l==='zh',v3=v=>`(${v.map(fmt).join(', ')})`,out=[CHAP.exportIntro[l]];
  const ms=S.assets.filter(a=>a.type==='material');
  if(ms.length){out.push(zh?'## 材质\n':'## Materials\n');ms.forEach(m=>out.push(`- ${zh?'项目窗口右键 → 创建 → 材质':'Project window right-click → Create → Material'}: **${m.name}**, Base Map \`${m.color}\`${(m.shader||'URP/Lit')!=='URP/Lit'?` (Shader: ${m.shader})`:''}`));out.push('');}
  const e=S.env,de=defEnv();
  if(JSON.stringify(e)!==JSON.stringify(de)){out.push(zh?'## 灯光窗口（Window → Rendering → Lighting → Environment）\n':'## Lighting window (Window → Rendering → Lighting → Environment)\n');
    if(!e.skybox)out.push('- Skybox Material: None');
    out.push(`- Environment Lighting Source: ${e.src==='color'?'Color, Ambient Color '+e.amb:'Skybox, Intensity Multiplier '+fmt(e.mul)}`);
    if(e.fog)out.push(`- Other Settings → Fog ✓, Color ${e.fogColor}, Mode ${{linear:'Linear',exp:'Exponential',exp2:'Exponential Squared'}[e.fogMode]}, ${e.fogMode==='linear'?`Start ${fmt(e.start)}, End ${fmt(e.end)}`:`Density ${fmt(e.density)}`}`);
    out.push('');}
  const ac=S.assets.filter(a=>a.type==='anim'||a.type==='animctrl');
  if(ac.length){out.push(zh?'## 动画（Window → Animation → Animation / Animator）\n':'## Animation (Window → Animation → Animation / Animator)\n');
    ac.filter(a=>a.type==='anim').forEach(a=>{out.push(`- ${zh?'动画剪辑':'Animation Clip'} **${a.name}**: Loop Time ${a.loop?'✓':'✗'}`);for(const k in a.curves)out.push(`  - ${ZTG.tl('en','aw_'+k)}: ${a.curves[k].map(kf=>`${fmt(kf[0])}s → ${v3(kf[1])}`).join(', ')}`);});
    ac.filter(a=>a.type==='animctrl').forEach(c=>{out.push(`- ${zh?'动画控制器':'Animator Controller'} **${c.name}**: ${zh?'状态':'states'} ${c.states.map(x=>x.name+(x.id===c.def?(zh?'（默认）':' (default)'):'')).join(', ')}; ${zh?'参数':'parameters'} ${c.params.map(p=>p.name+' ('+p.type+')').join(', ')||'—'}`);
      c.trans.forEach(tr=>out.push(`  - ${(stOf(c,tr.from)||{}).name} → ${(stOf(c,tr.to)||{}).name}: Has Exit Time ${tr.exit?'✓':'✗'}, ${zh?'条件':'conditions'} ${tr.conds.join(', ')||'—'}`));});
    out.push('');}
  const au=S.assets.filter(a=>a.type==='audio');
  if(au.length){out.push(zh?'## 声音\n':'## Sounds\n');au.forEach(a=>out.push(`- **${a.name}**: ${zh?'模拟器用代码合成的声音。真 Unity 里换成你自己的音频文件（例如免费的 CC0 音效），拖进项目窗口就行。':'made by the simulator in code. In real Unity, use your own audio file (for example a free CC0 sound) and drag it into the Project window.'}`));out.push('');}
  out.push(zh?'## 物体（按层级顺序）\n':'## Objects (in Hierarchy order)\n');
  const how=o=>{if(o.type==='camera'||o.type==='light'&&o.name===ZTG.tl(l,'nLight'))return zh?'新场景自带':'comes with a new scene';
    if(SHAPES.includes(o.type))return (zh?'层级右键 → 3D 对象 → ':'Hierarchy right-click → 3D Object → ')+ZTG.tl('en',o.type);
    if(o.type==='empty')return zh?'层级右键 → 创建空物体':'Hierarchy right-click → Create Empty';
    if(o.type==='light'){const k=o.light?o.light.kind:'directional',en={directional:'Directional Light',point:'Point Light',spot:'Spotlight'}[k];return (zh?'层级右键 → 灯光 → ':'Hierarchy right-click → Light → ')+en;}
    if(o.vol)return zh?'菜单 GameObject → Volume → Global Volume':'GameObject menu → Volume → Global Volume';
    if(isUI(o)||o.type==='eventsystem')return zh?'层级右键 → UI → '+o.type.replace('ui',''):'Hierarchy right-click → UI → '+o.type.replace('ui','');
    if(isModel(o))return zh?`素材库模型（${L(PROPS()[o.model]||{zh:'',en:''})}）：真 Unity 里可以用 Kenney 等免费模型代替`:`Asset Library model (${(PROPS()[o.model]||{}).en}): in real Unity use a free model, e.g. from Kenney`;return o.type;};
  const walk=(o,d)=>{const ind='  '.repeat(d),m=matOf(o);out.push(`${ind}- **${o.name}** — ${how(o)}${par(o)?(zh?`，放在 ${par(o).name} 下面`:`, as a child of ${par(o).name}`):''}`);
    if(!isUI(o))out.push(`${ind}  - Position ${v3(o.pos)}, Rotation ${v3(o.rot)}, Scale ${v3(effScale(o))}`);
    if(m)out.push(`${ind}  - ${zh?'材质':'Material'}: ${m.name}`);
    if(o.active===false)out.push(`${ind}  - ${zh?'取消勾选名字旁边的勾（开始时隐藏）':'Uncheck the box next to its name (hidden at start)'}`);
    if(o.light&&o.light.enabled===false)out.push(`${ind}  - ${zh?'取消勾选 Light 组件（开始时不亮）':'Uncheck the Light component (off at start)'}`);
    if(o.tag&&o.tag!=='Untagged'&&o.type!=='camera')out.push(`${ind}  - Tag: ${o.tag}`);
    if(MESH_COL[o.type]&&!o.col)out.push(`${ind}  - ${zh?'移除碰撞体':'Remove the collider'}`);if(o.col&&o.col.trigger)out.push(`${ind}  - ${zh?'碰撞体勾选 Is Trigger':'Collider: check Is Trigger'}`);
    if(o.rb)out.push(`${ind}  - ${zh?'添加组件 → 物理 → 刚体':'Add Component → Physics → Rigidbody'}`);
    if(o.cc)out.push(`${ind}  - ${zh?'添加组件 → 物理 → 角色控制器':'Add Component → Physics → Character Controller'}`);
    if(o.agent)out.push(`${ind}  - ${zh?'添加组件 → 导航 → NavMesh 代理':'Add Component → Navigation → NavMesh Agent'}`);
    if(o.light&&o.type==='light'){const li=o.light;out.push(`${ind}  - Light: Color ${li.color}, Intensity ${fmt(li.intensity)}${li.kind!=='directional'?`, Range ${fmt(li.range)}`:''}${li.kind==='spot'?`, Outer Spot Angle ${fmt(li.angle)}`:''}`);}
    if(o.cam&&o.cam.post)out.push(`${ind}  - ${zh?'摄像机 → Rendering → 勾选 Post Processing':'Camera → Rendering → check Post Processing'}`);
    if(o.audio){const au=o.audio,cl=au.clip!=null?asset(au.clip):null;out.push(`${ind}  - ${zh?'添加组件 → 音频 → 音频源':'Add Component → Audio → Audio Source'}: ${cl?cl.name:'None'}, Play On Awake ${au.awake?'✓':'✗'}, Loop ${au.loop?'✓':'✗'}, Volume ${fmt(au.volume)}, Spatial Blend ${fmt(au.blend)}, Min/Max Distance ${fmt(au.minDist)}/${fmt(au.maxDist)}`);}
    if(o.vol){const v=o.vol;out.push(`${ind}  - ${zh?'Volume 组件：Profile 点 New，再 Add Override → Post-processing → ':'Volume: click New for the Profile, then Add Override → Post-processing → '}${Object.keys(v.ov).map(k=>`${ZTG.tl('en',OVK[k])} (${OV[k].map(([pp])=>`${ZTG.tl('en','ov_'+pp)} ${fmt(v.ov[k][pp])}`).join(', ')})`).join('; ')||'—'}`);}
    if(o.anim)out.push(`${ind}  - Animator: Controller ${(asset(o.anim.ctrl)||{}).name||'None'}`);
    if(o.navs)out.push(`${ind}  - ${zh?'添加组件 → NavMesh Surface，点 Bake（需要 AI Navigation 包）':'Add Component → NavMesh Surface, click Bake (needs the AI Navigation package)'}`);
    o.scripts.forEach(sc=>{const a=asset(sc.asset);if(!a)return;const vals=Object.entries(sc.vals||{}).map(([k,v])=>`${k} = ${Array.isArray(v)?v.map(id=>(asset(id)||{}).name).join(', '):typeof v==='number'?fmt(v):v!=null&&obj(v)?obj(v).name:'None'}`).join('; ');
      out.push(`${ind}  - ${zh?'把脚本拖上去':'Drag the script onto it'}: ${a.name}${vals?` (${vals})`:''}`);});
    kids(o).forEach(k=>walk(k,d+1));};
  S.objs.filter(o=>!par(o)).forEach(o=>walk(o,0));
  out.push('',zh?'最后：文件 → 保存（Ctrl/Cmd+S），然后按播放试试。':'Finally: File → Save (Ctrl/Cmd+S), then press Play.');
  return out.join('\n')+'\n';}
function buildExport(){const files=S.assets.filter(a=>a.type==='script').map(a=>({name:'Assets/Scripts/'+a.name+'.cs',data:scriptText(a)}));
  files.push({name:'在真Unity里怎么做.md',data:exportGuide('zh')},{name:'HOW_TO_REBUILD_IN_UNITY.md',data:exportGuide('en')});return files;}
function exportUnity(){const a=document.createElement('a');a.href=URL.createObjectURL(makeZip(buildExport()));a.download='ZeroToGame-Unity.zip';document.body.appendChild(a);a.click();
  setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},4000);log('info','lExported');toast(t('lExported'));commit();}
// 调色盘：选一个主色，按配色规则算出 5 个搭配色
const palBase=new Map();let palScheme='analog';
function hexToHsl(hex){const [r,g,b]=hex2rgb(hex).map(v=>v/255);const mx=Math.max(r,g,b),mn=Math.min(r,g,b),l=(mx+mn)/2;let h=0,s=0;
  if(mx!==mn){const d=mx-mn;s=l>.5?d/(2-mx-mn):d/(mx+mn);h=(mx===r?(g-b)/d+(g<b?6:0):mx===g?(b-r)/d+2:(r-g)/d+4)*60;}return [h,s,l];}
function hslToHex(h,s,l){const f=n=>{const k=(n+h/30)%12,a=s*Math.min(l,1-l);return Math.round((l-a*Math.max(-1,Math.min(k-3,9-k,1)))*255).toString(16).padStart(2,'0');};return '#'+f(0)+f(8)+f(4);}
function paletteOf(hex,scheme){const [h,s0,l0]=hexToHsl(hex),s=Math.max(.38,s0),l=clamp(l0,.32,.62),H=d=>((h+d)%360+360)%360;
  if(scheme==='complement')return [hslToHex(h,s,l*.7),hslToHex(h,s,l),hslToHex(h,s*.4,.88),hslToHex(H(180),s,l),hslToHex(H(180),s,l*.7)];
  if(scheme==='triad')return [hslToHex(h,s,l),hslToHex(H(120),s,l),hslToHex(H(240),s,l),hslToHex(h,s*.35,.86),hslToHex(h,s*.5,.22)];
  if(scheme==='mono')return [.2,.35,.5,.66,.82].map(v=>hslToHex(h,s,v));
  return [-40,-20,0,20,40].map(d=>hslToHex(H(d),s,l));}
function palMats(a){const pal=paletteOf(palBase.get(a.id)||a.color,palScheme);let f=S.assets.find(x=>x.type==='folder'&&x.name==='Palette'&&x.parent===0);if(!f)f=mkAsset('folder','Palette',0);
  pal.forEach((c,i)=>mkAsset('material',uniqueAssetName('Palette_'+(i+1),f.id),f.id,{color:c}));log('info','lPalMats',pal.length);toast(t('lPalMats',pal.length));commit();}
function uniqueAssetName(n,pid){let k=n,i=1;while(S.assets.some(x=>x.parent===pid&&x.name===k))k=n+'_'+(++i);return k;}

/* ---------- Scene interaction ---------- */
let drag=null;
cv.addEventListener('contextmenu',e=>e.preventDefault());
cv.addEventListener('pointerdown',e=>{
  winClick(S.tab);
  if(S.tab==='game'){if(document.activeElement&&document.activeElement!==document.body)document.activeElement.blur();if(S.playing&&fpsActive()){try{cv.requestPointerLock();}catch(err){}drag={t:'look'};cv.setPointerCapture(e.pointerId);}return;}
  const r=cv.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;cv.setPointerCapture(e.pointerId);
  const o=selObj();
  if(e.button!==0||S.tool==='q'){drag={t:'orbit',x:e.clientX,y:e.clientY};return;}
  if(S.tool==='w'&&o){for(const h of handles){if(segDist(x,y,h.a,h.b)<9){const st=wPos(o),t0=axisParam(x,y,st,h.dir);
    if(t0!=null){const tg=topSel();drag={t:'axis',h,t0,start:st,tg,starts:new Map(tg.map(q=>[q.id,wPos(q)]))};return;}}}}
  const hit=pickAt(x,y);
  if(hit&&(e.metaKey||e.ctrlKey||e.shiftKey)){toggleSel(hit);commit();return;}
  if(hit&&!selIds().includes(hit)){select('obj',hit);commit();return;}
  if(!hit&&(!o||S.tool==='w')){drag={t:'orbit',x:e.clientX,y:e.clientY};return;}
  if(o&&(S.tool==='e'||S.tool==='r')){const tg=topSel().filter(q=>isRender(q)||q.type==='empty');
    if(tg.length)drag={t:S.tool,x:e.clientX,tg,rots:new Map(tg.map(q=>[q.id,q.rot.slice()])),scs:new Map(tg.map(q=>[q.id,effScale(q).slice()]))};}
});
addEventListener('mousemove',e=>{if(document.pointerLockElement===cv||(drag&&drag.t==='look')){mdx+=e.movementX;mdy+=e.movementY;}});
cv.addEventListener('pointermove',e=>{if(!drag||drag.t==='look')return;const r=cv.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;
  if(drag.t==='orbit'){V.yaw-=(e.clientX-drag.x)*.4;V.pitch=clamp(V.pitch+(e.clientY-drag.y)*.3,4,86);drag.x=e.clientX;drag.y=e.clientY;}
  else if(drag.t==='axis'){const tt=axisParam(x,y,drag.start,drag.h.dir);if(tt!=null){let d=tt-drag.t0;if(e.ctrlKey||e.metaKey)d=Math.round(d);drag.tg.forEach(q=>setWorldPos(q,add(drag.starts.get(q.id),mul(drag.h.dir,d))));if(Math.abs(d)>.05)S.flags.moved=true;refreshLive();}}
  else if(drag.t==='e'){const dx=e.clientX-drag.x;let ang=dx*.6;if(e.ctrlKey||e.metaKey)ang=Math.round(ang/15)*15;drag.tg.forEach(q=>{const r0=drag.rots.get(q.id);q.rot=[r0[0],rnd(r0[1]+ang),r0[2]];});if(Math.abs(dx)>6)S.flags.rotated=true;refreshLive();}
  else if(drag.t==='r'){const k=clamp(1+(e.clientX-drag.x)*.01,.1,6);drag.tg.forEach(q=>{if(q.prefab&&!q.scaleOverride)q.scaleOverride=true;q.scale=drag.scs.get(q.id).map(v=>v*k);});if(Math.abs(k-1)>.05)S.flags.scaled=true;refreshLive();}
});
const endDrag=()=>{if(drag&&drag.t!=='orbit'&&drag.t!=='look')commit();drag=null;};
cv.addEventListener('pointerup',endDrag);cv.addEventListener('pointercancel',endDrag);
cv.addEventListener('wheel',e=>{e.preventDefault();V.dist=clamp(V.dist*(1+e.deltaY*.0012),3,40);},{passive:false});
function refreshLive(){syncInspector();checkGuide();}

/* ---------- Guide: engine helpers (章节内容在 chapters/，这里只放通用机制) ---------- */
const WORDER=['hier','scene','game','insp','proj'];
const WSEL={hier:'#p-hier',scene:'#cwrap',game:'#tab-game',insp:'#p-insp',proj:'#p-proj'};
const isGray=c=>{const [r,g,b]=hex2rgb(c).map(v=>v/255);const l=(r+g+b)/3;return Math.max(r,g,b)-Math.min(r,g,b)<.12&&l<.5&&l>.04;};
const isOrange=c=>{const [r,g,b]=hex2rgb(c).map(v=>v/255);return r>.85&&g>.35&&g<.75&&b<.3;};
const instCount=()=>{const p=P();return p&&p.prefab?S.objs.filter(o=>o.prefab===p.prefab).length:0;};
function ensureMats(){let m=mats();let f=S.assets.find(a=>a.type==='folder'&&a.name==='Materials');if(!f)f=mkAsset('folder','Materials',0);
  if(m.length<1)mkAsset('material','Floor_Mat',f.id,{color:'#ffffff'});m=mats();if(m.length<2)mkAsset('material','Player_Mat',f.id,{color:'#ffffff'});return mats();}

/* 教练箭头定位用的小工具（章节文件通过 ZTG.hint 调用） */
function reach(a){
  if(S.ptab!=='project')return {at:'#ptab-project',label:t('hBackProject'),nav:true};
  if(a.parent===S.cwd)return {at:`#proj-body [data-asset="${a.id}"]`};
  let c=a.parent;while(c){const f=asset(c);if(!f)break;if(f.parent===S.cwd)return {at:`#proj-body [data-asset="${f.id}"]`,label:t('hOpenFolder'),nav:true};c=f.parent;}
  return {at:'#proj-body [data-act="cwd"][data-id="0"]',label:t('hBackAssets'),nav:true};}
const HINT={
  row:id=>`#hier-body [data-obj="${id}"]`,
  field:b=>`#insp-body [data-bind="${b}"]`,
  mi:k=>`.cm .cmi[data-k="${k}"]`,
  isSel:x=>!!(x&&S.sel&&S.sel.id===x.id),
  reach,objScreen,handleAt,
  // 世界坐标 → 屏幕坐标（给箭头指向场景里的某个位置）
  wpt:p=>{if(!LV)return null;const v=mTV(LV.cam.M,sub(p,LV.cam.pos));if(v[2]<.2)return null;const r=cv.getBoundingClientRect(),x=r.left+CW/2+v[0]/v[2]*LV.f,y=r.top+CH/2-v[1]/v[2]*LV.f;
    return x>r.left&&x<r.right&&y>r.top&&y<r.bottom?{x,y}:null;}};

/* 把引擎能力交给 chapters/ 里的章节文件用 */
Object.defineProperty(ZTG,'S',{get:()=>S,configurable:true});
Object.assign(ZTG,{WORDER,WSEL,mkObj,mkAsset,select,P,FL,near,effScale,matOf,mats,asset,makePrefab,spawn,saveScene,ensureMats,instCount,isGray,isOrange,
  stopPlay,addScript,addRigidbody,setParent:reparent,compileScript,closeCode,bakeNav,inCameraView,setSetting,buildExport,enterMode,
  lib:()=>LIB(),mkLight,wPos,wAABB,colBounds,uniqueName,importSound,openLighting,closeFloat,floatOpen:()=>floatId,isMesh,TAGS,
  setView:(target,dist,yaw,pitch)=>{V.target=target.slice();if(dist)V.dist=dist;if(yaw!=null)V.yaw=yaw;if(pitch!=null)V.pitch=pitch;},
  codeOpen:()=>codeId,codeDraft:b=>{const el=$(`#modal .blank[data-b="${b}"]`);return el?el.value:'';},codeDirty:()=>codeIsDirty(),hint:HINT});

let CHAP=ZTG.chapters.ch0,STEPS=CHAP.steps;
function setChap(){CHAP=ZTG.chapters['ch'+chapKey()]||ZTG.chapters.ch0;STEPS=CHAP.steps;}
const chapLabel=()=>CHAP.label?L(CHAP.label):t('chN',+chapKey());
// 教练给的蓝图框（例如第 1 章要放墙的位置）
function lessonGhosts(){if(!isLesson()||!S||S.playing||S.tab!=='scene'||S.step>=STEPS.length||!STEPS[S.step].ghosts)return [];try{return STEPS[S.step].ghosts()||[];}catch(e){return [];}}

function stepDone(i){const st=STEPS[i];return st.conds.every(c=>!!c[1]());}
function winClick(key){if(MODE!=='ch0'||S.step!==0||S.playing)return;const n=WORDER.find(k=>!S.flags.win.includes(k));if(key!==n)return;S.flags.win.push(key);S.flags.winMsg='win_'+key;commit();}
function updateFlags(){const c=instCount();S.flags.maxInst=Math.max(S.flags.maxInst,c);const p=P();
  if(p&&p.prefab&&S.prefabs[p.prefab]&&S.prefabs[p.prefab].scale[0]>=1.5&&c>=3)S.flags.wide=true;}
// 提示分级：先只有发亮的边框；点「给我提示」出文字；再点「指给我看」出箭头；最后才有「帮我做这一步」。卡住 25 秒自动升一级。
let hintLv=0,hintT=0,hintStep=-1,quiz=null;const bugHintOpen=new Set();
const effLv=()=>SET.hints==='always'?2:hintLv;
function freeGuide(){return `<div class="gbody"><div class="gstep">${t('freeTitle')}</div><h2>${t('freeTitle')}</h2><p>${esc(t('freeIntro'))}</p><p><b>${t('freeIdeasT')}</b></p><ul class="ideas">${t('freeIdeas').map(x=>`<li>${esc(x)}</li>`).join('')}</ul><div class="hint">${esc(t('freeTip'))}</div></div>`;}
const bugRes=()=>CHAP.bugs.list.map(b=>{try{return !!b.check();}catch(e){return false;}});
const bugSig=()=>'bugs|'+bugRes().join('')+'|'+[...bugHintOpen].join(',');
function bugsGuide(){const B=CHAP.bugs.list,res=bugRes(),all=res.every(Boolean);
  return `<div class="gbody"><div class="gstep">${chapLabel()}</div><h2>${t('bugsTitle')}</h2><p>${esc(t('bugsIntro'))}</p><ul class="conds">${B.map((b,i)=>`<li class="${res[i]?'done':''}"><span class="chk"></span><span>${esc(L(b.title))}${!res[i]?(bugHintOpen.has(i)?`<div class="hint" style="margin-top:4px">${esc(L(b.hint))}</div>`:` <button class="btn quiet small" data-act="bughint" data-i="${i}">${t('bugHint')}</button>`):''}</span></li>`).join('')}</ul>
  ${all?`<div class="winmsg">${esc(t('bugsDone'))}</div><div class="gact"><button class="btn primary" data-act="reset">${t('bugsAgain')}</button><button class="btn quiet" data-act="home">${t('backHome')}</button></div>`:''}</div>`;}
function quizHTML(){const Q=CHAP.quiz,n=Q.length;
  if(quiz.i>=n){const qk='ztg.ch'+chapKey()+'.quiz',best=Math.max(quiz.score,+(lsGet(qk)||0));lsSet(qk,String(best));
    return `<div class="gstep">${t('quizBtn')}</div><h2>${esc(t('quizResult',quiz.score,n))}</h2><p>${esc(t('quizBest',best))}</p><div class="gact"><button class="btn primary" data-act="qagain">${t('quizAgain')}</button><button class="btn quiet" data-act="home">${t('backHome')}</button></div>`;}
  const q=Q[quiz.i],pk=quiz.picked;
  return `<div class="gstep">${t('quizQ',quiz.i+1,n)}</div><h2>${esc(L(q.q))}</h2><div class="qopts">${q.o.map((o,k)=>`<button class="qopt${pk==null?'':k===q.a?' right':k===pk?' wrongp':''}" data-act="qa" data-k="${k}"${pk!=null?' disabled':''}>${esc(L(o))}</button>`).join('')}</div>
    ${pk!=null?`<div class="${pk===q.a?'winmsg':'hint'}"><b>${t(pk===q.a?'correct':'wrong')}</b> ${esc(L(q.w))}</div><div class="gact"><button class="btn primary" data-act="qnext">${t(quiz.i===n-1?'seeResult':'nextQ')}</button></div>`:''}`;}
function renderGuide(){
  const g=$('#guide-body');
  if(MODE==='free'){g.innerHTML=freeGuide();linkTerms($('.gbody',g));S.sig='free';return;}
  if(isBugs()){g.innerHTML=bugsGuide();linkTerms($('.gbody',g));S.sig=bugSig();return;}
  if(S.step>=STEPS.length){markDone();g.innerHTML=`<div class="gbody">${quiz?quizHTML():L(CHAP.finish)}</div>`;return;}
  if(hintStep!==S.step){hintStep=S.step;hintLv=0;hintT=performance.now();}
  const lv=effLv();
  const st=STEPS[S.step];const res=st.conds.map(c=>!!c[1]());const done=res.every(Boolean);
  g.innerHTML=`<div class="gbody"><div class="gstep">${t('stepOf',S.step+1,STEPS.length)}</div><div class="gbar"><i style="width:${(S.step+(done?1:0))/STEPS.length*100}%"></i></div>
  <h2>${esc(L(st.title))}</h2><p>${L(st.body)}</p>${S.step===0&&S.flags.winMsg?`<div class="winmsg">${esc(t(S.flags.winMsg))}</div>`:''}
  <ul class="conds">${st.conds.map((c,i)=>`<li class="${res[i]?'done':''}"><span class="chk"></span><span>${esc(L(c[0]))}</span></li>`).join('')}</ul>
  ${st.hint&&lv>=1?`<div class="hint">${esc(L(st.hint))}</div>`:''}${st.note&&done?`<div class="note">${esc(L(st.note))}</div>`:''}
  <div class="gact"><button class="btn primary" data-act="next" ${done?'':'disabled'}>${t(S.step===STEPS.length-1?'finishCh':'next')}</button>${lv>=2?`<button class="btn quiet" data-act="auto">${t('auto')}</button>`:`<button class="btn quiet" data-act="${lv?'hint2':'hint1'}">${t(lv?'hintBtn2':'hintBtn1')}</button>`}</div></div>`;
  linkTerms($('.gbody',g));
  S.sig=S.step+'|'+res.join('')+'|'+S.flags.winMsg;
}
function updateGlow(){$$('.glow').forEach(e=>e.classList.remove('glow'));if(!isLesson()||S.step>=STEPS.length)return;const st=STEPS[S.step];if(S.step>0&&stepDone(S.step))return;
  st.glow().forEach(s=>$$(s).forEach(e=>e.classList.add('glow')));}
function checkGuide(){updateFlags();if(isBugs()){if(bugSig()!==S.sig)renderGuide();return;}if(!isLesson()||S.step>=STEPS.length)return;const st=STEPS[S.step];const sig=S.step+'|'+st.conds.map(c=>!!c[1]()).join('')+'|'+S.flags.winMsg;
  if(sig!==S.sig){hintT=performance.now();renderGuide();updateGlow();}}
$('#guide-body').addEventListener('click',e=>{const b=e.target.closest('[data-act]');if(!b)return;const a=b.dataset.act;
  if(a==='next'&&!b.disabled){S.step++;S.flags.winMsg='';if(S.step<STEPS.length&&STEPS[S.step].enter)STEPS[S.step].enter();commit();}
  else if(a==='auto'){if(S.playing&&!STEPS[S.step].play)stopPlay();STEPS[S.step].auto();commit();}
  else if(a==='reset')reset();
  else if(a==='home')showHome();
  else if(a==='hint1'||a==='hint2'){hintLv=a==='hint1'?1:2;hintT=performance.now();renderGuide();updateHint();}
  else if(a==='bughint'){bugHintOpen.add(+b.dataset.i);renderGuide();}
  else if(a==='quiz'||a==='qagain'){quiz={i:0,score:0,picked:null};renderGuide();}
  else if(a==='qa'&&quiz&&quiz.picked==null){quiz.picked=+b.dataset.k;if(quiz.picked===CHAP.quiz[quiz.i].a)quiz.score++;renderGuide();}
  else if(a==='qnext'&&quiz){quiz.i++;quiz.picked=null;renderGuide();}
  else if(a==='export')exportUnity();});

/* ---------- 术语解释：鼠标停在 Prefab、刚体这些词上，弹出一句话 ---------- */
let termRe=null,termReLang='',termMap=new Map();
function termRegex(){const l=ZTG.lang();if(termReLang===l)return termRe;const names=[];
  for(const k in TERMS)for(const n of new Set([...TERMS[k][l],...TERMS[k].en]))names.push([n,k]);
  names.sort((a,b)=>b[0].length-a[0].length);termMap=new Map(names);
  termRe=new RegExp(names.map(([n])=>{const e=n.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');return /^[A-Za-z]/.test(n)?`(?<![A-Za-z])${e}(?![A-Za-z])`:e;}).join('|'),'g');
  termReLang=l;return termRe;}
function linkTerms(root){if(!root)return;const re=termRegex(),used=new Set();
  const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode:n=>n.parentElement.closest('button,input,h2,.term,.gstep')?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT});
  const nodes=[];while(w.nextNode())nodes.push(w.currentNode);
  for(const n of nodes){const s=n.nodeValue;re.lastIndex=0;let m,last=0,changed=false;const frag=document.createDocumentFragment();
    while((m=re.exec(s))){const k=termMap.get(m[0]);if(!k||used.has(k))continue;used.add(k);
      frag.append(s.slice(last,m.index));const sp=document.createElement('span');sp.className='term';sp.dataset.term=k;sp.tabIndex=0;sp.textContent=m[0];frag.append(sp);last=m.index+m[0].length;changed=true;}
    if(changed){frag.append(s.slice(last));n.replaceWith(frag);}}}
const TT=document.createElement('div');TT.id='termtip';TT.hidden=true;TT.setAttribute('role','tooltip');document.body.appendChild(TT);
let ttTimer=0,ttEl=null;
function showTerm(el){const d=TERMS[el.dataset.term];if(!d||!el.isConnected)return;const l=ZTG.lang();
  TT.innerHTML=`<b>${esc(d[l][0])}</b>${l==='zh'&&d.en[0]!==d.zh[0]?` <span class="en">${esc(d.en[0])}</span>`:''}<div>${esc(d.t[l])}</div>`;
  TT.hidden=false;const r=el.getBoundingClientRect(),w=TT.offsetWidth,h=TT.offsetHeight;
  let y=r.bottom+8;if(y+h>innerHeight-6)y=r.top-h-8;TT.style.left=clamp(r.left+r.width/2-w/2,6,innerWidth-w-6)+'px';TT.style.top=y+'px';}
document.addEventListener('mouseover',e=>{const el=e.target.closest&&e.target.closest('[data-term]');if(el===ttEl)return;clearTimeout(ttTimer);ttEl=el;TT.hidden=true;if(el)ttTimer=setTimeout(()=>showTerm(el),350);});
document.addEventListener('focusin',e=>{const el=e.target.closest&&e.target.closest('[data-term]');if(el){ttEl=el;showTerm(el);}});
document.addEventListener('focusout',()=>{TT.hidden=true;ttEl=null;});
document.addEventListener('pointerdown',()=>{TT.hidden=true;clearTimeout(ttTimer);},true);

/* ---------- coach pointer: 箭头指向下一步要点的地方；要拖动时演示从哪拖到哪 ---------- */
const HL=document.createElement('div');HL.id='hintlayer';HL.setAttribute('aria-hidden','true');
HL.innerHTML=`<div class="harrow" hidden><div class="hrot"><svg viewBox="0 0 48 26" width="48" height="26"><path class="hshade" d="M4 13h28"/><path class="hshaft" d="M4 13h28"/><path class="hhead" d="M27 2 46 13 27 24z"/></svg></div></div>
<div class="hlinew" hidden><svg class="hline"><line/><circle r="11"/><circle r="11"/></svg></div>
<div class="hcur" hidden><svg viewBox="0 0 16 22" width="20" height="27"><path d="M1.5 1.5v16.5l4.3-3.9 2.9 6.6 2.9-1.3-2.9-6.5h5.8z"/></svg></div>
<div class="hlabel" hidden></div>`;
document.body.appendChild(HL);
const RM=matchMedia('(prefers-reduced-motion: reduce)');
function resolvePt(x){
  if(x==null)return null;
  if(typeof x==='object'&&'x' in x)return x;
  for(const el of $$(x)){let r=el.getBoundingClientRect();if(r.width<1||r.height<1)continue;
    // 在可以滚动的面板里、被挡住了：先滚过去（例如层级很长时，要找的物体在最下面）
    const sc=el.closest('#hier-body,#insp-body,#proj-body');
    if(sc){const q=sc.getBoundingClientRect();if(r.bottom<q.top+2||r.top>q.bottom-2){el.scrollIntoView({block:'nearest'});r=el.getBoundingClientRect();}}
    if(r.bottom<0||r.right<0||r.top>innerHeight||r.left>innerWidth)continue;
    const box=el.closest('.pb,.code');if(box){const q=box.getBoundingClientRect();if(r.bottom<q.top+2||r.top>q.bottom-2)continue;}
    return {x:r.left+r.width/2,y:r.top+r.height/2,r,el};}
  return null;}
function pickHint(){
  if(!$('#home').hidden||!isLesson()||S.step>=STEPS.length)return null;
  const st=STEPS[S.step];
  if(stepDone(S.step)){const a=resolvePt('#guide-body [data-act="next"]');return a&&{a,label:t('hNext')};}
  if(S.playing&&!st.play){const a=resolvePt('#playbtn');return a&&{a,label:t('hStopFirst')};}
  if(effLv()<2)return null;
  let cand=null;
  if(st.point){let list=st.point();list=Array.isArray(list)?list:[list];
    for(const c of list){if(!c)continue;
      if(c.from!=null){const a=resolvePt(c.from),b=resolvePt(c.to);if(a&&b){cand={a,b,label:c.label};break;}}
      else{const a=resolvePt(c.at);if(a){cand={a,label:c.label};break;}}}}
  // 代码窗口开着、而这一步要做的事不在窗口里：先提示关掉窗口
  if(codeId!=null&&!st.play&&!(cand&&cand.a.el&&cand.a.el.closest('#modal'))){const a=resolvePt('#mclose');return a&&{a,label:t('hClose')};}
  return cand;}
let hKey='',curAnim=null;
function placeLabel(lb,x,y){const w=lb.offsetWidth,h=lb.offsetHeight;lb.style.left=clamp(x,w/2+6,innerWidth-w/2-6)+'px';lb.style.top=clamp(y,h/2+6,innerHeight-h/2-6)+'px';}
function updateHint(){
  const h=pickHint();
  const ar=$('.harrow',HL),lw=$('.hlinew',HL),cu=$('.hcur',HL),lb=$('.hlabel',HL);
  if(!h){ar.hidden=lw.hidden=cu.hidden=lb.hidden=true;hKey='';if(curAnim){curAnim.cancel();curAnim=null;}return;}
  const label=L(h.label)||'';
  const key=[h.a.x,h.a.y,h.b?h.b.x:-1,h.b?h.b.y:-1].map(v=>Math.round(v/3)).join(',')+'|'+label;
  if(key===hKey)return;hKey=key;
  lb.textContent=label;lb.hidden=!label;
  if(h.b){
    ar.hidden=true;lw.hidden=false;cu.hidden=false;
    const [ln,c1,c2]=$('.hline',HL).children;
    ln.setAttribute('x1',h.a.x);ln.setAttribute('y1',h.a.y);ln.setAttribute('x2',h.b.x);ln.setAttribute('y2',h.b.y);
    c1.setAttribute('cx',h.a.x);c1.setAttribute('cy',h.a.y);c2.setAttribute('cx',h.b.x);c2.setAttribute('cy',h.b.y);
    if(curAnim)curAnim.cancel();curAnim=null;
    const A=`translate(${h.a.x}px,${h.a.y}px)`,B=`translate(${h.b.x}px,${h.b.y}px)`;
    if(RM.matches)cu.style.transform=B;
    else curAnim=cu.animate([{transform:A,opacity:0},{transform:A,opacity:1,offset:.15},{transform:B,opacity:1,offset:.8},{transform:B,opacity:0}],{duration:1800,iterations:Infinity,easing:'ease-in-out'});
    if(label)placeLabel(lb,h.b.x,h.b.y+(h.b.y>innerHeight-80?-36:36));
  }else{
    lw.hidden=cu.hidden=true;if(curAnim){curAnim.cancel();curAnim=null;}
    ar.hidden=false;
    // 箭头从屏幕中心那一侧指过来，所以不会跑出画面
    let dx=innerWidth/2-h.a.x,dy=innerHeight/2-h.a.y;const d=Math.hypot(dx,dy);
    if(d<40){dx=-.7071;dy=-.7071;}else{dx/=d;dy/=d;}
    let x=h.a.x,y=h.a.y;
    if(h.a.r){const tt=Math.min(h.a.r.width/2/Math.max(Math.abs(dx),1e-3),h.a.r.height/2/Math.max(Math.abs(dy),1e-3));if(tt<=80){x+=dx*tt*.45;y+=dy*tt*.45;}}
    ar.style.left=x+'px';ar.style.top=y+'px';
    $('.hrot',ar).style.transform=`rotate(${Math.atan2(-dy,-dx)*180/Math.PI}deg)`;
    if(label)placeLabel(lb,x+dx*92,y+dy*92);
  }
}

/* ---------- panels ---------- */
function renderChrome(){
  $('#scenename').textContent='SampleScene'+(S.dirty?' *':'');
  $('#tab-scene').classList.toggle('on',S.tab==='scene');$('#tab-game').classList.toggle('on',S.tab==='game');
  $$('#tools button').forEach(b=>b.classList.toggle('on',b.dataset.tool===S.tool));
  $('#tools').style.visibility=S.tab==='scene'?'visible':'hidden';
  $('#playbtn').classList.toggle('on',S.playing);$('#pausebtn').classList.toggle('on',S.paused);
  $('#banner').hidden=!S.playing;$('#app').classList.toggle('playing',S.playing);
  $('#toolhint').textContent=t(S.tab==='game'?'tipGame':'tip_'+S.tool);
  $('#toolhint').hidden=S.playing;
}
function renderHier(){
  const ids=new Set(selIds()),rows=[];
  const walk=(o,d)=>{const ks=kids(o),col=S.collapsed.includes(o.id);
    rows.push(`<div class="hrow${ids.has(o.id)?' sel':''}${o.prefab?' pf':''}${isActive(o)?'':' off'}" style="padding-left:${10+(d-1)*14}px" data-obj="${o.id}" data-drag="obj:${o.id}" data-drop="obj:${o.id}"><span class="tw" ${ks.length?`data-tw="${o.id}"`:''}>${ks.length?(col?'▸':'▾'):''}</span>${objIcon(o)}<span>${esc(o.name)}</span></div>`);
    if(!col)ks.forEach(k=>walk(k,d+1));};
  S.objs.filter(o=>!par(o)).forEach(o=>walk(o,1));
  $('#hier-body').innerHTML=`<div class="hrow root" data-drop="hroot"><span>▾</span>SampleScene${S.dirty?' *':''}</div>`+rows.join('');
}
const srcLabel=src=>{const a=asset(src.a);return a?`${a.name}.cs:${src.l+1}`:'';};
function renderProj(){
  const ce=compileErrs();
  const errs=S.logs.filter(l=>l.type==='error').length+ce.length;const bd=$('#errbadge');bd.hidden=!errs;bd.textContent=errs;
  $('#ptab-project').classList.toggle('on',S.ptab==='project');$('#ptab-console').classList.toggle('on',S.ptab==='console');
  const b=$('#proj-body');
  if(S.ptab==='console'){
    const rows=S.logs.slice(-80).map(l=>`<div class="${l.type}${l.src?' link':''}"${l.src?` data-sa="${l.src.a}" data-sl="${l.src.l}"`:''}>[${l.t}] ${esc(t(l.k,...l.a))}${l.src?` <span class="srcref">${esc(srcLabel(l.src))}</span>`:''}</div>`);
    // 编译错误和真 Unity 一样一直留在控制台，直到改好
    const zh=ZTG.lang()==='zh';
    ce.forEach(e=>rows.push(`<div class="error link" data-sa="${e.a.id}" data-sl="${e.line}">${esc(e.text)}${zh?`<div class="why">${t('errMeaning')}${esc(e.zh)}</div>`:''}</div>`));
    b.innerHTML='<div class="console">'+(rows.join('')||`<div class="info">${t('consoleEmpty')}</div>`)+'</div>';b.scrollTop=b.scrollHeight;return;}
  const path=[];let c=S.cwd;while(c!==0){const a=asset(c);if(!a)break;path.unshift(a);c=a.parent;}
  const kidsA=S.assets.filter(a=>a.parent===S.cwd);const sid=S.sel&&S.sel.k==='asset'?S.sel.id:-1;
  b.innerHTML=`<div class="crumbs"><button data-act="cwd" data-id="0">Assets</button>${path.map(a=>`<span>›</span><button data-act="cwd" data-id="${a.id}">${esc(a.name)}</button>`).join('')}</div>
  <div class="grid" id="projgrid" data-drop="proj">${kidsA.length?kidsA.map(a=>`<div class="tile${a.id===sid?' sel':''}" data-asset="${a.id}" data-drag="asset:${a.id}" ${a.type==='folder'?`data-drop="folder:${a.id}"`:''}>${assetIcon(a,40)}${S.renaming===a.id?`<input id="rn" value="${esc(a.name)}" maxlength="40" aria-label="${t('renameAria')}">`:`<span class="tn">${esc(a.name)}</span>`}</div>`).join(''):`<p class="empty">${t('emptyFolder')}</p>`}</div>`;
}
function vec(tk,key,vals,extra){const lab=t(tk);return `<div class="vrow"><label${tip(tk)}>${lab}${extra||''}</label><div class="vins">${[0,1,2].map(i=>`<div class="vin"><span class="a${i}">${'XYZ'[i]}</span><input inputmode="decimal" data-bind="${key}.${i}" value="${vals[i]}" aria-label="${lab} ${'XYZ'[i]}"></div>`).join('')}</div></div>`;}
const mixed=(os,get)=>[0,1,2].map(i=>{const v=get(os[0])[i];return os.every(o=>Math.abs(get(o)[i]-v)<1e-4)?fmt(v):'—';});
const kv=(tk,val)=>`<div class="kv"><span${tip(tk)}>${t(tk)}</span><b>${val}</b></div>`;
const ck=(tk,bind,on,dis)=>`<label class="ck"><input type="checkbox" ${bind?`data-bind="${bind}"`:''} ${on?'checked':''} ${dis?'disabled':''}><span${tip(tk)}>${t(tk)}</span></label>`;
const head=tk=>`<h4><span${tip(tk)}>${t(tk)}</span></h4>`;
const rmBtn=c=>`<span class="sp"></span><button class="ibtn rm" data-act="rmcomp" data-c="${c}" title="${esc(t('removeComp'))}" aria-label="${esc(t('removeComp'))}">✕</button>`;
const headRm=(tk,c)=>`<h4><span${tip(tk)}>${t(tk)}</span>${rmBtn(c)}</h4>`;
const REF_NAME={uislider:'Slider',uitext:'TMP_Text',uiimage:'Image',uibutton:'Button',light:'Light'};
const numRow=(tk,b,v,extra)=>`<div class="vrow"><label${tip(tk)}>${t(tk)}</label><div class="vin" style="max-width:110px"><input inputmode="decimal" data-bind="${b}" value="${fmt(v)}" aria-label="${esc(t(tk))}"${extra||''}></div></div>`;
const colRow=(tk,b,v,pal)=>`<div class="vrow"><label>${t(tk)}</label><div class="slot"><span class="sw" style="background:${esc(v)}"></span><input class="hexin" data-bind="${b}" value="${esc(v)}" maxlength="7" aria-label="${esc(t(tk))}"></div></div>${pal?`<div class="pal">${pal.map(c=>`<button data-act="setc" data-b="${b}" data-c="${c}" style="background:${c}" aria-label="${t('colorAria',c)}"></button>`).join('')}</div>`:''}`;
const LPAL=['#ffffff','#fff4e5','#ffd6a0','#ffb46b','#ff7a3a','#ff3b2f','#a8c8ff','#8affc1'];
function lightInsp(o){const L_=o.light||mkLight('directional'),k=L_.kind;
  return `<div class="comp"><h4><input type="checkbox" data-bind="len" ${L_.enabled===false?'':'checked'} aria-label="${t('enabled')}"> <span${tip('light')}>${t('light')}</span></h4><div class="vrow"><label>${t('type')}</label><select class="schemesel" data-bind="ltype" aria-label="${t('type')}">${['directional','point','spot'].map(x=>`<option value="${x}"${x===k?' selected':''}>${t('lt_'+x)}</option>`).join('')}</select></div>
  ${colRow('colorL','lcolor',L_.color,LPAL)}${numRow('intensity','lint',L_.intensity)}${k!=='directional'?numRow('rangeL','lrange',L_.range):''}${k==='spot'?numRow('spotAngle','langle',L_.angle):''}</div>`;}
function audioInsp(o){const au=o.audio,cl=au.clip!=null?asset(au.clip):null;
  return `<div class="comp">${headRm('audioSource','audio')}<div class="vrow"><label>${t('audioGen')}</label><div class="slot objref${cl?'':' none'}" data-drop="aclip:${o.id}" title="${esc(t('dropClip'))}">${cl?IC.audio(12)+' '+esc(cl.name):'None (Audio Clip)'}${cl?`<span class="sp"></span><button class="ibtn rm" data-act="clrclip" aria-label="✕">✕</button>`:''}</div></div>
  ${ck('playOnAwake','aawake',au.awake)}${ck('loopL','aloop',au.loop)}${numRow('volumeL','avol',au.volume)}
  <div class="vrow"><label${tip('spatialBlend')}>${t('spatialBlend')}</label><div class="blend"><span>2D</span><input type="range" min="0" max="1" step="0.05" data-bind="ablend" value="${au.blend}" aria-label="${t('spatialBlend')}"><span>3D</span><b>${fmt(au.blend)}</b></div></div>
  <div class="subh">${t('sound3d')}</div>${numRow('minDist','amin',au.minDist)}${numRow('maxDist','amax',au.maxDist)}</div>`;}
// Volume 的覆盖项（Override）：每项几个参数和默认值（和 URP 一样，默认值都没有效果）
const OV={bloom:[['threshold',.9],['intensity',0]],color:[['postExposure',0],['contrast',0],['saturation',0]],grain:[['intensity',0]],vignette:[['intensity',0]]};
const OVK={bloom:'bloom',color:'colorAdj',grain:'filmGrain',vignette:'vignette'};
function volInsp(o){const v=o.vol;
  return `<div class="comp">${headRm('volumeComp','vol')}${kv('modeL','Global')}<div class="vrow"><label>${t('profile')}</label><div class="slot${v.profile?'':' none'}">${v.profile?esc(v.profile):'None'}${v.profile?'':`<span class="sp"></span><button class="btn small" data-act="volnew">${t('newBtn')}</button>`}</div></div>
  ${Object.keys(v.ov).map(k=>`<div class="ovr"><h5><span${tip(OVK[k])}>${t(OVK[k])}</span><span class="sp"></span><button class="ibtn rm" data-act="rmov" data-k="${k}" aria-label="${esc(t('removeComp'))}">✕</button></h5>${OV[k].map(([pp])=>numRow('ov_'+pp,'vo.'+k+'.'+pp,v.ov[k][pp])).join('')}</div>`).join('')}
  <div class="gact" style="margin-top:6px"><button class="btn" id="addov" data-act="addov" data-plus="1"${v.profile?'':' disabled'}>${t('addOverride')}</button></div></div>`;}
const PAL=['#ffffff','#c9ccd1','#8a8f98','#5c5650','#4a4d52','#34302c','#1c1d20','#ff8a1f','#e5484d','#f2c230','#3fbf6a','#2c6bd1','#7a4fd0','#8a5a3b'];
function scriptHTML(o,s,i){const a=asset(s.asset),tm=a?tmplOf(a):null,nm=a?a.name:t('missing');
  const fields=(tm&&LIB()[a.name]?tm.fields||[]:[]).map(f=>{const v=s.vals?s.vals[f.id]:null;
    if(f.type==='text')return `<div class="vrow"><label>${esc(f.label)}</label><input class="hexin" data-bind="fs.${i}.${f.id}" value="${esc(v==null?f.def:v)}" aria-label="${esc(f.label)}"></div>`;
    if(f.type==='transform'||f.type==='ref'){const tg=v!=null?obj(v):null;const none=f.type==='ref'?`None (${REF_NAME[f.accept]||'Object'})`:f.go?'None (Game Object)':t('noneTransform');
      return `<div class="vrow"><label>${esc(f.label)}</label><div class="slot objref${tg?'':' none'}" data-drop="ref:${o.id}:${i}:${f.id}" title="${esc(t('dropObj'))}">${tg?objIcon(tg,12)+' '+esc(tg.name):esc(none)}${tg?`<span class="sp"></span><button class="ibtn rm" data-act="clrref" data-i="${i}" data-f="${f.id}" aria-label="✕">✕</button>`:''}</div></div>`;}
    if(f.type==='assetlist'){const list=(v||[]).map(id=>asset(id));
      return `<div class="vrow"><label>${esc(f.label)} <span class="tag">${list.length}</span></label><div class="slot alist" data-drop="alist:${o.id}:${i}:${f.id}">${list.length?list.map((it,k)=>`<span class="chip">${it?assetIcon(it,12)+' '+esc(it.name):'Missing'}<button class="ibtn rm" data-act="rmlist" data-i="${i}" data-f="${f.id}" data-k="${k}" aria-label="✕">✕</button></span>`).join(''):`<span class="none">${esc(t('listEmpty'))}</span>`}</div></div>`;}
    return `<div class="vrow"><label>${esc(f.label)}</label><div class="vin" style="max-width:110px"><input inputmode="decimal" data-bind="fv.${i}.${f.id}" value="${fmt(v==null?f.def:v)}" aria-label="${esc(f.label)}"></div></div>`;}).join('');
  return `<div class="comp"><h4><input type="checkbox" data-bind="en.${i}" ${s.enabled?'checked':''} aria-label="${t('enabled')}"> ${esc(t('scriptCompN',nice(nm)))}${rmBtn('script:'+i)}</h4><div class="kv">${t('script')}<b>${esc(nm)}</b></div>${fields}</div>`;}
// UI 物体用「矩形变换」：锚点 + 位置 + 宽高（1920×1080 参考分辨率里的像素）
function uiInsp(o){
  if(o.type==='canvas')return `<div class="comp">${head('rectTransform')}<div class="kv">${t('width')}<b>1920</b></div><div class="kv">${t('height')}<b>1080</b></div></div>
    <div class="comp">${head('canvasComp')}${kv('renderMode','Screen Space - Overlay')}</div><div class="comp">${head('canvasScaler')}${kv('scaleMode','Scale With Screen Size')}${kv('refRes','1920 × 1080')}</div>`;
  if(!isUI(o)||!o.ui)return '';const u=o.ui;
  const num=(tk,b,v)=>`<div class="vrow"><label>${t(tk)}</label><div class="vin"><input inputmode="decimal" data-bind="${b}" value="${fmt(v)}" aria-label="${t(tk)}"></div></div>`;
  const col=(tk,b,v)=>`<div class="vrow"><label>${t(tk)}</label><div class="slot"><span class="sw" style="background:${esc(v)}"></span><input class="hexin" data-bind="${b}" value="${esc(v)}" maxlength="7" aria-label="${t(tk)}"></div></div>`;
  let h=`<div class="comp">${head('rectTransform')}<div class="vrow"><label>${t('anchor')}</label><select class="schemesel" data-bind="anchor" aria-label="${t('anchor')}">${Object.keys(ANCH).map(k=>`<option value="${k}"${k===u.anchor?' selected':''}>${t('a_'+k)}</option>`).join('')}</select></div>
    <div class="vins2">${num('posX','ux',u.x)}${num('posY','uy',u.y)}${num('width','uw',u.w)}${num('height','uh',u.h)}</div></div>`;
  if(o.type==='uitext')h+=`<div class="comp">${head('textComp')}<div class="vrow"><label>${t('textField')}</label><textarea class="uitextin" data-bind="utext" rows="2" aria-label="${t('textField')}">${esc(u.text)}</textarea></div>${num('fontSize','usize',u.size)}${col('colorL','ucolor',u.color)}</div>`;
  if(o.type==='uiimage')h+=`<div class="comp">${head('imageComp')}${col('colorL','ucolor',u.color)}</div>`;
  if(o.type==='uislider')h+=`<div class="comp">${head('sliderComp')}${num('valueL','uval',u.value)}${col('fillColor','ufill',u.fill)}${col('colorL','ucolor',u.color)}</div>`;
  if(o.type==='uibutton')h+=`<div class="comp">${head('buttonComp')}<div class="vrow"><label>${t('textField')}</label><input class="hexin" data-bind="utext" value="${esc(u.text)}" aria-label="${t('textField')}"></div>${col('colorL','ucolor',u.color)}</div>`;
  return h;}
function renderInsp(){
  const b=$('#insp-body');const o=selObj(),a=selAsset(),os=selObjs();
  if(os.length>1){
    b.innerHTML=`<div class="comp"><input class="nameinput" value="—" disabled aria-label="${t('objName')}"><div class="multi">${t('nSelected',os.length)}</div></div>
    <div class="comp">${head('transform')}${vec('position','pos',mixed(os,q=>q.pos))}${vec('rotation','rot',mixed(os,q=>q.rot))}${vec('scale','scl',mixed(os,q=>effScale(q)))}</div>
    ${os.every(isMesh)?(()=>{const m0=matOf(os[0]),same=os.every(q=>q.mat===os[0].mat);return `<div class="comp">${head('meshRenderer')}<label style="font-size:11px;color:var(--muted)">${t('matSlotMany')}</label><div class="slot" data-drop="objs"><span class="sw" style="background:${same&&m0?esc(m0.color):'#cdcdcd'}"></span>${same?(m0?esc(m0.name):'Default-Material'):'—'}</div></div>`;})():''}`;
  }else if(o){const sc=effScale(o),m=matOf(o);
    // 加上去的组件按添加顺序排，和真 Unity 一样
    const added=[...o.scripts.map((s,i)=>({seq:s.seq||0,html:scriptHTML(o,s,i)})),
      ...(o.col?[{seq:o.col.seq||0,html:`<div class="comp">${headRm(COL_KEY[o.col.kind],'col')}${ck('isTrigger','trig',o.col.trigger)}</div>`}]:[]),
      ...(o.rb?[{seq:o.rb.seq||0,html:`<div class="comp">${headRm('rigidbody','rb')}${kv('mass','1')}${ck('useGravity','rbg',o.rb.useGravity)}${ck('isKinematic','rbk',o.rb.isKinematic)}</div>`}]:[]),
      ...(o.cc?[{seq:o.cc.seq||0,html:`<div class="comp">${headRm('characterController','cc')}${kv('height','2')}${kv('radius','0.5')}${kv('stepOffset','0.3')}</div>`}]:[]),
      ...(o.agent?[{seq:o.agent.seq||0,html:`<div class="comp">${headRm('navAgent','agent')}<div class="vrow"><label>${t('agentSpeed')}</label><div class="vin" style="max-width:110px"><input inputmode="decimal" data-bind="agspd" value="${fmt(o.agent.speed)}" aria-label="${t('agentSpeed')}"></div></div></div>`}]:[]),
      ...(o.audio?[{seq:o.audio.seq||0,html:audioInsp(o)}]:[]),
      ...(o.vol?[{seq:o.vol.seq||0,html:volInsp(o)}]:[]),
      ...(o.anim?[{seq:o.anim.seq||0,html:`<div class="comp">${headRm('animatorComp','anim')}${kv('controllerL',esc((asset(o.anim.ctrl)||{}).name||'None'))}<div class="gact" style="margin-top:6px"><button class="btn" data-act="openanimator">${t('animatorWinM')}</button><button class="btn quiet" data-act="openanimwin">${t('animWinM')}</button></div></div>`}]:[]),
      ...(o.navs?[{seq:o.navs.seq||0,html:`<div class="comp">${headRm('navSurface','navs')}<div class="kv">${o.navs.baked?t('navBaked',o.navs.baked.w.split('1').length-1):t('navNone')}</div><div class="gact" style="margin-top:6px"><button class="btn" data-act="bake">${t('bake')}</button><button class="btn quiet" data-act="clearnav">${t('clearNav')}</button></div></div>`}]:[])
    ].sort((x,y)=>x.seq-y.seq);
    b.innerHTML=`<div class="comp"><div class="namerow"><input type="checkbox" data-bind="active" ${o.active===false?'':'checked'} aria-label="${t('activeL')}" title="${esc(t('activeL'))}"><input class="nameinput" data-bind="name" value="${esc(o.name)}" aria-label="${t('objName')}"></div>
    <div class="tagrow"><label><span${tip('tag')}>${t('tag')}</span><select data-bind="tag">${TAGS.map(x=>`<option${x===o.tag?' selected':''}>${x}</option>`).join('')}</select></label>
    <label><span${tip('layer')}>${t('layer')}</span><select data-bind="layer">${LAYERS.map(x=>`<option${x===o.layer?' selected':''}>${x}</option>`).join('')}</select></label></div>
    ${o.prefab?`<div style="margin-top:6px;color:var(--accent);font-size:12px">${IC.cube(12)} <span${tip('prefabInst')}>${t('prefabInst')}</span><span class="tag">${esc((S.prefabs[o.prefab]||{}).name||'')}</span></div>`:''}</div>
    ${uiInsp(o)||`<div class="comp">${head('transform')}${vec('position','pos',o.pos.map(fmt))}${vec('rotation','rot',o.rot.map(fmt))}${vec('scale','scl',sc.map(fmt),o.prefab&&!o.scaleOverride?`<span class="tag">${t('fromPrefab')}</span>`:'')}</div>`}
    ${o.type==='eventsystem'?`<div class="comp">${head('eventSystem')}<div class="kv">Input System UI Input Module</div></div>`:''}
    ${o.type==='camera'?`<div class="comp">${head('camera')}${kv('clearFlags',t('skybox'))}${kv('fov','60')}${kv('projection',t('perspective'))}<div class="subh">${t('renderingL')}</div>${ck('postProcessing','campost',o.cam&&o.cam.post)}</div><div class="comp">${head('audioListener')}</div>`:''}
    ${o.type==='light'?lightInsp(o):''}
    ${isModel(o)?`<div class="comp">${head('meshRenderer')}<label style="font-size:11px;color:var(--muted)">${t('modelMat')}</label><div class="slot" data-drop="obj:${o.id}">${m?`<span class="sw" style="background:${esc(m.color)}"></span>${esc(m.name)}`:esc(L(PROPS()[o.model]||{zh:'',en:''}))}</div></div>`:''}
    ${isMesh(o)?`<div class="comp">${head('meshRenderer')}<label style="font-size:11px;color:var(--muted)">${t('matSlot')}</label><div class="slot" data-drop="obj:${o.id}"><span class="sw" style="background:${m?esc(m.color):'#cdcdcd'}"></span>${m?esc(m.name):'Default-Material'}</div></div>`:''}
    ${added.map(x=>x.html).join('')}
    <div class="comp addc"><button class="btn" id="addcomp" data-act="addcomp" data-plus="1"${tip('addComponent')}>${t('addComponent')}</button></div>`;
  }else if(a){
    let inner=`<div class="comp"><input class="nameinput" data-bind="aname" value="${esc(a.name)}" aria-label="${t('fileName')}"></div>`;
    if(a.type==='material')inner+=`<div class="comp">${head('material')}<div class="kv"><span${tip('shader')}>${t('shader')}</span><select class="schemesel" data-bind="shader" aria-label="${t('shader')}">${['URP/Lit','URP/Unlit','Standard'].map(x=>`<option value="${x}"${x===(a.shader||'URP/Lit')?' selected':''}>${x==='Standard'?esc(t('shaderStd')):x}</option>`).join('')}</select></div><div class="vrow"><label${tip('baseMap')}>${t('baseMap')}</label><div class="slot"><span class="sw" style="background:${esc(a.color)}"></span><span style="font-family:var(--mono)">${esc(a.color)}</span></div></div><div class="pal">${PAL.map(c=>`<button data-act="color" data-c="${c}" style="background:${c}" aria-label="${t('colorAria',c)}"></button>`).join('')}</div><input class="hexin" data-bind="hex" value="${esc(a.color)}" aria-label="${t('hexAria')}" maxlength="7"></div>
      <div class="comp"><h4>${t('palette')}<span class="sp"></span><select class="schemesel" data-bind="scheme" aria-label="${t('palette')}">${['analog','complement','triad','mono'].map(k=>`<option value="${k}"${k===palScheme?' selected':''}>${t(k)}</option>`).join('')}</select></h4><div class="pal palgen">${paletteOf(palBase.get(a.id)||a.color,palScheme).map(c=>`<button data-act="color" data-c="${c}" style="background:${c}" aria-label="${t('colorAria',c)}" title="${c}"></button>`).join('')}</div><button class="btn" data-act="palmats">${t('palMats')}</button></div>`;
    else if(a.type==='script'){const st=!a.comp?`<div class="kv">${t('notCompiled')}</div>`:a.comp.ok?`<div class="kv okc">${t('scriptOk')}</div>`:`<div class="kv bad">${t('scriptErrs',a.comp.errs.length)}</div>`;
      inner+=`<div class="comp">${head('monoscript')}${st}<button class="btn" data-act="openscript" data-id="${a.id}">${t('openCode')}</button>${!LIB()[a.name]?`<div class="warnbox">${esc(t('nameMismatch',a.name))}</div>`:''}</div>`;}
    else if(a.type==='anim')inner+=`<div class="comp">${head('animClip')}${ck('loopTime','aloopt',a.loop)}${kv('lengthL',fmt(clipLen(a))+' s')}${kv('curvesL',Object.keys(a.curves).map(k=>t('aw_'+k)).join('、')||'—')}<p class="fnote">${esc(t('loopTimeNote'))}</p></div>`;
    else if(a.type==='animctrl')inner+=`<div class="comp">${head('animCtrl')}${kv('statesL',a.states.map(x=>esc(x.name)).join('、'))}${kv('paramsL',a.params.map(x=>esc(x.name)).join('、')||'—')}<button class="btn" data-act="openanimator">${t('animatorWinM')}</button></div>`;
    else if(a.type==='audio'){const c=(ZTG.audio&&ZTG.audio.clips[a.clip])||{len:0};inner+=`<div class="comp">${head('audioClip')}${kv('lengthL',fmt(c.len)+' s')}<p class="fnote">${esc(L(c))}</p><button class="btn" data-act="preview" data-k="${esc(a.clip)}">▶ ${t('previewBtn')}</button></div>`;}
    else if(a.type==='itemdata')inner+=`<div class="comp">${head('itemDataT')}<div class="vrow"><label>${t('itemName')}</label><input class="hexin" data-bind="iname" value="${esc(a.itemName||'')}" aria-label="${t('itemName')}"></div><div class="vrow"><label>${t('iconColor')}</label><div class="slot"><span class="sw" style="background:${esc(a.color)}"></span><input class="hexin" data-bind="icolor" value="${esc(a.color)}" maxlength="7" aria-label="${t('iconColor')}"></div></div>${ck('stackable','istack',a.stackable)}<div class="vrow"><label>${t('maxStack')}</label><div class="vin" style="max-width:110px"><input inputmode="decimal" data-bind="imax" value="${a.maxStack}" aria-label="${t('maxStack')}"></div></div></div>`;
    else if(a.type==='prefab'){const pf=S.prefabs[a.prefabId];inner+=`<div class="comp">${head('prefabAsset')}${kv('instances',S.objs.filter(x=>x.prefab===a.prefabId).length)}${pf?vec('pscl','pscl',pf.scale.map(fmt)):''}</div>`;}
    else inner+=`<div class="comp">${kv('type',t(a.type==='folder'?'folder':'sceneT'))}</div>`;
    b.innerHTML=inner;
  }else b.innerHTML=`<p class="empty">${t('nothingSel')}</p>`;
}
function syncInspector(){const o=selObj(),a=selAsset(),tg=selIds().length>1?selObjs():(o?[o]:[]);
  $$('#insp-body [data-bind]').forEach(inp=>{if(document.activeElement===inp)return;const [k,i,f]=inp.dataset.bind.split('.');let v=null;
    if(tg.length&&(k==='pos'||k==='rot'||k==='scl'))v=mixed(tg,q=>k==='pos'?q.pos:k==='rot'?q.rot:effScale(q))[i];
    else if(o&&k==='fv'&&o.scripts[i]&&o.scripts[i].vals&&typeof o.scripts[i].vals[f]==='number')v=fmt(o.scripts[i].vals[f]);
    else if(a&&k==='pscl'&&S.prefabs[a.prefabId])v=fmt(S.prefabs[a.prefabId].scale[i]);
    else if(o&&o.ui&&k==='uval')v=fmt(o.ui.value);
    else if(o&&o.light&&k==='lint')v=fmt(o.light.intensity);
    if(v!=null&&inp.value!==v)inp.value=v;});}
$('#insp-body').addEventListener('change',e=>{const el=e.target,b=el.dataset.bind;if(!b)return;const [k,i,f]=b.split('.');const o=selObj(),a=selAsset();
  const tg=selIds().length>1?selObjs():(o?[o]:[]);
  const num=parseFloat(String(el.value).replace(',','.'));
  if(k==='name'&&o)o.name=el.value||o.name;else if(k==='active'&&o)o.active=el.checked;else if(k==='len'&&o&&o.light)o.light.enabled=el.checked;
  else if(k==='fs'&&o&&o.scripts[+i]){o.scripts[+i].vals=o.scripts[+i].vals||{};o.scripts[+i].vals[f]=el.value;}else if(k==='aname'&&a){a.name=(el.value||a.name).replace(/[\/\\]/g,'');a.comp=null;}
  else if(k==='hex'&&a){if(/^#[0-9a-f]{6}$/i.test(el.value)){a.color=el.value.toLowerCase();palBase.set(a.id,a.color);}}
  else if(k==='scheme'){palScheme=el.value;}
  else if(k==='shader'&&a){a.shader=el.value;}
  else if(o&&k==='tag')o.tag=el.value;else if(o&&k==='layer')o.layer=el.value;
  else if(o&&k==='en'){o.scripts[+i].enabled=el.checked;}
  else if(o&&o.col&&k==='trig'){o.col.trigger=el.checked;}
  else if(o&&o.rb&&k==='rbg'){o.rb.useGravity=el.checked;}
  else if(o&&o.rb&&k==='rbk'){o.rb.isKinematic=el.checked;}
  else if(o&&o.ui&&k==='anchor')o.ui.anchor=el.value;
  else if(o&&o.ui&&k==='utext')o.ui.text=el.value;
  else if(o&&o.ui&&(k==='ucolor'||k==='ufill')){if(/^#[0-9a-f]{6}$/i.test(el.value))o.ui[k==='ucolor'?'color':'fill']=el.value.toLowerCase();}
  else if(o&&o.ui&&['ux','uy','uw','uh','usize','uval'].includes(k)){if(!isNaN(num))o.ui[{ux:'x',uy:'y',uw:'w',uh:'h',usize:'size',uval:'value'}[k]]=k==='uval'?clamp(num,0,1):num;}
  else if(o&&o.light&&k==='ltype')o.light.kind=el.value;
  else if(o&&o.light&&k==='lcolor'){if(/^#[0-9a-f]{6}$/i.test(el.value))o.light.color=el.value.toLowerCase();}
  else if(o&&o.light&&(k==='lint'||k==='lrange'||k==='langle')){if(!isNaN(num))o.light[{lint:'intensity',lrange:'range',langle:'angle'}[k]]=k==='langle'?clamp(num,1,179):Math.max(0,num);}
  else if(o&&o.audio&&k==='aawake')o.audio.awake=el.checked;else if(o&&o.audio&&k==='aloop')o.audio.loop=el.checked;
  else if(o&&o.audio&&(k==='avol'||k==='ablend'||k==='amin'||k==='amax')){if(!isNaN(num))o.audio[{avol:'volume',ablend:'blend',amin:'minDist',amax:'maxDist'}[k]]=k==='avol'||k==='ablend'?clamp(num,0,1):Math.max(.01,num);}
  else if(o&&o.cam&&k==='campost')o.cam.post=el.checked;
  else if(o&&o.vol&&k==='vo'&&o.vol.ov[i]){if(!isNaN(num))o.vol.ov[i][f]=f==='saturation'||f==='contrast'?clamp(num,-100,100):f==='postExposure'?clamp(num,-10,10):i==='bloom'?Math.max(0,num):clamp(num,0,1);}
  else if(a&&a.type==='anim'&&k==='aloopt')a.loop=el.checked;
  else if(a&&k==='iname')a.itemName=el.value;
  else if(a&&k==='icolor'){if(/^#[0-9a-f]{6}$/i.test(el.value))a.color=el.value.toLowerCase();}
  else if(a&&k==='istack')a.stackable=el.checked;
  else if(a&&k==='imax'){if(!isNaN(num))a.maxStack=Math.max(1,Math.round(num));}
  else if(!isNaN(num)){
    for(const q of tg){if(k==='pos')q.pos[+i]=num;else if(k==='rot')q.rot[+i]=num;
      else if(k==='scl'){if(!q.scaleOverride){q.scale=effScale(q).slice();q.scaleOverride=true;}q.scale[+i]=num;}}
    if(o&&k==='fv'&&o.scripts[+i]){o.scripts[+i].vals=o.scripts[+i].vals||{};o.scripts[+i].vals[f]=num;}
    else if(o&&o.agent&&k==='agspd')o.agent.speed=Math.max(0,num);
    else if(a&&k==='pscl'&&S.prefabs[a.prefabId])S.prefabs[a.prefabId].scale[+i]=num;}
  commit();});
$('#insp-body').addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.tagName==='INPUT')e.target.blur();});
$('#insp-body').addEventListener('click',e=>{const b=e.target.closest('[data-act]');if(!b)return;const a=selAsset(),o=selObj(),act=b.dataset.act;
  if(act==='color'&&a){a.color=b.dataset.c;commit();}
  else if(act==='openscript')openCode(+b.dataset.id);
  else if(act==='palmats'&&a)palMats(a);
  else if(act==='addcomp'){const r=b.getBoundingClientRect();openMenu(itemsComp(),r.left,r.bottom+2);}
  else if(act==='rmcomp')removeComp(o,b.dataset.c);
  else if(act==='bake'&&o&&o.navs)bakeNav(o);
  else if(act==='clearnav'&&o&&o.navs){o.navs.baked=null;log('info','lNavCleared');commit();}
  else if(act==='clrref'&&o){const s=o.scripts[+b.dataset.i];if(s&&s.vals)s.vals[b.dataset.f]=null;commit();}
  else if(act==='openanimator'){if(a&&a.type==='animctrl')animrWin.ctrl=a.id;openAnimator();}
  else if(act==='openanimwin')openAnimWin();
  else if(act==='setc'){const inp=$(`#insp-body [data-bind="${b.dataset.b}"]`);if(inp){inp.value=b.dataset.c;inp.dispatchEvent(new Event('change',{bubbles:true}));}}
  else if(act==='clrclip'&&o&&o.audio){o.audio.clip=null;commit();}
  else if(act==='preview'&&ZTG.audio){ZTG.audio.play(b.dataset.k,{volume:.9});}
  else if(act==='volnew'&&o&&o.vol){o.vol.profile='Global Volume Profile';log('info','lProfile');commit();}
  else if(act==='rmov'&&o&&o.vol){delete o.vol.ov[b.dataset.k];commit();}
  else if(act==='addov'&&o&&o.vol&&o.vol.profile){const r=b.getBoundingClientRect();
    openMenu([{tk:'postProc',k:'postproc',children:Object.keys(OV).sort((x,y)=>t(OVK[x]).localeCompare(t(OVK[y]))).map(k=>({tk:OVK[k],k:'ov_'+k,dis:!!o.vol.ov[k],fn:()=>{o.vol.ov[k]=Object.fromEntries(OV[k]);commit();}}))}],r.left,r.bottom+2);}
  else if(act==='rmlist'&&o){const s=o.scripts[+b.dataset.i];if(s&&s.vals&&s.vals[b.dataset.f])s.vals[b.dataset.f].splice(+b.dataset.k,1);commit();}});

function commit(){animRecordHook();trackUndo();S.dirty=snapJson()!==S.savedJson;updateFlags();renderChrome();renderHier();renderProj();renderInsp();renderGuide();updateGlow();updateHint();saveProgress();if(!animBusy){if(floatId==='anim')openAnimWin(true);else if(floatId==='animator')openAnimator(true);}}

/* ---------- Hierarchy / Project events ---------- */
$('#hier-body').addEventListener('click',e=>{
  const tw=e.target.closest('[data-tw]');if(tw){const id=+tw.dataset.tw;S.collapsed=S.collapsed.includes(id)?S.collapsed.filter(x=>x!==id):[...S.collapsed,id];renderHier();saveProgress();return;}
  const r=e.target.closest('[data-obj]');if(!r)return;const id=+r.dataset.obj;
  if(e.metaKey||e.ctrlKey)toggleSel(id);else if(e.shiftKey)rangeSel(id);else select('obj',id);commit();});
const hierMenu=(x,y,e)=>{const r=e.target.closest&&e.target.closest('[data-obj]');
  if(r){const id=+r.dataset.obj;if(!selIds().includes(id))select('obj',id);commit();openMenu([{tk:'dup',k:'dup',fn:duplicateSel},{tk:'copy',k:'copy',fn:copySel},{tk:'paste',k:'paste',fn:pasteClip,dis:!clip},{tk:'del',k:'del',fn:deleteSel}],x,y);}
  else openMenu(items3D(),x,y);};
$('#hier-body').addEventListener('contextmenu',e=>{e.preventDefault();hierMenu(e.clientX,e.clientY,e);});longPress($('#hier-body'),(x,y,e)=>hierMenu(x,y,e));
$('#hier-plus').dataset.plus='1';$('#hier-plus').addEventListener('click',e=>{const r=e.currentTarget.getBoundingClientRect();openMenu(items3D(),r.left,r.bottom+2);});
$('#proj-plus').dataset.plus='1';$('#proj-plus').addEventListener('click',e=>{const r=e.currentTarget.getBoundingClientRect();openMenu(itemsCreate(),r.left,r.bottom+2);});
// 双击自己判断：第一下点击会重画项目窗口，浏览器的 dblclick 事件因此不会触发
let lastTile={id:null,t:0};
function openAsset(a){if(a.type==='folder'){S.cwd=a.id;select(null);commit();}else if(a.type==='script')openCode(a.id);else if(a.type==='animctrl'){animrWin.ctrl=a.id;openAnimator();}}
$('#proj-body').addEventListener('click',e=>{
  const ln=e.target.closest('[data-sa]');if(ln){openCode(+ln.dataset.sa,+ln.dataset.sl);return;}
  const bt=e.target.closest('[data-act="cwd"]');if(bt){S.cwd=+bt.dataset.id;commit();return;}
  const el=e.target.closest('[data-asset]');if(!el||S.renaming===+el.dataset.asset)return;
  const id=+el.dataset.asset,now=performance.now();
  if(lastTile.id===id&&now-lastTile.t<450){lastTile={id:null,t:0};const a=asset(id);if(a)openAsset(a);return;}
  lastTile={id,t:now};select('asset',id);commit();});
const projMenu=(x,y,e)=>{const el=e.target.closest&&e.target.closest('[data-asset]');
  if(el){const a=asset(+el.dataset.asset);select('asset',a.id);commit();openMenu([{tk:'rename',k:'rename',fn:()=>{S.renaming=a.id;commit();setTimeout(()=>{const r=$('#rn');if(r){r.focus();r.select();}},0);}},{tk:'del',k:'del',fn:deleteSel}],x,y);}
  else openMenu(itemsCreate(),x,y);};
$('#proj-body').addEventListener('contextmenu',e=>{if(S.ptab!=='project')return;e.preventDefault();projMenu(e.clientX,e.clientY,e);});longPress($('#proj-body'),(x,y,e)=>{if(S.ptab==='project')projMenu(x,y,e);});
function finishRename(id,val,cancel){if(S.renaming!==id)return;S.renaming=null;const a=asset(id);if(a&&!cancel&&val.trim()){a.name=val.trim().replace(/[\/\\]/g,'');if(a.type==='script')a.comp=null;}commit();}
$('#proj-body').addEventListener('keydown',e=>{if(e.target.id!=='rn')return;const id=S.renaming;if(e.key==='Enter')finishRename(id,e.target.value,false);else if(e.key==='Escape')finishRename(id,'',true);});
$('#proj-body').addEventListener('focusout',e=>{if(e.target.id==='rn')finishRename(S.renaming,e.target.value,false);});
$$('[data-ptab]').forEach(b=>b.addEventListener('click',()=>{S.ptab=b.dataset.ptab;renderProj();updateHint();}));
$$('[data-tab]').forEach(b=>b.addEventListener('click',()=>{S.tab=b.dataset.tab;winClick(S.tab);commit();}));
$$('#tools button').forEach(b=>b.addEventListener('click',()=>{S.tool=b.dataset.tool;commit();}));
['#p-hier','#p-insp','#p-proj'].forEach(s=>$(s).addEventListener('pointerdown',()=>winClick(s==='#p-hier'?'hier':s==='#p-insp'?'insp':'proj'),true));

/* ---------- pointer drag & drop between panels ---------- */
let dcand=null,dgo=false,ghost=null,suppress=false;
document.addEventListener('pointerdown',e=>{if(e.button!==0)return;const d=e.target.closest('[data-drag]');if(!d||e.target.tagName==='INPUT'){dcand=null;return;}
  dcand={pl:d.dataset.drag,x:e.clientX,y:e.clientY,label:(d.textContent||'').trim()||'item'};});
document.addEventListener('pointermove',e=>{if(!dcand)return;
  if(!dgo&&Math.hypot(e.clientX-dcand.x,e.clientY-dcand.y)>6){dgo=true;ghost=document.createElement('div');ghost.className='ghost';ghost.textContent=dcand.label;document.body.appendChild(ghost);}
  if(dgo){ghost.style.left=(e.clientX+12)+'px';ghost.style.top=(e.clientY+12)+'px';$$('.dropping').forEach(x=>x.classList.remove('dropping'));
    const el=document.elementFromPoint(e.clientX,e.clientY);const dz=el&&el.closest('[data-drop]');if(dz&&dz.dataset.drop!=='scene'&&dz.dataset.drop!=='hier'&&dz.dataset.drop!=='proj')dz.classList.add('dropping');}});
function endDnD(e,ok){if(dgo){suppress=true;setTimeout(()=>suppress=false,0);$$('.dropping').forEach(x=>x.classList.remove('dropping'));if(ghost){ghost.remove();ghost=null;}
    if(ok){const el=document.elementFromPoint(e.clientX,e.clientY);performDrop(dcand.pl,el,e.clientX,e.clientY);}}dcand=null;dgo=false;}
document.addEventListener('pointerup',e=>endDnD(e,true),true);document.addEventListener('pointercancel',e=>endDnD(e,false),true);
document.addEventListener('click',e=>{if(suppress){e.stopPropagation();e.preventDefault();}},true);
function performDrop(pl,tgt,x,y){const [kind,ids]=pl.split(':');const id=+ids;const dz=tgt&&tgt.closest('[data-drop]');if(!dz)return;const dv=dz.dataset.drop;
  if(kind==='asset'){const a=asset(id);if(!a)return;
    if(dv.startsWith('alist:')){const [,oid,si,fid]=dv.split(':');const host=obj(+oid),s=host&&host.scripts[+si];if(!s)return;
      if(a.type!=='itemdata'){log('warn','lWrongRef','ItemData');toast(t('lWrongRef','ItemData'));commit();return;}
      s.vals=s.vals||{};(s.vals[fid]=s.vals[fid]||[]).push(a.id);commit();return;}
    if(dv==='objs'){const os=selObjs().filter(isRender);if(a.type!=='material'||!os.length){log('warn','lBadDrop');commit();return;}os.forEach(q=>{q.mat=a.id;});log('info','lMatMany',a.name,os.length);toast(t('lMatMany',a.name,os.length));commit();return;}
    if(dv.startsWith('aclip:')){const host=obj(+dv.slice(6));if(!host||!host.audio)return;if(a.type!=='audio'){log('warn','lWrongRef','AudioClip');toast(t('lWrongRef','AudioClip'));commit();return;}host.audio.clip=a.id;commit();return;}
    if(dv.startsWith('obj:'))applyAsset(a,obj(+dv.slice(4)));
    else if(dv==='scene'&&S.tab==='scene'){const r=cv.getBoundingClientRect(),cx=x-r.left,cy=y-r.top;
      if(a.type==='prefab')spawn(a,groundPt(cx,cy)||[0,.5,0]);else if(a.type==='model')spawnModel(a,groundPt(cx,cy));else{const hit=pickAt(cx,cy);if(hit)applyAsset(a,obj(hit));else log('warn','lMissed'),commit();}}
    else if((dv==='hier'||dv==='hroot')&&a.type==='prefab')spawn(a);
    else if((dv==='hier'||dv==='hroot')&&a.type==='model')spawnModel(a);
    else if(dv.startsWith('folder:'))moveAsset(a,+dv.slice(7));else if(dv==='proj')moveAsset(a,S.cwd);}
  else if(kind==='obj'){const o=obj(id);if(!o)return;
    // 把物体拖到脚本的 Transform 格子上 = 指定 target
    if(dv.startsWith('ref:')){const [,oid,si,fid]=dv.split(':');const host=obj(+oid),s=host&&host.scripts[+si];if(!s)return;
      const f=(tmplOf(asset(s.asset)||{name:''}).fields||[]).find(x=>x.id===fid);
      if(f&&f.type==='ref'&&f.accept&&o.type!==f.accept){log('warn','lWrongRef',REF_NAME[f.accept]);toast(t('lWrongRef',REF_NAME[f.accept]));commit();return;}
      s.vals=s.vals||{};s.vals[fid]=o.id;commit();return;}
    const movers=selIds().includes(o.id)?topSel():[o];
    // 在层级里把物体拖到另一个物体上 = 变成它的子物体；拖到空白处 = 取消父子关系
    if(dv.startsWith('obj:')){const p=obj(+dv.slice(4));if(!p||movers.includes(p))return;
      if(movers.some(m=>isAnc(m,p))){log('warn','lParentLoop');commit();return;}
      movers.forEach(m=>{if(m.parent!==p.id)reparent(m,p);});S.collapsed=S.collapsed.filter(c=>c!==p.id);commit();}
    else if(dv==='hier'||dv==='hroot'){if(movers.some(m=>m.parent!=null)){movers.forEach(m=>{if(m.parent!=null)reparent(m,null);});commit();}}
    else if(dv.startsWith('folder:'))makePrefab(o,+dv.slice(7));else if(dv==='proj')makePrefab(o,S.cwd);}}

/* ---------- code window：不挡住编辑器的浮动窗口，可以填空、保存、看报错；播放时正在执行的行会亮 ---------- */
let codeId=null,codePos=[0,0],codeHot=0,updCount=0;
function readDrafts(){const out={};$$('#modal .blank').forEach(el=>{out[el.dataset.b]=el.value;});return out;}
function codeIsDirty(){if(codeId==null)return false;const a=asset(codeId);if(!a)return false;const d=readDrafts();return Object.keys(d).some(k=>d[k]!==String((a.blanks||{})[k]||''));}
function explainHTML(a,line){const tm=tmplOf(a);
  if(line!=null){const l=tm.lines[line];const errs=(a.comp&&!a.comp.ok?a.comp.errs:[]).filter(e=>e.line===line);
    const code=l?l.c.map(s=>typeof s==='string'?s:'___').join('').trim():'';
    return `${code?`<b style="font-family:var(--mono)">${esc(code)}</b><br>`:''}${errs.map(e=>`<div class="errt">error ${e.code}: ${esc(e.en)}</div>${ZTG.lang()==='zh'?`<div>${t('errMeaning')}${esc(e.zh)}</div>`:''}`).join('')}${l&&l.x?esc(L(l.x)):''}`;}
  if(!a.comp)return esc(t('codeTip'));
  return a.comp.ok?`<span class="okc">${esc(t('compiledOk'))}</span>`:`<span class="bad">${esc(t('compiledErr',a.comp.errs.length))}</span>`;}
function openCode(id,line){const a=asset(id);if(!a)return;const tm=tmplOf(a);S.flags.viewed=true;
  const vals=codeId===id?readDrafts():Object.assign({},a.blanks||{});codeId=id;
  const errs=a.comp&&!a.comp.ok?a.comp.errs:[];const bdef=b=>tm.blanks.find(x=>x.id===b);
  const m=$('#modal');
  m.innerHTML=`<div class="win" role="dialog" aria-label="${t('codeAria')}" style="transform:translate(${codePos[0]}px,${codePos[1]}px)"><div class="ph cph"><b>${esc(a.name)}.cs</b><span class="cdirty" id="cdirty" hidden>● ${t('unsaved')}</span><span class="sp"></span><span class="crun" id="crun"></span><span class="cvs">${t('codeVs')}</span><button class="btn csave" id="csave">${t('codeSave')}</button><button class="ibtn" id="mclose" aria-label="${t('close')}">✕</button></div>
  ${!LIB()[a.name]?`<div class="warnbox" style="margin:8px 12px 0">${esc(t('codeMismatch',a.name))}</div>`:''}
  <div class="code">${tm.lines.map((l,i)=>`<div class="cl${l.x?' has':''}${errs.some(e=>e.line===i)?' bad':''}" data-i="${i}"><span class="n">${i+1}</span><pre>${l.c.map(seg=>{if(typeof seg==='string')return esc(seg);const d=bdef(seg.b),v=String(vals[seg.b]||'');
      return `<input class="blank${errs.some(e=>e.b===seg.b)?' err':''}" data-b="${seg.b}" value="${esc(v)}" size="${Math.max(d.w,v.length+1)}" spellcheck="false" autocomplete="off" aria-label="${esc(L(d.tip))}" title="${esc(L(d.tip))}">`;}).join('')||' '}</pre></div>`).join('')}</div>
  <div class="explain" id="explain">${explainHTML(a,line)}</div></div>`;
  m.classList.add('show');
  $('#mclose').onclick=closeCode;$('#csave').onclick=saveCode;
  const code=$('.code',m);
  code.addEventListener('click',e=>{if(e.target.closest('.blank'))return;const r=e.target.closest('.cl');if(!r)return;$$('.cl.on',m).forEach(x=>x.classList.remove('on'));r.classList.add('on');$('#explain').innerHTML=explainHTML(a,+r.dataset.i);});
  code.addEventListener('input',e=>{const el=e.target.closest('.blank');if(!el)return;el.size=Math.max(bdef(el.dataset.b).w,el.value.length+1);$('#cdirty').hidden=!codeIsDirty();updateHint();});
  code.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.closest('.blank')){e.preventDefault();saveCode();}});
  $('.cph',m).addEventListener('pointerdown',e=>{if(e.target.closest('button'))return;const win=$('.win',m),sx=e.clientX-codePos[0],sy=e.clientY-codePos[1];
    const mv=ev=>{codePos=[ev.clientX-sx,ev.clientY-sy];win.style.transform=`translate(${codePos[0]}px,${codePos[1]}px)`;hKey='';};
    const up=()=>{removeEventListener('pointermove',mv);removeEventListener('pointerup',up);updateHint();};addEventListener('pointermove',mv);addEventListener('pointerup',up);});
  if(line!=null){const r=$(`.cl[data-i="${line}"]`,m);if(r){r.classList.add('on');r.scrollIntoView({block:'center'});}}
  $('#cdirty').hidden=!codeIsDirty();
  commit();}
function saveCode(){if(codeId==null)return;const a=asset(codeId);if(!a)return;
  a.blanks=readDrafts();compileScript(a);if(!a.comp.ok)S.ptab='console';
  const first=a.comp.ok?null:a.comp.errs[0].line;openCode(a.id,first);
  const el=first==null?null:$(`#modal .blank[data-b="${a.comp.errs[0].b}"]`);if(el)el.focus();}
function closeCode(){if(codeId==null)return;const a=asset(codeId);let saved=false;
  if(a&&codeIsDirty()){a.blanks=readDrafts();compileScript(a);saved=true;}
  codeId=null;$('#modal').classList.remove('show');$('#modal').innerHTML='';
  if(saved)commit();else updateHint();}
// 播放时：Update 的每一行一直亮着，按下的键、正在移动的那一行更亮；Start 只在开始时亮一下
function runViz(moving,looking){if(codeId==null)return;const a=asset(codeId);if(!a)return;const tm=tmplOf(a);
  const live=S.playing&&!!LIB()[a.name]&&a.comp&&a.comp.ok&&S.objs.some(o=>o.scripts.some(s=>s.asset===a.id&&s.enabled));const tmn=performance.now();
  $$('#modal .cl').forEach((r,i)=>{const l=tm.lines[i];if(!l)return;
    r.classList.toggle('run',!!(live&&(l.run==='update'||l.run==='move'||l.run==='look')));
    r.classList.toggle('hot',!!(live&&((l.run==='start'&&tmn<codeHot)||(l.run==='trigger'&&tmn<(trigFlash.get(a.id)||0))||(l.key&&keys.has(l.key))||(l.run==='move'&&moving===a.id)||(l.run==='look'&&looking))));});
  const cr=$('#crun');if(cr){const s=live?t('runCount',updCount):'';if(cr.textContent!==s)cr.textContent=s;}}

/* ---------- menus, play, keys ---------- */
const MENUS={
  file:()=>[{tk:'save',k:'save',fn:saveScene},{tk:'saveAs',dis:true},{tk:'exportM',k:'export',fn:exportUnity}],
  edit:()=>[{tk:'undo',k:'undo',fn:undo,dis:!undoS.length||S.playing},{tk:'redo',k:'redo',fn:redo,dis:!redoS.length||S.playing},
    {tk:'dup',k:'dup',fn:duplicateSel,dis:!selIds().length},{tk:'copy',k:'copy',fn:copySel,dis:!selIds().length},{tk:'paste',k:'paste',fn:pasteClip,dis:!clip},{tk:'del',k:'del',fn:deleteSel},
    {tk:'clearPrefs',k:'clearprefs',fn:()=>{prefsSet({});log('info','lPrefsCleared');toast(t('lPrefsCleared'));commit();if(floatId==='prefs')openPrefs();}}],
  go:()=>items3D(),
  window:()=>[{tk:'animationM',k:'animation',children:[{tk:'animWinM',k:'animwin',fn:openAnimWin},{tk:'animatorWinM',k:'animatorwin',fn:openAnimator}]},{tk:'renderingM',k:'rendering',children:[{tk:'lightingM',k:'lighting',fn:openLighting}]},{tk:'libraryM',k:'library',fn:openLibrary},{tk:'snapsM',k:'snaps',fn:openSnaps},{tk:'prefsM',k:'prefs',fn:openPrefs},{tk:'settingsM',k:'settings',fn:openSettings},{tk:'shortcutsM',k:'shortcuts',fn:openShortcuts},{tk:'layouts',k:'layouts',children:[{tk:'default',k:'default',fn:()=>{S.tab='scene';commit();toast(t('layoutReset'));}}]}]};
$$('.mbtn').forEach(b=>b.addEventListener('click',()=>{const was=b.classList.contains('open');closeMenu();if(was)return;const r=b.getBoundingClientRect();b.classList.add('open');openMenu(MENUS[b.dataset.menu](),r.left,r.bottom+2);b.classList.add('open');}));
function startPlay(){if(S.playing)return;
  S.assets.forEach(a=>{const tm=a.type==='script'&&LIB()[a.name];if(tm&&!tm.blanks.length&&!a.comp)compileScript(a);});
  if(compileErrs().length){toast(t('fixBeforePlay'));S.ptab='console';commit();return;}
  S.snap=snapJson();S.playing=true;S.paused=false;S.tab='game';S.flags.played=true;S.flags.playDist=0;vel.clear();playErr.clear();agentState.clear();trigIn=new Set();mdx=mdy=0;updCount=0;codeHot=performance.now()+900;log('info','lPlay');
  // Start()：Debug.Log 把空格里写的那句话打印到控制台，点它会跳到那一行
  for(const o of S.objs)for(const s of o.scripts){const a=asset(s.asset);const tm=a&&LIB()[a.name];if(!s.enabled||!tm||!a.comp||!a.comp.ok)continue;
    const ln=blankPos('msg',{},tm).line;if(ln>=0)S.logs.push({t:now8(),k:'raw',a:[a.comp.rt.msg],type:'info',src:{a:a.id,l:ln}});
    if(tm.kind==='inventory')startInventory(o,s,a,tm);}
  // 键盘焦点不要留在检查器的输入框里，不然 W A S D 会打进输入框
  S.frozen=false;playT=0;simStatic={};stopSounds();walkedNow=new Set();animState.clear();if(document.activeElement&&document.activeElement!==document.body)document.activeElement.blur();for(const o of S.objs)if(o.audio&&o.audio.awake&&o.audio.clip!=null&&isActive(o))playSource(o);
  commit();}
function stopPlay(){if(!S.playing)return;const [objs,prefabs,en]=JSON.parse(S.snap);S.objs=objs;S.prefabs=prefabs;if(en)S.env=en;S.playing=false;S.paused=false;S.frozen=false;stopSounds();
  if(S.flags.hitWall)S.flags.fpsStopped=true;if(S.flags.animLooped)S.flags.animStopped=true;
  if(document.pointerLockElement)document.exitPointerLock();trigIn=new Set();agentState.clear();animState.clear();
  if(S.flags.movedInPlay)S.flags.stopped=true;if(S.flags.fell)S.flags.fellStopped=true;
  if(S.sel&&S.sel.k==='obj'){const ids=selIds().filter(id=>obj(id));if(!ids.length)select(null);else S.multi=ids;}
  lastModel=modelJson();log('info','lStop');commit();}
$('#playbtn').addEventListener('click',()=>S.playing?stopPlay():startPlay());
$('#pausebtn').addEventListener('click',()=>{if(!S.playing)return;S.paused=!S.paused;commit();});
// 每章可以有自己的初始场景（setup），找 Bug 挑战用坏掉的场景
function setupMode(){if(isBugs())CHAP.bugs.setup();else if(isLesson()&&CHAP.setup)CHAP.setup();else return;S.objs.forEach(fixObj);S.savedJson=snapJson();resetUndo();}
function reset(){closeMenu();closeCode();closeFloat();clearProgress();quiz=null;bugHintOpen.clear();init();setupMode();commit();}
const chapTag=()=>MODE==='free'?t('freeTitle'):isBugs()?chapLabel()+' · '+t('bugsTitle'):chapLabel()+' · '+L(CHAP.title);
function enterMode(m){if(MODE===m)return;if(S.playing)stopPlay();closeMenu();closeCode();closeFloat();saveNow();
  MODE=m;setChap();quiz=null;bugHintOpen.clear();hintStep=-1;if(!loadProgress()){init();setupMode();}
  $('#chaptag').textContent=chapTag();commit();}
const doneKey=n=>'ztg.ch'+n+'.done';
function readDone(n){try{return localStorage.getItem(doneKey(n==null?chapKey():n))==='1';}catch(e){return false;}}
function markDone(){try{localStorage.setItem(doneKey(chapKey()),'1');}catch(e){}}
const bugsMode=n=>n==='0'?'bugs':'bugs'+n,bugsId=n=>n==='0'?'chapbugs':'chapbugs'+n;
// 主页：每章显示「开始 / 继续（步骤 n）/ 已完成」；找 Bug 挑战在完成那一章之后解锁
function showHome(){if(S.playing)stopPlay();closeMenu();closeCode();closeFloat();saveNow();
  for(const n of CHAPS){const st=$('#chap'+n+'st'),ch=ZTG.chapters['ch'+n];if(!st||!ch)continue;const d=readDone(n),step=MODE==='ch'+n?S.step:peekStep('ch'+n),mid=step>0&&step<ch.steps.length;
    st.textContent=mid?t('cont',step+1):d?t('doneAgain'):t('start');st.classList.toggle('done',d&&!mid);
    const bb=$('#'+bugsId(n));bb.disabled=!d;bb.classList.toggle('locked',!d);$('#'+bugsId(n)+'st').textContent=d?t('open'):t('lockedChL',ch.label?L(ch.label):t('chN',+n));}
  $('#home').hidden=false;updateHint();}
$('#homebtn').addEventListener('click',showHome);
const openWork=()=>{$('#home').hidden=true;resize();updateHint();};
CHAPS.forEach(n=>{$('#chap'+n).addEventListener('click',()=>{enterMode('ch'+n);if(S.step>=STEPS.length){quiz=null;reset();}openWork();});
  $('#'+bugsId(n)).addEventListener('click',()=>{if(!readDone(n))return;enterMode(bugsMode(n));openWork();});});
$('#chapfree').addEventListener('click',()=>{enterMode('free');openWork();});
$('#resetbtn').addEventListener('click',reset);

$('#cmpbtn').addEventListener('click',()=>{cmp.on=!cmp.on;$('#cmpbtn').classList.toggle('on',cmp.on);$('#cmpx').hidden=!cmp.on;});
$('#cmpx').addEventListener('input',e=>{cmp.x=+e.target.value/100;});
$('#snapbtn').addEventListener('click',takeSnap);
$('#litbtn').addEventListener('click',()=>{sceneLit=!sceneLit;$('#litbtn').classList.toggle('on',sceneLit);});
$('#laybtn').addEventListener('click',()=>{if(S.tab!=='scene'){S.tab='scene';}layoutCheck();});

/* ---------- language ---------- */
function applyStatic(){
  document.title=t('appTitle');
  $$('[data-i18n]').forEach(el=>{el.textContent=el.dataset.n!=null?t(el.dataset.i18n,+el.dataset.n):t(el.dataset.i18n);
    if(el.hasAttribute('data-tip'))el.title=ZTG.lang()==='zh'?ZTG.tl('en',el.dataset.i18n):'';});
  $$('[data-i18n-title]').forEach(el=>{el.title=t(el.dataset.i18nTitle);});
  $$('[data-i18n-aria]').forEach(el=>el.setAttribute('aria-label',t(el.dataset.i18nAria)));
  $('#ch0title').textContent=L(ZTG.chapters.ch0.title);
  $('#ch0desc').textContent=t('ch0desc',ZTG.chapters.ch0.steps.length);
  $('#ch1title').textContent=L(ZTG.chapters.ch1.title);
  $('#ch1desc').textContent=t('ch1desc',ZTG.chapters.ch1.steps.length);
  $('#ch1btitle').textContent=L(ZTG.chapters.ch1b.title);$('#ch1blabel').textContent=L(ZTG.chapters.ch1b.label);$('#chbugs1blabel').textContent=L(ZTG.chapters.ch1b.label);
  $('#ch1bdesc').textContent=t('ch1bdesc',ZTG.chapters.ch1b.steps.length);
  $('#chaptag').textContent=chapTag();
  $$('.langbtn').forEach(b=>{b.textContent=ZTG.lang()==='zh'?'English':'中文';});
}
// 切换语言时，还没改过名字的默认物体（主摄像机、立方体 (1)……）跟着换成新语言的名字
const DEFAULT_NAMES=['nPointLight','nSpotLight','nGlobalVolume','nCamera','nLight','nCube','nPlane','nFolder','nMaterial','nSphere','nCapsule','nCylinder','nQuad','nEmpty','nCanvas','nText','nImage','nSlider','nButton','nEventSystem'];
function renameDefaults(from,to){
  const pairs=DEFAULT_NAMES.map(k=>[ZTG.tl(from,k),ZTG.tl(to,k)]);
  const ren=x=>{const m=/^(.*?)(\s\(\d+\))?$/.exec(x.name);const p=pairs.find(q=>q[0]===m[1]);if(p)x.name=p[1]+(m[2]||'');};
  const renJson=j=>{const d=JSON.parse(j);d.forEach(part=>{if(Array.isArray(part))part.forEach(ren);});return JSON.stringify(d);};
  S.objs.forEach(ren);S.assets.forEach(ren);
  if(S.snap)S.snap=renJson(S.snap);
  undoS=undoS.map(renJson);redoS=redoS.map(renJson);
}
function toggleLang(){
  const from=ZTG.lang(),to=from==='zh'?'en':'zh',wasClean=!S.dirty;
  ZTG.setLang(to);renameDefaults(from,to);lastModel=modelJson();
  if(wasClean)S.savedJson=snapJson();
  closeMenu();applyStatic();commit();
  if(!$('#home').hidden)showHome();
  if(codeId!=null)openCode(codeId);
  if(floatId&&FLOATS[floatId])FLOATS[floatId]();
}
$$('.langbtn').forEach(b=>b.addEventListener('click',toggleLang));

addEventListener('keydown',e=>{
  if(!$('#home').hidden)return;
  if(e.key==='?'&&!/INPUT|TEXTAREA|SELECT/.test((e.target||{}).tagName||'')){openShortcuts();return;}
  const typing=/INPUT|TEXTAREA|SELECT/.test((e.target||{}).tagName||''),mod=e.ctrlKey||e.metaKey,k=e.key.toLowerCase();
  if(mod&&k==='s'){e.preventDefault();if(codeId!=null){saveCode();return;}if(S.playing){toast(t('stopBeforeSave'));return;}saveScene();return;}
  if(e.key==='Escape'){closeMenu();closeCode();closeFloat();return;}
  if(typing)return;
  if(mod&&k==='z'){e.preventDefault();if(e.shiftKey)redo();else undo();return;}
  if(mod&&k==='y'){e.preventDefault();redo();return;}
  if(mod&&k==='d'){e.preventDefault();duplicateSel();return;}
  if(mod&&k==='c'){copySel();return;}
  if(mod&&k==='v'){pasteClip();return;}
  if(mod&&e.shiftKey&&k==='n'){e.preventDefault();createEmpty();return;}
  if(S.playing){if(!e.repeat)pressedNow.add(e.code);keys.add(e.code);if(['KeyW','KeyA','KeyS','KeyD'].includes(e.code))e.preventDefault();return;}
  if('qwer'.includes(k)&&k.length===1&&!mod){S.tool=k;commit();}
  else if(k==='f'){const o=selObj();if(o){V.target=wPos(o);}}
  else if(e.key==='Delete'||e.key==='Backspace'){if(S.sel){e.preventDefault();deleteSel();}}
});
addEventListener('keyup',e=>keys.delete(e.code));addEventListener('blur',()=>keys.clear());

/* ---------- main loop ---------- */
let last=0,lastTick=0;
function frame(ts){const dt=Math.min(.05,(ts-last)/1000||0);last=ts;let moving=false,looking=false;
  if(S.playing)updateSounds();
  if(S.playing&&!S.paused&&!S.frozen){looking=Math.abs(mdx)+Math.abs(mdy)>0;COLS=colList();const r=runScripts(dt);moving=r.moving;
    if(codeId!=null&&r.ran.has(codeId))updCount++;
    runAnimators(dt);COLS=colList();rbPhysics(dt);COLS=colList();if(triggers())S.sig='';}
  else{mdx=mdy=0;}
  draw();runViz(moving,looking);
  // 卡住一段时间，提示自动升一级
  if(isLesson()&&SET.hints!=='always'&&hintLv<2&&S.step<STEPS.length&&$('#home').hidden&&!stepDone(S.step)&&performance.now()-hintT>25000){hintLv++;hintT=performance.now();renderGuide();updateHint();}
  if(ts-lastTick>140){lastTick=ts;if(S.playing||drag){syncInspector();if(S.playing&&S.ptab==='console')renderProj();}checkGuide();updateHint();}
  requestAnimationFrame(frame);}
new ResizeObserver(resize).observe($('#cwrap'));addEventListener('resize',()=>{resize();hKey='';updateHint();});
if(!loadProgress())init();
applyStatic();applyZoom();if(ZTG.audio)ZTG.audio.setMuted(!soundOn);resize();commit();showHome();requestAnimationFrame(frame);
// 桌面 app 里：读版本号；每天最多自动检查一次更新
if(window.ztgApp){ztgApp.info().then(i=>{appVersion=i.version;}).catch(()=>{});const today=new Date().toISOString().slice(0,10);if(lsGet('ztg.updchk')!==today){lsSet('ztg.updchk',today);checkUpdates(false);}}
})();
