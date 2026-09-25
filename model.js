import * as T from './assets/three.module.js';
export const assemblyFiles=['fitted-base','n-frame','assembly-wheel-shafts','assembly-input-shaft','assembly-upright-shaft','vertical-blocks'];
export function buildCar(geometries){
  const car=new T.Group();
  const structure=new T.MeshStandardMaterial({color:0x376bc5,roughness:.43,metalness:.12});
  const orange=new T.MeshStandardMaterial({color:0xe78943,roughness:.45,metalness:.16});
  const steel=new T.MeshStandardMaterial({color:0xa0afc0,metalness:.8,roughness:.27});
  const tire=new T.MeshStandardMaterial({color:0x273448,roughness:.8});
  const pale=new T.MeshStandardMaterial({color:0xd4e0f0,roughness:.5,metalness:.3});
  const bladeMat=new T.MeshStandardMaterial({color:0xe99a5f,roughness:.4,metalness:.1,side:T.DoubleSide});
  const chassis=new T.Group(),frame=new T.Group(),shaftGroup=new T.Group(),gears=new T.Group(),rotor=new T.Group(),wheelGroup=new T.Group();
  car.add(chassis,frame,shaftGroup,gears,rotor,wheelGroup);
  const verticalModule=new T.Group(),inputModule=new T.Group();
  verticalModule.name='垂直傳動預組件';inputModule.name='水平輸入軸';
  car.add(verticalModule,inputModule);
  const point=(x,y,z)=>new T.Vector3(x-10,z+12.5,13.75-y);
  function mesh(geo,mat,parent,pos=[0,0,0]){const m=new T.Mesh(geo,mat);m.position.set(...pos);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
  function box(size,pos,parent,mat){return mesh(new T.BoxGeometry(...size),mat,parent,pos);}
  function cylinder(r,len,pos,parent,mat,axis='y'){const m=mesh(new T.CylinderGeometry(r,r,len,40),mat,parent,pos);if(axis==='x')m.rotation.z=Math.PI/2;if(axis==='z')m.rotation.x=Math.PI/2;return m;}
  geometries.forEach((source,i)=>{const geo=source.clone();geo.rotateX(-Math.PI/2);geo.translate(-10,12.5-([1,3,4,5].includes(i)?1.25:0),13.75);mesh(geo,i<2||i===5?structure:steel,[chassis,frame,shaftGroup,inputModule,verticalModule,verticalModule][i]);});
  const wheels=[];
  for(const x of [-27.5,47.5])for(const y of [-28.25,55.75]){
    const w=new T.Group();w.position.copy(point(x,y,5.5));w.userData.assembledPosition=w.position.toArray();wheelGroup.add(w);
    cylinder(18,6,[0,0,0],w,tire,'z');cylinder(12,6.6,[0,0,0],w,pale,'z');cylinder(4,7,[0,0,0],w,orange,'z');
    for(let j=0;j<6;j++){const a=j*Math.PI/3;const spoke=box([2,9,7],[Math.sin(a)*7,Math.cos(a)*7,0],w,structure);spoke.rotation.z=-a;}
    wheels.push(w);
  }
  function spur(radius,teeth,width,pos,axis){const g=new T.Group();g.position.copy(pos);gears.add(g);cylinder(radius-.65,width,[0,0,0],g,orange,'z');for(let i=0;i<teeth;i++){const a=i*Math.PI*2/teeth;const t=box([Math.PI*radius/teeth*.83,1.3,width],[Math.sin(a)*radius,Math.cos(a)*radius,0],g,orange);t.rotation.z=-a;}cylinder(1.7,width+1,[0,0,0],g,steel,'z');if(axis==='x')g.rotation.y=Math.PI/2;if(axis==='y')g.rotation.x=-Math.PI/2;return g;}
  function crown(radius,teeth,pos,axis){const g=new T.Group();g.position.copy(pos);gears.add(g);cylinder(radius,1.2,[0,0,0],g,orange);for(let i=0;i<teeth;i++){const a=i*Math.PI*2/teeth;const t=box([Math.PI*radius/teeth*.85,1.8,2],[Math.sin(a)*(radius-1),1.3,Math.cos(a)*(radius-1)],g,orange);t.rotation.y=a;}cylinder(2,2,[0,0,0],g,orange);if(axis==='z')g.rotation.x=Math.PI/2;return g;}
  // Exact source shaft axes: input (y=11.96171,z=77.75), upright (x=42,y=11.96171), output (x=47.5,z=5.5).
  // Added teeth are schematic crown/pinion profiles, not a manufactured gear specification.
  const g1=spur(3.2,12,3,point(33.5,11.96171,77.75),'x');
  const g2=crown(9.6,36,point(42,11.96171,74.1),'y');
  const g3=spur(3.2,12,3,point(42,11.96171,15.8),'y');
  // Put the disk beyond the pinion tips, with its crown facing back toward the pinion.
  // Pinion tip radius = 3.2 + 0.65, disk half-thickness = 0.6, body clearance = 0.2.
  const g4=crown(12.6,36,point(47.5,11.96171-(3.2+.65+.2+.6),5.5),'z');
  g4.rotation.x=-Math.PI/2;
  g1.position.y-=1.25;g2.position.y-=1.25;
  verticalModule.add(g2,g3);inputModule.add(g1);
  const rotorOrigin=point(-30,11.96171,77.75);rotor.position.copy(rotorOrigin);
  rotorOrigin.y-=1.25;rotor.position.copy(rotorOrigin);
  cylinder(5,7,[0,0,0],rotor,orange,'x');
  for(let i=0;i<6;i++){const arm=new T.Group();arm.rotation.x=i*Math.PI/3;rotor.add(arm);const shape=new T.Shape();shape.moveTo(4,-3);shape.bezierCurveTo(12,-9,33,-10,38,-3);shape.bezierCurveTo(41,1,33,9,26,10);shape.lineTo(6,4);shape.closePath();const b=mesh(new T.ExtrudeGeometry(shape,{depth:1.2,bevelEnabled:true,bevelSize:.6,bevelThickness:.5,bevelSegments:2,steps:1}),bladeMat,arm);b.rotation.y=Math.PI/2;b.rotation.x=.32;}
  cylinder(3,8,[-1,0,0],rotor,pale,'x');
  return {car,structure,chassis,frame,shaftGroup,gears,rotor,wheelGroup,verticalModule,inputModule,wheels,g1,g2,g3,g4,rotorOrigin};
}
export function applyExplodeState(model,amount){
  model.frame.position.set(0,amount*30,0);
  model.verticalModule.position.set(amount*45,amount*30,0);
  model.inputModule.position.copy(model.frame.position);
  model.rotor.position.copy(model.rotorOrigin).add(new T.Vector3(-amount*40,amount*30,0));
  model.shaftGroup.position.set(0,0,0);
  model.gears.position.set(0,0,0);
  model.wheelGroup.position.set(0,0,0);
  model.wheels.forEach(w=>{
    w.position.fromArray(w.userData.assembledPosition);
    w.position.z+=Math.sign(w.userData.assembledPosition[2])*amount*22;
  });
}
export function applyDriveState(model,angle){
  model.rotor.rotation.x=angle;
  model.g1.rotation.z=angle;
  model.g2.rotation.y=-angle/3;
  model.g3.rotation.z=-angle/3;
  // Crown local +Y points to world -Z. Negative local rotation produces world +Z.
  model.g4.rotation.y=-angle/9;
  // Rolling without slip: vx = -R * omegaZ, so +Z rotation travels toward the fan (-X).
  model.wheels.forEach(w=>w.rotation.z=angle/9);
}
