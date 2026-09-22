export const GAME_CONFIG = Object.freeze({
  debug: typeof location !== "undefined" && new URLSearchParams(location.search).has("debug"),
  playerModelUrl: null,
  assetManifestUrl: "assets/models/manifest.json",
  assetTimeoutMs: 30000,
  mapHalfSize: 38,
  spawn: { x: 0, y: 0, z: -18 },
  camera: Object.freeze({
    distance: 8.2,
    minDistance: 3.2,
    minCollisionDistance: 1.15,
    maxDistance: 14,
    pitch: 1.12,
    minPitch: 0.48,
    maxPitch: 1.42,
    sensitivityX: 0.0046,
    sensitivityY: 0.0038,
    zoomStep: 0.007,
    zoomSmoothness: 12,
    followSmoothness: 10,
    collisionSmoothness: 18,
    collisionPadding: 0.48,
    focusHeight: 1.42,
  }),
});

export const QUALITY_PROFILES = Object.freeze({
  low: { dpr: 1, antialias: false, shadows: 1024, particles: 0.3, lod: 0.65, bloom: false, grass: 90, grassDistance: 18, natureMul: 0.7 },
  medium: { dpr: 1.15, antialias: true, shadows: 1536, particles: 0.55, lod: 0.95, bloom: false, grass: 160, grassDistance: 26, natureMul: 1 },
  high: { dpr: 1.4, antialias: true, shadows: 2048, particles: 0.9, lod: 1.2, bloom: true, grass: 220, grassDistance: 34, natureMul: 1.25 },
});

export const SKILLS = Object.freeze([
  { slot: 1, name: "Keskin Darbe", icon: "slash", description: "Hızlı tek hedef saldırısı.", mana: 0, cooldown: 0.8, range: 2.8, damage: 16, impact: [0.34], duration: 0.68, target: "enemy", animation: "attack1", trail: true, color: "#c45a3a" },
  { slot: 2, name: "Çift Kesik", icon: "cross", description: "İki aşamalı kılıç kombosu.", mana: 12, cooldown: 3.5, range: 2.9, damage: 12, impact: [0.3, 0.62], duration: 0.95, target: "enemy", animation: "attack2", trail: true, color: "#d4a056" },
  { slot: 3, name: "Ağır Vuruş", icon: "crush", description: "Yavaş fakat yüksek hasarlı saldırı.", mana: 18, cooldown: 5, range: 3.1, damage: 34, impact: [0.68], duration: 1.15, target: "enemy", animation: "heavy", trail: true, color: "#8b5a28" },
  { slot: 4, name: "Dairesel Kesik", icon: "whirl", description: "Yakındaki tüm yaratıklara alan hasarı.", mana: 22, cooldown: 7, range: 3.5, damage: 22, impact: [0.48], duration: 1.0, aoe: true, animation: "skill4", trail: true, color: "#6a8f3a" },
  { slot: 5, name: "İleri Atılım", icon: "dash", description: "Hedef yönüne kısa bir atılım.", mana: 10, cooldown: 5, range: 8, damage: 0, impact: [0.22], duration: 0.7, action: "dash", animation: "skill5", trail: true, color: "#6a8fbf" },
  { slot: 6, name: "Kılıç Dalgası", icon: "wave", description: "Öndeki hedefe enerji dalgası yollar.", mana: 24, cooldown: 8, range: 9, damage: 27, impact: [0.5], duration: 0.9, target: "enemy", animation: "skill6", trail: true, color: "#3a8fbf" },
  { slot: 7, name: "Savaşçı Savunması", icon: "shield", description: "6 saniye boyunca alınan hasarı azaltır.", mana: 18, cooldown: 14, range: 0, damage: 0, impact: [0.38], duration: 0.85, action: "guard", animation: "skill7", color: "#426c9b" },
  { slot: 8, name: "Öfke", icon: "rage", description: "8 saniye hız ve saldırı gücü verir.", mana: 26, cooldown: 20, range: 0, damage: 0, impact: [0.45], duration: 0.95, action: "rage", animation: "skill8", color: "#ae3c30" },
  { slot: 9, name: "Nihai Darbe", icon: "ultimate", description: "Uzun bekleme süreli ezici saldırı.", mana: 45, cooldown: 30, range: 3.5, damage: 78, impact: [0.82], duration: 1.35, target: "enemy", animation: "skill9", trail: true, color: "#d4ad5e" },
]);

/** Patrol posts around the orc camp ring — spaced so they don't stack or sink. */
export const MOB_SPAWNS = Object.freeze([
  { x: -10.5, z: 11.8, patrol: true },
  { x: -5.2, z: 22.2, patrol: true },
  { x: 4.5, z: 22.4, patrol: true },
  { x: 10.8, z: 13.2, patrol: true },
  { x: 8.5, z: 8.8, patrol: true },
  { x: -8.8, z: 8.4, patrol: true },
  { x: 0.2, z: 14.0, patrol: true },
  { x: -12.2, z: 18.2, patrol: true },
]);
