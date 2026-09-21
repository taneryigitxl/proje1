import { QUALITY_PROFILES } from "./Config.js";

export class EngineRuntime {
  constructor(canvas,engine,backend){this.canvas=canvas;this.engine=engine;this.backend=backend;this.resize=()=>this.engine.resize();addEventListener("resize",this.resize);}
  static async create(canvas,quality="medium",onProgress=()=>{}){
    if(!window.BABYLON)throw new Error("Yerel Babylon.js çalışma zamanı yüklenemedi.");
    const profile=QUALITY_PROFILES[quality]||QUALITY_PROFILES.medium;let engine=null,backend="WebGL2";
    if(navigator.gpu&&BABYLON.WebGPUEngine){try{onProgress(10,"WebGPU desteği deneniyor…");let supported=BABYLON.WebGPUEngine.IsSupportedAsync;if(typeof supported==="function")supported=supported();if(await Promise.resolve(supported)){engine=new BABYLON.WebGPUEngine(canvas,{antialias:profile.antialias,adaptToDeviceRatio:false});await engine.initAsync();backend="WebGPU";}}catch(error){console.warn("[Tora Engine] WebGPU başlatılamadı; WebGL2 fallback kullanılacak.",error);engine?.dispose();engine=null;}}
    if(!engine){onProgress(16,"WebGL2 motoru başlatılıyor…");engine=new BABYLON.Engine(canvas,profile.antialias,{preserveDrawingBuffer:false,stencil:true,disableWebGL2Support:false,powerPreference:"high-performance"},false);if(engine.webGLVersion<2){engine.dispose();throw new Error("Tora Online WebGL2 veya WebGPU destekli bir tarayıcı gerektirir.");}}
    const runtime=new EngineRuntime(canvas,engine,backend);runtime.applyQuality(quality);onProgress(23,`${backend} hazır.`);return runtime;
  }
  applyQuality(name){const profile=QUALITY_PROFILES[name]||QUALITY_PROFILES.medium;const device=Math.max(1,window.devicePixelRatio||1),target=Math.min(device,profile.dpr);this.engine.setHardwareScalingLevel(device/target);this.quality=name;this.profile=profile;}
  run(render){this.engine.runRenderLoop(render);}
  dispose(){removeEventListener("resize",this.resize);this.engine.dispose();}
}
