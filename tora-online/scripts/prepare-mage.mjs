import {Document,NodeIO} from '@gltf-transform/core';
import {prune,weld} from '@gltf-transform/functions';
import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';
const io=new NodeIO(),source='reports/revision-2026-10-12/asset-sources/outfits/Modular Character Outfits - Fantasy[Standard]';
const file=path.join(source,'Exports/glTF (Godot-Unreal)/Outfits/Female_Peasant.gltf');
const json=JSON.parse(await fs.readFile(file,'utf8')),resources={};
for(const buffer of json.buffers)resources[buffer.uri]=new Uint8Array(await fs.readFile(path.join(path.dirname(file),buffer.uri)));
for(const image of json.images)resources[image.uri]=new Uint8Array(await fs.readFile(path.join(source,'Textures/Peasant',image.uri)));
const doc=await io.readJSON({json,resources}),buffer=doc.getRoot().listBuffers()[0],skin=doc.getRoot().listSkins()[0],scene=doc.getRoot().listScenes()[0],rig=scene.listChildren()[0];
const sourceVertices=[];
for(const mesh of doc.getRoot().listMeshes())for(const p of mesh.listPrimitives()){
 const positions=p.getAttribute('POSITION').getArray(),j=p.getAttribute('JOINTS_0').getArray(),w=p.getAttribute('WEIGHTS_0').getArray();
 for(let i=0;i<positions.length;i+=3)sourceVertices.push({p:[positions[i],positions[i+1],positions[i+2]],j:Array.from(j.slice(i/3*4,i/3*4+4)),w:Array.from(w.slice(i/3*4,i/3*4+4))});
}
const silk=doc.createMaterial('jade silk robe').setBaseColorFactor([.055,.24,.22,1]).setRoughnessFactor(.83).setDoubleSided(true);
const bronze=doc.createMaterial('antique bronze embroidery').setBaseColorFactor([.48,.31,.12,1]).setMetallicFactor(.65).setRoughnessFactor(.4);
const hair=doc.createMaterial('dark walnut hair').setBaseColorFactor([.038,.023,.02,1]).setRoughnessFactor(.77);
function geometry(name,positions,indices,material,head=false){
 const normals=Array(positions.length).fill(0),joints=[],weights=[];
 for(let i=0;i<indices.length;i+=3){const a=indices[i]*3,b=indices[i+1]*3,c=indices[i+2]*3,ab=[positions[b]-positions[a],positions[b+1]-positions[a+1],positions[b+2]-positions[a+2]],ac=[positions[c]-positions[a],positions[c+1]-positions[a+1],positions[c+2]-positions[a+2]],n=[ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]];for(const v of [a,b,c])for(let k=0;k<3;k++)normals[v+k]+=n[k];}
 for(let i=0;i<positions.length;i+=3){const len=Math.hypot(...normals.slice(i,i+3))||1;for(let k=0;k<3;k++)normals[i+k]/=len;if(head){joints.push(skin.listJoints().findIndex(n=>n.getName()==='Head'),0,0,0);weights.push(1,0,0,0);}else{let nearest,dist=Infinity;for(const v of sourceVertices){const d=(positions[i]-v.p[0])**2+(positions[i+1]-v.p[1])**2+(positions[i+2]-v.p[2])**2;if(d<dist){dist=d;nearest=v;}}joints.push(...nearest.j);weights.push(...nearest.w);}}
 const accessor=(type,array)=>doc.createAccessor().setType(type).setArray(array).setBuffer(buffer);
 const primitive=doc.createPrimitive().setAttribute('POSITION',accessor('VEC3',new Float32Array(positions))).setAttribute('NORMAL',accessor('VEC3',new Float32Array(normals))).setAttribute('JOINTS_0',accessor('VEC4',new Uint16Array(joints))).setAttribute('WEIGHTS_0',accessor('VEC4',new Float32Array(weights))).setIndices(accessor('SCALAR',new Uint16Array(indices))).setMaterial(material);
 const node=doc.createNode(name).setMesh(doc.createMesh(name).addPrimitive(primitive)).setSkin(skin);rig.addChild(node);return node;
}
function lathe(name,profile,material,{segments=48,pleats=0,head=false,center=[0,0,0],flatten=1}={}){
 const p=[],idx=[];for(let row=0;row<profile.length;row++){const [y,r]=profile[row];for(let s=0;s<=segments;s++){const a=s/segments*Math.PI*2,rad=r*(1+Math.cos(a*12)*pleats);p.push(center[0]+Math.cos(a)*rad,center[1]+y,center[2]+Math.sin(a)*rad*flatten);}}
 for(let row=0;row<profile.length-1;row++)for(let s=0;s<segments;s++){const a=row*(segments+1)+s,b=a+segments+1;idx.push(a,b,a+1,a+1,b,b+1);}return geometry(name,p,idx,material,head);
}
lathe('Mage pleated split overskirt',[[.13,.35],[.22,.34],[.4,.30],[.62,.26],[.83,.21],[1.02,.175],[1.08,.18]],silk,{pleats:.025,flatten:.83});
lathe('Mage embroidered hem',[[.14,.357],[.16,.357],[.18,.35]],bronze,{pleats:.025,flatten:.83});
lathe('Mage layered sash',[[1.02,.187],[1.055,.188],[1.10,.182]],bronze,{flatten:.83});
lathe('Mage shoulder mantle',[[1.28,.25],[1.37,.28],[1.44,.23],[1.50,.12]],silk,{flatten:.65});
lathe('Mage mantle edge',[[1.28,.255],[1.295,.26]],bronze,{flatten:.65});
lathe('Mage hair crown',[[1.69,.14],[1.74,.145],[1.79,.13],[1.83,.08],[1.85,.01]],hair,{head:true,center:[0,0,-.045],flatten:.96});
lathe('Mage bronze circlet',[[1.71,.15],[1.725,.15]],bronze,{head:true,center:[0,0,-.045]});
// A flowing rear braid built from ellipsoid rings, bound to the head joint.
lathe('Mage flowing braid',[[1.10,.02],[1.16,.045],[1.25,.055],[1.35,.07],[1.48,.075],[1.60,.07]],hair,{segments:24,head:true,center:[0,0,-.18],flatten:.72});
for(const texture of doc.getRoot().listTextures()){texture.setImage(await sharp(texture.getImage()).resize({width:1024,height:1024,fit:'inside',withoutEnlargement:true}).png().toBuffer());texture.setMimeType('image/png');}
await doc.transform(weld(),prune());await io.write('assets/models/player/female-mage.glb',doc);

const staff=new Document(),sb=staff.createBuffer(),ss=staff.createScene('Jade staff'),wood=staff.createMaterial('carved walnut').setBaseColorFactor([.20,.095,.037,1]).setRoughnessFactor(.65),metal=staff.createMaterial('bronze staff fittings').setBaseColorFactor([.64,.43,.19,1]).setMetallicFactor(.72).setRoughnessFactor(.35),jade=staff.createMaterial('cut jade crystal').setBaseColorFactor([.08,.48,.47,1]).setEmissiveFactor([.015,.13,.14]).setMetallicFactor(.18).setRoughnessFactor(.3);
function staffLathe(name,profile,material,segments=24){const p=[],n=[],idx=[];for(let r=0;r<profile.length;r++){for(let i=0;i<=segments;i++){const a=i/segments*Math.PI*2;p.push(Math.cos(a)*profile[r][1],profile[r][0],Math.sin(a)*profile[r][1]);n.push(Math.cos(a),0,Math.sin(a));}}for(let r=0;r<profile.length-1;r++)for(let i=0;i<segments;i++){const a=r*(segments+1)+i,b=a+segments+1;idx.push(a,b,a+1,a+1,b,b+1);}const ac=(t,a)=>staff.createAccessor().setType(t).setArray(a).setBuffer(sb);ss.addChild(staff.createNode(name).setMesh(staff.createMesh(name).addPrimitive(staff.createPrimitive().setAttribute('POSITION',ac('VEC3',new Float32Array(p))).setAttribute('NORMAL',ac('VEC3',new Float32Array(n))).setIndices(ac('SCALAR',new Uint16Array(idx))).setMaterial(material))));}
staffLathe('tapered carved shaft',[[-.65,.015],[-.60,.022],[-.2,.024],[.1,.024],[.55,.03],[.85,.028]],wood);
for(const y of [-.58,-.12,.12,.6,.8])staffLathe('engraved bronze collar '+y,[[y,.031],[y+.015,.037],[y+.025,.031]],metal);
staffLathe('bronze lotus crown',[[.8,.03],[.86,.11],[.9,.13],[.93,.075]],metal,16);
staffLathe('jade crystal',[[.9,.04],[.96,.10],[1.06,.08],[1.16,0]],jade,6);
await io.write('assets/models/weapons/jade-staff.glb',staff);

const library=await io.read('assets/animations/ual1-standard.glb'),second=await io.read('assets/animations/ual2-standard.glb'),lb=library.getRoot().listBuffers()[0],nodes=new Map(library.getRoot().listNodes().map(n=>[n.getName().toLowerCase(),n]));
const sources=[...library.getRoot().listAnimations(),...second.getRoot().listAnimations()],clips={idle:'Idle_Loop',combatidle:'Spell_Simple_Idle_Loop',walk:'Walk_Loop',run:'Sprint_Loop',attack1:'Spell_Simple_Shoot',attack2:'Spell_Simple_Enter',attack3:'Spell_Simple_Shoot',heavy:'Spell_Simple_Exit',skill4:'Spell_Simple_Shoot',skill5:'Roll',skill6:'Spell_Simple_Exit',skill7:'Spell_Simple_Enter',skill8:'Spell_Simple_Idle_Loop',skill9:'Spell_Simple_Exit',hit:'Hit_Knockback',dead:'Death01',respawn:'LayToIdle'};
const built=[];
for(const [state,name]of Object.entries(clips)){const source=sources.find(a=>a.getName().toLowerCase()===name.toLowerCase());if(!source)throw new Error('Missing Mage source clip '+name);const animation=library.createAnimation('Mage_'+state);let variant=Object.keys(clips).indexOf(state)*.006;
 for(const ch of source.listChannels()){const target=nodes.get(ch.getTargetNode().getName().toLowerCase());if(!target)continue;const src=ch.getSampler(),copy=accessor=>library.createAccessor().setType(accessor.getType()).setArray(accessor.getArray().slice()).setBuffer(lb),input=copy(src.getInput()),output=copy(src.getOutput());
  if(ch.getTargetPath()==='rotation'&&/upperarm|hand_r/i.test(target.getName())&&state.startsWith('skill')){const values=output.getArray();for(let i=0;i<values.length;i+=4){const x=values[i],w=values[i+3],s=Math.sin(variant),c=Math.cos(variant);values[i]=x*c+w*s;values[i+3]=w*c-x*s;}output.setArray(values);}
  const sampler=library.createAnimationSampler().setInput(input).setOutput(output).setInterpolation(src.getInterpolation());animation.addSampler(sampler).addChannel(library.createAnimationChannel().setTargetNode(target).setTargetPath(ch.getTargetPath()).setSampler(sampler));
 }built.push(animation);
}
for(const a of sources)if(library.getRoot().listAnimations().includes(a)&&!built.includes(a))a.dispose();
await library.transform(prune());await io.write('assets/animations/mage-library.glb',library);
console.log('Mage: distinct CC0 female outfit, original skinned pleated robe, hair, bronze staff, 17 class clips.');
