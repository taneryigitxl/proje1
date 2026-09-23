/**
 * Stylized painted 3D face — hides the hood MESH (not just the empty socket)
 * and attaches a painted head to the Head bone so features read in-game.
 *
 * GLB (female-ranger.glb) has NO separate face PNG/JPG — hood uses MI_Ranger.
 * Visible face is a separate material (`face-card-mat`) + DynamicTexture `face-paint`.
 * Mesh topology of the GLB is not modified.
 */
export class CharacterFace {
  static attach(scene, skeleton, skinnedMesh, root) {
    CharacterFace.#hideHood(root);
    const headBone = skeleton.bones.find((bone) => bone.name === "Head")
      || skeleton.bones.find((bone) => /head/i.test(bone.name));

    const faceRoot = new BABYLON.TransformNode("player-face-root", scene);
    const faceTex = CharacterFace.#paintFaceTexture(scene);

    // Dark-brown skin volume — silhouette only
    const skinMat = new BABYLON.StandardMaterial("face-skin-mat", scene);
    skinMat.diffuseColor = new BABYLON.Color3(0.42, 0.28, 0.18);
    skinMat.emissiveColor = new BABYLON.Color3(0.05, 0.03, 0.02);
    skinMat.specularColor = new BABYLON.Color3(0.08, 0.05, 0.03);
    skinMat.ambientColor = new BABYLON.Color3(0.28, 0.18, 0.12);

    // Separate face material (not body MI_Ranger) — high-contrast painted card
    const cardMat = new BABYLON.StandardMaterial("face-card-mat", scene);
    cardMat.diffuseTexture = faceTex;
    cardMat.emissiveTexture = faceTex;
    cardMat.diffuseTexture.level = 1.2;
    cardMat.emissiveTexture.level = 0.55;
    cardMat.diffuseColor = new BABYLON.Color3(1, 1, 1);
    cardMat.emissiveColor = new BABYLON.Color3(0.18, 0.12, 0.08);
    cardMat.specularColor = BABYLON.Color3.Black();
    cardMat.ambientColor = new BABYLON.Color3(0.45, 0.32, 0.22);
    cardMat.backFaceCulling = false;
    cardMat.transparencyMode = BABYLON.Material.MATERIAL_OPAQUE;

    const head = BABYLON.MeshBuilder.CreateSphere("face-head", { diameter: 0.28, segments: 24 }, scene);
    head.material = skinMat;
    head.parent = faceRoot;
    head.position.set(0, 0.02, -0.01);
    head.scaling.set(0.88, 1.08, 0.95);
    head.isPickable = false;

    const jaw = BABYLON.MeshBuilder.CreateSphere("face-jaw", { diameter: 0.17, segments: 16 }, scene);
    jaw.material = skinMat;
    jaw.parent = faceRoot;
    jaw.position.set(0, -0.055, 0.04);
    jaw.scaling.set(0.88, 0.58, 0.9);
    jaw.isPickable = false;

    for (const side of [-1, 1]) {
      const cheek = BABYLON.MeshBuilder.CreateSphere(`face-cheek-${side}`, { diameter: 0.09, segments: 12 }, scene);
      cheek.material = skinMat;
      cheek.parent = faceRoot;
      cheek.position.set(side * 0.07, -0.005, 0.07);
      cheek.scaling.set(0.65, 0.78, 0.68);
      cheek.isPickable = false;
    }

    // PRIMARY visible face: plane faces +Z (character forward). Unlit so the
    // portrait is not crushed into a dark blob by the hood shadow.
    cardMat.disableLighting = true;
    cardMat.emissiveTexture.level = 0.9;
    const faceCard = BABYLON.MeshBuilder.CreatePlane("face-card", { width: 0.26, height: 0.3 }, scene);
    faceCard.material = cardMat;
    faceCard.parent = faceRoot;
    faceCard.position.set(0, 0.02, 0.16);
    faceCard.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
    faceCard.isPickable = false;
    // Head stays a solid dark-brown volume. Spherical UVs smear the portrait into a blot.

    const noseMat = new BABYLON.StandardMaterial("face-nose-mat", scene);
    noseMat.diffuseColor = new BABYLON.Color3(0.48, 0.3, 0.2);
    noseMat.emissiveColor = new BABYLON.Color3(0.06, 0.03, 0.02);
    noseMat.specularColor = new BABYLON.Color3(0.1, 0.06, 0.04);
    const bridge = BABYLON.MeshBuilder.CreateSphere("face-nose-bridge", { diameter: 0.028, segments: 10 }, scene);
    bridge.material = noseMat;
    bridge.parent = faceRoot;
    bridge.position.set(0, 0.015, 0.15);
    bridge.scaling.set(0.45, 1.35, 1.0);
    bridge.isPickable = false;
    const tip = BABYLON.MeshBuilder.CreateSphere("face-nose-tip", { diameter: 0.032, segments: 10 }, scene);
    tip.material = noseMat;
    tip.parent = faceRoot;
    tip.position.set(0, -0.012, 0.162);
    tip.scaling.set(0.9, 0.7, 1.05);
    tip.isPickable = false;

    for (const side of [-1, 1]) CharacterFace.#eye(scene, faceRoot, side);

    const browMat = new BABYLON.StandardMaterial("face-brow-mat", scene);
    browMat.diffuseColor = new BABYLON.Color3(0.08, 0.04, 0.02);
    browMat.emissiveColor = new BABYLON.Color3(0.02, 0.01, 0.005);
    browMat.specularColor = BABYLON.Color3.Black();
    for (const side of [-1, 1]) {
      const brow = BABYLON.MeshBuilder.CreateBox(`face-brow-${side}`, { width: 0.06, height: 0.012, depth: 0.018 }, scene);
      brow.material = browMat;
      brow.parent = faceRoot;
      brow.position.set(side * 0.048, 0.072, 0.142);
      brow.rotation.z = side * -0.22;
      brow.isPickable = false;
    }

    const lipMat = new BABYLON.StandardMaterial("face-lip-mat", scene);
    lipMat.diffuseColor = new BABYLON.Color3(0.55, 0.22, 0.24);
    lipMat.emissiveColor = new BABYLON.Color3(0.08, 0.02, 0.02);
    lipMat.specularColor = new BABYLON.Color3(0.12, 0.05, 0.05);
    const upper = BABYLON.MeshBuilder.CreateSphere("face-lip-upper", { diameter: 0.052, segments: 10 }, scene);
    upper.material = lipMat;
    upper.parent = faceRoot;
    upper.position.set(0, -0.045, 0.145);
    upper.scaling.set(1.45, 0.3, 0.5);
    upper.isPickable = false;
    const lower = BABYLON.MeshBuilder.CreateSphere("face-lip-lower", { diameter: 0.05, segments: 10 }, scene);
    lower.material = lipMat;
    lower.parent = faceRoot;
    lower.position.set(0, -0.058, 0.142);
    lower.scaling.set(1.3, 0.36, 0.52);
    lower.isPickable = false;

    const hairMat = new BABYLON.StandardMaterial("face-hair-mat", scene);
    hairMat.diffuseColor = new BABYLON.Color3(0.12, 0.05, 0.02);
    hairMat.emissiveColor = new BABYLON.Color3(0.015, 0.008, 0.004);
    hairMat.specularColor = new BABYLON.Color3(0.04, 0.02, 0.01);
    const scalp = BABYLON.MeshBuilder.CreateSphere("face-scalp", { diameter: 0.3, segments: 18 }, scene);
    scalp.material = hairMat;
    scalp.parent = faceRoot;
    scalp.position.set(0, 0.08, -0.025);
    scalp.scaling.set(1.02, 0.68, 1.0);
    scalp.isPickable = false;

    // Light bang fringe — must not cover painted eyes
    const bangs = BABYLON.MeshBuilder.CreateSphere("face-bangs", { diameter: 0.18, segments: 14 }, scene);
    bangs.material = hairMat;
    bangs.parent = faceRoot;
    bangs.position.set(0, 0.095, 0.06);
    bangs.scaling.set(1.1, 0.28, 0.45);
    bangs.isPickable = false;

    for (const side of [-1, 1]) {
      const lock = BABYLON.MeshBuilder.CreateSphere(`face-lock-${side}`, { diameter: 0.12, segments: 12 }, scene);
      lock.material = hairMat;
      lock.parent = faceRoot;
      lock.position.set(side * 0.105, -0.04, 0.0);
      lock.scaling.set(0.65, 1.75, 0.72);
      lock.isPickable = false;
    }

    const pony = BABYLON.MeshBuilder.CreateSphere("face-pony", { diameter: 0.13, segments: 12 }, scene);
    pony.material = hairMat;
    pony.parent = faceRoot;
    pony.position.set(0, -0.06, -0.12);
    pony.scaling.set(0.75, 1.95, 0.85);
    pony.isPickable = false;

    for (const side of [-1, 1]) {
      const ear = BABYLON.MeshBuilder.CreateSphere(`face-ear-${side}`, { diameter: 0.05, segments: 10 }, scene);
      ear.material = skinMat;
      ear.parent = faceRoot;
      ear.position.set(side * 0.12, 0.01, -0.01);
      ear.scaling.set(0.4, 0.95, 0.65);
      ear.isPickable = false;
    }

    if (headBone && skinnedMesh) {
      faceRoot.attachToBone(headBone, skinnedMesh);
      faceRoot.position.set(0, 0.05, 0.12);
      faceRoot.rotation.set(0.05, 0, 0);
      faceRoot.scaling.setAll(1.1);
      console.info(`[Tora Face] Boyalı yüz '${headBone.name}' kemiğine bağlandı (hood mesh gizlendi).`);
    } else {
      faceRoot.parent = root;
      faceRoot.position.set(0, 1.58, 0.08);
      faceRoot.rotation.set(0.05, 0, 0);
      faceRoot.scaling.setAll(1.05);
      console.warn("[Tora Face] Head kemiği yok; yüz köke sabitlendi.");
    }
    return faceRoot;
  }

  /**
   * female-ranger.glb: Head_Hood socket owns mesh index 7, imported as `node7`
   * (skinned mesh reparented to Armature). Disabling the TransformNode alone
   * left the pale hood cavity; hide mesh `node7` + hood/helmet names.
   *
   * CRITICAL: never mutate mesh.material (MI_Ranger is shared by the whole outfit).
   * disableColorWrite on that material made the body clothing disappear.
   */
  static #hideHood(root) {
    const hide = (mesh) => {
      mesh.setEnabled(false);
      mesh.isVisible = false;
      mesh.visibility = 0;
    };
    root.getChildMeshes(false).forEach((mesh) => {
      const name = (mesh.name || "").toLowerCase();
      if (/^node7$/i.test(mesh.name) || /hood|helmet|mask|cowl/i.test(name)) {
        hide(mesh);
        console.info(`[Tora Face] Hood/kask gizlendi: ${mesh.name}`);
      }
    });
    root.getChildTransformNodes?.(false)?.forEach?.((node) => {
      const name = (node.name || "").toLowerCase();
      if (/hood|helmet|mask|head_hood/i.test(name)) {
        node.setEnabled(false);
        node.getChildMeshes?.(false)?.forEach?.(hide);
      }
    });
    root.getChildMeshes(false).forEach((mesh) => {
      const name = (mesh.name || "").toLowerCase();
      if (name.startsWith("face-")) return;
      if (/head|face|skull/i.test(name) && !name.includes("hair") && !name.includes("ear")) {
        hide(mesh);
        console.info(`[Tora Face] Ek kafa mesh gizlendi: ${mesh.name}`);
      }
    });

    // Repair shared body materials in case a prior session/build flipped color write off
    root.getChildMeshes(false).forEach((mesh) => {
      const mat = mesh.material;
      if (!mat) return;
      if (mat.disableColorWrite) mat.disableColorWrite = false;
      if (mat.disableDepthWrite) mat.disableDepthWrite = false;
    });
  }

  /**
   * Low-poly portrait for face-card — dark brown skin, bold eyes / brows / mouth.
   * No on-disk PNG; this DynamicTexture IS the face albedo.
   */
  static #paintFaceTexture(scene) {
    const size = 512;
    const tex = new BABYLON.DynamicTexture("face-paint", { width: size, height: size }, scene, false);
    const ctx = tex.getContext();
    const cx = size * 0.5;
    const cy = size * 0.5;

    // Dark brown skin base (#5a3a24 family) — never near-black blob, never white
    ctx.fillStyle = "#6b452c";
    ctx.fillRect(0, 0, size, size);
    const skin = ctx.createRadialGradient(cx, cy - 20, 30, cx, cy + 40, 280);
    skin.addColorStop(0, "#8a5a38");
    skin.addColorStop(0.45, "#6b452c");
    skin.addColorStop(0.85, "#4a2e1c");
    skin.addColorStop(1, "#3a2214");
    ctx.fillStyle = skin;
    ctx.fillRect(0, 0, size, size);

    // Cheek warmth
    ctx.fillStyle = "rgba(160, 70, 55, 0.35)";
    ctx.beginPath(); ctx.ellipse(cx - 78, cy + 48, 52, 30, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + 78, cy + 48, 52, 30, 0, 0, Math.PI * 2); ctx.fill();

    // Bold dark brows
    ctx.strokeStyle = "#1a0c06";
    ctx.lineWidth = 14;
    ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(cx - 110, cy - 55); ctx.quadraticCurveTo(cx - 55, cy - 88, cx - 12, cy - 52); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + 110, cy - 55); ctx.quadraticCurveTo(cx + 55, cy - 88, cx + 12, cy - 52); ctx.stroke();

    // Eyes — large white sclera, clear iris, dark pupil (readable at play distance)
    for (const side of [-1, 1]) {
      const ex = cx + side * 58;
      const ey = cy - 8;
      ctx.fillStyle = "#1a1008";
      ctx.beginPath(); ctx.ellipse(ex, ey, 40, 28, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#f5f6f8";
      ctx.beginPath(); ctx.ellipse(ex, ey, 34, 22, 0, 0, Math.PI * 2); ctx.fill();
      const iris = ctx.createRadialGradient(ex, ey, 2, ex, ey, 16);
      iris.addColorStop(0, "#7aafc4");
      iris.addColorStop(0.4, "#3d6a82");
      iris.addColorStop(0.75, "#243828");
      iris.addColorStop(1, "#121810");
      ctx.fillStyle = iris;
      ctx.beginPath(); ctx.arc(ex, ey, 15, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#050508";
      ctx.beginPath(); ctx.arc(ex, ey, 7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath(); ctx.arc(ex - 5, ey - 5, 4, 0, Math.PI * 2); ctx.fill();
      // Upper lid line
      ctx.strokeStyle = "#1a0c06";
      ctx.lineWidth = 5;
      ctx.beginPath(); ctx.ellipse(ex, ey - 4, 34, 22, 0, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
    }

    // Nose hint
    ctx.strokeStyle = "rgba(40, 22, 12, 0.75)";
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(cx, cy + 8); ctx.lineTo(cx - 10, cy + 48); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy + 8); ctx.lineTo(cx + 10, cy + 48); ctx.stroke();
    ctx.fillStyle = "rgba(90, 55, 35, 0.45)";
    ctx.beginPath(); ctx.ellipse(cx, cy + 42, 14, 10, 0, 0, Math.PI * 2); ctx.fill();

    // Clear mouth
    ctx.fillStyle = "#7a2834";
    ctx.beginPath(); ctx.ellipse(cx, cy + 95, 42, 14, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#5a1824";
    ctx.beginPath(); ctx.ellipse(cx, cy + 102, 34, 9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#2a0c12";
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(cx - 36, cy + 95); ctx.quadraticCurveTo(cx, cy + 108, cx + 36, cy + 95); ctx.stroke();

    // Thin hair fringe at very top only (does not cover eyes)
    const hair = ctx.createLinearGradient(0, 0, 0, 90);
    hair.addColorStop(0, "rgba(20, 10, 5, 0.95)");
    hair.addColorStop(0.7, "rgba(30, 14, 6, 0.35)");
    hair.addColorStop(1, "rgba(30, 14, 6, 0)");
    ctx.fillStyle = hair;
    ctx.fillRect(0, 0, size, 90);

    tex.hasAlpha = false;
    tex.update();
    return tex;
  }

  /** White sclera + iris + pupil — lit, high contrast. */
  static #eye(scene, parent, side) {
    const whiteMat = new BABYLON.StandardMaterial(`face-sclera-${side}`, scene);
    whiteMat.diffuseColor = new BABYLON.Color3(0.95, 0.95, 0.97);
    whiteMat.emissiveColor = new BABYLON.Color3(0.22, 0.22, 0.24);
    whiteMat.specularColor = new BABYLON.Color3(0.15, 0.15, 0.18);
    const sclera = BABYLON.MeshBuilder.CreateSphere(`face-sclera-${side}`, { diameter: 0.042, segments: 12 }, scene);
    sclera.material = whiteMat;
    sclera.parent = parent;
    sclera.position.set(side * 0.048, 0.032, 0.152);
    sclera.scaling.set(1.15, 0.85, 0.65);
    sclera.isPickable = false;

    const irisMat = new BABYLON.StandardMaterial(`face-iris-${side}`, scene);
    irisMat.diffuseColor = new BABYLON.Color3(0.3, 0.45, 0.5);
    irisMat.emissiveColor = new BABYLON.Color3(0.06, 0.09, 0.1);
    irisMat.specularColor = new BABYLON.Color3(0.12, 0.12, 0.14);
    const iris = BABYLON.MeshBuilder.CreateSphere(`face-iris-${side}`, { diameter: 0.022, segments: 10 }, scene);
    iris.material = irisMat;
    iris.parent = parent;
    iris.position.set(side * 0.048, 0.032, 0.168);
    iris.scaling.set(1, 1, 0.5);
    iris.isPickable = false;

    const pupilMat = new BABYLON.StandardMaterial(`face-pupil-${side}`, scene);
    pupilMat.diffuseColor = new BABYLON.Color3(0.03, 0.03, 0.04);
    pupilMat.emissiveColor = new BABYLON.Color3(0.01, 0.01, 0.01);
    pupilMat.specularColor = BABYLON.Color3.Black();
    const pupil = BABYLON.MeshBuilder.CreateSphere(`face-pupil-${side}`, { diameter: 0.011, segments: 8 }, scene);
    pupil.material = pupilMat;
    pupil.parent = parent;
    pupil.position.set(side * 0.048, 0.032, 0.174);
    pupil.isPickable = false;

    const hiMat = new BABYLON.StandardMaterial(`face-eye-hi-${side}`, scene);
    hiMat.diffuseColor = new BABYLON.Color3(1, 1, 1);
    hiMat.emissiveColor = new BABYLON.Color3(0.5, 0.5, 0.52);
    hiMat.specularColor = BABYLON.Color3.Black();
    const hi = BABYLON.MeshBuilder.CreateSphere(`face-eye-hi-${side}`, { diameter: 0.006, segments: 6 }, scene);
    hi.material = hiMat;
    hi.parent = parent;
    hi.position.set(side * 0.042, 0.038, 0.176);
    hi.isPickable = false;
  }
}
