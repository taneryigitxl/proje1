/**
 * Procedural stylized 3D face for the ranger — painted DynamicTexture + soft meshes.
 * Attaches to Head bone; hides the stock hood mesh so the face reads clearly.
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
    skinMat.emissiveColor = new BABYLON.Color3(0.18, 0.14, 0.12);

    // Cranial volume
    const cranium = BABYLON.MeshBuilder.CreateSphere("face-cranium", { diameter: 0.26, segments: 24 }, scene);
    cranium.material = skinMat;
    cranium.parent = faceRoot;
    cranium.position.set(0, 0.02, 0.02);
    cranium.scaling.set(0.92, 1.05, 0.95);
    cranium.isPickable = false;

    // Soft jaw / chin
    const jaw = BABYLON.MeshBuilder.CreateSphere("face-jaw", { diameter: 0.18, segments: 16 }, scene);
    jaw.material = skinMat;
    jaw.parent = faceRoot;
    jaw.position.set(0, -0.05, 0.04);
    jaw.scaling.set(0.85, 0.7, 0.9);
    jaw.isPickable = false;

    // Nose
    const noseMat = CharacterFace.#skinMaterial(scene, "face-nose-mat");
    noseMat.diffuseColor = new BABYLON.Color3(0.9, 0.7, 0.58);
    const nose = BABYLON.MeshBuilder.CreateSphere("face-nose", { diameter: 0.045, segments: 10 }, scene);
    nose.material = noseMat;
    nose.parent = faceRoot;
    nose.position.set(0, 0.0, 0.145);
    nose.scaling.set(0.7, 1.15, 1.35);
    nose.isPickable = false;

    // Eyes (sclera + iris + pupil)
    for (const side of [-1, 1]) {
      CharacterFace.#eye(scene, faceRoot, side);
    }

    // Brows
    const browMat = new BABYLON.StandardMaterial("face-brow-mat", scene);
    browMat.diffuseColor = new BABYLON.Color3(0.18, 0.1, 0.06);
    browMat.specularColor = BABYLON.Color3.Black();
    for (const side of [-1, 1]) {
      const brow = BABYLON.MeshBuilder.CreateBox(`face-brow-${side}`, { width: 0.055, height: 0.01, depth: 0.018 }, scene);
      brow.material = browMat;
      brow.parent = faceRoot;
      brow.position.set(side * 0.048, 0.055, 0.125);
      brow.rotation.z = side * -0.18;
      brow.isPickable = false;
    }

    // Lips
    const lipMat = new BABYLON.StandardMaterial("face-lip-mat", scene);
    lipMat.diffuseColor = new BABYLON.Color3(0.72, 0.32, 0.36);
    lipMat.specularColor = new BABYLON.Color3(0.2, 0.1, 0.1);
    const lips = BABYLON.MeshBuilder.CreateSphere("face-lips", { diameter: 0.055, segments: 10 }, scene);
    lips.material = lipMat;
    lips.parent = faceRoot;
    lips.position.set(0, -0.048, 0.125);
    lips.scaling.set(1.35, 0.35, 0.55);
    lips.isPickable = false;

    // Hair — layered soft volumes
    const hairMat = new BABYLON.StandardMaterial("face-hair-mat", scene);
    hairMat.diffuseColor = new BABYLON.Color3(0.28, 0.14, 0.08);
    hairMat.specularColor = new BABYLON.Color3(0.08, 0.05, 0.03);
    hairMat.roughness = 0.9;
    const bangs = BABYLON.MeshBuilder.CreateSphere("face-bangs", { diameter: 0.28, segments: 16 }, scene);
    bangs.material = hairMat;
    bangs.parent = faceRoot;
    bangs.position.set(0, 0.08, 0.02);
    bangs.scaling.set(1.05, 0.55, 0.95);
    bangs.isPickable = false;

    for (const side of [-1, 1]) {
      const sideHair = BABYLON.MeshBuilder.CreateSphere(`face-side-hair-${side}`, { diameter: 0.14, segments: 12 }, scene);
      sideHair.material = hairMat;
      sideHair.parent = faceRoot;
      sideHair.position.set(side * 0.11, -0.02, -0.02);
      sideHair.scaling.set(0.7, 1.6, 0.85);
      sideHair.isPickable = false;
    }

    const ponytail = BABYLON.MeshBuilder.CreateSphere("face-ponytail", { diameter: 0.12, segments: 12 }, scene);
    ponytail.material = hairMat;
    ponytail.parent = faceRoot;
    ponytail.position.set(0, -0.02, -0.12);
    ponytail.scaling.set(0.8, 1.8, 0.9);
    ponytail.isPickable = false;

    // Ears
    for (const side of [-1, 1]) {
      const ear = BABYLON.MeshBuilder.CreateSphere(`face-ear-${side}`, { diameter: 0.05, segments: 8 }, scene);
      ear.material = skinMat;
      ear.parent = faceRoot;
      ear.position.set(side * 0.12, 0.01, 0.0);
      ear.scaling.set(0.45, 0.9, 0.7);
      ear.isPickable = false;
    }

    if (headBone && skinnedMesh) {
      faceRoot.attachToBone(headBone, skinnedMesh);
      // Tuned for Quaternius modular Head bone local space
      faceRoot.position.set(0, 0.12, 0.06);
      faceRoot.rotation.set(0.08, 0, 0);
      faceRoot.scaling.setAll(1.05);
      console.info(`[Tora Face] Stilize yüz '${headBone.name}' kemiğine bağlandı.`);
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
        console.info(`[Tora Face] Hood/kask gizlendi: ${node.name}`);
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
    mat.diffuseColor = new BABYLON.Color3(0.93, 0.76, 0.64);
    mat.specularColor = new BABYLON.Color3(0.18, 0.12, 0.1);
    mat.ambientColor = new BABYLON.Color3(0.35, 0.28, 0.24);
    return mat;
  }

  static #paintFaceTexture(scene) {
    const size = 256;
    const tex = new BABYLON.DynamicTexture("face-paint", { width: size, height: size }, scene, false);
    const ctx = tex.getContext();
    // Base skin
    const grad = ctx.createRadialGradient(128, 120, 20, 128, 130, 140);
    grad.addColorStop(0, "#f0c9a8");
    grad.addColorStop(0.55, "#e0ad88");
    grad.addColorStop(1, "#c98a68");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    // Cheek blush
    ctx.fillStyle = "rgba(220, 110, 120, 0.28)";
    ctx.beginPath(); ctx.ellipse(78, 150, 28, 16, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(178, 150, 28, 16, 0, 0, Math.PI * 2); ctx.fill();
    // Soft freckles
    ctx.fillStyle = "rgba(160, 90, 60, 0.35)";
    for (const [x, y] of [[95, 145], [105, 152], [160, 148], [170, 155], [128, 160]]) {
      ctx.beginPath(); ctx.arc(x, y, 1.6, 0, Math.PI * 2); ctx.fill();
    }
    tex.update();
    return tex;
  }

  static #eye(scene, parent, side) {
    const whiteMat = new BABYLON.StandardMaterial(`face-sclera-${side}`, scene);
    whiteMat.diffuseColor = new BABYLON.Color3(0.95, 0.95, 0.97);
    whiteMat.specularColor = new BABYLON.Color3(0.4, 0.4, 0.45);
    const sclera = BABYLON.MeshBuilder.CreateSphere(`face-sclera-${side}`, { diameter: 0.042, segments: 12 }, scene);
    sclera.material = whiteMat;
    sclera.parent = parent;
    sclera.position.set(side * 0.048, 0.028, 0.132);
    sclera.scaling.set(1.05, 0.85, 0.7);
    sclera.isPickable = false;

    const irisMat = new BABYLON.StandardMaterial(`face-iris-${side}`, scene);
    irisMat.diffuseColor = new BABYLON.Color3(0.25, 0.45, 0.55);
    irisMat.emissiveColor = new BABYLON.Color3(0.05, 0.1, 0.14);
    const iris = BABYLON.MeshBuilder.CreateSphere(`face-iris-${side}`, { diameter: 0.024, segments: 10 }, scene);
    iris.material = irisMat;
    iris.parent = parent;
    iris.position.set(side * 0.048, 0.028, 0.148);
    iris.scaling.set(1, 1, 0.6);
    iris.isPickable = false;

    const pupilMat = new BABYLON.StandardMaterial(`face-pupil-${side}`, scene);
    pupilMat.diffuseColor = BABYLON.Color3.Black();
    pupilMat.emissiveColor = new BABYLON.Color3(0.02, 0.02, 0.02);
    const pupil = BABYLON.MeshBuilder.CreateSphere(`face-pupil-${side}`, { diameter: 0.012, segments: 8 }, scene);
    pupil.material = pupilMat;
    pupil.parent = parent;
    pupil.position.set(side * 0.048, 0.028, 0.155);
    pupil.isPickable = false;

    // Highlight
    const hiMat = new BABYLON.StandardMaterial(`face-eye-hi-${side}`, scene);
    hiMat.diffuseColor = BABYLON.Color3.White();
    hiMat.emissiveColor = BABYLON.Color3.White();
    const hi = BABYLON.MeshBuilder.CreateSphere(`face-eye-hi-${side}`, { diameter: 0.006, segments: 6 }, scene);
    hi.material = hiMat;
    hi.parent = parent;
    hi.position.set(side * 0.042, 0.035, 0.158);
    hi.isPickable = false;
  }
}
