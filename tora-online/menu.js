(function () {
  "use strict";
  const form = document.getElementById("login-form");
  const button = document.getElementById("start-button");
  const username = document.getElementById("login-username");
  const password = document.getElementById("login-password");
  const quality = document.getElementById("quality-select");
  const status = document.querySelector("#menu-status span");
  const allowed = new Set(["low", "medium", "high"]);
  const key = "tora-quality";
  const VALID_USER = "admin";
  const VALID_PASS = "2850";

  function apply(value, announce) {
    const selected = allowed.has(value) ? value : "medium";
    document.body.dataset.quality = selected;
    quality.value = selected;
    const pauseQuality = document.getElementById("pause-quality");
    if (pauseQuality) pauseQuality.value = selected;
    try { localStorage.setItem(key, selected); } catch (_) { /* optional */ }
    document.dispatchEvent(new CustomEvent("tora:quality", { detail: { quality: selected } }));
    if (announce) status.textContent = `${selected.toUpperCase()} profil seçildi.`;
  }

  function validateLogin() {
    const user = (username?.value || "").trim();
    const pass = password?.value || "";
    if (user === VALID_USER && pass === VALID_PASS) return true;
    status.textContent = "Giriş reddedildi. Yalnızca admin hesabı kabul edilir.";
    password?.focus();
    password?.select?.();
    return false;
  }

  form?.addEventListener("submit", function (event) {
    event.preventDefault();
    if (button.disabled) return;
    if (!validateLogin()) return;
    button.disabled = true;
    button.classList.add("is-launching");
    status.textContent = "Diyar kapısı açılıyor…";
    document.dispatchEvent(new CustomEvent("tora:enter", { detail: { quality: quality.value, username: VALID_USER } }));
  });

  quality.addEventListener("change", (event) => apply(event.target.value, true));
  let saved = "medium";
  try { saved = localStorage.getItem(key) || saved; } catch (_) { /* optional */ }
  apply(saved, false);
  window.ToraMenu = {
    applyQuality: apply,
    unlock: () => { button.disabled = false; button.classList.remove("is-launching"); },
  };
})();
