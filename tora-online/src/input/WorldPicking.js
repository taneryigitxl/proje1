// Only interaction proxies are picked. Shared by hover, click and keyboard targeting.
export function pickWorldAction(scene, entities, roots = []) {
  const pick = scene.pick(scene.pointerX, scene.pointerY, mesh => {
    const data = mesh.metadata;
    if (data?.mob) return Boolean(data.selectionProxy && entities.getById(data.entityId)?.alive);
    return Boolean(data?.portal || data?.npc || data?.loot || data?.interactive || data?.lootPickup || data?.chest);
  });
  if (!pick?.hit) return null;
  const ray = scene.createPickingRay(scene.pointerX, scene.pointerY, BABYLON.Matrix.IdentityReadOnly, scene.activeCamera);
  for (const root of roots) {
    const bounds = root.metadata?.occlusionBounds;
    if (!root.metadata?.blocksSelection || !bounds || root.isDisposed()) continue;
    const distance = ray.intersectsBoxMinMax(bounds.min, bounds.max) ? boxDistance(ray, bounds) : Infinity;
    if (distance < pick.distance - .05) return null;
  }
  return pick;
}

function boxDistance(ray, bounds) {
  let enter = 0, exit = Infinity;
  for (const axis of ['x', 'y', 'z']) {
    const d = ray.direction[axis], o = ray.origin[axis];
    if (Math.abs(d) < 1e-8) { if (o < bounds.min[axis] || o > bounds.max[axis]) return Infinity; continue; }
    const a = (bounds.min[axis] - o) / d, b = (bounds.max[axis] - o) / d;
    enter = Math.max(enter, Math.min(a, b)); exit = Math.min(exit, Math.max(a, b));
    if (enter > exit) return Infinity;
  }
  return enter;
}
