# TORA

Browser-based 2D MMORPG. The playable client is served at `/tora/` so it can live beside the existing site on `yigittaner.online` without replacing it.

Milestone 1 covers accounts, one character, Tora Village, server-authoritative movement, remote-player interpolation, nameplates, and map chat.

## Layout

- `client/` — Phaser 3, TypeScript, Vite
- `server/` — Colyseus, Express, authentication
- `shared/` — movement, collision, chat, and network state used by both sides
- `database/` — Prisma schema for PostgreSQL
- `assets/` — generated map, tileset, and character sprites
- `docs/ARCHITECTURE.md` — system boundaries and deployment

## Local setup

Requires Node.js 20+ and PostgreSQL 16. From `tora/`:

```bash
cp .env.example .env
npm install
npm run assets
npx prisma generate --schema database/prisma/schema.prisma
npx prisma db push --schema database/prisma/schema.prisma
npm run dev
```

Open `http://localhost:5173/tora/`.

The dev client base path is `/tora/`, matching production. The game server listens on `ws://localhost:2567` (see `client/.env.development` and `.env`).

PostgreSQL can be started with Docker:

```bash
docker compose up -d
```

Without Docker, a local Postgres 18 stays up in `data/postgres` (gitignored):

```bash
npm run db:up
```

On Windows, `npm install` may block install scripts until they are approved (`npm approve-scripts` for `prisma`, `@prisma/client`, `@prisma/engines`, `esbuild`, `msgpackr-extract`, and `@embedded-postgres/windows-x64`).

Default local database URL:

```text
postgresql://tora:tora@localhost:5432/tora?schema=public
```

Two browser windows on the same map can see each other move and chat. Character position is saved when you leave or disconnect, and restored on the next login.

## Scripts

- `npm run dev` — game server and Vite client
- `npm run assets` — regenerate the original placeholder map and sprites
- `npm test` — shared movement and chat checks
- `npm run build` — compile shared, server, and the production client
- `npm run publish:pages` — copy the production client into this folder so GitHub Pages serves it at `/tora/`

## Production path

Vite is configured with `base: '/tora/'`. Built files request `/tora/static/...` and `/tora/assets/...`, not domain-root `/assets/...`.

The static site and the multiplayer process are different hosts:

- The client is static and belongs under `https://yigittaner.online/tora/`.
- Colyseus and the account API need a Node process and PostgreSQL. Set `VITE_GAME_SERVER_URL` before `npm run build -w @tora/client`. The sample production value is `wss://yigittaner.online`. Point that at the real game server before shipping.
- Set the server `CLIENT_URL` to the browser origin (`https://yigittaner.online`) so CORS allows the page to call the API.

`JWT_SECRET` and `DATABASE_URL` stay in the server environment. They are not part of the client bundle.

See `docs/ARCHITECTURE.md` for the authoritative-server rules and how later systems plug in.
