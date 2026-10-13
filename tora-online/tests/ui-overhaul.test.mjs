import test from 'node:test';
import assert from 'node:assert/strict';
import { ChestState, CHEST } from '../src/world/ChestState.js';
import { EQUIPMENT_SLOTS, createEquipment } from '../src/progression/EquipmentSchema.js';
import { PanelManager } from '../src/ui/PanelManager.js';
import { LocalNetworkAdapter } from '../src/network/LocalNetworkAdapter.js';
import { OnlineNetworkAdapter } from '../src/network/OnlineNetworkAdapter.js';

function group(name) {
  const listeners = new Set();
  const target = { position: 0 };
  const group = { name, from: 0, to: 10, starts: 0, stops: 0, disposes: 0, target,
    targetedAnimations: [{ target, animation: { targetPropertyPath: ['position'], getKeys: () => [{ frame: 0, value: 0 }, { frame: 10, value: 1 }] } }],
    onAnimationGroupEndObservable: { add(callback) { listeners.add(callback); return callback; }, remove(callback) { listeners.delete(callback); } },
    start(loop) { assert.equal(loop, false); this.starts++; }, stop() { this.stops++; }, dispose() { this.disposes++; },
    end() { for (const callback of [...listeners]) callback(); },
  };
  return group;
}
test('chest starts one nonlooping animation and one open cue, then holds a static pose', () => {
  let cues = 0; const opening = group('chest_open'), opened = group('chest_opened');
  const chest = new ChestState('chest-a', {}, [opening, opened], () => cues++);
  assert.equal(chest.state, CHEST.CLOSED); assert.equal(opening.starts, 0); assert.equal(opened.starts, 0);
  assert.equal(chest.open(), true); assert.equal(chest.open(), false); assert.equal(cues, 1); assert.equal(opening.starts, 1);
  opening.end(); assert.equal(chest.state, CHEST.OPEN); assert.equal(opened.target.position, 1); assert.equal(opened.starts, 0);
  assert.equal(chest.open(), false); assert.equal(chest.loot(), true); assert.equal(chest.open(), false); assert.equal(cues, 1);
  chest.dispose(); assert.equal(opening.disposes, 1); assert.equal(opened.disposes, 1);
});
test('restored looted chest holds its pose without animation or cue', () => {
  let cues = 0; const opening = group('chest_open'), opened = group('chest_opened');
  const chest = new ChestState('chest-b', {}, [opening, opened], () => cues++); chest.restoreLooted();
  assert.equal(chest.state, CHEST.LOOTED); assert.equal(opened.target.position, 1); assert.equal(opening.starts + opened.starts, 0); assert.equal(cues, 0);
});
test('ten equipment keys migrate armor to chest and preserve intentional empty slots', () => {
  assert.equal(EQUIPMENT_SLOTS.length, 10); assert.deepEqual(EQUIPMENT_SLOTS.filter(slot => slot.active).map(slot => slot.id), ['weapon', 'chest']);
  const legacy = createEquipment({ weapon: 'rusty-sword', armor: 'leather-vest' });
  assert.equal(legacy.chest, 'leather-vest'); assert.equal(legacy.armor, 'leather-vest');
  assert.equal(Object.hasOwn({ ...legacy }, 'armor'), false);
  const empty = createEquipment({ weapon: null, chest: null }); assert.equal(empty.weapon, null); assert.equal(empty.chest, null);
});
test('panel manager keeps one major panel and honours modal gate', () => {
  let blocked = false; const changes = [], manager = new PanelManager({ blocked: () => blocked, onChange: id => changes.push(id) });
  const a = { hidden: true }, b = { hidden: true }; manager.register('inventory', { element: a }); manager.register('stats', { element: b });
  assert(manager.open('inventory')); assert.equal(a.hidden, false);
  assert(manager.open('stats')); assert.equal(a.hidden, true); assert.equal(b.hidden, false); assert.equal(manager.active, 'stats');
  blocked = true; assert.equal(manager.open('inventory'), false); assert.equal(manager.active, 'stats');
  assert(manager.close()); assert.equal(b.hidden, true); assert.equal(manager.active, null); assert.deepEqual(changes, ['inventory', null, 'stats', null]);
});
test('local adapter is explicit offline mode and online adapter only accepts ordered server snapshots', async () => {
  const local = new LocalNetworkAdapter(); assert.equal(local.mode, 'offline'); await local.connect(); assert.equal(local.connected, true); assert.equal(local.capabilities.chat.general, true); local.disconnect();
  let callback, sent = []; const transport = { async connect() { return { protocolVersion: 1, authoritative: true, capabilities: { chat: { general: true } } }; }, onSnapshot(fn) { callback = fn; return () => {}; }, send(packet) { sent.push(packet); return true; }, disconnect() {} };
  const online = new OnlineNetworkAdapter(transport), received = [];
  online.addEventListener('snapshot', event => received.push(event.detail));
  await online.connect(); assert(online.sendInput({ move: [1, 2] })); assert.equal(sent[0].type, 'intent');
  assert.equal(online.receiveSnapshot({ revision: 1, entities: [] }), true); assert.equal(online.receiveSnapshot({ revision: 1, entities: [] }), false);
  assert.equal(received.length, 1); assert.equal(received[0].authoritative, true);
  assert.throws(() => online.publishSnapshot({ health: 0 }), /sunucu/); online.disconnect();
  assert(callback);
});
