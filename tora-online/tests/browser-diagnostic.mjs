const [,, pageUrl = "http://127.0.0.1:4173/tora-online/", port = "9223"] = process.argv;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
const target = tabs.find((tab) => tab.url.startsWith(pageUrl));
if (!target) throw new Error(`Tora Online tab not found for ${pageUrl}.`);

const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});

let commandId = 0;
const pending = new Map();
const events = [];
socket.addEventListener("message", ({ data }) => {
  const message = JSON.parse(data);
  if (!message.id) {
    events.push(message);
    return;
  }
  const command = pending.get(message.id);
  if (!command) return;
  pending.delete(message.id);
  if (message.error) command.reject(new Error(JSON.stringify(message.error)));
  else command.resolve(message.result);
});

function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++commandId;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
}

await Promise.all([
  send("Runtime.enable"),
  send("Log.enable"),
  send("Network.enable"),
  send("Page.enable"),
]);
await send("Page.reload", { ignoreCache: true });
await sleep(2_000);
await send("Runtime.evaluate", {
  expression: "document.getElementById('start-button').click(); true",
  returnByValue: true,
});

let state = null;
for (let attempt = 0; attempt < 120; attempt++) {
  await sleep(500);
  const result = await send("Runtime.evaluate", {
    expression: `JSON.stringify({
      fatal: !document.getElementById("fatal-error").hidden,
      error: document.querySelector("#fatal-error span").textContent,
      loading: !document.getElementById("loading-screen").hidden,
      entered: document.getElementById("menu-screen").classList.contains("is-leaving"),
      debug: Boolean(window.__TORA_DEBUG__),
      scene: Boolean(BABYLON.EngineStore.LastCreatedScene)
    })`,
    returnByValue: true,
  });
  if (typeof result.result?.value !== "string") {
    state = { evaluationError: result };
    break;
  }
  state = JSON.parse(result.result.value);
  if (state.fatal || state.entered) break;
}

const requests = new Map();
const failures = [];
const exceptions = [];
const consoleMessages = [];
for (const event of events) {
  if (event.method === "Network.requestWillBeSent") {
    requests.set(event.params.requestId, event.params.request.url);
  }
  if (event.method === "Network.responseReceived" && event.params.response.status >= 400) {
    failures.push({ type: "http", status: event.params.response.status, url: event.params.response.url });
  }
  if (event.method === "Network.loadingFailed") {
    failures.push({
      type: "network",
      url: requests.get(event.params.requestId) || event.params.requestId,
      error: event.params.errorText,
      blockedReason: event.params.blockedReason || null,
    });
  }
  if (event.method === "Runtime.exceptionThrown") exceptions.push(event.params.exceptionDetails);
  if (event.method === "Runtime.consoleAPICalled") {
    consoleMessages.push({
      type: event.params.type,
      values: event.params.args.map((value) => value.value ?? value.description),
      stack: event.params.stackTrace || null,
    });
  }
  if (event.method === "Log.entryAdded" && ["error", "warning"].includes(event.params.entry.level)) {
    consoleMessages.push({ type: `log-${event.params.entry.level}`, values: [event.params.entry.text], stack: event.params.entry });
  }
}

const runtimeState = await send("Runtime.evaluate", {
  expression: `JSON.stringify({
    grass: window.__TORA_DEBUG__?.getGrassStats?.() || null,
    fps: Math.round(BABYLON.EngineStore.LastCreatedEngine?.getFps?.() || 0),
    renderId: BABYLON.EngineStore.LastCreatedScene?.getRenderId?.() || 0,
    meshes: BABYLON.EngineStore.LastCreatedScene?.meshes?.length || 0
  })`,
  returnByValue: true,
});
const runtime = runtimeState.result?.value ? JSON.parse(runtimeState.result.value) : runtimeState;
console.log(JSON.stringify({
  state,
  runtime,
  failures,
  exceptions,
  consoleMessages,
  requests: [...requests.values()].filter((url) => !url.startsWith("blob:") && !url.startsWith("data:")),
}, null, 2));
socket.close();
