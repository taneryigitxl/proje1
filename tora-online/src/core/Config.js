export const GAME_CONFIG = Object.freeze({
  debug: typeof location !== "undefined" && new URLSearchParams(location.search).has("debug"),
  playerModelUrl: null,
  assetManifestUrl: "assets/models/manifest.json",
  assetTimeoutMs: 30000,
  mapHalfSize: 25,
  spawn: { x: 0, y: 0, z: -9 },
  camera: Object.freeze({
    distance: 20,
    yaw: -Math.PI * 0.75,
    fov: 0.5,
    minDistance: 15,
    maxDistance: 26,
    pitch: Math.PI / 2 - (50 * Math.PI / 180),
    zoomStep: 0.01,
    zoomSmoothness: 8,
    followSmoothness: 18,
    focusHeight: 0.02,
    lookAhead: 0,
    shakeMax: 0.028,
  }),
});
export const QUALITY_PROFILES = Object.freeze({
  low: { dpr: 1, antialias: false, shadows: 512, grass: 600, grassDistance: 15 },
  medium: { dpr: 1, antialias: true, shadows: 1024, grass: 1800, grassDistance: 23 },
  high: { dpr: 1.25, antialias: true, shadows: 2048, grass: 3600, grassDistance: 30 },
});
