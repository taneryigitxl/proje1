/**
 * Lightweight procedural ambient bed — wind + soft insects via Web Audio.
 * No external assets required; fails soft if AudioContext unavailable.
 */
export class AmbientAudio {
  constructor() {
    this.ctx = null;
    this.started = false;
    this.nodes = [];
    this.footTimer = 0;
    this.lastSurface = "grass";
  }

  async ensure() {
    if (this.started) return true;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return false;
      this.ctx = new Ctx();
      if (this.ctx.state === "suspended") await this.ctx.resume();
      this.#buildWind();
      this.#buildInsects();
      this.started = true;
      console.info("[Tora Audio] Ortam sesi aktif.");
      return true;
    } catch (error) {
      console.warn("[Tora Audio] Ortam sesi başlatılamadı.", error);
      return false;
    }
  }

  update(dt, player) {
    if (!this.started || !player) return;
    const speed = Math.hypot(player.velocity?.x || 0, player.velocity?.z || 0);
    if (speed < 0.8 || !player.grounded) {
      this.footTimer = 0;
      return;
    }
    const interval = player.state === "run" ? 0.32 : 0.48;
    this.footTimer += dt;
    if (this.footTimer >= interval) {
      this.footTimer = 0;
      this.#footstep(player);
    }
  }

  playHit(heavy = false) {
    if (!this.started || !this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(heavy ? 90 : 140, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.12);
    gain.gain.setValueAtTime(heavy ? 0.12 : 0.07, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.15);
  }

  dispose() {
    for (const node of this.nodes) {
      try { node.stop?.(); node.disconnect?.(); } catch (_) { /* ok */ }
    }
    this.nodes = [];
    try { this.ctx?.close(); } catch (_) { /* ok */ }
    this.ctx = null;
    this.started = false;
  }

  #buildWind() {
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.4;
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 380;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.028;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    source.start();
    this.nodes.push(source, filter, gain);
  }

  #buildInsects() {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 2200;
    gain.gain.value = 0.004;
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.frequency.value = 3.2;
    lfoGain.gain.value = 0.003;
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    lfo.start();
    this.nodes.push(osc, gain, lfo, lfoGain);
  }

  #footstep(player) {
    if (!this.ctx) return;
    const x = player.position.x;
    const z = player.position.z;
    // Dirt road corridor
    const roadIndex = (z + 35) / 2.65;
    const onRoad = roadIndex >= 0 && roadIndex <= 28 && Math.abs(x - Math.sin(roadIndex * 0.4) * 2.35) < 4.2;
    // Stone near bridge / camp approach
    const onStone = Math.hypot(x + 0, z - 6.2) < 3.2 || Math.hypot(x, z - 17) < 9;
    const surface = onStone ? "stone" : onRoad ? "dirt" : "grass";
    this.lastSurface = surface;
    const t = this.ctx.currentTime;
    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * (surface === "stone" ? 0.05 : 0.08), this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const env = 1 - i / data.length;
      data[i] = (Math.random() * 2 - 1) * env * env;
    }
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = surface === "stone" ? 900 : surface === "dirt" ? 280 : 520;
    const gain = this.ctx.createGain();
    gain.gain.value = surface === "stone" ? 0.06 : surface === "dirt" ? 0.05 : 0.035;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    source.start(t);
  }
}
