import { QUALITY_PROFILES } from "./Config.js";

export class EngineRuntime {
  static async graphicsSupport() {
    let webgl2 = false, webgpu = false;
    const probe = document.createElement('canvas');
    try {
      const gl = probe.getContext('webgl2');
      webgl2 = Boolean(gl);
      gl?.getExtension('WEBGL_lose_context')?.loseContext();
    } catch { /* Context creation can be disabled by the browser. */ }
    try {
      if (navigator.gpu && BABYLON.WebGPUEngine) {
        const support = BABYLON.WebGPUEngine.IsSupportedAsync;
        let timer;
        webgpu = Boolean(await Promise.race([
          Promise.resolve(typeof support === 'function' ? support() : support),
          new Promise(resolve => { timer = setTimeout(() => resolve(false), 5000); }),
        ]).finally(() => clearTimeout(timer)));
      }
    } catch { /* WebGL may still be available. */ }
    return { webgl2, webgpu, supported: webgl2 || webgpu };
  }
  constructor(canvas, engine, backend) {
    this.canvas = canvas;
    this.engine = engine;
    this.backend = backend;
    this.renderCallback = null;
    this.disposed = false;
    this.resize = () => this.engine?.resize();
    addEventListener("resize", this.resize);
  }

  static async create(canvas, quality = "medium", onProgress = () => {}, options = {}) {
    console.info("[Tora Startup] 1/10 Babylon.js ve GLB loader doğrulanıyor.");
    if (!window.BABYLON?.Engine || !window.BABYLON?.Scene) {
      throw new Error("Yerel Babylon.js çalışma zamanı yüklenemedi.");
    }
    if (!BABYLON.SceneLoader?.IsPluginForExtensionAvailable?.(".glb")) {
      throw new Error("Babylon.js GLB loader yüklenemedi.");
    }

    const profile = QUALITY_PROFILES[quality] || QUALITY_PROFILES.medium;
    const graphics = await EngineRuntime.graphicsSupport();
    if (!graphics.supported) throw new Error('Grafik desteği kullanılamıyor. Tora Online için WebGL2 veya WebGPU gerekir. Tarayıcının donanım hızlandırmasını etkinleştirip yeniden deneyin.');
    let engine = null;
    let backend = "WebGL2";
    const forcedWebGL=Boolean(options.preferWebGL && graphics.webgl2) || new URLSearchParams(location.search).get("renderer")==="webgl" || sessionStorage.getItem("tora-webgl-fallback")==="1";
    if (!forcedWebGL && graphics.webgpu && BABYLON.WebGPUEngine) {
      try {
        onProgress(10, "WebGPU desteği deneniyor…");
        let supported = BABYLON.WebGPUEngine.IsSupportedAsync;
        if (typeof supported === "function") supported = supported();
        if (await Promise.resolve(supported)) {
          engine = new BABYLON.WebGPUEngine(canvas, { antialias: profile.antialias, adaptToDeviceRatio: false });
          let timer;
          const candidate=engine,initialization=engine.initAsync();
          let expired=false;
          initialization.then(()=>{if(expired)candidate.dispose();},()=>{});
          await Promise.race([initialization,new Promise((_,reject)=>{timer=setTimeout(()=>{expired=true;reject(new Error('WebGPU başlatma süresi aşıldı.'));},8000);})]).finally(()=>clearTimeout(timer));
          backend = "WebGPU";
        }
      } catch (error) {
        console.warn("[Tora Engine] WebGPU başlatılamadı; WebGL2 fallback kullanılacak.", error);
        engine?.dispose();
        engine = null;
      }
    }
    if (!engine) {
      if (!graphics.webgl2) throw new Error('WebGPU başlatılamadı ve WebGL2 kullanılamıyor. Tarayıcının grafik ayarlarını kontrol edip yeniden deneyin.');
      onProgress(16, "WebGL2 motoru başlatılıyor…");
      engine = new BABYLON.Engine(canvas, profile.antialias, {
        preserveDrawingBuffer: false,
        stencil: true,
        disableWebGL2Support: false,
        powerPreference: "high-performance",
      }, false);
      if (engine.webGLVersion < 2) {
        engine.dispose();
        throw new Error("Tora Online WebGL2 veya WebGPU destekli bir tarayıcı gerektirir.");
      }
    }

    const runtime = new EngineRuntime(canvas, engine, backend);
    if(backend==='WebGPU'&&engine._device){
      runtime.deviceError=()=>{if(runtime.disposed)return;if(options.onDeviceError){options.onDeviceError();return;}sessionStorage.setItem('tora-webgl-fallback','1');window.dispatchEvent(new Event('tora:gpu-fallback'));};
      engine._device.addEventListener('uncapturederror',runtime.deviceError,{once:true});
    }
    runtime.applyQuality(quality);
    onProgress(23, `${backend} hazır.`);
    console.info(`[Tora Startup] 2/10 Engine hazır (${backend}).`);
    return runtime;
  }

  applyQuality(name) {
    const profile = QUALITY_PROFILES[name] || QUALITY_PROFILES.medium;
    const device = Math.max(1, window.devicePixelRatio || 1);
    const target = Math.min(device, profile.dpr);
    this.engine.setHardwareScalingLevel(1 / target);
    this.quality = name;
    this.profile = profile;
  }

  run(render) {
    this.stop();
    this.renderCallback = render;
    this.engine.runRenderLoop(render);
  }

  stop() {
    if (this.renderCallback && this.engine && !this.engine.isDisposed) this.engine.stopRenderLoop(this.renderCallback);
    this.renderCallback = null;
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.stop();
    if(this.deviceError)this.engine._device?.removeEventListener('uncapturederror',this.deviceError);
    removeEventListener("resize", this.resize);
    if (this.engine && !this.engine.isDisposed) this.engine.dispose();
  }
}
