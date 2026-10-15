import { NodeIO } from '@gltf-transform/core';
import { prune, weld } from '@gltf-transform/functions';
import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';
// Authored CC0 Quaternius hairstyles. No generated replacement geometry.
const source=process.argv[2]||'reports/current-audit/sources/Universal Base Characters[Standard]';
const io=new NodeIO();
for(const [style,file] of [['warrior','Hair_Buns'],['mage','Hair_Long']]){
 const directory=path.join(source,'Hairstyles/Rigged to Head Bone/glTF (Godot -Unreal)');
 const doc=await io.read(path.join(directory,file+'.gltf'));
 for(const material of doc.getRoot().listMaterials())material.setBaseColorFactor(style==='warrior'?[.22,.12,.065,1]:[.11,.065,.04,1]);
 for(const texture of doc.getRoot().listTextures()) {
  const normal=/normal/i.test(texture.getName());
  const image=sharp(texture.getImage()).resize({width:1024,height:1024,fit:'inside',withoutEnlargement:true});
  texture.setImage(await (normal?image.removeAlpha().png({compressionLevel:9}):image.webp({lossless:true})).toBuffer());
  texture.setMimeType(normal?'image/png':'image/webp');
 }
 await doc.transform(weld(),prune());await io.write(`assets/models/player/${style}-hair.glb`,doc);
}
// Remove shoulder/arm fragments accidentally retained by the original Y-only crop.
const head=await io.read('assets/models/player/warrior-head.glb');
const face=head.getRoot().listMeshes().find(m=>m.getName()==='Superhero_Female');
for(const primitive of face.listPrimitives()){
 const positions=primitive.getAttribute('POSITION').getArray(),indices=primitive.getIndices().getArray(),kept=[];
 for(let i=0;i<indices.length;i+=3)if([indices[i],indices[i+1],indices[i+2]].every(v=>Math.abs(positions[v*3])<.145))kept.push(indices[i],indices[i+1],indices[i+2]);
 if(kept.length<1000)throw new Error('Invalid head crop');primitive.getIndices().setArray(new Uint16Array(kept));
}
for(const texture of head.getRoot().listTextures()){
 if(/normal/i.test(texture.getName()))continue;
 texture.setImage(await sharp(texture.getImage()).webp({lossless:true}).toBuffer());texture.setMimeType('image/webp');
}
await head.transform(weld(),prune());await io.write('assets/models/player/warrior-head.glb',head);
// Retain the full mesh resolution and only the animation clips used by Warrior.
const {CLASS_DEFS}=await import('../shared/ClassDefs.js');
// A staff stays in the right hand even when spell clips originally opened that hand.
// Reuse the authored sword grip on finger joints; retain wrist/arm/body motion.
const gripLibrary=await io.read('assets/animations/ual1-standard.glb');
const gripClip=gripLibrary.getRoot().listAnimations().find(a=>a.getName().toLowerCase()==='sword_idle');
if(!gripClip)throw new Error('Authored hand grip animation missing');
const fingers=new Map();
for(const channel of gripClip.listChannels())if(channel.getTargetPath()==='rotation'&&/^(index|middle|ring|pinky|thumb)_0[123]_r$/.test(channel.getTargetNode().getName())){
 const output=channel.getSampler().getOutput();fingers.set(channel.getTargetNode().getName(),output.getElement(Math.floor(output.getCount()/2),[]));
}
const mage=await io.read('assets/animations/mage-library.glb');
for(const clip of mage.getRoot().listAnimations())for(const channel of clip.listChannels()){
 const grip=fingers.get(channel.getTargetNode().getName());if(!grip||channel.getTargetPath()!=='rotation')continue;
 const output=channel.getSampler().getOutput(),values=output.getArray().slice();for(let i=0;i<values.length;i+=4)values.set(grip,i);
 channel.getSampler().setOutput(mage.createAccessor().setType('VEC4').setArray(values).setBuffer(mage.getRoot().listBuffers()[0]));
}
await mage.transform(prune());await io.write('assets/animations/mage-library.glb',mage);
const wanted=new Set(Object.values(CLASS_DEFS.warrior.animations).flat());
for(const [index,url]of ['assets/animations/ual1-standard.glb','assets/animations/ual2-standard.glb'].entries()){
 const doc=await io.read(url);for(const clip of doc.getRoot().listAnimations())if(!wanted.has(clip.getName().toLowerCase())){
   clip.listChannels().forEach(channel=>channel.dispose());clip.listSamplers().forEach(sampler=>sampler.dispose());clip.dispose();
 }
 for(const node of doc.getRoot().listNodes())if(node.getMesh())node.setMesh(null);
 await doc.transform(prune());await io.write(`assets/animations/warrior-${index+1}.glb`,doc);
}
console.log('Authored textured hairstyles, clean head crop, lossless texture encoding and selected Warrior clips prepared.');

// Babylon reparents skinned surfaces away from their named outfit grouping node.
// Keep a stable part name on the actual surface; preserve every binary/extension byte.
const rangerPath='assets/models/player/female-ranger.glb';
const bytes=await fs.readFile(rangerPath),jsonLength=bytes.readUInt32LE(12);
const json=JSON.parse(bytes.subarray(20,20+jsonLength).toString('utf8'));
const hood=json.nodes.find(n=>n.name==='Female_Ranger_Head_Hood');
if(!hood)throw new Error('Ranger hood group missing');
for(const index of hood.children||[])json.nodes[index].name='Female_Ranger_Head_Hood-surface';
const raw=Buffer.from(JSON.stringify(json)),padding=(4-raw.length%4)%4,chunk=Buffer.concat([raw,Buffer.alloc(padding,32)]);
const output=Buffer.concat([bytes.subarray(0,12),Buffer.alloc(8),chunk,bytes.subarray(20+jsonLength)]);
output.writeUInt32LE(output.length,8);output.writeUInt32LE(chunk.length,12);output.writeUInt32LE(0x4e4f534a,16);
await fs.writeFile(rangerPath,output);
