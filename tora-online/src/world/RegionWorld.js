import { GlbGrass } from './GlbGrass.js?v=45';

export const REGIONS = Object.freeze({
  village: { name:'Ayaz Köyü', subtitle:'Güvenli bölge · Demirci Ayame', terrain:'grassland', seed:13, spawn:[0,-9], exits:[{id:'forest',x:0,z:19,name:'Sisli Orman'}], mobs:[] },
  forest: { name:'Sisli Orman', subtitle:'Av bölgesi · Seviye 1–3', terrain:'grassland', seed:42, spawn:[0,-17], exits:[{id:'village',x:0,z:-20,name:'Ayaz Köyü'},{id:'ruins',x:0,z:20,name:'Kadim Harabe'}], mobs:[{x:-5,z:-7,type:0,patrol:true},{x:6,z:-4,type:1,patrol:true},{x:-6,z:8,type:2,patrol:true},{x:5,z:12,type:0,patrol:true},{x:-9,z:14,type:1,patrol:true}] },
  ruins: { name:'Kadim Harabe', subtitle:'Seviye 3–5 · Kül Muhafızı', terrain:'rock', seed:91, spawn:[0,-17], exits:[{id:'forest',x:0,z:-20,name:'Sisli Orman'}], mobs:[{x:-6,z:-3,type:2,patrol:true},{x:7,z:1,type:1,patrol:true},{x:0,z:12,type:3,boss:true}] },
});

/** Only one finished region is resident. GLB templates are cached across visits. */
export class RegionWorld {
  constructor(scene,navigation,profile,quality='medium') {
    this.scene=scene;this.navigation=navigation;this.profile=profile;this.quality=quality;this.roots=[];this.owned=[];this.cullTimer=0;
    this.region='village';this.assets=null;this.grass=null;
  }
  async build(assets,{id='village'}={}) { this.assets=assets;this.#lighting();return this.load(id); }
  async load(id) {
    if(!REGIONS[id]) throw new Error('Bilinmeyen bölge: '+id);
    this.clear();this.region=id;this.definition=REGIONS[id];this.navigation.obstacles=[];
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
    const road=BABYLON.MeshBuilder.CreateGround('dirt-road',{width:4.6,height:49,subdivisions:80,updatable:true},this.scene);
    const rp=road.getVerticesData(BABYLON.VertexBuffer.PositionKind);
    for(let i=0;i<rp.length;i+=3) rp[i+1]=this.heightAt(rp[i],rp[i+2])+.018;
    road.updateVerticesData(BABYLON.VertexBuffer.PositionKind,rp,true); road.refreshBoundingInfo();road.material=this.#material('mud',10);road.material.albedoTexture.uScale=road.material.bumpTexture.uScale=road.material.metallicTexture.uScale=2;road.material.albedoTexture.vScale=road.material.bumpTexture.vScale=road.material.metallicTexture.vScale=20;road.isPickable=false;road.receiveShadows=true;this.roots.push(road);
    if(this.region==='village') {
      const plaza=BABYLON.MeshBuilder.CreateGround('village-plaza',{width:18,height:17},this.scene);plaza.position.z=-2;plaza.position.y=.025;
      plaza.material=this.#material('cobblestone',7);plaza.isPickable=false;plaza.receiveShadows=true;this.roots.push(plaza);
    }
  }
  async place(key,name,x,z,yaw=0,scale=1,metadata=null,obstacle=0,elevation=0) {
    const root=await this.assets.instantiateStatic(key,name,new BABYLON.Vector3(x,0,z),yaw,scale,metadata);
    root.computeWorldMatrix(true);const bounds=root.getHierarchyBoundingVectors(true);
    root.position.y=this.heightAt(x,z)-bounds.min.y+elevation;
    root.getChildMeshes(false).forEach(m=>{if(m instanceof BABYLON.InstancedMesh)m.sourceMesh.receiveShadows=true;else m.receiveShadows=true;m.isPickable=Boolean(metadata);});
    this.roots.push(root);if(obstacle)this.navigation.addObstacle(x,z,obstacle);
    if(!['grass','fern','bush'].includes(key))this.addShadowCaster(root);
    return root;
  }
  async #nature() {
    const random=this.#random(this.definition.seed), jobs=[];const count=this.region==='forest'?54:32;
    for(let i=0;i<count;i++) {
      const x=(random()-.5)*54,z=(random()-.5)*54;
      if((this.region==='forest'&&Math.abs(z-3)<2.4) || Math.abs(x)<4 || (this.region==='village'&&Math.abs(x)<15&&Math.abs(z)<16) || (this.region==='ruins'&&Math.abs(x)<12&&Math.abs(z)<18))continue;
      jobs.push(this.place(i%3?'common-tree':'pine','tree-'+i,x,z,random()*6.28,.72+random()*.32,null,.65));
    }
    for(let i=0;i<40;i++) {const x=(random()-.5)*48,z=(random()-.5)*48;if(!this.grassAllowed(x,z))continue;
      jobs.push(this.place(i%3===0?'rock-a':i%3===1?'fern':'bush','detail-'+i,x,z,random()*6.28,.45+random()*.6,null,i%3===0?.45:0));}
    // A close ring of tall trees makes the finite region feel enclosed.
    for(let i=0;i<32;i++){const a=i/32*Math.PI*2,x=Math.cos(a)*30,z=Math.sin(a)*30;jobs.push(this.place(i%2?'pine':'common-tree','border-'+i,x,z,a,1.3,null,0));}
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
    await Promise.all([this.#house(-10,6,0),this.#house(10,7,1),this.#house(-11,-9,2)]);
    await Promise.all([
      this.place('market-stall','market',7,-7,Math.PI,.9,null,1.3),this.place('wagon','wagon',11,-13,.2,.75,null,1.2),
      this.place('anvil','blacksmith-anvil',-5,-2,0,1,{interactive:true,cursor:'talk'},.5),this.place('workbench','workbench',-7,0,0,1,null,.6),
      this.place('weapon-stand','weapons',-7,2,0,1,null,.5),this.place('barrel','barrel',9,-4,0,1,null,.45),this.place('chest','chest',7,-3,0,1,{loot:true},.5),
    ]);
    this.npc=await this.assets.instantiateNpc(new BABYLON.Vector3(-4,0,-1),Math.PI*.7);this.roots.push(this.npc);this.addShadowCaster(this.npc);
    for(let i=0;i<6;i++)await this.place('wood-fence','village-fence-'+i,-15+i*2.1,15,0,.85,null,.4);
  }
  async #river() {
    const river=BABYLON.MeshBuilder.CreateGround('river-water',{width:53,height:2.8},this.scene);river.position.set(0,-.06,3);
    const mat=new BABYLON.PBRMaterial('river',this.scene);mat.albedoColor=new BABYLON.Color3(.14,.36,.4);mat.metallic=.1;mat.roughness=.2;mat.alpha=.83;
    river.material=mat;river.isPickable=false;this.owned.push(mat);this.roots.push(river);
    // Mirrored stone steps form a small arched crossing, with real model rails.
    await Promise.all([this.place('stone-stairs','bridge-south',0,2.1,Math.PI,1.25,null,0,-.6),this.place('stone-stairs','bridge-north',0,3.9,0,1.25,null,0,-.6),
      this.place('wood-fence','bridge-left',-1.5,3,Math.PI/2,1.2,null,.3,.15),this.place('wood-fence','bridge-right',1.5,3,Math.PI/2,1.2,null,.3,.15),
      this.place('wagon','abandoned-wagon',-9,9,.4,.65,null,1),this.place('chest','forest-chest',8,9,0,.8,{loot:true},.4)]);
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
    for(const x of [-7,7])jobs.push(this.place('rock-b','ruin-rock-'+x,x,16,0,1.6,null,1.2));
    jobs.push(this.place('chest','boss-treasure',0,17,0,1.1,{loot:true},.65));
    await Promise.all(jobs);
  }
  grassAllowed(x,z) {
    if(Math.abs(x)<3 || Math.abs(x)>24 || Math.abs(z)>24)return false;
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
    this.grass?.update(dt,camera,fps);this.cullTimer+=dt;if(this.cullTimer<.25)return;this.cullTimer=0;
    const target=camera.target;
    for(const root of this.roots) {
      if(root instanceof BABYLON.Mesh || root===this.npc)continue;
      const distance=Math.hypot(root.position.x-target.x,root.position.z-target.z);root.setEnabled(distance<48);
      const bounds=root.getHierarchyBoundingVectors(true);
      const occludes=distance<3.7 && bounds.max.y>target.y+2.5;
      root.getChildMeshes(false).forEach(m=>m.visibility=occludes?.28:1);
    }
  }
  getGrassStats() { return this.grass?.getStats() || {}; }
  clear() {
    this.grass?.dispose();this.grass=null;
    for(const root of this.roots){root.metadata?.animationGroups?.forEach(g=>g.dispose());root.metadata?.skeletons?.forEach(s=>s.dispose());root.getChildMeshes(false).forEach(m=>this.shadowGenerator?.removeShadowCaster(m,false));root.dispose(false,false);}this.roots=[];
    for(const mat of this.owned)mat.dispose(false,true);this.owned=[];this.npc=null;
  }
  dispose() {this.clear();this.shadowGenerator?.dispose();this.hemi?.dispose();this.sun?.dispose();}
  #random(seed) {return ()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}
}
