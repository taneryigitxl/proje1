import { itemArt } from "./Art.js";
import { SkillBar } from "./SkillBar.js";
import { TargetFrame } from "./TargetFrame.js";
import { ITEM_DEFS } from "../progression/InventorySystem.js";
import { SKILLS } from "../core/Config.js";
import { CharacterPreview } from "./CharacterPreview.js";

const SHORTCUTS = [
  ['stats','Karakter','C','M12 3a4 4 0 1 0 4 4 4 4 0 0 0-4-4 4-4Zm-8 17v-2a8 8 0 0 1 16 0v2'],
  ['inventory','Envanter','I','M4 8h16l-1 12H5L4 8Zm4 0V6a4 4 0 0 1 8 0v2'],
  ['skills','Yetenekler','K','m5 19 14-14M9 5l10 10M4 14l6 6'],
  ['quests','Görevler','J','M6 3h12v18H6zM9 8h6M9 12h6M9 16h4'],
  ['friends','Arkadaşlar','—','M8 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8-1a2.5 2.5 0 1 0 0-5M2 20v-2a6 6 0 0 1 12 0v2Zm13-6a5 5 0 0 1 7 5v1h-5'],
  ['guild','Lonca','—','M12 2 4 5v6c0 5 3 8 8 11 5-3 8-6 8-11V5l-8-3Zm0 5v10m-4-6h8'],
  ['party','Grup','—','M12 10a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM4 11a2 2 0 1 0 0-4m16 4a2 2 0 1 1 0-4M7 20v-2a5 5 0 0 1 10 0v2M1 20v-2a4 4 0 0 1 4-4m18 6v-2a4 4 0 0 0-4-4'],
  ['map','Harita','M','m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2V5Zm6-2v16m6-14v16'],
  ['settings','Ayarlar','Esc','M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm0-13 1 2 2 .5 2-1 2 2-1 2 .5 2 2 1v3l-2 1-.5 2 1 2-2 2-2-1-2 .5-1 2h-3l-1-2-2-.5-2 1-2-2 1-2-.5-2-2-1v-3l2-1 .5-2-1-2 2-2 2 1 2-.5 1-2h3Z'],
];

const STAT_LABEL = { strength: "Güç", vitality: "Canlılık", intelligence: "Zeka", dexterity: "Çeviklik" };

function itemName(id) {
  return ITEM_DEFS[id]?.name || id || "—";
}

function bonusText(item) {
  if (!item?.bonuses) return item?.description || "";
  return Object.entries(item.bonuses).map(([key, value]) => `${STAT_LABEL[key] || key} +${value}`).join(", ");
}

export class HUD {
  constructor(scene, engine, player, entities, skillSystem, progression, onSkill, stats, inventory, options = {}) {
    this.scene = scene;
    this.engine = engine;
    this.player = player;
    this.entities = entities;
    this.progression = progression;
    this.stats = stats;
    this.inventory = inventory;
    this.map = options.map;
    this.onSettings = options.onSettings || (()=>{});
    this.onQuality = options.onQuality || (()=>{});
    this.onVolume = options.onVolume || (()=>{});
    this.onDropItem = options.onDropItem || null;
    this.onPanelChange = options.onPanelChange || (()=>{});
    this.root = document.getElementById("hud");
    this.hpBar = document.getElementById("player-hp-bar");
    this.hpText = document.getElementById("player-hp-text");
    this.manaBar = document.getElementById("player-mana-bar");
    this.manaText = document.getElementById("player-mana-text");
    this.level = document.getElementById("player-level");
    this.xpBar = document.getElementById("player-xp-bar");
    this.xpText = document.getElementById("player-xp-text");
    this.nameEl = document.getElementById("player-name");
    this.portrait = document.getElementById("player-portrait");
    this.fps = document.getElementById("debug-fps");
    this.questPanel = document.querySelector(".quest-panel");
    this.quest = document.getElementById("quest-status");
    this.statusMessage = "";
    this.statusUntil = 0;
    this.toast = document.getElementById("progress-toast");
    this.toastTimer = 0;
    this.targetFrame = new TargetFrame(document.getElementById("target-frame"));
    this.skillBar = new SkillBar(document.getElementById("skill-bar"), onSkill);
    this.skillSystem = skillSystem;
    this.labelLayer = document.getElementById("world-labels");
    this.damageLayer = document.getElementById("damage-layer");
    this.labels = new Map();
    this.damagePool = this.#createDamagePool();
    this.damageCursor = 0;
    this.minimapPlayer = document.getElementById("minimap-player");
    this.minimapMobs = document.getElementById("minimap-mobs");
    this.minimapSites = document.getElementById("minimap-sites");
    this.minimapContent = document.getElementById("minimap-content");
    this.minimapZoom = 1;
    this.minimapZoomIn = document.getElementById('minimap-zoom-in');
    this.minimapZoomOut = document.getElementById('minimap-zoom-out');
    this.chatLog = document.getElementById("chat-log");
    this.chatForm = document.getElementById("chat-form");
    this.chatInput = document.getElementById("chat-input");
    this.inventoryPanel = document.getElementById("inventory-panel");
    this.statsPanel = document.getElementById("stats-panel");
    this.shortcutPanel = document.getElementById('shortcut-panel');
    this.shortcutTitle = document.getElementById('shortcut-title');
    this.shortcutContent = document.getElementById('shortcut-content');
    this.shortcutBar = document.getElementById('shortcut-bar');
    this.preview = new CharacterPreview(scene, player);
    this.shortcutButtons = new Map();
    const glyphs={stats:'♙',inventory:'▣',skills:'✦',quests:'✧',friends:'♧',guild:'⚑',party:'♟',map:'⌖',settings:'⚙'};
    for(const [id,label,key] of SHORTCUTS){
      const button=document.createElement('button');button.type='button';button.className='shortcut-button';button.dataset.shortcut=id;
      button.setAttribute('aria-label',`${label} · ${key}`);
      button.innerHTML=`<span class="shortcut-glyph" aria-hidden="true">${glyphs[id]}</span><span class="shortcut-tip">${label}<small>${key}</small></span><i class="shortcut-badge" hidden></i>`;
      this.shortcutBar.append(button);this.shortcutButtons.set(id,button);
    }
    this.inventoryGrid = document.getElementById("inventory-grid");
    this.inventoryHint = document.getElementById("inventory-hint");
    this.statsList = document.getElementById("stats-list");
    this.statPoints = document.getElementById("stat-points");
    this.statsSummary = document.getElementById("stats-summary");
    this.buffBar = document.getElementById("buff-bar");
    this.equipSummary = document.getElementById("equip-summary");
    this.useItemButton = document.getElementById("inventory-use");
    this.dropDialog = document.getElementById("drop-confirm");
    this.dropYes = document.getElementById("drop-yes");
    this.dropNo = document.getElementById("drop-no");
    this.openPanel = null;
    this.chatBubbles = [];
    this.pendingDropIndex = -1;
    this.dragFrom = -1;
    this._lastHudTime = performance.now();

    this.playerLabel = document.createElement("div");
    this.playerLabel.className = "player-label";
    this.playerLabel.hidden = true;
    this.playerLabel.innerHTML = `<small class="player-label-level">Lv.1</small><strong class="player-label-name">—</strong>`;
    this.labelLayer.append(this.playerLabel);

    this.bubbleLayer = document.createElement("div");
    this.bubbleLayer.className = "chat-bubbles";
    this.labelLayer.append(this.bubbleLayer);

    for (const mob of entities.mobs) {
      this.#labelFor(mob);
      const dot = document.createElement("i");
      dot.dataset.entityId = mob.id;
      dot.className=mob.definition?.boss?'boss':mob.level>1?'elite':'';
      dot.title=mob.name;
      this.minimapMobs.append(dot);
    }

    this.onChatSubmit = (event) => {
      event.preventDefault();
      const message = this.chatInput.value.trim();
      if (message) this.addChat("Sen", message);
      this.chatInput.value = "";
      this.chatInput.blur();
    };
    this.onGlobalKeyDown = (event) => {
      if (event.code === "Enter" && document.activeElement !== this.chatInput) {
        event.preventDefault();
        this.chatInput.focus();
      }
    };
    this.onPanelClick = (event) => {
      const shortcut=event.target.closest('[data-shortcut]');
      if(shortcut){
        const name=shortcut.dataset.shortcut;
        this.togglePanel(name);
        return;
      }
      const close = event.target.closest("[data-close]");
      if (close) {
        this.togglePanel(close.dataset.close, false);
        return;
      }
      const equipSlot = event.target.closest("[data-equip-slot]");
      if (equipSlot) {
        const id = this.inventory.equipped[equipSlot.dataset.equipSlot];
        const index = id ? this.inventory.slots.indexOf(id) : -1;
        if (index >= 0) this.inventory.select(index);
        this.#renderInventory();
        return;
      }
      const slot = event.target.closest("[data-inv-slot]");
      if (slot) {
        const index = Number(slot.dataset.invSlot);
        if (event.detail === 2) {
          this.inventory.selected = index;
          const result = this.inventory.useSelected();
          this.inventoryHint.textContent = result.message;
          if (result.ok) this.setStatus(result.message);
        } else {
          this.inventory.select(index);
        }
        this.#renderInventory();
        return;
      }
      const allocate = event.target.closest("[data-stat-id]");
      if (allocate) {
        if (this.stats.allocate(allocate.dataset.statId)) {
          this.#renderStats();
          this.setStatus(`${allocate.dataset.statId} artırıldı.`);
        }
        return;
      }
      if (event.target.closest("#inventory-use")) {
        const result = this.inventory.useSelected();
        this.inventoryHint.textContent = result.message;
        if (result.ok) this.setStatus(result.message);
        this.#renderInventory();
        this.#renderStats();
      }
    };

    this.onDragStart = (event) => {
      const slot = event.target.closest("[data-inv-slot]");
      if (!slot || slot.classList.contains("empty")) {
        event.preventDefault();
        return;
      }
      this.dragFrom = Number(slot.dataset.invSlot);
      event.dataTransfer.setData("text/plain", String(this.dragFrom));
      event.dataTransfer.effectAllowed = "move";
      slot.classList.add("dragging");
    };
    this.onDragEnd = (event) => {
      event.target.closest("[data-inv-slot]")?.classList.remove("dragging");
    };
    this.onDragOver = (event) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
    };
    this.onDrop = (event) => {
      event.preventDefault();
      event.stopPropagation();
      const from = Number(event.dataTransfer.getData("text/plain") || this.dragFrom);
      if (!Number.isFinite(from) || from < 0) return;
      const equipSlot = event.target.closest?.("[data-equip-slot]");
      if (equipSlot) {
        const id = this.inventory.slots[from];
        const item = id ? ITEM_DEFS[id] : null;
        this.dragFrom = -1;
        if (!item || item.slot !== equipSlot.dataset.equipSlot) {
          this.setStatus("Bu yuvaya uymaz.");
          return;
        }
        this.inventory.selected = from;
        const result = this.inventory.useSelected();
        this.inventoryHint.textContent = result.message;
        if (result.ok) this.setStatus(result.message);
        this.#renderInventory();
        this.#renderStats();
        return;
      }
      const slot = event.target.closest?.("[data-inv-slot]");
      if (slot) {
        const to = Number(slot.dataset.invSlot);
        this.inventory.move(from, to);
        this.dragFrom = -1;
        this.#renderInventory();
        this.#renderStats();
        return;
      }
      this.dragFrom = -1;
    };
    this.onDocDragOver = (event) => {
      if (this.dragFrom < 0) return;
      event.preventDefault();
    };
    this.onDocDrop = (event) => {
      if (this.dragFrom < 0) return;
      event.preventDefault();
      const from = this.dragFrom;
      this.dragFrom = -1;
      if (event.target.closest?.("#inventory-panel")) return;
      this.#askDrop(from);
    };
    this.onDropYes = () => {
      if (this.pendingDropIndex < 0) return this.#hideDropDialog();
      const itemId = this.inventory.removeAt(this.pendingDropIndex);
      this.#hideDropDialog();
      if (itemId) {
        this.onDropItem?.(itemId);
        this.setStatus(`${ITEM_DEFS[itemId]?.name || "Eşya"} yere bırakıldı.`);
        this.#renderInventory();
        this.#renderStats();
      }
    };
    this.onDropNo = () => this.#hideDropDialog();

    this.chatForm.addEventListener("submit", this.onChatSubmit);
    this.onMinimapZoom = event => {
      this.minimapZoom = BABYLON.Scalar.Clamp(this.minimapZoom + (event.currentTarget===this.minimapZoomIn ? .3 : -.3), 1, 1.9);
      this.minimapContent.style.transform=`scale(${this.minimapZoom})`;
    };
    this.minimapZoomIn?.addEventListener('click',this.onMinimapZoom);
    this.minimapZoomOut?.addEventListener('click',this.onMinimapZoom);
    addEventListener("keydown", this.onGlobalKeyDown);
    this.root.addEventListener("click", this.onPanelClick);
    this.inventoryGrid?.addEventListener("dragstart", this.onDragStart);
    this.inventoryGrid?.addEventListener("dragend", this.onDragEnd);
    this.inventoryPanel?.addEventListener("dragover", this.onDragOver);
    this.inventoryPanel?.addEventListener("drop", this.onDrop);
    document.addEventListener("dragover", this.onDocDragOver);
    document.addEventListener("drop", this.onDocDrop);
    this.dropYes?.addEventListener("click", this.onDropYes);
    this.dropNo?.addEventListener("click", this.onDropNo);
    this.onPanelDragDown = (event) => {
      const header = event.target.closest(".game-panel > header");
      if (!header || event.button !== 0 || event.target.closest("button")) return;
      const panel = header.parentElement;
      const rect = panel.getBoundingClientRect();
      this.dragPanel = { panel, dx: event.clientX - rect.left, dy: event.clientY - rect.top };
      panel.classList.add("is-dragging");
      panel.style.right = "auto";
      panel.style.transform = "none";
      panel.style.left = `${rect.left}px`;
      panel.style.top = `${rect.top}px`;
    };
    this.onPanelDragMove = (event) => {
      if (!this.dragPanel) return;
      const { panel, dx, dy } = this.dragPanel;
      const x = Math.min(Math.max(8, event.clientX - dx), Math.max(8, window.innerWidth - panel.offsetWidth - 8));
      const y = Math.min(Math.max(8, event.clientY - dy), Math.max(8, window.innerHeight - 40));
      panel.style.left = `${x}px`;
      panel.style.top = `${y}px`;
    };
    this.onPanelDragUp = () => {
      this.dragPanel?.panel.classList.remove("is-dragging");
      this.dragPanel = null;
    };
    this.root.addEventListener("pointerdown", this.onPanelDragDown);
    window.addEventListener("pointermove", this.onPanelDragMove);
    window.addEventListener("pointerup", this.onPanelDragUp);
    this.#renderInventory();
    this.#renderStats();
    this.refreshMinimapSites();
    this.applyIdentity({ username: player.name, isAdmin: player.isAdmin });
  }

  syncEntities() {
    for(const node of this.labels.values())node.remove();this.labels.clear();this.minimapMobs.replaceChildren();
    this.minimapDots=new Map();
    for(const mob of this.entities.mobs){this.#labelFor(mob);const dot=document.createElement('i');dot.dataset.entityId=mob.id;dot.classList.toggle('boss',Boolean(mob.definition?.boss));dot.classList.toggle('elite',mob.level>1&&!mob.definition?.boss);dot.title=mob.name;this.minimapMobs.append(dot);this.minimapDots.set(mob.id,dot);}
    this.refreshMinimapSites();
  }
  refreshMinimapSites() {
    if(!this.minimapSites||!this.map?.definition)return;
    this.minimapSites.replaceChildren();
    const add=(kind,name,x,z,glyph)=>{
      const icon=document.createElement('span');icon.className='mini-site '+kind;icon.textContent=glyph;icon.title=name;
      this.minimapSites.append(icon);this.#minimapPosition(icon,{x,z},0,false);
    };
    for(const exit of this.map.definition.exits)add('portal',exit.name,exit.x,exit.z,'⌂');
    if(this.map.npc){const {x,z}=this.map.npc.position;add('quest','Demirci Ayame · Görev',x,z,'!');}
    for(const chest of this.map.chests||[]){const {x,z}=chest.root.position;add('chest','Sandık',x,z,'▣');}
  }
  applyIdentity(identity) {
    const name = identity?.username || this.player.name || "Oyuncu";
    this.player.name = name;
    this.player.isAdmin = Boolean(identity?.isAdmin);
    if (this.nameEl) this.nameEl.textContent = name;
    if (this.portrait) { this.portrait.className = "portrait warrior-portrait"; this.portrait.replaceChildren(); }
    const labelName = this.playerLabel?.querySelector(".player-label-name");
    if (labelName) labelName.textContent = name;
  }

  show(value = true) {
    this.root.hidden = !value;
    if (!value) this.closePanels();
  }

  setDebug(value) {
    this.fps.hidden = !value;
  }

  setStatus(message) {
    this.statusMessage = message;
    this.statusUntil = performance.now() + 2400;
    const output=document.getElementById("status-message"); output.textContent=message;output.hidden=false;
  }

  addChat(author, message) {
    const line = document.createElement("p");
    const name = document.createElement("b");
    name.textContent = author;
    line.append(name, document.createTextNode(` ${message}`));
    this.chatLog.append(line);
    while (this.chatLog.children.length > 6) this.chatLog.firstElementChild.remove();
    this.chatLog.scrollTop = this.chatLog.scrollHeight;

    if (author === "Sen" || author === this.player.name) {
      this.#pushBubble(message);
    }
  }

  #pushBubble(message) {
    const node = document.createElement("div");
    node.className = "chat-bubble";
    node.textContent = message;
    this.bubbleLayer.append(node);
    this.chatBubbles.push({ node, life: 3 });
    while (this.chatBubbles.length > 4) {
      const old = this.chatBubbles.shift();
      old.node.remove();
    }
  }

  showDamage(entity, result) {
    const node = this.damagePool[this.damageCursor++ % this.damagePool.length];
    const point = entity.position.add(new BABYLON.Vector3(0, 2.1, 0));
    const screen = this.#project(point);
    node.textContent = result.critical ? `${result.amount}!` : String(result.amount);
    node.className = `damage-number${result.critical ? " critical" : ""}`;
    node.style.left = `${screen.x}px`;
    node.style.top = `${screen.y}px`;
    node.hidden = false;
    node.style.animation = "none";
    void node.offsetWidth;
    node.style.animation = "";
    setTimeout(() => { node.hidden = true; }, 920);
  }

  announceProgress(result) {
    const parts = [`+${result.totalXp} XP`];
    if (result.questCompleted) parts.unshift("İlk Sınav tamamlandı");
    if (result.levelsGained) parts.push(`Seviye ${result.level}`);
    if (result.statPointsGained) parts.push(`+${result.statPointsGained} stat`);
    this.toast.textContent = parts.join(" • ");
    this.toast.hidden = false;
    this.toast.classList.remove("is-visible");
    void this.toast.offsetWidth;
    this.toast.classList.add("is-visible");
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.toast.hidden = true;
      this.toast.classList.remove("is-visible");
    }, 2600);
    this.#renderStats();
  }

  togglePanel(name, force) {
    const next = typeof force === "boolean" ? force : this.openPanel !== name;
    this.closePanels();
    if (!next) return;
    this.openPanel = name;
    this.onPanelChange();
    this.shortcutButtons.forEach((button,id)=>button.classList.toggle('active',id===name));
    if (name === "inventory") {
      this.inventoryPanel.hidden = false;
      this.#renderInventory();
      this.preview.attach(document.getElementById('inventory-preview-host'));
    } else if (name === "stats") {
      this.statsPanel.hidden = false;
      this.#renderStats();
      this.preview.attach(document.getElementById('stats-preview-host'));
    } else {
      this.shortcutPanel.hidden=false;
      this.#renderShortcutPanel(name);
    }
  }

  #renderShortcutPanel(name) {
    const label=SHORTCUTS.find(entry=>entry[0]===name)?.[1]||'Menü';
    this.shortcutTitle.textContent=label.toLocaleUpperCase('tr');
    this.shortcutContent.replaceChildren();
    if(name==='skills') this.shortcutContent.append(this.#skillCodex());
    else if(name==='quests') this.shortcutContent.append(this.#questCodex());
    else if(name==='map') this.shortcutContent.append(this.#mapCodex());
    else if(name==='settings') this.shortcutContent.append(this.#settingsCodex());
    else {
      const copy = {
        friends: "Arkadaş listesi bu sürümde yok. Yakındaki oyuncularla yazışmak için sol alttaki sohbet bu oturumda durur.",
        guild: "Lonca bu sürümde yok. Kurulum, rütbe ve lonca sohbeti sonraki geliştirmede eklenecek.",
        party: "Grup bu sürümde yok. Hedefini sol tıkla seçip tek başına savaşabilirsin.",
      };
      const p=document.createElement('p');p.className='shortcut-empty';p.textContent=copy[name]||'Bu menü henüz yok.';this.shortcutContent.append(p);
    }
  }

  #skillCodex() {
    const groups=[['Temel',[1]],['Kombo ve alan',[2,3,4]],['Hareket',[5,6]],['Kendine',[7,8]],['Nihai',[9]]];
    const root=document.createElement('div');root.className='codex';
    for(const [title,slots] of groups){
      const block=document.createElement('section');block.innerHTML=`<h3>${title}</h3>`;
      const list=document.createElement('div');list.className='shortcut-skill-list';
      for(const slot of slots){
        const skill=SKILLS.find(entry=>entry.slot===slot);
        const row=document.createElement('div');
        const remain=this.skillSystem?.remaining?.(slot)||0;
        row.innerHTML=`<span class="art-icon skill-art" style="background-position:${(slot-1)%3*50}% ${Math.floor((slot-1)/3)*50}%"></span><div><strong>${skill.name}</strong><small>${skill.description}</small><em>${remain>.05?'Beklemede '+remain.toFixed(1)+' sn':'Açık'} · Mana ${skill.mana} · Menzil ${skill.range} m · Hasar ${skill.damage}</em></div><kbd>${slot}</kbd>`;
        list.append(row);
      }
      block.append(list);root.append(block);
    }
    return root;
  }

  #questCodex() {
    const snap=this.progression.snapshot();
    const root=document.createElement('div');root.className='codex';
    const card=(quest,reward,open)=>{
      const node=document.createElement('article');
      const done=Boolean(quest.completed);
      node.className=`quest-card${done?' is-done':''}${open?'':' is-waiting'}`;
      const progress=open?`${quest.progress} / ${quest.goal}`:done?'Tamamlandı':'Henüz açık değil';
      node.innerHTML=`<header><strong>${quest.title}</strong><small>${progress}</small></header><div class="quest-track"><i style="width:${Math.min(100,(quest.progress||0)/quest.goal*100)}%"></i></div><p>${reward}</p>`;
      return node;
    };
    root.append(card(snap.quest,`Ödül · ${snap.quest.rewardXp} XP ve sonraki görev`,snap.quest.accepted||snap.quest.completed));
    root.append(card(snap.secondQuest,'Ödül · Demir Kılıç, 30 altın ve 90 XP',snap.secondQuest.unlocked||snap.secondQuest.completed));
    const note=document.createElement('p');note.className='panel-hint';note.textContent=snap.bossDefeated?'Kül Muhafızı yenildi.':'Kül Muhafızı, diş görevi bitince Kadim Harabe’de bekler.';root.append(note);
    return root;
  }

  #mapCodex() {
    const root=document.createElement('div');root.className='map-codex';
    const frame=document.createElement('div');frame.className='map-frame';
    const canvas=document.createElement('canvas');canvas.width=canvas.height=270;canvas.className='large-minimap';
    const source=document.querySelector('.region-mini');if(source)canvas.getContext('2d').drawImage(source,0,0,270,270);
    frame.append(canvas);
    const tools=document.createElement('div');tools.className='map-tools';
    const zoom=(dir)=>{frame.style.setProperty('--map-zoom',String(Math.min(2.2,Math.max(1,(Number(frame.style.getPropertyValue('--map-zoom'))||1)+dir))));};
    for(const [text,dir,label] of [['−',-.25,'Uzaklaştır'],['+',.25,'Yakınlaştır']]){
      const button=document.createElement('button');button.type='button';button.textContent=text;button.setAttribute('aria-label',label);button.addEventListener('click',()=>zoom(dir));tools.append(button);
    }
    const place=document.createElement('p');
    const region=document.querySelector('.minimap>strong')?.textContent||'Bölge';
    place.textContent=`${region} · konum ${this.player.position.x.toFixed(0)}, ${this.player.position.z.toFixed(0)}. Kapılar mini haritada işaretli.`;
    place.className='panel-hint';
    root.append(tools,frame,place);
    return root;
  }

  #settingsCodex() {
    const root=document.createElement('div');root.className='settings-grid';
    const quality=document.body.dataset.quality||'medium';
    const field=(label,control)=>`<label>${label}${control}</label>`;
    root.innerHTML=[
      field('Grafik',`<select data-setting="quality"><option value="low">Düşük</option><option value="medium">Orta</option><option value="high">Yüksek</option></select>`),
      field('Efekt',`<input data-setting="effects" type="range" min="0" max="1" step="0.05" value="${document.getElementById('volume-effects')?.value||.65}">`),
      field('Müzik',`<input data-setting="music" type="range" min="0" max="1" step="0.05" value="${document.getElementById('volume-music')?.value||.2}">`),
      field('Ortam',`<input data-setting="ambient" type="range" min="0" max="1" step="0.05" value="${document.getElementById('volume-ambient')?.value||.35}">`),
    ].join('')+'<p class="panel-hint">Grafik, efekt, müzik ve ortam aynı kayıtla duraklatma menüsüne bağlı. Kontroller sabit: fare yürür, tekerlek yakınlaştırır, sağ tık kamerayı döndürmez.</p>';
    root.querySelector('[data-setting="quality"]').value=quality;
    root.querySelector('[data-setting="quality"]').addEventListener('change',event=>this.onQuality(event.target.value));
    for(const bus of ['effects','music','ambient']) root.querySelector(`[data-setting="${bus}"]`).addEventListener('input',event=>this.onVolume(bus,Number(event.target.value)));
    return root;
  }

  refreshInventory() {
    this.#renderInventory();
  }

  closePanels() {
    this.openPanel = null;
    if (this.inventoryPanel) this.inventoryPanel.hidden = true;
    if (this.statsPanel) this.statsPanel.hidden = true;
    if(this.shortcutPanel)this.shortcutPanel.hidden=true;
    this.preview.hide();
    this.shortcutButtons.forEach(button=>button.classList.remove('active'));
    for (const panel of [this.inventoryPanel, this.statsPanel, this.shortcutPanel]) {
      if (!panel) continue;
      panel.style.left = "";
      panel.style.top = "";
      panel.style.right = "";
      panel.style.transform = "";
      panel.classList.remove("is-dragging");
    }
    this.#hideDropDialog();
    this.onPanelChange();
  }

  update() {
    const stamp=performance.now(); if(stamp-(this._uiStamp||0)<50)return;this._uiStamp=stamp;
    const p = this.player;
    const progress = this.progression.snapshot();
    const hpPercent=Math.max(0,p.health/p.maxHealth)*100;
    if(this.hpBar.style.width!==`${hpPercent}%`)this.hpBar.style.width=`${hpPercent}%`;
    const lag=document.getElementById('player-hp-lag');if(lag&&lag.style.width!==`${hpPercent}%`)lag.style.width=`${hpPercent}%`;
    if(this.previousHp!=null&&p.health<this.previousHp){const frame=document.querySelector('.player-frame');frame.classList.remove('taking-hit');void frame.offsetWidth;frame.classList.add('taking-hit');}
    else if(this.previousHp!=null&&p.health>this.previousHp){const frame=document.querySelector('.player-frame');frame.classList.remove('healing');void frame.offsetWidth;frame.classList.add('healing');}
    this.previousHp=p.health;
    this.hpText.textContent = `${Math.ceil(p.health)} / ${p.maxHealth}`;
    this.manaBar.style.width = `${Math.max(0, p.mana / p.maxMana) * 100}%`;
    this.manaText.textContent = `${Math.floor(p.mana)} / ${p.maxMana}`;
    this.level.textContent = progress.level;
    this.xpBar.style.width = `${Math.min(100, progress.xp / progress.nextLevelXp * 100)}%`;
    this.xpText.textContent = `${progress.xp} / ${progress.nextLevelXp} XP`;
    if (this.nameEl && this.nameEl.textContent !== p.name) this.nameEl.textContent = p.name;

    this.playerLabel.hidden = true;

    // Chat bubbles stack upward; newest at bottom (closest to head)
    const now = performance.now();
    const dt = Math.min(0.2, (now - this._lastHudTime) / 1000 || 0.016);
    this._lastHudTime = now;
    for (let i = this.chatBubbles.length - 1; i >= 0; i--) {
      const bubble = this.chatBubbles[i];
      bubble.life -= dt;
      if (bubble.life <= 0) {
        bubble.node.remove();
        this.chatBubbles.splice(i, 1);
        continue;
      }
      const stack = this.chatBubbles.length - 1 - i;
      const screen = this.#project(p.position.add(new BABYLON.Vector3(0, 2.25 + stack * 0.38, 0)));
      bubble.node.style.left = `${screen.x}px`;
      bubble.node.style.top = `${screen.y}px`;
      bubble.node.style.opacity = screen.z > 0 && screen.z < 1 ? String(Math.min(1, bubble.life)) : "0";
    }

    const questText = this.#questText(progress);
    this.quest.textContent = questText;
    document.getElementById("status-message").hidden=performance.now()>=this.statusUntil;
    const objective=progress.quest.completed&&!progress.secondQuest.completed?progress.secondQuest:progress.quest;document.getElementById("quest-progress").style.width=Math.min(100,objective.progress/objective.goal*100)+"%";
    document.getElementById("quest-reward").textContent=progress.bossDefeated?"Diyarın yolları yeniden açık":progress.secondQuest.completed?"Ödül · Muhafız ganimeti":progress.quest.completed?"Ödül · Demir Kılıç, 30 altın ve 90 XP":"Ödül · 70 XP ve yeni görev";
    this.questPanel.classList.toggle("is-complete", progress.quest.completed && (!progress.secondQuest.unlocked || progress.secondQuest.completed));
    this.targetFrame.update(this.entities.selected);
    this.skillBar.update(this.skillSystem, p, this.entities.selected);
    this.fps.textContent = `${this.engine.getFps().toFixed(0)} FPS`;
    this.#updateBuffs();
    this.preview.update(stamp);
    this.#minimapPosition(this.minimapPlayer, p.position, p.rotation, true);
    for (const mob of this.entities.mobs) {
      const node = this.labels.get(mob.id);
      const dot = this.minimapDots?.get(mob.id)||this.minimapMobs.querySelector(`[data-entity-id="${mob.id}"]`);
      node.hidden = !mob.alive;
      dot.hidden = !mob.alive;
      if (!mob.alive) continue;
      this.#minimapPosition(dot, mob.position, 0, false);
      const labelY = mob._labelHeight || (mob._labelHeight=this.#mobLabelHeight(mob));
      const screen = this.#project(mob.position.add(new BABYLON.Vector3(0, labelY, 0)));
      const dist = BABYLON.Vector3.Distance(p.position, mob.position);
      const engaged = mob.aggro || this.entities.selected === mob || p.targetId === mob.id;
      const visible = screen.z > 0 && screen.z < 1 && Number.isFinite(mob.position.x) && (engaged || dist < 7);
      node.hidden = !visible;
      if (!visible) continue;
      node.style.left = `${screen.x}px`;
      node.style.top = `${screen.y}px`;
      node.style.opacity = "1";
      node.style.transform = "translate(-50%,-100%)";
      node.classList.toggle("selected", this.entities.selected === mob);
      node.querySelector("i").style.width = `${mob.health / mob.maxHealth * 100}%`;
    }
    if (this.openPanel === "stats" && this.statPoints) {
      this.statPoints.textContent = String(this.stats.unspent);
    }
  }

  dispose() {
    clearTimeout(this.toastTimer);
    this.chatForm.removeEventListener("submit", this.onChatSubmit);
    removeEventListener("keydown", this.onGlobalKeyDown);
    this.root.removeEventListener("click", this.onPanelClick);
    this.inventoryGrid?.removeEventListener("dragstart", this.onDragStart);
    this.inventoryGrid?.removeEventListener("dragend", this.onDragEnd);
    this.inventoryPanel?.removeEventListener("dragover", this.onDragOver);
    this.inventoryPanel?.removeEventListener("drop", this.onDrop);
    document.removeEventListener("dragover", this.onDocDragOver);
    document.removeEventListener("drop", this.onDocDrop);
    this.dropYes?.removeEventListener("click", this.onDropYes);
    this.dropNo?.removeEventListener("click", this.onDropNo);
    this.root.removeEventListener("pointerdown", this.onPanelDragDown);
    window.removeEventListener("pointermove", this.onPanelDragMove);
    window.removeEventListener("pointerup", this.onPanelDragUp);
    this.minimapZoomIn?.removeEventListener('click',this.onMinimapZoom);
    this.minimapZoomOut?.removeEventListener('click',this.onMinimapZoom);
    this.preview.dispose();
    this.skillBar.dispose();
    for (const node of this.labels.values()) node.remove();
    for (const node of this.damagePool) node.remove();
    this.playerLabel?.remove();
    this.bubbleLayer?.remove();
    this.minimapMobs.replaceChildren();
    this.labels.clear();
    this.chatBubbles = [];
    this.root.hidden = true;
  }

  #askDrop(index) {
    this.pendingDropIndex = index;
    const item = this.inventory.slots[index] ? ITEM_DEFS[this.inventory.slots[index]] : null;
    if (!item || !this.dropDialog) return;
    const label = this.dropDialog.querySelector("[data-drop-name]");
    if (label) label.textContent = item.name;
    this.dropDialog.hidden = false;
  }

  #hideDropDialog() {
    this.pendingDropIndex = -1;
    if (this.dropDialog) this.dropDialog.hidden = true;
  }

  #questText(progress) {
    const q = progress.quest;
    if(!q.accepted)return 'Demirci Ayame ile konuş · Köy meydanı';
    if(progress.bossDefeated)return 'Kül Muhafızı yenildi · Diyar kurtarıldı';
    const s = progress.secondQuest;
    if (!q.completed) return `Yaratıkları yen: ${q.progress} / ${q.goal}`;
    if (s?.unlocked && !s.completed) return `Kurt Dişi topla: ${s.progress} / ${s.goal}`;
    if (s?.completed) return 'Kül Muhafızı’nı yen · Kadim Harabe';
    return `Tamamlandı • +${q.rewardXp} XP`;
  }

  #mobLabelHeight(mob) {
    try {
      const meshes = mob.root?.getChildMeshes?.(false) || [];
      let maxY = null;
      for (const mesh of meshes) {
        mesh.computeWorldMatrix?.(true);
        const bi = mesh.getBoundingInfo?.();
        const y = bi?.boundingBox?.maximumWorld?.y;
        if (Number.isFinite(y)) maxY = maxY == null ? y : Math.max(maxY, y);
      }
      if (maxY != null && Number.isFinite(mob.position?.y)) {
        return Math.max(1.2, Math.min(2.8, maxY - mob.position.y + 0.18));
      }
    } catch (_) { /* fallback */ }
    return 1.75 * (mob.root?.scaling?.y || 1);
  }

  #updateBuffs() {
    if (!this.buffBar) return;
    const defs=[['guard','Savaşçı Savunması','Alınan hasarı azaltır.','assets/vfx/wind.webp'],['rage','Öfke','Saldırı ve hareket hızını artırır.','assets/vfx/rage.webp']];
    for(const [type,name,description,image] of defs){
      let node=this.buffBar.querySelector(`[data-buff="${type}"]`);
      const seconds=Number(this.player.buffs?.[type]||0);
      if(seconds<=0){node?.remove();continue;}
      if(!node){node=document.createElement('span');node.className=`buff ${type}`;node.dataset.buff=type;node.innerHTML=`<span class="buff-icon" style="background-image:url('${image}')"></span><i class="buff-cooldown"></i><b class="buff-seconds"></b><span class="buff-tooltip"><strong>${name}</strong><small>${description}</small><em></em></span>`;this.buffBar.append(node);}
      node.querySelector('.buff-seconds').textContent=seconds.toFixed(1);
      node.querySelector('.buff-cooldown').style.setProperty('--buff-angle',`${Math.min(1,seconds/(type==='guard'?6:8))*360}deg`);
      node.querySelector('.buff-tooltip em').textContent=`Kalan süre: ${seconds.toFixed(1)} sn`;
    }
    this.buffBar.hidden=!this.buffBar.children.length;
  }

  #renderInventory() {
    if (!this.inventoryGrid) return;
    const snap = this.inventory.snapshot();
    this.inventoryGrid.replaceChildren();
    snap.slots.forEach((item, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.draggable = Boolean(item);
      const equipped = item && (snap.equipped.weapon === item.id || snap.equipped.armor === item.id);
      button.className = `inv-slot${item ? "" : " empty"}${snap.selected === index ? " selected" : ""}${equipped ? " equipped" : ""}${item ? ` rarity-${item.rarity || "common"}` : ""}`;
      button.dataset.invSlot = String(index);
      if (item) {
        const bonus = bonusText(item);
        button.innerHTML = `${itemArt(item.id)}<span class="inv-name">${item.name}</span><span class="item-tooltip"><strong>${item.name}</strong><small>${item.rarity === "uncommon" ? "Nadir" : "Sıradan"} · ${item.type}</small><em>${bonus}</em><b>${equipped ? "Kuşanılmış" : "Çift tıkla kullan"}</b></span>`;
        button.title = `${item.name}\n${item.description}`;
      } else {
        button.innerHTML = `<span class="inv-empty" aria-hidden="true"></span>`;
        button.title = "Boş";
      }
      this.inventoryGrid.append(button);
    });
    const selected = snap.selected >= 0 ? snap.slots[snap.selected] : null;
    this.inventoryHint.textContent = selected
      ? `${selected.name} — sürükle taşı / dışarı bırakınca at`
      : "Eşyayı sürükle; dışarı bırakınca yere at.";
    if (this.equipSummary) {
      const slotHtml = (key, label) => {
        const id = snap.equipped[key];
        return `<button type="button" data-equip-slot="${key}">${id ? itemArt(id) : ""}<small>${label}<strong>${itemName(id)}</strong></small></button>`;
      };
      this.equipSummary.innerHTML = slotHtml("weapon", "Silah") + slotHtml("armor", "Zırh");
    }
    const compare = document.getElementById("gear-compare");
    if (compare) {
      const wornId = selected?.slot ? snap.equipped[selected.slot] : null;
      const worn = wornId ? ITEM_DEFS[wornId] : null;
      if (selected?.bonuses && worn && worn.id !== selected.id) {
        compare.hidden = false;
        compare.innerHTML = `<div><small>Kuşanılan</small><strong>${worn.name}</strong><span>${bonusText(worn)}</span></div><div><small>Seçilen</small><strong>${selected.name}</strong><span>${bonusText(selected)}</span></div>`;
      } else compare.hidden = true;
    }
    const gold=document.getElementById('inventory-gold');if(gold)gold.textContent=`${snap.gold??this.inventory.gold} ALTIN`;
    document.querySelectorAll('[data-character-name]').forEach(node=>node.textContent=this.player.name);
    document.querySelectorAll('[data-character-level]').forEach(node=>node.textContent=this.progression.snapshot().level);
    if (this.useItemButton) this.useItemButton.disabled = snap.selected < 0;
  }

  #renderStats() {
    if (!this.statsList) return;
    const snap = this.stats.snapshot();
    this.statPoints.textContent = String(snap.unspent);
    this.statsList.replaceChildren();
    for (const def of snap.defs) {
      const row = document.createElement("li");
      const gear = snap.gearBonus[def.id] || 0;
      row.innerHTML = `
        <div><strong>${def.label}</strong><small>${def.description}${gear ? ` · ekipman +${gear}` : ""}</small></div>
        <b>${snap.total[def.id]}</b>
        <button type="button" data-stat-id="${def.id}" ${snap.unspent <= 0 ? "disabled" : ""}>+</button>
      `;
      this.statsList.append(row);
    }
    this.statsSummary.textContent = `Hasar bonus: +${snap.damageBonus.toFixed(0)} • Kritik: %${(snap.critChance * 100).toFixed(0)} • ${snap.unspent} puan`;
    const readout = document.getElementById("combat-readout");
    if (readout) {
      readout.innerHTML = `<span><small>Can</small><b>${this.player.maxHealth}</b></span><span><small>Mana</small><b>${this.player.maxMana}</b></span><span><small>Hasar</small><b>+${snap.damageBonus.toFixed(0)}</b></span><span><small>Kritik</small><b>%${(snap.critChance * 100).toFixed(0)}</b></span>`;
    }
  }

  #minimapPosition(node, position, rotation, isPlayer) {
    const x = (position.x + 25) / 50 * 100;
    const y = (25 - position.z) / 50 * 100;
    node.style.left = `${BABYLON.Scalar.Clamp(x, 3, 97)}%`;
    node.style.top = `${BABYLON.Scalar.Clamp(y, 3, 97)}%`;
    if (isPlayer) node.style.transform = `translate(-50%,-50%) rotate(${rotation}rad)`;
  }

  #labelFor(mob) {
    const node = document.createElement("div");
    node.className = "mob-label";
    node.innerHTML = `<strong>${mob.name}</strong><small>Seviye ${mob.level}</small><div class="bar"><i></i></div>`;
    this.labelLayer.append(node);
    this.labels.set(mob.id, node);
  }

  #createDamagePool() {
    return Array.from({ length: 18 }, () => {
      const node = document.createElement("span");
      node.className = "damage-number";
      node.hidden = true;
      this.damageLayer.append(node);
      return node;
    });
  }

  #project(position) {
    const cam = this.scene.activeCamera;
    if (!cam) return { x: 0, y: 0, z: -1 };
    const width = this.engine.getRenderWidth();
    const height = this.engine.getRenderHeight();
    const viewport = cam.viewport.toGlobal(width, height);
    const projected = BABYLON.Vector3.Project(position, BABYLON.Matrix.IdentityReadOnly, this.scene.getTransformMatrix(), viewport);
    const rect = this.engine.getRenderingCanvas().getBoundingClientRect();
    return {
      x: projected.x / width * rect.width + rect.left,
      y: projected.y / height * rect.height + rect.top,
      z: projected.z,
    };
  }
}
