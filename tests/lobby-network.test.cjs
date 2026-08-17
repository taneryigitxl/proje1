const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync(require("node:path").join(__dirname, "..", "script.js"), "utf8");
new vm.Script(source, { filename: "script.js" });

const section = (start, end) => {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from);
  assert(from >= 0 && to > from, `Test section not found: ${start}`);
  return source.slice(from, to);
};
const networkSource = [
  section("const ROOM_CODE_PATTERN", "function showJoinRetry"),
  section("function beginMultiplayer", "function receivePacket"),
  section("function connectionProblem", 'createRoomButton.addEventListener'),
].join("\n");

class Emitter {
  constructor() {
    this.events = new Map();
    this.open = false;
    this.closed = false;
    this.sent = [];
    this.peerConnection = { connectionState: "new", iceConnectionState: "new", addEventListener() {} };
  }
  on(type, listener) {
    const listeners = this.events.get(type) || [];
    listeners.push(listener);
    this.events.set(type, listeners);
    return this;
  }
  emit(type, ...args) {
    for (const listener of [...(this.events.get(type) || [])]) listener(...args);
  }
  send(data) { this.sent.push(data); }
  succeed() { this.open = true; this.emit("open"); }
  close() {
    if (this.closed) return;
    this.closed = true;
    const wasOpen = this.open;
    this.open = false;
    if (wasOpen) this.emit("close");
  }
}

function createHarness() {
  const elements = {};
  const element = () => ({ hidden: false, textContent: "", disabled: false, style: {}, focus() {}, classList: { add() {}, remove() {} } });
  for (const name of ["lobbyActions", "joinForm", "roomWait", "characterSelect", "connectionBadge", "overlayText", "roomWaitStatus", "roomInput", "overlay"]) elements[name] = element();
  const peers = [];
  class FakePeer extends Emitter {
    constructor(id, options) {
      super();
      this.id = id;
      this.options = options;
      this.destroyed = false;
      this.disconnected = false;
      peers.push(this);
    }
    destroy() { this.destroyed = true; this.open = false; }
    reconnect() { this.reconnected = true; }
  }
  const received = [];
  const context = {
    ...elements,
    Peer: FakePeer,
    crypto: { randomUUID: () => "123e4567-e89b-12d3-a456-426614174000" },
    console,
    queueMicrotask,
    clearTimeout,
    setTimeout: (callback, delay) => setTimeout(callback, delay >= 8000 ? 25 : delay),
    requestAnimationFrame: callback => callback(),
    network: { role: "solo", character: null, hostCharacter: null, peer: null, connection: null, connectionTimer: null, attempt: 0, lastSync: 0 },
    document: { body: { classList: { add() {}, remove() {} } }, querySelectorAll: () => [], querySelector: () => ({ textContent: "" }) },
    state: { running: false },
    COLORS: {},
    performance: { now: () => 0 },
    resetCampaign() {},
    showMessage() {},
    showJoinRetry(text) { elements.joinForm.hidden = false; elements.overlayText.textContent = text; },
    showCharacterSelect() { elements.roomWait.hidden = true; elements.characterSelect.hidden = false; },
    receivePacket(data) { received.push(data); },
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(networkSource, context, { filename: "lobby-network-section.js" });
  return { context, peers, received, run: code => vm.runInContext(code, context) };
}

const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

(async () => {
  {
    const h = createHarness();
    assert.equal(h.run("guestPeerId()"), "nita-guest-123e4567e89b12d3a456426614174000");
    h.run("createGamePeer(guestPeerId())");
    assert.match(h.peers[0].id, /^nita-guest-[a-z0-9]+$/);
    assert.equal(h.peers[0].options.host, "0.peerjs.com");
    assert.deepEqual([...h.peers[0].options.config.iceServers[0].urls], [
      "stun:stun.l.google.com:19302",
      "stun:stun.cloudflare.com:3478",
      "stun:stun.relay.metered.ca:80",
    ]);
  }

  {
    const h = createHarness();
    h.context.hostPeer = { destroyed: false };
    h.context.first = new Emitter();
    h.run('network.attempt=7;network.role="host";network.peer=hostPeer;bindConnection(first,"host",7)');
    await wait(55);
    assert.equal(h.run("network.peer===hostPeer"), true, "failed guest must not destroy the host room");
    assert.equal(h.run("network.connection"), null);
    assert.equal(h.context.connectionBadge.textContent, "OYUNCU BEKLENİYOR");
  }

  {
    const h = createHarness();
    h.context.hostPeer = { destroyed: false, open: true };
    h.context.oldConnection = new Emitter();
    h.context.newConnection = new Emitter();
    h.run('network.attempt=4;network.role="host";network.peer=hostPeer;bindConnection(oldConnection,"host",4);bindConnection(newConnection,"host",4)');
    assert.equal(h.context.oldConnection.closed, true, "new guest must replace a stale pending connection");
    assert.equal(h.context.newConnection.closed, false);
    h.context.newConnection.succeed();
    await wait(0);
    assert.equal(h.context.characterSelect.hidden, false);
    assert.equal(h.context.overlayText.textContent, "Bağlantı kuruldu. Karakterini seç.");
    h.context.newConnection.emit("data", { type: "host-choice" });
    assert.deepEqual(h.received, [{ type: "host-choice" }], "packets must flow after open");
    h.run('peerError({type:"webrtc"},"host",4)');
    assert.equal(h.context.characterSelect.hidden, false, "late WebRTC errors must not replace active-game UI");
  }

  {
    const h = createHarness();
    h.context.guestPeer = new h.context.Peer("guest", {});
    h.context.guestConnection = new Emitter();
    h.run('network.attempt=9;network.role="guest";network.peer=guestPeer;bindConnection(guestConnection,"guest",9)');
    await wait(55);
    assert.equal(h.context.joinForm.hidden, false, "guest timeout must restore the join form");
    assert.equal(h.context.guestPeer.destroyed, true, "guest timeout must clean up its Peer");
  }

  assert(source.includes('if(attempt!==network.attempt||network.connection?.open)return'), "guest reconnect guard missing");
  assert(source.includes('if(!connection)throw new Error("PeerJS bağlantı nesnesi oluşturmadı.")'), "guest connect null guard missing");
  assert.match(source, /let peer;try\{peer=createGamePeer/g, "Peer construction guard missing");
  console.log("Lobby network tests passed.");
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
