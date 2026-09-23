/**
 * Stylized painted 3D face — hides the hood MESH (not just the empty socket)
 * and attaches a painted head to the Head bone so features read in-game.
 *
 * Root cause of white mask: Female_Ranger_Head_Hood's skinned mesh is reparented
 * to Armature as `node7` on import, so disabling the TransformNode alone left
 * the hood (and its pale inner cavity) rendering over the face.
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
    skinMat.diffuseTexture.level = 1.15;
    skinMat.emissiveTexture.level = 0.45;
    skinMat.diffuseColor = new BABYLON.Color3(0.92, 0.82, 0.74);
    skinMat.emissiveColor = new BABYLON.Color3(0.08, 0.05, 0.04);
    skinMat.specularColor = new BABYLON.Color3(0.08, 0.05, 0.04);
    skinMat.ambientColor = new BABYLON.Color3(0.42, 0.34, 0.28);

    const head = BABYLON.MeshBuilder.CreateSphere("face-head", { diameter: 0.3, segments: 32 }, scene);
    head.material = skinMat;
    head.parent = faceRoot;
    head.position.set(0, 0.02, 0.02);
    head.scaling.set(0.92, 1.12, 1.02);
    head.isPickable = false;

    const jaw = BABYLON.MeshBuilder.CreateSphere("face-jaw", { diameter: 0.19, segments: 18 }, scene);
    jaw.material = skinMat;
    jaw.parent = faceRoot;
    jaw.position.set(0, -0.06, 0.055);
    jaw.scaling.set(0.9, 0.62, 0.95);
    jaw.isPickable = false;

    for (const side of [-1, 1]) {
      const cheek = BABYLON.MeshBuilder.CreateSphere(`face-cheek-${side}`, { diameter: 0.1, segments: 12 }, scene);
      cheek.material = skinMat;
      cheek.parent = faceRoot;
      cheek.position.set(side * 0.075, -0.01, 0.09);
      cheek.scaling.set(0.68, 0.82, 0.72);
      cheek.isPickable = false;
    }

    const noseMat = new BABYLON.StandardMaterial("face-nose-mat", scene);
    noseMat.diffuseColor = new BABYLON.Color3(0.92, 0.72, 0.58);
    noseMat.emissiveColor = new BABYLON.Color3(0.16, 0.1, 0.06);
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

    // Front-facing painted portrait card — sphere UV alone often hides features at play angles
    const faceCard = BABYLON.MeshBuilder.CreateDisc("face-card", { radius: 0.11, tessellation: 28 }, scene);
    faceCard.material = skinMat;
    faceCard.parent = faceRoot;
    faceCard.position.set(0, 0.015, 0.145);
    faceCard.rotation.x = Math.PI; // disc faces +Z after flip
    faceCard.scaling.setAll(1.15);
    faceCard.isPickable = false;

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
    lipMat.emissiveColor = new BABYLON.Color3(0.18, 0.05, 0.06);
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

    const hairMat = new BABYLON.StandardMaterial("face-hair-mat", scene);
    hairMat.diffuseColor = new BABYLON.Color3(0.18, 0.08, 0.04);
    hairMat.emissiveColor = new BABYLON.Color3(0.05, 0.02, 0.01);
    hairMat.specularColor = new BABYLON.Color3(0.08, 0.04, 0.02);
    const scalp = BABYLON.MeshBuilder.CreateSphere("face-scalp", { diameter: 0.32, segments: 20 }, scene);
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
      // Seat face in the hood cavity opening; features face local +Z
      faceRoot.position.set(0, 0.06, 0.14);
      faceRoot.rotation.set(0.04, 0, 0);
      faceRoot.scaling.setAll(1.05);
      console.info(`[Tora Face] Boyalı yüz '${headBone.name}' kemiğine bağlandı (hood mesh gizlendi).`);
    } else {
      faceRoot.parent = root;
      faceRoot.position.set(0, 1.58, 0.08);
      console.warn("[Tora Face] Head kemiği yok; yüz köke sabitlendi.");
    }
    return faceRoot;
  }

  /**
   * female-ranger.glb: Head_Hood socket owns mesh index 7, imported as `node7`
   * and reparented under Armature — must hide the mesh itself.
   */
  static #hideHood(root) {
    const hide = (node) => {
      if (!node) return;
      if (typeof node.setEnabled === "function") node.setEnabled(false);
      if ("isVisible" in node) node.isVisible = false;
      if ("visibility" in node) node.visibility = 0;
      if (node.material) {
        try {
          node.material = node.material.clone?.(`${node.name}-hidden`) || node.material;
          if ("alpha" in node.material) node.material.alpha = 0;
          if (node.material.emissiveColor) node.material.emissiveColor = BABYLON.Color3.Black();
          if (node.material.diffuseColor) node.material.diffuseColor = BABYLON.Color3.Black();
        } catch (_) { /* optional */ }
      }
    };

    const isHoodName = (raw) => {
      const name = (raw || "").toLowerCase().replace(/[_\s-]+/g, "");
      return (
        name.includes("hood")
        || name.includes("headhood")
        || name.includes("helmet")
        || name.includes("mask")
        || /^node7$/.test(name)
        || /^node_?7$/.test((raw || "").toLowerCase())
        || /^primitive_?7$/.test((raw || "").toLowerCase())
      );
    };

    const visit = (node) => {
      if (isHoodName(node.name)) {
        hide(node);
        console.info(`[Tora Face] Hood node gizlendi: ${node.name}`);
      }
      (node.getChildren?.() || []).forEach(visit);
    };
    visit(root);

    // Explicit: glTF mesh 7 is Female_Ranger_Head_Hood geometry (any depth)
    root.getChildMeshes?.(false)?.forEach((mesh) => {
      if (isHoodName(mesh.name)) {
        hide(mesh);
        console.info(`[Tora Face] Hood mesh gizlendi: ${mesh.name} (verts=${mesh.getTotalVertices?.() || 0})`);
      }
    });

    // Hide leftover pale head shells that aren't our procedural face
    root.getChildMeshes?.(false)?.forEach((mesh) => {
      const name = (mesh.name || "").toLowerCase();
      if (name.startsWith("face-")) return;
      if (!/head|face|skull|cranial/i.test(name) && mesh.getTotalVertices?.() > 800) return;
      if (/head|face|skull/i.test(name) && !name.includes("hair") && !name.includes("ear")) {
        hide(mesh);
        console.info(`[Tora Face] Ek kafa mesh gizlendi: ${mesh.name}`);
      }
    });
  }

  static #paintFaceTexture(scene) {
    const size = 512;
    const tex = new BABYLON.DynamicTexture("face-paint", { width: size, height: size }, scene, false);
    const ctx = tex.getContext();
    const cx = size * 0.5;
    const cy = size * 0.48;

    const skin = ctx.createRadialGradient(cx, cy, 20, cx, cy + 20, 260);
    skin.addColorStop(0, "#f6d4b8");
    skin.addColorStop(0.45, "#e8b892");
    skin.addColorStop(0.8, "#d49870");
    skin.addColorStop(1, "#b87452");
    ctx.fillStyle = skin;
    ctx.fillRect(0, 0, size, size);

    ctx.fillStyle = "rgba(232, 110, 120, 0.38)";
    ctx.beginPath(); ctx.ellipse(cx - 70, cy + 55, 48, 28, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + 70, cy + 55, 48, 28, 0, 0, Math.PI * 2); ctx.fill();

    ctx.strokeStyle = "#2a160c";
    ctx.lineWidth = 7;
    ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(cx - 95, cy - 28); ctx.quadraticCurveTo(cx - 55, cy - 48, cx - 18, cy - 30); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + 95, cy - 28); ctx.quadraticCurveTo(cx + 55, cy - 48, cx + 18, cy - 30); ctx.stroke();

    for (const side of [-1, 1]) {
      const ex = cx + side * 52;
      const ey = cy - 2;
      ctx.fillStyle = "#f7f8fc";
      ctx.beginPath(); ctx.ellipse(ex, ey, 28, 18, 0, 0, Math.PI * 2); ctx.fill();
      const iris = ctx.createRadialGradient(ex, ey, 2, ex, ey, 14);
      iris.addColorStop(0, "#7ec8e0");
      iris.addColorStop(0.55, "#2a6f88");
      iris.addColorStop(1, "#143848");
      ctx.fillStyle = iris;
      ctx.beginPath(); ctx.arc(ex, ey, 13, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#0a0a0c";
      ctx.beginPath(); ctx.arc(ex, ey, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath(); ctx.arc(ex - 4, ey - 4, 3.5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "rgba(60, 30, 20, 0.55)";
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.ellipse(ex, ey - 2, 28, 18, 0, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
    }

    ctx.fillStyle = "rgba(160, 95, 70, 0.35)";
    ctx.beginPath(); ctx.ellipse(cx, cy + 28, 14, 22, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(255, 220, 200, 0.35)";
    ctx.beginPath(); ctx.ellipse(cx, cy + 18, 6, 10, 0, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = "#c45a68";
    ctx.beginPath(); ctx.ellipse(cx, cy + 78, 34, 10, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#a84050";
    ctx.beginPath(); ctx.ellipse(cx, cy + 88, 28, 9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(80, 20, 30, 0.45)";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx - 30, cy + 82); ctx.quadraticCurveTo(cx, cy + 86, cx + 30, cy + 82); ctx.stroke();

    ctx.fillStyle = "rgba(140, 80, 50, 0.45)";
    for (const [x, y] of [[cx - 40, cy + 42], [cx - 28, cy + 52], [cx + 22, cy + 46], [cx + 38, cy + 54], [cx - 8, cy + 58], [cx + 10, cy + 50]]) {
      ctx.beginPath(); ctx.arc(x, y, 2.2, 0, Math.PI * 2); ctx.fill();
    }

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
    whiteMat.disableLighting = true;
    whiteMat.emissiveColor = new BABYLON.Color3(0.92, 0.93, 0.96);
    whiteMat.diffuseColor = whiteMat.emissiveColor;
    whiteMat.specularColor = BABYLON.Color3.Black();
    const sclera = BABYLON.MeshBuilder.CreateSphere(`face-sclera-${side}`, { diameter: 0.04, segments: 12 }, scene);
    sclera.material = whiteMat;
    sclera.parent = parent;
    sclera.position.set(side * 0.048, 0.032, 0.14);
    sclera.scaling.set(1.15, 0.85, 0.7);
    sclera.isPickable = false;

    const irisMat = new BABYLON.StandardMaterial(`face-iris-${side}`, scene);
    irisMat.disableLighting = true;
    irisMat.emissiveColor = new BABYLON.Color3(0.22, 0.5, 0.62);
    irisMat.diffuseColor = irisMat.emissiveColor;
    const iris = BABYLON.MeshBuilder.CreateSphere(`face-iris-${side}`, { diameter: 0.022, segments: 10 }, scene);
    iris.material = irisMat;
    iris.parent = parent;
    iris.position.set(side * 0.048, 0.032, 0.156);
    iris.scaling.set(1, 1, 0.55);
    iris.isPickable = false;

    const pupilMat = new BABYLON.StandardMaterial(`face-pupil-${side}`, scene);
    pupilMat.disableLighting = true;
    pupilMat.emissiveColor = new BABYLON.Color3(0.02, 0.02, 0.02);
    pupilMat.diffuseColor = pupilMat.emissiveColor;
    const pupil = BABYLON.MeshBuilder.CreateSphere(`face-pupil-${side}`, { diameter: 0.01, segments: 8 }, scene);
    pupil.material = pupilMat;
    pupil.parent = parent;
    pupil.position.set(side * 0.048, 0.032, 0.162);
    pupil.isPickable = false;

    const hiMat = new BABYLON.StandardMaterial(`face-eye-hi-${side}`, scene);
    hiMat.disableLighting = true;
    hiMat.emissiveColor = BABYLON.Color3.White();
    hiMat.diffuseColor = BABYLON.Color3.White();
    const hi = BABYLON.MeshBuilder.CreateSphere(`face-eye-hi-${side}`, { diameter: 0.006, segments: 6 }, scene);
    hi.material = hiMat;
    hi.parent = parent;
    hi.position.set(side * 0.042, 0.038, 0.165);
    hi.isPickable = false;
  }
}
