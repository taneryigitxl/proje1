/**
 * Compact realistic female face seated inside the ranger hood opening.
 * Hood stays visible — face is scaled down to fit the cavity.
 */
export class CharacterFace {
  static attach(scene, skeleton, skinnedMesh, root) {
    // Soften hood-face clash without fully removing the hood silhouette
    CharacterFace.#softenHoodFacePlate(root);
    const headBone = skeleton.bones.find((bone) => bone.name === "Head")
      || skeleton.bones.find((bone) => /head/i.test(bone.name));

    const faceRoot = new BABYLON.TransformNode("player-face-root", scene);

    const skinMat = new BABYLON.StandardMaterial("face-skin-mat", scene);
    skinMat.disableLighting = true;
    skinMat.emissiveColor = new BABYLON.Color3(0.94, 0.74, 0.62);
    skinMat.diffuseColor = skinMat.emissiveColor;
    skinMat.specularColor = BABYLON.Color3.Black();

    const head = BABYLON.MeshBuilder.CreateSphere("face-head", { diameter: 0.18, segments: 28 }, scene);
    head.material = skinMat;
    head.parent = faceRoot;
    head.position.set(0, 0.008, 0.035);
    head.scaling.set(0.88, 1.05, 0.9);
    head.isPickable = false;

    const jaw = BABYLON.MeshBuilder.CreateSphere("face-jaw", { diameter: 0.11, segments: 16 }, scene);
    jaw.material = skinMat;
    jaw.parent = faceRoot;
    jaw.position.set(0, -0.038, 0.05);
    jaw.scaling.set(0.88, 0.52, 0.85);
    jaw.isPickable = false;

    for (const side of [-1, 1]) {
      const cheek = BABYLON.MeshBuilder.CreateSphere(`face-cheek-${side}`, { diameter: 0.06, segments: 12 }, scene);
      cheek.material = skinMat;
      cheek.parent = faceRoot;
      cheek.position.set(side * 0.048, -0.002, 0.072);
      cheek.scaling.set(0.6, 0.75, 0.65);
      cheek.isPickable = false;
    }

    const noseMat = new BABYLON.StandardMaterial("face-nose-mat", scene);
    noseMat.disableLighting = true;
    noseMat.emissiveColor = new BABYLON.Color3(0.9, 0.7, 0.58);
    noseMat.diffuseColor = noseMat.emissiveColor;
    const bridge = BABYLON.MeshBuilder.CreateSphere("face-nose-bridge", { diameter: 0.022, segments: 10 }, scene);
    bridge.material = noseMat;
    bridge.parent = faceRoot;
    bridge.position.set(0, 0.014, 0.105);
    bridge.scaling.set(0.42, 1.35, 1.0);
    bridge.isPickable = false;
    const tip = BABYLON.MeshBuilder.CreateSphere("face-nose-tip", { diameter: 0.024, segments: 10 }, scene);
    tip.material = noseMat;
    tip.parent = faceRoot;
    tip.position.set(0, -0.008, 0.118);
    tip.scaling.set(0.9, 0.65, 1.0);
    tip.isPickable = false;

    for (const side of [-1, 1]) CharacterFace.#eye(scene, faceRoot, side);

    const browMat = new BABYLON.StandardMaterial("face-brow-mat", scene);
    browMat.disableLighting = true;
    browMat.emissiveColor = new BABYLON.Color3(0.18, 0.09, 0.04);
    browMat.diffuseColor = browMat.emissiveColor;
    for (const side of [-1, 1]) {
      const brow = BABYLON.MeshBuilder.CreateBox(`face-brow-${side}`, { width: 0.04, height: 0.007, depth: 0.012 }, scene);
      brow.material = browMat;
      brow.parent = faceRoot;
      brow.position.set(side * 0.032, 0.042, 0.1);
      brow.rotation.z = side * -0.18;
      brow.isPickable = false;
    }

    const lipMat = new BABYLON.StandardMaterial("face-lip-mat", scene);
    lipMat.disableLighting = true;
    lipMat.emissiveColor = new BABYLON.Color3(0.72, 0.28, 0.34);
    lipMat.diffuseColor = lipMat.emissiveColor;
    const upper = BABYLON.MeshBuilder.CreateSphere("face-lip-upper", { diameter: 0.036, segments: 10 }, scene);
    upper.material = lipMat;
    upper.parent = faceRoot;
    upper.position.set(0, -0.03, 0.1);
    upper.scaling.set(1.35, 0.26, 0.48);
    upper.isPickable = false;
    const lower = BABYLON.MeshBuilder.CreateSphere("face-lip-lower", { diameter: 0.034, segments: 10 }, scene);
    lower.material = lipMat;
    lower.parent = faceRoot;
    lower.position.set(0, -0.042, 0.098);
    lower.scaling.set(1.18, 0.3, 0.5);
    lower.isPickable = false;

    // Soft fringe under the hood — no oversized wig
    const hairMat = new BABYLON.StandardMaterial("face-hair-mat", scene);
    hairMat.disableLighting = true;
    hairMat.emissiveColor = new BABYLON.Color3(0.22, 0.1, 0.05);
    hairMat.diffuseColor = hairMat.emissiveColor;
    for (const side of [-1, 1]) {
      const bang = BABYLON.MeshBuilder.CreateSphere(`face-bang-${side}`, { diameter: 0.055, segments: 10 }, scene);
      bang.material = hairMat;
      bang.parent = faceRoot;
      bang.position.set(side * 0.055, 0.055, 0.055);
      bang.scaling.set(0.65, 0.45, 0.45);
      bang.isPickable = false;
    }

    for (const side of [-1, 1]) {
      const ear = BABYLON.MeshBuilder.CreateSphere(`face-ear-${side}`, { diameter: 0.032, segments: 8 }, scene);
      ear.material = skinMat;
      ear.parent = faceRoot;
      ear.position.set(side * 0.085, 0.008, -0.01);
      ear.scaling.set(0.35, 0.9, 0.55);
      ear.isPickable = false;
    }

    if (headBone && skinnedMesh) {
      faceRoot.attachToBone(headBone, skinnedMesh);
      // Nested into the hood cavity — readable from camera, not oversized
      faceRoot.position.set(0, 0.04, 0.085);
      faceRoot.rotation.set(-0.1, 0, 0);
      faceRoot.scaling.setAll(0.88);
      console.info(`[Tora Face] Küçük yüz '${headBone.name}' içinde, kapüşona oturtuldu.`);
    } else {
      faceRoot.parent = root;
      faceRoot.position.set(0, 1.55, 0.08);
      faceRoot.scaling.setAll(0.78);
      console.warn("[Tora Face] Head kemiği yok; yüz köke sabitlendi.");
    }
    return faceRoot;
  }

  static #softenHoodFacePlate(root) {
    const visit = (node) => {
      const name = (node.name || "").toLowerCase();
      // Only hide flat painted face plates / masks — keep the hood cloth
      if (name.includes("face_plate") || name.includes("faceplate") || (name.includes("mask") && !name.includes("hood"))) {
        if (typeof node.setEnabled === "function") node.setEnabled(false);
        if ("isVisible" in node) node.isVisible = false;
        if ("visibility" in node) node.visibility = 0;
      }
      (node.getChildren?.() || []).forEach(visit);
    };
    visit(root);
  }

  static #eye(scene, parent, side) {
    const whiteMat = new BABYLON.StandardMaterial(`face-sclera-${side}`, scene);
    whiteMat.disableLighting = true;
    whiteMat.emissiveColor = new BABYLON.Color3(0.96, 0.96, 0.98);
    whiteMat.diffuseColor = whiteMat.emissiveColor;
    const sclera = BABYLON.MeshBuilder.CreateSphere(`face-sclera-${side}`, { diameter: 0.028, segments: 14 }, scene);
    sclera.material = whiteMat;
    sclera.parent = parent;
    sclera.position.set(side * 0.03, 0.024, 0.11);
    sclera.scaling.set(1.05, 0.72, 0.5);
    sclera.isPickable = false;

    const irisMat = new BABYLON.StandardMaterial(`face-iris-${side}`, scene);
    irisMat.disableLighting = true;
    irisMat.emissiveColor = new BABYLON.Color3(0.22, 0.42, 0.38);
    irisMat.diffuseColor = irisMat.emissiveColor;
    const iris = BABYLON.MeshBuilder.CreateSphere(`face-iris-${side}`, { diameter: 0.016, segments: 12 }, scene);
    iris.material = irisMat;
    iris.parent = parent;
    iris.position.set(side * 0.03, 0.024, 0.122);
    iris.scaling.set(1, 1, 0.45);
    iris.isPickable = false;

    const pupilMat = new BABYLON.StandardMaterial(`face-pupil-${side}`, scene);
    pupilMat.disableLighting = true;
    pupilMat.emissiveColor = new BABYLON.Color3(0.02, 0.02, 0.03);
    pupilMat.diffuseColor = pupilMat.emissiveColor;
    const pupil = BABYLON.MeshBuilder.CreateSphere(`face-pupil-${side}`, { diameter: 0.008, segments: 8 }, scene);
    pupil.material = pupilMat;
    pupil.parent = parent;
    pupil.position.set(side * 0.03, 0.024, 0.128);
    pupil.isPickable = false;

    const hiMat = new BABYLON.StandardMaterial(`face-eye-hi-${side}`, scene);
    hiMat.disableLighting = true;
    hiMat.emissiveColor = BABYLON.Color3.White();
    hiMat.diffuseColor = BABYLON.Color3.White();
    const hi = BABYLON.MeshBuilder.CreateSphere(`face-eye-hi-${side}`, { diameter: 0.004, segments: 6 }, scene);
    hi.material = hiMat;
    hi.parent = parent;
    hi.position.set(side * 0.026, 0.028, 0.13);
    hi.isPickable = false;
  }
}
