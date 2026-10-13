import { GAME_CONFIG } from './Config.js';
import { AssetManager } from './AssetManager.js';
import { Navigation } from '../world/Navigation.js';
import { RegionWorld, REGIONS } from '../world/RegionWorld.js';
import { PlayerController } from '../player/PlayerController.js';
import { PlayerAnimator } from '../player/PlayerAnimator.js';
import { IsometricCamera } from '../camera/IsometricCamera.js';
import { Mob } from '../entities/Mob.js';
import { CombatVFX } from '../combat/CombatVFX.js';
import { BuffVFXManager } from '../combat/BuffVFXManager.js';
import { DeathScreen } from '../ui/DeathScreen.js';
import { CLASS_DEFS } from '../../shared/ClassDefs.js';
import { ITEM_DEFS } from '../../shared/ItemDefs.js';
import { CLIENT, SERVER } from '../../shared/Protocol.js';
import { safeStep } from '../../shared/Walkability.js';
import { connectGame } from '../network/OnlineApi.js';
import './online.css';

const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

export class OnlineGame {
  constructor(runtime, progress = () => {}, fatal = () => {}) {
    this.runtime = runtime; this.engine = runtime.engine; this.canvas = runtime.canvas;
    this.progress = progress; this.fatal = fatal; this.running = false; this.disposed = false;
    this.remotes = new Map(); this.mobs = new Map(); this.loot = new Map(); this.keys = new Set();
    this.lastFrame = performance.now(); this.sendElapsed = 0; this.lastInput = { dx: 0, dz: 0 };
  }

  async initialize(identity) {
    this.identity = identity;
    this.progress(25, 'Oyun sunucusuna bağlanılıyor…');
    const first = new Promise((resolve, reject) => {
      this.firstResolve = resolve;
      this.firstReject = reject;
      this.firstTimer = setTimeout(() => reject(Error('Sunucuya ulaşılamıyor.')), 15_000);
    });
    this.connection = connectGame(identity.characterId, packet => this.onPacket(packet), state => this.setStatus(state));
    const snapshot = await first;
    this.scene = new BABYLON.Scene(this.engine);
    this.navigation = new Navigation(GAME_CONFIG.mapHalfSize);
    this.assets = new AssetManager(this.scene, GAME_CONFIG, this.progress);
    await this.assets.initialize();
    this.map = new RegionWorld(this.scene, this.navigation, this.runtime.profile, this.runtime.quality);
    const world = await this.map.build(this.assets, { id: snapshot.region });
    const visual = await this.assets.loadPlayerVisual(identity.classId);
    this.player = new PlayerController(visual, { enabled: true }, this.navigation, identity);
    this.player.id = identity.characterId;
    this.player.position.set(snapshot.self.x, this.navigation.heightAt(snapshot.self.x, snapshot.self.z), snapshot.self.z);
    this.player.root.rotation.y = snapshot.self.rotation;
    this.animator = new PlayerAnimator(visual);
    this.vfx = new CombatVFX(this.scene, this.player);
    this.buffVfx = new BuffVFXManager(this.scene, this.player, this.vfx.materials[4].diffuseTexture);
    this.deathScreen = new DeathScreen(mode => { this.connection.send(CLIENT.RESPAWN, { mode }); return true; });
    this.camera = new IsometricCamera(this.scene, this.canvas, this.player, GAME_CONFIG.camera);
    this.camera.snap(this.player.position);
    this.map.addShadowCaster(this.player.root);
    await this.buildMobs(world.spawns);
    this.makeHud();
    this.applySnapshot(this.pendingSnapshot || snapshot);
    this.bindInput();
    this.runtime.run(() => this.frame());
    this.initialized = true;
    void this.map.buildOptional().catch(error => console.warn('[Tora Online] Çevre ayrıntısı:', error));
    return { backend: `${this.runtime.backend} + WebSocket` };
  }

  makeHud() {
    const hud = document.createElement('section'); hud.id = 'online-hud'; hud.className = 'online-hud';
    hud.innerHTML = `<div class="online-frame panel"><div><small>ÇEVRİMİÇİ · <span data-region></span></small><strong data-name></strong><span data-level></span></div><div class="online-meter"><i data-hp></i><span data-hp-text></span></div><div class="online-meter mana"><i data-mana></i><span data-mana-text></span></div><small data-progress></small></div>
      <div class="online-target panel" hidden><strong data-target></strong><span data-target-hp></span></div>
      <div class="online-log panel" role="log" aria-live="polite"></div>
      <form class="online-chat panel"><label>SOHBET <input maxlength="200" placeholder="Enter ile yaz…"></label><button>GÖNDER</button></form>
      <div class="online-actions panel"><div data-skills></div><button data-pickup type="button">F · Etkileşim</button><button data-inventory type="button">I · Çanta</button><button data-shop type="button">Dükkân</button><button data-exit type="button">Menü</button></div>
      <div class="online-inventory panel" hidden><strong>ÇANTA <span data-gold></span></strong><div data-items></div></div>
      <div class="online-shop panel" hidden><strong>AYAME · DÜKKÂN</strong><div data-shop-items></div></div>
      <div class="online-status" role="status"></div><div class="online-labels"></div>`;
    document.body.append(hud); this.hud = hud;
    const skills = hud.querySelector('[data-skills]');
    for (const skill of CLASS_DEFS[this.identity.classId].skills) {
      const button = document.createElement('button'); button.type = 'button'; button.textContent = `${skill.slot} · ${skill.name}`; button.title = `${skill.name} · ${skill.mana} Mana`; button.addEventListener('click', () => this.cast(skill.slot)); skills.append(button);
    }
    hud.querySelector('[data-pickup]').addEventListener('click', () => this.pickup());
    hud.querySelector('[data-inventory]').addEventListener('click', () => { const box = hud.querySelector('.online-inventory'); box.hidden = !box.hidden; });
    hud.querySelector('[data-shop]').addEventListener('click', () => { if (this.map.region !== 'village' || distance(this.player.position, { x: -2, z: 2 }) > 4) { this.setStatus('Dükkân için Ayame’ye yaklaş.'); return; } const box = hud.querySelector('.online-shop'); box.hidden = !box.hidden; });
    for (const [itemId, price] of [['health-potion', 12], ['mana-potion', 15], ['trail-ration', 10], ['arcane-scroll', 25], [CLASS_DEFS[this.identity.classId].rewardWeapon, 80]]) {
      const button = document.createElement('button'); button.type = 'button'; button.textContent = `${ITEM_DEFS[itemId].name} · ${price} altın`;
      button.addEventListener('click', () => this.connection.send(CLIENT.INTERACT, { action: `npc:buy:${itemId}` })); hud.querySelector('[data-shop-items]').append(button);
    }
    hud.querySelector('[data-exit]').addEventListener('click', () => { this.leave(); document.dispatchEvent(new CustomEvent('tora:characters')); });
    hud.querySelector('.online-chat').addEventListener('submit', event => {
      event.preventDefault(); const input = hud.querySelector('.online-chat input'), value = input.value.trim(); if (!value) return;
      this.connection.send(CLIENT.CHAT, { channel: value.startsWith('/near ') ? 'near' : 'general', text: value.replace(/^\/near\s+/, '') }); input.value = '';
    });
    this.setStatus('Dünyaya girildi.');
  }

  async buildMobs(spawns) {
    for (const mob of this.mobs.values()) mob.dispose(); this.mobs.clear();
    const visuals = await Promise.all(spawns.map(spawn => this.assets.instantiateMob(spawn.type)));
    spawns.forEach((spawn, index) => {
      const mob = new Mob(this.scene, spawn, index, this.navigation, null, visuals[index]);
      mob.id = `${this.map.region}:mob:${index}`;
      mob.root.getChildMeshes(false).forEach(mesh => { mesh.metadata = { ...(mesh.metadata || {}), mob: true, entityId: mob.id }; });
      this.map.addShadowCaster(mob.root); this.mobs.set(mob.id, mob);
    });
  }

  async loadRegion(region) {
    if (this.loadingRegion || this.map.region === region) return;
    this.loadingRegion = true; this.setStatus(`${REGIONS[region].name} yükleniyor…`);
    try {
      this.clearRemotes();
      for (const mob of this.mobs.values()) mob.dispose(); this.mobs.clear();
      const world = await this.map.load(region);
      await this.buildMobs(world.spawns);
      this.player.cancelDestination(); this.destination = null; this.route = null; this.pendingPortal = null;
      this.player.position.copyFrom(world.spawn); this.camera.snap(world.spawn);
      this.applySnapshot(this.pendingSnapshot);
      this.setStatus(REGIONS[region].name);
    } catch (error) { this.fatal(error); }
    finally { this.loadingRegion = false; }
  }

  onPacket(packet) {
    if (packet.type === SERVER.SNAPSHOT) {
      if (this.firstResolve) { clearTimeout(this.firstTimer); this.firstResolve(packet); this.firstResolve = null; }
      if (!this.hud) { this.pendingSnapshot = packet; return; }
      if (packet.region !== this.map.region) { this.pendingSnapshot = packet; void this.loadRegion(packet.region); return; }
      this.applySnapshot(packet);
    } else if (packet.type === SERVER.ERROR) this.setStatus(packet.message);
    else if (packet.type === SERVER.REGION) this.setStatus(`${REGIONS[packet.region]?.name || 'Bölge'} yükleniyor…`);
    else if (packet.type === SERVER.SPAWN && packet.player && this.map?.region === packet.player.region) void this.ensureRemote(packet.player);
    else if (packet.type === SERVER.DESPAWN) this.removeRemote(packet.playerId);
    else if (packet.type === SERVER.COMBAT) this.combatEvent(packet);
    else if (packet.type === SERVER.LOOT) { this.loot.set(packet.loot.id, packet.loot); this.setStatus('Ganimet düştü. F ile al.'); }
    else if (packet.type === SERVER.LOOT_REMOVE) this.loot.delete(packet.lootId);
    else if (packet.type === SERVER.INVENTORY) this.renderInventory(packet);
    else if (packet.type === SERVER.PROGRESSION) { this.progression = { ...this.progression, ...packet }; this.restoreChests(); this.renderHud(); }
    else if (packet.type === SERVER.CHAT) this.log(`${packet.channel === 'near' ? 'Yakın' : 'Genel'} · ${packet.from}: ${packet.text}`);
    else if (packet.type === SERVER.BUFF && packet.playerId === this.identity.characterId) { for (const [name, duration] of Object.entries(packet.buffs || {})) if (duration > 0) this.buffVfx.applyBuff(name, duration); this.setStatus('Etki aktif.'); }
  }

  applySnapshot(packet) {
    if (!packet || !this.map || packet.region !== this.map.region) return;
    this.self = packet.self;
    if (packet.progression) { this.progression = packet.progression; this.restoreChests(); }
    if (packet.inventory) this.renderInventory(packet.inventory);
    this.loot = new Map(packet.loot.map(item => [item.id, item]));
    const gap = distance(this.player.position, packet.self);
    if (gap > 2 || !this.running) this.player.position.set(packet.self.x, this.navigation.heightAt(packet.self.x, packet.self.z), packet.self.z);
    else { this.player.position.x += (packet.self.x - this.player.position.x) * .2; this.player.position.z += (packet.self.z - this.player.position.z) * .2; }
    this.player.health = packet.self.health; this.player.maxHealth = packet.self.maxHealth;
    this.player.mana = packet.self.mana; this.player.maxMana = packet.self.maxMana;
    this.player.level = packet.self.level; this.player.alive = packet.self.alive;
    this.player.state = packet.self.state;
    this.player.buffs.guard = packet.self.buffs?.guard || 0; this.player.buffs.rage = packet.self.buffs?.rage || 0;
    if (packet.self.alive) this.deathScreen?.hide(); else if (this.deathScreen?.element.hidden) this.deathScreen.show();
    this.player.root.rotation.y = packet.self.rotation;
    const visible = new Set(packet.players.map(p => p.id));
    for (const entry of packet.players) void this.ensureRemote(entry);
    for (const id of this.remotes.keys()) if (!visible.has(id)) this.removeRemote(id);
    for (const state of packet.mobs) this.mobs.get(state.id)?.applyNetworkState(state);
    this.renderHud();
  }

  async ensureRemote(state) {
    let remote = this.remotes.get(state.id);
    if (remote) { remote.target = state; return; }
    remote = { target: state, loading: true }; this.remotes.set(state.id, remote);
    try {
      const visual = await this.assets.loadPlayerVisual(state.classId);
      if (this.disposed || this.remotes.get(state.id) !== remote) { visual.root.dispose(); return; }
      remote.root = visual.root; remote.animator = new PlayerAnimator(visual); remote.loading = false;
      remote.root.position.set(state.x, this.navigation.heightAt(state.x, state.z), state.z);
      remote.root.rotation.y = state.rotation;
      remote.label = document.createElement('span'); remote.label.className = 'online-nameplate'; remote.label.textContent = state.name; this.hud.querySelector('.online-labels').append(remote.label);
      this.map.addShadowCaster(remote.root);
    } catch (error) { console.error('[Tora Online] Oyuncu görseli:', error); this.remotes.delete(state.id); }
  }
  removeRemote(id) { const entry = this.remotes.get(id); if (!entry) return; entry.label?.remove(); entry.animator?.groups.forEach(group => group.dispose()); entry.root?.dispose(); this.remotes.delete(id); }
  clearRemotes() { for (const id of this.remotes.keys()) this.removeRemote(id); }

  renderInventory(data) {
    if (!data) return; this.inventory = data; if (!this.hud) return;
    const box = this.hud.querySelector('[data-items]'); box.replaceChildren();
    this.hud.querySelector('[data-gold]').textContent = `${data.gold} altın`;
    for (const row of data.items || []) {
      const button = document.createElement('button'); button.type = 'button';
      button.textContent = `${ITEM_DEFS[row.item_id || row.itemId]?.name || row.item_id || row.itemId} ×${row.quantity}`;
      button.addEventListener('click', () => this.connection.send(ITEM_DEFS[row.item_id || row.itemId]?.type === 'consumable' ? CLIENT.USE : CLIENT.EQUIP, { itemId: row.id })); box.append(button);
    }
  }
  renderHud() {
    if (!this.hud || !this.self) return;
    const get = key => this.hud.querySelector(`[data-${key}]`);
    get('region').textContent = REGIONS[this.map.region]?.name || this.map.region;
    get('name').textContent = this.identity.username;
    get('level').textContent = `Seviye ${this.self.level}`;
    get('hp').style.width = `${100 * this.self.health / Math.max(1, this.self.maxHealth)}%`;
    get('hp-text').textContent = `${Math.ceil(this.self.health)} / ${this.self.maxHealth} CAN`;
    get('mana').style.width = `${100 * this.self.mana / Math.max(1, this.self.maxMana)}%`;
    get('mana-text').textContent = `${Math.ceil(this.self.mana)} / ${this.self.maxMana} MANA`;
    get('progress').textContent = `${this.progression?.xp || 0} XP · ${this.inventory?.gold || 0} altın`;
    const mob = this.mobs.get(this.targetId), target = this.hud.querySelector('.online-target');
    target.hidden = !mob?.alive;
    if (mob?.alive) { get('target').textContent = mob.name; get('target-hp').textContent = `${mob.health} / ${mob.maxHealth} CAN`; }
  }
  combatEvent(packet) {
    if (!this.scene) return;
    const source = packet.sourceId === this.identity.characterId ? this.player : this.remotes.get(packet.sourceId)?.root || this.mobs.get(packet.sourceId)?.root;
    const target = packet.targetId === this.identity.characterId ? this.player : this.remotes.get(packet.targetId)?.root || this.mobs.get(packet.targetId)?.root;
    const sourceClass = packet.sourceId === this.identity.characterId ? this.identity.classId : this.remotes.get(packet.sourceId)?.target.classId;
    const skill = CLASS_DEFS[sourceClass]?.skills.find(entry => entry.slot === packet.skillSlot);
    const from = source?.position?.clone?.() || new BABYLON.Vector3(packet.x || 0, 0, packet.z || 0);
    const to = target?.position?.clone?.() || new BABYLON.Vector3(packet.x || 0, this.navigation.heightAt(packet.x || 0, packet.z || 0), packet.z || 0);
    if (packet.phase === 'cast' && skill) {
      this.vfx.cast(skill, from, to);
      if (packet.sourceId === this.identity.characterId) { this.animator.playAction(skill.animation, skill.duration); this.actionUntil = performance.now() + skill.duration * 1000; }
      else { const remote = this.remotes.get(packet.sourceId); remote?.animator?.playAction(skill.animation, skill.duration); if (remote) remote.actionUntil = performance.now() + skill.duration * 1000; }
    }
    if (packet.phase === 'impact') {
      this.vfx.impact(skill || { slot: 1, damage: packet.damage, color: '#d4a056', trail: true }, from, to);
      if (packet.targetId === this.identity.characterId) this.setStatus(`${packet.damage} hasar aldın.`);
      else if (packet.sourceId === this.identity.characterId) this.setStatus(`${packet.damage} hasar verdin${packet.dead ? ' · Yaratık yenildi' : ''}.`);
    }
  }
  restoreChests() { for (const chest of this.map?.chests || []) if (this.progression?.chests?.includes(chest.id)) chest.restoreLooted(); }
  log(message) { if (!this.hud) return; const node = document.createElement('p'); node.textContent = message; const box = this.hud.querySelector('.online-log'); box.append(node); while (box.children.length > 30) box.firstChild.remove(); box.scrollTop = box.scrollHeight; }
  setStatus(message) { this.status = message; if (this.hud) this.hud.querySelector('.online-status').textContent = message; }

  bindInput() {
    this.onKeyDown = event => {
      if (event.target instanceof HTMLInputElement) { if (event.key === 'Escape') event.target.blur(); return; }
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) event.preventDefault();
      this.keys.add(event.key.toLowerCase());
      if (/^[1-9]$/.test(event.key)) this.cast(Number(event.key));
      if (event.key.toLowerCase() === 'f') this.pickup();
      if (event.key.toLowerCase() === 'i') { const box = this.hud.querySelector('.online-inventory'); box.hidden = !box.hidden; }
      if (event.key === 'Enter') this.hud.querySelector('.online-chat input').focus();
    };
    this.onKeyUp = event => this.keys.delete(event.key.toLowerCase());
    this.onBlur = () => this.keys.clear();
    this.onPointer = event => {
      if (!this.running || event.target !== this.canvas || event.button !== 0) return;
      const pick = this.scene.pick(this.scene.pointerX, this.scene.pointerY, mesh => Boolean(mesh.metadata?.mob || mesh.metadata?.portal || mesh.metadata?.ground));
      if (!pick?.hit) return;
      const meta = pick.pickedMesh.metadata;
      if (meta.mob) { this.targetId = meta.entityId; this.renderHud(); this.cast(1); return; }
      if (meta.portal) { const exit = REGIONS[this.map.region].exits.find(item => item.id === meta.portal); if (!exit) return; if (distance(this.player.position, exit) <= 4.5) this.connection.send(CLIENT.PORTAL, { portalId: meta.portal }); else { this.pendingPortal = meta.portal; this.route = this.navigation.resolvePath(this.player.position, new BABYLON.Vector3(exit.x, this.navigation.heightAt(exit.x, exit.z), exit.z)); this.destination = this.route.shift() || null; } return; }
      if (meta.ground) { this.route = this.navigation.resolvePath(this.player.position, pick.pickedPoint); this.destination = this.route.shift() || null; this.groundTarget = { x: pick.pickedPoint.x, z: pick.pickedPoint.z }; this.pendingPortal = null; this.targetId = null; this.renderHud(); }
    };
    addEventListener('keydown', this.onKeyDown); addEventListener('keyup', this.onKeyUp); addEventListener('blur', this.onBlur);
    this.canvas.addEventListener('pointerdown', this.onPointer);
  }
  cast(slot) {
    if (!this.running || !this.connection?.ready || !this.self?.alive) return;
    const skill = CLASS_DEFS[this.identity.classId].skills.find(s => s.slot === slot); if (!skill) return;
    const ground = skill.target === 'ground' ? (this.groundTarget || { x: this.player.position.x, z: this.player.position.z }) : undefined;
    this.connection.send(slot === 1 ? CLIENT.ATTACK : CLIENT.SKILL, { slot, targetId: this.targetId, ground });
  }
  pickup() {
    if (!this.player || !this.connection?.ready) return;
    const nearest = [...this.loot.values()].sort((a, b) => distance(a, this.player.position) - distance(b, this.player.position))[0];
    if (nearest && distance(nearest, this.player.position) <= 2.4) this.connection.send(CLIENT.PICKUP, { lootId: nearest.id });
    else if (this.map.region === 'village' && distance(this.player.position, { x: -2, z: 2 }) <= 4) this.connection.send(CLIENT.INTERACT, { action: 'npc:quest' });
    else { const chest = ({ village: { id: 'chest', x: 11, z: -8 }, forest: { id: 'forest-chest', x: 8, z: 9 }, ruins: { id: 'boss-treasure', x: 0, z: 17 } })[this.map.region]; if (chest && distance(this.player.position, chest) <= 3.5) { this.connection.send(CLIENT.INTERACT, { action: `chest:${chest.id}` }); return; }
      this.setStatus('Etkileşim menzilinde bir hedef yok.'); }
  }
  frame() {
    if (this.disposed || !this.scene) return;
    const stamp = performance.now(), dt = Math.min(.05, (stamp - this.lastFrame) / 1000); this.lastFrame = stamp;
    if (this.running && !this.loadingRegion) {
      let dx = 0, dz = 0;
      if (this.keys.has('w') || this.keys.has('arrowup')) dz++;
      if (this.keys.has('s') || this.keys.has('arrowdown')) dz--;
      if (this.keys.has('a') || this.keys.has('arrowleft')) dx--;
      if (this.keys.has('d') || this.keys.has('arrowright')) dx++;
      if (this.pendingPortal) { const exit = REGIONS[this.map.region].exits.find(item => item.id === this.pendingPortal); if (exit && distance(this.player.position, exit) <= 4.4) { this.connection.send(CLIENT.PORTAL, { portalId: this.pendingPortal }); this.pendingPortal = null; this.destination = null; this.route = null; } }
      if (!dx && !dz && this.destination) {
        const d = distance(this.player.position, this.destination);
        if (d < .22) this.destination = this.route?.shift() || null;
        else { dx = (this.destination.x - this.player.position.x) / d; dz = (this.destination.z - this.player.position.z) / d; }
      } else if (dx || dz) { this.destination = null; this.route = null; this.pendingPortal = null; }
      const len = Math.hypot(dx, dz); if (len > 1) { dx /= len; dz /= len; }
      if (!this.self?.alive) { dx = 0; dz = 0; }
      if (this.connection.ready) {
        const speed = CLASS_DEFS[this.identity.classId].speed, next = safeStep(this.map.region, this.player.position, dx * speed * dt, dz * speed * dt);
        this.player.position.x = next.x; this.player.position.z = next.z; this.player.position.y = this.navigation.heightAt(next.x, next.z);
        if (Math.hypot(dx, dz) > .01) this.player.root.rotation.y = Math.atan2(dx, dz);
        this.sendElapsed += dt;
        if (this.sendElapsed >= .05 || dx !== this.lastInput.dx || dz !== this.lastInput.dz) { this.connection.send(CLIENT.MOVE, { dx, dz }); this.lastInput = { dx, dz }; this.sendElapsed = 0; }
      }
      if (stamp >= (this.actionUntil || 0)) this.animator.setState(this.self?.alive ? (dx || dz ? 'run' : 'idle') : 'dead'); this.animator.update(dt, dx || dz ? 1 : 0);
      for (const entry of this.remotes.values()) if (entry.root) {
        const target = entry.target;
        entry.root.position.x += (target.x - entry.root.position.x) * Math.min(1, dt * 12);
        entry.root.position.z += (target.z - entry.root.position.z) * Math.min(1, dt * 12);
        entry.root.position.y = this.navigation.heightAt(entry.root.position.x, entry.root.position.z);
        entry.root.rotation.y += (target.rotation - entry.root.rotation.y) * Math.min(1, dt * 10);
        if (stamp >= (entry.actionUntil || 0)) entry.animator.setState(target.alive ? (target.state === 'run' ? 'run' : 'idle') : 'dead'); entry.animator.update(dt, target.state === 'run' ? 1 : 0);
        if (entry.label) { const screen = BABYLON.Vector3.Project(entry.root.position.add(new BABYLON.Vector3(0, 2.7, 0)), BABYLON.Matrix.Identity(), this.scene.getTransformMatrix(), this.camera.camera.viewport.toGlobal(this.engine.getRenderWidth(), this.engine.getRenderHeight())); const x = screen.x / this.engine.getRenderWidth() * this.canvas.clientWidth, y = screen.y / this.engine.getRenderHeight() * this.canvas.clientHeight; entry.label.style.transform = `translate(${x}px,${y}px) translate(-50%,-100%)`; entry.label.hidden = screen.z < 0 || screen.z > 1; }
      }
      for (const mob of this.mobs.values()) if (mob.networkTarget) {
        const target = mob.networkTarget;
        mob.position.x += (target.x - mob.position.x) * Math.min(1, dt * 12);
        mob.position.z += (target.z - mob.position.z) * Math.min(1, dt * 12);
        mob.position.y = this.navigation.heightAt(mob.position.x, mob.position.z) + mob.footOffset;
        mob.root.rotation.y = target.rotation;
        if (!target.alive && target.health === 0) { mob.deadAt ||= stamp; if (stamp - mob.deadAt > 1800) mob.root.setEnabled(false); }
        else mob.deadAt = 0;
      }
      this.vfx.update(dt); this.buffVfx.update(dt);
      this.camera.update(dt); this.map.update(dt, this.camera.camera, this.engine.getFps());
    }
    this.scene.render();
  }
  enter() { if (!this.initialized) throw Error('Dünya hazır değil.'); this.running = true; this.canvas.focus(); this.hud.hidden = false; this.lastFrame = performance.now(); }
  leave() { this.running = false; this.connection?.close(); this.hud?.remove(); this.hud = null; }
  applyQuality(name) { this.runtime.applyQuality(name); this.map?.setQuality?.(name); }
  applyIdentity(identity) { this.identity = identity; }
  dispose() {
    if (this.disposed) return; this.disposed = true; this.leave();
    clearTimeout(this.firstTimer); this.firstReject?.(Error('Bağlantı kapatıldı.'));
    removeEventListener('keydown', this.onKeyDown); removeEventListener('keyup', this.onKeyUp); removeEventListener('blur', this.onBlur);
    this.canvas.removeEventListener('pointerdown', this.onPointer);
    this.clearRemotes(); for (const mob of this.mobs.values()) mob.dispose(); this.mobs.clear();
    this.deathScreen?.dispose(); this.buffVfx?.dispose(); this.vfx?.dispose(); this.camera?.dispose(); this.map?.dispose(); this.scene?.dispose();
  }
}
