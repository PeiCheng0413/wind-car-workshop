import * as T from './assets/three.module.js';
export function createPartFocus(model,camera,controls,viewer,canvas){
  const parts=[{id:'base',name:'底盤',roots:[model.chassis,model.shaftGroup,model.gears,model.wheelGroup],anchor:model.chassis},{id:'frame',name:'支架',roots:[model.frame,model.inputModule],anchor:model.frame},{id:'drive',name:'傳動',roots:[model.verticalModule],anchor:model.verticalModule}];
  const status=document.createElement('span');status.className='part-focus-status';status.setAttribute('aria-live','polite');status.hidden=true;
  const hint=document.createElement('span');hint.className='part-focus-hint';hint.textContent='點選零件，放大檢視';viewer.append(hint);
  const restore=document.createElement('button');restore.className='part-restore';restore.textContent='顯示全部';restore.hidden=true;viewer.append(restore,status);
  let selected=null,ghost=false,enabled=true,tween=null,lastExplosion=0;
  const meshes=[];
  model.car.traverse(o=>{if(o.isMesh){o.userData.blueStructure=o.material===model.structure;o.material=o.material.clone();meshes.push(o);}});
  parts.forEach(p=>p.roots.forEach(r=>r.userData.focusPart=p.id));
  function owner(o){for(let n=o;n&&n!==model.car;n=n.parent)if(n.userData.focusPart)return n.userData.focusPart;return null;}
  function materials(){meshes.forEach(o=>{const dim=selected?owner(o)!==selected:ghost&&o.userData.blueStructure;o.material.opacity=dim?.13:1;o.material.transparent=!!dim;o.material.depthWrite=!dim;o.material.needsUpdate=true;o.castShadow=!dim;});}
  function framePart(){
    if(!selected){tween={target:new T.Vector3(0,58,0),position:new T.Vector3(-215,165,245)};controls.minDistance=130;return;}
    model.car.updateMatrixWorld(true);const bounds=new T.Box3();parts.find(p=>p.id===selected).roots.forEach(r=>bounds.union(new T.Box3().setFromObject(r)));
    const sphere=bounds.getBoundingSphere(new T.Sphere());const half=T.MathUtils.degToRad(camera.fov/2);const limit=Math.min(half,Math.atan(Math.tan(half)*camera.aspect));const distance=Math.max(75,sphere.radius/Math.sin(limit)*1.2);
    const direction=camera.position.clone().sub(controls.target).normalize();tween={target:sphere.center,position:sphere.center.clone().addScaledVector(direction,distance)};controls.minDistance=45;
  }
  function select(id){selected=id;restore.hidden=!id||!enabled;status.hidden=!id||!enabled;hint.hidden=!!id||!enabled;status.textContent=id?parts.find(p=>p.id===id).name:'';materials();framePart();}
  restore.onclick=()=>select(null);controls.addEventListener('start',()=>{tween=null;});
  const ray=new T.Raycaster();let down=null;
  canvas.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY};});
  canvas.addEventListener('pointerup',e=>{if(!enabled||!down||Math.hypot(e.clientX-down.x,e.clientY-down.y)>5)return;const rect=canvas.getBoundingClientRect();ray.setFromCamera(new T.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1),camera);const hit=ray.intersectObjects(model.car.children,true)[0];if(hit&&owner(hit.object))select(owner(hit.object));down=null;});
  canvas.tabIndex=0;canvas.setAttribute('aria-label','3D 模型：點選組件放大，或按 1 底盤、2 支架、3 傳動，Escape 恢復全部');
  canvas.addEventListener('keydown',e=>{if(!enabled)return;if(['1','2','3'].includes(e.key)){e.preventDefault();select(parts[Number(e.key)-1].id);}else if(e.key==='Escape')select(null);});
  return {select,setGhost(value){ghost=value;materials();},setEnabled(value){enabled=value;if(!value)select(null);hint.hidden=!value||!!selected;restore.hidden=!value||!selected;status.hidden=!value||!selected;},update(dt,explosion){
    if(!enabled)return;
    if(selected&&Math.abs(explosion-lastExplosion)>.0001)framePart();lastExplosion=explosion;
    if(tween){const k=matchMedia('(prefers-reduced-motion: reduce)').matches?1:1-Math.exp(-dt*7);camera.position.lerp(tween.position,k);controls.target.lerp(tween.target,k);if(camera.position.distanceTo(tween.position)<.03&&controls.target.distanceTo(tween.target)<.03)tween=null;}
    camera.updateMatrixWorld();model.car.updateMatrixWorld(true);
  }};
}
