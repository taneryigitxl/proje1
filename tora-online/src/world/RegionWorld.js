import { GlbGrass } from './GlbGrass.js';

export const REGIONS = Object.freeze({
  village: { name:'Ayaz Köyü', subtitle:'Güvenli bölge · Demirci Ayame', terrain:'grassland', seed:13, spawn:[0,-9], exits:[{id:'forest',x:0,z:19,name:'Sisli Orman'}], mobs:[] },
  forest: { name:'Sisli Orman', subtitle:'Av bölgesi · Seviye 1–3', terrain:'grassland', seed:42, spawn:[0,-17], exits:[{id:'village',x:0,z:-20,name:'Ayaz Köyü'},{id:'ruins',x:0,z:20,name:'Kadim Harabe'}], mobs:[{x:5,z:-11,type:0,patrol:true},{x:12,z:-3,type:1,patrol:true},{x:-11,z:6,type:2,patrol:true},{x:9,z:13,type:0,patrol:true},{x:-4,z:16,type:1,patrol:true}] },
  ruins: { name:'Kadim Harabe', subtitle:'Seviye 3–5 · Kül Muhafızı', terrain:'rock', seed:91, spawn:[0,-17], exits:[{id:'forest',x:0,z:-20,name:'Sisli Orman'}], mobs:[{x:-6,z:-3,type:2,patrol:true},{x:7,z:1,type:1,patrol:true},{x:0,z:12,type:3,boss:true}] },
});

/** Only one finished region is resident. GLB templates are cached across visits. */
export class RegionWorld {
  constructor(scene,navigation,profile,quality='medium') {
    this.scene=scene;this.navigation=navigation;this.profile=profile;this.quality=quality;this.roots=[];this.owned=[];this.cullTimer=0;
    this.region='village';this.assets=null;this.grass=null;this.chests=[];
  }
  async build(assets,{id='village'}={}) { this.assets=assets;this.#lighting();return this.load(id); }
  async load(id) {
    if(!REGIONS[id]) throw new Error('Bilinmeyen bölge: '+id);
    this.clear();this.region=id;this.definition=REGIONS[id];
    const moods={village:[.52,.58,.55,1.05,1.35],forest:[.32,.44,.41,.78,1.05],ruins:[.37,.39,.36,.68,1.1]},m=moods[id];this.scene.clearColor=new BABYLON.Color4(m[0],m[1],m[2],1);this.scene.fogColor=new BABYLON.Color3(m[0],m[1],m[2]);this.scene.fogStart=31;this.scene.fogEnd=75;this.hemi.intensity=m[3];this.sun.intensity=m[4];this.navigation.obstacles=[];
    this.navigation.setHeightProvider((x,z)=>this.heightAt(x,z));
    this.navigation.areaAllowed = (x,z)=> !(id==='forest' && Math.abs(z-3)<1.45 && Math.abs(x)>1.6);
    this.#terrain(); await this.#nature();
    if(id==='village') await this.#village();
    if(id==='forest') await this.#river();
    if(id==='ruins') await this.#ruins();
    for(const gate of this.definition.exits) {
      await this.place('stone-arch','gate-'+gate.id,gate.x,gate.z,0,.85,{portal:gate.id,label:gate.name,cursor:'talk'},0);
      await this.place('torch','gate-torch-'+gate.id,gate.x+2.7,gate.z,0,.8,null,.35);
    }
    this.grass=new GlbGrass(this.scene,this.assets,this.navigation,(x,z)=>this.heightAt(x,z),(x,z)=>this.grassAllowed(x,z));
    await this.grass.build(this.profile,this.quality);
    const [x,z]=this.definition.spawn;
    return {spawn:new BABYLON.Vector3(x,this.heightAt(x,z),z),spawns:this.definition.mobs};
  }
  #lighting() {
    this.scene.clearColor=new BABYLON.Color4(.53,.61,.65,1);
    this.scene.fogMode=BABYLON.Scene.FOGMODE_LINEAR;this.scene.fogStart=50;this.scene.fogEnd=100;this.scene.fogColor=new BABYLON.Color3(.53,.61,.65);
    this.hemi=new BABYLON.HemisphericLight('soft-sky',new BABYLON.Vector3(0,1,0),this.scene);
    this.hemi.intensity=.9;this.hemi.diffuse=new BABYLON.Color3(.78,.86,1);this.hemi.groundColor=new BABYLON.Color3(.27,.25,.21);
    this.sun=new BABYLON.DirectionalLight('afternoon-sun',new BABYLON.Vector3(-.6,-1,.35),this.scene);
    this.sun.position.set(25,40,-25);this.sun.diffuse=new BABYLON.Color3(1,.9,.74);this.sun.intensity=1.9;
    this.sun.shadowMinZ=1;this.sun.shadowMaxZ=110;this.sun.autoCalcShadowZBounds=true;
    this.shadowGenerator=new BABYLON.ShadowGenerator(this.profile.shadows,this.sun);
    this.shadowGenerator.usePercentageCloserFiltering=true;this.shadowGenerator.filteringQuality=BABYLON.ShadowGenerator.QUALITY_LOW;
    this.shadowGenerator.bias=.001;this.shadowGenerator.normalBias=.025;this.shadowGenerator.setDarkness(.25);
    const ip=this.scene.imageProcessingConfiguration;ip.toneMappingEnabled=true;ip.toneMappingType=BABYLON.ImageProcessingConfiguration.TONEMAPPING_ACES;ip.exposure=1.18;ip.contrast=1.04;
  }
  heightAt(x,z) {
    const edge=Math.max(0,Math.max(Math.abs(x),Math.abs(z))-19)*.12;
    const smooth=(Math.sin(x*.2)*Math.cos(z*.16)+Math.sin(z*.33)*.35)*.16;
    if(this.region==='village' && Math.abs(x)<15 && Math.abs(z)<15) return 0;
    if(this.region==='forest' && Math.abs(z-3)<2.25 && Math.abs(x)<1.7) return Math.max(0,1-Math.abs(z-3)/2.25)*1.15;
    if(this.region==='forest' && Math.abs(z-3)<1.45 && Math.abs(x)>1.7) return -.4;
    return smooth+edge;
  }
  #material(key,repeat=12) {
    const def=this.assets.manifest.terrain[key], mat=new BABYLON.PBRMaterial('terrain-'+key,this.scene);
    mat.albedoTexture=new BABYLON.Texture(def.albedo,this.scene);mat.bumpTexture=new BABYLON.Texture(def.normal,this.scene);
    mat.metallicTexture=new BABYLON.Texture(def.roughness,this.scene);mat.useRoughnessFromMetallicTextureAlpha=false;mat.useRoughnessFromMetallicTextureGreen=true;mat.useMetallnessFromMetallicTextureBlue=false;
    mat.metallic=0;mat.roughness=1;mat.bumpTexture.level=.45;
    for(const texture of [mat.albedoTexture,mat.bumpTexture,mat.metallicTexture]) texture.uScale=texture.vScale=repeat;
    this.owned.push(mat);return mat;
  }
  #terrain() {
    const ground=BABYLON.MeshBuilder.CreateGround('region-terrain',{width:100,height:100,subdivisions:100,updatable:true},this.scene);
    const positions=ground.getVerticesData(BABYLON.VertexBuffer.PositionKind);
    for(let i=0;i<positions.length;i+=3) positions[i+1]=this.heightAt(positions[i],positions[i+2]);
    ground.updateVerticesData(BABYLON.VertexBuffer.PositionKind,positions,true); ground.refreshBoundingInfo();
    const normals=[];BABYLON.VertexData.ComputeNormals(positions,ground.getIndices(),normals);ground.updateVerticesData(BABYLON.VertexBuffer.NormalKind,normals);
    ground.material=this.#material(this.definition.terrain,this.region==='ruins'?20:7);ground.receiveShadows=true;ground.metadata={ground:true};ground.isPickable=true;this.roots.push(ground);
    // Terrain surfaces are geometry; all scenery is licensed GLB.
    const road=BABYLON.MeshBuilder.CreateGround('dirt-road',{width:8,height:49,subdivisions:80,updatable:true},this.scene);
    const rp=road.getVerticesData(BABYLON.VertexBuffer.PositionKind);
    const colors=[];for(let i=0;i<rp.length;i+=3){const edge=1-Math.abs(rp[i])/4;rp[i+1]=this.heightAt(rp[i],rp[i+2])+.024;colors.push(1,1,1,Math.min(1,Math.max(0,edge*5)));}road.setVerticesData(BABYLON.VertexBuffer.ColorKind,colors);road.hasVertexAlpha=true;
    road.updateVerticesData(BABYLON.VertexBuffer.PositionKind,rp,true); road.refreshBoundingInfo();road.material=this.#material('mud',10);road.material.albedoTexture.uScale=road.material.bumpTexture.uScale=road.material.metallicTexture.uScale=2;road.material.albedoTexture.vScale=road.material.bumpTexture.vScale=road.material.metallicTexture.vScale=20;road.isPickable=false;road.receiveShadows=true;this.roots.push(road);
    if(this.region==='village') {
      const plaza=BABYLON.MeshBuilder.CreateGround('village-plaza',{width:22,height:18,subdivisions:40},this.scene);plaza.position.z=-2;plaza.position.y=.025;
      const pp=plaza.getVerticesData(BABYLON.VertexBuffer.PositionKind),colors=[];
      for(let i=0;i<pp.length;i+=3){const x=pp[i],z=pp[i+2],edge=Math.min(11-Math.abs(x),9-Math.abs(z))-.12*Math.sin(x*3+z*5);colors.push(1,1,1,BABYLON.Scalar.Clamp(edge/.8,0,1));}
      plaza.setVerticesData(BABYLON.VertexBuffer.ColorKind,colors);plaza.hasVertexAlpha=true;
      plaza.material=this.#material('cobblestone',7);plaza.isPickable=false;plaza.receiveShadows=true;this.roots.push(plaza);
    }
  }
  async place(key,name,x,z,yaw=0,scale=1,metadata=null,obstacle=0,elevation=0) {
    const position=new BABYLON.Vector3(x,0,z);
    const root=key==='chest'
      ?await this.assets.instantiateChest(name,position,yaw,scale,metadata,()=>this.onChestOpen?.(name))
      :await this.assets.instantiateStatic(key,name,position,yaw,scale,metadata);
    if(key==='chest')this.chests.push(root.metadata.chestState);
    root.computeWorldMatrix(true);const bounds=root.getHierarchyBoundingVectors(true);
    root.position.y=this.heightAt(x,z)-bounds.min.y+elevation;
    root.getChildMeshes(false).forEach(m=>{if(m instanceof BABYLON.InstancedMesh)m.sourceMesh.receiveShadows=true;else m.receiveShadows=true;m.isPickable=Boolean(metadata);});
    root.computeWorldMatrix(true);root.metadata={...(root.metadata||{}),occlusionBounds:root.getHierarchyBoundingVectors(true),occlusionMeshes:root.getChildMeshes(false)};
    this.roots.push(root);if(obstacle)this.navigation.addObstacle(x,z,obstacle);
    if(!['grass','fern','bush'].includes(key))this.addShadowCaster(root);
    return root;
  }
  async #nature() {
    const random=this.#random(this.definition.seed),jobs=[];
    const groves={village:[[-20,-15],[-22,5],[-17,22],[18,20],[22,-12]],forest:[[-17,-13],[-19,7],[-15,22],[16,-11],[18,12],[12,24]],ruins:[[-20,-12],[-19,18],[20,-8],[21,18]]}[this.region];
    let index=0;for(const [cx,cz] of groves)for(const [dx,dz] of [[-2,-1],[2,0],[0,3]]){
      const x=cx+dx+(random()-.5),z=cz+dz+(random()-.5);
      if(Math.abs(x)<5.2) continue;
      jobs.push(this.place(this.region==='ruins'||index%3===0?'pine':'common-tree','tree-'+index++,x,z,random()*6.28,.68+random()*.22,null,.6));
    }
    const details={village:[[-17,-3],[17,0],[18,13],[-18,14]],forest:[[-12,-5],[11,-8],[-12,13],[13,8],[-8,21]],ruins:[[-14,6],[14,13],[-15,-10],[15,-13]]}[this.region];
    for(const [x,z]of details){jobs.push(this.place('rock-a','rock-cluster-'+x+'-'+z,x,z,.5,.6,null,.5));jobs.push(this.place('fern','fern-cluster-'+x+'-'+z,x+1.3,z-.5,1,.75));jobs.push(this.place('fern','fern-cluster2-'+x+'-'+z,x-.8,z+1.1,2,.5));}
    // Irregular distant groves leave the road and combat pockets readable.
    for(const [x,z]of [[-29,-22],[-31,-10],[-29,8],[-27,27],[-12,31],[9,32],[28,24],[31,9],[30,-13],[22,-28],[-5,-31]]){
      jobs.push(this.place(index++%2?'pine':'common-tree','border-'+index,x,z,random()*6.28,1.05+random()*.2));
    }
    await Promise.all(jobs);
  }
  async #house(x,z,index) {
    const jobs=[];
    for(let n=-1;n<=1;n++) {
      jobs.push(this.place(n===0?'round-door-wall':'plaster-wall','front-'+index+'-'+n,x+n*1.75,z-2.7,0,.88,null,0));
      jobs.push(this.place('window-wall','back-'+index+'-'+n,x+n*1.75,z+2.7,Math.PI,.88,null,0));
      jobs.push(this.place('plaster-wall','left-'+index+'-'+n,x-2.65,z+n*1.75,Math.PI/2,.88,null,0));
      jobs.push(this.place('window-wall','right-'+index+'-'+n,x+2.65,z+n*1.75,-Math.PI/2,.88,null,0));
    }
    jobs.push(this.place('tile-roof','roof-'+index,x,z,0,.73,null,0,2.15));
    this.navigation.addObstacle(x,z,3.6);await Promise.all(jobs);
  }
  async #village() {
    await Promise.all([this.#house(-12,8,0),this.#house(13,9,1),this.#house(15,-13,2)]);
    await Promise.all([
      this.place('market-stall','market',8,-10,Math.PI,.9,null,1.3),this.place('wagon','wagon',-15,-14,.2,.75,null,1.2),
      this.place('anvil','blacksmith-anvil',-7,-3,0,1,{interactive:true,cursor:'talk'},.5),this.place('workbench','workbench',-8,1,0,1,null,.6),
      this.place('weapon-stand','weapons',-8,3.4,0,1,null,.5),this.place('barrel','barrel',11,-6,0,1,null,.45),this.place('chest','chest',11,-8,0,1,{loot:true},.5),
    ]);
    this.npc=await this.assets.instantiateNpc(new BABYLON.Vector3(-2,0,2),Math.PI*.7);this.roots.push(this.npc);this.addShadowCaster(this.npc);
    for(let i=0;i<6;i++)await this.place('wood-fence','village-fence-'+i,-15+i*2.1,15,0,.85,null,.4);
  }
  async #river() {
    const river=BABYLON.MeshBuilder.CreateGround('river-water',{width:53,height:2.8,subdivisions:24},this.scene);river.position.set(0,-.06,3);
    const colors=[],vertices=river.getVerticesData(BABYLON.VertexBuffer.PositionKind);for(let i=0;i<vertices.length;i+=3)colors.push(1,1,1,Math.min(1,Math.max(0,(1-Math.abs(vertices[i+2])/1.4)*7)));river.setVerticesData(BABYLON.VertexBuffer.ColorKind,colors);river.hasVertexAlpha=true;
    const mat=new BABYLON.PBRMaterial('river',this.scene);mat.albedoColor=new BABYLON.Color3(.14,.36,.4);mat.metallic=.1;mat.roughness=.2;mat.alpha=.79;mat.bumpTexture=new BABYLON.Texture("assets/textures/water-normal.png",this.scene);mat.bumpTexture.uScale=14;mat.bumpTexture.vScale=1.5;mat.bumpTexture.level=.32;this.waterMaterial=mat;
    river.material=mat;river.isPickable=false;this.owned.push(mat);this.roots.push(river);
    // Mirrored stone steps form a small arched crossing, with real model rails.
    await Promise.all([this.place('stone-stairs','bridge-south',0,2.1,Math.PI,1.25,null,0,-.6),this.place('stone-stairs','bridge-north',0,3.9,0,1.25,null,0,-.6),
      this.place('wood-fence','bridge-left',-1.5,3,Math.PI/2,1.2,null,.3,.15),this.place('wood-fence','bridge-right',1.5,3,Math.PI/2,1.2,null,.3,.15),
      this.place('rock-a','shore-rock-west',-5,1.5,.4,.7,null,.45),this.place('rock-b','shore-rock-east',7,4.4,.7,.55,null,.4),this.place('fern','shore-fern',-6,1.1,0,.7),this.place('wagon','abandoned-wagon',-9,9,.4,.65,null,1),this.place('chest','forest-chest',8,9,0,.8,{loot:true},.4)]);
  }
  async #ruins() {
    const court=BABYLON.MeshBuilder.CreateGround('ruin-courtyard',{width:18,height:28,subdivisions:40,updatable:true},this.scene);
    court.position.z=5;const cp=court.getVerticesData(BABYLON.VertexBuffer.PositionKind);
    for(let i=0;i<cp.length;i+=3)cp[i+1]=this.heightAt(cp[i],cp[i+2]+5)+.035;
    court.updateVerticesData(BABYLON.VertexBuffer.PositionKind,cp,true);court.refreshBoundingInfo();court.material=this.#material('cobblestone',6);court.receiveShadows=true;court.isPickable=false;this.roots.push(court);
    const jobs=[];
    for(const x of [-11,11])for(let i=0;i<5;i++)jobs.push(this.place('ruin-wall','ruin-'+x+'-'+i,x,-6+i*4,Math.PI/2,1.2,null,1));
    for(let i=0;i<5;i++)jobs.push(this.place('ruin-wall','rear-'+i,-9+i*4.5,20,0,1.2,null,1));
    jobs.push(this.place('stone-arch','ruin-entry',0,-7,0,1.15,null,0));
    for(const x of [-13,13])jobs.push(this.place('rock-b','ruin-rock-'+x,x,15,0,.85,null,.75));
    jobs.push(this.place('chest','boss-treasure',0,17,0,1.1,{loot:true},.65));
    await Promise.all(jobs);
  }
  grassAllowed(x,z) {
    if(Math.abs(x)<4.2 || Math.abs(x)>24 || Math.abs(z)>24)return false;
    if(this.region==='village'&&Math.abs(x)<15&&Math.abs(z)<16)return false;
    if(this.region==='forest'&&Math.abs(z-3)<2)return false;
    if(this.region==='ruins'&&Math.abs(x)<12&&Math.abs(z)<21)return false;
    return this.navigation.canOccupy({x,z},.2);
  }
  async buildOptional() {}
  addShadowCaster(root) { root.getChildMeshes(false).forEach(m=>{if(m.getTotalVertices()>0)this.shadowGenerator.addShadowCaster(m,false);}); }
  applyQuality(profile,name) {
    this.profile=profile;this.quality=name;this.shadowGenerator.getShadowMap().resize(profile.shadows);this.grass?.applyQuality(profile,name);
  }
  update(dt,camera,fps) {
    this.grass?.update(dt,camera,fps);if(this.waterMaterial){this.waterMaterial.bumpTexture.uOffset+=dt*.012;this.waterMaterial.bumpTexture.vOffset+=dt*.008;}
    this.cullTimer+=dt;if(this.cullTimer<.08)return;const step=this.cullTimer;this.cullTimer=0;
    const target=camera.target,direction=target.subtract(camera.position),length=direction.length();
    if(length<0.05)return;
    direction.normalize();const ray=new BABYLON.Ray(camera.position,direction,Math.max(0,length-0.8));
    const blend=Math.min(1,step*6);
    for(const root of this.roots){
      if(root instanceof BABYLON.Mesh||root===this.npc)continue;
      const distance=Math.hypot(root.position.x-target.x,root.position.z-target.z);root.setEnabled(distance<46);
      if(!root.isEnabled())continue;
      const bounds=root.metadata?.occlusionBounds,meshes=root.metadata?.occlusionMeshes||[];
      const occludes=Boolean(bounds&&bounds.max.y>target.y+.35&&ray.intersectsBoxMinMax(bounds.min,bounds.max));
      const opacity=occludes?0.22:1;
      for(let i=0;i<meshes.length;i++){
        let mesh=meshes[i];
        if(!mesh||mesh.isDisposed?.())continue;
        if(mesh instanceof BABYLON.InstancedMesh){
          if(!occludes)continue;
          const instance=mesh;
          const fade=instance.sourceMesh.clone(instance.name+'-fade',instance.parent);
          fade.position.copyFrom(instance.position);
          fade.scaling.copyFrom(instance.scaling);
          fade.rotation.copyFrom(instance.rotation);
          if(instance.rotationQuaternion)fade.rotationQuaternion=instance.rotationQuaternion.clone();
          fade.isPickable=false;
          fade.metadata={...(instance.metadata||{})};
          fade.visibility=1;
          this.#fadeMaterial(fade);
          this.shadowGenerator?.addShadowCaster(fade,false);
          instance.setEnabled(false);
          meshes[i]=fade;
          mesh=fade;
        }
        if(occludes)this.#fadeMaterial(mesh);
        else if(mesh.metadata?.occlusionSource)this.#restoreMaterial(mesh);
        mesh.visibility=BABYLON.Scalar.Lerp(mesh.visibility??1,opacity,blend);
      }
    }
  }
  #fadeMaterial(mesh) {
    if(!mesh.material)return;
    if(mesh.metadata?.occlusionMaterial){mesh.material=mesh.metadata.occlusionMaterial;return;}
    const mat=mesh.material.clone((mesh.name||'occluder')+'-occlude');
    mat.transparencyMode=BABYLON.Material.MATERIAL_ALPHABLEND;
    mat.disableDepthWrite=true;
    mat.forceDepthWrite=false;
    mesh.metadata={...(mesh.metadata||{}),occlusionMaterial:mat,occlusionSource:mesh.material};
    mesh.material=mat;
  }
  #restoreMaterial(mesh) {
    if(mesh.metadata?.occlusionSource)mesh.material=mesh.metadata.occlusionSource;
    // Keep one cached fade material per occluder; release it with the region.
  }
  getGrassStats() { return this.grass?.getStats() || {}; }
  clear() {
    this.grass?.dispose();this.grass=null;
    const fadeMaterials=[];
    for(const root of this.roots){for(const mesh of root.metadata?.occlusionMeshes||[])if(mesh.metadata?.occlusionMaterial)fadeMaterials.push(mesh.metadata.occlusionMaterial);root.metadata?.chestState?.dispose();root.metadata?.animationGroups?.forEach(g=>g.dispose());root.metadata?.skeletons?.forEach(s=>s.dispose());root.getChildMeshes(false).forEach(m=>this.shadowGenerator?.removeShadowCaster(m,false));root.dispose(false,false);}
    for(const mat of fadeMaterials)mat.dispose(false,false);
    this.roots=[];
    for(const mat of this.owned)mat.dispose(false,true);this.owned=[];this.npc=null;this.waterMaterial=null;this.chests=[];
  }
  dispose() {this.clear();this.shadowGenerator?.dispose();this.hemi?.dispose();this.sun?.dispose();}
  #random(seed) {return ()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}
}
