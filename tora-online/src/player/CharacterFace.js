/**
 * Full hood-cavity face — larger 3D head that fills the ranger hood opening.
 */
export class CharacterFace {
  static attach(scene, skeleton, skinnedMesh, root) {
    CharacterFace.#softenHoodFacePlate(root);
    const headBone = skeleton.bones.find((bone) => bone.name === "Head")
      || skeleton.bones.find((bone) => /head/i.test(bone.name));

    const faceRoot = new BABYLON.TransformNode("player-face-root", scene);

    const skinMat = new BABYLON.StandardMaterial("face-skin-mat", scene);
    skinMat.disableLighting = true;
    skinMat.emissiveColor = new BABYLON.Color3(0.93, 0.72, 0.6);
    skinMat.diffuseColor = skinMat.emissiveColor;
    skinMat.specularColor = BABYLON.Color3.Black();

    // Larger skull fills the hood opening
    const head = BABYLON.MeshBuilder.CreateSphere("face-head", { diameter: 0.26, segments: 28 }, scene);
    head.material = skinMat;
    head.parent = faceRoot;
    head.position.set(0, 0.01, 0.04);
    head.scaling.set(0.92, 1.08, 0.95);
    head.isPickable = false;

    const jaw = BABYLON.MeshBuilder.CreateSphere("face-jaw", { diameter: 0.15, segments: 16 }, scene);
    jaw.material = skinMat;
    jaw.parent = faceRoot;
    jaw.position.set(0, -0.055, 0.06);
    jaw.scaling.set(0.9, 0.55, 0.88);
    jaw.isPickable = false;

    for (const side of [-1, 1]) {
      const cheek = BABYLON.MeshBuilder.CreateSphere(`face-cheek-${side}`, { diameter: 0.08, segments: 12 }, scene);
      cheek.material = skinMat;
      cheek.parent = faceRoot;
      cheek.position.set(side * 0.068, -0.005, 0.085);
      cheek.scaling.set(0.65, 0.8, 0.7);
      cheek.isPickable = false;
    }

    const forehead = BABYLON.MeshBuilder.CreateSphere("face-forehead", { diameter: 0.14, segments: 14 }, scene);
    forehead.material = skinMat;
    forehead.parent = faceRoot;
    forehead.position.set(0, 0.07, 0.07);
    forehead.scaling.set(1.05, 0.55, 0.7);
    forehead.isPickable = false;

    const noseMat = new BABYLON.StandardMaterial("face-nose-mat", scene);
    noseMat.disableLighting = true;
    noseMat.emissiveColor = new BABYLON.Color3(0.88, 0.68, 0.56);
    noseMat.diffuseColor = noseMat.emissiveColor;
    const bridge = BABYLON.MeshBuilder.CreateSphere("face-nose-bridge", { diameter: 0.03, segments: 10 }, scene);
    bridge.material = noseMat;
    bridge.parent = faceRoot;
    bridge.position.set(0, 0.018, 0.13);
    bridge.scaling.set(0.45, 1.4, 1.05);
    bridge.isPickable = false;
    const tip = BABYLON.MeshBuilder.CreateSphere("face-nose-tip", { diameter: 0.032, segments: 10 }, scene);
    tip.material = noseMat;
    tip.parent = faceRoot;
    tip.position.set(0, -0.012, 0.145);
    tip.scaling.set(0.95, 0.7, 1.05);
    tip.isPickable = false;

    for (const side of [-1, 1]) CharacterFace.#eye(scene, faceRoot, side);

    const browMat = new BABYLON.StandardMaterial("face-brow-mat", scene);
    browMat.disableLighting = true;
    browMat.emissiveColor = new BABYLON.Color3(0.16, 0.08, 0.04);
    browMat.diffuseColor = browMat.emissiveColor;
    for (const side of [-1, 1]) {
      const brow = BABYLON.MeshBuilder.CreateBox(`face-brow-${side}`, { width: 0.055, height: 0.01, depth: 0.016 }, scene);
      brow.material = browMat;
      brow.parent = faceRoot;
      brow.position.set(side * 0.042, 0.055, 0.122);
      brow.rotation.z = side * -0.2;
      brow.isPickable = false;
    }

    const lipMat = new BABYLON.StandardMaterial("face-lip-mat", scene);
    lipMat.disableLighting = true;
    lipMat.emissiveColor = new BABYLON.Color3(0.7, 0.26, 0.32);
    lipMat.diffuseColor = lipMat.emissiveColor;
    const upper = BABYLON.MeshBuilder.CreateSphere("face-lip-upper", { diameter: 0.048, segments: 10 }, scene);
    upper.material = lipMat;
    upper.parent = faceRoot;
    upper.position.set(0, -0.04, 0.122);
    upper.scaling.set(1.4, 0.28, 0.5);
    upper.isPickable = false;
    const lower = BABYLON.MeshBuilder.CreateSphere("face-lip-lower", { diameter: 0.046, segments: 10 }, scene);
    lower.material = lipMat;
    lower.parent = faceRoot;
    lower.position.set(0, -0.055, 0.12);
    lower.scaling.set(1.22, 0.32, 0.52);
    lower.isPickable = false;

    const hairMat = new BABYLON.StandardMaterial("face-hair-mat", scene);
    hairMat.disableLighting = true;
    hairMat.emissiveColor = new BABYLON.Color3(0.2, 0.09, 0.04);
    hairMat.diffuseColor = hairMat.emissiveColor;
    // Fringe covering top of forehead under hood
    const fringe = BABYLON.MeshBuilder.CreateSphere("face-fringe", { diameter: 0.2, segments: 12 }, scene);
    fringe.material = hairMat;
    fringe.parent = faceRoot;
    fringe.position.set(0, 0.1, 0.05);
    fringe.scaling.set(1.05, 0.4, 0.7);
    fringe.isPickable = false;
    for (const side of [-1, 1]) {
      const bang = BABYLON.MeshBuilder.CreateSphere(`face-bang-${side}`, { diameter: 0.075, segments: 10 }, scene);
      bang.material = hairMat;
      bang.parent = faceRoot;
      bang.position.set(side * 0.072, 0.07, 0.07);
      bang.scaling.set(0.7, 0.5, 0.5);
      bang.isPickable = false;
    }

    for (const side of [-1, 1]) {
      const ear = BABYLON.MeshBuilder.CreateSphere(`face-ear-${side}`, { diameter: 0.042, segments: 8 }, scene);
      ear.material = skinMat;
      ear.parent = faceRoot;
      ear.position.set(side * 0.115, 0.01, 0);
      ear.scaling.set(0.35, 0.95, 0.55);
      ear.isPickable = false;
    }

    if (headBone && skinnedMesh) {
      faceRoot.attachToBone(headBone, skinnedMesh);
      // Push forward into hood opening so face fully covers the cavity
      faceRoot.position.set(0, 0.02, 0.1);
      faceRoot.rotation.set(-0.08, 0, 0);
      faceRoot.scaling.setAll(1.05);
      console.info(`[Tora Face] 3D yüz '${headBone.name}' üzerinde, kapüşonu dolduruyor.`);
    } else {
      faceRoot.parent = root;
      faceRoot.position.set(0, 1.55, 0.1);
      faceRoot.scaling.setAll(1.0);
      console.warn("[Tora Face] Head kemiği yok; yüz köke sabitlendi.");
    }
    return faceRoot;
  }

  static #softenHoodFacePlate(root) {
    const visit = (node) => {
      const name = (node.name || "").toLowerCase();
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
    const sclera = BABYLON.MeshBuilder.CreateSphere(`face-sclera-${side}`, { diameter: 0.036, segments: 14 }, scene);
    sclera.material = whiteMat;
    sclera.parent = parent;
    sclera.position.set(side * 0.04, 0.03, 0.135);
    sclera.scaling.set(1.05, 0.72, 0.5);
    sclera.isPickable = false;

    const irisMat = new BABYLON.StandardMaterial(`face-iris-${side}`, scene);
    irisMat.disableLighting = true;
    irisMat.emissiveColor = new BABYLON.Color3(0.2, 0.4, 0.36);
    irisMat.diffuseColor = irisMat.emissiveColor;
    const iris = BABYLON.MeshBuilder.CreateSphere(`face-iris-${side}`, { diameter: 0.02, segments: 12 }, scene);
    iris.material = irisMat;
    iris.parent = parent;
    iris.position.set(side * 0.04, 0.03, 0.148);
    iris.scaling.set(1, 1, 0.45);
    iris.isPickable = false;

    const pupilMat = new BABYLON.StandardMaterial(`face-pupil-${side}`, scene);
    pupilMat.disableLighting = true;
    pupilMat.emissiveColor = new BABYLON.Color3(0.02, 0.02, 0.03);
    pupilMat.diffuseColor = pupilMat.emissiveColor;
    const pupil = BABYLON.MeshBuilder.CreateSphere(`face-pupil-${side}`, { diameter: 0.01, segments: 8 }, scene);
    pupil.material = pupilMat;
    pupil.parent = parent;
    pupil.position.set(side * 0.04, 0.03, 0.155);
    pupil.isPickable = false;

    const hiMat = new BABYLON.StandardMaterial(`face-eye-hi-${side}`, scene);
    hiMat.disableLighting = true;
    hiMat.emissiveColor = BABYLON.Color3.White();
    hiMat.diffuseColor = BABYLON.Color3.White();
    const hi = BABYLON.MeshBuilder.CreateSphere(`face-eye-hi-${side}`, { diameter: 0.005, segments: 6 }, scene);
    hi.material = hiMat;
    hi.parent = parent;
    hi.position.set(side * 0.035, 0.035, 0.158);
    hi.isPickable = false;
  }
}
