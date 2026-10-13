import EmbeddedPostgres from 'embedded-postgres';
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import pg from 'pg';
import { migrate } from '../server/migrate.js';
import { createApp } from '../server/app.js';

const dbPort = Number(process.env.DEV_DB_PORT || 54329);
const apiPort = Number(process.env.GAME_SERVER_PORT || 8080);
const db = new EmbeddedPostgres({ databaseDir: '.tora-db', user: 'postgres', password: 'local-dev-only', port: dbPort, persistent: true, initdbFlags: ['--locale=C', '--encoding=UTF8'], onLog: () => {}, onError: message => console.error(message) });
if (!existsSync('.tora-db/PG_VERSION')) await db.initialise();
await db.start();
try { await db.createDatabase('tora_online'); } catch (error) { if (!/already exists/i.test(String(error))) throw error; }
const url = `postgres://postgres:local-dev-only@127.0.0.1:${dbPort}/tora_online`;
const pool = new pg.Pool({ connectionString: url });
await migrate(pool);
const app = await createApp({ pool, config: { databaseUrl: url, origins: ['http://localhost:5173', 'http://127.0.0.1:5173'], port: apiPort, production: false, cookieName: 'tora_session', sessionDays: 7 } });
await app.listen(apiPort);
const vite = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '0.0.0.0', '--port', '5173', '--strictPort'], { stdio: 'inherit', env: { ...process.env, VITE_GAME_API_URL: `http://localhost:${apiPort}` } });
console.log(`Tora çevrimiçi geliştirme: http://localhost:5173/ · API http://localhost:${apiPort}`);
let shuttingDown = false;
async function shutdown() {
  if (shuttingDown) return; shuttingDown = true;
  vite.kill();
  await app.close();
  await db.stop();
  process.exit(0);
}
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => { void shutdown(); });
vite.once('exit', () => { void shutdown(); });
