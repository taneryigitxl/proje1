import { TILE_SIZE } from "./constants.js";
import { isDirection, type Direction } from "./direction.js";
import { isWalkable, type CollisionMap } from "./movement.js";

export interface TiledProperty {
  name: string;
  type?: string;
  value: string | number | boolean;
}

export interface TiledObject {
  id?: number;
  name?: string;
  type?: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  properties?: TiledProperty[];
}

export interface TiledLayer {
  name: string;
  type: string;
  width?: number;
  height?: number;
  data?: number[];
  objects?: TiledObject[];
}

export interface TiledMap {
  width: number;
  height: number;
  tilewidth: number;
  tileheight: number;
  layers: TiledLayer[];
}

export interface MapMarker {
  id: string;
  name: string;
  kind: "spawn" | "npc" | "monster" | "portal";
  x: number;
  y: number;
  role?: string;
  facing?: Direction;
  targetMapId?: string;
}

function layer(map: TiledMap, name: string, type: string): TiledLayer | undefined {
  return map.layers.find((entry) => entry.name === name && entry.type === type);
}

function property(object: TiledObject, name: string): string | undefined {
  const value = object.properties?.find((entry) => entry.name === name)?.value;
  return value === undefined ? undefined : String(value);
}

export function collisionFromTiled(map: TiledMap): CollisionMap {
  const collision = layer(map, "collision", "tilelayer");
  const expected = map.width * map.height;
  if (!collision?.data || collision.data.length !== expected) {
    throw new Error("Tora Village is missing a collision layer.");
  }

  const blocked = new Uint8Array(expected);
  for (let index = 0; index < expected; index += 1) {
    blocked[index] = (collision.data[index] ?? 0) === 0 ? 0 : 1;
  }

  return {
    width: map.width,
    height: map.height,
    tileSize: map.tilewidth || TILE_SIZE,
    blocked,
  };
}

export function markersFromTiled(map: TiledMap): MapMarker[] {
  const groups: Array<{ name: string; kind: MapMarker["kind"] }> = [
    { name: "spawns", kind: "spawn" },
    { name: "npcs", kind: "npc" },
    { name: "monsters", kind: "monster" },
    { name: "portals", kind: "portal" },
  ];

  const markers: MapMarker[] = [];
  for (const group of groups) {
    const objects = layer(map, group.name, "objectgroup")?.objects ?? [];
    for (const object of objects) {
      const facingValue = property(object, "facing") ?? "down";
      markers.push({
        id: property(object, "id") ?? object.name ?? `${group.kind}-${markers.length}`,
        name: object.name || group.kind,
        kind: group.kind,
        x: object.x,
        y: object.y,
        role: property(object, "role"),
        facing: isDirection(facingValue) ? facingValue : "down",
        targetMapId: property(object, "targetMapId"),
      });
    }
  }
  return markers;
}

export function playerSpawn(map: TiledMap, collision: CollisionMap): { x: number; y: number } {
  const spawn = markersFromTiled(map).find((marker) => marker.kind === "spawn");
  if (spawn && isWalkable(collision, spawn.x, spawn.y)) return { x: spawn.x, y: spawn.y };

  for (let y = 0; y < collision.height; y += 1) {
    for (let x = 0; x < collision.width; x += 1) {
      const point = { x: x * collision.tileSize + collision.tileSize / 2, y: y * collision.tileSize + 14 };
      if (isWalkable(collision, point.x, point.y)) return point;
    }
  }

  throw new Error("Tora Village has no walkable spawn.");
}
