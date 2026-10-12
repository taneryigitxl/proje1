/** Soft ground range and area marker for an armed skill. */
export class SkillMarker {
  constructor(scene) {
    this.scene = scene;
    this.root = new BABYLON.TransformNode('skill-marker', scene);
    this.texture = this.#texture();
    this.range = this.#ring('skill-range', 2, 0.045);
    this.area = this.#disc('skill-area', 1);
    this.aim = this.#disc('skill-aim', 0.55);
    this.root.setEnabled(false);
  }

  update(skill, player) {
    if (!skill) {
      this.root.setEnabled(false);
      return;
    }
    this.root.setEnabled(true);
    const color = BABYLON.Color3.FromHexString(skill.color || '#c4a15a');
    const pulse = 0.34 + Math.sin(performance.now() * 0.004) * 0.06;
    for (const mesh of [this.range, this.area, this.aim]) mesh.material.emissiveColor = color;
    this.range.material.alpha = 0.42 + pulse * 0.15;
    this.area.material.alpha = pulse;
    const y = player.navigation.heightAt(player.position.x, player.position.z) + 0.06;
    const reach = Math.max(0.8, skill.range || 2);
    this.range.position.set(player.position.x, y, player.position.z);
    this.range.scaling.set(reach, reach, 1);
    const ground = this.scene.pick(this.scene.pointerX, this.scene.pointerY, (mesh) => Boolean(mesh.metadata?.ground));
    const aim = ground?.hit ? ground.pickedPoint : null;
    if (skill.aoe) {
      this.area.setEnabled(true);
      this.area.position.set(player.position.x, y + 0.01, player.position.z);
      this.area.scaling.setAll(reach);
      this.aim.setEnabled(false);
      return;
    }
    this.area.setEnabled(false);
    if (!aim || (skill.action !== 'dash' && skill.target !== 'enemy')) {
      this.aim.setEnabled(false);
      return;
    }
    const flat = new BABYLON.Vector3(aim.x - player.position.x, 0, aim.z - player.position.z);
    const allowed = skill.target === 'enemy' || flat.length() <= reach + 0.35;
    this.aim.setEnabled(allowed);
    if (!allowed) return;
    this.aim.position.set(aim.x, player.navigation.heightAt(aim.x, aim.z) + 0.07, aim.z);
    this.aim.scaling.setAll(skill.target === 'enemy' ? 0.85 : 0.7);
  }

  hide() { this.root.setEnabled(false); }

  dispose() {
    this.texture.dispose();
    this.range.dispose();
    this.area.dispose();
    this.aim.dispose();
    this.root.dispose();
  }

  #ring(name, diameter, thickness) {
    const mesh = BABYLON.MeshBuilder.CreateTorus(name, { diameter, thickness, tessellation: 56 }, this.scene);
    mesh.rotation.x = Math.PI / 2;
    mesh.parent = this.root;
    mesh.isPickable = false;
    mesh.material = this.#material(name, 0.5);
    return mesh;
  }

  #disc(name, radius) {
    const mesh = BABYLON.MeshBuilder.CreateDisc(name, { radius, tessellation: 48 }, this.scene);
    mesh.rotation.x = Math.PI / 2;
    mesh.parent = this.root;
    mesh.isPickable = false;
    mesh.material = this.#material(name, 0.32, true);
    mesh.setEnabled(false);
    return mesh;
  }

  #material(name, alpha, textured = false) {
    const mat = new BABYLON.StandardMaterial(name + '-mat', this.scene);
    mat.disableLighting = true;
    mat.emissiveColor = new BABYLON.Color3(0.72, 0.58, 0.32);
    mat.diffuseColor = new BABYLON.Color3(0.2, 0.16, 0.1);
    mat.alpha = alpha;
    mat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
    mat.backFaceCulling = false;
    mat.disableDepthWrite = true;
    if (textured) {
      mat.opacityTexture = this.texture;
      mat.useAlphaFromDiffuseTexture = false;
    }
    return mat;
  }

  #texture() {
    const size = 256;
    const tex = new BABYLON.DynamicTexture('skill-marker-soft', { width: size, height: size }, this.scene, false);
    const ctx = tex.getContext();
    const fade = ctx.createRadialGradient(128, 128, 18, 128, 128, 124);
    fade.addColorStop(0, 'rgba(255,255,255,0.62)');
    fade.addColorStop(0.62, 'rgba(255,255,255,0.22)');
    fade.addColorStop(0.86, 'rgba(255,255,255,0.48)');
    fade.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = fade;
    ctx.beginPath();
    ctx.arc(128, 128, 124, 0, Math.PI * 2);
    ctx.fill();
    tex.hasAlpha = true;
    tex.update();
    return tex;
  }
}
