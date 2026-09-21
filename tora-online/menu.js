(function () {
  "use strict";
  const button = document.getElementById("start-button");
  const quality = document.getElementById("quality-select");
  const status = document.querySelector("#menu-status span");
  const allowed = new Set(["low", "medium", "high"]);
  const key = "tora-quality";
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
  button.addEventListener("click", function () {
    if (button.disabled) return;
    button.disabled = true;
    button.classList.add("is-launching");
    status.textContent = "Diyar kapısı açılıyor…";
    document.dispatchEvent(new CustomEvent("tora:enter", { detail: { quality: quality.value } }));
  });
  quality.addEventListener("change", (event) => apply(event.target.value, true));
  let saved = "medium";
  try { saved = localStorage.getItem(key) || saved; } catch (_) { /* optional */ }
  apply(saved, false);
  window.ToraMenu = { applyQuality: apply, unlock: () => { button.disabled = false; button.classList.remove("is-launching"); } };
})();
