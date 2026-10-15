import { AssetManager } from '../core/AssetManager.js';
import { EngineRuntime } from '../core/Engine.js';
import { GAME_CONFIG } from '../core/Config.js';
import { PlayerAnimator } from '../player/PlayerAnimator.js';

/** Optional preview: world entry performs its own graphics validation. */
export class LobbyPreview {
  constructor(host) {
    this.host = host;
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'lobby-preview';
    this.canvas.width = 420; this.canvas.height = 560;
    this.canvas.setAttribute('aria-label', 'Seçilen sınıfın üç boyutlu görünümü');
    host.append(this.canvas);
    this.retry = document.createElement('button');
    this.retry.type = 'button'; this.retry.className = 'preview-retry secondary';
    this.retry.textContent = 'Önizlemeyi tekrar dene'; this.retry.hidden = true;
    this.retry.addEventListener('click', () => { void this.show(this.requested); });
    host.append(this.retry);
    this.state = 'idle'; this.hidden = this.busy = this.disposed = false;
    this.loaded = this.requested = null; this.lastRender = 0; this.generation=0;
    this.onContextLost = event => {
      event.preventDefault(); this.fail(new Error('Önizlemenin grafik bağlantısı kesildi.'));
    };
    this.canvas.addEventListener('webglcontextlost', this.onContextLost);
  }
  status(state, message) {
    this.state = state; this.host.dataset.previewState = state;
    this.canvas.style.visibility = state === 'ready' ? 'visible' : 'hidden'; this.retry.hidden = state !== 'error';
    const status = this.host.querySelector('.preview-status');
    if (status) status.textContent = message;
  }
  async show(classId) {
    if (this.disposed) return;
    this.hidden = false; this.requested = classId;
    if (this.loaded === classId || this.busy) return;
    const generation=++this.generation;
    this.busy = true; this.status('loading', '3D önizleme yükleniyor… Dünyaya girebilirsin.');
    try {
      if (!this.runtime) {
        const runtime = await EngineRuntime.create(this.canvas, 'medium', () => {}, {
          preferWebGL: true, onDeviceError: () => this.fail(new Error('Önizleme grafik sürücüsü yanıt vermedi.')),
        });
        if (this.disposed || generation!==this.generation) { runtime.dispose(); return; }
        this.runtime = runtime; this.engine = runtime.engine; this.engine.setSize(420, 560);
        runtime.run(() => {
          const now = performance.now();
          if (this.hidden || this.state !== 'ready' || !this.scene || now - this.lastRender < 1000 / 30) return;
          this.animator.update(Math.min(.05, (now - this.lastRender) / 1000 || .033), 0);
          this.lastRender = now; this.scene.render();
        });
      }
      while (!this.disposed && this.requested !== this.loaded) {
        const id = this.requested; this.disposeScene();
        const scene = this.scene = new BABYLON.Scene(this.engine);
        scene.clearColor = new BABYLON.Color4(.035, .045, .045, 0);
        new BABYLON.HemisphericLight('lobby-sky', new BABYLON.Vector3(.4, 1, -.5), scene).intensity = .8;
        new BABYLON.DirectionalLight('lobby-key', new BABYLON.Vector3(-.5, -1, -.5), scene).intensity = 1.4;
        const camera = new BABYLON.ArcRotateCamera('lobby-camera', Math.PI / 2, Math.PI / 2, 4, new BABYLON.Vector3(0, .95, 0), scene);
        camera.fov = .52; camera.inputs.clear();
        const assets = new AssetManager(scene, GAME_CONFIG);
        const visual = await withDeadline((async () => { await assets.initialize(); return assets.loadPlayerVisual(id); })(), 45000);
        if (this.disposed || generation!==this.generation || scene !== this.scene) { visual.ik?.dispose(); scene.dispose(); return; }
        this.visual = visual; visual.weaponSheath?.markCombat(100000); visual.weaponSheath?.draw();
        this.animator = new PlayerAnimator(visual); this.animator.setState('combatIdle', true);
        visual.root.rotation.y = -.22;
        await withDeadline(scene.whenReadyAsync(), 15000);
        if (this.disposed || scene !== this.scene) return;
        // Sample the animation blend before exposing the model instead of showing bind pose.
        for(let frame=0;frame<12;frame++) {
          await new Promise(resolve=>setTimeout(resolve,25));
          if(this.disposed || scene!==this.scene)return;
          this.animator.update(.025,0);scene.render();
        }
        scene.render(); visual.skeleton.prepare(true); visual.root.computeWorldMatrix(true);
        const boxes = visual.previewMeshes.filter(mesh => mesh.getTotalVertices() && mesh.isEnabled()).map(mesh => {
          mesh.computeWorldMatrix(true); mesh.refreshBoundingInfo?.(true, true);
          return mesh.getBoundingInfo().boundingBox;
        });
        let min = new BABYLON.Vector3(0, 0, 0), max = new BABYLON.Vector3(0, 1.9, 0);
        if (boxes.length) {
          min = boxes[0].minimumWorld.clone(); max = boxes[0].maximumWorld.clone();
          for (const box of boxes) { min = BABYLON.Vector3.Minimize(min, box.minimumWorld); max = BABYLON.Vector3.Maximize(max, box.maximumWorld); }
        }
        const height = Math.max(1.8, max.y - min.y), width = Math.max(.7, max.x - min.x);
        camera.setTarget(new BABYLON.Vector3((min.x + max.x) / 2, min.y + height / 2, (min.z + max.z) / 2));
        camera.radius = Math.max(height, width / (420 / 560)) / (2 * Math.tan(camera.fov / 2)) * 1.18;
        this.loaded = id;
      }
      if (!this.disposed) this.status('ready', '');
    } catch (error) { if (!this.disposed && generation===this.generation) this.fail(error); }
    finally { if(generation===this.generation)this.busy = false; }
  }
  fail(error) {
    this.generation++;this.busy=false;
    this.disposeScene(); this.runtime?.dispose(); this.runtime = this.engine = null;
    this.status('error', '3D önizleme açılamadı. ' + error.message + ' Dünya motoru girişte ayrıca kontrol edilir.');
  }
  hide() { this.hidden = true; }
  disposeScene() { this.visual?.ik?.dispose(); this.scene?.dispose(); this.scene = this.visual = this.animator = null; this.loaded = null; }
  dispose() {
    this.disposed = true; this.generation++;this.busy=false;this.disposeScene(); this.runtime?.dispose(); this.runtime = this.engine = null;
    this.canvas.removeEventListener('webglcontextlost', this.onContextLost);
    this.canvas.remove(); this.retry.remove();
  }
}
function withDeadline(promise, ms) {
  let timer;
  return Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Önizleme yükleme süresi aşıldı.')), ms); })]).finally(() => clearTimeout(timer));
}
