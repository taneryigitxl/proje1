export const PROTOCOL_VERSION = 2;
export const CLIENT = Object.freeze({
  MOVE:'MOVE_INPUT', ATTACK:'ATTACK_REQUEST', SKILL:'SKILL_REQUEST',
  PORTAL:'PORTAL_REQUEST', PICKUP:'PICKUP_REQUEST', EQUIP:'EQUIP_REQUEST',
  USE:'USE_ITEM_REQUEST', CHAT:'CHAT_MESSAGE', RESPAWN:'RESPAWN_REQUEST',
  INTERACT:'INTERACT_REQUEST', PING:'PING',
});
export const SERVER = Object.freeze({
  WELCOME:'WELCOME', SNAPSHOT:'WORLD_SNAPSHOT', DELTA:'WORLD_DELTA',
  SPAWN:'PLAYER_SPAWN', DESPAWN:'PLAYER_DESPAWN', REGION:'REGION_CHANGE',
  COMBAT:'COMBAT_RESULT', LOOT:'LOOT_SPAWN', LOOT_REMOVE:'LOOT_REMOVE',
  INVENTORY:'INVENTORY_UPDATE', PROGRESSION:'PROGRESSION_UPDATE',
  BUFF:'BUFF_UPDATE', CHAT:'CHAT_MESSAGE', ERROR:'ERROR', PONG:'PONG',
});
export const MAX_PACKET_BYTES=4096;
export function parseClientPacket(raw){
  if(typeof raw!=='string'||BufferByteLength(raw)>MAX_PACKET_BYTES)return null;
  let data;try{data=JSON.parse(raw);}catch{return null;}
  if(!data||typeof data!=='object'||Array.isArray(data)||!Object.values(CLIENT).includes(data.type)||!Number.isSafeInteger(data.seq)||data.seq<0)return null;
  return data;
}
const BufferByteLength=text=>new TextEncoder().encode(text).length;
