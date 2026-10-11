# Third-party art and runtime licenses

Tora Online'ın özgün oyun kodu ve `assets/ui/parchment-minimap.png` görseli bu proje için üretildi. Aşağıdaki üçüncü taraf paketleri değiştirilmiş/optimize edilmiş biçimde yerel olarak dağıtılır.

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

## Build-time optimizer

The shipped GLB files were processed with [meshoptimizer/gltfpack](https://github.com/zeux/meshoptimizer) (MIT). The executable is not distributed with the game.

Yeni baş modeli hazırlama: @gltf-transform/core ve functions (MIT), Sharp (Apache-2.0); yalnızca geliştirme bağımlılıkları. Bütün assetler yerelden sunulur, çalışma anında üçüncü taraf indirme yapılmaz.
