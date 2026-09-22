import { SkillBar } from "./SkillBar.js?v=9";
import { TargetFrame } from "./TargetFrame.js?v=9";
import { ITEM_DEFS } from "../progression/InventorySystem.js?v=9";

function itemName(id) {
  return ITEM_DEFS[id]?.name || id || "—";
}

export class HUD {
  constructor(scene, engine, player, entities, skillSystem, progression, onSkill, stats, inventory) {
    this.scene = scene;
    this.engine = engine;
    this.player = player;
    this.entities = entities;
    this.progression = progression;
    this.stats = stats;
    this.inventory = inventory;
    this.root = document.getElementById("hud");
    this.hpBar = document.getElementById("player-hp-bar");
    this.hpText = document.getElementById("player-hp-text");
    this.manaBar = document.getElementById("player-mana-bar");
    this.manaText = document.getElementById("player-mana-text");
    this.level = document.getElementById("player-level");
    this.xpBar = document.getElementById("player-xp-bar");
    this.xpText = document.getElementById("player-xp-text");
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
    this.chatLog = document.getElementById("chat-log");
    this.chatForm = document.getElementById("chat-form");
    this.chatInput = document.getElementById("chat-input");
    this.inventoryPanel = document.getElementById("inventory-panel");
    this.statsPanel = document.getElementById("stats-panel");
    this.inventoryGrid = document.getElementById("inventory-grid");
    this.inventoryHint = document.getElementById("inventory-hint");
    this.statsList = document.getElementById("stats-list");
    this.statPoints = document.getElementById("stat-points");
    this.statsSummary = document.getElementById("stats-summary");
    this.buffBar = document.getElementById("buff-bar");
    this.equipSummary = document.getElementById("equip-summary");
    this.useItemButton = document.getElementById("inventory-use");
    this.openPanel = null;

    for (const mob of entities.mobs) {
      this.#labelFor(mob);
      const dot = document.createElement("i");
      dot.dataset.entityId = mob.id;
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
      const close = event.target.closest("[data-close]");
      if (close) {
        this.togglePanel(close.dataset.close, false);
        return;
      }
      const slot = event.target.closest("[data-inv-slot]");
      if (slot) {
        const index = Number(slot.dataset.invSlot);
        if (event.detail === 2) {
          this.inventory.select(index);
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

    this.chatForm.addEventListener("submit", this.onChatSubmit);
    addEventListener("keydown", this.onGlobalKeyDown);
    this.root.addEventListener("click", this.onPanelClick);
    this.#renderInventory();
    this.#renderStats();
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
    this.quest.textContent = message;
  }

  addChat(author, message) {
    const line = document.createElement("p");
    const name = document.createElement("b");
    name.textContent = author;
    line.append(name, document.createTextNode(` ${message}`));
    this.chatLog.append(line);
    while (this.chatLog.children.length > 6) this.chatLog.firstElementChild.remove();
    this.chatLog.scrollTop = this.chatLog.scrollHeight;
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
    if (name === "inventory") {
      this.inventoryPanel.hidden = false;
      this.#renderInventory();
    } else if (name === "stats") {
      this.statsPanel.hidden = false;
      this.#renderStats();
    }
  }

  refreshInventory() {
    this.#renderInventory();
  }

  closePanels() {
    this.openPanel = null;
    if (this.inventoryPanel) this.inventoryPanel.hidden = true;
    if (this.statsPanel) this.statsPanel.hidden = true;
  }

  update() {
    const p = this.player;
    const progress = this.progression.snapshot();
    this.hpBar.style.width = `${Math.max(0, p.health / p.maxHealth) * 100}%`;
    this.hpText.textContent = `${Math.ceil(p.health)} / ${p.maxHealth}`;
    this.manaBar.style.width = `${Math.max(0, p.mana / p.maxMana) * 100}%`;
    this.manaText.textContent = `${Math.floor(p.mana)} / ${p.maxMana}`;
    this.level.textContent = progress.level;
    this.xpBar.style.width = `${Math.min(100, progress.xp / progress.nextLevelXp * 100)}%`;
    this.xpText.textContent = `${progress.xp} / ${progress.nextLevelXp} XP`;
    const questText = this.#questText(progress);
    this.quest.textContent = performance.now() < this.statusUntil ? this.statusMessage : questText;
    this.questPanel.classList.toggle("is-complete", progress.quest.completed && (!progress.secondQuest.unlocked || progress.secondQuest.completed));
    this.targetFrame.update(this.entities.selected);
    this.skillBar.update(this.skillSystem, p);
    this.fps.textContent = `${this.engine.getFps().toFixed(0)} FPS`;
    this.#updateBuffs();
    this.#minimapPosition(this.minimapPlayer, p.position, p.rotation, true);
    for (const mob of this.entities.mobs) {
      const node = this.labels.get(mob.id);
      const dot = this.minimapMobs.querySelector(`[data-entity-id="${mob.id}"]`);
      node.hidden = !mob.alive;
      dot.hidden = !mob.alive;
      if (!mob.alive) continue;
      this.#minimapPosition(dot, mob.position, 0, false);
      const screen = this.#project(mob.position.add(new BABYLON.Vector3(0, 2.45, 0)));
      node.style.left = `${screen.x}px`;
      node.style.top = `${screen.y}px`;
      node.style.opacity = screen.z > 0 && screen.z < 1 ? "1" : "0";
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
    this.skillBar.dispose();
    for (const node of this.labels.values()) node.remove();
    for (const node of this.damagePool) node.remove();
    this.minimapMobs.replaceChildren();
    this.labels.clear();
    this.root.hidden = true;
  }

  #questText(progress) {
    const q = progress.quest;
    const s = progress.secondQuest;
    if (!q.completed) return `Yaratıkları yen: ${q.progress} / ${q.goal}`;
    if (s?.unlocked && !s.completed) return `Kurt Dişi topla: ${s.progress} / ${s.goal}`;
    if (s?.completed) return `Görevler tamam • +${q.rewardXp + s.rewardXp} XP`;
    return `Tamamlandı • +${q.rewardXp} XP`;
  }

  #updateBuffs() {
    if (!this.buffBar) return;
    const buffs = [];
    if (this.player.buffs?.guard > 0) buffs.push(`<span class="buff guard">Savunma ${this.player.buffs.guard.toFixed(0)}s</span>`);
    if (this.player.buffs?.rage > 0) buffs.push(`<span class="buff rage">Öfke ${this.player.buffs.rage.toFixed(0)}s</span>`);
    this.buffBar.innerHTML = buffs.join("") || "";
    this.buffBar.hidden = buffs.length === 0;
  }

  #renderInventory() {
    if (!this.inventoryGrid) return;
    const snap = this.inventory.snapshot();
    this.inventoryGrid.replaceChildren();
    snap.slots.forEach((item, index) => {
      const button = document.createElement("button");
      button.type = "button";
      const equipped = item && (snap.equipped.weapon === item.id || snap.equipped.armor === item.id);
      button.className = `inv-slot${item ? "" : " empty"}${snap.selected === index ? " selected" : ""}${equipped ? " equipped" : ""}`;
      button.dataset.invSlot = String(index);
      if (item) {
        button.innerHTML = `<span class="inv-icon">${item.icon}</span><span class="inv-name">${item.name}</span>`;
        button.title = `${item.name}\n${item.description}`;
      } else {
        button.innerHTML = `<span class="inv-empty">·</span>`;
        button.title = "Boş";
      }
      this.inventoryGrid.append(button);
    });
    const selected = snap.selected >= 0 ? snap.slots[snap.selected] : null;
    this.inventoryHint.textContent = selected
      ? `${selected.name} — Kullan ile iksir/ekipman`
      : "Eşya seç, sonra Kullan.";
    if (this.equipSummary) {
      this.equipSummary.textContent = `Silah: ${itemName(snap.equipped.weapon)} · Zırh: ${itemName(snap.equipped.armor)}`;
    }
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
  }

  #minimapPosition(node, position, rotation, isPlayer) {
    const x = (position.x + 38) / 76 * 100;
    const y = (position.z + 38) / 76 * 100;
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
