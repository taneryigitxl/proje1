import {attachGrassWind} from './GrassWind.js';
/** Static GLB foliage, batched in 8m cells. Buffers are never rebuilt per frame. */
export class GlbGrass {
  constructor(scene,assets,navigation,heightAt,allowed) {Object.assign(this,{scene,assets,navigation,heightAt,allowed});this.cells=[];this.timer=0;}
  async build(profile,quality) {
    const template=await this.assets.getStaticTemplate('grass');template.computeWorldMatrix(true);
    const sources=template.getChildMeshes(false).filter(m=>m.getTotalVertices()>0);this.max=3600;
    let seed=6789;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    for(const source of sources)if(source.material)attachGrassWind(source.material);
    const groups=new Map();
    for(let i=0;i<7200;i++) {
      const x=(random()-.5)*48,z=(random()-.5)*48;if(!this.allowed(x,z))continue;
      const cx=Math.floor((x+24)/8),cz=Math.floor((z+24)/8),key=cx+cz*6;
      if(!groups.has(key))groups.set(key,{x:cx*8-20,z:cz*8-20,placements:[]});
      groups.get(key).placements.push({x,z,y:this.heightAt(x,z),yaw:random()*6.28,scale:.23+random()*.25});
    }
    for(const [key,group] of groups)for(const source of sources) {
      source.computeWorldMatrix(true);
      const mesh=source.clone('grass-cell-'+key,null,true);mesh.makeGeometryUnique();mesh.bakeTransformIntoVertices(source.getWorldMatrix());
      mesh.parent=null;mesh.position.setAll(0);mesh.scaling.setAll(1);mesh.rotationQuaternion=null;mesh.rotation.setAll(0);mesh.setEnabled(true);mesh.isPickable=false;mesh.receiveShadows=false;
      const buffer=new Float32Array(group.placements.length*16);
      group.placements.forEach((p,i)=>BABYLON.Matrix.Compose(new BABYLON.Vector3(p.scale,p.scale,p.scale),BABYLON.Quaternion.FromEulerAngles(0,p.yaw,0),new BABYLON.Vector3(p.x,p.y,p.z)).copyToArray(buffer,i*16));
      mesh.thinInstanceSetBuffer('matrix',buffer,16,true);mesh.thinInstanceRefreshBoundingInfo();this.cells.push({mesh,x:group.x,z:group.z,count:group.placements.length});
    }
    this.applyQuality(profile,quality);
  }
  applyQuality(profile,quality) {this.profile=profile;this.quality=quality;for(const cell of this.cells)cell.mesh.thinInstanceCount=Math.max(1,Math.floor(cell.count*profile.grass/3600));}
  update(dt,camera) {this.timer+=dt;if(this.timer<.25)return;this.timer=0;for(const cell of this.cells)cell.mesh.isVisible=Math.hypot(cell.x-camera.target.x,cell.z-camera.target.z)<this.profile.grassDistance;}
  getStats() {return {quality:this.quality,cells:this.cells.length,instances:this.cells.reduce((n,c)=>n+(c.mesh.isVisible?c.mesh.thinInstanceCount:0),0),source:'licensed GLB'};}
  dispose() {for(const cell of this.cells)cell.mesh.dispose(false,false);this.cells=[];}
}
