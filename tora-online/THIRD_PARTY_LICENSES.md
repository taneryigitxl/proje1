# Third-party art and runtime licenses

Tora Online'ın özgün oyun kodu ve `assets/ui/parchment-minimap.png` görseli bu proje için üretildi. Ganimet kesesi ayrı bir model dosyası değildir: `GlbLoot` içindeki lathe geometrisi bu proje için yazıldı, üçüncü taraf bir `loot-bag.glb` kullanılmaz. Menü ikonları da aynı şekilde elle yazılmış SVG yollarıdır. Aşağıdaki üçüncü taraf paketleri değiştirilmiş/optimize edilmiş biçimde yerel olarak dağıtılır.

## Quaternius — CC0 1.0

Creator: Quaternius. License: Creative Commons Zero v1.0 Universal (CC0-1.0). Attribution is not required, but included here for provenance.

- [Modular Character Outfits Fantasy](https://quaternius.com/packs/modularcharacteroutfitsfantasy.html): `female-ranger.glb`.
- [Universal Base Characters Standard](https://quaternius.itch.io/universal-base-characters): `warrior-head.glb`; CC0 Standard arşivindeki rigli kadın modelinden baş/boyun, göz ve kaş meshleri ayrıldı; özgün iskelet ve skin korunup texturelar 1024 px ile sınırlandı.
- [Universal Animation Library](https://quaternius.com/packs/universalanimationlibrary.html): `ual1-standard.glb`.
- [Universal Animation Library 2](https://quaternius.com/packs/universalanimationlibrary2.html): `ual2-standard.glb`.
- [Ultimate Modular Women](https://quaternius.com/packs/ultimatemodularcharacters.html): `village-blacksmith.glb`.
- [Ultimate Monsters](https://quaternius.com/packs/ultimatemonsters.html): `ashen-demon.glb`, `skull-orc.glb`, `ghost.glb`. Kül Muhafızı aynı ork modelini farklı ölçek ve savaş değerleriyle kullanır.
- [Stylized Nature MegaKit](https://quaternius.com/packs/stylizednaturemegakit.html): trees, bushes, grass, ferns and rocks under `assets/models/nature/`.
- [Medieval Village MegaKit](https://quaternius.com/packs/medievalvillagemegakit.html): modular buildings, ruins, stairs, fences and wagon.
- [Fantasy Props MegaKit](https://quaternius.com/packs/fantasypropsmegakit.html): greatsword, blacksmith, market, storage and torch props.

Ghost indirme kaynağı: [CC0 paketi aynası](https://github.com/ilrein/warptracker/blob/main/public/models/ghost.glb); [ayna kaynak/lisans kaydı](https://github.com/ilrein/warptracker/blob/main/ASSETS.md).

Full CC0 text: https://creativecommons.org/publicdomain/zero/1.0/legalcode

## Poly Haven — CC0 1.0

Creator: Poly Haven. License: CC0-1.0.

- [Forest Ground 04](https://polyhaven.com/a/forest_ground_04): forest albedo, OpenGL normal and roughness maps.
- [Brown Mud Dry](https://polyhaven.com/a/brown_mud_dry): road albedo, OpenGL normal and roughness maps.
- [Mossy Rock](https://polyhaven.com/a/mossy_rock): stone albedo, OpenGL normal and roughness maps.

- [Cobblestone Floor 03](https://polyhaven.com/a/cobblestone_floor_03): köy/harabe taş döşemesi; 1K albedo, OpenGL normal, roughness.
- [Aerial Grass Rock](https://polyhaven.com/a/aerial_grass_rock): çimenli arazi; 1K albedo, OpenGL normal, roughness.

## Babylon.js — Apache-2.0

`vendor/babylon.js` and `vendor/babylonjs.loaders.min.js` are local distributions of Babylon.js, licensed under Apache License 2.0: https://www.apache.org/licenses/LICENSE-2.0

## Original interface and loot assets — 2026-10-12

`assets/models/props/loot-bag.glb` is an original pleated leather pouch with drawstring, knot and hanging cord geometry, created for Tora Online. It contains no third-party geometry, imagery or textures. Its reproducible source is `scripts/prepare-loot.mjs`; the generated model is dedicated under CC0-1.0. The nine hand-authored menu SVG paths in `src/ui/HUD.js`, ground movement rune and map marker shapes are original project artwork, also CC0-1.0. No artwork from another game is included.

Generation libraries: @gltf-transform/core and @gltf-transform/functions, MIT (development only).

## Build-time optimizer (existing assets)

The shipped GLB files were processed with [meshoptimizer/gltfpack](https://github.com/zeux/meshoptimizer) (MIT). The executable is not distributed with the game.

Yeni baş modeli hazırlama: @gltf-transform/core ve functions (MIT), Sharp (Apache-2.0); yalnızca geliştirme bağımlılıkları. Bütün assetler yerelden sunulur, çalışma anında üçüncü taraf indirme yapılmaz.

## 2026 visual and audio update

- UI skill/item atlases, warrior/Ayame/guardian portraits and combat VFX: original assets generated with OpenAI image generation. Exact prompts are in assets/ui/art-prompts.json.
- Poly Haven pine_sapling_medium, tree_small_02 and rock_moss_set_01: CC0, https://polyhaven.com/license. Models were isolated, centered and reduced to approximately 2,700–20,300 vertices depending on object. Dense leaf/needle geometry was replaced by crossed alpha foliage cards sampled from the original model, using the original diffuse and alpha textures; branches remain mesh geometry, with 1K PBR textures. Sources: https://polyhaven.com/a/pine_sapling_medium, https://polyhaven.com/a/tree_small_02, https://polyhaven.com/a/rock_moss_set_01.
- Kenney RPG Audio: CC0. https://kenney.nl/assets/rpg-audio. Selected footsteps, knife slices, chop, metal pot and UI metal click, unchanged OGG.
- Forest Ambience music: TinyWorlds, CC0. https://opengameart.org/content/forest-ambience. Unchanged MP3.
- Stream and wind recordings: Blender Foundation, YoFrankie! project; uploaded by Lamoot; CC-BY 3.0, https://creativecommons.org/licenses/by/3.0/. https://opengameart.org/content/ambient-mountain-river-wind-and-forest-and-waterfall. Unchanged FLAC (amb_stream.flac and amb_wind_1.flac).
