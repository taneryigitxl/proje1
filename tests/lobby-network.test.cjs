const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const root = require("node:path").join(__dirname, "..");
const source = fs.readFileSync(require("node:path").join(root, "script.js"), "utf8");
const indexSource = fs.readFileSync(require("node:path").join(root, "index.html"), "utf8");
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

function createHarness({ turnPayload, fetchOk = true, fetchImpl } = {}) {
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
  let fetchCalls = 0;
  const defaultTurnPayload = [
    { urls: "stun:stun.relay.test:80" },
    { urls: "turn:relay.test:443", username: "test-user", credential: "test-credential" },
    { urls: "turns:relay.test:443?transport=tcp", username: "test-user", credential: "test-credential" },
  ];
  const context = {
    ...elements,
    Peer: FakePeer,
    AbortController,
    fetch: async (...args) => {
      fetchCalls++;
      if(fetchImpl)return fetchImpl(...args);
      return { ok: fetchOk, status: fetchOk ? 200 : 503, json: async () => turnPayload || defaultTurnPayload };
    },
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
  return { context, peers, received, fetchCalls: () => fetchCalls, run: code => vm.runInContext(code, context) };
}

const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

(async () => {
  {
    const h = createHarness();
    assert.equal(h.run("guestPeerId()"), "nita-guest-123e4567e89b12d3a456426614174000");
    await h.run("createGamePeer(guestPeerId())");
    await h.run('createGamePeer("nita-guest-second")');
    assert.match(h.peers[0].id, /^nita-guest-[a-z0-9]+$/);
    assert.equal(h.peers[0].options.host, "0.peerjs.com");
    assert.deepEqual([...h.peers[0].options.config.iceServers[0].urls], [
      "stun:stun.l.google.com:19302",
      "stun:stun.cloudflare.com:3478",
      "stun:stun.relay.metered.ca:80",
    ]);
    const urls = h.peers[0].options.config.iceServers.flatMap(server => Array.isArray(server.urls) ? server.urls : [server.urls]);
    assert(urls.some(url => url.startsWith("turn:")), "TURN relay must be passed to PeerJS");
    assert(urls.some(url => url.startsWith("turns:")), "TLS TURN relay must be passed to PeerJS");
    assert.equal(h.fetchCalls(), 1, "TURN credentials must be cached after the first successful fetch");
  }

  {
    const h = createHarness({ turnPayload: [{ urls: "stun:stun-only.test:3478" }] });
    await assert.rejects(h.run('createGamePeer("nita-guest-no-relay")'), /relay adresi/);
    assert.equal(h.peers.length, 0, "PeerJS must not start without a working TURN relay");
  }

  {
    let call = 0;
    const relayPayload = [
      { urls: "turn:relay-retry.test:443", username: "retry-user", credential: "retry-credential" },
    ];
    const h = createHarness({ fetchImpl: async () => ++call === 1
      ? { ok: false, status: 503, json: async () => [] }
      : { ok: true, status: 200, json: async () => relayPayload } });
    await assert.rejects(h.run('createGamePeer("nita-guest-first")'), /HTTP 503/);
    await h.run('createGamePeer("nita-guest-retry")');
    assert.equal(h.fetchCalls(), 2, "a failed TURN fetch must be retried");
    assert.equal(h.peers.length, 1, "PeerJS must start after a successful TURN retry");
  }

  {
    let releaseFetch;
    const responsePromise = new Promise(resolve => { releaseFetch = resolve; });
    const h = createHarness({ fetchImpl: () => responsePromise });
    h.run("network.attempt=5");
    const pendingPeer = h.run('createGamePeer("nita-guest-stale",5)');
    h.run("network.attempt=6");
    releaseFetch({ ok: true, status: 200, json: async () => [
      { urls: "turns:relay-stale.test:443", username: "stale-user", credential: "stale-credential" },
    ] });
    assert.equal(await pendingPeer, null, "a stale async attempt must not construct PeerJS");
    assert.equal(h.peers.length, 0);
  }

  {
    const h = createHarness({ fetchImpl: (_url,options) => new Promise((_,reject) => {
      options.signal.addEventListener("abort",() => reject(new Error("turn-fetch-aborted")),{ once:true });
    }) });
    await assert.rejects(h.run('createGamePeer("nita-guest-timeout")'), /turn-fetch-aborted/);
    assert.equal(h.peers.length, 0, "a timed-out TURN fetch must not construct PeerJS");
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
    h.context.pendingConnection = new Emitter();
    h.run('network.attempt=8;network.role="host";network.peer=hostPeer;bindConnection(pendingConnection,"host",8);peerError({type:"webrtc"},"host",8)');
    assert.equal(h.run("network.connection===pendingConnection"), true, "an unscoped late WebRTC error must not kill a newer pending connection");
    assert.equal(h.context.pendingConnection.closed, false);
    h.context.pendingConnection.__nitaCancel();
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
  assert.match(source, /let peer;try\{peer=await createGamePeer/g, "Async Peer construction guard missing");
  assert(source.includes('createRoomButton.addEventListener("click",async()=>'), "host handler must await TURN setup");
  assert(source.includes('joinForm.addEventListener("submit",async e=>'), "guest handler must await TURN setup");
  assert(indexSource.includes('script.js?v=20260817-3'), "script cache version was not updated");
  assert.equal(source.includes("secretKey="), false, "an account Secret Key must never be shipped to the browser");
  console.log("Lobby network tests passed.");
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
