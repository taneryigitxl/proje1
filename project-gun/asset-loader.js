(function(){
  "use strict";

  const PREFIXES={
    player:"[WeaponLoader]",
    weapons:"[WeaponLoader]",
    zombies:"[ZombieLoader]",
    environment:"[EnvironmentLoader]",
  };

  class ProjectGunAssetLibrary{
    constructor(scene,manifest,onProgress=()=>{}){
      this.scene=scene;
      this.manifest=manifest;
      this.onProgress=onProgress;
      this.containers=new Map();
      this.failures=new Map();
      this.loaded=0;
      this.total=Object.values(manifest).reduce((sum,group)=>sum+Object.keys(group).length,0);
    }

    key(category,name){return `${category}:${name}`}

    async preload(){
      const jobs=[];
      for(const [category,group] of Object.entries(this.manifest)){
        for(const [name,definition] of Object.entries(group))jobs.push(this.load(category,name,definition));
      }
      await Promise.allSettled(jobs);
      return{loaded:this.containers.size,failed:this.failures.size,total:this.total};
    }

    async load(category,name,definition){
      const assetKey=this.key(category,name),prefix=PREFIXES[category]||"[AssetLoader]";
      try{
        const slash=definition.url.lastIndexOf("/"),rootUrl=definition.url.slice(0,slash+1),fileName=definition.url.slice(slash+1);
        const container=await BABYLON.SceneLoader.LoadAssetContainerAsync(rootUrl,fileName,this.scene,undefined,".glb");
        container.removeAllFromScene();
        this.containers.set(assetKey,{container,definition});
      }catch(error){
        this.failures.set(assetKey,error);
        console.error(`${prefix} ${definition.url} yüklenemedi; güvenli fallback kullanılacak.`,error);
      }finally{
        this.loaded++;
        this.onProgress({loaded:this.loaded,total:this.total,failed:this.failures.size});
      }
    }

    has(category,name){return this.containers.has(this.key(category,name))}

    instantiate(category,name,instanceName,parent=null,options={}){
      const record=this.containers.get(this.key(category,name));
      if(!record)return null;
      try{
        const instance=record.container.instantiateModelsToScene(sourceName=>`${instanceName}-${sourceName}`,Boolean(options.cloneMaterials),{doNotInstantiate:false});
        if(parent)instance.rootNodes.forEach(node=>{node.parent=parent});
        const meshes=instance.rootNodes.flatMap(node=>node.getChildMeshes?.(false)||[]);
        return{...instance,meshes,definition:record.definition};
      }catch(error){
        const prefix=PREFIXES[category]||"[AssetLoader]";
        console.error(`${prefix} ${name} örneği oluşturulamadı; güvenli fallback kullanılacak.`,error);
        return null;
      }
    }
  }

  window.ProjectGunAssetLibrary=ProjectGunAssetLibrary;
})();
