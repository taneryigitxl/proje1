import { schema } from "@colyseus/schema";

export const NetPlayer = schema(
  {
    characterId: { type: "string", default: "" },
    name: { type: "string", default: "" },
    x: { type: "number", default: 0 },
    y: { type: "number", default: 0 },
    facing: { type: "string", default: "down" },
    moving: { type: "boolean", default: false },
    running: { type: "boolean", default: false },
    gender: { type: "string", default: "female" },
    hairStyle: { type: "string", default: "short" },
    hairColor: { type: "string", default: "#3b2416" },
    level: { type: "number", default: 1 },
    classId: { type: "string", default: "warrior" },
    weaponId: { type: "string", default: "rusty-sword" },
    armorId: { type: "string", default: "travel-armor" },
    health: { type: "number", default: 100 },
    maxHealth: { type: "number", default: 100 },
    mana: { type: "number", default: 50 },
    maxMana: { type: "number", default: 50 },
    anim: { type: "string", default: "idle" },
    mounted: { type: "boolean", default: false },
  },
  "NetPlayer",
);

export const NetMob = schema(
  {
    kind: { type: "string", default: "slime" },
    name: { type: "string", default: "" },
    level: { type: "number", default: 1 },
    x: { type: "number", default: 0 },
    y: { type: "number", default: 0 },
    facing: { type: "string", default: "down" },
    health: { type: "number", default: 1 },
    maxHealth: { type: "number", default: 1 },
    anim: { type: "string", default: "idle" },
    alive: { type: "boolean", default: true },
  },
  "NetMob",
);

export const VillageState = schema(
  {
    players: { map: NetPlayer },
    mobs: { map: NetMob },
  },
  "VillageState",
);

export type NetPlayerState = InstanceType<typeof NetPlayer>;
export type VillageRoomState = InstanceType<typeof VillageState>;
