/** Wheel zoom only. Camera yaw and pitch stay locked. */
export class CameraControls {
  constructor(canvas, config) {
    this.canvas = canvas;
    this.config = config;
    this.radius = config.distance;
    this.wheel = (event) => {
      event.preventDefault();
      const step = Math.sign(event.deltaY) * Math.min(1.4, Math.abs(event.deltaY) * config.zoomStep);
      this.radius = Math.max(config.minDistance, Math.min(config.maxDistance, this.radius + step));
    };
    canvas.addEventListener('wheel', this.wheel, { passive: false });
  }

  dispose() {
    this.canvas.removeEventListener('wheel', this.wheel);
  }
}
