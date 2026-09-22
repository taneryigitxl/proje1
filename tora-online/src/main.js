import { EngineRuntime } from "./core/Engine.js?v=18";
import { Game } from "./core/Game.js?v=18";

if (window.__TORA_BOOTSTRAP__) {
  console.warn("[Tora Startup] İkinci bootstrap isteği engellendi; mevcut oyun instance korunuyor.");
} else {
  const canvas = document.getElementById("game-canvas");
  const menu = document.getElementById("menu-screen");
  const loading = document.getElementById("loading-screen");
  const label = document.getElementById("loading-label");
  const bar = document.getElementById("loading-bar");
  const percent = document.getElementById("loading-percent");
  const fatal = document.getElementById("fatal-error");
  const retryButton = document.getElementById("retry-button");
  let runtime = null;
  let game = null;
  let starting = false;
  let lastQuality = "medium";
  let lastIdentity = { username: "admin", isAdmin: true };

  function progress(value, message) {
    const safe = Math.max(0, Math.min(100, Math.round(value)));
    bar.style.width = `${safe}%`;
    percent.textContent = `${safe}%`;
    label.textContent = message;
  }

  function cleanup() {
    try { game?.dispose(); }
    catch (error) { console.error("[Tora Startup] Game cleanup hatası.", error); }
    try { runtime?.dispose(); }
    catch (error) { console.error("[Tora Startup] Engine cleanup hatası.", error); }
    game = null;
    runtime = null;
    window.__TORA_BOOTSTRAP__.game = null;
    window.__TORA_BOOTSTRAP__.runtime = null;
  }

  function showError(error) {
    console.error("[Tora Online] Başlatma hatası", error);
    cleanup();
    loading.hidden = true;
    menu.classList.remove("is-leaving");
    fatal.hidden = false;
    fatal.querySelector("span").textContent = error?.message || "Bilinmeyen bir başlatma hatası oluştu.";
    window.ToraMenu?.unlock();
    starting = false;
  }

  async function enter(quality, identity = lastIdentity) {
    if (starting || game?.running) {
      console.warn("[Tora Startup] Yinelenen oyun başlatma isteği engellendi.");
      return;
    }
    lastQuality = quality || lastQuality;
    lastIdentity = {
      username: identity?.username || "admin",
      isAdmin: identity?.isAdmin !== false,
    };
    starting = true;
    fatal.hidden = true;
    loading.hidden = false;
    progress(3, "Kadim geçit açılıyor…");
    try {
      if (!game) {
        runtime = await EngineRuntime.create(canvas, lastQuality, progress);
        game = new Game(runtime, progress, showError);
        window.__TORA_BOOTSTRAP__.runtime = runtime;
        window.__TORA_BOOTSTRAP__.game = game;
        const result = await game.initialize(lastIdentity);
        console.info(`[Tora Online] ${result.backend}; zorunlu GLB varlık seti doğrulandı.`);
      } else {
        game.applyQuality(lastQuality);
        game.applyIdentity?.(lastIdentity);
      }
      progress(100, "Dünya hazır.");
      await new Promise((resolve) => setTimeout(resolve, 280));
      menu.classList.add("is-leaving");
      loading.hidden = true;
      game.enter();
      starting = false;
    } catch (error) {
      showError(error);
    }
  }

  function retry() {
    if (starting) return;
    fatal.hidden = true;
    window.ToraMenu?.unlock();
    void enter(lastQuality, lastIdentity);
  }

  const onEnter = (event) => void enter(event.detail.quality, {
    username: event.detail.username,
    isAdmin: event.detail.isAdmin,
  });
  const onQuality = (event) => game?.applyQuality(event.detail.quality);
  const onWindowError = (event) => console.error("[Tora Online] Çalışma zamanı hatası:", event.error || event.message);
  const onUnhandledRejection = (event) => console.error("[Tora Online] Promise hatası:", event.reason);
  document.addEventListener("tora:enter", onEnter);
  document.addEventListener("tora:quality", onQuality);
  retryButton.addEventListener("click", retry);
  addEventListener("error", onWindowError);
  addEventListener("unhandledrejection", onUnhandledRejection);

  window.__TORA_BOOTSTRAP__ = { game, runtime, enter, retry, cleanup };
}
