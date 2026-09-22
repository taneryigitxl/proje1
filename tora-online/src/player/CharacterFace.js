/**
 * Stylized 3D face for the ranger — higher detail, painted skin, full features.
 * Hides Female_Ranger_Head_Hood and attaches to the Head bone.
 */
export class CharacterFace {
  static attach(scene, skeleton, skinnedMesh, root) {
    CharacterFace.#hideHood(root);
    const headBone = skeleton.bones.find((bone) => bone.name === "Head")
      || skeleton.bones.find((bone) => /head/i.test(bone.name));

    const faceRoot = new BABYLON.TransformNode("player-face-root", scene);
    const skinMat = CharacterFace.#skinMaterial(scene);
    const faceTex = CharacterFace.#paintFaceTexture(scene);
    skinMat.diffuseTexture = faceTex;
    skinMat.emissiveTexture = faceTex;
    skinMat.emissiveColor = new BABYLON.Color3(0.12, 0.09, 0.08);

    // Head volumes
    const cranium = BABYLON.MeshBuilder.CreateSphere("face-cranium", { diameter: 0.255, segments: 28 }, scene);
    cranium.material = skinMat;
    cranium.parent = faceRoot;
    cranium.position.set(0, 0.025, 0.015);
    cranium.scaling.set(0.9, 1.08, 0.98);
    cranium.isPickable = false;

    const cheekL = BABYLON.MeshBuilder.CreateSphere("face-cheek-l", { diameter: 0.09, segments: 12 }, scene);
    const cheekR = cheekL.clone("face-cheek-r");
    for (const [cheek, side] of [[cheekL, -1], [cheekR, 1]]) {
      cheek.material = skinMat;
      cheek.parent = faceRoot;
      cheek.position.set(side * 0.07, -0.01, 0.08);
      cheek.scaling.set(0.7, 0.85, 0.75);
      cheek.isPickable = false;
    }

    const jaw = BABYLON.MeshBuilder.CreateSphere("face-jaw", { diameter: 0.16, segments: 16 }, scene);
    jaw.material = skinMat;
    jaw.parent = faceRoot;
    jaw.position.set(0, -0.055, 0.05);
    jaw.scaling.set(0.88, 0.65, 0.95);
    jaw.isPickable = false;

    // Nose bridge + tip
    const noseMat = CharacterFace.#skinMaterial(scene, "face-nose-mat");
    noseMat.diffuseColor = new BABYLON.Color3(0.88, 0.68, 0.55);
    const bridge = BABYLON.MeshBuilder.CreateSphere("face-nose-bridge", { diameter: 0.028, segments: 10 }, scene);
    bridge.material = noseMat;
    bridge.parent = faceRoot;
    bridge.position.set(0, 0.015, 0.132);
    bridge.scaling.set(0.55, 1.4, 1.1);
    bridge.isPickable = false;
    const tip = BABYLON.MeshBuilder.CreateSphere("face-nose-tip", { diameter: 0.032, segments: 10 }, scene);
    tip.material = noseMat;
    tip.parent = faceRoot;
    tip.position.set(0, -0.012, 0.148);
    tip.scaling.set(0.9, 0.75, 1.1);
    tip.isPickable = false;

    for (const side of [-1, 1]) CharacterFace.#eye(scene, faceRoot, side);

    const browMat = new BABYLON.StandardMaterial("face-brow-mat", scene);
    browMat.diffuseColor = new BABYLON.Color3(0.16, 0.09, 0.05);
    browMat.specularColor = BABYLON.Color3.Black();
    for (const side of [-1, 1]) {
      const brow = BABYLON.MeshBuilder.CreateBox(`face-brow-${side}`, { width: 0.052, height: 0.009, depth: 0.016 }, scene);
      brow.material = browMat;
      brow.parent = faceRoot;
      brow.position.set(side * 0.046, 0.058, 0.128);
      brow.rotation.z = side * -0.22;
      brow.isPickable = false;
    }

    const lipMat = new BABYLON.StandardMaterial("face-lip-mat", scene);
    lipMat.diffuseColor = new BABYLON.Color3(0.7, 0.3, 0.34);
    lipMat.specularColor = new BABYLON.Color3(0.25, 0.12, 0.12);
    const upper = BABYLON.MeshBuilder.CreateSphere("face-lip-upper", { diameter: 0.048, segments: 10 }, scene);
    upper.material = lipMat;
    upper.parent = faceRoot;
    upper.position.set(0, -0.042, 0.128);
    upper.scaling.set(1.4, 0.28, 0.5);
    upper.isPickable = false;
    const lower = BABYLON.MeshBuilder.CreateSphere("face-lip-lower", { diameter: 0.046, segments: 10 }, scene);
    lower.material = lipMat;
    lower.parent = faceRoot;
    lower.position.set(0, -0.055, 0.126);
    lower.scaling.set(1.25, 0.32, 0.55);
    lower.isPickable = false;

    // Hair
    const hairMat = new BABYLON.StandardMaterial("face-hair-mat", scene);
    hairMat.diffuseColor = new BABYLON.Color3(0.22, 0.1, 0.06);
    hairMat.specularColor = new BABYLON.Color3(0.06, 0.04, 0.02);
    const scalp = BABYLON.MeshBuilder.CreateSphere("face-scalp", { diameter: 0.27, segments: 18 }, scene);
    scalp.material = hairMat;
    scalp.parent = faceRoot;
    scalp.position.set(0, 0.07, -0.01);
    scalp.scaling.set(1.02, 0.7, 1.0);
    scalp.isPickable = false;

    const bangs = BABYLON.MeshBuilder.CreateSphere("face-bangs", { diameter: 0.2, segments: 14 }, scene);
    bangs.material = hairMat;
    bangs.parent = faceRoot;
    bangs.position.set(0, 0.07, 0.08);
    bangs.scaling.set(1.15, 0.4, 0.55);
    bangs.isPickable = false;

    for (const side of [-1, 1]) {
      const lock = BABYLON.MeshBuilder.CreateSphere(`face-lock-${side}`, { diameter: 0.12, segments: 12 }, scene);
      lock.material = hairMat;
      lock.parent = faceRoot;
      lock.position.set(side * 0.1, -0.04, 0.0);
      lock.scaling.set(0.65, 1.7, 0.75);
      lock.isPickable = false;
    }

    const pony = BABYLON.MeshBuilder.CreateSphere("face-pony", { diameter: 0.13, segments: 12 }, scene);
    pony.material = hairMat;
    pony.parent = faceRoot;
    pony.position.set(0, -0.06, -0.12);
    pony.scaling.set(0.75, 1.9, 0.85);
    pony.isPickable = false;

    for (const side of [-1, 1]) {
      const ear = BABYLON.MeshBuilder.CreateSphere(`face-ear-${side}`, { diameter: 0.048, segments: 10 }, scene);
      ear.material = skinMat;
      ear.parent = faceRoot;
      ear.position.set(side * 0.118, 0.015, -0.005);
      ear.scaling.set(0.4, 0.95, 0.65);
      ear.isPickable = false;
    }

    if (headBone && skinnedMesh) {
      faceRoot.attachToBone(headBone, skinnedMesh);
      faceRoot.position.set(0, 0.11, 0.055);
      faceRoot.rotation.set(0.06, 0, 0);
      faceRoot.scaling.setAll(1.08);
      console.info(`[Tora Face] Detaylı yüz '${headBone.name}' kemiğine bağlandı.`);
    } else {
      faceRoot.parent = root;
      faceRoot.position.set(0, 1.58, 0.08);
      console.warn("[Tora Face] Head kemiği yok; yüz köke sabitlendi.");
    }
    return faceRoot;
  }

  static #hideHood(root) {
    const visit = (node) => {
      const name = (node.name || "").toLowerCase();
      if (name.includes("hood") || name.includes("head_hood") || name.includes("helmet") || name.includes("mask")) {
        if (typeof node.setEnabled === "function") node.setEnabled(false);
        if ("isVisible" in node) node.isVisible = false;
        console.info(`[Tora Face] Hood gizlendi: ${node.name}`);
      }
      (node.getChildren?.() || []).forEach(visit);
    };
    visit(root);
    root.getChildMeshes?.(false)?.forEach((mesh) => {
      const name = (mesh.name || "").toLowerCase();
      if (name.includes("hood") || name.includes("head_hood") || name.includes("helmet")) {
        mesh.setEnabled(false);
        mesh.isVisible = false;
      }
    });
  }

  static #skinMaterial(scene, name = "face-skin-mat") {
    const mat = new BABYLON.StandardMaterial(name, scene);
    mat.diffuseColor = new BABYLON.Color3(0.94, 0.78, 0.66);
    mat.specularColor = new BABYLON.Color3(0.2, 0.14, 0.12);
    mat.ambientColor = new BABYLON.Color3(0.4, 0.32, 0.28);
    return mat;
  }

  static #paintFaceTexture(scene) {
    const size = 256;
    const tex = new BABYLON.DynamicTexture("face-paint", { width: size, height: size }, scene, false);
    const ctx = tex.getContext();
    const grad = ctx.createRadialGradient(128, 118, 16, 128, 130, 145);
    grad.addColorStop(0, "#f3d0b4");
    grad.addColorStop(0.5, "#e4b48e");
    grad.addColorStop(1, "#c88866");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = "rgba(230, 120, 130, 0.32)";
    ctx.beginPath(); ctx.ellipse(76, 152, 30, 18, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(180, 152, 30, 18, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(150, 85, 55, 0.4)";
    for (const [x, y] of [[96, 146], [108, 154], [158, 148], [172, 156], [128, 162], [118, 150]]) {
      ctx.beginPath(); ctx.arc(x, y, 1.5, 0, Math.PI * 2); ctx.fill();
    }
    tex.update();
    return tex;
  }

  static #eye(scene, parent, side) {
    const whiteMat = new BABYLON.StandardMaterial(`face-sclera-${side}`, scene);
    whiteMat.diffuseColor = new BABYLON.Color3(0.97, 0.97, 0.99);
    whiteMat.specularColor = new BABYLON.Color3(0.45, 0.45, 0.5);
    const sclera = BABYLON.MeshBuilder.CreateSphere(`face-sclera-${side}`, { diameter: 0.04, segments: 14 }, scene);
    sclera.material = whiteMat;
    sclera.parent = parent;
    sclera.position.set(side * 0.046, 0.03, 0.134);
    sclera.scaling.set(1.1, 0.82, 0.68);
    sclera.isPickable = false;

    const irisMat = new BABYLON.StandardMaterial(`face-iris-${side}`, scene);
    irisMat.diffuseColor = new BABYLON.Color3(0.22, 0.42, 0.52);
    irisMat.emissiveColor = new BABYLON.Color3(0.04, 0.08, 0.12);
    const iris = BABYLON.MeshBuilder.CreateSphere(`face-iris-${side}`, { diameter: 0.022, segments: 12 }, scene);
    iris.material = irisMat;
    iris.parent = parent;
    iris.position.set(side * 0.046, 0.03, 0.15);
    iris.scaling.set(1, 1, 0.55);
    iris.isPickable = false;

    const pupilMat = new BABYLON.StandardMaterial(`face-pupil-${side}`, scene);
    pupilMat.diffuseColor = BABYLON.Color3.Black();
    pupilMat.emissiveColor = new BABYLON.Color3(0.02, 0.02, 0.02);
    const pupil = BABYLON.MeshBuilder.CreateSphere(`face-pupil-${side}`, { diameter: 0.011, segments: 8 }, scene);
    pupil.material = pupilMat;
    pupil.parent = parent;
    pupil.position.set(side * 0.046, 0.03, 0.156);
    pupil.isPickable = false;

    const hiMat = new BABYLON.StandardMaterial(`face-eye-hi-${side}`, scene);
    hiMat.diffuseColor = BABYLON.Color3.White();
    hiMat.emissiveColor = BABYLON.Color3.White();
    const hi = BABYLON.MeshBuilder.CreateSphere(`face-eye-hi-${side}`, { diameter: 0.006, segments: 6 }, scene);
    hi.material = hiMat;
    hi.parent = parent;
    hi.position.set(side * 0.04, 0.036, 0.159);
    hi.isPickable = false;
  }
}
