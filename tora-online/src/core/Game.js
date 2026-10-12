import { GAME_CONFIG } from "./Config.js";
import { AssetManager } from "./AssetManager.js";
import { Navigation } from "../world/Navigation.js";
import { RegionWorld, REGIONS } from "../world/RegionWorld.js";
import { WorldUI } from "../ui/WorldUI.js";
import { InputManager } from "../input/InputManager.js";
import { CursorManager } from "../input/CursorManager.js";
import { IsometricCamera } from "../camera/IsometricCamera.js";
import { PlayerController } from "../player/PlayerController.js";
import { PlayerAnimator } from "../player/PlayerAnimator.js";
import { EntityManager } from "../entities/EntityManager.js";
import { CombatSystem } from "../combat/CombatSystem.js";
import { NetworkAdapter } from "../network/NetworkAdapter.js";
import { HUD } from "../ui/HUD.js";
import { ProgressionSystem } from "../progression/ProgressionSystem.js";
import { StatsSystem } from "../progression/StatsSystem.js";
import { InventorySystem } from "../progression/InventorySystem.js";
import { GlbLoot as LootSystem } from "../progression/GlbLoot.js";
import { AmbientAudio } from "../audio/AmbientAudio.js";
import { BuffVFXManager } from "../combat/BuffVFXManager.js";
import { CHEST } from "../world/ChestState.js";

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
    this.identity = { username: "Ayaz", isAdmin: false };
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
      this.loadStarted=performance.now();
      this.identity = {
        username: identity?.username || "Ayaz",
        isAdmin: false,
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
      this.assets=assets;

      console.info("[Tora Startup] 4/10 Zorunlu harita assetleri ve harita hazırlanıyor.");
      this.map = new RegionWorld(this.scene, this.navigation, this.runtime.profile, this.runtime.quality);
      this.map.onChestOpen = () => this.audio?.play('ui', 'effects', .65);
      let savedWorld=null;try{savedWorld=JSON.parse(localStorage.getItem('tora-world-v1'));}catch{}
      const world = await this.map.build(assets, { id: REGIONS[savedWorld?.region]?savedWorld.region:'village' });
      this.#restoreChests();

      this.onProgress(68, "Savaşçı ve düşmanlar hazırlanıyor…");
      console.info("[Tora Startup] 5/10 Karakter, animasyon kütüphaneleri ve moblar yükleniyor.");
      const visual = await assets.loadPlayerVisual();
      const mobVisuals = await Promise.all(world.spawns.map(spawn => assets.instantiateMob(spawn.type)));

      console.info("[Tora Startup] 6/10 Input ve kamera bağlanıyor.");
      this.input = new InputManager(this.canvas);
      this.player = new PlayerController(visual, this.input, this.navigation, this.identity);
      this.player.position.copyFrom(world.spawn);
      if(savedWorld?.position?.every(Number.isFinite)) {const p=BABYLON.Vector3.FromArray(savedWorld.position);if(this.navigation.canOccupy(p)){p.y=this.navigation.heightAt(p.x,p.z);this.player.position.copyFrom(p);}}
      this.player.respawnPoint=world.spawn.clone();
      this.stats = new StatsSystem(this.player);
      this.inventory = new InventorySystem(this.player, this.stats);
      this.progression = new ProgressionSystem(this.player, this.stats, this.inventory);
      this.camera = new IsometricCamera(this.scene, this.canvas, this.player, GAME_CONFIG.camera);

      console.info("[Tora Startup] 7/10 Animasyon ve combat hazırlanıyor.");
      this.animator = new PlayerAnimator(visual);
      this.entities = new EntityManager(this.scene, this.navigation, world.spawns, (entity, result, attacker) => this.combat?.damagePlayer(result,attacker), mobVisuals);
      this.combat = new CombatSystem(this.scene, this.player, this.animator, this.entities, {
        onDamage: (entity, result) => this.hud?.showDamage(entity, result),
        onKill: (mob) => this.#onMobDefeated(mob),
        onStatus: (message) => this.hud?.setStatus(message),
        onBuff: (type, duration) => this.buffVfx?.applyBuff(type, duration),
        onActionStart: (skill) => {this.player.visual?.weaponSheath?.markCombat(skill?.duration || 1.2);this.audio?.playSwing(skill);},
        onCameraShake: (amp, dur) => {
          this.camera?.shake(amp, dur);
          this.audio?.playHit(amp > 0.07);
        },
      }, this.stats);
      this.loot = new LootSystem(this.scene, this.inventory, (message) => this.hud?.setStatus(message), this.navigation, assets);
      this.audio = new AmbientAudio();
      this.buffVfx = new BuffVFXManager(this.scene, this.player, this.combat.vfx.materials[4].diffuseTexture);

      console.info("[Tora Startup] 8/10 HUD ve cursor bağlanıyor.");
      this.hud = new HUD(this.scene, this.engine, this.player, this.entities, this.combat.skills, this.progression, (slot) => this.#useSkill(slot), this.stats, this.inventory, {
        onDropItem: (itemId) => this.#dropInventoryItem(itemId),
        onPanelChange: () => this.syncInputGate(),
        map: this.map,
        onSettings: () => this.togglePause(),
      });
      this.worldUI = new WorldUI(this);
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
        entities: this.entities,
        inventory: this.inventory,
        progression: this.progression,
        getGrassStats: () => this.map.getGrassStats(),
      };

      this.input.onManualMove=()=>this.combat.playerCombat.cancelApproach();
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
      this.loadSeconds=(performance.now()-this.loadStarted)/1000;
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
      isAdmin: false,
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
    this.audio?.suspend(true);
    this.#saveWorld();
    this.running = false;
    this.paused = false;
    if (this.input) { this.input.enabled = false; this.input.reset(); }
    this.hud?.closePanels();
    this.hud?.show(false);
    document.getElementById("pause-menu").hidden = true;
  }

  syncInputGate() {
    if(!this.input)return;
    const blocked=this.hud?.openPanel || (this.worldUI && !this.worldUI.modal.hidden) || document.activeElement===this.hud?.chatInput;
    this.input.enabled=this.running&&!this.paused&&!this.transitioning&&!blocked;
    if(blocked){this.input.reset();this.combat?.playerCombat.cancelApproach();this.player?.cancelDestination?.();if(this.player?.velocity){this.player.velocity.x=0;this.player.velocity.z=0;}}
  }

  togglePause(force) {
    if (!this.running) return;
    this.paused = typeof force === "boolean" ? force : !this.paused;
    this.syncInputGate();
    this.audio?.suspend(this.paused);
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
    this.#saveWorld();
    this.worldUI?.dispose();
    this.hud?.dispose();
    this.map?.dispose();
    this.loot?.dispose();
    this.audio?.dispose();
    this.player?.visual?.ik?.dispose();
    this.buffVfx?.dispose();
    this.combat?.vfx?.dispose();
    this.scene?.dispose();
    if (window.__TORA_DEBUG__?.map === this.map) delete window.__TORA_DEBUG__;
    console.info("[Tora Startup] Başarısız/sonlandırılmış oyun instance kaynakları temizlendi.");
  }

  #saveWorld() {if(!this.player||!this.map||this.transitioning)return;try{localStorage.setItem('tora-world-v1',JSON.stringify({region:this.map.region,position:this.player.position.asArray()}));}catch{}}

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
      if(!this.worldUI.modal.hidden){this.worldUI.close();return;}
      if (this.hud?.openPanel) {
        this.hud.closePanels();
        return;
      }
      this.togglePause();
    };
    this.input.onTab = () => this.entities.cycle(this.player.position);
    this.input.onSkill = (slot) => this.#useSkill(slot);
    this.input.onInventory = () => {
      if (!this.running || this.paused || !this.worldUI.modal.hidden) return;
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
      if (!this.running || this.paused || this.transitioning || !this.worldUI.modal.hidden || info.event?.target !== this.canvas || info.type !== BABYLON.PointerEventTypes.POINTERDOWN || info.event.button !== 0) return;
      if (this.hud?.openPanel) return;
      const actionPick = this.scene.pick(this.scene.pointerX, this.scene.pointerY, (mesh) => Boolean(mesh.metadata?.portal || mesh.metadata?.mob || mesh.metadata?.npc || mesh.metadata?.loot || mesh.metadata?.interactive || mesh.metadata?.lootPickup));
      if (actionPick?.hit) {
        const data = actionPick.pickedMesh.metadata;
        if(data.portal) {
          if(BABYLON.Vector3.Distance(this.player.position,actionPick.pickedPoint)<5) void this.switchRegion(data.portal);
          else {this.combat.playerCombat.cancelApproach();this.player.setDestination(actionPick.pickedPoint);this.hud.setStatus("Kapıya yaklaş ve yeniden tıkla.");}
          return;
        }
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
          if(mob?.alive) {this.entities.select(mob);this.combat.basicAttack(mob,this.camera.forwardOnGround());}
        } else if (data.npc || data.interactive) {
          if(BABYLON.Vector3.Distance(this.player.position,this.map.npc.position)>4){this.combat.playerCombat.cancelApproach();this.player.setDestination(this.map.npc.position,2.5);this.hud.setStatus('Ayame’ye yaklaş ve yeniden tıkla.');}
          else this.worldUI.openNpc();
        } else if (data.chest) {
          this.interactChest(data.chest);
        } else if (data.loot) {
          this.hud.setStatus("Sandığı açmak için yaklaş.");
        } else this.hud.setStatus("Demirci tezgâhı.");
        return;
      }
      const groundPick = this.scene.pick(this.scene.pointerX, this.scene.pointerY, (mesh) => Boolean(mesh.metadata?.ground));
      if (groundPick?.hit) {
        this.combat.playerCombat.cancel();
        this.entities.clear();
        this.player.setDestination(groundPick.pickedPoint, .18);
      }
    });
  }

  #restoreChests() {
    let looted=[];try{looted=JSON.parse(localStorage.getItem('tora-chests-v1')||'[]');}catch{}
    for(const chest of this.map.chests||[])if(looted.includes(chest.id))chest.restoreLooted();
  }

  interactChest(chest) {
    if (!chest || !this.running || this.paused || this.hud?.openPanel || !this.worldUI.modal.hidden) return;
    const distance = BABYLON.Vector3.Distance(this.player.position, chest.root.position);
    if (distance > 3.5) {
      this.combat.playerCombat.cancelApproach();
      this.player.setDestination(chest.root.position, 2.5);
      this.hud.setStatus('Sandığa yaklaş ve yeniden etkileş.');
      return;
    }
    if (chest.state === CHEST.CLOSED) {
      chest.open();
      this.hud.setStatus('Sandık açılıyor…');
    } else if (chest.state === CHEST.OPEN) {
      const prize = this.map.region === 'ruins' ? 'iron-blade' : 'health-potion';
      if (!this.inventory.add(prize)) { this.hud.setStatus('Çantada yer yok.'); return; }
      chest.loot();
      try {
        const saved = JSON.parse(localStorage.getItem('tora-chests-v1') || '[]');
        localStorage.setItem('tora-chests-v1', JSON.stringify([...new Set([...saved, chest.id])]));
      } catch {}
      this.hud.refreshInventory();
      this.hud.setStatus(`${this.map.region === 'ruins' ? 'Demir Kılıç' : 'Can İksiri'} sandıktan alındı.`);
    } else if (chest.state === CHEST.LOOTED) this.hud.setStatus('Bu sandık boş.');
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

  async switchRegion(id) {
    if(this.transitioning||!REGIONS[id]||id===this.map.region)return;
    this.transitioning=true;this.paused=true;this.input.enabled=false;this.input.reset();this.#clearTarget();this.loot.dispose();this.worldUI.close();this.input.enabled=false;
    this.worldUI.loading(true,REGIONS[id].name+' yükleniyor…');
    try {
      this.entities.reset([],[]);this.hud.syncEntities();
      const world=await this.map.load(id);
      this.#restoreChests();
      const visuals=await Promise.all(world.spawns.map(s=>this.assets.instantiateMob(s.type)));
      this.entities.reset(world.spawns,visuals);this.hud.syncEntities();
      this.player.position.copyFrom(world.spawn);this.player.respawnPoint=world.spawn.clone();this.player.velocity.setAll(0);this.player.grounded=true;this.player.verticalVelocity=0;
      this.map.addShadowCaster(this.player.root);for(const mob of this.entities.mobs)this.map.addShadowCaster(mob.root);
      this.camera.focus.copyFrom(world.spawn);this.camera.update(1);this.worldUI.setRegion();
      this.hud.setStatus(REGIONS[id].name+' · Bölge hazır');
    } catch(error) {console.error('[Tora Region]',error);this.hud.setStatus('Bölge yüklenemedi: '+error.message);}
    finally {this.transitioning=false;this.paused=false;this.input.enabled=true;this.worldUI.loading(false);this.canvas.focus();this.lastTime=performance.now();}
  }

  #useSkill(slot) {
    if (!this.running || this.paused || this.hud?.openPanel || !this.worldUI.modal.hidden || document.activeElement===this.hud?.chatInput) return;
    this.hud?.skillBar?.markPressed?.(slot);
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
    if (result?.questCompleted) this.hud.setStatus("İlk Sınav tamamlandı. Ayame için 3 Kadim Diş topla.");
    else if (result) this.hud.setStatus(`${mob.name} yenildi • +${result.killXp} XP`);
  }

  #frame() {
    if (!this.scene || this.scene.isDisposed) return;
    const now = performance.now();
    // Bound simulation catch-up: a stalled GPU frame must not skip an entire jump or attack.
    const raw = Math.min(0.25, (now - this.lastTime) / 1000 || 0.016);
    this.lastTime = now;
    if (this.running && !this.paused) {
      this.syncInputGate();
      let remaining = raw;
      while (remaining > 1e-4) {
        const dt = Math.min(0.05, remaining);
        remaining -= dt;
        this.combat.update(dt);
        this.player.update(dt, this.camera);
        this.buffVfx?.update(dt);
        this.animator.setState(this.player.state);
        this.animator.update(dt, this.player.speedRatio);
        this.player.visual?.weaponSheath?.update(dt, this.player.state);
        this.entities.update(dt, this.player);
        this.loot?.update?.(dt);
        if (this.player.alive) this.player.mana = Math.min(this.player.maxMana, this.player.mana + 4 * dt);
      }
      const viewDt = Math.min(0.05, raw);
      this.camera.update(viewDt);
      this.map.update(viewDt, this.camera.camera, this.engine.getFps());
      this.audio?.update?.(viewDt, this.player, this.map.region);
      this.snapshotTimer += raw;
      if (this.snapshotTimer > .25) {
        this.network.publishSnapshot([this.player, ...this.entities.mobs]);
        this.snapshotTimer = 0;
      }
      this.hud.update();
      this.worldUI.update();
      this.saveTimer=(this.saveTimer||0)+raw;if(this.saveTimer>5){this.#saveWorld();this.saveTimer=0;}
      this.input.endFrame();
    }
    this.scene.render();
  }
}
