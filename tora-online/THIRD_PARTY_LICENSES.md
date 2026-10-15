# Third-party art and runtime licenses

Tora Online'ın oyun kodu, özgün ganimet GLB'si ve elle yazılmış menü/harita ikonları bu proje için üretildi. Aşağıdaki üçüncü taraf paketleri değiştirilmiş/optimize edilmiş biçimde yerel olarak dağıtılır.

## Quaternius — CC0 1.0

Creator: Quaternius. License: Creative Commons Zero v1.0 Universal (CC0-1.0). Attribution is not required, but included here for provenance.

- [Modular Character Outfits Fantasy](https://quaternius.com/packs/modularcharacteroutfitsfantasy.html): `female-ranger.glb`.
- Aynı paketin CC0 Standard sürümündeki ayrı `Female_Peasant.gltf` rigli kadın kıyafeti, `female-mage.glb` için temel alındı. Warrior/Ranger geometrisi Mage'e kopyalanmadı. Mage'e eklenen ağırlıklı pileli cübbe, omuz örtüsü, bronz şeritler, saç ve taç geometrileri bu proje için yazıldı. Tekrar üretim: `scripts/prepare-mage.mjs`. Orijinal kaynak arşivi yalnızca yerel `reports/revision-2026-10-12/asset-sources` dizinindedir; üretim paketinde bulunmaz.
- [Universal Base Characters Standard](https://quaternius.itch.io/universal-base-characters): `warrior-head.glb`; CC0 Standard arşivindeki rigli kadın modelinden baş/boyun, göz ve kaş meshleri ayrıldı; özgün iskelet ve skin korunup texturelar 1024 px ile sınırlandı.
- [Universal Animation Library](https://quaternius.com/packs/universalanimationlibrary.html): `ual1-standard.glb`.
- [Universal Animation Library 2](https://quaternius.com/packs/universalanimationlibrary2.html): `ual2-standard.glb`.
- `mage-library.glb`: bu iki CC0 kütüphanenin idle/run/spell/roll/hit/death/LayToIdle kliplerinden 17 sınıf eşleştirmesi çıkarıldı. Dokuz savaş state'i ayrı adlara sahip; bazı spell klipleri el/kol dönüşleri düzenlenerek varyantlaştırıldı. Bunlar özgün motion-capture kayıtları olarak sunulmaz. Mage baş/yüzü aynı CC0 Universal Base Characters kadın kafa geometrisini kullanır.
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

`assets/models/weapons/jade-staff.glb`: carved shaft, bronze collars/lotus crown and cut jade crystal are original procedural geometry, CC0-1.0. `scripts/prepare-mage.mjs` includes its reproducible source. The flame opacity texture, guard rune arcs and map marker shapes are original runtime canvas/geometry artwork, CC0-1.0. Mage spell sounds are original Web Audio synthesis; no third-party recording is used for those spell tones.

`assets/ui/portraits/mage.webp`, `assets/ui/mage-skills-atlas.webp` and `assets/ui/mage-items-atlas.webp` are original raster assets generated with the built-in OpenAI image generation tool, then resized/encoded with Sharp. Exact prompts and final file paths are recorded in `assets/ui/mage-art-prompts.json`. No Albion artwork, interface or icons were copied.

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

## Character and interface polish — 2026-10-15

- `warrior-hair.glb` (`Hair_Buns`) and `mage-hair.glb` (`Hair_Long`) use authored, UV-mapped, head-skinned hairstyles from Quaternius Universal Base Characters Standard, CC0-1.0. Source and license: https://quaternius.com/packs/universalbasecharacters.html and https://quaternius.itch.io/universal-base-characters. Original texture detail is retained at 1024 px, matching the face texture budget; color is lossless WebP, normals are PNG. Material tint gives chestnut Warrior hair and dark walnut Mage hair.
- The original Mage procedural crown/braid are hidden. The authored `Head` skin, inverse bind matrices, and animation channels move the replacement hair; no primitive hair geometry was added.
- The Ranger GLB retains its geometry and binary buffers. The actual hood surface is named as well as its grouping node because Babylon reparents skinned meshes to the rig. The companion face crop removes accidental shoulder/arm fragments.
- `warrior-1.glb` and `warrior-2.glb` retain the used CC0 animation tracks from the existing Universal Animation Libraries; unused animation samplers, accessors and reference mannequin surfaces are removed. Mage's right finger grip is sampled from the authored Sword_Idle clip while preserving its wrist/arm/spell motion.
- New equipment/status/check icons in `src/ui/Art.js` are original hand-authored SVG paths, CC0-1.0. No Albion graphics are used.

Reproduction: download the Standard archive linked above, extract locally, then run `node scripts/prepare-character-polish.mjs <extracted Standard directory>`. Original `ual1-standard.glb` and `ual2-standard.glb` remain development sources; the manifest ships the trimmed Warrior clips.

`assets/textures/characters/mage-brocade-source.png` is original Tora cloth artwork generated using the built-in `image_gen.imagegen` tool. The exact prompt and project paths are in `assets/textures/characters/generation.json`. `mage-brocade.webp` is its 1024 px game texture, embedded in the existing Mage GLB with cylindrical cloth UVs by `scripts/prepare-mage-textile.mjs`. The original rig, topology, skin weights and animation channels are retained. Build consumption uses the embedded GLB texture; no external service is required at runtime.
