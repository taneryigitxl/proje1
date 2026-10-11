import fs from 'node:fs';
for (const name of ['buildings/plaster-wall','buildings/tile-roof','buildings/stone-stairs','nature/grass','player/female-ranger']) {
  const b=fs.readFileSync('assets/models/'+name+'.glb'); const j=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)));
  console.log(name, JSON.stringify({meshes:j.meshes.map(m=>({name:m.name,min:j.accessors[m.primitives[0].attributes.POSITION].min,max:j.accessors[m.primitives[0].attributes.POSITION].max})),nodes:j.nodes.filter(n=>n.mesh!==undefined).map(n=>({name:n.name,translation:n.translation,scale:n.scale,skin:n.skin}))}));
}
