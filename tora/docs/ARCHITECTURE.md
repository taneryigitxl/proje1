# TORA architecture

TORA is a 2D browser MMORPG. Milestone 1 is the online village loop: register, create one character, walk Tora Village with collision, and see and chat with other players. The client renders. The server decides.

## Runtime

```text
Browser (Phaser, /tora/)
  REST  -> Express  -> Prisma -> PostgreSQL
  WS    -> Colyseus VillageRoom
```

The page sends intentions: key state, chat text, character creation. It does not send position as truth, gold, health changes, or item grants. Those later systems should follow the same split.

`VillageRoom` runs at 20 ticks per second. Each tick applies the latest validated input through the shared `stepMovement` function and the map collision grid. Colyseus patches state at the same rate, so clients are not sent a packet every rendered frame. Remote avatars interpolate toward the latest server position. The local avatar predicts with the same movement function and is corrected if it drifts.

## Repository

| Path | Role |
| --- | --- |
| `client/src/scenes` | Phaser scenes. Village loading, camera, rendering. |
| `client/src/entities` | Local and remote avatars. |
| `client/src/network` | Colyseus join and state callbacks. |
| `client/src/ui` | Login, character creation, HUD, nameplates. |
| `server/src/auth` | Password hashing, JWT, account routes. |
| `server/src/characters` | Character create/list. Spawn position is chosen on the server. |
| `server/src/rooms` | Authoritative village simulation. |
| `shared/src` | Types, movement, tiled collision, chat parsing, schema. |
| `database/prisma` | Account and Character tables. |
| `assets` | Tiled JSON and PNG sprites. Replace the PNGs without changing simulation code. |

One Colyseus room, `village`, holds everyone in Tora Village. A later map is another room that loads another tiled file through `collisionFromTiled`. Object layers (`spawns`, `npcs`, `monsters`, `portals`) are already parsed. NPC dialogue, combat, inventory, and quests are not implemented.

Ambient villagers in the client are map decorations. They are not server entities and cannot be talked to yet.

## Accounts and characters

Passwords are hashed with bcrypt (cost 12). The database stores `passwordHash` only. Login returns a JWT (`sub` = account id, 7 days). The browser keeps that token in `sessionStorage`. Preferences such as mute use `localStorage`. Position, appearance, and progression do not.

Character names are normalized and stored with a unique lowercase key. Each account can create one character. The table is one-to-many so more characters can be allowed later without a migration of the relation.

On join, the server loads the character for that account, rejects a second live session for the same character, and restores `mapId` / `positionX` / `positionY` when that point is still walkable. Otherwise it uses the map spawn. Position is written about every five seconds and again on leave.

## Chat

`/say` and plain text both become map chat. The server strips tags, drops control characters, limits length, and rate-limits. The client assigns text with `textContent`. Other players cannot inject HTML.

## Map and art

`tools/generate-assets.mjs` writes an original tileset, character sheets, and a Tiled JSON map. Tile size is 16. The client uses Phaser `pixelArt` and integer camera rounding. Production and development both use the `/tora/` base path so asset URLs do not depend on the site being hosted at `/`.

Collision comes from the `collision` tile layer. Blocked tiles are non-zero. The shared hitbox is the character's feet.

## Security

- Validate payloads with Zod and the shared validators.
- Movement messages may only set booleans. Coordinates on that message are ignored.
- JWT secret and database URL are read from `tora/.env`.
- Auth routes are rate-limited.
- CORS and Colyseus matchmaking headers allow the configured `CLIENT_URL` origins.
- Prisma is the only database API. There is no string-built SQL in the game code.

## Deployment on yigittaner.online

The existing site stays at the repository root. TORA must not replace `index.html` there.

1. Build the client with `VITE_GAME_SERVER_URL` set to the public WebSocket URL.
2. Run `npm run publish:pages` inside `tora/`. That writes `tora/index.html` and `tora/static/`.
3. `tora/assets/` is already the URL `/tora/assets/`.
4. Run the Node server somewhere that can accept WebSocket upgrades, with `DATABASE_URL`, `JWT_SECRET`, `CLIENT_URL=https://yigittaner.online`, and `PORT`.
5. Reverse-proxy that process so the URL baked into the client matches it. The client derives the HTTP API from the WebSocket URL (`wss://` to `https://`).

GitHub Pages can serve the static client. It cannot run Colyseus or PostgreSQL.

## Where later systems go

| System | Home |
| --- | --- |
| Inventory, gold, items | Server module plus Prisma models. Client shows the result. |
| Quests | Server progress table. NPC roles already exist on the map. |
| Monsters and combat | Server-owned entities in the room. Client sends a target id, never damage. |
| Gathering | Server cooldown per node. |
| Other maps | Another room and tiled file. Portals are already marked. |
| Parties, guilds, trade, mail | New server modules. Do not fold them into `VillageScene`. |

Audio categories (`music`, `environment`, `ui`, `combat`, `gathering`) and volumes already persist on the client. There are no soundtrack files yet.
