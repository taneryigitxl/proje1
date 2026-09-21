export class NetworkAdapter extends EventTarget {
  constructor() {
    super();
    this.mode = "offline";
    this.connected = false;
    this.sequence = 0;
  }
  async connect() {
    this.connected = true;
    this.dispatchEvent(new CustomEvent("connected", { detail: { mode: this.mode } }));
    return { mode: this.mode, authoritative: false };
  }
  disconnect() { this.connected = false; }
  sendInput(input) {
    const packet = { sequence: ++this.sequence, clientTime: performance.now(), input };
    this.dispatchEvent(new CustomEvent("input", { detail: packet }));
    return packet;
  }
  publishSnapshot(entities) {
    const snapshot = { sequence: this.sequence, serverTime: performance.now(), entities: entities.map((entity) => entity.serialize()) };
    this.dispatchEvent(new CustomEvent("snapshot", { detail: snapshot }));
    return snapshot;
  }
}
