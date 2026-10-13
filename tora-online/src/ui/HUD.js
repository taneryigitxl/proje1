import { PanelManager } from './PanelManager.js';
import { PlayerFrame } from './PlayerFrame.js';
import { StatusBar } from './StatusBar.js';
import { ItemTooltip } from './ItemTooltip.js';
import { StatsSheet } from './StatsSheet.js';
import { ChatPanel } from './ChatPanel.js';
import { EQUIPMENT_SLOTS, RARITIES } from '../progression/EquipmentSchema.js';
import { itemArt } from "./Art.js";
import { SkillBar } from "./SkillBar.js";
import { TargetFrame } from "./TargetFrame.js";
import { ITEM_DEFS } from "../progression/InventorySystem.js";
import { classDef } from '../characters/ClassDefs.js';
import { WorldMap } from './WorldMap.js';
import { QuickItemBar } from './QuickItemBar.js';
import { CharacterPreview } from "./CharacterPreview.js";
import { placeAnchor } from "./screenAnchor.js";

const SHORTCUTS = [
  ['stats','Karakter','C','M16 7.5a4 4 0 1 1-8 0 4 4 0 0 1 8 0M5 20v-1.5a7 7 0 0 1 14 0V20'],
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
    this.onCue=options.onCue||(()=>{});this.network=options.network;this.scene = scene;this.classDef=classDef(player.classId);this.isBlocked=options.isBlocked||(()=>false);this.quickItems=options.quickItems;
    this.engine = engine;
    this.player = player;
    this.entities = entities;
    this.progression = progression;
    this.stats = stats;
    this.inventory = inventory;
    this.map = options.map;
    this.loot = options.loot || null;
    this.lootDots = new Map();
    this.onSettings = options.onSettings || (()=>{});
    this.onQuality = options.onQuality || (()=>{});
    this.onVolume = options.onVolume || (()=>{});
    this.onDropItem = options.onDropItem || null;
    this.onPanelChange = options.onPanelChange || (()=>{});
    this.root = document.getElementById('hud');this.root.style.setProperty('--skill-atlas','url('+new URL(this.classDef.iconAtlas,document.baseURI).href+')');
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
    this.questTitle=document.getElementById('quest-title');this.questProgress=document.getElementById('quest-progress');this.questReward=document.getElementById('quest-reward');this.questCollapse=document.getElementById('quest-collapse');
    this.questCollapsed=localStorage.getItem('tora.quest.collapsed')==='1';this.questPanel.classList.toggle('collapsed',this.questCollapsed);this.questCollapse.setAttribute('aria-expanded',String(!this.questCollapsed));
    this.onQuestCollapse=()=>{this.questCollapsed=!this.questCollapsed;localStorage.setItem('tora.quest.collapsed',this.questCollapsed?'1':'0');this.questPanel.classList.toggle('collapsed',this.questCollapsed);this.questCollapse.setAttribute('aria-expanded',String(!this.questCollapsed));};this.questCollapse.addEventListener('click',this.onQuestCollapse);
    this.statusMessage = "";
    this.statusNode=document.getElementById('status-message');
    this.statusUntil = 0;
    this.toast = document.getElementById("progress-toast");
    this.toastTimer = 0;
    this.targetFrame = new TargetFrame(document.getElementById("target-frame"));
    this.skillBar = new SkillBar(document.getElementById("skill-bar"), onSkill,this.classDef);
    this.skillSystem = skillSystem;
    this.quickBar=new QuickItemBar(document.getElementById('quick-item-bar'),this.quickItems,options.onQuickItem);
    this.labelLayer = document.getElementById("world-labels");
    this.damageLayer = document.getElementById("damage-layer");
    this.labels = new Map();
    this.damagePool = this.#createDamagePool();
    this.damageCursor = 0;
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
    for (const [id, label, key, path] of SHORTCUTS) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "shortcut-button";
      button.dataset.shortcut = id;
      button.setAttribute("aria-label", `${label} · ${key}`);
      button.innerHTML = `<svg class="shortcut-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${path}"/></svg><span class="shortcut-tip">${label}<small>${key}</small></span><i class="shortcut-badge" hidden></i>`;
      this.shortcutBar.append(button);
      this.shortcutButtons.set(id, button);
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
    this.panelManager=new PanelManager({blocked:this.isBlocked,onChange:id=>{this.shortcutButtons.forEach((button,key)=>button.classList.toggle('active',key===id));this.onPanelChange();if(id)this.onCue('panel');}});
    for(const [id]of SHORTCUTS)this.panelManager.register(id,{element:id==='inventory'?this.inventoryPanel:id==='stats'?this.statsPanel:this.shortcutPanel,onOpen:()=>{if(id==='inventory'){this.#renderInventory();this.preview.attach(document.getElementById('inventory-preview-host'));}else if(id==='stats'){this.#renderStats();this.preview.attach(document.getElementById('stats-preview-host'));}else{this.shortcutPanel.classList.toggle('world-map-panel',id==='map');this.#renderShortcutPanel(id);}},onClose:()=>{this.preview.hide();this.itemTooltip?.hide();for(const panel of [this.inventoryPanel,this.statsPanel,this.shortcutPanel]){panel.style.left=panel.style.top=panel.style.right=panel.style.transform='';panel.classList.remove('is-dragging');}}});
    this.playerFrame=new PlayerFrame(player,progression,this.classDef);this.statusBar=new StatusBar(this.buffBar,player,this.classDef);this.sheet=new StatsSheet(this.statsList,stats,player,this.classDef);this.itemTooltip=new ItemTooltip(this.root,inventory,player);
    this.identityFields={names:[...this.root.querySelectorAll('[data-character-name]')],classes:[...this.root.querySelectorAll('[data-character-class]')],levels:[...this.root.querySelectorAll('[data-character-level]')]};
    this.chatBubbles = [];
    this.pendingDropIndex = -1;
    this.dragFrom = -1;
    this._lastHudTime = performance.now();

    this.playerLabel = document.createElement("div");
    this.playerLabel.className = "player-label";
    this.playerLabel.hidden = true;
    this.playerLabel.innerHTML = `<small class="player-label-level">Lv.1</small><strong class="player-label-name">—</strong>`;
    this.labelLayer.append(this.playerLabel);this.playerLabelLevel=this.playerLabel.querySelector('.player-label-level');

    this.bubbleLayer = document.createElement("div");
    this.bubbleLayer.className = "chat-bubbles";
    this.labelLayer.append(this.bubbleLayer);

    for(const mob of entities.mobs)this.#labelFor(mob);
    this.chat=new ChatPanel(document.querySelector('.chat-panel'),this.chatLog,this.chatInput,this.network,this.onPanelChange,message=>this.#pushBubble(message));this.chat.add('Sistem',this.map.definition.name+' · Yerel oturum');
    this.onChatSubmit = (event) => {
      event.preventDefault();
      const message = this.chatInput.value.trim();
      if (message) this.chat.send(message);
      this.chatInput.value = "";
      this.chatInput.blur();
    };
    this.onGlobalKeyDown = (event) => {
      if(this.isBlocked()||event.target.closest?.('input,textarea,select,[contenteditable="true"]'))return;
      if (event.code === "Enter" && document.activeElement !== this.chatInput) {
        event.preventDefault();
        if(this.chat.channel==='system')this.chat.select('general');this.chatInput.focus();
      }
    };
    this.onPanelClick = (event) => {
      if(this.isBlocked())return;
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
      event.dataTransfer.setData("application/x-tora-inventory", String(this.dragFrom));
      event.dataTransfer.effectAllowed = "copyMove";
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
      if(event.dataTransfer.getData('application/x-tora-quick')!=='')return;
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
      if (event.target.closest?.("#inventory-panel,#quick-item-bar")) return;
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
    this.worldMap=new WorldMap(this.map,this.player,this.entities,this.progression,this.loot);
    this.#renderInventory();
    this.#renderStats();
    this.refreshMinimapSites();
    this.applyIdentity({ username: player.name, isAdmin: player.isAdmin });
  }

  syncEntities(){for(const node of this.labels.values())node.remove();this.labels.clear();for(const mob of this.entities.mobs)this.#labelFor(mob);this.refreshMinimapSites();}
  refreshMinimapSites(){this.worldMap?.refresh();}
  applyIdentity(identity) {
    const name = identity?.username || this.player.name || "Oyuncu";
    this.player.name = name;
    this.player.isAdmin = Boolean(identity?.isAdmin);
    if (this.nameEl) this.nameEl.textContent = name;
    if (this.portrait) { this.portrait.className = 'portrait class-portrait';this.portrait.style.backgroundImage='url('+this.classDef.portrait+')';this.portrait.replaceChildren(this.level);document.querySelector('.player-class').textContent=this.classDef.label.toLocaleUpperCase('tr'); }
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
    this.statusNode.textContent=message;this.statusNode.hidden=false;
  }

  addChat(author,message,options){this.chat.add(author,message,options);}

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
    const point = entity.position.add(new BABYLON.Vector3(0, 2.55, 0));
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
    if(result.levelsGained)this.playerFrame.feedback('level',800);if(result.questCompleted)this.setBadge('quests','!');this.#renderStats();
  }

  get openPanel(){return this.panelManager?.active||null;}
  setBadge(id,value){const node=this.shortcutButtons.get(id)?.querySelector('.shortcut-badge');if(!node)return;node.hidden=value===null||value===undefined||value===0||value==='';node.textContent=node.hidden?'':String(value);}
  warnMana(){this.playerFrame.warnMana();}
  togglePanel(name,force){this.panelManager.toggle(name,force);}

  #renderShortcutPanel(name) {
    const label=SHORTCUTS.find(entry=>entry[0]===name)?.[1]||'Menü';
    this.shortcutTitle.textContent=label.toLocaleUpperCase('tr');
    this.shortcutContent.replaceChildren();
    if(name==='skills') this.shortcutContent.append(this.#skillCodex());
    else if(name==='quests') this.shortcutContent.append(this.#questCodex());
    else if(name==='map') this.shortcutContent.append(this.#mapCodex());
    else if(name==='settings') this.shortcutContent.append(this.#settingsCodex());
    else this.shortcutContent.append(this.#socialPanel(name));
  }

  #socialPanel(name){
    const root=document.createElement('div');root.className='social-shell';
    const title=document.createElement('strong');title.textContent=name==='friends'?'Arkadaşlar':name==='guild'?'Lonca':'Grup';root.append(title);
    if(name==='friends'){
      const tabs=document.createElement('nav');tabs.className='social-tabs';const content=document.createElement('div');content.className='social-empty';
      for(const [id,label,message]of [['list','Arkadaşlar','Bu yerel oturumda arkadaş kaydı bulunmuyor.'],['requests','İstekler','Bekleyen arkadaşlık isteği yok.'],['blocked','Engellenenler','Engellenen oyuncu yok.']]){const button=document.createElement('button');button.type='button';button.textContent=label;button.dataset.socialTab=id;button.addEventListener('click',()=>{for(const item of tabs.children)item.classList.toggle('active',item===button);content.textContent=message;});tabs.append(button);}root.append(tabs,content);tabs.firstElementChild.click();
    }else{
      const card=document.createElement('div');card.className='social-empty';card.textContent=name==='guild'?'Henüz bir loncaya bağlı değilsin. Lonca üyeliği çevrimiçi hesap ve sunucu bağlantısıyla açılacak.':'Şu anda bir grupta değilsin. Grup davetleri çevrimiçi bağlantıyla açılacak.';root.append(card);
    }
    const button=document.createElement('button');button.type='button';button.disabled=true;button.textContent=name==='friends'?'Arkadaş ekle':name==='guild'?'Lonca oluştur':'Gruba davet et';button.title='Çevrimiçi hesap ve sunucu bağlantısı gerektirir.';root.append(button);return root;
  }

  #skillCodex() {
    const groups=[['Temel',[1]],['Kombo ve alan',[2,3,4]],['Hareket',[5,6]],['Kendine',[7,8]],['Nihai',[9]]];
    const root=document.createElement('div');root.className='codex';
    for(const [title,slots] of groups){
      const block=document.createElement('section');block.innerHTML=`<h3>${title}</h3>`;
      const list=document.createElement('div');list.className='shortcut-skill-list';
      for(const slot of slots){
        const skill=this.skillSystem.get(slot);
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
    root.append(card(snap.secondQuest,'Ödül · '+itemName(this.classDef.rewardWeapon)+', 30 altın ve 90 XP',snap.secondQuest.unlocked||snap.secondQuest.completed));
    const note=document.createElement('p');note.className='panel-hint';note.textContent=snap.bossDefeated?'Kül Muhafızı yenildi.':'Kül Muhafızı, diş görevi bitince Kadim Harabe’de bekler.';root.append(note);
    return root;
  }

  #mapCodex(){return this.worldMap.largeView();}

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

  closePanels(){this.panelManager.close();this.preview.hide();this.itemTooltip.hide();this.#hideDropDialog();this.onPanelChange();}

  update() {
    const stamp = performance.now();
    const dt = Math.min(0.05, (stamp - (this._labelTime || stamp)) / 1000 || 0.016);
    this._labelTime = stamp;this.playerFrame.update(dt,stamp);this.worldMap.update(stamp);this.quickBar.update(stamp);this.chat.update(stamp);
    this.#placeMobLabels(dt);
    const playerScreen = this.#project(this.player.position.add(new BABYLON.Vector3(0, 1.95, 0)));
    this.playerLabel.hidden = !this.#onScreen(playerScreen);
    if (!this.playerLabel.hidden) placeAnchor(this.playerLabel, playerScreen.x, playerScreen.y, dt);
    else this.playerLabel._screen = null;
    if(this.playerLabelLevel.textContent!=='Lv.'+this.player.level)this.playerLabelLevel.textContent='Lv.'+this.player.level;
    // Visual anchors stay at render cadence, independently of slower HUD text.
    for (let i = 0; i < this.chatBubbles.length; i++) {
      const bubble = this.chatBubbles[i], stack = this.chatBubbles.length - 1 - i;
      const screen = this.#project(this.player.position.add(new BABYLON.Vector3(0, 2.4 + stack * .38, 0)));
      placeAnchor(bubble.node, screen.x, screen.y, dt);
      bubble.node.style.opacity = this.#onScreen(screen) ? String(Math.min(1, bubble.life)) : '0';
    }
    this.preview?.update?.(stamp);
    if (stamp - (this._uiStamp || 0) < 50) return;
    this._uiStamp = stamp;if(this.openPanel==='stats')this.sheet.update();
    const p = this.player;
    const progress = this.progression.snapshot();
    if(this.nameEl.textContent!==p.name)this.nameEl.textContent=p.name;
    if(this.lastIdentityLevel!==p.level){this.lastIdentityLevel=p.level;for(const node of this.identityFields.levels)node.textContent=p.level;for(const node of this.identityFields.names)node.textContent=p.name;for(const node of this.identityFields.classes)node.textContent=this.classDef.label;}



    // Chat bubbles stack upward; newest at bottom (closest to head)
    const now = performance.now();
    const bubbleDt = Math.min(0.2, (now - this._lastHudTime) / 1000 || 0.016);
    this._lastHudTime = now;
    for (let i = this.chatBubbles.length - 1; i >= 0; i--) {
      const bubble = this.chatBubbles[i];
      bubble.life -= bubbleDt;
      if (bubble.life <= 0) {
        bubble.node.remove();
        this.chatBubbles.splice(i, 1);
        continue;
      }
    }

    const questText = this.#questText(progress);
    if(this.quest.textContent!==questText)this.quest.textContent=questText;
    this.statusNode.hidden=performance.now()>=this.statusUntil;
    const objective=progress.quest.completed&&!progress.secondQuest.completed?progress.secondQuest:progress.quest;
    const title=progress.bossDefeated?'Kadim Yol':objective.title;if(this.questTitle.textContent!==title)this.questTitle.textContent=title;
    const percentage=Math.min(100,(objective.progress||0)/Math.max(1,objective.goal)*100)+'%';if(this.questProgress.style.width!==percentage)this.questProgress.style.width=percentage;
    const reward=progress.bossDefeated?"Diyarın yolları yeniden açık":progress.secondQuest.completed?"Ödül · Muhafız ganimeti":progress.quest.completed?"Ödül · "+itemName(this.classDef.rewardWeapon)+", 30 altın ve 90 XP":"Ödül · 70 XP ve yeni görev";if(this.questReward.textContent!==reward)this.questReward.textContent=reward;
    this.questPanel.classList.toggle("is-complete", progress.quest.completed && (!progress.secondQuest.unlocked || progress.secondQuest.completed));
    this.targetFrame.update(this.entities.selected);
    this.skillBar.update(this.skillSystem, p, this.entities.selected);
    this.fps.textContent = `${this.engine.getFps().toFixed(0)} FPS`;
    this.#updateBuffs();
    if (this.openPanel === "stats" && this.statPoints) {
      this.statPoints.textContent = String(this.stats.unspent);
    }
  }

  dispose() {
    this.questCollapse.removeEventListener('click',this.onQuestCollapse);
    clearTimeout(this.toastTimer);this.panelManager.dispose();this.statusBar.dispose();this.itemTooltip.dispose();this.chat.dispose();
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
    this.shortcutBar.replaceChildren();this.shortcutButtons.clear();this.worldMap.dispose();this.quickBar.dispose();
    this.preview.dispose();
    this.skillBar.dispose();
    for (const node of this.labels.values()) node.remove();
    for (const node of this.damagePool) node.remove();
    this.playerLabel?.remove();
    this.bubbleLayer?.remove();

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

  #placeMobLabels(dt) {
    const player = this.player;
    this._projectStamp = null;
    for (const mob of this.entities.mobs) {
      const node = this.labels.get(mob.id);
      if (!node) continue;
      if (!mob.alive) {
        node.hidden = true;
        node._screen = null;
        continue;
      }
      const distanceSquared=BABYLON.Vector3.DistanceSquared(player.position,mob.position);
      const engaged=mob.aggro||this.entities.selected===mob||player.targetId===mob.id;
      if(distanceSquared>(engaged?28:18)**2){node.hidden=true;node._screen=null;continue;}
      const labelY = 1.85 * Math.max(0.85, Math.min(1.8, mob.root?.scaling?.y || 1));
      const screen = this.#project(mob.position.add(new BABYLON.Vector3(0, labelY, 0)));
      const visible = this.#onScreen(screen);
      node.hidden = !visible;
      if (!visible) {
        node._screen = null;
        continue;
      }
      placeAnchor(node, screen.x, screen.y, dt);
      node.classList.toggle("selected", this.entities.selected === mob);
      const width=`${(mob.health / mob.maxHealth * 100).toFixed(1)}%`;if(node._bar.style.width!==width)node._bar.style.width=width;
    }
  }

  #updateBuffs(){this.statusBar.update();}

  #renderInventory(){
    const snap=this.inventory.snapshot(),signature=JSON.stringify([this.inventory.slots,snap.equipped,snap.selected,this.inventory.gold]);if(signature===this.inventorySignature)return;this.inventorySignature=signature;
    this.inventoryGrid.replaceChildren();snap.slots.forEach((item,index)=>{const button=document.createElement('button');button.type='button';button.draggable=Boolean(item);button.dataset.invSlot=String(index);const equipped=item&&Object.values(snap.equipped).includes(item.id);button.className='inv-slot'+(item?'':' empty')+(snap.selected===index?' selected':'')+(equipped?' equipped':'')+(item?' rarity-'+item.rarity:'');if(item){button.dataset.itemId=item.id;button.style.setProperty('--item-rarity',(RARITIES[item.rarity]||RARITIES.common).color);button.innerHTML=itemArt(item.id)+'<span class="inv-name">'+item.name+'</span>'+(equipped?'<span class="equipped-pip" aria-label="Kuşanılmış">◆</span>':'');button.setAttribute('aria-label',item.name);}else{button.innerHTML='<span class="inv-empty" aria-hidden="true"></span>';button.setAttribute('aria-label','Boş yuva');}this.inventoryGrid.append(button);});
    this.equipSummary.replaceChildren();for(const def of EQUIPMENT_SLOTS){const id=snap.equipped[def.id],button=document.createElement('button');button.type='button';button.className='equipment-slot'+(def.active?'':' locked');button.dataset.equipSlot=def.id;button.disabled=!def.active;button.setAttribute('aria-label',def.label+(def.active?'':' · etkin değil'));if(id)button.dataset.itemId=id;button.innerHTML=(id?itemArt(id):'<span class="equipment-silhouette" data-icon="'+def.icon+'" aria-hidden="true">'+({sword:'⚔',shield:'◇',helmet:'⌒',armor:'♜',hand:'✧',boots:'⌟',necklace:'♧',ring:'○',cape:'▽'})[def.icon]+'</span>')+'<small>'+def.label+'</small>';this.equipSummary.append(button);}
    const selected=snap.slots[snap.selected];this.inventoryHint.textContent=selected?selected.name+' · Çift tıkla kullan / kuşan':'Eşyayı sürükle; QWER üzerine bırakınca hızlı yuvaya atanır.';this.useItemButton.disabled=!selected;document.getElementById('inventory-gold').textContent=this.inventory.gold+' ALTIN';document.getElementById('gear-compare').hidden=true;
    this.preview.syncEquipment?.();
  }

  #renderStats(){this.sheet.update();this.statPoints.textContent=String(this.stats.unspent);this.statsSummary.textContent='Stat puanlarını + düğmeleri ile dağıt.';}

  #labelFor(mob) {
    const node = document.createElement("div");
    node.className = "mob-label";
    node.innerHTML = `<strong>${mob.name}</strong><small>Seviye ${mob.level}</small><div class="bar"><i></i></div>`;node._bar=node.querySelector('i');node.classList.toggle('is-elite',!!mob.definition.elite);node.classList.toggle('is-boss',!!mob.definition.boss);
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
    if (this._projectStamp !== this._labelTime) {
      this._projectStamp = this._labelTime;
      const canvas = this.engine.getRenderingCanvas();
      this._rect = { left: canvas.offsetLeft, top: canvas.offsetTop, width: canvas.clientWidth, height: canvas.clientHeight };
      this._rw = this.engine.getRenderWidth();
      this._rh = this.engine.getRenderHeight();
      this._vp = cam.viewport.toGlobal(this._rw, this._rh);
      this._tm = this.scene.getTransformMatrix();
    }
    const projected = BABYLON.Vector3.Project(position, BABYLON.Matrix.IdentityReadOnly, this._tm, this._vp);
    const rect = this._rect;
    return {
      x: projected.x / this._rw * rect.width + rect.left,
      y: projected.y / this._rh * rect.height + rect.top,
      z: projected.z,
    };
  }

  #onScreen(p) { return p.z > 0 && p.z < 1 && Number.isFinite(p.x) && p.x > -40 && p.x < this._rect.width + 40 && p.y > -40 && p.y < this._rect.height + 40; }
}
