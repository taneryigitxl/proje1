import sharp from 'sharp';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {NodeIO} from '@gltf-transform/core';
import {prune,dedup,weld,simplifyPrimitive,getBounds,textureCompress} from '@gltf-transform/functions';
import {MeshoptSimplifier} from 'meshoptimizer';
import fs from 'node:fs/promises';import path from 'node:path';
const source=process.argv[2];if(!source)throw new Error('Source directory required');
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS);await MeshoptSimplifier.ready;
await fs.mkdir('assets/models/environment',{recursive:true});
for(const [id,nodeIndex,out,height] of [['pine_sapling_medium',2,'pine',7],['tree_small_02',0,'common-tree',6.5],['rock_moss_set_01',0,'rock-a',1.3],['rock_moss_set_01',2,'rock-b',1.8]]){
 const doc=await io.read(path.join(source,id,id+'.gltf'));
 const nodes=doc.getRoot().listNodes();const keep=nodes[nodeIndex];for(const node of nodes)if(node!==keep)node.dispose();
 await doc.transform(prune(),dedup(),weld());
 if(id==='pine_sapling_medium'||id==='tree_small_02'){
  const mesh=keep.getMesh(),foliage=mesh.listPrimitives().find(p=>/twig|leaves/.test(p.getMaterial()?.getName()||'')),pos=foliage.getAttribute('POSITION'),normals=foliage.getAttribute('NORMAL'),bounds=getBounds(keep),height0=bounds.max[1]-bounds.min[1],count=id.includes('pine')?450:900;
  const diffuseName=id.includes('pine')?'pine_sapling_medium_twig_diff_1k.jpg':'tree_small_02_leaves_diff_1k.jpg';
  const crop=id.includes('pine')?{left:31,top:39,width:177,height:396}:{left:54,top:328,width:154,height:90};
  const rgb=await sharp(path.join(source,id,'textures',diffuseName)).extract(crop).resize(512,512).removeAlpha().raw().toBuffer(),alpha=await sharp(path.join(source,id,'alpha.png')).extract(crop).resize(512,512).greyscale().raw().toBuffer();
  const rgba=Buffer.alloc(512*512*4);for(let i=0;i<512*512;i++){rgba[i*4]=rgb[i*3];rgba[i*4+1]=rgb[i*3+1];rgba[i*4+2]=rgb[i*3+2];rgba[i*4+3]=alpha[i];}
  const image=await sharp(rgba,{raw:{width:512,height:512,channels:4}}).png().toBuffer();
  const texture=doc.createTexture('foliage-rgba').setImage(image).setMimeType('image/png'),material=foliage.getMaterial();material.setNormalTexture(null).setMetallicRoughnessTexture(null).setRoughnessFactor(1).setMetallicFactor(0).setBaseColorTexture(texture).setAlphaMode('MASK').setAlphaCutoff(.35).setDoubleSided(true);
  const vertices=[],ns=[],uv=[],indices=[],p=[0,0,0],n=[0,0,0];let seed=127;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<count;i++){const index=Math.floor(rand()*pos.getCount());pos.getElement(index,p);normals.getElement(index,n);
   const angle=rand()*Math.PI*2,w=height0/(id.includes('pine')?9:21),h=w*(id.includes('pine')?1.4:1.6),ux=Math.cos(angle)*w/2,uz=Math.sin(angle)*w/2;
   for(let cross=0;cross<2;cross++){const x=cross?-uz:ux,z=cross?ux:uz,base=vertices.length/3;
    vertices.push(p[0]-x,p[1]-h/2,p[2]-z,p[0]+x,p[1]-h/2,p[2]+z,p[0]+x,p[1]+h/2,p[2]+z,p[0]-x,p[1]+h/2,p[2]-z);
    for(let k=0;k<4;k++)ns.push(-Math.sin(angle),.15,Math.cos(angle));uv.push(0,0,1,0,1,1,0,1);indices.push(base,base+1,base+2,base,base+2,base+3);
   }
  }
  const buffer=doc.getRoot().listBuffers()[0],attr=(type,array)=>doc.createAccessor().setType(type).setArray(array).setBuffer(buffer);
  const cards=doc.createPrimitive().setAttribute('POSITION',attr('VEC3',new Float32Array(vertices))).setAttribute('NORMAL',attr('VEC3',new Float32Array(ns))).setAttribute('TEXCOORD_0',attr('VEC2',new Float32Array(uv))).setIndices(attr('SCALAR',new Uint16Array(indices))).setMaterial(material);
  mesh.removePrimitive(foliage);foliage.dispose();mesh.addPrimitive(cards);
 }
 for(const mesh of doc.getRoot().listMeshes())for(const primitive of mesh.listPrimitives()){
  const count=primitive.getAttribute('POSITION').getCount(),ratio=Math.min(1,5000/count);
  if(ratio<1&&!/twig|leaves/.test(primitive.getMaterial()?.getName()||''))simplifyPrimitive(primitive,{simplifier:MeshoptSimplifier,ratio,error:.005});
 }
 const bounds=getBounds(keep),s=height/(bounds.max[1]-bounds.min[1]);
 keep.setTranslation([-(bounds.min[0]+bounds.max[0])/2,-bounds.min[1],-(bounds.min[2]+bounds.max[2])/2]);
 const wrapper=doc.createNode(out).setScale([s,s,s]).addChild(keep);for(const scene of doc.getRoot().listScenes()){scene.removeChild(keep);scene.addChild(wrapper);}
 await doc.transform(prune(),dedup());
 await doc.transform(textureCompress({encoder:sharp,targetFormat:'webp',resize:[512,512]}));
 await io.write('assets/models/environment/'+out+'.glb',doc);
 console.log(out,doc.getRoot().listMeshes().flatMap(m=>m.listPrimitives()).reduce((n,p)=>n+p.getAttribute('POSITION').getCount(),0),'vertices');
}
