# Project Gun asset credits

Project Gun keeps the runtime assets local so the game does not depend on a third-party CDN after deployment.

## FPS arms

- File: `assets/models/player/fps-arms.glb`
- Source: [WRAD ARMS](https://github.com/wwwriks/wrad-arms)
- Creator: wwwriks
- License: CC0 1.0 Universal
- Notes: rigged FPS viewmodel arms with finger, wrist, forearm and IK bones.

## Weapons

- Files: `assets/models/weapons/*.glb`
- Source bundle: [FPS Asset Kit / Flat Guns West](https://github.com/petroulacl/fps-asset-kit)
- Original source: OpenGameArt Flat Guns West
- License: CC0 1.0 Universal
- Used models: assault rifle, compact SMG, pump shotgun and compact pistol.

## Infected

- File: `assets/models/zombies/infected.glb`
- Original source: Quaternius Zombie Apocalypse Kit
- Retrieved from: [storm-apocalypse](https://github.com/mars-tw/storm-apocalypse)
- License: CC0 1.0 Universal
- Clips used: Idle, Walk, Run, Idle_Attack, HitReact and Death.

The procedural meshes in `game.js` are retained only as resilient fallbacks for failed or unsupported GLB loading. They are not presented as the production models.
