/**
 * Clear stylized face that sits in front of the ranger hood opening.
 * Hides Female_Ranger_Head_Hood and attaches to the Head bone.
 */
export class CharacterFace {
  static attach(scene, skeleton, skinnedMesh, root) {
    CharacterFace.#hideHood(root);
    const headBone = skeleton.bones.find((bone) => bone.name === "Head")
      || skeleton.bones.find((bone) => /head/i.test(bone.name));

    const faceRoot = new BABYLON.TransformNode("player-face-root", scene);

    // Unlit skin so features stay readable in dusk lighting
    const skinMat = new BABYLON.StandardMaterial("face-skin-mat", scene);
    skinMat.disableLighting = true;
    skinMat.emissiveColor = new BABYLON.Color3(0.94, 0.78, 0.66);
    skinMat.diffuseColor = skinMat.emissiveColor;
    skinMat.specularColor = BABYLON.Color3.Black();

    const head = BABYLON.MeshBuilder.CreateSphere("face-head", { diameter: 0.26, segments: 28 }, scene);
    head.material = skinMat;
    head.parent = faceRoot;
    head.position.set(0, 0.01, 0.04);
    head.scaling.set(0.88, 1.05, 0.95);
    head.isPickable = false;

    const jaw = BABYLON.MeshBuilder.CreateSphere("face-jaw", { diameter: 0.15, segments: 16 }, scene);
    jaw.material = skinMat;
    jaw.parent = faceRoot;
    jaw.position.set(0, -0.05, 0.07);
    jaw.scaling.set(0.92, 0.58, 0.9);
    jaw.isPickable = false;

    for (const side of [-1, 1]) {
      const cheek = BABYLON.MeshBuilder.CreateSphere(`face-cheek-${side}`, { diameter: 0.085, segments: 12 }, scene);
      cheek.material = skinMat;
      cheek.parent = faceRoot;
      cheek.position.set(side * 0.068, -0.005, 0.1);
      cheek.scaling.set(0.65, 0.8, 0.7);
      cheek.isPickable = false;
    }

    const noseMat = new BABYLON.StandardMaterial("face-nose-mat", scene);
    noseMat.disableLighting = true;
    noseMat.emissiveColor = new BABYLON.Color3(0.88, 0.68, 0.55);
    noseMat.diffuseColor = noseMat.emissiveColor;
    const bridge = BABYLON.MeshBuilder.CreateSphere("face-nose-bridge", { diameter: 0.03, segments: 10 }, scene);
    bridge.material = noseMat;
    bridge.parent = faceRoot;
    bridge.position.set(0, 0.02, 0.145);
    bridge.scaling.set(0.48, 1.5, 1.1);
    bridge.isPickable = false;
    const tip = BABYLON.MeshBuilder.CreateSphere("face-nose-tip", { diameter: 0.034, segments: 10 }, scene);
    tip.material = noseMat;
    tip.parent = faceRoot;
    tip.position.set(0, -0.01, 0.162);
    tip.scaling.set(0.95, 0.7, 1.1);
    tip.isPickable = false;

    for (const side of [-1, 1]) CharacterFace.#eye(scene, faceRoot, side);

    const browMat = new BABYLON.StandardMaterial("face-brow-mat", scene);
    browMat.disableLighting = true;
    browMat.emissiveColor = new BABYLON.Color3(0.14, 0.07, 0.03);
    browMat.diffuseColor = browMat.emissiveColor;
    for (const side of [-1, 1]) {
      const brow = BABYLON.MeshBuilder.CreateBox(`face-brow-${side}`, { width: 0.055, height: 0.01, depth: 0.016 }, scene);
      brow.material = browMat;
      brow.parent = faceRoot;
      brow.position.set(side * 0.045, 0.06, 0.14);
      brow.rotation.z = side * -0.25;
      brow.isPickable = false;
    }

    const lipMat = new BABYLON.StandardMaterial("face-lip-mat", scene);
    lipMat.disableLighting = true;
    lipMat.emissiveColor = new BABYLON.Color3(0.78, 0.3, 0.36);
    lipMat.diffuseColor = lipMat.emissiveColor;
    const upper = BABYLON.MeshBuilder.CreateSphere("face-lip-upper", { diameter: 0.05, segments: 10 }, scene);
    upper.material = lipMat;
    upper.parent = faceRoot;
    upper.position.set(0, -0.04, 0.14);
    upper.scaling.set(1.45, 0.28, 0.52);
    upper.isPickable = false;
    const lower = BABYLON.MeshBuilder.CreateSphere("face-lip-lower", { diameter: 0.048, segments: 10 }, scene);
    lower.material = lipMat;
    lower.parent = faceRoot;
    lower.position.set(0, -0.055, 0.138);
    lower.scaling.set(1.28, 0.34, 0.55);
    lower.isPickable = false;

    // Hair sits behind/above so it does not hide eyes from the camera
    const hairMat = new BABYLON.StandardMaterial("face-hair-mat", scene);
    hairMat.disableLighting = true;
    hairMat.emissiveColor = new BABYLON.Color3(0.2, 0.09, 0.04);
    hairMat.diffuseColor = hairMat.emissiveColor;
    const scalp = BABYLON.MeshBuilder.CreateSphere("face-scalp", { diameter: 0.28, segments: 18 }, scene);
    scalp.material = hairMat;
    scalp.parent = faceRoot;
    scalp.position.set(0, 0.085, -0.02);
    scalp.scaling.set(1.02, 0.68, 0.95);
    scalp.isPickable = false;

    // Short side bangs only — keep face plate open
    for (const side of [-1, 1]) {
      const bang = BABYLON.MeshBuilder.CreateSphere(`face-bang-${side}`, { diameter: 0.09, segments: 12 }, scene);
      bang.material = hairMat;
      bang.parent = faceRoot;
      bang.position.set(side * 0.08, 0.07, 0.08);
      bang.scaling.set(0.7, 0.55, 0.5);
      bang.isPickable = false;
    }

    for (const side of [-1, 1]) {
      const lock = BABYLON.MeshBuilder.CreateSphere(`face-lock-${side}`, { diameter: 0.11, segments: 12 }, scene);
      lock.material = hairMat;
      lock.parent = faceRoot;
      lock.position.set(side * 0.11, -0.02, -0.02);
      lock.scaling.set(0.6, 1.6, 0.7);
      lock.isPickable = false;
    }

    const pony = BABYLON.MeshBuilder.CreateSphere("face-pony", { diameter: 0.12, segments: 12 }, scene);
    pony.material = hairMat;
    pony.parent = faceRoot;
    pony.position.set(0, -0.05, -0.14);
    pony.scaling.set(0.7, 1.8, 0.8);
    pony.isPickable = false;

    for (const side of [-1, 1]) {
      const ear = BABYLON.MeshBuilder.CreateSphere(`face-ear-${side}`, { diameter: 0.048, segments: 10 }, scene);
      ear.material = skinMat;
      ear.parent = faceRoot;
      ear.position.set(side * 0.12, 0.01, 0);
      ear.scaling.set(0.4, 0.95, 0.65);
      ear.isPickable = false;
    }

    if (headBone && skinnedMesh) {
      faceRoot.attachToBone(headBone, skinnedMesh);
      // Push forward out of the green tunic hood cavity
      faceRoot.position.set(0, 0.1, 0.12);
      faceRoot.rotation.set(-0.05, 0, 0);
      faceRoot.scaling.setAll(1.35);
      console.info(`[Tora Face] Yüz '${headBone.name}' kemiğine bağlandı (hood önü).`);
    } else {
      faceRoot.parent = root;
      faceRoot.position.set(0, 1.58, 0.12);
      console.warn("[Tora Face] Head kemiği yok; yüz köke sabitlendi.");
    }
    return faceRoot;
  }

  static #hideHood(root) {
    const visit = (node) => {
      const name = (node.name || "").toLowerCase();
      if (name.includes("hood") || name.includes("helmet") || name.includes("mask") || name.includes("head_hood")) {
        if (typeof node.setEnabled === "function") node.setEnabled(false);
        if ("isVisible" in node) node.isVisible = false;
        if ("visibility" in node) node.visibility = 0;
        console.info(`[Tora Face] Hood gizlendi: ${node.name}`);
      }
      (node.getChildren?.() || []).forEach(visit);
    };
    visit(root);
    root.getChildMeshes?.(false)?.forEach((mesh) => {
      const name = (mesh.name || "").toLowerCase();
      if (name.includes("hood") || name.includes("helmet") || name.includes("head_hood")) {
        mesh.setEnabled(false);
        mesh.isVisible = false;
        mesh.visibility = 0;
      }
    });
  }

  static #eye(scene, parent, side) {
    const whiteMat = new BABYLON.StandardMaterial(`face-sclera-${side}`, scene);
    whiteMat.disableLighting = true;
    whiteMat.emissiveColor = new BABYLON.Color3(0.98, 0.98, 1);
    whiteMat.diffuseColor = whiteMat.emissiveColor;
    const sclera = BABYLON.MeshBuilder.CreateSphere(`face-sclera-${side}`, { diameter: 0.048, segments: 14 }, scene);
    sclera.material = whiteMat;
    sclera.parent = parent;
    sclera.position.set(side * 0.048, 0.032, 0.148);
    sclera.scaling.set(1.15, 0.85, 0.7);
    sclera.isPickable = false;

    const irisMat = new BABYLON.StandardMaterial(`face-iris-${side}`, scene);
    irisMat.disableLighting = true;
    irisMat.emissiveColor = new BABYLON.Color3(0.2, 0.55, 0.7);
    irisMat.diffuseColor = irisMat.emissiveColor;
    const iris = BABYLON.MeshBuilder.CreateSphere(`face-iris-${side}`, { diameter: 0.028, segments: 12 }, scene);
    iris.material = irisMat;
    iris.parent = parent;
    iris.position.set(side * 0.048, 0.032, 0.165);
    iris.scaling.set(1, 1, 0.55);
    iris.isPickable = false;

    const pupilMat = new BABYLON.StandardMaterial(`face-pupil-${side}`, scene);
    pupilMat.disableLighting = true;
    pupilMat.emissiveColor = new BABYLON.Color3(0.02, 0.02, 0.03);
    pupilMat.diffuseColor = pupilMat.emissiveColor;
    const pupil = BABYLON.MeshBuilder.CreateSphere(`face-pupil-${side}`, { diameter: 0.014, segments: 8 }, scene);
    pupil.material = pupilMat;
    pupil.parent = parent;
    pupil.position.set(side * 0.048, 0.032, 0.172);
    pupil.isPickable = false;

    const hiMat = new BABYLON.StandardMaterial(`face-eye-hi-${side}`, scene);
    hiMat.disableLighting = true;
    hiMat.emissiveColor = BABYLON.Color3.White();
    hiMat.diffuseColor = BABYLON.Color3.White();
    const hi = BABYLON.MeshBuilder.CreateSphere(`face-eye-hi-${side}`, { diameter: 0.008, segments: 6 }, scene);
    hi.material = hiMat;
    hi.parent = parent;
    hi.position.set(side * 0.042, 0.038, 0.176);
    hi.isPickable = false;
  }
}
