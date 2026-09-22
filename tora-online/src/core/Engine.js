import { QUALITY_PROFILES } from "./Config.js?v=9";

export class EngineRuntime {
  constructor(canvas, engine, backend) {
    this.canvas = canvas;
    this.engine = engine;
    this.backend = backend;
    this.renderCallback = null;
    this.disposed = false;
    this.resize = () => this.engine?.resize();
    addEventListener("resize", this.resize);
  }

  static async create(canvas, quality = "medium", onProgress = () => {}) {
    console.info("[Tora Startup] 1/10 Babylon.js ve GLB loader doğrulanıyor.");
    if (!window.BABYLON?.Engine || !window.BABYLON?.Scene) {
      throw new Error("Yerel Babylon.js çalışma zamanı yüklenemedi.");
    }
    if (!BABYLON.SceneLoader?.IsPluginForExtensionAvailable?.(".glb")) {
      throw new Error("Babylon.js GLB loader yüklenemedi.");
    }

    const profile = QUALITY_PROFILES[quality] || QUALITY_PROFILES.medium;
    let engine = null;
    let backend = "WebGL2";
    if (navigator.gpu && BABYLON.WebGPUEngine) {
      try {
        onProgress(10, "WebGPU desteği deneniyor…");
        let supported = BABYLON.WebGPUEngine.IsSupportedAsync;
        if (typeof supported === "function") supported = supported();
        if (await Promise.resolve(supported)) {
          engine = new BABYLON.WebGPUEngine(canvas, { antialias: profile.antialias, adaptToDeviceRatio: false });
          await engine.initAsync();
          backend = "WebGPU";
        }
      } catch (error) {
        console.warn("[Tora Engine] WebGPU başlatılamadı; WebGL2 fallback kullanılacak.", error);
        engine?.dispose();
        engine = null;
      }
    }
    if (!engine) {
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
    runtime.applyQuality(quality);
    onProgress(23, `${backend} hazır.`);
    console.info(`[Tora Startup] 2/10 Engine hazır (${backend}).`);
    return runtime;
  }

  applyQuality(name) {
    const profile = QUALITY_PROFILES[name] || QUALITY_PROFILES.medium;
    const device = Math.max(1, window.devicePixelRatio || 1);
    const target = Math.min(device, profile.dpr);
    this.engine.setHardwareScalingLevel(device / target);
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
    removeEventListener("resize", this.resize);
    if (this.engine && !this.engine.isDisposed) this.engine.dispose();
  }
}
