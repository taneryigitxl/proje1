export class CameraControls {
  constructor(canvas, camera, config) {
    this.canvas = canvas; this.camera = camera; this.config = config;
    this.radius = config.distance; this.dragging = false;
    this.down = e => { if (e.button === 2) { e.preventDefault(); this.dragging = true; canvas.setPointerCapture(e.pointerId); } };
    this.move = e => { if (this.dragging && (e.buttons & 2)) camera.alpha -= e.movementX * config.sensitivityX; };
    this.up = () => { this.dragging = false; };
    this.wheel = e => { e.preventDefault(); this.radius = Math.max(config.minDistance, Math.min(config.maxDistance, this.radius + e.deltaY * config.zoomStep)); };
    canvas.addEventListener('pointerdown', this.down); canvas.addEventListener('pointermove', this.move);
    canvas.addEventListener('wheel', this.wheel, { passive: false });
    window.addEventListener('pointerup', this.up); window.addEventListener('blur', this.up);
  }
  dispose() {
    this.canvas.removeEventListener('pointerdown', this.down); this.canvas.removeEventListener('pointermove', this.move);
    this.canvas.removeEventListener('wheel', this.wheel); window.removeEventListener('pointerup', this.up); window.removeEventListener('blur', this.up);
  }
}
