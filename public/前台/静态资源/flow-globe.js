import * as THREE from './three.module.js';
import { EffectComposer } from './three-addons/postprocessing/EffectComposer.js';
import { RenderPass } from './three-addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from './three-addons/postprocessing/UnrealBloomPass.js';
import { OrbitControls } from './three-addons/controls/OrbitControls.js';
import { loadGeography, geometryPath, normalizeNode } from './flow-region-map.js';
import FlatRenderer from './flow-flat.js?v=20261020g3';

export const PARAMETERS = Object.freeze({
  baseColor:'#237bb7',activeColor:'#42c8f5',headColor:'#b9f3ff',sourceColor:'#58d5ff',targetColor:'#347cae',
  baseOpacity:.17,baseLineRadius:.007,activeLineRadius:.014,trailLength:.1,
  arcFactor:.1,minArcHeight:.7,maxArcHeight:1.75,emitDuration:.32,arriveDuration:.12,fadeDuration:.55,
  schedulerIntervalMin:.72,schedulerIntervalMax:1.08,maxActiveDesktop:3,maxActiveTablet:2,maxActiveMobile:1,
  bloomThreshold:.84,bloomStrength:.46,bloomRadius:.25,toneMappingExposure:.9
});
const RADIUS=5, MASK_WIDTH=3072, MASK_HEIGHT=1536;
const HUE_KEY='jy-flow-hue-v3', FILTER_KEY='jy-flow-regions-v3', VIEW_KEY='jy-flow-view-v1';
const scopedKey=(base,scope)=>base+':'+scope;
const clamp=THREE.MathUtils.clamp;
const readStorage=(key,fallback)=>{try{return localStorage.getItem(key) ?? fallback;}catch{return fallback;}};
const saveStorage=(key,value)=>{try{localStorage.setItem(key,value);}catch{}};
const storedHue=(key=HUE_KEY)=>{const n=Number(readStorage(key,'210'));return Number.isFinite(n)?clamp(n,0,360):210;};
export function r0(hue) {
  const h=hue/360, make=(s,l)=>new THREE.Color().setHSL(h,s,l,THREE.SRGBColorSpace);
  return {fill:make(.64,.085),fillSecondary:make(.66,.115),fillTertiary:make(.68,.145),border:make(.80,.40),borderHighlight:make(.90,.62),internalBorder:make(.70,.31),grid:make(.58,.17),hover:make(.82,.27),glow:make(.62,.14),hot:make(.88,.46)};
}
export function lonLatVector(lon,lat,radius=RADIUS) {
  const a=THREE.MathUtils.degToRad(lon),b=THREE.MathUtils.degToRad(lat);
  return new THREE.Vector3(radius*Math.cos(b)*Math.cos(a),radius*Math.sin(b),-radius*Math.cos(b)*Math.sin(a));
}
function hasCoordinates(n) {return n && n.lon!==null && n.lat!==null && n.lon!=='' && n.lat!=='' && Number.isFinite(Number(n.lon)) && Number.isFinite(Number(n.lat)) && Math.abs(Number(n.lon))<=180 && Math.abs(Number(n.lat))<=90;}
function timestamp(value) {if(!value)return 0;return Date.parse(String(value).includes('T')?String(value):String(value).replace(' ','T')+'+08:00') || 0;}
function currentMonth() {const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit'}).formatToParts(new Date());return parts.find(p=>p.type==='year').value+'-'+parts.find(p=>p.type==='month').value+'-01 00:00:00';}
function rowsToNodes(rows,server,color) {
  const list=(Array.isArray(rows)?rows:Object.values(rows || {})).map(row=>({name:row['城市名字'] || row['省份'] || row['国家'] || row.name,country:row['国家'],region:row['省份'] || row.region,country_code:row['代码'] || row.country_code,lon:row['经度']!==undefined?row['经度']:row.lon,lat:row['纬度']!==undefined?row['纬度']:row.lat,count:Number(row['请求次数']!==undefined?row['请求次数']:row.count) || 0})).filter(hasCoordinates);
  const max=Math.max(1,...list.map(n=>n.count));
  const lines=hasCoordinates(server)?list.map(n=>({fromName:server.name,toName:n.name,coords:[[Number(server.lon),Number(server.lat)],[Number(n.lon),Number(n.lat)]],value:n.count,weight:n.count/max,color:String(color || '')})):[];
  return {nodes:list,lines};
}
export function adaptUserHttp(http={}) {
  if (Array.isArray(http.nodes)) return http;
  const server=http.server || {};
  const colors=http.colors || {};
  const tot=arr=>arr.reduce((s,n)=>s+n.count,0);
  const out={...http,server};
  if (http.channels && typeof http.channels === 'object') {
    const channels={};
    for (const key of Object.keys(http.channels)) {
      const ch=http.channels[key] || {};
      const built=rowsToNodes(ch.points || ch.data || [],server,ch.color || colors[key]);
      channels[key]={...ch,color:ch.color || colors[key] || '',nodes:built.nodes,lines:Array.isArray(ch.lines)&&ch.lines.length?ch.lines:built.lines,total:Number(ch.total) || tot(built.nodes)};
    }
    out.channels=channels;
    out.colors=colors;
    out.labels=http.labels || {};
    out.active=http.active || 'key';
    if (http.all) {
      const builtAll=rowsToNodes(http.all.points || http.all.data || [],server,'');
      out.all={...http.all,nodes:builtAll.nodes,lines:Array.isArray(http.all.lines)&&http.all.lines.length?http.all.lines:builtAll.lines,total:Number(http.all.total) || tot(builtAll.nodes)};
    }
  }
  const built=rowsToNodes(Array.isArray(http.data)?http.data:Object.values(http.data || {}),server,'');
  out.nodes=built.nodes;
  out.lines=built.lines;
  out.total=Number(http.total) || tot(built.nodes);
  return out;
}
function canvasTexture(canvas) {const texture=new THREE.CanvasTexture(canvas);texture.generateMipmaps=false;texture.minFilter=THREE.LinearFilter;texture.magFilter=THREE.LinearFilter;return texture;}
class RegionMasks {
  constructor(geo,hue) {
    this.geo=geo;this.land=document.createElement('canvas');this.intensity=document.createElement('canvas');
    for(const c of [this.land,this.intensity]){c.width=MASK_WIDTH;c.height=MASK_HEIGHT;}
    this.paths=[...geo.countries,...geo.provinces].map(region=>({...region,path:geometryPath(region.feature.geometry,MASK_WIDTH,MASK_HEIGHT)}));
    this.landTexture=canvasTexture(this.land);this.intensityTexture=canvasTexture(this.intensity);
    this.landPaints=0;this.intensityPaints=0;this.bake(hue);
  }
  bake(hue) {
    const ctx=this.land.getContext('2d'),hsl=(s,l)=>`hsl(${hue},${s*100}%,${l*100}%)`;
    ctx.clearRect(0,0,MASK_WIDTH,MASK_HEIGHT);
    for (const [i,r] of this.paths.entries()) {
      ctx.fillStyle=[hsl(.64,.085),hsl(.66,.115),hsl(.68,.145)][i%3];ctx.fill(r.path,'evenodd');
      ctx.strokeStyle=r.key.startsWith('CN:')?hsl(.70,.31):hsl(.80,.40);ctx.lineWidth=r.key.startsWith('CN:')?1.05:1.2;ctx.stroke(r.path);
      if(!r.key.startsWith('CN:')){ctx.strokeStyle=hsl(.90,.62);ctx.globalAlpha=.10;ctx.lineWidth=.5;ctx.stroke(r.path);ctx.globalAlpha=1;}
    }
    this.landTexture.needsUpdate=true;this.landPaints++;
  }
  paint(counts,disabled) {
    const ctx=this.intensity.getContext('2d');ctx.clearRect(0,0,MASK_WIDTH,MASK_HEIGHT);
    const max=Math.max(1,...counts.values());
    for(const region of this.paths){
      const fallback=region.key.startsWith('CN:')&&!disabled.has('CN')?(counts.get('CN')||0):0;
      const count=disabled.has(region.key)?0:(counts.has(region.key)?counts.get(region.key):fallback);
      ctx.fillStyle=`rgb(${Math.round(count/max*255)},0,0)`;ctx.fill(region.path,'evenodd');
    }
    this.intensityTexture.needsUpdate=true;this.intensityPaints++;
  }
  sample(lon,lat) {const x=clamp(Math.floor((lon+180)/360*MASK_WIDTH),0,MASK_WIDTH-1),y=clamp(Math.floor((90-lat)/180*MASK_HEIGHT),0,MASK_HEIGHT-1);return Array.from(this.intensity.getContext('2d').getImageData(x,y,1,1).data);}
  dispose(){this.landTexture.dispose();this.intensityTexture.dispose();}
}
const MAP_VERTEX=`varying vec2 vUv;varying vec3 vNormal;varying vec3 vView;void main(){vUv=uv;vec4 mv=modelViewMatrix*vec4(position,1.0);vNormal=normalize(normalMatrix*normal);vView=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}`;
const MAP_FRAGMENT=`
uniform sampler2D uLandMask;uniform sampler2D uIntensityMask;
uniform vec3 uHot;uniform vec3 uHover;uniform vec3 uGlow;
uniform vec2 uHoverUv;uniform float uHoverStrength;
varying vec2 vUv;varying vec3 vNormal;varying vec3 vView;
void main(){
  vec4 land=texture2D(uLandMask,vUv);float inten=texture2D(uIntensityMask,vUv).r;
  if(land.a<.01)discard;
  vec3 color=pow(land.rgb,vec3(2.2));
  color=mix(color,uHot,inten*.55);
  float upperGlow=smoothstep(.5,1.,vUv.y)*.08;float lowerShade=smoothstep(.5,0.,vUv.y)*.34;
  color=mix(color,uGlow,upperGlow);color*=1.-lowerShade;
  float hover=(1.-smoothstep(0.,.15,distance(vUv,uHoverUv)))*uHoverStrength;
  color=mix(color,uHover,hover*.16);
  float light=.60+.40*max(dot(normalize(vNormal),normalize(vView)),0.);
  gl_FragColor=vec4(color*light,land.a*.98);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;
function gridGeometry() {
  const vertices=[];
  const add=(a,b)=>vertices.push(...a.toArray(),...b.toArray());
  for(let lon=-180;lon<180;lon+=15)for(let lat=-90;lat<90;lat+=2)add(lonLatVector(lon,lat,RADIUS+.012),lonLatVector(lon,lat+2,RADIUS+.012));
  for(let lat=-75;lat<=75;lat+=15)for(let lon=-180;lon<180;lon+=2)add(lonLatVector(lon,lat,RADIUS+.012),lonLatVector(lon+2,lat,RADIUS+.012));
  return new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
}
function glowTexture() {
  const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d'),g=ctx.createRadialGradient(64,64,0,64,64,64);
  g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.12,'rgba(120,211,255,.95)');g.addColorStop(.35,'rgba(27,132,255,.42)');g.addColorStop(1,'rgba(0,65,180,0)');ctx.fillStyle=g;ctx.fillRect(0,0,128,128);
  const t=canvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}
function labelTexture(text,source) {
  const c=document.createElement('canvas'),dpr=Math.min(devicePixelRatio || 1,2);c.width=176*dpr;c.height=64*dpr;
  const ctx=c.getContext('2d');ctx.scale(dpr,dpr);ctx.shadowColor='rgba(17,128,255,.28)';ctx.shadowBlur=source?10:6;
  ctx.fillStyle=source?'rgba(5,34,72,.92)':'rgba(4,24,52,.82)';ctx.strokeStyle=source?'rgba(62,174,226,.78)':'rgba(44,105,154,.55)';ctx.lineWidth=1;ctx.beginPath();
  if(ctx.roundRect)ctx.roundRect(18,11,140,42,3);else ctx.rect(18,11,140,42);ctx.fill();ctx.stroke();ctx.shadowBlur=0;ctx.fillStyle=source?'#f4fbff':'#c4d6e7';
  let size=source?19:17;do{ctx.font=`${source?600:500} ${size}px "PingFang SC","Microsoft YaHei",sans-serif`;if(ctx.measureText(text).width<=128)break;size--;}while(size>8);
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,88,32);const t=canvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}
class FlowNode {
  constructor(data,source,texture){
    this.data=data;this.source=source;this.group=new THREE.Group();this.animatedGroup=new THREE.Group();this.group.position.copy(lonLatVector(data.lon,data.lat,RADIUS+.055));
    this.normal=this.group.position.clone().normalize();this.group.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),this.normal);this.group.add(this.animatedGroup);
    this.emitStrength=0;this.impactStrength=0;this.seed=Math.random()*Math.PI*2;
    this.glow=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,color:source?PARAMETERS.sourceColor:PARAMETERS.targetColor,transparent:true,opacity:source?.68:.34,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false}));
    this.glow.scale.setScalar(source?1.05:.52);this.animatedGroup.add(this.glow);
    const colors=source?['#38BCE9','#72DBFF','#F8FDFF']:['#2B719D','#397FAE','#C8E9F7'];
    const mat=(color,opacity)=>new THREE.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide});
    this.animatedGroup.add(new THREE.Mesh(new THREE.CircleGeometry(source?.22:.12,28),mat(colors[0],source?.36:.28)));
    const r=source?.27:.155;this.outerRing=new THREE.Mesh(new THREE.RingGeometry(r,r+.018,40),mat(colors[1],source?.62:.46));this.animatedGroup.add(this.outerRing);
    const core=new THREE.Mesh(new THREE.CircleGeometry(source?.105:.06,24),new THREE.MeshBasicMaterial({color:colors[2],side:THREE.DoubleSide}));core.position.z=.02;this.animatedGroup.add(core);
    this.impactRing=new THREE.Mesh(new THREE.RingGeometry(.18,.195,40),mat('#57CEF3',0));this.impactRing.visible=false;this.animatedGroup.add(this.impactRing);
    const text=source?(data.label || '主服务器'):data.name;
    this.label=new THREE.Sprite(new THREE.SpriteMaterial({map:labelTexture(text,source),transparent:true,depthTest:false,depthWrite:false,toneMapped:false}));
    this.label.scale.set(source?1.68:1.28,source?.58:.46,1);this.label.position.copy(this.group.position).addScaledVector(this.normal,.20);this.label.position.y+=source?.53:.38;this.label.renderOrder=20;
  }
  emit(){this.emitStrength=1;}
  impact(){this.impactStrength=1;this.impactRing.visible=true;}
  update(time,dt){
    const pulse=Math.sin(time*(this.source?2:1.2)+this.seed)*(this.source?.025:.008);this.animatedGroup.scale.setScalar(1+pulse+this.impactStrength*.15+this.emitStrength*.03);this.emitStrength=Math.max(0,this.emitStrength-dt/.34);
    this.glow.material.opacity=(this.source?.66:.34)+pulse*1.2+this.emitStrength*.12+this.impactStrength*.28;
    this.impactStrength=Math.max(0,this.impactStrength-dt/.68);this.impactRing.scale.setScalar(.8+(1-this.impactStrength)*.9);this.impactRing.material.opacity=this.impactStrength*.4;this.impactRing.visible=this.impactStrength>.001;
  }
}
const ROUTE_VERTEX=`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const ROUTE_FRAGMENT=`uniform float uProgress;uniform float uTrailLength;uniform float uOpacity;uniform vec3 uColor;uniform vec3 uHeadColor;varying vec2 vUv;void main(){float behindHead=uProgress-vUv.x;float inTrail=step(0.,behindHead)*step(behindHead,uTrailLength);float trail=inTrail*(1.-behindHead/uTrailLength);float head=smoothstep(.025,0.,abs(behindHead));float alpha=(trail*.44+head)*uOpacity;if(alpha<.01)discard;vec3 color=mix(uColor,uHeadColor,head)*(.82+head*1.35);gl_FragColor=vec4(color,alpha);}`;
class GlobeCurve extends THREE.Curve {
  constructor(start,end){super();this.a=start.clone().normalize();this.b=end.clone().normalize();this.angle=Math.acos(clamp(this.a.dot(this.b),-1,1));this.height=clamp(this.angle*RADIUS*PARAMETERS.arcFactor,PARAMETERS.minArcHeight,PARAMETERS.maxArcHeight);}
  getPoint(t,out=new THREE.Vector3()){
    const sin=Math.sin(this.angle);
    if(Math.abs(sin)<.0001)out.copy(this.a).lerp(this.b,t).normalize();else out.copy(this.a).multiplyScalar(Math.sin((1-t)*this.angle)/sin).addScaledVector(this.b,Math.sin(t*this.angle)/sin).normalize();
    return out.multiplyScalar(RADIUS+.075+Math.sin(Math.PI*t)*this.height);
  }
}
class FlowRoute {
  constructor(data,source,target,texture,color){
    this.data=data;this.source=source;this.target=target;this.group=new THREE.Group();this.state='IDLE';this.stateTime=0;this.progress=0;
    this.channel=data.channel || '';this.color=String(color || data.color || '');
    /* 通道配色：卡密=默认青蓝 / 用户=黄 / 云更新=红 */
    const baseC=this.color?new THREE.Color(this.color):new THREE.Color(PARAMETERS.baseColor);
    const activeC=this.color?new THREE.Color(this.color):new THREE.Color(PARAMETERS.activeColor);
    const headC=this.color?new THREE.Color(this.color).lerp(new THREE.Color('#ffffff'),.55):new THREE.Color(PARAMETERS.headColor);
    const baseOpacity=this.color?PARAMETERS.baseOpacity*1.5:PARAMETERS.baseOpacity;
    const coords=data.coords;this.curve=new GlobeCurve(lonLatVector(coords[0][0],coords[0][1]),lonLatVector(coords[1][0],coords[1][1]));
    const speedBase=.85+Number(data.weight || 0)*.6;this.speed=speedBase;this.duration=clamp(2.35+this.curve.angle*RADIUS*.12,2.7,4.4)/this.speed;
    this.base=new THREE.Mesh(new THREE.TubeGeometry(this.curve,80,PARAMETERS.baseLineRadius,4,false),new THREE.MeshBasicMaterial({color:baseC,transparent:true,opacity:baseOpacity,depthWrite:false}));this.group.add(this.base);
    this.material=new THREE.ShaderMaterial({vertexShader:ROUTE_VERTEX,fragmentShader:ROUTE_FRAGMENT,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false,uniforms:{uProgress:{value:0},uTrailLength:{value:PARAMETERS.trailLength},uOpacity:{value:0},uColor:{value:activeC},uHeadColor:{value:headC}}});
    this.group.add(new THREE.Mesh(new THREE.TubeGeometry(this.curve,80,PARAMETERS.activeLineRadius,4,false),this.material));
    this.particle=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,color:headC,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false}));this.particle.scale.set(.2,.2,1);this.group.add(this.particle);
    this.core=new THREE.Mesh(new THREE.SphereGeometry(.022,8,6),new THREE.MeshBasicMaterial({color:headC.clone().multiplyScalar(1.35),toneMapped:false}));this.core.visible=false;this.group.add(this.core);
  }
  start(){if(this.state!=='IDLE'||!this.group.visible)return false;this.state='EMIT';this.stateTime=0;this.move(0);this.source.emit();return true;}
  transition(state){this.state=state;this.stateTime=0;}
  opacity(value){this.material.uniforms.uOpacity.value=value;this.particle.material.opacity=value*.72;this.core.visible=value>.02;}
  move(value){this.progress=clamp(value,0,1);this.material.uniforms.uProgress.value=this.progress;this.curve.getPoint(this.progress,this.particle.position);this.core.position.copy(this.particle.position);}
  reset(){this.opacity(0);this.move(0);this.transition('IDLE');}
  update(dt){
    if(!this.group.visible){this.reset();return;}if(this.state==='IDLE')return;this.stateTime+=dt;
    switch(this.state){
      case 'EMIT':{const p=clamp(this.stateTime/PARAMETERS.emitDuration,0,1);this.opacity(p);if(p>=1)this.transition('TRAVEL');break;}
      case 'TRAVEL':{const p=clamp(this.stateTime/this.duration,0,1);this.opacity(1);this.move(p*p*(3-2*p));if(p>=1){this.target.impact();this.transition('ARRIVE');}break;}
      case 'ARRIVE':this.move(1);if(this.stateTime>=PARAMETERS.arriveDuration)this.transition('FADE');break;
      case 'FADE':{const p=1-clamp(this.stateTime/PARAMETERS.fadeDuration,0,1);this.opacity(p);if(p<=0)this.reset();break;}
    }
  }
}
function disposeTree(tree,sharedTexture){const textures=new Set();tree.traverse(object=>{object.geometry?.dispose();for(const mat of (Array.isArray(object.material)?object.material:[object.material]))if(mat){if(mat.map && mat.map!==sharedTexture)textures.add(mat.map);mat.dispose();}});for(const t of textures)t.dispose();tree.clear();}
function element(tag,className,text){const e=document.createElement(tag);if(className)e.className=className;if(text)e.textContent=text;return e;}
function button(label,icon,onClick){const e=element('button','jy-globe-button');e.type='button';e.title=label;e.setAttribute('aria-label',label);const i=element('i','fas fa-'+icon);i.setAttribute('aria-hidden','true');e.append(i,element('span','',label));e.onclick=onClick;return e;}
export class FlowGlobe {
  constructor(host,options={}) {
    this.host=host;this.options=options;this.full=false;this.dead=false;this.mode=options.mode || 'embed';
    this.scope=String(options.scope || 'user').replace(/[^a-z0-9_-]/gi,'') || 'user';
    if(this.scope==='user'){const account=String(readStorage('Username','')).replace(/[^a-z0-9_-]/gi,'').slice(0,40);if(account)this.scope='user-'+account;}
    this.hueKey=scopedKey(HUE_KEY,this.scope);this.filterKey=scopedKey(FILTER_KEY,this.scope);this.viewKey=scopedKey(VIEW_KEY,this.scope);
    this.hue=storedHue(this.hueKey);
    const savedView=readStorage(this.viewKey,'');
    this.view=(savedView==='flat'||savedView==='globe')?savedView:(options.view==='flat'?'flat':'globe');
    this.nodes=[];this.routes=[];this.counts=new Map();this.cooldown=.15;this.cursor=0;this.frame=0;this.elapsed=0;this.last=0;this.width=0;this.height=0;this.data={};
    /* 飞线强度（可运行时调整：管理端模拟演示用）；默认值与 PARAMETERS 一致，不影响用户端 */
    this.maxActive=Number(options.maxActive)||0;
    this.speedMul=Number(options.flightSpeed)||1;
    this.cooldownMin=Number(options.cooldownMin)||0;
    this.cooldownMax=Number(options.cooldownMax)||0;
    /* allChannels=true → 不论全屏与否都展示三通道（管理端） */
    this.allChannels=Boolean(options.allChannels);
    /* 用户端（allowAllChannels=false）全屏也不展示全站通道，只看自己当前通道，
       避免把 在线充值 / 管理端 / 网页访问 等平台级数据暴露给开发者。 */
    this.allowAllChannels=options.allowAllChannels !== false;
    this.legend=null;
    try{this.disabled=new Set(JSON.parse(readStorage(this.filterKey,'[]')));}catch{this.disabled=new Set();}
    this.root=element('div','jy-globe'+(this.mode==='full'?' jy-globe-page':''));this.root.dataset.renderer='three';
    this.stage=element('div','jy-globe-stage');this.root.append(this.stage);
    this.heading=element('div','jy-globe-heading');this.heading.append(element('strong','',options.title || '极验全球业务态势'),element('small','','JIYAN GLOBAL BUSINESS FLOW'));this.root.append(this.heading);
    this.actions=element('div','jy-globe-actions');
    this.filterButton=button('筛选','filter',()=>{this.panelOpen=!this.panelOpen;this.syncPresentation();});this.filterButton.setAttribute('aria-expanded','false');this.actions.append(this.filterButton);
    this.viewButton=button('切换平面','map',()=>this.setView(this.view==='flat'?'globe':'flat'));this.actions.append(this.viewButton);
    this.enterButton=button('全屏','expand',()=>this.enterFullscreen());this.actions.append(this.enterButton);
    if(options.standaloneUrl)this.actions.append(button('新窗口','external-link-alt',()=>window.open(typeof options.standaloneUrl==='function'?options.standaloneUrl():options.standaloneUrl,'_blank','noopener')));
    if(options.refresh)this.actions.append(button('刷新','sync-alt',()=>options.refresh()));
    if(options.returnUrl){const back=button(options.returnLabel || '返回后台','arrow-left',()=>location.assign(options.returnUrl));back.classList.add('jy-globe-back');this.actions.append(back);}
    this.exitButton=button('退出全屏','compress',()=>this.exitFullscreen());this.exitButton.classList.add('jy-globe-exit');this.exitButton.style.display='none';this.root.append(this.actions,this.exitButton);
    this.panel=element('aside','jy-globe-panel');this.panel.setAttribute('aria-label','区域筛选');
    const ph=element('div','jy-globe-panel-head');ph.append(element('strong','','区域筛选'));ph.append(button('收起','times',()=>{this.panelOpen=false;this.syncPresentation();}));this.panel.append(ph);
    const group=element('div','jy-globe-filter-commands');
    group.append(button('全选','check-double',()=>this.setSelection('all')),button('反选','exchange-alt',()=>this.setSelection('invert')),button('只看 Top10','list-ol',()=>this.setSelection('top')));this.panel.append(group);
    this.regionList=element('div','jy-globe-region-list');this.panel.append(this.regionList);
    const hueRow=element('label','jy-globe-hue');hueRow.append(element('span','','地图色相'));this.hueInput=element('input');this.hueInput.type='range';this.hueInput.min='0';this.hueInput.max='360';this.hueInput.step='1';this.hueInput.value=String(this.hue);this.hueInput.setAttribute('aria-label','地图色相');this.hueOutput=element('output','',this.hue+'°');
    this.hueInput.oninput=()=>this.setHue(Number(this.hueInput.value));hueRow.append(this.hueInput,this.hueOutput);this.panel.append(hueRow);this.root.append(this.panel);
    if(options.windows){const windows=element('div','jy-globe-windows');for(const [key,label] of [['1h','1小时'],['24h','24小时'],['7d','7天'],['month','本月']]){const b=element('button','',label);b.type='button';b.dataset.window=key;b.onclick=()=>{for(const other of windows.children)other.classList.toggle('on',other===b);options.onWindow?.(key);};b.classList.toggle('on',key===(options.window || '24h'));windows.append(b);}this.root.append(windows);}
    this.status=element('div','jy-globe-status','正在加载业务数据');this.empty=element('div','jy-globe-empty');this.empty.style.display='none';this.root.append(this.status,this.empty);this.host.append(this.root);
    this.onKey=e=>{if(e.key==='Escape'&&this.full){e.preventDefault();this.exitFullscreen();}};document.addEventListener('keydown',this.onKey);
    this.onStorage=e=>{if(e.key===this.hueKey)this.setHue(storedHue(this.hueKey),false);if(e.key===this.filterKey){try{this.disabled=new Set(JSON.parse(e.newValue || '[]'));this.applyFilters();this.renderRegions();}catch{}}};window.addEventListener('storage',this.onStorage);
    this.onResize=()=>this.resize();this.resizeObserver=new ResizeObserver(this.onResize);this.resizeObserver.observe(this.root);window.addEventListener('resize',this.onResize);
    this.syncPresentation();this.ready=this.initialize().catch(error=>{this.status.textContent=error.message;this.root.dataset.error=error.message;});
  }
  async waitForSize(){while(!this.dead){const rect=this.root.getBoundingClientRect();if(rect.width>=2&&rect.height>=2)return true;await new Promise(resolve=>setTimeout(resolve,80));}return false;}
  async initialize(){
    const probe=document.createElement('canvas');let context;try{context=probe.getContext('webgl2') || probe.getContext('webgl');}catch{}
    if(!context){this.status.textContent='当前浏览器不支持 3D 渲染';this.root.dataset.webgl='unsupported';return;}
    context.getExtension('WEBGL_lose_context')?.loseContext();
    if(!await this.waitForSize())return;
    const geo=await loadGeography();if(this.dead)return;this.geo=geo;
    this.renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance',preserveDrawingBuffer:true});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1,innerWidth<760?1.5:2));this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=.9;
    this.renderer.setClearColor('#020611',this.mode==='full'||this.full?1:0);this.renderer.domElement.className='jy-globe-canvas';this.renderer.domElement.setAttribute('aria-label','全球业务态势三维球面');this.stage.append(this.renderer.domElement);
    this.scene=new THREE.Scene();this.scene.fog=new THREE.FogExp2('#031022',.03);
    this.camera=new THREE.PerspectiveCamera(36,1,.1,150);this.camera.position.copy(lonLatVector(105,25,21));this.camera.lookAt(0,0,0);
    this.controls=new OrbitControls(this.camera,this.renderer.domElement);this.controls.enableDamping=true;this.controls.enablePan=false;this.controls.dampingFactor=.065;this.controls.minDistance=9.5;this.controls.maxDistance=36;this.controls.rotateSpeed=.55;this.controls.autoRotate=true;this.controls.autoRotateSpeed=.36;
    this.globe=new THREE.Group();this.scene.add(this.globe);
    this.oceanMaterial=new THREE.MeshBasicMaterial({color:'#020611',transparent:true,opacity:this.mode==='full'||this.full?1:.72});
    this.globe.add(new THREE.Mesh(new THREE.SphereGeometry(RADIUS-.008,96,64),this.oceanMaterial));
    this.masks=new RegionMasks(geo,this.hue);const colors=r0(this.hue);
    this.mapMaterial=new THREE.ShaderMaterial({vertexShader:MAP_VERTEX,fragmentShader:MAP_FRAGMENT,transparent:true,depthWrite:true,uniforms:{uLandMask:{value:this.masks.landTexture},uIntensityMask:{value:this.masks.intensityTexture},uHot:{value:colors.hot},uGlow:{value:colors.glow},uHover:{value:colors.hover},uHoverUv:{value:new THREE.Vector2(-1,-1)},uHoverStrength:{value:0}}});
    this.surface=new THREE.Mesh(new THREE.SphereGeometry(RADIUS,128,96),this.mapMaterial);this.globe.add(this.surface);
    this.grid=new THREE.LineSegments(gridGeometry(),new THREE.LineBasicMaterial({color:colors.grid,transparent:true,opacity:.055,depthWrite:false,blending:THREE.AdditiveBlending}));this.globe.add(this.grid);
    this.business=new THREE.Group();this.scene.add(this.business);this.texture=glowTexture();
    this.buildStars();
    this.composer=new EffectComposer(this.renderer);this.composer.addPass(new RenderPass(this.scene,this.camera));
    this.bloom=new UnrealBloomPass(new THREE.Vector2(1,1),.46,.25,.84);this.bloom.threshold=.84;this.bloom.strength=.46;this.bloom.radius=.25;this.composer.addPass(this.bloom);
    this.bloom.basic.transparent=true;
    Object.assign(this.bloom.blendMaterial,{blending:THREE.CustomBlending,blendEquation:THREE.AddEquation,blendSrc:THREE.SrcAlphaFactor,blendDst:THREE.OneFactor,blendEquationAlpha:THREE.AddEquation,blendSrcAlpha:THREE.ZeroFactor,blendDstAlpha:THREE.OneFactor});
    this.pointer=new THREE.Vector2();this.raycaster=new THREE.Raycaster();
    this.onPointer=event=>{const rect=this.renderer.domElement.getBoundingClientRect();if(rect.width<2||rect.height<2)return;this.pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);this.raycaster.setFromCamera(this.pointer,this.camera);const hit=this.raycaster.intersectObject(this.surface)[0];if(hit?.uv){this.mapMaterial.uniforms.uHoverUv.value.copy(hit.uv);this.mapMaterial.uniforms.uHoverStrength.value=1;}else this.mapMaterial.uniforms.uHoverStrength.value=0;};
    this.onLeave=()=>{this.mapMaterial.uniforms.uHoverStrength.value=0;};this.renderer.domElement.addEventListener('pointermove',this.onPointer);this.renderer.domElement.addEventListener('pointerleave',this.onLeave);
    this.renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();this.status.textContent='3D 渲染已暂停，请刷新页面';});
    this.flat=new FlatRenderer(this.stage,{hue:this.hue});this.flat.setMasks(this.masks);this.flat.setFilters(this.disabled);this.flat.show(this.view==='flat');
    this.setView(this.view);
    this.root.dataset.webgl='ready';this.resize();this.update(this.data);this.tick(0);
  }
  buildStars(){
    const positions=[];for(let i=0;i<650;i++){const radius=38+Math.random()*18,v=new THREE.Vector3().randomDirection().multiplyScalar(radius);positions.push(...v.toArray());}
    this.stars=new THREE.Points(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(positions,3)),new THREE.PointsMaterial({color:'#a9d9f5',size:.045,transparent:true,opacity:.50,depthWrite:false}));this.stars.visible=this.full||this.mode==='full';this.scene.add(this.stars);
  }
  buildCloud(){
    if(this.cloud){this.scene.remove(this.cloud);this.cloud.geometry.dispose();this.cloud.material.dispose();}
    const positions=[];for(const n of this.nodes){if(this.disabled.has(n.data.key))continue;positions.push(...lonLatVector(n.data.lon,n.data.lat,RADIUS+.033).toArray());}
    this.cloud=new THREE.Points(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(positions,3)),new THREE.PointsMaterial({color:r0(this.hue).borderHighlight,size:.045,transparent:true,opacity:.70,depthWrite:false,blending:THREE.AdditiveBlending}));this.scene.add(this.cloud);
  }
  /* 是否展示三通道合计：全屏 / 新窗口(mode=full) / 管理端(allChannels) */
  wantsAll(){if(!this.allowAllChannels)return false;return this.allChannels || this.full || this.mode==='full';}
  /* 当前实际展示的数据视图 */
  viewData(){
    const d=this.data || {};
    if(!this.wantsAll()) return d;
    if(d.all && Array.isArray(d.all.nodes)) return {...d,...d.all,channels:d.channels,active:'all'};
    if(d.all && Array.isArray(d.all.points)) return {...d,...d.all,channels:d.channels,active:'all'};
    return d;
  }
  update(data={}){
    if(this.dead)return;this.data=data;
    const view=this.viewData();
    let rows=Array.isArray(view.nodes)?view.nodes:[];const month=timestamp(view.month_start),generated=timestamp(view.generated_at);
    this.stale=Boolean(month&&generated&&generated<month);if(this.stale)rows=[];
    this.normalized=rows.map((row,index)=>({...row,...normalizeNode(row),id:'target-'+index,lon:Number(row.lon),lat:Number(row.lat),count:Math.max(0,Number(row.count)||0)})).filter((n,index)=>hasCoordinates(rows[index]));
    this.counts=new Map();for(const n of this.normalized)this.counts.set(n.key,(this.counts.get(n.key)||0)+n.count);this.renderRegions();
    if(!this.renderer)return;
    disposeTree(this.business,this.texture);this.nodes=[];this.routes=[];this.source=null;
    const server=view.server || data.server || {};if(hasCoordinates(server)){const label=/[㐀-鿿]/.test(server.name || '')?server.name:'主服务器';this.source=new FlowNode({...server,lon:Number(server.lon),lat:Number(server.lat),label,count:Infinity},true,this.texture);this.business.add(this.source.group,this.source.label);}
    for(const n of this.normalized){const node=new FlowNode(n,false,this.texture);this.nodes.push(node);this.business.add(node.group,node.label);}
    const lines=this.stale?[]:(Array.isArray(view.lines)?view.lines:[]);
    const CH_COLORS=(this.data && this.data.colors) || {};
    if(this.source)for(const line of lines){
      if(!Array.isArray(line.coords)||!line.coords.every(coord=>Array.isArray(coord)&&coord.length>=2&&coord[0]!==null&&coord[1]!==null&&coord.every(Number.isFinite)))continue;
      const end=line.coords[1],target=this.nodes.find(node=>Math.abs(node.data.lon-end[0])<.0001&&Math.abs(node.data.lat-end[1])<.0001&&(!line.toName || node.data.name===normalizeNode({name:line.toName,country_code:node.data.country_code}).name)) || this.nodes.find(node=>Math.abs(node.data.lon-end[0])<.0001&&Math.abs(node.data.lat-end[1])<.0001);
      if(!target)continue;
      const chColor=line.color || (line.channel && CH_COLORS[line.channel]) || '';
      const route=new FlowRoute(line,this.source,target,this.texture,chColor);
      if(this.speedMul>0&&this.speedMul!==1)route.duration=clamp(route.duration/this.speedMul,.30,24);
      this.routes.push(route);this.business.add(route.group);
    }
    this.buildLegend();
    this.cursor=0;this.cooldown=.15;this.applyFilters();this.syncPresentation();
  }
  /* 三色飞线图例：仅在展示三通道时出现 */
  buildLegend(){
    if(this.legend){this.legend.remove();this.legend=null;}
    const chs=(this.data && this.data.channels) || {};
    const keys=Object.keys(chs);
    if(!keys.length) return;
    /* 非全屏且非管理端：不显示图例（只看单一通道） */
    if(!this.wantsAll()){
      const act=this.data.active || 'key',cur=chs[act];
      if(!cur) return;
      const box=element('div','jy-globe-legend');
      const row=element('div','jy-globe-legend-row');
      const dot=element('i','jy-globe-legend-dot');dot.style.background=cur.color || '#42c8f5';
      row.append(dot,element('span','',(cur.label || act) + ' · ' + Number(cur.total || 0).toLocaleString('zh-CN') + ' 次'));
      box.append(row);this.root.append(box);this.legend=box;return;
    }
    const box=element('div','jy-globe-legend');
    /* 第五轮：全站所有通道，按固定顺序，0 次的不占位 */
    const PREF=['key','user','cloud','page','auth','admin','recharge','transfer'];
    const sorted=keys.slice().sort((a,b)=>{
      const ia=PREF.indexOf(a),ib=PREF.indexOf(b);
      return (ia<0?99:ia)-(ib<0?99:ib);
    });
    for(const key of sorted){
      const c=chs[key] || {};
      if(Number(c.total || 0)===0) continue;
      const row=element('div','jy-globe-legend-row');
      const dot=element('i','jy-globe-legend-dot');dot.style.background=c.color || '#42c8f5';
      row.append(dot,element('span','',(c.label || key) + ' · ' + Number(c.total || 0).toLocaleString('zh-CN') + ' 次'));
      box.append(row);
    }
    if(box.childNodes.length) { this.root.append(box); this.legend=box; }
  }
  renderRegions(){
    this.regionList.replaceChildren();this.regions=Array.from(this.counts,([key,count])=>({key,count,name:this.normalized.find(n=>n.key===key)?.name || key})).sort((a,b)=>b.count-a.count);
    for(const region of this.regions){const row=element('label','jy-globe-region'),input=element('input');input.type='checkbox';input.checked=!this.disabled.has(region.key);input.dataset.region=region.key;input.onchange=()=>{input.checked?this.disabled.delete(region.key):this.disabled.add(region.key);saveStorage(this.filterKey,JSON.stringify([...this.disabled]));this.applyFilters();};row.append(input,element('span','',region.name),element('b','',region.count.toLocaleString('zh-CN')));this.regionList.append(row);}
    if(!this.regions.length)this.regionList.append(element('div','jy-globe-no-regions','当前窗口暂无活跃区域'));
  }
  setSelection(mode){
    this.regions.forEach((region,index)=>{if(mode==='all')this.disabled.delete(region.key);else if(mode==='top'){if(index<10)this.disabled.delete(region.key);else this.disabled.add(region.key);}else if(this.disabled.has(region.key))this.disabled.delete(region.key);else this.disabled.add(region.key);});
    saveStorage(this.filterKey,JSON.stringify([...this.disabled]));this.applyFilters();this.renderRegions();
  }
  applyFilters(){
    if(!this.masks)return;this.masks.paint(this.counts,this.disabled);for(const node of this.nodes){node.group.visible=!this.disabled.has(node.data.key);node.label.visible=node.group.visible;}
    for(const route of this.routes){route.group.visible=!this.disabled.has(route.target.data.key);if(!route.group.visible)route.reset();}
    this.buildCloud();
    if(this.flat){this.flat.setFilters(this.disabled);this.syncFlat();}
    const view=this.viewData();const total=this.stale?0:(Number(view.total)||0),month=view.month_start || this.data.month_start || currentMonth(),monthNumber=Number(month.slice(5,7));
    this.empty.textContent=total===0?`本月数据从 ${monthNumber} 月 1 日 00:00 开始累计`:'';this.empty.style.display=total===0?'block':'none';
    const shown=this.normalized.filter(n=>!this.disabled.has(n.key)).reduce((sum,n)=>sum+n.count,0);
    const scope=this.wantsAll()?'三通道合计':((this.data.channels && this.data.channels[this.data.active] && this.data.channels[this.data.active].label) || '当前通道');this.status.textContent=`${scope} · ${this.regions.length} 个区域 · ${shown.toLocaleString('zh-CN')} 次请求`+(view.unresolved?` · ${view.unresolved} 次未定位`:'')+(view.days?` · ${view.days} 天数据窗口`:'')+(view.generated_at?` · ${view.generated_at}`:'');
  }
  setHue(value,persist=true){
    this.hue=clamp(Number(value)||0,0,360);this.hueInput.value=String(this.hue);this.hueOutput.value=this.hue+'°';if(persist)saveStorage(this.hueKey,String(this.hue));clearTimeout(this.hueTimer);
    this.hueTimer=setTimeout(()=>{if(this.dead||!this.masks)return;this.masks.bake(this.hue);const colors=r0(this.hue);for(const [key,color] of [['uHot',colors.hot],['uGlow',colors.glow],['uHover',colors.hover]])this.mapMaterial.uniforms[key].value.copy(color);this.grid.material.color.copy(colors.grid);this.cloud?.material.color.copy(colors.borderHighlight);this.flat?.setHue(this.hue);},120);
  }
  syncFlat(){
    if(!this.flat)return;
    this.flat.setData({
      nodes:this.nodes.map(n=>({data:n.data})),
      routes:this.routes.map(r=>({line:r.data,source:{emit(){}},target:{data:r.target.data,impact(){}}})),
      source:this.source?{...this.source.data,label:this.source.data.label}:null
    });
  }
  setView(view){
    this.view=view==='flat'?'flat':'globe';
    saveStorage(this.viewKey,this.view);
    if(this.flat){this.flat.setHue(this.hue);this.flat.show(this.view==='flat');this.syncFlat();}
    if(this.flat&&this.view==='flat'){this.flat.resize();this.flat.render(0.016);}
    if(this.stage){const canvas=this.renderer?.domElement;if(canvas)canvas.style.display=this.view==='flat'?'none':'block';}
    this.viewButton.textContent='';
    const i=element('i','fas fa-'+(this.view==='flat'?'globe':'map'));i.setAttribute('aria-hidden','true');
    this.viewButton.append(i,element('span','',this.view==='flat'?'切换球面':'切换平面'));
    this.viewButton.title=this.view==='flat'?'切换球面':'切换平面';this.viewButton.setAttribute('aria-label',this.viewButton.title);
    this.root.dataset.view=this.view;
  }
  syncPresentation(){
    if(this.legend) this.buildLegend();
    const large=this.full||this.mode==='full';this.root.classList.toggle('jy-globe-fullscreen',this.full);this.root.classList.toggle('jy-globe-expanded',large);
    this.exitButton.style.display=this.full?'inline-flex':'none';this.enterButton.style.display=large?'none':'inline-flex';
    if(this.panelOpen===undefined)this.panelOpen=large;this.panel.style.display=this.panelOpen?'flex':'none';this.filterButton.setAttribute('aria-expanded',String(this.panelOpen));
    if(this.renderer){this.renderer.setClearColor('#020611',large?1:0);this.oceanMaterial.opacity=large?1:.72;this.stars.visible=large;}
    if(this.viewButton&&!this.viewButton.textContent)this.setView(this.view);
  }
  enterFullscreen(){
    if(this.full||this.mode==='full'||this.dead)return;
    this.ancestorStyles=[];for(let node=this.root.parentElement;node;node=node.parentElement){const saved={node,properties:[]};for(const prop of ['backdrop-filter','-webkit-backdrop-filter','filter','transform','contain','perspective','will-change']){saved.properties.push([prop,node.style.getPropertyValue(prop),node.style.getPropertyPriority(prop)]);node.style.setProperty(prop,prop==='contain'?'none':prop==='will-change'?'auto':'none','important');}this.ancestorStyles.push(saved);}
    this.placeholder=document.createComment('globe fullscreen origin');this.root.before(this.placeholder);document.body.append(this.root);this.previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';this.full=true;this.panelOpen=true;this.syncPresentation();this.resize();requestAnimationFrame(()=>this.resize());try{this.update(this.data);}catch(e){}this.root.dispatchEvent(new CustomEvent('jyglobe:fullscreen',{detail:true,bubbles:true}));
  }
  exitFullscreen(){
    if(!this.full)return;this.full=false;this.placeholder?.replaceWith(this.root);this.placeholder=null;
    for(const saved of this.ancestorStyles || [])for(const [prop,value,priority] of saved.properties){if(value)saved.node.style.setProperty(prop,value,priority);else saved.node.style.removeProperty(prop);}this.ancestorStyles=[];document.body.style.overflow=this.previousOverflow || '';
    this.panelOpen=false;this.syncPresentation();this.resize();requestAnimationFrame(()=>this.resize());try{this.update(this.data);}catch(e){}this.root.dispatchEvent(new CustomEvent('jyglobe:fullscreen',{detail:false,bubbles:true}));
  }
  isFullscreen(){return this.full;}
  resize(){
    if(!this.renderer||this.dead)return;const rect=this.root.getBoundingClientRect();if(rect.width<2||rect.height<2){this.sized=false;return;}this.sized=true;
    this.width=rect.width;this.height=rect.height;this.renderer.setSize(this.width,this.height,false);this.composer?.setSize(this.width,this.height);this.camera.aspect=this.width/this.height;this.camera.updateProjectionMatrix();
    const limit=this.width<760?1:this.width<1180?2:3;let active=0;for(const route of this.routes)if(route.state!=='IDLE'&&++active>limit)route.reset();
    const fov=THREE.MathUtils.degToRad(this.camera.fov/2),effective=Math.min(fov,Math.atan(Math.tan(fov)*this.camera.aspect)),distance=RADIUS/Math.sin(effective)*1.16;
    this.camera.position.setLength(Math.max(12,distance));this.controls.minDistance=RADIUS*1.6;this.controls.maxDistance=Math.max(36,distance*1.5);this.controls.update();
  }
  updateLabels(dt){
    this.camera.updateMatrixWorld();const objects=[...(this.source?[this.source]:[]),...this.nodes].sort((a,b)=>(b.data.count||0)-(a.data.count||0));const boxes=[];
    for(const node of objects){
      const normal=node.normal,toward=this.camera.position.clone().sub(node.group.position).normalize(),front=normal.dot(toward)>.025;const enabled=node.source||!this.disabled.has(node.data.key);node.label.visible=front&&enabled;
      if(!node.label.visible)continue;
      const center=node.label.position.clone().project(this.camera),edge=node.label.position.clone().addScaledVector(new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld,0),node.label.scale.x/2).project(this.camera);
      const x=(center.x+1)*this.width/2,y=(1-center.y)*this.height/2,w=Math.abs(edge.x-center.x)*this.width,h=w*node.label.scale.y/node.label.scale.x;const box={left:x-w/2,right:x+w/2,top:y-h/2,bottom:y+h/2};
      const overlap=boxes.some(b=>box.left<b.right&&box.right>b.left&&box.top<b.bottom&&box.bottom>b.top);const opacity=overlap?.35:1;node.label.material.opacity=THREE.MathUtils.lerp(node.label.material.opacity,opacity,Math.min(1,dt*9));boxes.push(box);
    }
  }
  tick(now){
    if(this.dead)return;this.frame=requestAnimationFrame(t=>this.tick(t));const dt=this.last?Math.min((now-this.last)/1000,.05):.016;this.last=now;if(document.hidden||!this.sized||!this.root.getClientRects().length)return;this.elapsed+=dt;this.controls.update();
    if(this.view==='flat'){this.flat?.render(dt);return;}
    this.source?.update(this.elapsed,dt);for(const node of this.nodes)node.update(this.elapsed,dt);for(const route of this.routes)route.update(dt);this.cooldown-=dt;
    const baseMax=this.width<760?1:this.width<1180?2:3;
    const maximum=this.maxActive>0?(this.width<560?Math.max(4,Math.round(this.maxActive*0.7)):this.maxActive):baseMax;
    const active=this.routes.filter(route=>route.group.visible&&route.state!=='IDLE').length;
    if(this.cooldown<=0&&active<maximum&&this.routes.length){for(let i=0;i<this.routes.length;i++){const index=(this.cursor+i)%this.routes.length;if(this.routes[index].start()){this.cursor=(index+1)%this.routes.length;const lo=this.cooldownMin||PARAMETERS.schedulerIntervalMin,hi=this.cooldownMax||PARAMETERS.schedulerIntervalMax;this.cooldown=lo+Math.random()*(hi-lo);break;}}}
    this.updateLabels(dt);this.composer.render();
  }
  setMessage(text){this.status.textContent=text;}
  inspect(){return {renderer:this.root.dataset.webgl,view:this.view,scope:this.scope,full:this.full,mode:this.mode,width:this.width,height:this.height,hue:this.hue,regions:this.regions || [],nodeCount:this.nodes.length,routeCount:this.routes.length,activeRoutes:this.routes.filter(r=>r.state!=='IDLE'&&r.group.visible).length,disabled:[...this.disabled],maskPaints:this.masks?{land:this.masks.landPaints,intensity:this.masks.intensityPaints}:null,geography:this.geo?.counts,nodes:this.nodes.map(n=>({name:n.data.name,lon:n.data.lon,lat:n.data.lat,position:n.group.position.toArray(),visible:n.group.visible,labelVisible:n.label.visible,opacity:n.label.material.opacity})),routeColors:this.routes[0]?{base:this.routes[0].base.material.color.getHexString(),active:this.routes[0].material.uniforms.uColor.value.getHexString()}:null};}
  destroy(){
    if(this.dead)return;this.exitFullscreen();this.dead=true;clearTimeout(this.hueTimer);cancelAnimationFrame(this.frame);this.resizeObserver.disconnect();window.removeEventListener('resize',this.onResize);window.removeEventListener('storage',this.onStorage);document.removeEventListener('keydown',this.onKey);
    this.flat?.dispose();this.controls?.dispose();this.composer?.dispose();this.bloom?.dispose();if(this.scene)disposeTree(this.scene,this.texture);this.masks?.dispose();this.texture?.dispose();this.renderer?.dispose();this.root.remove();
  }
}
const instances=new WeakMap();
export function mount(host,options={}){if(!host)return null;const existing=instances.get(host);if(existing&&!existing.dead)return existing;const instance=new FlowGlobe(host,options);instances.set(host,instance);host.__jyGlobe=instance;return instance;}
window.JYFlowGlobe={mount,adaptUserHttp,PARAMETERS,lonLatVector};
document.dispatchEvent(new Event('jyglobe:ready'));
