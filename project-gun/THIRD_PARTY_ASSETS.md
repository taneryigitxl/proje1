# Project Gun asset credits

Project Gun keeps the runtime assets local so the game does not depend on a third-party CDN after deployment.

## Archived FPS arms

- File: `assets/models/player/fps-arms.glb`
- Source: [WRAD ARMS](https://github.com/wwwriks/wrad-arms)
- Creator: wwwriks
- License: CC0 1.0 Universal
- Notes: retained as a CC0 reference asset. The live first-person view now uses locally built, articulated tactical hands so grip contact is deterministic and does not hot-swap during play.

## Archived weapon source bundle

- Files: `assets/models/weapons/*.glb`
- Source bundle: [FPS Asset Kit / Flat Guns West](https://github.com/petroulacl/fps-asset-kit)
- Original source: OpenGameArt Flat Guns West
- License: CC0 1.0 Universal
- Used models: assault rifle, compact SMG, pump shotgun and compact pistol. These files remain as credited reference assets; the live viewmodels were replaced by the detailed local Babylon mesh set in `game.js`.

## Infected

- File: `assets/models/zombies/infected.glb`
- Original source: Quaternius Zombie Apocalypse Kit
- Retrieved from: [storm-apocalypse](https://github.com/mars-tw/storm-apocalypse)
- License: CC0 1.0 Universal
- Clips used: Idle, Walk, Run, Idle_Attack, HitReact and Death.

The animated infected GLB keeps a procedural fallback. First-person weapons and hands are production meshes built locally in `game.js`, avoiding runtime GLB swaps in the most latency-sensitive part of the scene.
