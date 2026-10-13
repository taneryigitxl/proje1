import { classDef } from '../characters/ClassDefs.js';
import { SaveService } from '../characters/SaveService.js';
import { CharacterStore } from '../characters/CharacterStore.js';
import { QuickItems } from '../progression/QuickItems.js';
import { DeathScreen } from '../ui/DeathScreen.js';
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
import { SkillMarker } from "../combat/SkillMarker.js";
import { MoveMarker } from "../world/MoveMarker.js";

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
        classId: identity?.classId || "warrior", characterId: identity?.characterId || "legacy-warrior", profile: identity?.profile || identity?.username || "Ayaz",
        isAdmin: false,
      };
      this.classDef=classDef(this.identity.classId);this.save=new SaveService(this.identity.characterId);this.characterStore=new CharacterStore(this.identity.profile);
      document.body.dataset.class=this.classDef.id;document.body.style.setProperty('--class-accent',this.classDef.accent);
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
      const savedWorld=this.save.read('world');
      const world = await this.map.build(assets, { id: Object.hasOwn(REGIONS,savedWorld?.region)?savedWorld.region:'village' });
      this.#restoreChests();

      this.onProgress(68, `${this.classDef.label} ve düşmanlar hazırlanıyor…`);
      console.info("[Tora Startup] 5/10 Karakter, animasyon kütüphaneleri ve moblar yükleniyor.");
      const visual = await assets.loadPlayerVisual(this.classDef.id);
      const mobVisuals = await Promise.all(world.spawns.map(spawn => assets.instantiateMob(spawn.type)));

      console.info("[Tora Startup] 6/10 Input ve kamera bağlanıyor.");
      this.input = new InputManager(this.canvas);
      this.player = new PlayerController(visual, this.input, this.navigation, this.identity);
      this.player.position.copyFrom(world.spawn);
      if(Array.isArray(savedWorld?.position)&&savedWorld.position.length===3&&savedWorld.position.every(Number.isFinite)) {const p=BABYLON.Vector3.FromArray(savedWorld.position);if(this.navigation.canOccupy(p)){p.y=this.navigation.heightAt(p.x,p.z);this.player.position.copyFrom(p);}}
      this.player.respawnPoint=world.spawn.clone();
      this.stats = new StatsSystem(this.player,this.save);
      this.inventory = new InventorySystem(this.player, this.stats,24,this.save);
      this.progression = new ProgressionSystem(this.player, this.stats, this.inventory,this.save);
      this.quickItems=new QuickItems(this.inventory,this.save);
      this.camera = new IsometricCamera(this.scene, this.canvas, this.player, GAME_CONFIG.camera);
      this.#faceView();

      console.info("[Tora Startup] 7/10 Animasyon ve combat hazırlanıyor.");
      this.animator = new PlayerAnimator(visual);
      this.entities = new EntityManager(this.scene, this.navigation, world.spawns, (entity, result, attacker) => this.combat?.damagePlayer(result,attacker), mobVisuals);
      this.combat = new CombatSystem(this.scene, this.player, this.animator, this.entities, {
        onDamage: (entity, result) => {if(entity===this.player)this.buffVfx?.impact();this.hud?.showDamage(entity, result);},
        onKill: (mob) => this.#onMobDefeated(mob),
        onStatus: (message) => this.hud?.setStatus(message),
        onBuff: (type, duration) => this.buffVfx?.applyBuff(type, duration),
        onActionStart: (skill) => {this.player.visual?.weaponSheath?.markCombat(skill?.duration || 1.2);this.audio?.playSwing(skill);},
        onCameraShake: (amp, dur) => {
          this.camera?.shake(amp, dur);
          this.audio?.playHit(amp > 0.02);
        },
        onDeath:()=>this.handleDeath(),onDeathChoice:()=>this.deathScreen.show(),onRespawnComplete:()=>{this.deathScreen.hide();this.syncInputGate();this.canvas.focus();this.#saveWorld();},
        onRespawn: () => { this.camera?.snap(this.player.position); this.#faceView(); this.loot?.close?.(); },
        onTargetLost: () => { if (this.entities.selected && !this.entities.selected.alive) this.entities.clear(); },
      }, this.stats);
      this.deathScreen=new DeathScreen(mode=>this.combat.death.choose(mode));
      this.skillMarker = new SkillMarker(this.scene);
      this.loot = new LootSystem(this.scene, this.inventory, (message) => this.hud?.setStatus(message), this.navigation);
      await this.loot.initialize(assets);
      this.moveMarker = new MoveMarker(this.scene, this.navigation);
      this.loot.onApproach = (point) => { this.combat.playerCombat.cancelApproach(); this.player.setDestination(point, 2.2); };
      this.loot.onOpen = () => { this.player.cancelDestination(); this.syncInputGate(); };
      this.loot.onClose = () => this.syncInputGate();
      this.loot.onPickup = () => {
        this.hud?.refreshInventory();
        const collector = this.progression.syncCollectorQuest();
        if (collector) this.hud?.announceProgress({ ...collector, questCompleted: true });
      };
      this.audio = new AmbientAudio(this.classDef);
      this.buffVfx = new BuffVFXManager(this.scene, this.player, this.combat.vfx.materials[4].diffuseTexture);

      console.info("[Tora Startup] 8/10 HUD ve cursor bağlanıyor.");
      this.hud = new HUD(this.scene, this.engine, this.player, this.entities, this.combat.skills, this.progression, (slot) => this.#useSkill(slot), this.stats, this.inventory, {
        onDropItem: (itemId) => this.#dropInventoryItem(itemId),
        onPanelChange: () => this.syncInputGate(),
        map: this.map,
        onSettings: () => this.togglePause(),
        onQuality: (name) => { window.ToraMenu?.applyQuality(name, true); this.applyQuality(name); const pause = document.getElementById("pause-quality"); if (pause) pause.value = name; },
        onVolume: (bus, value) => { this.audio?.setVolume(bus, value); const input = document.getElementById("volume-" + bus); if (input) input.value = String(value); },
        isBlocked:()=>this.combat.death.blocked,loot: this.loot, quickItems:this.quickItems, onQuickItem:index=>this.useQuickItem(index),
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
    const blocked=this.combat?.death.blocked || this.hud?.openPanel || this.loot?.isOpen() || (this.worldUI && !this.worldUI.modal.hidden) || document.activeElement===this.hud?.chatInput;
    this.input.enabled=this.running&&!this.paused&&!this.transitioning&&!blocked;
    if(blocked){this.moveMarker?.hide();this.pendingInteraction=null;this.input.reset();this.combat?.playerCombat.cancelApproach();this.#endSteer();if(this.armedSkill)this.#disarm();this.player?.cancelDestination?.();if(this.player?.velocity){this.player.velocity.x=0;this.player.velocity.z=0;}}
  }

  togglePause(force) {
    if (!this.running || this.combat?.death.blocked) return;
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

  #faceView() {
    const ahead = this.camera?.forwardOnGround();
    if (!ahead || !this.player) return;
    this.player.face(this.player.position.add(ahead));
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.leave();
    this.runtime.stop();
    this.network?.disconnect();
    if (this.pointerObserver) this.scene?.onPointerObservable.remove(this.pointerObserver);
    this.pointerObserver = null;
    if (this.onSteerRelease) {
      window.removeEventListener('pointerup', this.onSteerRelease);
      window.removeEventListener('pointercancel', this.onSteerRelease);
    }
    this.deathScreen?.dispose();this.combat?.projectiles.dispose();
    this.skillMarker?.dispose();
    this.moveMarker?.dispose();
    this.#unbindPauseMenu();
    this.cursor?.dispose();
    this.camera?.dispose();
    this.input?.dispose();
    this.#saveWorld();
    this.worldUI?.dispose();
    this.hud?.dispose();
    this.map?.dispose();
    this.loot?.dispose(true);
    this.audio?.dispose();
    this.player?.visual?.ik?.dispose();
    this.buffVfx?.dispose();
    this.combat?.vfx?.dispose();
    this.scene?.dispose();
    if (window.__TORA_DEBUG__?.map === this.map) delete window.__TORA_DEBUG__;
    console.info("[Tora Startup] Başarısız/sonlandırılmış oyun instance kaynakları temizlendi.");
  }

  #saveWorld() {if(!this.player||!this.map||this.transitioning)return;const position=this.combat?.death.blocked?this.player.respawnPoint:this.player.position;this.save.write('world',{region:this.map.region,position:position.asArray()});this.characterStore.update(this.identity.characterId,{level:this.player.level,region:this.map.region,lastPlayed:Date.now()});}

  handleDeath() {this.#disarm();this.#endSteer();this.pendingInteraction=null;this.#clearTarget();this.moveMarker.hide();this.loot.close();this.hud.closePanels();this.worldUI.close();this.combat.clearEffects();this.buffVfx.clear();this.player.actionLocked=true;this.player.state='dead';this.syncInputGate();this.#saveWorld();}
  useQuickItem(index){if(!this.running||this.paused||this.combat.death.blocked||this.loot.isOpen()||!this.worldUI.modal.hidden||this.hud.openPanel||document.activeElement===this.hud.chatInput)return;const result=this.quickItems.use(index);this.hud.setStatus(result.message);this.hud.refreshInventory();}
  approachNpc(){if(!this.player.alive||this.combat.death.blocked)return;this.combat.playerCombat.cancel();this.moveMarker.hide();this.loot.cancelApproach();if(BABYLON.Vector3.Distance(this.player.position,this.map.npc.position)<=4)this.worldUI.openNpc();else {this.player.setDestination(this.map.npc.position,2.5);this.pendingInteraction={type:'npc'};this.hud.setStatus('Ayame’ye yaklaşıyorsun.');}}

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
      if(this.combat.death.blocked)return;
      if(document.activeElement===this.hud.chatInput){this.hud.chatInput.blur();this.syncInputGate();return;}
      if (this.loot?.isOpen?.()) { this.loot.close(); return; }
      if(!this.worldUI.modal.hidden){this.worldUI.close();return;}
      if (this.hud?.openPanel) {
        this.hud.closePanels();
        return;
      }
      if (this.armedSkill) { this.#disarm('Yetenek iptal edildi.'); return; }
      this.togglePause();
    };
    this.input.onQuickItem=index=>this.useQuickItem(index);
    this.input.onLootAll=()=>{if(this.running&&!this.paused&&!this.combat.death.blocked&&this.loot.isOpen())this.loot.takeAll();};
    this.input.onSkill = (slot) => this.#useSkill(slot);
    this.input.onInventory = () => {
      if (!this.running || this.paused || this.combat.death.blocked || !this.worldUI.modal.hidden) return;
      this.hud.togglePanel("inventory");
    };
    this.input.onStats = () => {
      if (!this.running || this.paused || this.combat.death.blocked) return;
      this.hud.togglePanel("stats");
    };
    this.input.onPanel = (name) => {
      if (!this.running || this.paused || this.combat.death.blocked || !this.worldUI.modal.hidden) return;
      this.hud.togglePanel(name);
    };
    this.input.onClearTarget = () => {
      if (!this.running || this.paused || this.combat.death.blocked) return;
      this.#clearTarget();
    };
    this.steer = null;this.input.onReset=()=>this.#endSteer();
    this.armedSkill = null;
    this.onSecondaryInteract = null;
    this.onSteerRelease = (event) => { if (this.steer && event.pointerId === this.steer.id) this.#endSteer(); };
    window.addEventListener('pointerup', this.onSteerRelease);
    window.addEventListener('pointercancel', this.onSteerRelease);
    this.pointerObserver = this.scene.onPointerObservable.add((info) => {
      const event = info.event;
      if (event?.toraLootDismissed) return;
      if (this.loot?.isOpen?.() && info.type === BABYLON.PointerEventTypes.POINTERDOWN && event?.button === 0 && event.target === this.canvas) {
        this.loot.close();
        return;
      }
      if (!this.#pointerLive(info)) return;
      if (info.type === BABYLON.PointerEventTypes.POINTERDOWN && event.button === 2) {
        this.onSecondaryInteract?.(info);
        return;
      }
      if (info.type === BABYLON.PointerEventTypes.POINTERUP) {
        if (this.steer && event.pointerId === this.steer.id) this.#endSteer();
        return;
      }
      if (info.type === BABYLON.PointerEventTypes.POINTERMOVE) { this.#steerMove(event); return; }
      if (info.type !== BABYLON.PointerEventTypes.POINTERDOWN || event.button !== 0) return;
      if (this.armedSkill) { this.#confirmArmed(); return; }
      const actionPick = this.#pickAction();
      if (actionPick?.hit) { this.#useWorldPick(actionPick); return; }
      const groundPick = this.#pickGround();
      if (groundPick?.hit) this.#beginGroundMove(event, groundPick.pickedPoint);
    });
  }

  #pointerLive(info) {
    return Boolean(this.running && !this.paused && !this.transitioning && this.worldUI?.modal.hidden && !this.hud?.openPanel && !this.loot?.isOpen?.() && this.input?.enabled && info.event?.target === this.canvas);
  }

  #pickAction() {
    return this.scene.pick(this.scene.pointerX, this.scene.pointerY, (mesh) => Boolean(mesh.metadata?.portal || mesh.metadata?.mob || mesh.metadata?.npc || mesh.metadata?.loot || mesh.metadata?.interactive || mesh.metadata?.lootPickup || mesh.metadata?.chest));
  }

  #pickGround() {
    return this.scene.pick(this.scene.pointerX, this.scene.pointerY, (mesh) => Boolean(mesh.metadata?.ground));
  }

  #beginGroundMove(event, point) {
    this.pendingInteraction=null;this.loot.cancelApproach();
    this.combat.playerCombat.cancel();
    this.entities.clear();
    this.steer = { id: event.pointerId, x: event.clientX, y: event.clientY, hold: false, next: 0 };
    {
      const ok = this.player.setDestination(point, 0.2);
      this.moveMarker?.show(this.player.resolvedDestination||point,ok&&this.navigation.canOccupy(point));
      this._markerAt = performance.now();
    }
  }

  #steerMove(event) {
    if (!this.steer || event.pointerId !== this.steer.id) return;
    if (Math.hypot(event.clientX - this.steer.x, event.clientY - this.steer.y) > 12) this.steer.hold = true;
    if (!this.steer.hold || performance.now() < this.steer.next) return;
    this.steer.next = performance.now() + 180;
    const ground = this.#pickGround();
    if (ground?.hit) {
      const ok = this.player.setDestination(ground.pickedPoint, 0.45);
      const now = performance.now();
      if (now - (this._markerAt || 0) > 450) {
        this._markerAt = now;
        this.moveMarker?.show(this.player.resolvedDestination||ground.pickedPoint,ok&&this.navigation.canOccupy(ground.pickedPoint));
      }
    }
  }

  #endSteer() {
    if (!this.steer) return;
    const hold = this.steer.hold;
    this.steer = null;
    if (hold) this.player?.cancelDestination();
  }

  #useWorldPick(actionPick) {
    this.moveMarker?.hide();
    this.loot.cancelApproach();
    const data = actionPick.pickedMesh.metadata;
    if (data.portal) {
      if (BABYLON.Vector3.Distance(this.player.position, actionPick.pickedPoint) < 5) void this.switchRegion(data.portal);
      else { this.combat.playerCombat.cancelApproach(); this.player.setDestination(actionPick.pickedPoint); this.hud.setStatus('Kapıya yaklaş ve yeniden tıkla.'); }
      return;
    }
    if (data.lootPickup) {
      this.loot.activate(actionPick.pickedMesh);
      return;
    }
    if (data.mob) {
      const mob = this.entities.getById(data.entityId);
      if (mob?.alive) { this.entities.select(mob); this.combat.basicAttack(mob, this.camera.forwardOnGround()); }
      return;
    }
    if (data.npc || data.interactive) { this.approachNpc(); return; }
    if (data.chest) { this.interactChest(data.chest); return; }
    if (data.loot) { this.hud.setStatus('Sandığı açmak için yaklaş.'); return; }
    this.hud.setStatus('Demirci tezgâhı.');
  }

  #disarm(message) {
    this.armedSkill = null;
    this.skillMarker?.hide();
    this.hud?.skillBar?.setArmed(null);
    if (message) this.hud?.setStatus(message);
  }

  #isSelfCast(skill) { return skill.action === 'guard' || skill.action === 'rage'; }

  #confirmArmed() {
    const skill = this.armedSkill;
    if (!skill) return;
    const check = this.combat.skills.canUse(skill, this.player);
    if (!check.ok) { this.hud.setStatus(check.reason); return; }
    const ground = this.#pickGround();
    if(skill.target==='ground'){
      if(!ground?.hit){this.hud.setStatus('Geçerli bir zemin seç.');return;}
      const point=ground.pickedPoint;
      if(BABYLON.Vector3.Distance(this.player.position,point)>skill.range+.2||!this.navigation.canOccupy(point)){this.hud.setStatus('Bu noktaya yetenek kullanılamaz.');return;}
      if(skill.action==='blink'&&BABYLON.Vector3.Distance(this.navigation.findReachable(this.player.position,point),point)>.3){this.hud.setStatus('Işınlanma engel veya suyu aşamaz.');return;}
      this._groundTarget=point.clone();this.#castArmed(skill,null,point.subtract(this.player.position));return;
    }

    if (skill.aoe) {
      const point = ground?.pickedPoint || this.player.position;
      if (BABYLON.Vector3.Distance(this.player.position, point) > skill.range + 0.45) { this.hud.setStatus('Menzil dışı.'); return; }
      this.#castArmed(skill, null);
      return;
    }
    if (skill.action === 'dash') {
      if (!ground?.hit) { this.hud.setStatus('Zemin seç.'); return; }
      const dir = ground.pickedPoint.subtract(this.player.position);
      dir.y = 0;
      if (dir.lengthSquared() < 0.05) { this.hud.setStatus('Daha uzağı seç.'); return; }
      if (dir.length() > skill.range + 0.45) { this.hud.setStatus('Menzil dışı.'); return; }
      this.#castArmed(skill, null, dir);
      return;
    }
    if (skill.target === 'enemy') {
      const action = this.#pickAction();
      let mob = action?.hit && action.pickedMesh.metadata?.mob ? this.entities.getById(action.pickedMesh.metadata.entityId) : null;
      if (!mob?.alive && ground?.hit) {
        const near = this.entities.aliveMobs()
          .map((entry) => ({ entry, d: Math.hypot(entry.position.x - ground.pickedPoint.x, entry.position.z - ground.pickedPoint.z) }))
          .filter((item) => item.d < 1.8)
          .sort((a, b) => a.d - b.d)[0];
        mob = near?.entry || null;
      }
      if (!mob?.alive) { this.hud.setStatus('Geçersiz hedef.'); return; }
      this.entities.select(mob);
      if (BABYLON.Vector3.Distance(this.player.position, mob.position) > skill.range) this.hud.setStatus('Menzil dışı · yaklaşıyor.');
      this.#castArmed(skill, mob);
      return;
    }
    this.hud.setStatus('Geçersiz hedef.');
  }

  #castArmed(skill, target, forward) {
    this.armedSkill = null;
    this.skillMarker?.hide();
    this.hud?.skillBar?.setArmed(null);
    this.combat.useSkill(skill.slot, target, forward || this.camera.forwardOnGround(), this._groundTarget);this._groundTarget=null;
  }

  #restoreChests() {
    const value=this.save.read('chests',[]);const looted=Array.isArray(value)?value:[];
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
      const prize = this.map.region === 'ruins' ? this.classDef.rewardWeapon : 'health-potion';
      if (!this.inventory.add(prize)) { this.hud.setStatus('Çantada yer yok.'); return; }
      chest.loot();
      try {
        const saved=this.save.read('chests',[]);
        this.save.write('chests',[...new Set([...(Array.isArray(saved)?saved:[]),chest.id])]);
      } catch {}
      this.hud.refreshInventory();
      this.hud.setStatus(`${this.inventory.snapshot().slots.find(item=>item?.id===prize)?.name||'Eşya'} sandıktan alındı.`);
    } else if (chest.state === CHEST.LOOTED) this.hud.setStatus('Bu sandık boş.');
  }

  #bindPauseMenu() {
    this.resumeButton = document.getElementById("resume-button");
    this.pauseQuality = document.getElementById("pause-quality");
    this.exitButton = document.getElementById("exit-button");
    this.onResume = () => this.togglePause(false);
    this.onPauseQuality = (event) => { window.ToraMenu.applyQuality(event.target.value, true); this.applyQuality(event.target.value); };
    this.onExit = () => { this.leave(); document.dispatchEvent(new CustomEvent("tora:characters")); };
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
    this.combat.clearEffects();this.buffVfx.clear();this.player.buffs.guard=this.player.buffs.rage=0;this.pendingInteraction=null;this.moveMarker.hide();this.hud.closePanels();
    this.transitioning=true;this.paused=true;this.input.enabled=false;this.input.reset();this.#clearTarget();this.loot.dispose();this.worldUI.close();this.input.enabled=false;
    this.worldUI.loading(true,REGIONS[id].name+' yükleniyor…');
    try {
      this.entities.reset([],[]);this.hud.syncEntities();
      const world=await this.map.load(id);
      this.#restoreChests();
      const visuals=await Promise.all(world.spawns.map(s=>this.assets.instantiateMob(s.type)));
      this.entities.reset(world.spawns,visuals);this.hud.syncEntities();
      this.player.position.copyFrom(world.spawn);this.player.respawnPoint=world.spawn.clone();this.player.velocity.setAll(0);this.player.cancelDestination();
      this.map.addShadowCaster(this.player.root);for(const mob of this.entities.mobs)this.map.addShadowCaster(mob.root);
      this.#disarm();this.camera.snap(world.spawn);this.#faceView();this.worldUI.setRegion();
      this.hud.setStatus(REGIONS[id].name+' · Bölge hazır');
    } catch(error) {console.error('[Tora Region]',error);this.hud.setStatus('Bölge yüklenemedi: '+error.message);}
    finally {this.transitioning=false;this.paused=false;this.input.enabled=true;this.worldUI.loading(false);this.canvas.focus();this.lastTime=performance.now();}
  }

  #useSkill(slot) {
    if (!this.running || this.paused || this.combat.death.blocked || this.hud?.openPanel || this.loot?.isOpen?.() || !this.worldUI.modal.hidden || document.activeElement===this.hud?.chatInput) return;
    const skill = this.combat.skills.get(slot);
    if (!skill) return;
    this.hud?.skillBar?.markPressed?.(slot);
    const check = this.combat.skills.canUse(skill, this.player);
    if (!check.ok) { this.hud.setStatus(check.reason); return; }
    if (this.#isSelfCast(skill)) {
      this.#disarm();
      this.combat.useSkill(slot, null, this.camera.forwardOnGround());
      return;
    }
    if (this.armedSkill?.slot === slot) { this.#disarm('Yetenek iptal edildi.'); return; }
    this.armedSkill = skill;
    this.hud.skillBar.setArmed(slot);
    this.skillMarker?.update(skill, this.player);
    const hint = skill.aoe ? 'Etki alanını onaylamak için zemine tıkla.' : skill.target==='ground' ? 'Geçerli bir zemine tıkla.' : !this.entities.selected?.alive ? 'Önce bir hedef seç; düşmana tıkla.' : 'Hedefe tıkla.';
    this.hud.setStatus(`${skill.name}: ${hint} Esc iptal.`);
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
    // Bound simulation catch-up so stalled rendering does not skip an entire combat action.
    const raw = Math.min(0.25, (now - this.lastTime) / 1000 || 0.016);
    this.lastTime = now;
    if (this.running && !this.paused) {
      this.syncInputGate();
      let remaining = raw;
      while (remaining > 1e-4) {
        const dt = Math.min(0.05, remaining);
        remaining -= dt;
        this.combat.update(dt);
        this.player.update(dt);this.quickItems.update(dt);
        this.buffVfx?.update(dt);
        this.animator.setState(this.player.state);
        this.animator.update(dt, this.player.speedRatio);
        this.player.visual?.weaponSheath?.update(dt, this.player.state);
        this.entities.update(dt, this.player);
        this.loot?.update?.(dt);
        if (this.player.alive) this.player.mana = Math.min(this.player.maxMana, this.player.mana + this.classDef.manaRegen * dt);
      }
      const viewDt = Math.min(0.05, raw);
      this.skillMarker?.update(this.armedSkill, this.player);
      this.moveMarker?.update(viewDt);
      if(this.pendingInteraction?.type==='npc'&&this.map.npc&&BABYLON.Vector3.Distance(this.player.position,this.map.npc.position)<=4){this.pendingInteraction=null;this.worldUI.openNpc();}
      this.camera.update(viewDt);
      this.map.update(viewDt, this.camera.camera, this.engine.getFps());
      this.audio?.update?.(viewDt, this.player, this.map.region);
      this.snapshotTimer += raw;
      if (this.snapshotTimer > .25) {
        this.network.publishSnapshot([this.player, ...this.entities.mobs]);
        this.snapshotTimer = 0;
      }
      this.saveTimer=(this.saveTimer||0)+raw;if(this.saveTimer>5){this.#saveWorld();this.saveTimer=0;}
      this.input.endFrame();
    }
    this.scene.render();
    // Project labels with this frame's view matrix, after Babylon updates the camera.
    if (this.running && !this.paused) { this.hud.update(); this.worldUI.update(); }
  }
}
