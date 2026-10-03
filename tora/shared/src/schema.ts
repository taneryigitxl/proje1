import { schema } from "@colyseus/schema";

export const NetPlayer = schema(
  {
    characterId: { type: "string", default: "" },
    name: { type: "string", default: "" },
    x: { type: "number", default: 0 },
    y: { type: "number", default: 0 },
    facing: { type: "string", default: "down" },
    moving: { type: "boolean", default: false },
    gender: { type: "string", default: "female" },
    hairStyle: { type: "string", default: "short" },
    hairColor: { type: "string", default: "#3b2416" },
    level: { type: "number", default: 1 },
  },
  "NetPlayer",
);

export const VillageState = schema(
  {
    players: { map: NetPlayer },
  },
  "VillageState",
);

export type NetPlayerState = InstanceType<typeof NetPlayer>;
export type VillageRoomState = InstanceType<typeof VillageState>;
