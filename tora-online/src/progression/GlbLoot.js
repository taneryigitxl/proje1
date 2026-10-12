import { ITEM_DEFS } from './InventorySystem.js';

export class GlbLoot {
  constructor(scene,inventory,onStatus,navigation,assets) {
    Object.assign(this,{scene,inventory,onStatus,navigation,assets});this.drops=[];this.generation=0;
    this.beamMaterial=new BABYLON.StandardMaterial('loot-beam',scene);
    this.beamMaterial.emissiveColor=new BABYLON.Color3(.86,.68,.34);
    this.beamMaterial.diffuseColor=new BABYLON.Color3(.35,.24,.1);
    this.beamMaterial.alpha=.32;
    this.beamMaterial.transparencyMode=BABYLON.Material.MATERIAL_ALPHABLEND;
    this.beamMaterial.disableLighting=true;
    this.beamMaterial.backFaceCulling=false;
    this.beamMaterial.disableDepthWrite=true;
  }
  rollFor(mob) {return mob.definition.boss?'iron-blade':Math.random()<.6?'wolf-fang':Math.random()<.5?'health-potion':'mana-potion';}
  async spawnDrop(source,itemId,position=null) {
    if(!ITEM_DEFS[itemId])return false;
    const generation=this.generation, origin=(position||source.position).clone();origin.y=this.navigation.heightAt(origin.x,origin.z);
    try {
      const root=await this.assets.instantiateStatic('chest','loot-'+Date.now(),origin,0,.25,{lootPickup:true,itemId});
      if(generation!==this.generation){root.dispose();return false;}
      const bounds=root.getHierarchyBoundingVectors(true);root.position.y+=origin.y-bounds.min.y+.02;
      const beam=BABYLON.MeshBuilder.CreateCylinder('loot-beam',{height:1.15,diameterTop:.04,diameterBottom:.32,tessellation:8},this.scene);
      beam.parent=root;beam.position.y=.72;beam.isPickable=false;beam.material=this.beamMaterial;
      root.metadata={lootPickup:true,itemId};this.drops.push({mesh:root,itemId,life:60,beam});this.onStatus?.(ITEM_DEFS[itemId].name+' düştü · yaklaş ve tıkla');return true;
    }catch(error){console.error('[Tora Loot]',error);this.onStatus?.('Ganimet modeli yüklenemedi.');return false;}
  }
  tryPickup(mesh) {
    const drop=this.drops.find(d=>d.mesh===mesh||d.mesh.getChildMeshes(false).includes(mesh));if(!drop)return false;
    if(BABYLON.Vector3.Distance(drop.mesh.position,this.inventory.player.position)>3){this.onStatus?.('Ganimete yaklaş.');return false;}
    if(!this.inventory.add(drop.itemId)){this.onStatus?.('Envanter dolu.');return false;}
    this.onStatus?.(ITEM_DEFS[drop.itemId].name+' alındı.');drop.mesh.dispose();this.drops.splice(this.drops.indexOf(drop),1);return true;
  }
  update(dt){const pulse=.26+Math.sin(performance.now()*.005)*.08;if(this.beamMaterial)this.beamMaterial.alpha=pulse;for(let i=this.drops.length-1;i>=0;i--){const d=this.drops[i];d.life-=dt;if(d.life<=0){d.mesh.dispose();this.drops.splice(i,1);}}}
  dispose(){this.generation++;for(const d of this.drops)d.mesh.dispose();this.drops=[];this.beamMaterial?.dispose();}
}
