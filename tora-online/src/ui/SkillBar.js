import { SKILLS } from "../core/Config.js?v=30";

const ICONS = {
  slash: `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M8 40 L36 8" stroke="#f2e6c4" stroke-width="5" stroke-linecap="round"/><path d="M12 36 L40 8" stroke="#c45a3a" stroke-width="2.5" stroke-linecap="round" opacity=".85"/><circle cx="38" cy="10" r="3.2" fill="#ead7a8"/></svg>`,
  cross: `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M10 14 L38 34" stroke="#f0d9a0" stroke-width="4.5" stroke-linecap="round"/><path d="M38 14 L10 34" stroke="#d4a056" stroke-width="4.5" stroke-linecap="round"/><path d="M14 18 L34 30" stroke="#fff4d6" stroke-width="1.5" opacity=".7"/></svg>`,
  crush: `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 6 L28 22 L24 42 L20 22 Z" fill="#c9a45a" stroke="#3a2a14" stroke-width="1.5"/><path d="M16 20 H32" stroke="#8b5a28" stroke-width="3" stroke-linecap="round"/><path d="M18 40 H30" stroke="#e8c878" stroke-width="2.5" stroke-linecap="round"/><path d="M22 8 L26 8" stroke="#fff0c8" stroke-width="2"/></svg>`,
  whirl: `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 8 A16 16 0 1 1 23.9 8" fill="none" stroke="#d4ad5e" stroke-width="3.5"/><path d="M24 14 A10 10 0 1 0 24.1 14" fill="none" stroke="#8fbf6a" stroke-width="2.5"/><path d="M24 24 L36 16" stroke="#f2e6c4" stroke-width="3" stroke-linecap="round"/><path d="M24 24 L14 34" stroke="#c45a3a" stroke-width="3" stroke-linecap="round"/></svg>`,
  dash: `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M8 24 H28" stroke="#9ec0ff" stroke-width="3" stroke-linecap="round"/><path d="M12 18 H26" stroke="#6a8fbf" stroke-width="2" stroke-linecap="round" opacity=".7"/><path d="M12 30 H26" stroke="#6a8fbf" stroke-width="2" stroke-linecap="round" opacity=".7"/><path d="M26 14 L40 24 L26 34 Z" fill="#ead7a8" stroke="#3a2a14" stroke-width="1.5"/></svg>`,
  wave: `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M8 28 Q16 16 24 28 T40 28" fill="none" stroke="#55c9ff" stroke-width="3.5" stroke-linecap="round"/><path d="M10 34 Q18 24 26 34 T42 34" fill="none" stroke="#2a6f9b" stroke-width="2.5" stroke-linecap="round"/><path d="M30 12 L38 20 L34 14 Z" fill="#b8e8ff"/></svg>`,
  shield: `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 6 L40 12 V24 C40 34 32 40 24 44 C16 40 8 34 8 24 V12 Z" fill="#426c9b" stroke="#ead7a8" stroke-width="2"/><path d="M24 12 L34 16 V24 C34 30 29 35 24 38 C19 35 14 30 14 24 V16 Z" fill="#243c61" opacity=".85"/><path d="M24 18 V30 M18 24 H30" stroke="#d4ad5e" stroke-width="2.2" stroke-linecap="round"/></svg>`,
  rage: `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 42 C14 34 12 26 14 18 C18 20 20 14 24 8 C28 14 30 20 34 18 C36 26 34 34 24 42 Z" fill="#c43a30" stroke="#3a1410" stroke-width="1.5"/><path d="M24 36 C18 30 17 25 19 20 C21 22 22 18 24 14 C26 18 27 22 29 20 C31 25 30 30 24 36 Z" fill="#ff8b58"/><circle cx="24" cy="26" r="3" fill="#ffd45c"/></svg>`,
  ultimate: `<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="14" fill="#8a6a28" stroke="#ffd45c" stroke-width="2"/><path d="M24 8 L27 20 L40 20 L30 28 L34 40 L24 32 L14 40 L18 28 L8 20 L21 20 Z" fill="#ffd45c" stroke="#3a2a14" stroke-width="1"/><circle cx="24" cy="24" r="4" fill="#fff4d0"/></svg>`,
};

export class SkillBar {
  constructor(element, onActivate) {
    this.element = element;
    this.onActivate = onActivate;
    this.slots = new Map();
    this.flashUntil = new Map();
    for (const skill of SKILLS) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "skill-slot";
      button.dataset.tooltip = `${skill.name} — ${skill.description} Mana: ${skill.mana}, bekleme: ${skill.cooldown} sn.`;
      button.style.setProperty("--icon", skill.color);
      const svg = ICONS[skill.icon] || ICONS.slash;
      button.innerHTML = `<span class="key">${skill.slot}</span><span class="icon">${svg}</span><span class="cost">${skill.mana || "—"}</span><span class="cooldown" hidden></span>`;
      button.addEventListener("click", () => {
        this.flashUntil.set(skill.slot, performance.now() + 220);
        onActivate(skill.slot);
      });
      element.append(button);
      this.slots.set(skill.slot, button);
    }
  }

  markPressed(slot) {
    this.flashUntil.set(slot, performance.now() + 220);
  }

  update(skillSystem, player, selected = null) {
    const now = performance.now();
    for (const skill of SKILLS) {
      const button = this.slots.get(skill.slot);
      const remaining = skillSystem.remaining(skill.slot);
      const overlay = button.querySelector(".cooldown");
      overlay.hidden = remaining <= 0.05;
      overlay.textContent = remaining > 0 ? remaining.toFixed(remaining < 1 ? 1 : 0) : "";
      const check = skillSystem.canUse(skill, player);
      const needsTarget = skill.target === "enemy" && !selected?.alive;
      button.classList.toggle("unavailable", !check.ok);
      button.classList.toggle("needs-target", needsTarget);
      button.classList.toggle("flash", (this.flashUntil.get(skill.slot) || 0) > now);
      button.title = !check.ok ? check.reason : (needsTarget ? "Hedef seç (TAB veya tıkla)" : skill.name);
    }
  }

  dispose() {
    this.element.replaceChildren();
    this.slots.clear();
  }
}
