/**
 * Stylized painted 3D face — hides the hood MESH (not just the empty socket)
 * and attaches a painted head to the Head bone so features read in-game.
 *
 * Primary look: front-facing face-card disc with painted DynamicTexture.
 * Head volume is solid brown/tan (never a bright white / emissive sphere).
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

    // Solid skin volume — brown/tan only. Never white, never texture-blown emissive.
    const skinMat = new BABYLON.StandardMaterial("face-skin-mat", scene);
    skinMat.diffuseColor = new BABYLON.Color3(0.72, 0.52, 0.38);
    skinMat.emissiveColor = new BABYLON.Color3(0.04, 0.025, 0.015);
    skinMat.specularColor = new BABYLON.Color3(0.12, 0.08, 0.05);
    skinMat.ambientColor = new BABYLON.Color3(0.35, 0.26, 0.18);

    // Painted portrait material — used ONLY on the front face-card disc
    const cardMat = new BABYLON.StandardMaterial("face-card-mat", scene);
    cardMat.diffuseTexture = faceTex;
    cardMat.emissiveTexture = faceTex;
    cardMat.diffuseTexture.level = 1.05;
    cardMat.emissiveTexture.level = 0.22;
    cardMat.diffuseColor = new BABYLON.Color3(0.85, 0.7, 0.55);
    cardMat.emissiveColor = new BABYLON.Color3(0.06, 0.04, 0.03);
    cardMat.specularColor = new BABYLON.Color3(0.06, 0.04, 0.03);
    cardMat.ambientColor = new BABYLON.Color3(0.4, 0.32, 0.24);
    cardMat.backFaceCulling = false;

    // Head volume (silhouette only — features come from the face-card)
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

    // PRIMARY visible face: front-facing painted disc (dominates play-camera look)
    const faceCard = BABYLON.MeshBuilder.CreateDisc("face-card", { radius: 0.125, tessellation: 32 }, scene);
    faceCard.material = cardMat;
    faceCard.parent = faceRoot;
    faceCard.position.set(0, 0.02, 0.12);
    // Disc default faces -Z; flip so painted side faces local +Z (character forward after seating)
    faceCard.rotation.x = Math.PI;
    faceCard.scaling.set(1.2, 1.28, 1);
    faceCard.isPickable = false;

    // Subtle 3D nose on top of the card for depth at 3/4 angles
    const noseMat = new BABYLON.StandardMaterial("face-nose-mat", scene);
    noseMat.diffuseColor = new BABYLON.Color3(0.68, 0.48, 0.34);
    noseMat.emissiveColor = new BABYLON.Color3(0.05, 0.03, 0.02);
    noseMat.specularColor = new BABYLON.Color3(0.16, 0.1, 0.07);
    const bridge = BABYLON.MeshBuilder.CreateSphere("face-nose-bridge", { diameter: 0.03, segments: 10 }, scene);
    bridge.material = noseMat;
    bridge.parent = faceRoot;
    bridge.position.set(0, 0.02, 0.135);
    bridge.scaling.set(0.48, 1.4, 1.05);
    bridge.isPickable = false;
    const tip = BABYLON.MeshBuilder.CreateSphere("face-nose-tip", { diameter: 0.034, segments: 10 }, scene);
    tip.material = noseMat;
    tip.parent = faceRoot;
    tip.position.set(0, -0.01, 0.148);
    tip.scaling.set(0.9, 0.7, 1.1);
    tip.isPickable = false;

    for (const side of [-1, 1]) CharacterFace.#eye(scene, faceRoot, side);

    const browMat = new BABYLON.StandardMaterial("face-brow-mat", scene);
    browMat.diffuseColor = new BABYLON.Color3(0.14, 0.07, 0.03);
    browMat.emissiveColor = new BABYLON.Color3(0.02, 0.01, 0.005);
    browMat.specularColor = BABYLON.Color3.Black();
    for (const side of [-1, 1]) {
      const brow = BABYLON.MeshBuilder.CreateBox(`face-brow-${side}`, { width: 0.055, height: 0.01, depth: 0.016 }, scene);
      brow.material = browMat;
      brow.parent = faceRoot;
      brow.position.set(side * 0.046, 0.068, 0.128);
      brow.rotation.z = side * -0.26;
      brow.isPickable = false;
    }

    const lipMat = new BABYLON.StandardMaterial("face-lip-mat", scene);
    lipMat.diffuseColor = new BABYLON.Color3(0.7, 0.3, 0.34);
    lipMat.emissiveColor = new BABYLON.Color3(0.06, 0.02, 0.02);
    lipMat.specularColor = new BABYLON.Color3(0.2, 0.08, 0.08);
    const upper = BABYLON.MeshBuilder.CreateSphere("face-lip-upper", { diameter: 0.05, segments: 10 }, scene);
    upper.material = lipMat;
    upper.parent = faceRoot;
    upper.position.set(0, -0.042, 0.13);
    upper.scaling.set(1.4, 0.28, 0.5);
    upper.isPickable = false;
    const lower = BABYLON.MeshBuilder.CreateSphere("face-lip-lower", { diameter: 0.048, segments: 10 }, scene);
    lower.material = lipMat;
    lower.parent = faceRoot;
    lower.position.set(0, -0.055, 0.128);
    lower.scaling.set(1.25, 0.34, 0.52);
    lower.isPickable = false;

    const hairMat = new BABYLON.StandardMaterial("face-hair-mat", scene);
    hairMat.diffuseColor = new BABYLON.Color3(0.16, 0.07, 0.03);
    hairMat.emissiveColor = new BABYLON.Color3(0.02, 0.01, 0.005);
    hairMat.specularColor = new BABYLON.Color3(0.06, 0.03, 0.015);
    const scalp = BABYLON.MeshBuilder.CreateSphere("face-scalp", { diameter: 0.3, segments: 18 }, scene);
    scalp.material = hairMat;
    scalp.parent = faceRoot;
    scalp.position.set(0, 0.075, -0.02);
    scalp.scaling.set(1.02, 0.7, 1.0);
    scalp.isPickable = false;

    const bangs = BABYLON.MeshBuilder.CreateSphere("face-bangs", { diameter: 0.2, segments: 14 }, scene);
    bangs.material = hairMat;
    bangs.parent = faceRoot;
    bangs.position.set(0, 0.078, 0.08);
    bangs.scaling.set(1.15, 0.38, 0.55);
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
      // Historical seating: Head bone local +Z often points into the skull /
      // hood cavity. Math.PI yaw flips the face-card out through the hood opening
      // toward character forward (+Z world when idle facing +Z).
      faceRoot.position.set(0.05, 0.04, 0.02);
      faceRoot.rotation.set(0.05, Math.PI, 0);
      faceRoot.scaling.setAll(1.05);
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
   * and reparented under Armature — must hide the mesh itself.
   * Also hides helmet/mask and leftover pale head shells.
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
      if (name.startsWith("face-") || name === "player-face-root") return;
      if (!/head|face|skull|cranial/i.test(name) && mesh.getTotalVertices?.() > 800) return;
      if (/head|face|skull/i.test(name) && !name.includes("hair") && !name.includes("ear")) {
        hide(mesh);
        console.info(`[Tora Face] Ek kafa mesh gizlendi: ${mesh.name}`);
      }
    });
  }

  /** Painted portrait for the front-facing face-card disc. */
  static #paintFaceTexture(scene) {
    const size = 512;
    const tex = new BABYLON.DynamicTexture("face-paint", { width: size, height: size }, scene, false);
    const ctx = tex.getContext();
    const cx = size * 0.5;
    const cy = size * 0.48;

    // Warm brown/tan skin — never near-white
    const skin = ctx.createRadialGradient(cx, cy, 20, cx, cy + 20, 260);
    skin.addColorStop(0, "#e0b890");
    skin.addColorStop(0.4, "#c9926a");
    skin.addColorStop(0.75, "#a87048");
    skin.addColorStop(1, "#8a5634");
    ctx.fillStyle = skin;
    ctx.fillRect(0, 0, size, size);

    // Soft blush
    ctx.fillStyle = "rgba(200, 90, 90, 0.32)";
    ctx.beginPath(); ctx.ellipse(cx - 70, cy + 55, 48, 28, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + 70, cy + 55, 48, 28, 0, 0, Math.PI * 2); ctx.fill();

    // Brows
    ctx.strokeStyle = "#1e1008";
    ctx.lineWidth = 8;
    ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(cx - 95, cy - 28); ctx.quadraticCurveTo(cx - 55, cy - 50, cx - 18, cy - 30); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + 95, cy - 28); ctx.quadraticCurveTo(cx + 55, cy - 50, cx + 18, cy - 30); ctx.stroke();

    // Eyes: white sclera + blue-brown iris + dark pupil (readable, not neon)
    for (const side of [-1, 1]) {
      const ex = cx + side * 52;
      const ey = cy - 2;
      ctx.fillStyle = "#f2f3f6";
      ctx.beginPath(); ctx.ellipse(ex, ey, 30, 19, 0, 0, Math.PI * 2); ctx.fill();
      const iris = ctx.createRadialGradient(ex, ey, 2, ex, ey, 15);
      iris.addColorStop(0, "#6a9ab0");
      iris.addColorStop(0.45, "#3a5a72");
      iris.addColorStop(0.8, "#2a3a28");
      iris.addColorStop(1, "#1a2018");
      ctx.fillStyle = iris;
      ctx.beginPath(); ctx.arc(ex, ey, 14, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#0a0a0c";
      ctx.beginPath(); ctx.arc(ex, ey, 6.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath(); ctx.arc(ex - 4, ey - 4, 3.2, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "rgba(50, 28, 18, 0.6)";
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.ellipse(ex, ey - 2, 30, 19, 0, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
    }

    // Soft nose suggestion on the paint
    ctx.fillStyle = "rgba(120, 70, 45, 0.4)";
    ctx.beginPath(); ctx.ellipse(cx, cy + 30, 14, 24, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(230, 190, 150, 0.28)";
    ctx.beginPath(); ctx.ellipse(cx, cy + 18, 6, 10, 0, 0, Math.PI * 2); ctx.fill();

    // Lips
    ctx.fillStyle = "#b04a58";
    ctx.beginPath(); ctx.ellipse(cx, cy + 78, 36, 11, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#8e3848";
    ctx.beginPath(); ctx.ellipse(cx, cy + 88, 30, 9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(70, 18, 28, 0.5)";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx - 32, cy + 82); ctx.quadraticCurveTo(cx, cy + 86, cx + 32, cy + 82); ctx.stroke();

    // Freckles
    ctx.fillStyle = "rgba(120, 70, 40, 0.4)";
    for (const [x, y] of [[cx - 40, cy + 42], [cx - 28, cy + 52], [cx + 22, cy + 46], [cx + 38, cy + 54], [cx - 8, cy + 58], [cx + 10, cy + 50]]) {
      ctx.beginPath(); ctx.arc(x, y, 2.2, 0, Math.PI * 2); ctx.fill();
    }

    // Bangs fringe at top of card
    const hair = ctx.createLinearGradient(0, 0, 0, 130);
    hair.addColorStop(0, "rgba(32, 14, 6, 0.9)");
    hair.addColorStop(0.55, "rgba(40, 18, 8, 0.55)");
    hair.addColorStop(1, "rgba(40, 18, 8, 0)");
    ctx.fillStyle = hair;
    ctx.fillRect(0, 0, size, 135);

    tex.hasAlpha = false;
    tex.update();
    return tex;
  }

  /** White sclera + brown/blue iris + dark pupil — lit materials, no neon emissive dots. */
  static #eye(scene, parent, side) {
    const whiteMat = new BABYLON.StandardMaterial(`face-sclera-${side}`, scene);
    whiteMat.diffuseColor = new BABYLON.Color3(0.92, 0.93, 0.95);
    whiteMat.emissiveColor = new BABYLON.Color3(0.12, 0.12, 0.13);
    whiteMat.specularColor = new BABYLON.Color3(0.2, 0.2, 0.22);
    const sclera = BABYLON.MeshBuilder.CreateSphere(`face-sclera-${side}`, { diameter: 0.038, segments: 12 }, scene);
    sclera.material = whiteMat;
    sclera.parent = parent;
    sclera.position.set(side * 0.046, 0.035, 0.138);
    sclera.scaling.set(1.1, 0.82, 0.65);
    sclera.isPickable = false;

    const irisMat = new BABYLON.StandardMaterial(`face-iris-${side}`, scene);
    irisMat.diffuseColor = new BABYLON.Color3(0.28, 0.42, 0.48);
    irisMat.emissiveColor = new BABYLON.Color3(0.04, 0.06, 0.07);
    irisMat.specularColor = new BABYLON.Color3(0.15, 0.15, 0.18);
    const iris = BABYLON.MeshBuilder.CreateSphere(`face-iris-${side}`, { diameter: 0.02, segments: 10 }, scene);
    iris.material = irisMat;
    iris.parent = parent;
    iris.position.set(side * 0.046, 0.035, 0.152);
    iris.scaling.set(1, 1, 0.5);
    iris.isPickable = false;

    const pupilMat = new BABYLON.StandardMaterial(`face-pupil-${side}`, scene);
    pupilMat.diffuseColor = new BABYLON.Color3(0.04, 0.04, 0.05);
    pupilMat.emissiveColor = new BABYLON.Color3(0.01, 0.01, 0.01);
    pupilMat.specularColor = BABYLON.Color3.Black();
    const pupil = BABYLON.MeshBuilder.CreateSphere(`face-pupil-${side}`, { diameter: 0.01, segments: 8 }, scene);
    pupil.material = pupilMat;
    pupil.parent = parent;
    pupil.position.set(side * 0.046, 0.035, 0.158);
    pupil.isPickable = false;

    const hiMat = new BABYLON.StandardMaterial(`face-eye-hi-${side}`, scene);
    hiMat.diffuseColor = new BABYLON.Color3(0.95, 0.95, 0.97);
    hiMat.emissiveColor = new BABYLON.Color3(0.35, 0.35, 0.38);
    hiMat.specularColor = BABYLON.Color3.Black();
    const hi = BABYLON.MeshBuilder.CreateSphere(`face-eye-hi-${side}`, { diameter: 0.0055, segments: 6 }, scene);
    hi.material = hiMat;
    hi.parent = parent;
    hi.position.set(side * 0.04, 0.04, 0.16);
    hi.isPickable = false;
  }
}
