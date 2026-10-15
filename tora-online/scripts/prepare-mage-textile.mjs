import {NodeIO} from '@gltf-transform/core';import sharp from 'sharp';import fs from 'node:fs/promises';
const path='assets/textures/characters/mage-brocade.webp';
const bytes=await sharp('assets/textures/characters/mage-brocade-source.png').resize(1024,1024).webp({quality:96}).toBuffer();await fs.writeFile(path,bytes);
const io=new NodeIO(),doc=await io.read('assets/models/player/female-mage.glb'),buffer=doc.getRoot().listBuffers()[0];
let texture=doc.getRoot().listTextures().find(t=>t.getName()==='Tora mage brocade');
texture??=doc.createTexture('Tora mage brocade');texture.setImage(bytes).setMimeType('image/webp');
const cloth=doc.getRoot().listMaterials().find(m=>m.getName()==='jade silk robe');if(!cloth)throw new Error('Mage cloth material missing');
cloth.setBaseColorTexture(texture).setBaseColorFactor([1,1,1,1]).setRoughnessFactor(.86).setMetallicFactor(0);
for(const mesh of doc.getRoot().listMeshes())for(const primitive of mesh.listPrimitives())if(primitive.getMaterial()===cloth){
 const positions=primitive.getAttribute('POSITION').getArray(),uv=[];let min=Infinity,max=-Infinity;
 for(let i=0;i<positions.length;i+=3){min=Math.min(min,positions[i+1]);max=Math.max(max,positions[i+1]);}
 const flatten=/mantle/i.test(mesh.getName())?.65:.83;
 for(let i=0;i<positions.length;i+=3){let angle=Math.atan2(positions[i+2]/flatten,positions[i]);if(angle<0)angle+=Math.PI*2;uv.push(angle/(Math.PI*2),1-(positions[i+1]-min)/Math.max(.001,max-min));}
 primitive.setAttribute('TEXCOORD_0',doc.createAccessor().setType('VEC2').setArray(new Float32Array(uv)).setBuffer(buffer));
}
await io.write('assets/models/player/female-mage.glb',doc);console.log('Original Tora brocade mapped onto existing skinned Mage cloth; silhouette and rig preserved.');
