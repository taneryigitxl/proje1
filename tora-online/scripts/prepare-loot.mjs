// Original pleated leather pouch with a tied cord. Deterministic, no external artwork.
import { Document, NodeIO } from '@gltf-transform/core';
import { normals } from '@gltf-transform/functions';
const doc = new Document(), buffer = doc.createBuffer(), scene = doc.createScene('Ganimet kesesi');
const leather = doc.createMaterial('warm worn leather').setBaseColorFactor([.31,.17,.085,1]).setRoughnessFactor(.94).setDoubleSided(true);
const rope = doc.createMaterial('flax drawstring').setBaseColorFactor([.53,.38,.18,1]).setRoughnessFactor(1).setEmissiveFactor([.045,.025,.005]);
function surface(name, rings, segments, point, material) {
  const positions = [], colors = [], indices = [];
  for (let j=0;j<=rings;j++) for(let i=0;i<=segments;i++) {
    const u=i/segments, v=j/rings; positions.push(...point(u,v));
    const wear=.88+.1*Math.sin(i*17+j*23); colors.push(wear,wear,wear,1);
  }
  for(let j=0;j<rings;j++)for(let i=0;i<segments;i++){const a=j*(segments+1)+i,b=a+segments+1;indices.push(a,b,a+1,a+1,b,b+1);}
  const primitive=doc.createPrimitive().setAttribute('POSITION',doc.createAccessor().setType('VEC3').setArray(new Float32Array(positions)).setBuffer(buffer))
    .setAttribute('COLOR_0',doc.createAccessor().setType('VEC4').setArray(new Float32Array(colors)).setBuffer(buffer))
    .setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint16Array(indices)).setBuffer(buffer)).setMaterial(material);
  const mesh=doc.createMesh(name).addPrimitive(primitive);scene.addChild(doc.createNode(name).setMesh(mesh));
}
const profile=[[.012,.035],[.025,.20],[.085,.285],[.18,.29],[.29,.23],[.37,.12],[.40,.085],[.435,.11],[.46,.13],[.455,.085],[.415,.065]];
surface('pleated-pouch',40,32,(u,v)=>{
  const a=u*Math.PI*2,k=v*(profile.length-1),i=Math.min(profile.length-2,Math.floor(k)),t=k-i;
  const y=profile[i][0]*(1-t)+profile[i+1][0]*t,r=profile[i][1]*(1-t)+profile[i+1][1]*t;
  const fold=1+.065*Math.cos(a*8+v*.4)*(.3+v)+.035*Math.sin(a*3),radius=r*fold;
  return [Math.cos(a)*radius,y+.009*Math.cos(a*8)*Math.pow(v,4),Math.sin(a)*radius*.88];
},leather);
surface('drawstring',32,8,(u,v)=>{const a=u*Math.PI*2,b=v*Math.PI*2,r=.091+.013*Math.cos(b);return [r*Math.cos(a),.40+.013*Math.sin(b),r*Math.sin(a)*.88];},rope);
for(const side of [-1,1])surface('cord-tail-'+side,10,6,(u,v)=>{
  const a=v*Math.PI*2;return [side*(.04+.1*u)+.009*Math.cos(a),.405-.14*u+.009*Math.sin(a),-.105-.015*Math.sin(u*Math.PI)];
},rope);
surface('tie-knot',8,8,(u,v)=>{const a=u*Math.PI*2,b=v*Math.PI;return [.023*Math.cos(a)*Math.sin(b),.402+.024*Math.cos(b),-.108+.018*Math.sin(a)*Math.sin(b)];},rope);
await doc.transform(normals());
await new NodeIO().write('assets/models/props/loot-bag.glb',doc);
console.log('Original loot-bag.glb generated.');
