/**
 * Stylized painted 3D face — one clear head mesh + bold painted UV features.
 * Hides Female_Ranger_Head_Hood and attaches to the Head bone.
 */
export class CharacterFace {
  static attach(scene, skeleton, skinnedMesh, root) {
    CharacterFace.#hideHood(root);
    const headBone = skeleton.bones.find((bone) => bone.name === "Head")
      || skeleton.bones.find((bone) => /head/i.test(bone.name));

    const faceRoot = new BABYLON.TransformNode("player-face-root", scene);
    const faceTex = CharacterFace.#paintFaceTexture(scene);

    const skinMat = new BABYLON.StandardMaterial("face-skin-mat", scene);
    skinMat.diffuseTexture = faceTex;
    skinMat.emissiveTexture = faceTex;
    skinMat.diffuseColor = new BABYLON.Color3(1.05, 0.98, 0.94);
    skinMat.emissiveColor = new BABYLON.Color3(0.28, 0.2, 0.16);
    skinMat.specularColor = new BABYLON.Color3(0.18, 0.12, 0.1);
    skinMat.ambientColor = new BABYLON.Color3(0.55, 0.42, 0.36);

    // Primary head — features live on the painted texture so they read at distance
    const head = BABYLON.MeshBuilder.CreateSphere("face-head", { diameter: 0.28, segments: 32 }, scene);
    head.material = skinMat;
    head.parent = faceRoot;
    head.position.set(0, 0.02, 0.02);
    head.scaling.set(0.92, 1.12, 1.02);
    head.isPickable = false;

    const jaw = BABYLON.MeshBuilder.CreateSphere("face-jaw", { diameter: 0.18, segments: 18 }, scene);
    jaw.material = skinMat;
    jaw.parent = faceRoot;
    jaw.position.set(0, -0.06, 0.055);
    jaw.scaling.set(0.9, 0.62, 0.95);
    jaw.isPickable = false;

    // Soft cheek volumes
    for (const side of [-1, 1]) {
      const cheek = BABYLON.MeshBuilder.CreateSphere(`face-cheek-${side}`, { diameter: 0.1, segments: 12 }, scene);
      cheek.material = skinMat;
      cheek.parent = faceRoot;
      cheek.position.set(side * 0.075, -0.01, 0.09);
      cheek.scaling.set(0.68, 0.82, 0.72);
      cheek.isPickable = false;
    }

    // Sculpted nose that catches light
    const noseMat = new BABYLON.StandardMaterial("face-nose-mat", scene);
    noseMat.diffuseColor = new BABYLON.Color3(0.92, 0.72, 0.58);
    noseMat.emissiveColor = new BABYLON.Color3(0.14, 0.08, 0.05);
    noseMat.specularColor = new BABYLON.Color3(0.22, 0.14, 0.1);
    const bridge = BABYLON.MeshBuilder.CreateSphere("face-nose-bridge", { diameter: 0.032, segments: 10 }, scene);
    bridge.material = noseMat;
    bridge.parent = faceRoot;
    bridge.position.set(0, 0.018, 0.138);
    bridge.scaling.set(0.5, 1.55, 1.15);
    bridge.isPickable = false;
    const tip = BABYLON.MeshBuilder.CreateSphere("face-nose-tip", { diameter: 0.036, segments: 10 }, scene);
    tip.material = noseMat;
    tip.parent = faceRoot;
    tip.position.set(0, -0.014, 0.155);
    tip.scaling.set(0.95, 0.72, 1.15);
    tip.isPickable = false;

    for (const side of [-1, 1]) CharacterFace.#eye(scene, faceRoot, side);

    const browMat = new BABYLON.StandardMaterial("face-brow-mat", scene);
    browMat.diffuseColor = new BABYLON.Color3(0.12, 0.06, 0.03);
    browMat.emissiveColor = new BABYLON.Color3(0.04, 0.02, 0.01);
    browMat.specularColor = BABYLON.Color3.Black();
    for (const side of [-1, 1]) {
      const brow = BABYLON.MeshBuilder.CreateBox(`face-brow-${side}`, { width: 0.058, height: 0.011, depth: 0.018 }, scene);
      brow.material = browMat;
      brow.parent = faceRoot;
      brow.position.set(side * 0.048, 0.062, 0.132);
      brow.rotation.z = side * -0.28;
      brow.isPickable = false;
    }

    const lipMat = new BABYLON.StandardMaterial("face-lip-mat", scene);
    lipMat.diffuseColor = new BABYLON.Color3(0.78, 0.32, 0.38);
    lipMat.emissiveColor = new BABYLON.Color3(0.16, 0.04, 0.05);
    lipMat.specularColor = new BABYLON.Color3(0.3, 0.12, 0.12);
    const upper = BABYLON.MeshBuilder.CreateSphere("face-lip-upper", { diameter: 0.055, segments: 10 }, scene);
    upper.material = lipMat;
    upper.parent = faceRoot;
    upper.position.set(0, -0.045, 0.134);
    upper.scaling.set(1.45, 0.3, 0.55);
    upper.isPickable = false;
    const lower = BABYLON.MeshBuilder.CreateSphere("face-lip-lower", { diameter: 0.052, segments: 10 }, scene);
    lower.material = lipMat;
    lower.parent = faceRoot;
    lower.position.set(0, -0.06, 0.132);
    lower.scaling.set(1.3, 0.36, 0.58);
    lower.isPickable = false;

    // Hair volume — dark brown, readable silhouette
    const hairMat = new BABYLON.StandardMaterial("face-hair-mat", scene);
    hairMat.diffuseColor = new BABYLON.Color3(0.18, 0.08, 0.04);
    hairMat.emissiveColor = new BABYLON.Color3(0.05, 0.02, 0.01);
    hairMat.specularColor = new BABYLON.Color3(0.08, 0.04, 0.02);
    const scalp = BABYLON.MeshBuilder.CreateSphere("face-scalp", { diameter: 0.3, segments: 20 }, scene);
    scalp.material = hairMat;
    scalp.parent = faceRoot;
    scalp.position.set(0, 0.08, -0.01);
    scalp.scaling.set(1.05, 0.72, 1.02);
    scalp.isPickable = false;

    const bangs = BABYLON.MeshBuilder.CreateSphere("face-bangs", { diameter: 0.22, segments: 14 }, scene);
    bangs.material = hairMat;
    bangs.parent = faceRoot;
    bangs.position.set(0, 0.075, 0.09);
    bangs.scaling.set(1.2, 0.42, 0.58);
    bangs.isPickable = false;

    for (const side of [-1, 1]) {
      const lock = BABYLON.MeshBuilder.CreateSphere(`face-lock-${side}`, { diameter: 0.13, segments: 12 }, scene);
      lock.material = hairMat;
      lock.parent = faceRoot;
      lock.position.set(side * 0.11, -0.045, 0.01);
      lock.scaling.set(0.68, 1.85, 0.78);
      lock.isPickable = false;
    }

    const pony = BABYLON.MeshBuilder.CreateSphere("face-pony", { diameter: 0.14, segments: 12 }, scene);
    pony.material = hairMat;
    pony.parent = faceRoot;
    pony.position.set(0, -0.07, -0.13);
    pony.scaling.set(0.78, 2.05, 0.88);
    pony.isPickable = false;

    for (const side of [-1, 1]) {
      const ear = BABYLON.MeshBuilder.CreateSphere(`face-ear-${side}`, { diameter: 0.052, segments: 10 }, scene);
      ear.material = skinMat;
      ear.parent = faceRoot;
      ear.position.set(side * 0.125, 0.015, -0.005);
      ear.scaling.set(0.42, 1.0, 0.68);
      ear.isPickable = false;
    }

    if (headBone && skinnedMesh) {
      faceRoot.attachToBone(headBone, skinnedMesh);
      faceRoot.position.set(0, 0.12, 0.06);
      faceRoot.rotation.set(0.04, 0, 0);
      faceRoot.scaling.setAll(1.12);
      console.info(`[Tora Face] Boyalı yüz '${headBone.name}' kemiğine bağlandı.`);
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

  /** Front-facing painted portrait on sphere UV (center of map ≈ face front). */
  static #paintFaceTexture(scene) {
    const size = 512;
    const tex = new BABYLON.DynamicTexture("face-paint", { width: size, height: size }, scene, false);
    const ctx = tex.getContext();
    const cx = size * 0.5;
    const cy = size * 0.48;

    // Skin base
    const skin = ctx.createRadialGradient(cx, cy, 20, cx, cy + 20, 260);
    skin.addColorStop(0, "#f6d4b8");
    skin.addColorStop(0.45, "#e8b892");
    skin.addColorStop(0.8, "#d49870");
    skin.addColorStop(1, "#b87452");
    ctx.fillStyle = skin;
    ctx.fillRect(0, 0, size, size);

    // Cheek blush
    ctx.fillStyle = "rgba(232, 110, 120, 0.38)";
    ctx.beginPath(); ctx.ellipse(cx - 70, cy + 55, 48, 28, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + 70, cy + 55, 48, 28, 0, 0, Math.PI * 2); ctx.fill();

    // Brows
    ctx.strokeStyle = "#2a160c";
    ctx.lineWidth = 7;
    ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(cx - 95, cy - 28); ctx.quadraticCurveTo(cx - 55, cy - 48, cx - 18, cy - 30); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + 95, cy - 28); ctx.quadraticCurveTo(cx + 55, cy - 48, cx + 18, cy - 30); ctx.stroke();

    // Eye whites
    for (const side of [-1, 1]) {
      const ex = cx + side * 52;
      const ey = cy - 2;
      ctx.fillStyle = "#f7f8fc";
      ctx.beginPath(); ctx.ellipse(ex, ey, 28, 18, 0, 0, Math.PI * 2); ctx.fill();
      // Iris
      const iris = ctx.createRadialGradient(ex, ey, 2, ex, ey, 14);
      iris.addColorStop(0, "#7ec8e0");
      iris.addColorStop(0.55, "#2a6f88");
      iris.addColorStop(1, "#143848");
      ctx.fillStyle = iris;
      ctx.beginPath(); ctx.arc(ex, ey, 13, 0, Math.PI * 2); ctx.fill();
      // Pupil
      ctx.fillStyle = "#0a0a0c";
      ctx.beginPath(); ctx.arc(ex, ey, 6, 0, Math.PI * 2); ctx.fill();
      // Highlight
      ctx.fillStyle = "#ffffff";
      ctx.beginPath(); ctx.arc(ex - 4, ey - 4, 3.5, 0, Math.PI * 2); ctx.fill();
      // Upper lid shadow
      ctx.strokeStyle = "rgba(60, 30, 20, 0.55)";
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.ellipse(ex, ey - 2, 28, 18, 0, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
    }

    // Nose shade
    ctx.fillStyle = "rgba(160, 95, 70, 0.35)";
    ctx.beginPath(); ctx.ellipse(cx, cy + 28, 14, 22, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(255, 220, 200, 0.35)";
    ctx.beginPath(); ctx.ellipse(cx, cy + 18, 6, 10, 0, 0, Math.PI * 2); ctx.fill();

    // Lips
    ctx.fillStyle = "#c45a68";
    ctx.beginPath(); ctx.ellipse(cx, cy + 78, 34, 10, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#a84050";
    ctx.beginPath(); ctx.ellipse(cx, cy + 88, 28, 9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(80, 20, 30, 0.45)";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx - 30, cy + 82); ctx.quadraticCurveTo(cx, cy + 86, cx + 30, cy + 82); ctx.stroke();

    // Freckles
    ctx.fillStyle = "rgba(140, 80, 50, 0.45)";
    for (const [x, y] of [[cx - 40, cy + 42], [cx - 28, cy + 52], [cx + 22, cy + 46], [cx + 38, cy + 54], [cx - 8, cy + 58], [cx + 10, cy + 50]]) {
      ctx.beginPath(); ctx.arc(x, y, 2.2, 0, Math.PI * 2); ctx.fill();
    }

    // Soft hair edge at top of UV (helps sphere crown)
    const hair = ctx.createLinearGradient(0, 0, 0, 120);
    hair.addColorStop(0, "rgba(40, 18, 8, 0.85)");
    hair.addColorStop(1, "rgba(40, 18, 8, 0)");
    ctx.fillStyle = hair;
    ctx.fillRect(0, 0, size, 130);

    tex.hasAlpha = false;
    tex.update();
    return tex;
  }

  static #eye(scene, parent, side) {
    const whiteMat = new BABYLON.StandardMaterial(`face-sclera-${side}`, scene);
    whiteMat.diffuseColor = new BABYLON.Color3(0.98, 0.98, 1);
    whiteMat.emissiveColor = new BABYLON.Color3(0.35, 0.35, 0.4);
    whiteMat.specularColor = new BABYLON.Color3(0.5, 0.5, 0.55);
    const sclera = BABYLON.MeshBuilder.CreateSphere(`face-sclera-${side}`, { diameter: 0.046, segments: 14 }, scene);
    sclera.material = whiteMat;
    sclera.parent = parent;
    sclera.position.set(side * 0.048, 0.032, 0.138);
    sclera.scaling.set(1.15, 0.85, 0.7);
    sclera.isPickable = false;

    const irisMat = new BABYLON.StandardMaterial(`face-iris-${side}`, scene);
    irisMat.diffuseColor = new BABYLON.Color3(0.25, 0.55, 0.65);
    irisMat.emissiveColor = new BABYLON.Color3(0.08, 0.18, 0.22);
    const iris = BABYLON.MeshBuilder.CreateSphere(`face-iris-${side}`, { diameter: 0.026, segments: 12 }, scene);
    iris.material = irisMat;
    iris.parent = parent;
    iris.position.set(side * 0.048, 0.032, 0.155);
    iris.scaling.set(1, 1, 0.55);
    iris.isPickable = false;

    const pupilMat = new BABYLON.StandardMaterial(`face-pupil-${side}`, scene);
    pupilMat.diffuseColor = BABYLON.Color3.Black();
    pupilMat.emissiveColor = new BABYLON.Color3(0.02, 0.02, 0.02);
    const pupil = BABYLON.MeshBuilder.CreateSphere(`face-pupil-${side}`, { diameter: 0.013, segments: 8 }, scene);
    pupil.material = pupilMat;
    pupil.parent = parent;
    pupil.position.set(side * 0.048, 0.032, 0.162);
    pupil.isPickable = false;

    const hiMat = new BABYLON.StandardMaterial(`face-eye-hi-${side}`, scene);
    hiMat.diffuseColor = BABYLON.Color3.White();
    hiMat.emissiveColor = BABYLON.Color3.White();
    const hi = BABYLON.MeshBuilder.CreateSphere(`face-eye-hi-${side}`, { diameter: 0.007, segments: 6 }, scene);
    hi.material = hiMat;
    hi.parent = parent;
    hi.position.set(side * 0.042, 0.038, 0.166);
    hi.isPickable = false;
  }
}
