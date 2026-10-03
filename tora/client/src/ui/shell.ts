import {
  BODY_TYPES,
  CLASS_IDS,
  CLASSES,
  HAIR_COLORS,
  HAIR_STYLES,
  MAP_ID,
  type BodyType,
  type ClassId,
  type HairStyle,
  type PublicCharacter,
} from "@tora/shared";
import { audio } from "../audio/AudioManager";
import {
  ApiError,
  createCharacter,
  currentAccount,
  listCharacters,
  loginAccount,
  logoutAccount,
  registerAccount,
} from "../api";
import { createGame } from "../game/createGame";
import type { GameEntry } from "../game/types";
import { createPanels, type PanelId } from "./panels";
import { setSessionBag } from "./session";
import { drawPortrait } from "./portrait";

const TOKEN_KEY = "tora.session";

export function boot(): void {
  const authScreen = requireElement<HTMLElement>("auth-screen");
  const characterScreen = requireElement<HTMLElement>("character-screen");
  const hud = requireElement<HTMLElement>("hud");
  const disconnect = requireElement<HTMLElement>("disconnect");
  const authError = requireElement<HTMLElement>("auth-error");
  const characterError = requireElement<HTMLElement>("character-error");
  const loginForm = requireElement<HTMLFormElement>("login-form");
  const registerForm = requireElement<HTMLFormElement>("register-form");
  const createForm = requireElement<HTMLFormElement>("create-form");
  const characterCard = requireElement<HTMLElement>("character-card");
  const chatForm = requireElement<HTMLFormElement>("chat-form");
  const chatInput = requireElement<HTMLInputElement>("chat-input");
  const chatLog = requireElement<HTMLElement>("chat-log");
  const muteButton = requireElement<HTMLButtonElement>("mute-button");

  let token = sessionStorage.getItem(TOKEN_KEY);
  let character: PublicCharacter | null = null;
  let entry: GameEntry | null = null;
  let game: PhaserGame | null = null;
  let classId: ClassId = "warrior";
  let body: BodyType = "female";
  let hairStyle: HairStyle = "short";
  let hairColor: string = HAIR_COLORS[0].hex;

  renderChoices();
  void refreshPortrait();
  syncMute();

  document.getElementById("admin-test")?.addEventListener("click", () => startAdminTest());
  document.getElementById("show-login")?.addEventListener("click", () => showAuthMode("login"));
  document.getElementById("show-register")?.addEventListener("click", () => showAuthMode("register"));
  loginForm.addEventListener("submit", (event) => {
    event.preventDefault();
    void submitLogin();
  });
  registerForm.addEventListener("submit", (event) => {
    event.preventDefault();
    void submitRegister();
  });
  createForm.addEventListener("submit", (event) => {
    event.preventDefault();
    void submitCharacter();
  });
  document.getElementById("enter-world")?.addEventListener("click", () => {
    if (character) void enterWorld(character);
  });
  document.getElementById("character-logout")?.addEventListener("click", () => void logout());
  document.getElementById("hud-logout")?.addEventListener("click", () => void logout());
  document.getElementById("disconnect-logout")?.addEventListener("click", () => void logout());
  document.getElementById("leave-button")?.addEventListener("click", () => void leaveWorld());
  document.getElementById("reconnect-button")?.addEventListener("click", () => {
    if (character) void enterWorld(character);
  });
  muteButton.addEventListener("click", () => {
    audio.setMuted(!audio.muted);
    syncMute();
  });
  chatForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const text = chatInput.value.trim();
    if (!text || !entry) return;
    entry.sendChat(text);
    chatInput.value = "";
  });
  chatInput.addEventListener("focus", () => entry?.typing(true));
  chatInput.addEventListener("blur", () => entry?.typing(false));
  const panels = createPanels(() => character);
  const panelKeys: Record<string, PanelId> = {
    KeyC: "character",
    KeyI: "inventory",
    KeyK: "skills",
    KeyQ: "quests",
    KeyM: "map",
  };
  document.querySelectorAll<HTMLButtonElement>(".menu-bar button[data-panel]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.panel;
      if (id === "character" || id === "inventory" || id === "skills" || id === "quests" || id === "map" || id === "settings" || id === "guild") {
        panels.toggle(id);
      }
    });
  });
  window.addEventListener("keydown", (event) => {
    if (hud.hidden) return;
    const typing = document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement;
    if (event.key === "Escape") {
      if (document.activeElement === chatInput) chatInput.blur();
      else if (panels.isOpen()) panels.close();
      return;
    }
    if (typing) return;
    const panel = panelKeys[event.code];
    if (panel) {
      event.preventDefault();
      panels.toggle(panel);
      return;
    }
    if (event.key !== "Enter" || event.repeat) return;
    event.preventDefault();
    chatInput.focus();
  });

  if (token) void restore(token);
  else showAuth();

  function showAuthMode(mode: "login" | "register"): void {
    loginForm.hidden = mode !== "login";
    registerForm.hidden = mode !== "register";
    document.getElementById("show-login")?.classList.toggle("active", mode === "login");
    document.getElementById("show-register")?.classList.toggle("active", mode === "register");
    authError.textContent = "";
  }

  async function submitLogin(): Promise<void> {
    authError.textContent = "";
    const data = new FormData(loginForm);
    try {
      const result = await loginAccount(String(data.get("username") ?? ""), String(data.get("password") ?? ""));
      await acceptSession(result.token);
    } catch (error) {
      authError.textContent = messageOf(error);
    }
  }

  async function submitRegister(): Promise<void> {
    authError.textContent = "";
    const data = new FormData(registerForm);
    try {
      const result = await registerAccount(
        String(data.get("username") ?? ""),
        String(data.get("email") ?? ""),
        String(data.get("password") ?? ""),
      );
      await acceptSession(result.token);
    } catch (error) {
      authError.textContent = messageOf(error);
    }
  }

  async function acceptSession(nextToken: string): Promise<void> {
    token = nextToken;
    sessionStorage.setItem(TOKEN_KEY, nextToken);
    await showCharacters();
  }

  async function restore(existing: string): Promise<void> {
    try {
      await currentAccount(existing);
      token = existing;
      await showCharacters();
    } catch {
      sessionStorage.removeItem(TOKEN_KEY);
      token = null;
      showAuth();
    }
  }

  function showAuth(): void {
    destroyGame();
    authScreen.hidden = false;
    characterScreen.hidden = true;
    hud.hidden = true;
    disconnect.hidden = true;
  }

  async function showCharacters(): Promise<void> {
    if (!token) return showAuth();
    destroyGame();
    authScreen.hidden = true;
    characterScreen.hidden = false;
    hud.hidden = true;
    disconnect.hidden = true;
    characterError.textContent = "";
    try {
      const result = await listCharacters(token);
      character = result.characters[0] ?? null;
      if (!character) {
        characterCard.hidden = true;
        createForm.hidden = false;
        await refreshPortrait();
        return;
      }
      createForm.hidden = true;
      characterCard.hidden = false;
      requireElement<HTMLElement>("select-name").textContent = character.name;
      const className = CLASSES[character.classId as ClassId]?.name ?? character.classId;
      requireElement<HTMLElement>("select-meta").textContent = `${className} · Seviye ${character.level} · ${character.gold} altın`;
      const portrait = requireElement<HTMLCanvasElement>("select-portrait");
      await drawPortrait(portrait, character);
    } catch (error) {
      characterError.textContent = messageOf(error);
    }
  }

  async function submitCharacter(): Promise<void> {
    if (!token) return;
    characterError.textContent = "";
    try {
      const result = await createCharacter(token, {
        name: requireElement<HTMLInputElement>("character-name").value,
        gender: body,
        hairStyle,
        hairColor,
        classId,
      });
      character = result.character;
      await showCharacters();
    } catch (error) {
      characterError.textContent = messageOf(error);
    }
  }

  function startAdminTest(): void {
    token = null;
    sessionStorage.removeItem(TOKEN_KEY);
    character = adminCharacter();
    disconnect.hidden = true;
    openWorld(character, "", true);
  }

  async function enterWorld(next: PublicCharacter): Promise<void> {
    if (!token) return;
    characterError.textContent = "";
    disconnect.hidden = true;
    try {
      const fresh = await listCharacters(token);
      character = fresh.characters.find((item) => item.id === next.id) ?? next;
    } catch (error) {
      characterError.textContent = messageOf(error);
      return;
    }

    openWorld(character, token, false);
  }

  function openWorld(active: PublicCharacter, activeToken: string, offline: boolean): void {
    destroyGame();
    authScreen.hidden = true;
    characterScreen.hidden = true;
    hud.hidden = false;
    paintHud(active);
    clearChat();
    entry = {
      token: activeToken,
      offline,
      character: active,
      onReady: () => appendChat({
        name: "",
        text: offline ? "Yönetici test modu. Hareket yalnızca bu tarayıcıda kalır." : "Tora Köyü'ne vardın.",
        system: true,
      }),
      onChat: (line) => appendChat(line),
      onOnline: (count) => {
        requireElement<HTMLElement>("online-count").textContent = `${count} çevrimiçi`;
      },
      onDisconnect: (text, canReconnect) => {
        requireElement<HTMLElement>("disconnect-text").textContent = text;
        requireElement<HTMLButtonElement>("reconnect-button").hidden = !canReconnect;
        disconnect.hidden = false;
      },
      typing: () => undefined,
      sendChat: () => undefined,
      leaveWorld: async () => undefined,
      onBag: (payload) => {
        const bag = payload as { items?: Array<{ itemId: string; quantity: number; equipped: boolean }>; quest?: string; fighter?: { weaponId?: string; gold?: number; experience?: number; statPoints?: number } };
        setSessionBag(bag.items ?? [], bag.quest ?? "");
        if (character && bag.fighter) {
          if (bag.fighter.weaponId) character.weaponId = bag.fighter.weaponId;
          if (typeof bag.fighter.gold === "number") {
            character.gold = bag.fighter.gold;
            requireElement<HTMLElement>("gold-text").textContent = String(character.gold);
          }
          if (typeof bag.fighter.experience === "number") character.experience = bag.fighter.experience;
          if (typeof bag.fighter.statPoints === "number") character.statPoints = bag.fighter.statPoints;
        }
        panels.refresh();
      },
    };
    if (offline) {
      const klass = CLASSES[active.classId as ClassId] ?? CLASSES.warrior;
      setSessionBag([
        { itemId: klass.weaponId, quantity: 1, equipped: true },
        { itemId: "moon-sword", quantity: 1, equipped: false },
        { itemId: "travel-armor", quantity: 1, equipped: true },
        { itemId: "small-potion", quantity: 5, equipped: false },
        { itemId: "guard-armor", quantity: 1, equipped: false },
      ], "Eğitim: yeşil slime yen");
    }
    game = createGame(entry);
  }

  async function leaveWorld(): Promise<void> {
    await entry?.leaveWorld();
    entry?.typing(false);
    chatInput.blur();
    if (token) await showCharacters();
    else showAuth();
  }

  async function logout(): Promise<void> {
    const current = token;
    token = null;
    character = null;
    sessionStorage.removeItem(TOKEN_KEY);
    await entry?.leaveWorld().catch(() => undefined);
    entry?.typing(false);
    destroyGame();
    if (current) void logoutAccount(current).catch(() => undefined);
    showAuth();
  }

  function destroyGame(): void {
    game?.destroy(true);
    game = null;
    entry = null;
    document.querySelector("#nameplate-layer")?.replaceChildren();
  }

  function paintHud(next: PublicCharacter): void {
    requireElement<HTMLElement>("hud-name").textContent = next.name;
    const className = CLASSES[next.classId as ClassId]?.name ?? "Savaşçı";
    requireElement<HTMLElement>("hud-level").textContent = `${className} · Seviye ${next.level}`;
    requireElement<HTMLElement>("hp-text").textContent = `${next.currentHealth} / ${next.maxHealth}`;
    requireElement<HTMLElement>("mp-text").textContent = `${next.currentMana} / ${next.maxMana}`;
    requireElement<HTMLElement>("hp-fill").style.width = `${barWidth(next.currentHealth, next.maxHealth)}%`;
    requireElement<HTMLElement>("mp-fill").style.width = `${barWidth(next.currentMana, next.maxMana)}%`;
    requireElement<HTMLElement>("gold-text").textContent = String(next.gold);
    void drawPortrait(requireElement<HTMLCanvasElement>("hud-portrait"), next);
  }

  function appendChat(line: { name: string; text: string; system: boolean }): void {
    const row = document.createElement("p");
    row.className = line.system ? "system" : "say";
    if (!line.system) {
      const name = document.createElement("b");
      name.textContent = line.name;
      row.append(name, document.createTextNode(` ${line.text}`));
    } else {
      row.textContent = line.text;
    }
    chatLog.append(row);
    while (chatLog.childElementCount > 80) chatLog.firstElementChild?.remove();
    chatLog.scrollTop = chatLog.scrollHeight;
  }

  function clearChat(): void {
    chatLog.replaceChildren();
  }

  function renderChoices(): void {
    mountChoices("class-options", CLASS_IDS, classId, (value) => {
      classId = value;
      void refreshPortrait();
    }, (value) => CLASSES[value].name);
    mountChoices("body-options", BODY_TYPES, body, (value) => {
      body = value;
      void refreshPortrait();
    }, (value) => (value === "female" ? "Kadın" : "Erkek"));
    mountChoices("hair-options", HAIR_STYLES, hairStyle, (value) => {
      hairStyle = value;
      void refreshPortrait();
    }, (value) => (value === "short" ? "Kısa" : value === "long" ? "Uzun" : "Bağlı"));
    const colors = requireElement<HTMLElement>("color-options");
    colors.replaceChildren();
    for (const color of HAIR_COLORS) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = color.hex === hairColor ? "choice active" : "choice";
      button.textContent = color.label;
      button.style.setProperty("--swatch", color.hex);
      button.addEventListener("click", () => {
        hairColor = color.hex;
        renderChoices();
        void refreshPortrait();
      });
      colors.append(button);
    }
  }

  function mountChoices<T extends string>(
    id: string,
    values: readonly T[],
    selected: T,
    onSelect: (value: T) => void,
    label: (value: T) => string,
  ): void {
    const host = requireElement<HTMLElement>(id);
    host.replaceChildren();
    for (const value of values) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = value === selected ? "choice active" : "choice";
      button.textContent = label(value);
      button.addEventListener("click", () => {
        onSelect(value);
        renderChoices();
      });
      host.append(button);
    }
  }

  async function refreshPortrait(): Promise<void> {
    const canvas = document.getElementById("create-portrait");
    if (!(canvas instanceof HTMLCanvasElement) || createForm.hidden) return;
    await drawPortrait(canvas, { gender: body, hairStyle, hairColor });
  }

  function syncMute(): void {
    muteButton.textContent = audio.muted ? "Ses kapalı" : "Ses açık";
    muteButton.classList.toggle("active", !audio.muted);
  }
}

function requireElement<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!(node instanceof HTMLElement)) throw new Error(`Missing #${id}`);
  return node as T;
}

function messageOf(error: unknown): string {
  if (error instanceof ApiError || error instanceof Error) return error.message;
  return "Bir şeyler ters gitti. Tekrar dene.";
}

function adminCharacter(): PublicCharacter {
  return {
    id: "admin-test",
    name: "Admin",
    gender: "female",
    hairStyle: "short",
    hairColor: HAIR_COLORS[0]?.hex ?? "#3b2416",
    level: 1,
    experience: 0,
    gold: 0,
    currentHealth: 140,
    maxHealth: 140,
    currentMana: 40,
    maxMana: 40,
    mapId: MAP_ID,
    positionX: 32 * 16 + 8,
    positionY: 26 * 16 + 14,
    facing: "down",
    classId: "warrior",
    strength: 12,
    dexterity: 6,
    intellect: 3,
    vitality: 11,
    statPoints: 0,
    weaponId: "rusty-sword",
  };
}

function barWidth(current: number, max: number): number {
  if (max <= 0) return 0;
  return Math.max(0, Math.min(100, (current / max) * 100));
}

interface PhaserGame {
  destroy(removeCanvas?: boolean): void;
}
