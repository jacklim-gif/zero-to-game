// 从零到游戏：编辑器核心（状态、渲染、交互）。
// 章节内容在 chapters/，界面文字在 i18n.js；此文件通过 window.ZTG 把引擎能力暴露给章节文件用。
(()=>{
'use strict';
window.ZTG = window.ZTG || {};
const t=ZTG.t, L=ZTG.L;
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=v=>String(Math.round(v*1000)/1000);
const near=(a,b,e=0.001)=>a.every((v,i)=>Math.abs(v-b[i])<e);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
// 中文模式下，Unity 名词鼠标停留时显示英文原名，方便对照英文版 Unity
const tip=k=>ZTG.lang()==='zh'?` title="${esc(ZTG.tl('en',k))}"`:'';
let uid=1; const nid=()=>uid++;
let S=null;

/* ---------- 3D math (Unity convention: left-handed, Y up, Z forward) ---------- */
function rotV(v,e){let [x,y,z]=v;const [ax,ay,az]=e.map(d=>d*Math.PI/180);
  let c=Math.cos(az),s=Math.sin(az);[x,y]=[x*c-y*s,x*s+y*c];
  c=Math.cos(ax);s=Math.sin(ax);[y,z]=[y*c-z*s,y*s+z*c];
  c=Math.cos(ay);s=Math.sin(ay);[x,z]=[x*c+z*s,-x*s+z*c];return [x,y,z];}
function rotInv(v,e){let [x,y,z]=v;const [ax,ay,az]=e.map(d=>-d*Math.PI/180);
  let c=Math.cos(ay),s=Math.sin(ay);[x,z]=[x*c+z*s,-x*s+z*c];
  c=Math.cos(ax);s=Math.sin(ax);[y,z]=[y*c-z*s,y*s+z*c];
  c=Math.cos(az);s=Math.sin(az);[x,y]=[x*c-y*s,x*s+y*c];return [x,y,z];}
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]], add=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]];
const mul=(a,k)=>[a[0]*k,a[1]*k,a[2]*k], dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const norm=a=>{const l=Math.hypot(a[0],a[1],a[2])||1;return [a[0]/l,a[1]/l,a[2]/l];};
function clipNear(poly,n=0.3){const out=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length];const ia=a[2]>=n,ib=b[2]>=n;
  if(ia)out.push(a);if(ia!==ib){const t=(n-a[2])/(b[2]-a[2]);out.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,n]);}}return out;}
const CUBE_V=[[-.5,-.5,-.5],[.5,-.5,-.5],[.5,.5,-.5],[-.5,.5,-.5],[-.5,-.5,.5],[.5,-.5,.5],[.5,.5,.5],[-.5,.5,.5]];
const CUBE_F=[{i:[4,5,6,7],n:[0,0,1]},{i:[1,0,3,2],n:[0,0,-1]},{i:[5,1,2,6],n:[1,0,0]},{i:[0,4,7,3],n:[-1,0,0]},{i:[3,7,6,2],n:[0,1,0]},{i:[0,1,5,4],n:[0,-1,0]}];
const PLANE_V=[[-5,0,-5],[5,0,-5],[5,0,5],[-5,0,5]], PLANE_F=[{i:[0,1,2,3],n:[0,1,0]}];
const hex2rgb=h=>{const m=/^#?([0-9a-f]{6})$/i.exec(h||'');if(!m)return [200,200,200];const n=parseInt(m[1],16);return [n>>16&255,n>>8&255,n&255];};

/* ---------- state ---------- */
const V={yaw:-28,pitch:26,dist:13,target:[0,.5,0]};
const keys=new Set();
function snapJson(){return JSON.stringify([S.objs,S.prefabs]);}
function mkObj(type,name,pos,scale){const o={id:nid(),type,name,pos:pos||[0,0,0],rot:[0,0,0],scale:scale||[1,1,1],mat:null,prefab:null,scaleOverride:false,scripts:[],rb:null};S.objs.push(o);return o;}
function mkAsset(type,name,parent,extra){const a=Object.assign({id:nid(),type,name,parent:parent==null?S.cwd:parent},extra||{});S.assets.push(a);return a;}
const obj=id=>S.objs.find(o=>o.id===id), asset=id=>S.assets.find(a=>a.id===id);
function init(){
  S={objs:[],prefabs:{},assets:[],sel:null,tool:'w',tab:'scene',cwd:0,ptab:'project',step:0,playing:false,paused:false,snap:null,renaming:null,logs:[],savedJson:'',sig:'',dirty:false,
     flags:{win:[],winMsg:'',moved:false,rotated:false,scaled:false,maxInst:0,wide:false,viewed:false,played:false,playDist:0,movedInPlay:false,stopped:false,fell:false,fellStopped:false,saved:false}};
  mkObj('camera',t('nCamera'),[0,1,-10]);const l=mkObj('light',t('nLight'),[0,3,0]);l.rot=[50,-30,0];
  const f=mkAsset('folder','Scenes',0);mkAsset('scene','SampleScene',f.id);
  S.savedJson=snapJson();log('info','lReady');
}
// 日志存 key + 参数，渲染时才翻译，切换语言后旧日志也会跟着变
function log(type,k,...a){S.logs.push({t:new Date().toTimeString().slice(0,8),k,a,type});}
const selObj=()=>S.sel&&S.sel.k==='obj'?obj(S.sel.id):null;
const selAsset=()=>S.sel&&S.sel.k==='asset'?asset(S.sel.id):null;
const effScale=o=>o.prefab&&!o.scaleOverride&&S.prefabs[o.prefab]?S.prefabs[o.prefab].scale:o.scale;
const matOf=o=>o.mat?asset(o.mat):null;
const P=()=>S.objs.find(o=>o.name.trim().toLowerCase()==='player');
const FL=()=>S.objs.find(o=>o.name.trim().toLowerCase()==='floor');
const mats=()=>S.assets.filter(a=>a.type==='material');
function select(k,id){S.sel=k?{k,id}:null;}

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
  const kids=it.children?`<span>›</span><div class="cmsub">${menuHTML(it.children)}</div>`:'';
  return `<div class="cmi${it.dis?' dis':''}${it.children?' hasc':''}" data-i="${i}" data-k="${it.k||''}"${tip(it.tk)}>${esc(t(it.tk))}${kids}</div>`;}).join('');}
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

/* ---------- creation actions ---------- */
function create3D(kind){const o=kind==='cube'?mkObj('cube',t('nCube')):mkObj('plane',t('nPlane'));select('obj',o.id);log('info','lCreated',o.name);toast(t('created',o.name));commit();}
const items3D=()=>[{tk:'go3d',k:'go3d',children:[{tk:'cube',k:'cube',fn:()=>create3D('cube')},{tk:'plane',k:'plane',fn:()=>create3D('plane')}]}];
function createAsset(kind){
  if(S.ptab!=='project')S.ptab='project';
  const a=kind==='folder'?mkAsset('folder',t('nFolder')):kind==='material'?mkAsset('material',t('nMaterial'),null,{color:'#ffffff'}):mkAsset('script','NewBehaviourScript');
  S.renaming=a.id;select('asset',a.id);commit();
  setTimeout(()=>{const r=$('#rn');if(r){r.focus();r.select();}},0);}
const itemsCreate=()=>[{tk:'create',k:'create',children:[{tk:'folderM',k:'folder',fn:()=>createAsset('folder')},{tk:'materialM',k:'mat',fn:()=>createAsset('material')},{tk:'scriptM',k:'script',fn:()=>createAsset('script')}]}];
const itemsComp=()=>[{tk:'physics',k:'physics',children:[{tk:'rigidbodyM',k:'rigidbody',fn:()=>addRigidbody(selObj())}]}];
function deleteSel(){const o=selObj(),a=selAsset();
  if(o){S.objs=S.objs.filter(x=>x!==o);log('info','lDeleted',o.name);select(null);}
  else if(a&&a.type!=='scene'){const kill=new Set([a.id]);let ch=true;while(ch){ch=false;S.assets.forEach(x=>{if(!kill.has(x.id)&&kill.has(x.parent)){kill.add(x.id);ch=true;}});}
    S.assets=S.assets.filter(x=>!kill.has(x.id));S.objs.forEach(x=>{if(kill.has(x.mat))x.mat=null;x.scripts=x.scripts.filter(s=>!kill.has(s.asset));});select(null);}
  commit();}
function saveScene(){S.savedJson=snapJson();S.flags.saved=true;log('info','lSaved');toast(t('saved'));commit();}

function makePrefab(o,folder){
  if(o.prefab){toast(t('alreadyPrefab',o.name));return;}
  if(o.type!=='cube'&&o.type!=='plane'){log('warn','lOnlyPrefab');commit();return;}
  const pid=nid();const a=mkAsset('prefab',o.name,folder,{prefabId:pid});
  S.prefabs[pid]={id:pid,assetId:a.id,name:o.name,type:o.type,scale:effScale(o).slice(),mat:o.mat,rot:o.rot.slice()};
  o.prefab=pid;o.scaleOverride=false;log('info','lPrefabMade',o.name,a.name);toast(t('nowPrefab',o.name));commit();}
function spawn(a,at){const pf=S.prefabs[a.prefabId];if(!pf)return;
  const n=S.objs.filter(o=>o.prefab===pf.id).length;
  const o=mkObj(pf.type,pf.name+' ('+n+')',at||[0,.5,0]);o.mat=pf.mat;o.prefab=pf.id;o.rot=pf.rot.slice();select('obj',o.id);
  log('info','lInst',o.name);commit();}
const addScript=(o,a)=>o.scripts.push({asset:a.id,speed:5,enabled:true,seq:nid()});
function addRigidbody(o){if(!o)return;
  if(o.type!=='cube')log('warn','lRbOnlyCube');
  else if(o.rb)log('warn','lHasRb',o.name);
  else{o.rb={useGravity:true,isKinematic:false,seq:nid()};log('info','lAddedRb',o.name);toast(t('addedRb',o.name));}
  commit();}
function applyAsset(a,o){
  if(!a||!o)return;
  if(a.type==='material'){if(o.type==='cube'||o.type==='plane'){o.mat=a.id;log('info','lMat',a.name,o.name);toast(t('applied',a.name,o.name));}else log('warn','lNoRenderer',o.name);}
  else if(a.type==='script'){
    if(a.name!=='PlayerMove'){log('error','lScriptErr',a.name);S.ptab='console';toast(t('seeConsole'));}
    else if(o.scripts.some(s=>s.asset===a.id))log('warn','lHasScript',o.name);
    else{addScript(o,a);select('obj',o.id);log('info','lAddedScript',o.name);toast(t('addedScript',o.name));}
  }else log('warn','lBadDrop');
  commit();}
function moveAsset(a,folderId){if(a.id===folderId)return;let c=folderId;while(c){if(c===a.id)return;c=(asset(c)||{}).parent;}a.parent=folderId;commit();}

/* ---------- physics (Play 模式下才跑，和真 Unity 一样) ---------- */
// 只有挂了 Rigidbody 的方块受重力；地板只认没有旋转的 Plane（Mesh Collider）。
const vel=new Map();
function physics(dt){
  const planes=S.objs.filter(p=>p.type==='plane'&&near(p.rot,[0,0,0],.5));
  for(const o of S.objs){
    if(o.type!=='cube'||!o.rb||!o.rb.useGravity||o.rb.isKinematic)continue;
    const half=.5*Math.abs(effScale(o)[1]);let ground=-Infinity;
    for(const p of planes){const s=effScale(p);
      if(Math.abs(o.pos[0]-p.pos[0])<=5*Math.abs(s[0])&&Math.abs(o.pos[2]-p.pos[2])<=5*Math.abs(s[2])&&o.pos[1]-half>=p.pos[1]-.05)ground=Math.max(ground,p.pos[1]);}
    let v=(vel.get(o.id)||0)-9.81*dt,y=o.pos[1]+v*dt;
    if(y-half<=ground){y=ground+half;v=0;}
    o.pos[1]=y;vel.set(o.id,v);
    if(y<-3)S.flags.fell=true;
  }
}

/* ---------- Scene rendering ---------- */
const cv=$('#cv'),ctx=cv.getContext('2d');let CW=300,CH=200,DPR=1,LV=null,faces=[],icons=[],handles=[];
function sceneCam(){const rot=[V.pitch,V.yaw,0];const f=rotV([0,0,1],rot);return {pos:sub(V.target,mul(f,V.dist)),rot,fov:60};}
function activeCam(){if(S.tab==='game'){const c=S.objs.find(o=>o.type==='camera');return c?{pos:c.pos,rot:c.rot,fov:60}:null;}return sceneCam();}
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
  const toV=p=>rotInv(sub(p,cam.pos),cam.rot);const pr=v=>[CW/2+v[0]/v[2]*f,CH/2-v[1]/v[2]*f];
  LV={cam,f};
  const light=S.objs.find(o=>o.type==='light');const Ld=norm(mul(light?rotV([0,0,1],light.rot):[.3,-.8,.5],-1));
  const sel=selObj();
  for(const o of S.objs){
    if(o.type!=='cube'&&o.type!=='plane')continue;
    const sc=effScale(o),m=matOf(o),rgb=m?hex2rgb(m.color):[205,205,205];
    const V3=o.type==='cube'?CUBE_V:PLANE_V,F3=o.type==='cube'?CUBE_F:PLANE_F;
    for(const fd of F3){
      const w=fd.i.map(i=>{const l=V3[i];const r=rotV([l[0]*sc[0],l[1]*sc[1],l[2]*sc[2]],o.rot);return add(r,o.pos);});
      const n=rotV(fd.n,o.rot);
      const c=[0,1,2].map(k=>w.reduce((s,p)=>s+p[k],0)/w.length);
      if(o.type==='cube'&&dot(n,sub(cam.pos,c))<=0)continue;
      const cl=clipNear(w.map(toV));if(cl.length<3)continue;
      const sh=.4+.6*Math.abs(dot(n,Ld));
      faces.push({p:cl.map(pr),col:`rgb(${rgb.map(v=>Math.round(v*sh)).join(',')})`,id:o.id,layer:o.type==='plane'?0:1,z:cl.reduce((s,v)=>s+v[2],0)/cl.length,plane:o.type==='plane'});
    }
  }
  faces.sort((a,b)=>a.layer-b.layer||b.z-a.z);
  const paint=fc=>{ctx.beginPath();fc.p.forEach((q,i)=>i?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1]));ctx.closePath();ctx.fillStyle=fc.col;ctx.fill();if(!fc.plane){ctx.strokeStyle='rgba(0,0,0,.28)';ctx.lineWidth=1;ctx.stroke();}};
  faces.filter(x=>x.layer===0).forEach(paint);
  if(!game){ctx.strokeStyle='rgba(255,255,255,.10)';ctx.lineWidth=1;ctx.beginPath();
    for(let i=-12;i<=12;i++){for(const seg of [[[i,0,-12],[i,0,12]],[[-12,0,i],[12,0,i]]]){
      const c=clipNear([toV(seg[0]),toV(seg[1])].map(v=>v),0.05);if(c.length<2)continue;
      const a=pr(c[0]),b=pr(c[1]);ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);}}ctx.stroke();}
  faces.filter(x=>x.layer===1).forEach(paint);
  if(!game&&sel){ctx.strokeStyle='#ff9a1f';ctx.lineWidth=2;faces.filter(x=>x.id===sel.id).forEach(fc=>{ctx.beginPath();fc.p.forEach((q,i)=>i?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1]));ctx.closePath();ctx.stroke();});}
  if(!game){
    for(const o of S.objs){
      if(o.type!=='camera'&&o.type!=='light')continue;
      const v=toV(o.pos);if(v[2]<.1)continue;const c=pr(v);const isSel=sel&&sel.id===o.id;
      ctx.strokeStyle=isSel?'#ff9a1f':'rgba(235,240,248,.85)';ctx.lineWidth=isSel?2:1.2;
      if(o.type==='camera'){
        const cs=[[-.6,-.4],[.6,-.4],[.6,.4],[-.6,.4]].map(q=>toV(add(o.pos,rotV([q[0],q[1],1.3],o.rot))));
        if(cs.every(q=>q[2]>.05)){const q2=cs.map(pr);ctx.beginPath();q2.forEach((q,i)=>i?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1]));ctx.closePath();
          q2.forEach(q=>{ctx.moveTo(c[0],c[1]);ctx.lineTo(q[0],q[1]);});ctx.stroke();}
        ctx.fillStyle=isSel?'#ff9a1f':'#cfd8e6';ctx.fillRect(c[0]-6,c[1]-4,12,8);
      }else{
        const e=toV(add(o.pos,mul(rotV([0,0,1],o.rot),2)));
        if(e[2]>.05){const q=pr(e);ctx.beginPath();ctx.moveTo(c[0],c[1]);ctx.lineTo(q[0],q[1]);ctx.stroke();}
        ctx.fillStyle='#ffd75e';ctx.beginPath();ctx.arc(c[0],c[1],6,0,7);ctx.fill();
      }
      icons.push({id:o.id,x:c[0],y:c[1],r:16});
    }
    if(sel){
      const v=toV(sel.pos);
      if(v[2]>.1){const c=pr(v);
        if(S.tool==='w'){const len=Math.max(.5,v[2]*.2);
          [[1,0,0,'#e5484d'],[0,1,0,'#3fbf6a'],[0,0,1,'#4f8cff']].forEach((a,ai)=>{
            const e=toV(add(sel.pos,mul([a[0],a[1],a[2]],len)));if(e[2]<.05)return;const q=pr(e);
            ctx.strokeStyle=a[3];ctx.fillStyle=a[3];ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(c[0],c[1]);ctx.lineTo(q[0],q[1]);ctx.stroke();
            ctx.beginPath();ctx.arc(q[0],q[1],6,0,7);ctx.fill();handles.push({axis:ai,a:c,b:q,len,dir:[a[0],a[1],a[2]]});});}
        else if(S.tool==='e'){ctx.strokeStyle='#4f8cff';ctx.lineWidth=2;ctx.beginPath();ctx.arc(c[0],c[1],38,0,7);ctx.stroke();}
        else if(S.tool==='r'){ctx.strokeStyle='#e5a13a';ctx.lineWidth=2;ctx.strokeRect(c[0]-24,c[1]-24,48,48);}
      }
    }
  }
}
function rayAt(x,y){if(!LV)return null;const d=rotV(norm([(x-CW/2)/LV.f,-(y-CH/2)/LV.f,1]),LV.cam.rot);return {o:LV.cam.pos,d};}
function axisParam(x,y,P0,A){const r=rayAt(x,y);if(!r)return null;const w0=sub(P0,r.o);const b=dot(A,r.d),d=dot(A,w0),e=dot(r.d,w0);const den=1-b*b;if(Math.abs(den)<1e-4)return null;return (b*e-d)/den;}
function pickAt(x,y){for(const ic of icons){if(Math.hypot(x-ic.x,y-ic.y)<ic.r)return ic.id;}
  for(let i=faces.length-1;i>=0;i--){if(ptInPoly(x,y,faces[i].p))return faces[i].id;}return null;}
function groundAt(x,y){const r=rayAt(x,y);if(!r||r.d[1]>=-.001)return null;const tt=-r.o[1]/r.d[1];return [r.o[0]+r.d[0]*tt,.5,r.o[2]+r.d[2]*tt];}
// 物体中心、W 工具箭头在屏幕上的位置（给教练的拖动演示用）
function objScreen(id){const o=obj(id);if(!o||!LV)return null;const v=rotInv(sub(o.pos,LV.cam.pos),LV.cam.rot);if(v[2]<.1)return null;
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
  if(S.tool==='w'&&o){for(const h of handles){if(segDist(x,y,h.a,h.b)<9){const t0=axisParam(x,y,o.pos,h.dir);if(t0!=null){drag={t:'axis',h,t0,start:o.pos.slice(),o};return;}}}}
  const hit=pickAt(x,y);
  if(hit&&(!o||hit!==o.id)){select('obj',hit);commit();return;}
  if(!hit&&(!o||S.tool==='w')){drag={t:'orbit',x:e.clientX,y:e.clientY};return;}
  if(o&&(S.tool==='e'||S.tool==='r')&&(o.type==='cube'||o.type==='plane'))drag={t:S.tool,x:e.clientX,o,rot:o.rot.slice(),sc:effScale(o).slice()};
});
cv.addEventListener('pointermove',e=>{if(!drag)return;const r=cv.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;
  if(drag.t==='orbit'){V.yaw-=(e.clientX-drag.x)*.4;V.pitch=clamp(V.pitch+(e.clientY-drag.y)*.3,4,86);drag.x=e.clientX;drag.y=e.clientY;}
  else if(drag.t==='axis'){const tt=axisParam(x,y,drag.start,drag.h.dir);if(tt!=null){const d=tt-drag.t0;drag.o.pos=add(drag.start,mul(drag.h.dir,d));if(Math.abs(d)>.05)S.flags.moved=true;refreshLive();}}
  else if(drag.t==='e'){const dx=e.clientX-drag.x;drag.o.rot=[drag.rot[0],drag.rot[1]+dx*.6,drag.rot[2]];if(Math.abs(dx)>6)S.flags.rotated=true;refreshLive();}
  else if(drag.t==='r'){const k=clamp(1+(e.clientX-drag.x)*.01,.1,6);const o=drag.o;if(o.prefab&&!o.scaleOverride){o.scaleOverride=true;}o.scale=drag.sc.map(v=>v*k);if(Math.abs(k-1)>.05)S.flags.scaled=true;refreshLive();}
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
Object.assign(ZTG,{WORDER,WSEL,mkObj,mkAsset,select,P,FL,near,effScale,matOf,mats,asset,makePrefab,spawn,saveScene,ensureMats,instCount,isGray,isOrange,stopPlay,addScript,addRigidbody,hint:HINT});

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
    const pb=el.closest('.pb');if(pb){const q=pb.getBoundingClientRect();if(r.bottom<q.top+2||r.top>q.bottom-2)continue;}
    return {x:r.left+r.width/2,y:r.top+r.height/2,r,el};}
  return null;}
function pickHint(){
  if(!$('#home').hidden||S.step>=STEPS.length)return null;
  if($('#modal').classList.contains('show')){const a=resolvePt('#mclose');return a&&{a,label:t('hClose')};}
  const st=STEPS[S.step];
  if(stepDone(S.step)){const a=resolvePt('#guide-body [data-act="next"]');return a&&{a,label:t('hNext')};}
  if(S.playing&&!st.play){const a=resolvePt('#playbtn');return a&&{a,label:t('hStopFirst')};}
  if(!st.point)return null;
  let list=st.point();list=Array.isArray(list)?list:[list];
  for(const c of list){if(!c)continue;
    if(c.from!=null){const a=resolvePt(c.from),b=resolvePt(c.to);if(a&&b)return {a,b,label:c.label};}
    else{const a=resolvePt(c.at);if(a)return {a,label:c.label};}}
  return null;}
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
  const sel=S.sel&&S.sel.k==='obj'?S.sel.id:-1;
  $('#hier-body').innerHTML=`<div class="hrow root"><span>▾</span>SampleScene${S.dirty?' *':''}</div>`+S.objs.map(o=>`<div class="hrow${o.id===sel?' sel':''}${o.prefab?' pf':''}" data-obj="${o.id}" data-drag="obj:${o.id}" data-drop="obj:${o.id}">${objIcon(o)}<span>${esc(o.name)}</span></div>`).join('');
}
function renderProj(){
  const errs=S.logs.filter(l=>l.type==='error').length;const bd=$('#errbadge');bd.hidden=!errs;bd.textContent=errs;
  $('#ptab-project').classList.toggle('on',S.ptab==='project');$('#ptab-console').classList.toggle('on',S.ptab==='console');
  const b=$('#proj-body');
  if(S.ptab==='console'){b.innerHTML='<div class="console">'+(S.logs.slice(-80).map(l=>`<div class="${l.type}">[${l.t}] ${esc(t(l.k,...l.a))}</div>`).join('')||`<div class="info">${t('consoleEmpty')}</div>`)+'</div>';b.scrollTop=b.scrollHeight;return;}
  const path=[];let c=S.cwd;while(c!==0){const a=asset(c);if(!a)break;path.unshift(a);c=a.parent;}
  const kids=S.assets.filter(a=>a.parent===S.cwd);const sid=S.sel&&S.sel.k==='asset'?S.sel.id:-1;
  b.innerHTML=`<div class="crumbs"><button data-act="cwd" data-id="0">Assets</button>${path.map(a=>`<span>›</span><button data-act="cwd" data-id="${a.id}">${esc(a.name)}</button>`).join('')}</div>
  <div class="grid" id="projgrid" data-drop="proj">${kids.length?kids.map(a=>`<div class="tile${a.id===sid?' sel':''}" data-asset="${a.id}" data-drag="asset:${a.id}" ${a.type==='folder'?`data-drop="folder:${a.id}"`:''}>${assetIcon(a,40)}${S.renaming===a.id?`<input id="rn" value="${esc(a.name)}" maxlength="40" aria-label="${t('renameAria')}">`:`<span class="tn">${esc(a.name)}</span>`}</div>`).join(''):`<p class="empty">${t('emptyFolder')}</p>`}</div>`;
}
function vec(tk,key,arr,extra){const lab=t(tk);return `<div class="vrow"><label${tip(tk)}>${lab}${extra||''}</label><div class="vins">${[0,1,2].map(i=>`<div class="vin"><span class="a${i}">${'XYZ'[i]}</span><input inputmode="decimal" data-bind="${key}.${i}" value="${fmt(arr[i])}" aria-label="${lab} ${'XYZ'[i]}"></div>`).join('')}</div></div>`;}
const kv=(tk,val)=>`<div class="kv"><span${tip(tk)}>${t(tk)}</span><b>${val}</b></div>`;
const ck=(tk,bind,on,dis)=>`<label class="ck"><input type="checkbox" ${bind?`data-bind="${bind}"`:''} ${on?'checked':''} ${dis?'disabled':''}><span${tip(tk)}>${t(tk)}</span></label>`;
const head=tk=>`<h4${tip(tk)}>${t(tk)}</h4>`;
const PAL=['#ffffff','#c9ccd1','#8a8f98','#4a4d52','#1c1d20','#ff8a1f','#e5484d','#f2c230','#3fbf6a','#2c6bd1','#7a4fd0','#8a5a3b'];
function renderInsp(){
  const b=$('#insp-body');const o=selObj(),a=selAsset();
  if(o){const sc=effScale(o),m=matOf(o),mesh=o.type==='cube'||o.type==='plane';
    // 加上去的组件（脚本、刚体）按添加顺序排，和真 Unity 一样
    const added=[...o.scripts.map((s,i)=>({seq:s.seq||0,html:`<div class="comp"><h4><input type="checkbox" data-bind="en.${i}" ${s.enabled?'checked':''} aria-label="${t('enabled')}"> ${t('scriptComp')}</h4><div class="kv">${t('script')}<b>${esc((asset(s.asset)||{}).name||t('missing'))}</b></div><div class="vrow"><label>Speed</label><div class="vin" style="max-width:110px"><input inputmode="decimal" data-bind="spd.${i}" value="${fmt(s.speed)}" aria-label="Speed"></div></div></div>`})),
      ...(o.rb?[{seq:o.rb.seq||0,html:`<div class="comp">${head('rigidbody')}${kv('mass','1')}${ck('useGravity','rbg',o.rb.useGravity)}${ck('isKinematic','rbk',o.rb.isKinematic)}</div>`}]:[])].sort((x,y)=>x.seq-y.seq);
    b.innerHTML=`<div class="comp"><input class="nameinput" data-bind="name" value="${esc(o.name)}" aria-label="${t('objName')}">${o.prefab?`<div style="margin-top:6px;color:var(--accent);font-size:12px">${IC.cube(12)} ${t('prefabInst')}<span class="tag">${esc((S.prefabs[o.prefab]||{}).name||'')}</span></div>`:''}</div>
    <div class="comp">${head('transform')}${vec('position','pos',o.pos)}${vec('rotation','rot',o.rot)}${vec('scale','scl',sc,o.prefab&&!o.scaleOverride?`<span class="tag">${t('fromPrefab')}</span>`:'')}</div>
    ${o.type==='camera'?`<div class="comp">${head('camera')}${kv('clearFlags',t('skybox'))}${kv('fov','60')}${kv('projection',t('perspective'))}</div>`:''}
    ${o.type==='light'?`<div class="comp">${head('light')}${kv('type',t('directional'))}${kv('intensity','1')}</div>`:''}
    ${mesh?`<div class="comp">${head('meshRenderer')}<label style="font-size:11px;color:var(--muted)">${t('matSlot')}</label><div class="slot" data-drop="obj:${o.id}"><span class="sw" style="background:${m?esc(m.color):'#cdcdcd'}"></span>${m?esc(m.name):'Default-Material'}</div></div>
    <div class="comp">${head(o.type==='cube'?'boxCollider':'meshCollider')}${ck('isTrigger',null,false,true)}</div>`:''}
    ${added.map(x=>x.html).join('')}
    <div class="comp addc"><button class="btn" id="addcomp" data-act="addcomp" data-plus="1"${tip('addComponent')}>${t('addComponent')}</button></div>`;
  }else if(a){
    let inner=`<div class="comp"><input class="nameinput" data-bind="aname" value="${esc(a.name)}" aria-label="${t('fileName')}"></div>`;
    if(a.type==='material')inner+=`<div class="comp">${head('material')}${kv('shader','URP / Lit')}<div class="vrow"><label${tip('baseMap')}>${t('baseMap')}</label><div class="slot"><span class="sw" style="background:${esc(a.color)}"></span><span style="font-family:var(--mono)">${esc(a.color)}</span></div></div><div class="pal">${PAL.map(c=>`<button data-act="color" data-c="${c}" style="background:${c}" aria-label="${t('colorAria',c)}"></button>`).join('')}</div><input class="hexin" data-bind="hex" value="${esc(a.color)}" aria-label="${t('hexAria')}" maxlength="7"></div>`;
    else if(a.type==='script')inner+=`<div class="comp">${head('monoscript')}<button class="btn" data-act="openscript" data-id="${a.id}">${t('openCode')}</button>${a.name!=='PlayerMove'?`<div class="warnbox">${esc(t('nameMismatch',a.name))}</div>`:''}</div>`;
    else if(a.type==='prefab'){const pf=S.prefabs[a.prefabId];inner+=`<div class="comp">${head('prefabAsset')}${kv('instances',S.objs.filter(x=>x.prefab===a.prefabId).length)}${pf?vec('pscl','pscl',pf.scale):''}</div>`;}
    else inner+=`<div class="comp">${kv('type',t(a.type==='folder'?'folder':'sceneT'))}</div>`;
    b.innerHTML=inner;
  }else b.innerHTML=`<p class="empty">${t('nothingSel')}</p>`;
}
function syncInspector(){const o=selObj(),a=selAsset();$$('#insp-body [data-bind]').forEach(inp=>{if(document.activeElement===inp)return;const [k,i]=inp.dataset.bind.split('.');let v=null;
  if(o){if(k==='pos')v=o.pos[i];else if(k==='rot')v=o.rot[i];else if(k==='scl')v=effScale(o)[i];else if(k==='spd')v=o.scripts[i]&&o.scripts[i].speed;}
  else if(a&&k==='pscl'&&S.prefabs[a.prefabId])v=S.prefabs[a.prefabId].scale[i];
  if(v!=null&&inp.value!==fmt(v))inp.value=fmt(v);});}
$('#insp-body').addEventListener('change',e=>{const el=e.target,b=el.dataset.bind;if(!b)return;const [k,i]=b.split('.');const o=selObj(),a=selAsset();
  const num=parseFloat(String(el.value).replace(',','.'));
  if(k==='name'&&o)o.name=el.value||o.name;else if(k==='aname'&&a)a.name=(el.value||a.name).replace(/[\/\\]/g,'');
  else if(k==='hex'&&a){if(/^#[0-9a-f]{6}$/i.test(el.value))a.color=el.value.toLowerCase();}
  else if(o&&k==='en'){o.scripts[+i].enabled=el.checked;}
  else if(o&&o.rb&&k==='rbg'){o.rb.useGravity=el.checked;}
  else if(o&&o.rb&&k==='rbk'){o.rb.isKinematic=el.checked;}
  else if(!isNaN(num)){
    if(o&&k==='pos')o.pos[+i]=num;else if(o&&k==='rot')o.rot[+i]=num;
    else if(o&&k==='scl'){if(!o.scaleOverride){o.scale=effScale(o).slice();o.scaleOverride=true;}o.scale[+i]=num;}
    else if(o&&k==='spd')o.scripts[+i].speed=num;
    else if(a&&k==='pscl'&&S.prefabs[a.prefabId])S.prefabs[a.prefabId].scale[+i]=num;}
  commit();});
$('#insp-body').addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.tagName==='INPUT')e.target.blur();});
$('#insp-body').addEventListener('click',e=>{const b=e.target.closest('[data-act]');if(!b)return;const a=selAsset();
  if(b.dataset.act==='color'&&a){a.color=b.dataset.c;commit();}
  else if(b.dataset.act==='openscript')openCode(+b.dataset.id);
  else if(b.dataset.act==='addcomp'){const r=b.getBoundingClientRect();openMenu(itemsComp(),r.left,r.bottom+2);}});

function commit(){S.dirty=snapJson()!==S.savedJson;updateFlags();renderChrome();renderHier();renderProj();renderInsp();renderGuide();updateGlow();updateHint();}

/* ---------- Hierarchy / Project events ---------- */
$('#hier-body').addEventListener('click',e=>{const r=e.target.closest('[data-obj]');if(!r){return;}select('obj',+r.dataset.obj);commit();});
const hierMenu=(x,y,e)=>{const r=e.target.closest&&e.target.closest('[data-obj]');if(r){select('obj',+r.dataset.obj);commit();openMenu([{tk:'del',k:'del',fn:deleteSel}],x,y);}else openMenu(items3D(),x,y);};
$('#hier-body').addEventListener('contextmenu',e=>{e.preventDefault();hierMenu(e.clientX,e.clientY,e);});longPress($('#hier-body'),(x,y,e)=>hierMenu(x,y,e));
$('#hier-plus').dataset.plus='1';$('#hier-plus').addEventListener('click',e=>{const r=e.currentTarget.getBoundingClientRect();openMenu(items3D(),r.left,r.bottom+2);});
$('#proj-plus').dataset.plus='1';$('#proj-plus').addEventListener('click',e=>{const r=e.currentTarget.getBoundingClientRect();openMenu(itemsCreate(),r.left,r.bottom+2);});
$('#proj-body').addEventListener('click',e=>{
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
    else if(dv==='hier'&&a.type==='prefab')spawn(a);
    else if(dv.startsWith('folder:'))moveAsset(a,+dv.slice(7));else if(dv==='proj')moveAsset(a,S.cwd);}
  else if(kind==='obj'){const o=obj(id);if(!o)return;
    if(dv.startsWith('folder:'))makePrefab(o,+dv.slice(7));else if(dv==='proj')makePrefab(o,S.cwd);}}

/* ---------- code viewer ---------- */
const CODE=CHAP.code;
let codeId=null;
function openCode(id){const a=asset(id);if(!a)return;S.flags.viewed=true;codeId=id;
  const m=$('#modal');m.innerHTML=`<div class="win" role="dialog" aria-label="${t('codeAria')}"><div class="ph"><b style="text-transform:none;letter-spacing:0">${esc(a.name)}.cs</b><span class="sp"></span><span style="text-transform:none;letter-spacing:0">${t('codeVs')}</span><button class="ibtn" id="mclose" aria-label="${t('close')}">✕</button></div>
  ${a.name!=='PlayerMove'?`<div class="warnbox" style="margin:8px 12px 0">${esc(t('codeMismatch',a.name))}</div>`:''}
  <div class="code">${CODE.map((l,i)=>`<div class="cl${l[1]?' has':''}" data-i="${i}"><span class="n">${i+1}</span><pre>${esc(l[0])||' '}</pre></div>`).join('')}</div>
  <div class="explain" id="explain">${t('codeTip')}</div></div>`;
  m.classList.add('show');commit();
  $('#mclose').onclick=closeCode;
  $('.code',m).addEventListener('click',e=>{const r=e.target.closest('.cl');if(!r)return;$$('.cl.on',m).forEach(x=>x.classList.remove('on'));const l=CODE[+r.dataset.i];
    if(l[1]){r.classList.add('on');$('#explain').innerHTML=`<b style="font-family:var(--mono)">${esc(l[0].trim())}</b><br>${esc(L(l[1]))}`;}});}
function closeCode(){codeId=null;$('#modal').classList.remove('show');$('#modal').innerHTML='';updateHint();}
$('#modal').addEventListener('pointerdown',e=>{if(e.target.id==='modal')closeCode();});

/* ---------- menus, play, keys ---------- */
const MENUS={
  file:()=>[{tk:'save',k:'save',fn:saveScene},{tk:'saveAs',dis:true}],
  edit:()=>[{tk:'undo',dis:true},{tk:'del',k:'del',fn:deleteSel}],
  go:()=>items3D(),
  window:()=>[{tk:'layouts',k:'layouts',children:[{tk:'default',k:'default',fn:()=>{S.tab='scene';commit();toast(t('layoutReset'));}}]}]};
$$('.mbtn').forEach(b=>b.addEventListener('click',()=>{const was=b.classList.contains('open');closeMenu();if(was)return;const r=b.getBoundingClientRect();b.classList.add('open');openMenu(MENUS[b.dataset.menu](),r.left,r.bottom+2);b.classList.add('open');}));
function startPlay(){if(S.playing)return;closeCode();S.snap=snapJson();S.playing=true;S.paused=false;S.tab='game';S.flags.played=true;S.flags.playDist=0;vel.clear();log('info','lPlay');commit();}
function stopPlay(){if(!S.playing)return;const [objs,prefabs]=JSON.parse(S.snap);S.objs=objs;S.prefabs=prefabs;S.playing=false;S.paused=false;
  if(S.flags.movedInPlay)S.flags.stopped=true;if(S.flags.fell)S.flags.fellStopped=true;
  if(S.sel&&S.sel.k==='obj'&&!obj(S.sel.id))S.sel=null;log('info','lStop');commit();}
$('#playbtn').addEventListener('click',()=>S.playing?stopPlay():startPlay());
$('#pausebtn').addEventListener('click',()=>{if(!S.playing)return;S.paused=!S.paused;commit();});
function reset(){closeMenu();closeCode();init();commit();}
const DONE_KEY='ztg.ch0.done';
function readDone(){try{return localStorage.getItem(DONE_KEY)==='1';}catch(e){return false;}}
function markDone(){try{localStorage.setItem(DONE_KEY,'1');}catch(e){}}
function showHome(){if(S.playing)stopPlay();closeMenu();closeCode();const st=$('#chap0st');const d=readDone();st.textContent=d?t('doneAgain'):(S.step>0?t('cont',S.step+1):t('start'));st.classList.toggle('done',d);$('#home').hidden=false;updateHint();}
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
// 切换语言时，还没改过名字的默认物体（主摄像机、立方体……）跟着换成新语言的名字
const DEFAULT_NAMES=['nCamera','nLight','nCube','nPlane','nFolder','nMaterial'];
function toggleLang(){
  const from=ZTG.lang(),to=from==='zh'?'en':'zh',wasClean=!S.dirty;
  ZTG.setLang(to);
  const pairs=DEFAULT_NAMES.map(k=>[ZTG.tl(from,k),ZTG.tl(to,k)]);
  const ren=x=>{const p=pairs.find(q=>q[0]===x.name);if(p)x.name=p[1];};
  S.objs.forEach(ren);S.assets.forEach(ren);
  if(S.snap){const [o,p]=JSON.parse(S.snap);o.forEach(ren);S.snap=JSON.stringify([o,p]);}
  if(wasClean)S.savedJson=snapJson();
  closeMenu();applyStatic();commit();
  if(!$('#home').hidden)showHome();
  if(codeId!=null)openCode(codeId);
}
$$('.langbtn').forEach(b=>b.addEventListener('click',toggleLang));

addEventListener('keydown',e=>{
  if(!$('#home').hidden)return;
  const typing=/INPUT|TEXTAREA|SELECT/.test((e.target||{}).tagName||'');
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();if(S.playing){toast(t('stopBeforeSave'));return;}saveScene();return;}
  if(e.key==='Escape'){closeMenu();closeCode();return;}
  if(typing)return;
  if(S.playing){keys.add(e.code);if(['KeyW','KeyA','KeyS','KeyD'].includes(e.code))e.preventDefault();return;}
  const k=e.key.toLowerCase();
  if('qwer'.includes(k)&&k.length===1&&!e.ctrlKey&&!e.metaKey){S.tool=k;commit();}
  else if(k==='f'){const o=selObj();if(o){V.target=o.pos.slice();}}
  else if(e.key==='Delete'||e.key==='Backspace'){if(S.sel){e.preventDefault();deleteSel();}}
});
addEventListener('keyup',e=>keys.delete(e.code));addEventListener('blur',()=>keys.clear());

/* ---------- main loop ---------- */
let last=0,lastTick=0;
function frame(ts){const dt=Math.min(.05,(ts-last)/1000||0);last=ts;
  if(S.playing&&!S.paused){
    for(const o of S.objs){for(const sc of o.scripts){const a=asset(sc.asset);if(!sc.enabled||!a||a.name!=='PlayerMove')continue;
      let x=0,z=0;if(keys.has('KeyA'))x-=1;if(keys.has('KeyD'))x+=1;if(keys.has('KeyS'))z-=1;if(keys.has('KeyW'))z+=1;
      if(x||z){const l=Math.hypot(x,z);const d=sc.speed*dt;o.pos[0]+=x/l*d;o.pos[2]+=z/l*d;S.flags.playDist+=d;if(S.flags.playDist>2)S.flags.movedInPlay=true;}}}
    physics(dt);}
  draw();
  if(ts-lastTick>140){lastTick=ts;if(S.playing||drag){syncInspector();}checkGuide();updateHint();}
  requestAnimationFrame(frame);}
new ResizeObserver(resize).observe($('#cwrap'));addEventListener('resize',()=>{resize();hKey='';updateHint();});
init();applyStatic();resize();commit();showHome();requestAnimationFrame(frame);
})();
