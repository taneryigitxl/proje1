/** Place a world label with subpixel translate3d and a short, frame-rate independent blend. */
export function placeAnchor(node, x, y, dt) {
  let nx = x;
  let ny = y;
  const prev = node._screen;
  if (prev && Number.isFinite(prev.x) && Number.isFinite(prev.y) && dt > 0 && dt < 0.2) {
    const blend = 1 - Math.exp(-28 * dt);
    nx = prev.x + (x - prev.x) * blend;
    ny = prev.y + (y - prev.y) * blend;
  }
  node._screen = { x: nx, y: ny };
  node.style.transform = `translate3d(${nx}px, ${ny}px, 0) translate(-50%, -100%)`;
}
