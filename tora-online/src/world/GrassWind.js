/** GPU vertex wind; the same thin-instance buffers remain resident. */
export function attachGrassWind(material){
 if(material._toraWind)return;material._toraWind=true;
 class WindPlugin extends BABYLON.MaterialPluginBase{
  constructor(){super(material,'ToraGrassWind',180);this._enable(true);}
  getClassName(){return 'ToraGrassWind';}
  isCompatible(){return true;}
  getUniforms(){return {externalUniforms:['toraWindTime']};}
  getCustomCode(type,language){if(type!=='vertex')return null;const wgsl=language===BABYLON.ShaderLanguage.WGSL;return {
   CUSTOM_VERTEX_DEFINITIONS:wgsl?'uniform toraWindTime: f32;':'uniform float toraWindTime;',
   CUSTOM_VERTEX_UPDATE_WORLDPOS:'worldPos.x += sin('+(wgsl?'uniforms.':'')+'toraWindTime * 1.8 + worldPos.z * 1.3 + worldPos.x * 0.6) * clamp(positionUpdated.y, 0.0, 1.0) * 0.055;'
  };}
  bindForSubMesh(buffer,scene,engine,subMesh){subMesh.effect?.setFloat('toraWindTime',performance.now()/1000%1000);}
 }
 new WindPlugin();
}
