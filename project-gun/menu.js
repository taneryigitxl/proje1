(function () {
  "use strict";

  const startButton = document.getElementById("start-button");
  const statusText = document.querySelector("#menu-status span");
  const qualitySelect = document.getElementById("quality-select");
  const storageKey = "menu-visual-quality";
  const allowedQualities = new Set(["low", "medium", "high"]);

  function applyMenuQuality(value) {
    const quality = allowedQualities.has(value) ? value : "medium";
    document.body.dataset.menuQuality = quality;
    qualitySelect.value = quality;

    try {
      localStorage.setItem(storageKey, quality);
    } catch {
      // The preference is optional when browser storage is unavailable.
    }
  }

  function readSavedQuality() {
    try {
      return localStorage.getItem(storageKey) || "medium";
    } catch {
      return "medium";
    }
  }

  function launchProject() {
    startButton.classList.add("is-launching");
    statusText.textContent = "Yeni proje hazırlanıyor";
    document.dispatchEvent(new CustomEvent("project:launch", {
      detail: { quality: document.body.dataset.menuQuality },
    }));
  }

  window.launchProject = launchProject;
  qualitySelect.addEventListener("change", (event) => applyMenuQuality(event.target.value));
  startButton.addEventListener("click", launchProject);
  applyMenuQuality(readSavedQuality());
})();
