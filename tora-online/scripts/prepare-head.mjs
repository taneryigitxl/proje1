import { NodeIO } from '@gltf-transform/core';
import { prune, weld } from '@gltf-transform/functions';
import sharp from 'sharp';
import path from 'node:path';
import fs from 'node:fs/promises';

// Usage: node scripts/prepare-head.mjs /path/to/Superhero_Female_FullBody.gltf
// Source: Quaternius Universal Base Characters Standard, CC0.
const io=new NodeIO();const source=process.argv[2];const json=JSON.parse(await fs.readFile(source,'utf8'));
// The Standard archive has a few image URI suffixes that differ from its files.
for(const image of json.images||[]) {
  try {await fs.access(path.join(path.dirname(source),image.uri));}
  catch {image.uri=image.uri.replace(/_png\.png$/,'.png');}
}
const resources={};for(const def of [...json.buffers,...json.images])if(def.uri)resources[def.uri]=new Uint8Array(await fs.readFile(path.join(path.dirname(source),def.uri)));
const doc=await io.readJSON({json,resources});
const mesh=doc.getRoot().listMeshes().find(m=>m.getName()==='Superhero_Female');
if(!mesh)throw new Error('Expected source model not found.');
for(const primitive of mesh.listPrimitives()) {
  const positions=primitive.getAttribute('POSITION').getArray(), indices=primitive.getIndices().getArray(), kept=[];
  for(let i=0;i<indices.length;i+=3)if([indices[i],indices[i+1],indices[i+2]].every(v=>positions[v*3+1]>1.405))kept.push(indices[i],indices[i+1],indices[i+2]);
  if(kept.length<200)throw new Error('Head selection failed.');
  primitive.getIndices().setArray(new Uint16Array(kept));
}
for(const texture of doc.getRoot().listTextures()) {
  const bytes=await sharp(texture.getImage()).resize({width:1024,height:1024,fit:'inside',withoutEnlargement:true}).png().toBuffer();
  texture.setImage(bytes);texture.setMimeType('image/png');
}
await doc.transform(weld(),prune());
await io.write(path.resolve('assets/models/player/warrior-head.glb'),doc);
console.log('CC0 rigged head, eyes and eyebrows prepared.');
