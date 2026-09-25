import {createPartFocus} from './part-focus.js';
import * as T from 'three';
import {OrbitControls} from './assets/OrbitControls.js';
import {STLLoader} from './assets/STLLoader.js';
import {STLExporter} from './assets/STLExporter.js';
import {buildCar,assemblyFiles,applyDriveState,applyExplodeState} from './model.js';
const $=s=>document.querySelector(s);
const steps=[['先認識整台車','全車概覽','風從車頭吹向葉片。葉片轉動後，經過上下兩組齒輪，把動力送到輪軸。先拖曳模型，看看零件的位置。','兩次轉向指的是旋轉軸方向各改變 90°，不是車子轉彎。'],['組裝底盤輪組','讓車子自由滑行','把前後輪軸穿過支架，裝上四個輪子與固定環。先用手輕推小車，確認輪胎不會磨到車架。','先減少摩擦，風帶來的微小力量才不會被吃掉。'],['預組垂直傳動','先串好，再黏上支架','先把垂直軸穿過兩個 22 mm 藍色軸座，裝上上方齒輪與下端小齒輪。確認軸能自由轉動，再將整組軸座黏到 n 形支架。','只黏軸座與 n 形支架的接觸面，不能把傳動軸黏死。按「拆解模型」可查看整組移出的方式。'],['裝上轉向齒輪','兩次 90° 的交棒','上方小齒輪帶動垂直軸的冠狀齒輪；垂直軸下端再帶動輪軸的冠狀齒輪。以墊片調整嚙合深度。','橘色是傳動路徑。展示齒形經簡化，實作請使用相容的成對齒輪。'],['固定迎風葉片','讓風成為動力','把輕量葉片固定在水平輸入軸，葉片平面朝向電風扇。慢慢用手轉動，確認齒輪一路帶動車輪。','葉片需要適當傾角；平放的圓片不會自動成為風力渦輪。'],['開始迎風測試','朝風扇的方向走','開啟下方風力，觀察各段不同的轉速。實體測試從低風速開始，再依摩擦、抓地力與旋轉方向逐一調整。','風由風扇側吹向車尾；車輪帶動車子往相反方向，也就是朝風扇前進。']];
let current=0,playing=false,exploded=false,ghost=false,mode='design',angle=0;
$('#steps').innerHTML=steps.map((s,i)=>`<button class="step" data-step="${i}"><span>0${i+1}</span>${s[0]}</button>`).join('');
function selectStep(i){current=i;document.querySelectorAll('.step').forEach((el,k)=>{el.classList.toggle('active',k===i);el.setAttribute('aria-current',k===i?'step':'false')});$('#counter').textContent=`0${i+1} / 06`;$('#detail-kicker').textContent=`步驟 0${i+1}`;$('#detail-title').textContent=steps[i][1];$('#detail-text').textContent=steps[i][2];$('#detail-tip').textContent=steps[i][3];$('#next').innerHTML=i===5?'回到全車概覽 <span>↺</span>':'下一步 <span>→</span>';}
document.querySelectorAll('.step').forEach(el=>el.onclick=()=>selectStep(+el.dataset.step));$('#next').onclick=()=>selectStep((current+1)%6);selectStep(0);
const scene=new T.Scene();scene.background=new T.Color('#f0f4fa');scene.fog=new T.Fog('#f0f4fa',480,900);
const camera=new T.PerspectiveCamera(36,1,0.1,1500);camera.position.set(-215,165,245);
let renderer;try{renderer=new T.WebGLRenderer({antialias:true,alpha:false});}catch(e){$('#loading').textContent='無法啟用 3D，請開啟瀏覽器硬體加速後重試。';throw e;}
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.outputColorSpace=T.SRGBColorSpace;$('#viewer').appendChild(renderer.domElement);
const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,58,0);controls.enableDamping=true;controls.minDistance=130;controls.maxDistance=600;controls.maxPolarAngle=Math.PI*.49;
scene.add(new T.HemisphereLight(0xffffff,0x9eacc0,2.7));const light=new T.DirectionalLight(0xffffff,3);light.position.set(-120,260,180);light.castShadow=true;light.shadow.mapSize.set(2048,2048);Object.assign(light.shadow.camera,{left:-180,right:180,top:200,bottom:-180,near:1,far:700});light.shadow.bias=-.0005;scene.add(light);
const floor=new T.Mesh(new T.PlaneGeometry(2000,2000),new T.MeshStandardMaterial({color:0xf0f4fa,roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-.5;floor.receiveShadow=true;scene.add(floor);const grid=new T.GridHelper(600,30,0xd2ddeb,0xe0e7f0);grid.position.y=0;scene.add(grid);
const loader=new STLLoader();
let sourceGeometries;
try{sourceGeometries=await Promise.all(assemblyFiles.map(name=>loader.loadAsync('./assets/'+name+'.stl')));}
catch(error){$('#loading').textContent='組裝骨架載入失敗，請重新整理。';throw error;}
const modelParts=buildCar(sourceGeometries);
const {car,structure,chassis,frame,shaftGroup,gears,rotor,wheelGroup,wheels,g1,g2,g3,g4,rotorOrigin}=modelParts;
scene.add(car);$('#loading').remove();
const partFocus=createPartFocus(modelParts,camera,controls,$('#viewer'),renderer.domElement);
function box(size,pos,parent,mat){const m=new T.Mesh(new T.BoxGeometry(...size),mat);m.position.set(...pos);parent.add(m);return m;}
const windLines=new T.Group();scene.add(windLines);for(let i=0;i<17;i++){const line=box([10,0.6,0.6],[-140+Math.random()*240,64+(i%5)*14,(Math.floor(i/5)-1.5)*22],windLines,new T.MeshBasicMaterial({color:0x89a8d0,transparent:true,opacity:.42}));line.userData.seed=i*13;}windLines.visible=false;
function label(text,color){const c=document.createElement('canvas');c.width=512;c.height=80;const ctx=c.getContext('2d');ctx.font='500 30px sans-serif';ctx.fillStyle=color;ctx.textAlign='center';ctx.fillText(text,256,47);const sp=new T.Sprite(new T.SpriteMaterial({map:new T.CanvasTexture(c),depthTest:false,transparent:true}));sp.scale.set(106,16.5,1);scene.add(sp);return sp;}
const windLabel=label('風扇側・來風','#6b86a8');windLabel.position.set(-106,92,0);
const travelLabel=label('朝風扇前進','#315d9d');travelLabel.position.set(-10,3,78);
const windArrow=new T.ArrowHelper(new T.Vector3(1,0,0),new T.Vector3(-130,72,0),60,0x7d9dbf,9,5);
const travelArrow=new T.ArrowHelper(new T.Vector3(-1,0,0),new T.Vector3(42,3,62),90,0x315d9d,12,7);
scene.add(windArrow,travelArrow);
const original=new T.Group();scene.add(original);const cache={};let loadId=0;
$('#model').onchange=async()=>{mode=$('#model').value;partFocus.setEnabled(mode==='design');const id=++loadId;car.visible=mode==='design';original.visible=mode!=='design';windLabel.visible=travelLabel.visible=windArrow.visible=travelArrow.visible=mode==='design';$('#export').disabled=mode!=='design';for(const id of ['play','explode','ghost'])$('#'+id).disabled=mode!=='design';$('#model-title').textContent=mode==='design'?'完整傳動模型':'原始 STL 結構';if(mode==='design'){controls.target.set(0,58,0);return;}try{if(!cache[mode])cache[mode]=await loader.loadAsync(`./assets/${mode}.stl`);if(id!==loadId)return;original.clear();const geo=cache[mode].clone();if(mode==='assembly'){geo.rotateX(-Math.PI/2);geo.translate(-10,12.5,13.75);}else{geo.computeBoundingBox();geo.center();geo.rotateX(-Math.PI/2);geo.computeBoundingBox();geo.translate(0,-geo.boundingBox.min.y,0);}const m=new T.Mesh(geo,structure.clone());m.material.transparent=false;m.material.opacity=1;m.material.depthWrite=true;original.add(m);controls.target.set(0,mode==='assembly'?58:35,0);}catch(e){$('#model-title').textContent='模型載入失敗，請重新選取';}};
$('#reset').onclick=()=>{partFocus.select(null);};
$('#ghost').onclick=()=>{ghost=!ghost;$('#ghost').setAttribute('aria-pressed',String(ghost));partFocus.setGhost(ghost);};
$('#explode').onclick=()=>{exploded=!exploded;$('#explode').setAttribute('aria-pressed',String(exploded));$('#explode').textContent=exploded?'還原組裝':'拆解模型';};
$('#play').onclick=()=>{playing=!playing;$('#play').setAttribute('aria-pressed',String(playing));$('#play').textContent=playing?'Ⅱ 暫停風力':'▶ 開啟風力';$('#run-state').textContent=playing?'能量正在傳遞':'等待來風';};$('#wind').oninput=()=>$('#wind-value').textContent=`${$('#wind').value} 級`;
$('#export').onclick=()=>{try{const fresh=buildCar(sourceGeometries);applyDriveState(fresh,angle);const clone=fresh.car;clone.updateMatrixWorld(true);const data=new STLExporter().parse(clone,{binary:true});const url=URL.createObjectURL(new Blob([data],{type:'application/octet-stream'}));const a=document.createElement('a');a.href=url;a.download='逆風車-完整教學展示-非列印驗證.stl';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);$('#export-state').textContent='已匯出展示網格；齒形與公差仍需實作驗證。';}catch(e){$('#export-state').textContent='匯出失敗，請重新整理後再試。';}};
const resize=new ResizeObserver(()=>{const el=$('#viewer');camera.aspect=el.clientWidth/el.clientHeight;camera.updateProjectionMatrix();renderer.setSize(el.clientWidth,el.clientHeight);});resize.observe($('#viewer'));
let explodeAmount=0;let last=performance.now();function animate(now){requestAnimationFrame(animate);const dt=Math.min((now-last)/1000,.05);last=now;if(playing&&mode==='design'){angle+=dt*Number($('#wind').value)*1.3;applyDriveState(modelParts,angle);}windLines.visible=playing&&mode==='design'&&!exploded;if(windLines.visible)windLines.children.forEach((line,i)=>line.position.x=((now*.025*Number($('#wind').value)+i*21)%260)-150);const f=1-Math.exp(-dt*9),e=exploded?1:0;explodeAmount+=(e-explodeAmount)*f;applyExplodeState(modelParts,explodeAmount);partFocus.update(dt,explodeAmount);controls.update();renderer.render(scene,camera);}requestAnimationFrame(animate);
