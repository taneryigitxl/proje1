export const GAME_CONFIG = Object.freeze({
  debug: typeof location !== "undefined" && new URLSearchParams(location.search).has("debug"),
  playerModelUrl: null,
  assetManifestUrl: "assets/models/manifest.json",
  assetTimeoutMs: 30000,
  mapHalfSize: 38,
  spawn: { x: 0, y: 0, z: -18 },
  camera: Object.freeze({
    distance: 7.5,
    minDistance: 3.8,
    minCollisionDistance: 1.25,
    maxDistance: 11,
    pitch: 1.08,
    minPitch: 0.62,
    maxPitch: 1.38,
    sensitivityX: 0.0042,
    sensitivityY: 0.0036,
    zoomStep: 0.006,
    zoomSmoothness: 13,
    followSmoothness: 11,
    collisionSmoothness: 20,
    collisionPadding: 0.42,
    focusHeight: 1.35,
  }),
});

export const QUALITY_PROFILES = Object.freeze({
  low: { dpr: 1, antialias: false, shadows: 512, particles: 0.3, lod: 0.6, bloom: false, grass: 70, grassDistance: 18 },
  medium: { dpr: 1.1, antialias: true, shadows: 768, particles: 0.5, lod: 0.85, bloom: false, grass: 150, grassDistance: 24 },
  high: { dpr: 1.35, antialias: true, shadows: 1280, particles: 0.85, lod: 1.1, bloom: true, grass: 260, grassDistance: 30 },
});

export const SKILLS = Object.freeze([
  { slot: 1, name: "Keskin Darbe", icon: "✦", description: "Hızlı tek hedef saldırısı.", mana: 0, cooldown: 0.8, range: 2.8, damage: 16, impact: [0.34], duration: 0.68, target: "enemy", animation: "attack1", trail: true, color: "#d85fff" },
  { slot: 2, name: "Çift Kesik", icon: "✕", description: "İki aşamalı kılıç kombosu.", mana: 12, cooldown: 3.5, range: 2.9, damage: 12, impact: [0.3, 0.62], duration: 0.95, target: "enemy", animation: "attack2", trail: true, color: "#f079ff" },
  { slot: 3, name: "Ağır Vuruş", icon: "◆", description: "Yavaş fakat yüksek hasarlı saldırı.", mana: 18, cooldown: 5, range: 3.1, damage: 34, impact: [0.68], duration: 1.15, target: "enemy", animation: "heavy", trail: true, color: "#ff8b58" },
  { slot: 4, name: "Dairesel Kesik", icon: "◉", description: "Yakındaki tüm yaratıklara alan hasarı.", mana: 22, cooldown: 7, range: 3.5, damage: 22, impact: [0.48], duration: 1.0, aoe: true, animation: "skill4", trail: true, color: "#b946ff" },
  { slot: 5, name: "İleri Atılım", icon: "➤", description: "Hedef yönüne kısa bir atılım.", mana: 10, cooldown: 5, range: 8, damage: 0, impact: [0.22], duration: 0.7, action: "dash", animation: "skill5", trail: true, color: "#6f83ff" },
  { slot: 6, name: "Kılıç Dalgası", icon: "≈", description: "Öndeki hedefe enerji dalgası yollar.", mana: 24, cooldown: 8, range: 9, damage: 27, impact: [0.5], duration: 0.9, target: "enemy", animation: "skill6", trail: true, color: "#55c9ff" },
  { slot: 7, name: "Savaşçı Savunması", icon: "⬡", description: "6 saniye boyunca alınan hasarı azaltır.", mana: 18, cooldown: 14, range: 0, damage: 0, impact: [0.38], duration: 0.85, action: "guard", animation: "skill7", color: "#68a6ff" },
  { slot: 8, name: "Öfke", icon: "▲", description: "8 saniye hız ve saldırı gücü verir.", mana: 26, cooldown: 20, range: 0, damage: 0, impact: [0.45], duration: 0.95, action: "rage", animation: "skill8", color: "#ff4d73" },
  { slot: 9, name: "Nihai Darbe", icon: "✹", description: "Uzun bekleme süreli ezici saldırı.", mana: 45, cooldown: 30, range: 3.5, damage: 78, impact: [0.82], duration: 1.35, target: "enemy", animation: "skill9", trail: true, color: "#ffd45c" },
]);

export const MOB_SPAWNS = Object.freeze([
  { x: -7, z: 9 }, { x: 4, z: 12 }, { x: 11, z: 7 }, { x: -13, z: 15 }, { x: 13, z: 18 },
]);
