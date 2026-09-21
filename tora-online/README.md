# Tora Online prototype

Browser-first, offline third-person action MMORPG vertical slice. Babylon.js and its GLTF loader are vendored locally for static-host reliability. The runtime attempts WebGPU first and falls back to WebGL2.

## Run

Serve the repository root with any static server and open `/tora-online/`. A Vite scaffold is included:

```text
npm install
npm run dev
```

## Character asset pipeline

The shipped warrior, greatsword, mobs, and environment are procedural placeholders. To replace the warrior without changing JavaScript:

1. Put the rigged `.glb` in `assets/models/player/`.
2. Set `player` in `assets/models/manifest.json` to a page-relative URL such as `assets/models/player/tora-warrior.glb`.
3. Name animation groups with recognizable terms: `Idle`, `Walk`, `Run`, `Jump`, `JumpLoop`/`Fall`, `Land`, `Attack1`, `Attack2`, `Heavy`, `Skill`, `Hit`, and `Death`.

If the manifest, model, or loader fails, the game logs the reason and starts with the procedural fallback instead of hanging.

## Online boundary

`src/network/NetworkAdapter.js` currently runs local simulation only. Its input and snapshot events form the seam for a future authoritative WebSocket service; no fake remote players or simulated server claims are included.
