import { GAME_CONFIG, MOB_SPAWNS } from "./Config.js?v=17";
import { AssetManager } from "./AssetManager.js?v=17";
import { Navigation } from "../world/Navigation.js?v=17";
import { TestMap } from "../world/TestMap.js?v=17";
import { InputManager } from "../input/InputManager.js?v=17";
import { CursorManager } from "../input/CursorManager.js?v=17";
import { ThirdPersonCamera } from "../camera/ThirdPersonCamera.js?v=17";
import { PlayerController } from "../player/PlayerController.js?v=17";
import { PlayerAnimator } from "../player/PlayerAnimator.js?v=17";
import { EntityManager } from "../entities/EntityManager.js?v=17";
import { CombatSystem } from "../combat/CombatSystem.js?v=17";
import { NetworkAdapter } from "../network/NetworkAdapter.js?v=17";
import { HUD } from "../ui/HUD.js?v=17";
import { ProgressionSystem } from "../progression/ProgressionSystem.js?v=17";
import { StatsSystem } from "../progression/StatsSystem.js?v=17";
import { InventorySystem } from "../progression/InventorySystem.js?v=17";
import { LootSystem } from "../progression/LootSystem.js?v=17";
import { AmbientAudio } from "../audio/AmbientAudio.js?v=17";

export class Game {
  constructor(runtime, onProgress = () => {}, onFatal = () => {}) {
    this.runtime = runtime;
    this.engine = runtime.engine;
    this.canvas = runtime.canvas;
    this.onProgress = onProgress;
    this.onFatal = onFatal;
    this.scene = null;
    this.running = false;
    this.paused = false;
    this.initialized = false;
    this.disposed = false;
    this.frameFailed = false;
    this.snapshotTimer = 0;
    this.lastTime = performance.now();
    this.pointerObserver = null;
    this.identity = { username: "admin", isAdmin: true };
    this.renderFrame = () => {
      try { this.#frame(); }
      catch (error) {
        if (this.frameFailed) return;
        this.frameFailed = true;
        this.running = false;
        console.error("[Tora Runtime] Render döngüsü durduruldu.", error);
        queueMicrotask(() => this.onFatal(error));
      }
    };
  }

  async initialize(identity = this.identity) {
    try {
      this.identity = {
        username: identity?.username || "admin",
        isAdmin: identity?.isAdmin !== false,
      };
      this.onProgress(28, "Yerel dünya oturumu açılıyor…");
      this.network = new NetworkAdapter();
      await this.network.connect();

      console.info("[Tora Startup] 3/10 Scene oluşturuluyor.");
      this.scene = new BABYLON.Scene(this.engine);
      this.scene.collisionsEnabled = true;
      this.navigation = new Navigation(GAME_CONFIG.mapHalfSize);

      const assets = new AssetManager(this.scene, GAME_CONFIG, this.onProgress);
      await assets.initialize();

      console.info("[Tora Startup] 4/10 Zorunlu harita assetleri ve harita hazırlanıyor.");
      this.map = new TestMap(this.scene, this.navigation, this.runtime.profile, this.runtime.quality);
      const world = await this.map.build(assets, { deferOptional: true });

      this.onProgress(68, "Savaşçı ve düşmanlar hazırlanıyor…");
      console.info("[Tora Startup] 5/10 Karakter, animasyon kütüphaneleri ve moblar yükleniyor.");
      const visual = await assets.loadPlayerVisual();
      const mobVisuals = await Promise.all(MOB_SPAWNS.map((_, index) => assets.instantiateMob(index)));

      console.info("[Tora Startup] 6/10 Input ve kamera bağlanıyor.");
      this.input = new InputManager(this.canvas);
      this.player = new PlayerController(visual, this.input, this.navigation, this.identity);
      this.player.position.copyFrom(world.spawn);
      this.stats = new StatsSystem(this.player);
      this.inventory = new InventorySystem(this.player, this.stats);
      this.progression = new ProgressionSystem(this.player, this.stats, this.inventory);
      this.camera = new ThirdPersonCamera(this.scene, this.canvas, this.player, GAME_CONFIG.camera);

      console.info("[Tora Startup] 7/10 Animasyon ve combat hazırlanıyor.");
      this.animator = new PlayerAnimator(visual);
      this.entities = new EntityManager(this.scene, this.navigation, MOB_SPAWNS, (entity, result) => this.combat?.damagePlayer(result), mobVisuals);
      this.combat = new CombatSystem(this.scene, this.player, this.animator, this.entities, {
        onDamage: (entity, result) => this.hud?.showDamage(entity, result),
        onKill: (mob) => this.#onMobDefeated(mob),
        onStatus: (message) => this.hud?.setStatus(message),
        onActionStart: (skill) => this.player.visual?.weaponSheath?.markCombat(skill?.duration || 1.2),
        onCameraShake: (amp, dur) => {
          this.camera?.shake(amp, dur);
          this.audio?.playHit(amp > 0.07);
        },
      }, this.stats);
      this.loot = new LootSystem(this.scene, this.inventory, (message) => this.hud?.setStatus(message), this.navigation);
      this.audio = new AmbientAudio();

      console.info("[Tora Startup] 8/10 HUD ve cursor bağlanıyor.");
      this.hud = new HUD(this.scene, this.engine, this.player, this.entities, this.combat.skills, this.progression, (slot) => this.#useSkill(slot), this.stats, this.inventory, {
        onDropItem: (itemId) => this.#dropInventoryItem(itemId),
      });
      this.cursor = new CursorManager(this.scene, this.canvas, this.player, this.entities);
      this.hud.setDebug(GAME_CONFIG.debug);
      this.hud.applyIdentity(this.identity);
      this.map.addShadowCaster(this.player.root);
      this.entities.mobs.forEach((mob) => this.map.addShadowCaster(mob.root));
      this.#bindInput();
      this.#bindPauseMenu();

      window.__TORA_DEBUG__ = {
        player: this.player,
        camera: this.camera,
        combat: this.combat,
        animator: this.animator,
        map: this.map,
        getGrassStats: () => this.map.getGrassStats(),
      };

      this.onProgress(92, "Opsiyonel çevre ayrıntıları hazırlanıyor…");
      await this.map.buildOptional();
      try {
        await Promise.race([
          this.scene.whenReadyAsync(),
          new Promise((resolve) => setTimeout(resolve, 8000)),
        ]);
      } catch (error) {
        console.warn("[Tora Startup] Scene whenReady atlandı; oyun devam ediyor.", error);
      }

      console.info("[Tora Startup] 10/10 Render loop başlatılıyor.");
      this.runtime.run(this.renderFrame);
      this.initialized = true;
      this.onProgress(100, "Dünya hazır.");
      return { backend: this.runtime.backend };
    } catch (error) {
      console.error("[Tora Startup] Game.initialize başarısız.", error);
      throw error;
    }
  }

  applyIdentity(identity) {
    this.identity = {
      username: identity?.username || this.identity.username,
      isAdmin: identity?.isAdmin !== false,
    };
    if (this.player) {
      this.player.name = this.identity.username;
      this.player.isAdmin = this.identity.isAdmin;
    }
    this.hud?.applyIdentity(this.identity);
  }

  enter() {
    if (!this.initialized || this.disposed) throw new Error("Oyun tamamlanmadan dünyaya girilemez.");
    this.running = true;
    this.paused = false;
    this.input.reset();
    this.input.enabled = true;
    this.hud.show(true);
    document.getElementById("pause-menu").hidden = true;
    this.canvas.focus();
    this.lastTime = performance.now();
    void this.audio?.ensure();
  }

  leave() {
    this.running = false;
    this.paused = false;
    if (this.input) { this.input.enabled = false; this.input.reset(); }
    this.hud?.closePanels();
    this.hud?.show(false);
    document.getElementById("pause-menu").hidden = true;
  }

  togglePause(force) {
    if (!this.running) return;
    this.paused = typeof force === "boolean" ? force : !this.paused;
    this.input.enabled = !this.paused;
    if (this.paused) this.input.reset();
    document.getElementById("pause-menu").hidden = !this.paused;
  }

  applyQuality(name) {
    this.runtime.applyQuality(name);
    this.map?.applyQuality(this.runtime.profile, name);
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.leave();
    this.runtime.stop();
    this.network?.disconnect();
    if (this.pointerObserver) this.scene?.onPointerObservable.remove(this.pointerObserver);
    this.pointerObserver = null;
    this.#unbindPauseMenu();
    this.cursor?.dispose();
    this.camera?.dispose();
    this.input?.dispose();
    this.hud?.dispose();
    this.map?.dispose();
    this.loot?.dispose();
    this.audio?.dispose();
    this.scene?.dispose();
    if (window.__TORA_DEBUG__?.map === this.map) delete window.__TORA_DEBUG__;
    console.info("[Tora Startup] Başarısız/sonlandırılmış oyun instance kaynakları temizlendi.");
  }

  #clearTarget() {
    this.entities?.clear();
    if (this.player) this.player.targetId = null;
    this.combat?.playerCombat?.cancel?.();
    this.cursor?.reset();
  }

  #dropInventoryItem(itemId) {
    if (!itemId) return false;
    const offset = new BABYLON.Vector3(
      Math.sin(this.player.rotation) * 1.2,
      0,
      Math.cos(this.player.rotation) * 1.2,
    );
    const pos = this.player.position.add(offset);
    return this.loot.spawnDrop(this.player, itemId, pos);
  }

  #bindInput() {
    this.input.onEscape = () => {
      if (this.hud?.openPanel) {
        this.hud.closePanels();
        return;
      }
      this.togglePause();
    };
    this.input.onTab = () => this.entities.cycle(this.player.position);
    this.input.onSkill = (slot) => this.#useSkill(slot);
    this.input.onInventory = () => {
      if (!this.running || this.paused) return;
      this.hud.togglePanel("inventory");
    };
    this.input.onStats = () => {
      if (!this.running || this.paused) return;
      this.hud.togglePanel("stats");
    };
    this.input.onClearTarget = () => {
      if (!this.running || this.paused) return;
      this.#clearTarget();
    };
    this.pointerObserver = this.scene.onPointerObservable.add((info) => {
      if (!this.running || this.paused || info.type !== BABYLON.PointerEventTypes.POINTERDOWN || info.event.button !== 0) return;
      if (this.hud?.openPanel) this.hud.closePanels();
      const actionPick = this.scene.pick(this.scene.pointerX, this.scene.pointerY, (mesh) => Boolean(mesh.metadata?.mob || mesh.metadata?.npc || mesh.metadata?.loot || mesh.metadata?.interactive || mesh.metadata?.lootPickup));
      if (actionPick?.hit) {
        const data = actionPick.pickedMesh.metadata;
        if (data.lootPickup) {
          if (this.loot.tryPickup(actionPick.pickedMesh)) {
            this.hud.refreshInventory();
            const collector = this.progression.syncCollectorQuest();
            if (collector) this.hud.announceProgress({ ...collector, questCompleted: true });
          }
          return;
        }
        if (data.mob) {
          const mob = this.entities.getById(data.entityId);
          // Soft target: first click selects only — attack via skills / second click
          if (this.entities.selected === mob) {
            this.combat.basicAttack(mob, this.camera.forwardOnGround());
          } else {
            this.entities.select(mob);
            this.player.targetId = mob?.id || null;
            this.hud.setStatus(`${mob.name} hedef alındı — tekrar tıkla veya 1–9 ile saldır.`);
          }
        } else if (data.npc) {
          this.hud.addChat("Demirci Ayame", "İksir için örse dokun. 3 Kurt Dişi getirirsen Demir Kılıç veririm.");
          this.hud.setStatus("Demirci: örse tıkla.");
        } else if (data.loot) {
          this.hud.setStatus("Sandık mühürlü. Önce görevleri tamamla.");
        } else if (data.interactive) {
          this.#useBlacksmith();
        } else this.hud.setStatus("Demirci tezgâhı.");
        return;
      }
      const groundPick = this.scene.pick(this.scene.pointerX, this.scene.pointerY, (mesh) => Boolean(mesh.metadata?.ground));
      if (groundPick?.hit) {
        this.#clearTarget();
        this.player.setDestination(groundPick.pickedPoint, .18);
      } else {
        this.#clearTarget();
      }
    });
  }

  #bindPauseMenu() {
    this.resumeButton = document.getElementById("resume-button");
    this.pauseQuality = document.getElementById("pause-quality");
    this.exitButton = document.getElementById("exit-button");
    this.onResume = () => this.togglePause(false);
    this.onPauseQuality = (event) => { window.ToraMenu.applyQuality(event.target.value, true); this.applyQuality(event.target.value); };
    this.onExit = () => { this.leave(); document.getElementById("menu-screen").classList.remove("is-leaving"); window.ToraMenu.unlock(); };
    this.resumeButton.addEventListener("click", this.onResume);
    this.pauseQuality.addEventListener("change", this.onPauseQuality);
    this.exitButton.addEventListener("click", this.onExit);
  }

  #unbindPauseMenu() {
    this.resumeButton?.removeEventListener("click", this.onResume);
    this.pauseQuality?.removeEventListener("change", this.onPauseQuality);
    this.exitButton?.removeEventListener("click", this.onExit);
  }

  #useBlacksmith() {
    let given = [];
    if (this.inventory.buy("health-potion")) given.push("Can İksiri");
    if (this.inventory.buy("mana-potion")) given.push("Mana İksiri");
    if (this.inventory.countItem("wolf-fang") >= 3 && !this.inventory.slots.includes("iron-blade")) {
      if (this.inventory.buy("iron-blade")) given.push("Demir Kılıç");
    }
    this.hud.refreshInventory();
    if (!given.length) {
      this.hud.setStatus("Envanter dolu veya ödül yok.");
      return;
    }
    this.hud.setStatus(`Demirci verdi: ${given.join(", ")}`);
    this.hud.addChat("Demirci Ayame", given.includes("Demir Kılıç")
      ? "Dişlerini aldım. Demir Kılıç senin — I ile kuşanan."
      : "İksirlerin hazır. Diş toplarsan daha iyi silah veririm.");
  }

  #useSkill(slot) {
    if (!this.running || this.paused) return;
    this.combat.useSkill(slot, this.entities.selected, this.camera.forwardOnGround());
  }

  #onMobDefeated(mob) {
    const result = this.progression.recordDefeat(mob);
    const dropId = this.loot.rollFor(mob);
    if (dropId) this.loot.spawnDrop(mob, dropId);
    const collector = this.progression.syncCollectorQuest();
    if (!result && !collector) return;
    if (result) this.hud.announceProgress(result);
    if (collector) this.hud.announceProgress({ ...collector, questCompleted: true });
    if (result?.questCompleted) this.hud.setStatus("İlk Sınav tamamlandı. Yeni görev: 3 Kurt Dişi topla.");
    else if (result) this.hud.setStatus(`${mob.name} yenildi • +${result.killXp} XP`);
  }

  #frame() {
    if (!this.scene || this.scene.isDisposed) return;
    const now = performance.now();
    const dt = Math.min(.05, (now - this.lastTime) / 1000 || .016);
    this.lastTime = now;
    if (this.running && !this.paused) {
      this.combat.update(dt);
      this.player.update(dt, this.camera);
      this.animator.setState(this.player.state);
      this.animator.update(dt, this.player.speedRatio);
      this.player.visual?.weaponSheath?.update(dt, this.player.state);
      this.camera.update(dt);
      this.map.update(dt, this.camera.camera, this.engine.getFps());
      this.entities.update(dt, this.player);
      this.loot?.update(dt);
      this.audio?.update(dt, this.player);
      if (this.player.alive) this.player.mana = Math.min(this.player.maxMana, this.player.mana + 4 * dt);
      this.snapshotTimer += dt;
      if (this.snapshotTimer > .25) {
        this.network.publishSnapshot([this.player, ...this.entities.mobs]);
        this.snapshotTimer = 0;
      }
      this.hud.update();
      this.input.endFrame();
    }
    this.scene.render();
  }
}
