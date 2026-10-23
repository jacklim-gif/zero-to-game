// 从零到游戏：编辑器核心（状态、渲染、交互）。
// 章节内容在 chapters/，界面文字在 i18n.js；此文件通过 window.ZTG 把引擎能力暴露给章节文件用。
(()=>{
'use strict';
window.ZTG = window.ZTG || {};
const t=ZTG.t, L=ZTG.L, TERMS=ZTG.terms;
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=v=>String(Math.round(v*1000)/1000);
const near=(a,b,e=0.001)=>a.every((v,i)=>Math.abs(v-b[i])<e);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const rnd=v=>{const r=Math.round(v*1e4)/1e4;return r===0?0:r;};
// Unity 名词：有术语解释的加 data-term（悬停弹出解释），其余在中文模式下用 title 显示英文原名
const TERM_OF={transform:'transform',meshRenderer:'meshRenderer',boxCollider:'collider',meshCollider:'collider',sphereCollider:'collider',capsuleCollider:'collider',
  rigidbody:'rigidbody',camera:'camera',light:'light',material:'material',prefabAsset:'prefab',prefabInst:'prefab',isTrigger:'isTrigger',useGravity:'useGravity',
  isKinematic:'isKinematic',mass:'mass',shader:'shader',baseMap:'baseMap',fov:'fov',monoscript:'script',addComponent:'component'};
const tip=k=>TERM_OF[k]?` data-term="${TERM_OF[k]}"`:(ZTG.lang()==='zh'?` title="${esc(ZTG.tl('en',k))}"`:'');
let uid=1; const nid=()=>uid++;
let S=null;

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

/* ---------- meshes (尺寸和 Unity 一样：Cube 边长 1，Sphere 直径 1，Capsule/Cylinder 高 2，Plane 10×10，Quad 1×1) ---------- */
function finishMesh(m){m.f.forEach(f=>{if(f.n)return;const p=f.i.map(i=>m.v[i]);let n=[0,0,0];
  for(let k=0;k<p.length;k++){const a=p[k],b=p[(k+1)%p.length];n[0]+=(a[1]-b[1])*(a[2]+b[2]);n[1]+=(a[2]-b[2])*(a[0]+b[0]);n[2]+=(a[0]-b[0])*(a[1]+b[1]);}
  n=norm(n);const c=[0,1,2].map(k=>p.reduce((s,q)=>s+q[k],0)/p.length);if(dot(n,c)<0)n=mul(n,-1);f.n=n;});return m;}
function lathe(prof,N){const v=[],f=[];prof.forEach(([r,y])=>{for(let k=0;k<N;k++){const a=k/N*Math.PI*2;v.push([r*Math.cos(a),y,r*Math.sin(a)]);}});
  for(let j=0;j<prof.length-1;j++){if(!prof[j][0]&&!prof[j+1][0])continue;for(let k=0;k<N;k++)f.push({i:[j*N+k,j*N+(k+1)%N,(j+1)*N+(k+1)%N,(j+1)*N+k]});}
  return finishMesh({v,f,smooth:true});}
const arc=(cy,a0,a1,n)=>Array.from({length:n+1},(_,i)=>{const a=(a0+(a1-a0)*i/n)*Math.PI/180;return [rnd(.5*Math.cos(a)),cy+.5*Math.sin(a)];});
const MESH={
  cube:{v:[[-.5,-.5,-.5],[.5,-.5,-.5],[.5,.5,-.5],[-.5,.5,-.5],[-.5,-.5,.5],[.5,-.5,.5],[.5,.5,.5],[-.5,.5,.5]],
        f:[{i:[4,5,6,7],n:[0,0,1]},{i:[1,0,3,2],n:[0,0,-1]},{i:[5,1,2,6],n:[1,0,0]},{i:[0,4,7,3],n:[-1,0,0]},{i:[3,7,6,2],n:[0,1,0]},{i:[0,1,5,4],n:[0,-1,0]}]},
  plane:{v:[[-5,0,-5],[5,0,-5],[5,0,5],[-5,0,5]],f:[{i:[0,1,2,3],n:[0,1,0]}],flat:true},
  quad:{v:[[-.5,-.5,0],[.5,-.5,0],[.5,.5,0],[-.5,.5,0]],f:[{i:[0,1,2,3],n:[0,0,-1]}]},
  sphere:lathe(arc(0,-90,90,8),14),
  capsule:lathe([...arc(-.5,-90,0,4),...arc(.5,0,90,4)],14),
  cylinder:lathe([[0,-1],[.5,-1],[.5,1],[0,1]],14)};
const COLLIDER={cube:'boxCollider',sphere:'sphereCollider',capsule:'capsuleCollider',cylinder:'capsuleCollider',plane:'meshCollider',quad:'meshCollider'};
const HALF={cube:.5,sphere:.5,capsule:1,cylinder:1};
const isMesh=o=>!!MESH[o.type];

/* ---------- state ---------- */
const V={yaw:-28,pitch:26,dist:13,target:[0,.5,0]};
const keys=new Set();
const modelJson=()=>JSON.stringify([S.objs,S.prefabs,S.assets]);
function snapJson(){return JSON.stringify([S.objs,S.prefabs]);}
function mkObj(type,name,pos,scale){const o={id:nid(),type,name,parent:null,pos:pos||[0,0,0],rot:[0,0,0],scale:scale||[1,1,1],mat:null,prefab:null,scaleOverride:false,scripts:[],rb:null};S.objs.push(o);return o;}
function mkAsset(type,name,parent,extra){const a=Object.assign({id:nid(),type,name,parent:parent==null?S.cwd:parent},type==='script'?{blanks:{},comp:null}:{},extra||{});S.assets.push(a);return a;}
const obj=id=>S.objs.find(o=>o.id===id), asset=id=>S.assets.find(a=>a.id===id);
const freshFlags=()=>({win:[],winMsg:'',moved:false,rotated:false,scaled:false,maxInst:0,wide:false,viewed:false,played:false,playDist:0,movedInPlay:false,stopped:false,fell:false,fellStopped:false,saved:false});
function init(){
  S={objs:[],prefabs:{},assets:[],sel:null,multi:[],collapsed:[],tool:'w',tab:'scene',cwd:0,ptab:'project',step:0,playing:false,paused:false,snap:null,renaming:null,logs:[],savedJson:'',sig:'',dirty:false,flags:freshFlags()};
  mkObj('camera',t('nCamera'),[0,1,-10]);const l=mkObj('light',t('nLight'),[0,3,0]);l.rot=[50,-30,0];
  const f=mkAsset('folder','Scenes',0);mkAsset('scene','SampleScene',f.id);
  S.savedJson=snapJson();log('info','lReady');resetUndo();
}
// 日志存 key + 参数，渲染时才翻译，切换语言后旧日志也会跟着变；src 指向脚本里的某一行
const now8=()=>new Date().toTimeString().slice(0,8);
function log(type,k,...a){S.logs.push({t:now8(),k,a,type});}
const effScale=o=>o.prefab&&!o.scaleOverride&&S.prefabs[o.prefab]?S.prefabs[o.prefab].scale:o.scale;
const matOf=o=>o.mat?asset(o.mat):null;
const P=()=>S.objs.find(o=>o.name.trim().toLowerCase()==='player');
const FL=()=>S.objs.find(o=>o.name.trim().toLowerCase()==='floor');
const mats=()=>S.assets.filter(a=>a.type==='material');

/* ---------- parent / child ---------- */
const par=o=>o.parent!=null?obj(o.parent):null;
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
function trackUndo(){if(S.playing)return;const m=modelJson();if(m===lastModel)return;undoS.push(lastModel);if(undoS.length>100)undoS.shift();redoS=[];lastModel=m;}
function restoreModel(m){const [o,p,a]=JSON.parse(m);S.objs=o;S.prefabs=p;S.assets=a;lastModel=m;S.renaming=null;
  if(S.sel){if(S.sel.k==='obj'){const ids=selIds().filter(id=>obj(id));if(!ids.length)select(null);else{S.multi=ids;if(!obj(S.sel.id))S.sel={k:'obj',id:ids[0]};}}else if(!asset(S.sel.id))select(null);}
  if(S.cwd&&!asset(S.cwd))S.cwd=0;}
function undo(){if(S.playing||!undoS.length)return;closeMenu();redoS.push(modelJson());restoreModel(undoS.pop());commit();}
function redo(){if(S.playing||!redoS.length)return;closeMenu();undoS.push(modelJson());restoreModel(redoS.pop());commit();}

/* ---------- 进度保存：关掉 app 再打开，从同一步继续 ---------- */
const SAVE_KEY='ztg.ch0.save';let saveT=0;
function saveProgress(){clearTimeout(saveT);saveT=setTimeout(()=>{if(S.playing)return;
  try{localStorage.setItem(SAVE_KEY,JSON.stringify({v:1,uid,lang:ZTG.lang(),s:{objs:S.objs,prefabs:S.prefabs,assets:S.assets,step:S.step,flags:S.flags,cwd:S.cwd,logs:S.logs.slice(-60),savedJson:S.savedJson,collapsed:S.collapsed}}));}catch(e){}},250);}
function loadProgress(){let d=null;try{d=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');}catch(e){}
  if(!d||d.v!==1||!d.s||!Array.isArray(d.s.objs)||!Array.isArray(d.s.assets))return false;
  init();Object.assign(S,d.s);S.flags=Object.assign(freshFlags(),d.s.flags);S.collapsed=d.s.collapsed||[];uid=Math.max(uid,d.uid||1);
  if(d.lang&&d.lang!==ZTG.lang())renameDefaults(d.lang,ZTG.lang());
  resetUndo();return true;}
function clearProgress(){clearTimeout(saveT);try{localStorage.removeItem(SAVE_KEY);}catch(e){}}

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
  folder:(z,s)=>sv('<path d="M1.5 4.5h5l1.2 1.5h6.8v6.8h-13z"/>',z,s),
  script:(z,s)=>sv('<path d="M3.5 1.5h6l3 3v10h-9z"/><path d="M6 8l-1.5 1.5L6 11M10 8l1.5 1.5L10 11"/>',z,s),
  scene:(z,s)=>sv('<path d="M2 3h12v10H2z"/><path d="M2 10l4-3 3 2 2-1.5 3 2"/>',z,s),
  mat:(z,c)=>`<svg viewBox="0 0 16 16" width="${z||14}" height="${z||14}"><circle cx="8" cy="8" r="6.2" fill="${c||'#fff'}" stroke="rgba(0,0,0,.45)" stroke-width="1.1"/><path d="M4.6 5.4a4.6 4.6 0 0 1 3.4-1.7" stroke="rgba(255,255,255,.75)" stroke-width="1.2" fill="none" stroke-linecap="round"/></svg>`
};
const objIcon=(o,z)=>(IC[o.type]||IC.cube)(z||14,o.prefab?'color:var(--accent)':'');
const assetIcon=(a,z)=>a.type==='material'?IC.mat(z,a.color):a.type==='prefab'?IC.cube(z,'color:var(--accent)'):(IC[a.type]||IC.folder)(z);

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
const SHAPES=['cube','sphere','capsule','cylinder','plane','quad'];
const nameKey=k=>'n'+k[0].toUpperCase()+k.slice(1);
function create3D(kind){const o=mkObj(kind,t(nameKey(kind)));select('obj',o.id);log('info','lCreated',o.name);toast(t('created',o.name));commit();}
function createEmpty(){const o=mkObj('empty',t('nEmpty'));select('obj',o.id);log('info','lCreated',o.name);toast(t('created',o.name));commit();}
const items3D=()=>[{tk:'createEmpty',k:'empty',fn:createEmpty},{tk:'go3d',k:'go3d',children:SHAPES.map(s=>({tk:s,k:s,fn:()=>create3D(s)}))}];
function createAsset(kind){
  if(S.ptab!=='project')S.ptab='project';
  const a=kind==='folder'?mkAsset('folder',t('nFolder')):kind==='material'?mkAsset('material',t('nMaterial'),null,{color:'#ffffff'}):mkAsset('script','NewBehaviourScript');
  S.renaming=a.id;select('asset',a.id);commit();
  setTimeout(()=>{const r=$('#rn');if(r){r.focus();r.select();}},0);}
const itemsCreate=()=>[{tk:'create',k:'create',children:[{tk:'folderM',k:'folder',fn:()=>createAsset('folder')},{tk:'materialM',k:'mat',fn:()=>createAsset('material')},{tk:'scriptM',k:'script',fn:()=>createAsset('script')}]}];
const itemsComp=()=>[{tk:'physics',k:'physics',children:[{tk:'rigidbodyM',k:'rigidbody',fn:()=>addRigidbody(selObj())}]}];
function deleteSel(){const a=selAsset(),tg=topSel();
  if(tg.length){const kill=new Set(tg.flatMap(subtree).map(x=>x.id));S.objs=S.objs.filter(x=>!kill.has(x.id));tg.forEach(o=>log('info','lDeleted',o.name));select(null);}
  else if(a&&a.type!=='scene'){const kill=new Set([a.id]);let ch=true;while(ch){ch=false;S.assets.forEach(x=>{if(!kill.has(x.id)&&kill.has(x.parent)){kill.add(x.id);ch=true;}});}
    S.assets=S.assets.filter(x=>!kill.has(x.id));S.objs.forEach(x=>{if(kill.has(x.mat))x.mat=null;x.scripts=x.scripts.filter(s=>!kill.has(s.asset));});select(null);}
  commit();}
// 复制出来的物体叫 "Cube (1)"、"Cube (2)"，和 Unity 6 一样
function uniqueName(name,pid){const base=name.replace(/\s\(\d+\)$/,'');const sib=S.objs.filter(o=>(o.parent==null?null:o.parent)===(pid==null?null:pid));
  if(!sib.some(o=>o.name.replace(/\s\(\d+\)$/,'')===base))return name;
  let n=0;for(const o of sib){const m=/\s\((\d+)\)$/.exec(o.name);if(m&&o.name.replace(/\s\(\d+\)$/,'')===base)n=Math.max(n,+m[1]);}
  return `${base} (${n+1})`;}
function insertTree(tree,pid,at){const map=new Map();
  const out=tree.map(x=>{const c=JSON.parse(JSON.stringify(x));map.set(x.id,c.id=nid());return c;});
  out.forEach(c=>{if(map.has(c.parent))c.parent=map.get(c.parent);c.scripts=(c.scripts||[]).map(s=>Object.assign({},s,{seq:nid()}));if(c.rb)c.rb=Object.assign({},c.rb,{seq:nid()});
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
  if(!isMesh(o)&&o.type!=='empty'){log('warn','lOnlyPrefab');commit();return;}
  if(kids(o).length){log('warn','lPrefabKids');commit();return;}
  const pid=nid();const a=mkAsset('prefab',o.name,folder,{prefabId:pid});
  S.prefabs[pid]={id:pid,assetId:a.id,name:o.name,type:o.type,scale:effScale(o).slice(),mat:o.mat,rot:o.rot.slice()};
  o.prefab=pid;o.scaleOverride=false;log('info','lPrefabMade',o.name,a.name);toast(t('nowPrefab',o.name));commit();}
function spawn(a,at){const pf=S.prefabs[a.prefabId];if(!pf)return;
  const n=S.objs.filter(o=>o.prefab===pf.id).length;
  const o=mkObj(pf.type,pf.name+' ('+n+')',at||[0,.5,0]);o.mat=pf.mat;o.prefab=pf.id;o.rot=pf.rot.slice();select('obj',o.id);
  log('info','lInst',o.name);commit();}
const addScript=(o,a)=>o.scripts.push({asset:a.id,speed:a.comp&&a.comp.rt?a.comp.rt.speed:5,enabled:true,seq:nid()});
function addRigidbody(o){if(!o)return;
  if(o.type==='plane'||o.type==='quad')log('warn','lRbNoMesh');
  else if(o.rb)log('warn','lHasRb',o.name);
  else{o.rb={useGravity:true,isKinematic:false,seq:nid()};log('info','lAddedRb',o.name);toast(t('addedRb',o.name));}
  commit();}
function applyAsset(a,o){
  if(!a||!o)return;
  if(a.type==='material'){if(isMesh(o)){o.mat=a.id;log('info','lMat',a.name,o.name);toast(t('applied',a.name,o.name));}else log('warn','lNoRenderer',o.name);}
  else if(a.type==='script'){
    if(a.name!==CHAP.script.name){log('error','lScriptErr',a.name);S.ptab='console';toast(t('seeConsole'));}
    else if(!a.comp){log('warn','lNotSaved',a.name);toast(t('lNotSaved',a.name));}
    else if(!a.comp.ok){log('error','lScriptBroken',a.name);S.ptab='console';toast(t('seeConsole'));}
    else if(o.scripts.some(s=>s.asset===a.id))log('warn','lHasScript',o.name);
    else{addScript(o,a);select('obj',o.id);log('info','lAddedScript',o.name);toast(t('addedScript',o.name));}
  }else log('warn','lBadDrop');
  commit();}
function moveAsset(a,folderId){if(a.id===folderId)return;let c=folderId;while(c){if(c===a.id)return;c=(asset(c)||{}).parent;}a.parent=folderId;commit();}

/* ---------- scripts: 编译、报错位置 ---------- */
function assetPath(a){const p=[];let c=a.parent;while(c){const f=asset(c);if(!f)break;p.unshift(f.name);c=f.parent;}return ['Assets',...p,a.name+'.cs'].join('/');}
function blankPos(b,vals){const lines=CHAP.script.lines;for(let i=0;i<lines.length;i++){let col=1;
  for(const seg of lines[i].c){if(typeof seg==='string')col+=seg.length;else if(seg.b===b)return {line:i,col};else col+=String(vals[seg.b]||'').length;}}return {line:0,col:1};}
function compileScript(a){const vals=a.blanks||{};const r=CHAP.script.compile(vals);
  const errs=r.errors.map(e=>Object.assign({},e,blankPos(e.b,vals)));a.comp={ok:!errs.length,errs,rt:r.rt};}
function compileErrs(){const out=[];for(const a of S.assets){if(a.type!=='script'||!a.comp||a.comp.ok)continue;
  for(const e of a.comp.errs)out.push(Object.assign({},e,{a,text:`${assetPath(a)}(${e.line+1},${e.col}): error ${e.code}: ${e.en}`}));}return out;}

/* ---------- physics (Play 模式下才跑，和真 Unity 一样) ---------- */
// 只有挂了 Rigidbody 的物体受重力；有碰撞体的才能站在没有旋转的 Plane 上，没有碰撞体的（空物体）会一直掉。
const vel=new Map();
function physics(dt){
  const floors=S.objs.filter(p=>p.type==='plane'&&near(mEuler(wRot(p)),[0,0,0],.5));
  for(const o of S.objs){
    if(o.parent!=null||!o.rb||!o.rb.useGravity||o.rb.isKinematic)continue;
    const half=HALF[o.type]!=null?HALF[o.type]*Math.abs(effScale(o)[1]):null;let ground=-Infinity;
    if(half!=null)for(const p of floors){const wp=wPos(p),s=wScale(p);
      if(Math.abs(o.pos[0]-wp[0])<=5*Math.abs(s[0])&&Math.abs(o.pos[2]-wp[2])<=5*Math.abs(s[2])&&o.pos[1]-half>=wp[1]-.05)ground=Math.max(ground,wp[1]);}
    let v=(vel.get(o.id)||0)-9.81*dt,y=o.pos[1]+v*dt;
    if(half!=null&&y-half<=ground){y=ground+half;v=0;}
    o.pos[1]=y;vel.set(o.id,v);
    if(y<-3)S.flags.fell=true;
  }
}

/* ---------- Scene rendering ---------- */
const cv=$('#cv'),ctx=cv.getContext('2d');let CW=300,CH=200,DPR=1,LV=null,faces=[],icons=[],handles=[];
function activeCam(){if(S.tab==='game'){const c=S.objs.find(o=>o.type==='camera');return c?{pos:wPos(c),M:wRot(c),fov:60}:null;}
  const M=eulerM([V.pitch,V.yaw,0]);return {pos:sub(V.target,mul(M[2],V.dist)),M,fov:60};}
function resize(){const r=$('#cwrap').getBoundingClientRect();DPR=window.devicePixelRatio||1;CW=Math.max(50,r.width);CH=Math.max(50,r.height);cv.width=CW*DPR;cv.height=CH*DPR;}
function ptInPoly(x,y,p){let c=false;for(let i=0,j=p.length-1;i<p.length;j=i++){if(((p[i][1]>y)!==(p[j][1]>y))&&(x<(p[j][0]-p[i][0])*(y-p[i][1])/(p[j][1]-p[i][1])+p[i][0]))c=!c;}return c;}
function segDist(px,py,a,b){const dx=b[0]-a[0],dy=b[1]-a[1];const l=dx*dx+dy*dy||1;const tt=clamp(((px-a[0])*dx+(py-a[1])*dy)/l,0,1);return Math.hypot(px-(a[0]+tt*dx),py-(a[1]+tt*dy));}
function draw(){
  ctx.setTransform(DPR,0,0,DPR,0,0);const game=S.tab==='game';
  const g=ctx.createLinearGradient(0,0,0,CH);
  if(game){g.addColorStop(0,'#78b0e6');g.addColorStop(1,'#d8eaf8');}else{g.addColorStop(0,'#48536c');g.addColorStop(1,'#2a303d');}
  ctx.fillStyle=g;ctx.fillRect(0,0,CW,CH);
  const cam=activeCam();faces=[];icons=[];handles=[];
  if(!cam){ctx.fillStyle='#fff';ctx.font='14px sans-serif';ctx.textAlign='center';ctx.fillText('No cameras rendering',CW/2,CH/2);LV=null;return;}
  const f=(CH/2)/Math.tan(cam.fov*Math.PI/360);
  const toV=p=>mTV(cam.M,sub(p,cam.pos));const pr=v=>[CW/2+v[0]/v[2]*f,CH/2-v[1]/v[2]*f];
  LV={cam,f};
  const light=S.objs.find(o=>o.type==='light');const Ld=norm(mul(light?mMV(wRot(light),[0,0,1]):[.3,-.8,.5],-1));
  const selSet=new Set(selIds()),sel=selObj();
  for(const o of S.objs){
    const ms=MESH[o.type];if(!ms)continue;
    const m=matOf(o),rgb=m?hex2rgb(m.color):[205,205,205],R=wRot(o),wv=ms.v.map(v=>wPoint(o,v));
    for(const fd of ms.f){
      const w=fd.i.map(i=>wv[i]);const n=norm(mMV(R,fd.n));
      const c=[0,1,2].map(k=>w.reduce((s,p)=>s+p[k],0)/w.length);
      if(!ms.flat&&dot(n,sub(cam.pos,c))<=0)continue;
      const cl=clipNear(w.map(toV));if(cl.length<3)continue;
      const sh=.4+.6*Math.abs(dot(n,Ld));
      faces.push({p:cl.map(pr),col:`rgb(${rgb.map(v=>Math.round(v*sh)).join(',')})`,id:o.id,layer:o.type==='plane'?0:1,z:cl.reduce((s,v)=>s+v[2],0)/cl.length,plane:!!ms.flat,smooth:!!ms.smooth});
    }
  }
  faces.sort((a,b)=>a.layer-b.layer||b.z-a.z);
  const path=fc=>{ctx.beginPath();fc.p.forEach((q,i)=>i?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1]));ctx.closePath();};
  const paint=fc=>{path(fc);ctx.fillStyle=fc.col;ctx.fill();
    if(fc.smooth){ctx.strokeStyle=fc.col;ctx.lineWidth=.8;ctx.stroke();}else if(!fc.plane){ctx.strokeStyle='rgba(0,0,0,.28)';ctx.lineWidth=1;ctx.stroke();}};
  faces.filter(x=>x.layer===0).forEach(paint);
  if(!game){ctx.strokeStyle='rgba(255,255,255,.10)';ctx.lineWidth=1;ctx.beginPath();
    for(let i=-12;i<=12;i++){for(const seg of [[[i,0,-12],[i,0,12]],[[-12,0,i],[12,0,i]]]){
      const c=clipNear([toV(seg[0]),toV(seg[1])],0.05);if(c.length<2)continue;
      const a=pr(c[0]),b=pr(c[1]);ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);}}ctx.stroke();}
  faces.filter(x=>x.layer===1).forEach(paint);
  if(!game&&selSet.size){faces.filter(x=>selSet.has(x.id)).forEach(fc=>{path(fc);ctx.strokeStyle=fc.smooth?'rgba(255,154,31,.55)':'#ff9a1f';ctx.lineWidth=fc.smooth?1:2;ctx.stroke();});}
  if(!game){
    for(const o of S.objs){
      if(o.type!=='camera'&&o.type!=='light')continue;
      const wp=wPos(o),R=wRot(o),v=toV(wp);if(v[2]<.1)continue;const c=pr(v);const isSel=selSet.has(o.id);
      ctx.strokeStyle=isSel?'#ff9a1f':'rgba(235,240,248,.85)';ctx.lineWidth=isSel?2:1.2;
      if(o.type==='camera'){
        const cs=[[-.6,-.4],[.6,-.4],[.6,.4],[-.6,.4]].map(q=>toV(add(wp,mMV(R,[q[0],q[1],1.3]))));
        if(cs.every(q=>q[2]>.05)){const q2=cs.map(pr);ctx.beginPath();q2.forEach((q,i)=>i?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1]));ctx.closePath();
          q2.forEach(q=>{ctx.moveTo(c[0],c[1]);ctx.lineTo(q[0],q[1]);});ctx.stroke();}
        ctx.fillStyle=isSel?'#ff9a1f':'#cfd8e6';ctx.fillRect(c[0]-6,c[1]-4,12,8);
      }else{
        const e=toV(add(wp,mul(mMV(R,[0,0,1]),2)));
        if(e[2]>.05){const q=pr(e);ctx.beginPath();ctx.moveTo(c[0],c[1]);ctx.lineTo(q[0],q[1]);ctx.stroke();}
        ctx.fillStyle='#ffd75e';ctx.beginPath();ctx.arc(c[0],c[1],6,0,7);ctx.fill();
      }
      icons.push({id:o.id,x:c[0],y:c[1],r:16});
    }
    if(sel){
      const sp=wPos(sel),v=toV(sp);
      if(v[2]>.1){const c=pr(v);
        if(S.tool==='w'){const len=Math.max(.5,v[2]*.2);
          [[1,0,0,'#e5484d'],[0,1,0,'#3fbf6a'],[0,0,1,'#4f8cff']].forEach((a,ai)=>{
            const e=toV(add(sp,mul([a[0],a[1],a[2]],len)));if(e[2]<.05)return;const q=pr(e);
            ctx.strokeStyle=a[3];ctx.fillStyle=a[3];ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(c[0],c[1]);ctx.lineTo(q[0],q[1]);ctx.stroke();
            ctx.beginPath();ctx.arc(q[0],q[1],6,0,7);ctx.fill();handles.push({axis:ai,a:c,b:q,len,dir:[a[0],a[1],a[2]]});});}
        else if(S.tool==='e'){ctx.strokeStyle='#4f8cff';ctx.lineWidth=2;ctx.beginPath();ctx.arc(c[0],c[1],38,0,7);ctx.stroke();}
        else if(S.tool==='r'){ctx.strokeStyle='#e5a13a';ctx.lineWidth=2;ctx.strokeRect(c[0]-24,c[1]-24,48,48);}
      }
    }
  }
}
function rayAt(x,y){if(!LV)return null;const d=mMV(LV.cam.M,norm([(x-CW/2)/LV.f,-(y-CH/2)/LV.f,1]));return {o:LV.cam.pos,d};}
function axisParam(x,y,P0,A){const r=rayAt(x,y);if(!r)return null;const w0=sub(P0,r.o);const b=dot(A,r.d),d=dot(A,w0),e=dot(r.d,w0);const den=1-b*b;if(Math.abs(den)<1e-4)return null;return (b*e-d)/den;}
function pickAt(x,y){for(const ic of icons){if(Math.hypot(x-ic.x,y-ic.y)<ic.r)return ic.id;}
  for(let i=faces.length-1;i>=0;i--){if(ptInPoly(x,y,faces[i].p))return faces[i].id;}return null;}
function groundAt(x,y){const r=rayAt(x,y);if(!r||r.d[1]>=-.001)return null;const tt=-r.o[1]/r.d[1];return [r.o[0]+r.d[0]*tt,.5,r.o[2]+r.d[2]*tt];}
// 物体中心、W 工具箭头在屏幕上的位置（给教练的拖动演示用）
function objScreen(id){const o=obj(id);if(!o||!LV)return null;const v=mTV(LV.cam.M,sub(wPos(o),LV.cam.pos));if(v[2]<.1)return null;
  const r=cv.getBoundingClientRect();return {x:r.left+CW/2+v[0]/v[2]*LV.f,y:r.top+CH/2-v[1]/v[2]*LV.f};}
function handleAt(axis){const h=handles.find(x=>x.axis===axis);if(!h)return null;const r=cv.getBoundingClientRect();
  return {a:{x:r.left+h.a[0],y:r.top+h.a[1]},b:{x:r.left+h.b[0],y:r.top+h.b[1]}};}

/* ---------- Scene interaction ---------- */
let drag=null;
cv.addEventListener('contextmenu',e=>e.preventDefault());
cv.addEventListener('pointerdown',e=>{
  winClick(S.tab);if(S.tab==='game')return;
  const r=cv.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;cv.setPointerCapture(e.pointerId);
  const o=selObj();
  if(e.button!==0||S.tool==='q'){drag={t:'orbit',x:e.clientX,y:e.clientY};return;}
  if(S.tool==='w'&&o){for(const h of handles){if(segDist(x,y,h.a,h.b)<9){const st=wPos(o),t0=axisParam(x,y,st,h.dir);
    if(t0!=null){const tg=topSel();drag={t:'axis',h,t0,start:st,tg,starts:new Map(tg.map(q=>[q.id,wPos(q)]))};return;}}}}
  const hit=pickAt(x,y);
  if(hit&&(e.metaKey||e.ctrlKey||e.shiftKey)){toggleSel(hit);commit();return;}
  if(hit&&!selIds().includes(hit)){select('obj',hit);commit();return;}
  if(!hit&&(!o||S.tool==='w')){drag={t:'orbit',x:e.clientX,y:e.clientY};return;}
  if(o&&(S.tool==='e'||S.tool==='r')){const tg=topSel().filter(q=>isMesh(q)||q.type==='empty');
    if(tg.length)drag={t:S.tool,x:e.clientX,tg,rots:new Map(tg.map(q=>[q.id,q.rot.slice()])),scs:new Map(tg.map(q=>[q.id,effScale(q).slice()]))};}
});
cv.addEventListener('pointermove',e=>{if(!drag)return;const r=cv.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;
  if(drag.t==='orbit'){V.yaw-=(e.clientX-drag.x)*.4;V.pitch=clamp(V.pitch+(e.clientY-drag.y)*.3,4,86);drag.x=e.clientX;drag.y=e.clientY;}
  else if(drag.t==='axis'){const tt=axisParam(x,y,drag.start,drag.h.dir);if(tt!=null){const d=tt-drag.t0;drag.tg.forEach(q=>setWorldPos(q,add(drag.starts.get(q.id),mul(drag.h.dir,d))));if(Math.abs(d)>.05)S.flags.moved=true;refreshLive();}}
  else if(drag.t==='e'){const dx=e.clientX-drag.x;drag.tg.forEach(q=>{const r0=drag.rots.get(q.id);q.rot=[r0[0],r0[1]+dx*.6,r0[2]];});if(Math.abs(dx)>6)S.flags.rotated=true;refreshLive();}
  else if(drag.t==='r'){const k=clamp(1+(e.clientX-drag.x)*.01,.1,6);drag.tg.forEach(q=>{if(q.prefab&&!q.scaleOverride)q.scaleOverride=true;q.scale=drag.scs.get(q.id).map(v=>v*k);});if(Math.abs(k-1)>.05)S.flags.scaled=true;refreshLive();}
});
const endDrag=()=>{if(drag&&drag.t!=='orbit')commit();drag=null;};
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
  reach,objScreen,handleAt};

/* 把引擎能力交给 chapters/ 里的章节文件用 */
Object.defineProperty(ZTG,'S',{get:()=>S,configurable:true});
Object.assign(ZTG,{WORDER,WSEL,mkObj,mkAsset,select,P,FL,near,effScale,matOf,mats,asset,makePrefab,spawn,saveScene,ensureMats,instCount,isGray,isOrange,
  stopPlay,addScript,addRigidbody,setParent:reparent,compileScript,closeCode,
  codeOpen:()=>codeId,codeDraft:b=>{const el=$(`#modal .blank[data-b="${b}"]`);return el?el.value:'';},codeDirty:()=>codeIsDirty(),hint:HINT});

const CHAP=ZTG.chapters.ch0;
const STEPS=CHAP.steps;

function stepDone(i){const st=STEPS[i];return st.conds.every(c=>!!c[1]());}
function winClick(key){if(S.step!==0||S.playing)return;const n=WORDER.find(k=>!S.flags.win.includes(k));if(key!==n)return;S.flags.win.push(key);S.flags.winMsg='win_'+key;commit();}
function updateFlags(){const c=instCount();S.flags.maxInst=Math.max(S.flags.maxInst,c);const p=P();
  if(p&&p.prefab&&S.prefabs[p.prefab]&&S.prefabs[p.prefab].scale[0]>=1.5&&c>=3)S.flags.wide=true;}
function renderGuide(){
  const g=$('#guide-body');
  if(S.step>=STEPS.length){markDone();g.innerHTML=`<div class="gbody">${L(CHAP.finish)}</div>`;return;}
  const st=STEPS[S.step];const res=st.conds.map(c=>!!c[1]());const done=res.every(Boolean);
  g.innerHTML=`<div class="gbody"><div class="gstep">${t('stepOf',S.step+1,STEPS.length)}</div><div class="gbar"><i style="width:${(S.step+(done?1:0))/STEPS.length*100}%"></i></div>
  <h2>${esc(L(st.title))}</h2><p>${L(st.body)}</p>${S.step===0&&S.flags.winMsg?`<div class="winmsg">${esc(t(S.flags.winMsg))}</div>`:''}
  <ul class="conds">${st.conds.map((c,i)=>`<li class="${res[i]?'done':''}"><span class="chk"></span><span>${esc(L(c[0]))}</span></li>`).join('')}</ul>
  ${st.hint?`<div class="hint">${esc(L(st.hint))}</div>`:''}${st.note&&done?`<div class="note">${esc(L(st.note))}</div>`:''}
  <div class="gact"><button class="btn primary" data-act="next" ${done?'':'disabled'}>${t(S.step===STEPS.length-1?'finishCh':'next')}</button><button class="btn quiet" data-act="auto">${t('auto')}</button></div></div>`;
  linkTerms($('.gbody',g));
  S.sig=S.step+'|'+res.join('')+'|'+S.flags.winMsg;
}
function updateGlow(){$$('.glow').forEach(e=>e.classList.remove('glow'));if(S.step>=STEPS.length)return;const st=STEPS[S.step];if(S.step>0&&stepDone(S.step))return;
  st.glow().forEach(s=>$$(s).forEach(e=>e.classList.add('glow')));}
function checkGuide(){updateFlags();if(S.step>=STEPS.length)return;const st=STEPS[S.step];const sig=S.step+'|'+st.conds.map(c=>!!c[1]()).join('')+'|'+S.flags.winMsg;
  if(sig!==S.sig){renderGuide();updateGlow();}}
$('#guide-body').addEventListener('click',e=>{const b=e.target.closest('[data-act]');if(!b)return;const a=b.dataset.act;
  if(a==='next'&&!b.disabled){S.step++;S.flags.winMsg='';if(S.step<STEPS.length&&STEPS[S.step].enter)STEPS[S.step].enter();commit();}
  else if(a==='auto'){if(S.playing&&!STEPS[S.step].play)stopPlay();STEPS[S.step].auto();commit();}
  else if(a==='reset')reset();
  else if(a==='home')showHome();});

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
  for(const el of $$(x)){const r=el.getBoundingClientRect();
    if(r.width<1||r.height<1||r.bottom<0||r.right<0||r.top>innerHeight||r.left>innerWidth)continue;
    const box=el.closest('.pb,.code');if(box){const q=box.getBoundingClientRect();if(r.bottom<q.top+2||r.top>q.bottom-2)continue;}
    return {x:r.left+r.width/2,y:r.top+r.height/2,r,el};}
  return null;}
function pickHint(){
  if(!$('#home').hidden||S.step>=STEPS.length)return null;
  const st=STEPS[S.step];
  if(stepDone(S.step)){const a=resolvePt('#guide-body [data-act="next"]');return a&&{a,label:t('hNext')};}
  if(S.playing&&!st.play){const a=resolvePt('#playbtn');return a&&{a,label:t('hStopFirst')};}
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
}
function renderHier(){
  const ids=new Set(selIds()),rows=[];
  const walk=(o,d)=>{const ks=kids(o),col=S.collapsed.includes(o.id);
    rows.push(`<div class="hrow${ids.has(o.id)?' sel':''}${o.prefab?' pf':''}" style="padding-left:${10+(d-1)*14}px" data-obj="${o.id}" data-drag="obj:${o.id}" data-drop="obj:${o.id}"><span class="tw" ${ks.length?`data-tw="${o.id}"`:''}>${ks.length?(col?'▸':'▾'):''}</span>${objIcon(o)}<span>${esc(o.name)}</span></div>`);
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
const PAL=['#ffffff','#c9ccd1','#8a8f98','#4a4d52','#1c1d20','#ff8a1f','#e5484d','#f2c230','#3fbf6a','#2c6bd1','#7a4fd0','#8a5a3b'];
function renderInsp(){
  const b=$('#insp-body');const o=selObj(),a=selAsset(),os=selObjs();
  if(os.length>1){
    b.innerHTML=`<div class="comp"><input class="nameinput" value="—" disabled aria-label="${t('objName')}"><div class="multi">${t('nSelected',os.length)}</div></div>
    <div class="comp">${head('transform')}${vec('position','pos',mixed(os,q=>q.pos))}${vec('rotation','rot',mixed(os,q=>q.rot))}${vec('scale','scl',mixed(os,q=>effScale(q)))}</div>`;
  }else if(o){const sc=effScale(o),m=matOf(o);
    // 加上去的组件（脚本、刚体）按添加顺序排，和真 Unity 一样
    const added=[...o.scripts.map((s,i)=>({seq:s.seq||0,html:`<div class="comp"><h4><input type="checkbox" data-bind="en.${i}" ${s.enabled?'checked':''} aria-label="${t('enabled')}"> ${t('scriptComp')}</h4><div class="kv">${t('script')}<b>${esc((asset(s.asset)||{}).name||t('missing'))}</b></div><div class="vrow"><label>Speed</label><div class="vin" style="max-width:110px"><input inputmode="decimal" data-bind="spd.${i}" value="${fmt(s.speed)}" aria-label="Speed"></div></div></div>`})),
      ...(o.rb?[{seq:o.rb.seq||0,html:`<div class="comp">${head('rigidbody')}${kv('mass','1')}${ck('useGravity','rbg',o.rb.useGravity)}${ck('isKinematic','rbk',o.rb.isKinematic)}</div>`}]:[])].sort((x,y)=>x.seq-y.seq);
    b.innerHTML=`<div class="comp"><input class="nameinput" data-bind="name" value="${esc(o.name)}" aria-label="${t('objName')}">${o.prefab?`<div style="margin-top:6px;color:var(--accent);font-size:12px">${IC.cube(12)} <span${tip('prefabInst')}>${t('prefabInst')}</span><span class="tag">${esc((S.prefabs[o.prefab]||{}).name||'')}</span></div>`:''}</div>
    <div class="comp">${head('transform')}${vec('position','pos',o.pos.map(fmt))}${vec('rotation','rot',o.rot.map(fmt))}${vec('scale','scl',sc.map(fmt),o.prefab&&!o.scaleOverride?`<span class="tag">${t('fromPrefab')}</span>`:'')}</div>
    ${o.type==='camera'?`<div class="comp">${head('camera')}${kv('clearFlags',t('skybox'))}${kv('fov','60')}${kv('projection',t('perspective'))}</div>`:''}
    ${o.type==='light'?`<div class="comp">${head('light')}${kv('type',t('directional'))}${kv('intensity','1')}</div>`:''}
    ${isMesh(o)?`<div class="comp">${head('meshRenderer')}<label style="font-size:11px;color:var(--muted)">${t('matSlot')}</label><div class="slot" data-drop="obj:${o.id}"><span class="sw" style="background:${m?esc(m.color):'#cdcdcd'}"></span>${m?esc(m.name):'Default-Material'}</div></div>
    <div class="comp">${head(COLLIDER[o.type])}${ck('isTrigger',null,false,true)}</div>`:''}
    ${added.map(x=>x.html).join('')}
    <div class="comp addc"><button class="btn" id="addcomp" data-act="addcomp" data-plus="1"${tip('addComponent')}>${t('addComponent')}</button></div>`;
  }else if(a){
    let inner=`<div class="comp"><input class="nameinput" data-bind="aname" value="${esc(a.name)}" aria-label="${t('fileName')}"></div>`;
    if(a.type==='material')inner+=`<div class="comp">${head('material')}${kv('shader','URP / Lit')}<div class="vrow"><label${tip('baseMap')}>${t('baseMap')}</label><div class="slot"><span class="sw" style="background:${esc(a.color)}"></span><span style="font-family:var(--mono)">${esc(a.color)}</span></div></div><div class="pal">${PAL.map(c=>`<button data-act="color" data-c="${c}" style="background:${c}" aria-label="${t('colorAria',c)}"></button>`).join('')}</div><input class="hexin" data-bind="hex" value="${esc(a.color)}" aria-label="${t('hexAria')}" maxlength="7"></div>`;
    else if(a.type==='script'){const st=!a.comp?`<div class="kv">${t('notCompiled')}</div>`:a.comp.ok?`<div class="kv okc">${t('scriptOk')}</div>`:`<div class="kv bad">${t('scriptErrs',a.comp.errs.length)}</div>`;
      inner+=`<div class="comp">${head('monoscript')}${st}<button class="btn" data-act="openscript" data-id="${a.id}">${t('openCode')}</button>${a.name!==CHAP.script.name?`<div class="warnbox">${esc(t('nameMismatch',a.name))}</div>`:''}</div>`;}
    else if(a.type==='prefab'){const pf=S.prefabs[a.prefabId];inner+=`<div class="comp">${head('prefabAsset')}${kv('instances',S.objs.filter(x=>x.prefab===a.prefabId).length)}${pf?vec('pscl','pscl',pf.scale.map(fmt)):''}</div>`;}
    else inner+=`<div class="comp">${kv('type',t(a.type==='folder'?'folder':'sceneT'))}</div>`;
    b.innerHTML=inner;
  }else b.innerHTML=`<p class="empty">${t('nothingSel')}</p>`;
}
function syncInspector(){const o=selObj(),a=selAsset(),tg=selIds().length>1?selObjs():(o?[o]:[]);
  $$('#insp-body [data-bind]').forEach(inp=>{if(document.activeElement===inp)return;const [k,i]=inp.dataset.bind.split('.');let v=null;
    if(tg.length&&(k==='pos'||k==='rot'||k==='scl'))v=mixed(tg,q=>k==='pos'?q.pos:k==='rot'?q.rot:effScale(q))[i];
    else if(o&&k==='spd'&&o.scripts[i])v=fmt(o.scripts[i].speed);
    else if(a&&k==='pscl'&&S.prefabs[a.prefabId])v=fmt(S.prefabs[a.prefabId].scale[i]);
    if(v!=null&&inp.value!==v)inp.value=v;});}
$('#insp-body').addEventListener('change',e=>{const el=e.target,b=el.dataset.bind;if(!b)return;const [k,i]=b.split('.');const o=selObj(),a=selAsset();
  const tg=selIds().length>1?selObjs():(o?[o]:[]);
  const num=parseFloat(String(el.value).replace(',','.'));
  if(k==='name'&&o)o.name=el.value||o.name;else if(k==='aname'&&a)a.name=(el.value||a.name).replace(/[\/\\]/g,'');
  else if(k==='hex'&&a){if(/^#[0-9a-f]{6}$/i.test(el.value))a.color=el.value.toLowerCase();}
  else if(o&&k==='en'){o.scripts[+i].enabled=el.checked;}
  else if(o&&o.rb&&k==='rbg'){o.rb.useGravity=el.checked;}
  else if(o&&o.rb&&k==='rbk'){o.rb.isKinematic=el.checked;}
  else if(!isNaN(num)){
    for(const q of tg){if(k==='pos')q.pos[+i]=num;else if(k==='rot')q.rot[+i]=num;
      else if(k==='scl'){if(!q.scaleOverride){q.scale=effScale(q).slice();q.scaleOverride=true;}q.scale[+i]=num;}}
    if(o&&k==='spd')o.scripts[+i].speed=num;
    else if(a&&k==='pscl'&&S.prefabs[a.prefabId])S.prefabs[a.prefabId].scale[+i]=num;}
  commit();});
$('#insp-body').addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.tagName==='INPUT')e.target.blur();});
$('#insp-body').addEventListener('click',e=>{const b=e.target.closest('[data-act]');if(!b)return;const a=selAsset();
  if(b.dataset.act==='color'&&a){a.color=b.dataset.c;commit();}
  else if(b.dataset.act==='openscript')openCode(+b.dataset.id);
  else if(b.dataset.act==='addcomp'){const r=b.getBoundingClientRect();openMenu(itemsComp(),r.left,r.bottom+2);}});

function commit(){trackUndo();S.dirty=snapJson()!==S.savedJson;updateFlags();renderChrome();renderHier();renderProj();renderInsp();renderGuide();updateGlow();updateHint();saveProgress();}

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
$('#proj-body').addEventListener('click',e=>{
  const ln=e.target.closest('[data-sa]');if(ln){openCode(+ln.dataset.sa,+ln.dataset.sl);return;}
  const bt=e.target.closest('[data-act="cwd"]');if(bt){S.cwd=+bt.dataset.id;commit();return;}
  const el=e.target.closest('[data-asset]');if(el&&S.renaming!==+el.dataset.asset){select('asset',+el.dataset.asset);commit();}});
$('#proj-body').addEventListener('dblclick',e=>{const el=e.target.closest('[data-asset]');if(!el)return;const a=asset(+el.dataset.asset);if(!a)return;
  if(a.type==='folder'){S.cwd=a.id;select(null);commit();}else if(a.type==='script')openCode(a.id);});
const projMenu=(x,y,e)=>{const el=e.target.closest&&e.target.closest('[data-asset]');
  if(el){const a=asset(+el.dataset.asset);select('asset',a.id);commit();openMenu([{tk:'rename',k:'rename',fn:()=>{S.renaming=a.id;commit();setTimeout(()=>{const r=$('#rn');if(r){r.focus();r.select();}},0);}},{tk:'del',k:'del',fn:deleteSel}],x,y);}
  else openMenu(itemsCreate(),x,y);};
$('#proj-body').addEventListener('contextmenu',e=>{if(S.ptab!=='project')return;e.preventDefault();projMenu(e.clientX,e.clientY,e);});longPress($('#proj-body'),(x,y,e)=>{if(S.ptab==='project')projMenu(x,y,e);});
function finishRename(id,val,cancel){if(S.renaming!==id)return;S.renaming=null;const a=asset(id);if(a&&!cancel&&val.trim())a.name=val.trim().replace(/[\/\\]/g,'');commit();}
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
    if(dv.startsWith('obj:'))applyAsset(a,obj(+dv.slice(4)));
    else if(dv==='scene'&&S.tab==='scene'){const r=cv.getBoundingClientRect(),cx=x-r.left,cy=y-r.top;
      if(a.type==='prefab')spawn(a,groundAt(cx,cy)||[0,.5,0]);else{const hit=pickAt(cx,cy);if(hit)applyAsset(a,obj(hit));else log('warn','lMissed'),commit();}}
    else if((dv==='hier'||dv==='hroot')&&a.type==='prefab')spawn(a);
    else if(dv.startsWith('folder:'))moveAsset(a,+dv.slice(7));else if(dv==='proj')moveAsset(a,S.cwd);}
  else if(kind==='obj'){const o=obj(id);if(!o)return;
    const movers=selIds().includes(o.id)?topSel():[o];
    // 在层级里把物体拖到另一个物体上 = 变成它的子物体；拖到空白处 = 取消父子关系
    if(dv.startsWith('obj:')){const p=obj(+dv.slice(4));if(!p||movers.includes(p))return;
      if(movers.some(m=>isAnc(m,p))){log('warn','lParentLoop');commit();return;}
      movers.forEach(m=>{if(m.parent!==p.id)reparent(m,p);});S.collapsed=S.collapsed.filter(c=>c!==p.id);commit();}
    else if(dv==='hier'||dv==='hroot'){if(movers.some(m=>m.parent!=null)){movers.forEach(m=>{if(m.parent!=null)reparent(m,null);});commit();}}
    else if(dv.startsWith('folder:'))makePrefab(o,+dv.slice(7));else if(dv==='proj')makePrefab(o,S.cwd);}}

/* ---------- code window：不挡住编辑器的浮动窗口，可以填空、保存、看报错；播放时正在执行的行会亮 ---------- */
let codeId=null,codePos=[0,0],codeHot=0,updCount=0;
const SC=()=>CHAP.script;
const blankDef=b=>SC().blanks.find(x=>x.id===b);
function readDrafts(){const out={};$$('#modal .blank').forEach(el=>{out[el.dataset.b]=el.value;});return out;}
function codeIsDirty(){if(codeId==null)return false;const a=asset(codeId);if(!a)return false;const d=readDrafts();return Object.keys(d).some(k=>d[k]!==String((a.blanks||{})[k]||''));}
function explainHTML(a,line){const sc=SC();
  if(line!=null){const l=sc.lines[line];const errs=(a.comp&&!a.comp.ok?a.comp.errs:[]).filter(e=>e.line===line);
    const code=l?l.c.map(s=>typeof s==='string'?s:'___').join('').trim():'';
    return `${code?`<b style="font-family:var(--mono)">${esc(code)}</b><br>`:''}${errs.map(e=>`<div class="errt">error ${e.code}: ${esc(e.en)}</div>${ZTG.lang()==='zh'?`<div>${t('errMeaning')}${esc(e.zh)}</div>`:''}`).join('')}${l&&l.x?esc(L(l.x)):''}`;}
  if(!a.comp)return esc(t('codeTip'));
  return a.comp.ok?`<span class="okc">${esc(t('compiledOk'))}</span>`:`<span class="bad">${esc(t('compiledErr',a.comp.errs.length))}</span>`;}
function openCode(id,line){const a=asset(id);if(!a)return;const sc=SC();S.flags.viewed=true;
  const vals=codeId===id?readDrafts():Object.assign({},a.blanks||{});codeId=id;
  const errs=a.comp&&!a.comp.ok?a.comp.errs:[];
  const m=$('#modal');
  m.innerHTML=`<div class="win" role="dialog" aria-label="${t('codeAria')}" style="transform:translate(${codePos[0]}px,${codePos[1]}px)"><div class="ph cph"><b>${esc(a.name)}.cs</b><span class="cdirty" id="cdirty" hidden>● ${t('unsaved')}</span><span class="sp"></span><span class="crun" id="crun"></span><span class="cvs">${t('codeVs')}</span><button class="btn csave" id="csave">${t('codeSave')}</button><button class="ibtn" id="mclose" aria-label="${t('close')}">✕</button></div>
  ${a.name!==sc.name?`<div class="warnbox" style="margin:8px 12px 0">${esc(t('codeMismatch',a.name))}</div>`:''}
  <div class="code">${sc.lines.map((l,i)=>`<div class="cl${l.x?' has':''}${errs.some(e=>e.line===i)?' bad':''}" data-i="${i}"><span class="n">${i+1}</span><pre>${l.c.map(seg=>{if(typeof seg==='string')return esc(seg);const d=blankDef(seg.b),v=String(vals[seg.b]||'');
      return `<input class="blank${errs.some(e=>e.b===seg.b)?' err':''}" data-b="${seg.b}" value="${esc(v)}" size="${Math.max(d.w,v.length+1)}" spellcheck="false" autocomplete="off" aria-label="${esc(L(d.tip))}" title="${esc(L(d.tip))}">`;}).join('')||' '}</pre></div>`).join('')}</div>
  <div class="explain" id="explain">${explainHTML(a,line)}</div></div>`;
  m.classList.add('show');
  $('#mclose').onclick=closeCode;$('#csave').onclick=saveCode;
  const code=$('.code',m);
  code.addEventListener('click',e=>{if(e.target.closest('.blank'))return;const r=e.target.closest('.cl');if(!r)return;$$('.cl.on',m).forEach(x=>x.classList.remove('on'));r.classList.add('on');$('#explain').innerHTML=explainHTML(a,+r.dataset.i);});
  code.addEventListener('input',e=>{const el=e.target.closest('.blank');if(!el)return;el.size=Math.max(blankDef(el.dataset.b).w,el.value.length+1);$('#cdirty').hidden=!codeIsDirty();updateHint();});
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
function runViz(moving){if(codeId==null)return;const a=asset(codeId),sc=SC();if(!a)return;
  const live=S.playing&&a.name===sc.name&&a.comp&&a.comp.ok&&S.objs.some(o=>o.scripts.some(s=>s.asset===a.id&&s.enabled));const tm=performance.now();
  $$('#modal .cl').forEach((r,i)=>{const l=sc.lines[i];if(!l)return;
    r.classList.toggle('run',!!(live&&(l.run==='update'||l.run==='move')));
    r.classList.toggle('hot',!!(live&&((l.run==='start'&&tm<codeHot)||(l.key&&keys.has(l.key))||(l.run==='move'&&moving))));});
  const cr=$('#crun');if(cr){const s=live?t('runCount',updCount):'';if(cr.textContent!==s)cr.textContent=s;}}

/* ---------- menus, play, keys ---------- */
const MENUS={
  file:()=>[{tk:'save',k:'save',fn:saveScene},{tk:'saveAs',dis:true}],
  edit:()=>[{tk:'undo',k:'undo',fn:undo,dis:!undoS.length||S.playing},{tk:'redo',k:'redo',fn:redo,dis:!redoS.length||S.playing},
    {tk:'dup',k:'dup',fn:duplicateSel,dis:!selIds().length},{tk:'copy',k:'copy',fn:copySel,dis:!selIds().length},{tk:'paste',k:'paste',fn:pasteClip,dis:!clip},{tk:'del',k:'del',fn:deleteSel}],
  go:()=>items3D(),
  window:()=>[{tk:'layouts',k:'layouts',children:[{tk:'default',k:'default',fn:()=>{S.tab='scene';commit();toast(t('layoutReset'));}}]}]};
$$('.mbtn').forEach(b=>b.addEventListener('click',()=>{const was=b.classList.contains('open');closeMenu();if(was)return;const r=b.getBoundingClientRect();b.classList.add('open');openMenu(MENUS[b.dataset.menu](),r.left,r.bottom+2);b.classList.add('open');}));
function startPlay(){if(S.playing)return;
  if(compileErrs().length){toast(t('fixBeforePlay'));S.ptab='console';commit();return;}
  S.snap=snapJson();S.playing=true;S.paused=false;S.tab='game';S.flags.played=true;S.flags.playDist=0;vel.clear();updCount=0;codeHot=performance.now()+900;log('info','lPlay');
  // Start()：Debug.Log 把空格里写的那句话打印到控制台，点它会跳到那一行
  const sc=SC(),ln=blankPos('msg',{}).line;
  for(const o of S.objs)for(const s of o.scripts){const a=asset(s.asset);if(s.enabled&&a&&a.name===sc.name&&a.comp&&a.comp.ok)S.logs.push({t:now8(),k:'raw',a:[a.comp.rt.msg],type:'info',src:{a:a.id,l:ln}});}
  commit();}
function stopPlay(){if(!S.playing)return;const [objs,prefabs]=JSON.parse(S.snap);S.objs=objs;S.prefabs=prefabs;S.playing=false;S.paused=false;
  if(S.flags.movedInPlay)S.flags.stopped=true;if(S.flags.fell)S.flags.fellStopped=true;
  if(S.sel&&S.sel.k==='obj'){const ids=selIds().filter(id=>obj(id));if(!ids.length)select(null);else S.multi=ids;}
  lastModel=modelJson();log('info','lStop');commit();}
$('#playbtn').addEventListener('click',()=>S.playing?stopPlay():startPlay());
$('#pausebtn').addEventListener('click',()=>{if(!S.playing)return;S.paused=!S.paused;commit();});
function reset(){closeMenu();closeCode();clearProgress();init();commit();}
const DONE_KEY='ztg.ch0.done';
function readDone(){try{return localStorage.getItem(DONE_KEY)==='1';}catch(e){return false;}}
function markDone(){try{localStorage.setItem(DONE_KEY,'1');}catch(e){}}
function showHome(){if(S.playing)stopPlay();closeMenu();closeCode();const st=$('#chap0st');const d=readDone();
  st.textContent=S.step>0&&S.step<STEPS.length?t('cont',S.step+1):d?t('doneAgain'):t('start');st.classList.toggle('done',d&&!(S.step>0&&S.step<STEPS.length));$('#home').hidden=false;updateHint();}
$('#homebtn').addEventListener('click',showHome);
$('#chap0').addEventListener('click',()=>{if(S.step>=STEPS.length)reset();$('#home').hidden=true;resize();updateHint();});
$('#resetbtn').addEventListener('click',reset);

/* ---------- language ---------- */
function applyStatic(){
  document.title=t('appTitle');
  $$('[data-i18n]').forEach(el=>{el.textContent=el.dataset.n!=null?t(el.dataset.i18n,+el.dataset.n):t(el.dataset.i18n);
    if(el.hasAttribute('data-tip'))el.title=ZTG.lang()==='zh'?ZTG.tl('en',el.dataset.i18n):'';});
  $$('[data-i18n-title]').forEach(el=>{el.title=t(el.dataset.i18nTitle);});
  $$('[data-i18n-aria]').forEach(el=>el.setAttribute('aria-label',t(el.dataset.i18nAria)));
  $('#ch0title').textContent=L(CHAP.title);
  $('#ch0desc').textContent=t('ch0desc',STEPS.length);
  $('#chaptag').textContent=t('chN',0)+' · '+L(CHAP.title);
  $$('.langbtn').forEach(b=>{b.textContent=ZTG.lang()==='zh'?'English':'中文';});
}
// 切换语言时，还没改过名字的默认物体（主摄像机、立方体 (1)……）跟着换成新语言的名字
const DEFAULT_NAMES=['nCamera','nLight','nCube','nPlane','nFolder','nMaterial','nSphere','nCapsule','nCylinder','nQuad','nEmpty'];
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
}
$$('.langbtn').forEach(b=>b.addEventListener('click',toggleLang));

addEventListener('keydown',e=>{
  if(!$('#home').hidden)return;
  const typing=/INPUT|TEXTAREA|SELECT/.test((e.target||{}).tagName||''),mod=e.ctrlKey||e.metaKey,k=e.key.toLowerCase();
  if(mod&&k==='s'){e.preventDefault();if(codeId!=null){saveCode();return;}if(S.playing){toast(t('stopBeforeSave'));return;}saveScene();return;}
  if(e.key==='Escape'){closeMenu();closeCode();return;}
  if(typing)return;
  if(mod&&k==='z'){e.preventDefault();if(e.shiftKey)redo();else undo();return;}
  if(mod&&k==='y'){e.preventDefault();redo();return;}
  if(mod&&k==='d'){e.preventDefault();duplicateSel();return;}
  if(mod&&k==='c'){copySel();return;}
  if(mod&&k==='v'){pasteClip();return;}
  if(mod&&e.shiftKey&&k==='n'){e.preventDefault();createEmpty();return;}
  if(S.playing){keys.add(e.code);if(['KeyW','KeyA','KeyS','KeyD'].includes(e.code))e.preventDefault();return;}
  if('qwer'.includes(k)&&k.length===1&&!mod){S.tool=k;commit();}
  else if(k==='f'){const o=selObj();if(o){V.target=wPos(o);}}
  else if(e.key==='Delete'||e.key==='Backspace'){if(S.sel){e.preventDefault();deleteSel();}}
});
addEventListener('keyup',e=>keys.delete(e.code));addEventListener('blur',()=>keys.clear());

/* ---------- main loop ---------- */
let last=0,lastTick=0;
function frame(ts){const dt=Math.min(.05,(ts-last)/1000||0);last=ts;let moving=false;
  if(S.playing&&!S.paused){const sc=SC();let ran=false;
    for(const o of S.objs){for(const s of o.scripts){const a=asset(s.asset);if(!s.enabled||!a||a.name!==sc.name||!a.comp||!a.comp.ok)continue;ran=true;
      const rt=a.comp.rt,stepT=rt.dt==='dt'?dt:rt.dt;
      let x=0,z=0;if(keys.has('KeyA'))x-=1;if(keys.has('KeyD'))x+=1;if(keys.has('KeyS'))z-=1;if(keys.has('KeyW'))z+=1;
      if(x||z){const l=Math.hypot(x,z);const d=s.speed*stepT;o.pos[0]+=x/l*d;o.pos[2]+=z/l*d;S.flags.playDist+=Math.abs(d);if(S.flags.playDist>2)S.flags.movedInPlay=true;moving=true;}}}
    if(ran)updCount++;
    physics(dt);}
  draw();runViz(moving);
  if(ts-lastTick>140){lastTick=ts;if(S.playing||drag){syncInspector();}checkGuide();updateHint();}
  requestAnimationFrame(frame);}
new ResizeObserver(resize).observe($('#cwrap'));addEventListener('resize',()=>{resize();hKey='';updateHint();});
if(!loadProgress())init();
applyStatic();resize();commit();showHome();requestAnimationFrame(frame);
})();
