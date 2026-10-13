import http from 'node:http';
import net from 'node:net';
import { URL } from 'node:url';
import pg from 'pg';
import { WebSocketServer } from 'ws';
import { Repository, PublicError } from './Repository.js';
import { World } from './World.js';
import { readConfig } from './config.js';
import { PROTOCOL_VERSION } from '../shared/Protocol.js';

const MAX_BODY = 8 * 1024;
const cookieToken = (request, name) => request.headers.cookie?.split(';').map(x => x.trim()).find(x => x.startsWith(`${name}=`))?.slice(name.length + 1) || '';
const write = (response, status, data) => {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  response.end(JSON.stringify(data));
};
const readBody = async request => {
  const chunks = []; let size = 0;
  for await (const chunk of request) { size += chunk.length; if (size > MAX_BODY) throw new PublicError(413, 'İstek çok büyük.'); chunks.push(chunk); }
  try { const body = JSON.parse(Buffer.concat(chunks).toString('utf8')); if (!body || typeof body !== 'object' || Array.isArray(body)) throw Error(); return body; }
  catch { throw new PublicError(400, 'Geçersiz JSON.'); }
};
const badOrigin = (request, config) => request.headers.origin && !config.origins.includes(request.headers.origin);
const requestIp = (request, config) => {
  const direct = request.socket.remoteAddress || 'unknown';
  if (!config.trustLoopbackProxy || !['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(direct)) return direct;
  const forwarded = request.headers['x-forwarded-for']?.split(',')[0]?.trim();
  return net.isIP(forwarded || '') ? forwarded : direct;
};

export async function createApp({ config = readConfig(), pool = new pg.Pool({ connectionString: config.databaseUrl }), repository = new Repository(pool), world = new World(repository) } = {}) {
  await repository.assertReady();
  const counters = new Map();
  const limited = (key, max, windowMs) => {
    const stamp = Date.now(), row = counters.get(key);
    if (!row || row.until < stamp) { counters.set(key, { until: stamp + windowMs, count: 1 }); return false; }
    row.count++;
    return row.count > max;
  };
  const server = http.createServer(async (request, response) => {
    const origin = request.headers.origin;
    if (badOrigin(request, config)) { write(response, 403, { error: 'Origin izinli değil.' }); return; }
    if (config.production && request.method === 'POST' && !origin) { write(response, 403, { error: 'Origin gerekli.' }); return; }
    if (origin) { response.setHeader('Access-Control-Allow-Origin', origin); response.setHeader('Access-Control-Allow-Credentials', 'true'); response.setHeader('Vary', 'Origin'); }
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    if (request.method === 'OPTIONS') { response.writeHead(204); response.end(); return; }
    try {
      const path = new URL(request.url, 'http://localhost').pathname;
      if (path === '/health' && request.method === 'GET') { await pool.query('SELECT 1'); write(response, 200, { ok: true, protocolVersion: PROTOCOL_VERSION }); return; }
      const remoteIp = requestIp(request, config);
      if (limited(`api:${remoteIp}`, 160, 60_000)) throw new PublicError(429, 'Çok fazla istek.');
      if (path === '/auth/register' && request.method === 'POST') {
        if (limited(`register:${remoteIp}`, config.production ? 5 : 50, 15 * 60_000)) throw new PublicError(429, 'Bir süre sonra tekrar dene.');
        const account = await repository.register(await readBody(request)); console.info('Account registered:', account.id); write(response, 201, { account }); return;
      }
      if (path === '/auth/login' && request.method === 'POST') {
        if (limited(`login:${remoteIp}`, 12, 15 * 60_000)) throw new PublicError(429, 'Bir süre sonra tekrar dene.');
        const account = await repository.authenticate(await readBody(request));
        console.info('Account login:', account.id);
        const token = await repository.createSession(account.id, config.sessionDays);
        response.setHeader('Set-Cookie', `${config.cookieName}=${token}; HttpOnly; ${config.production ? 'Secure; ' : ''}SameSite=Lax; Path=/; Max-Age=${config.sessionDays * 86400}`);
        write(response, 200, { account }); return;
      }
      const token = cookieToken(request, config.cookieName);
      const account = await repository.session(token);
      if (!account) throw new PublicError(401, 'Oturum gerekli.');
      if (path === '/auth/me' && request.method === 'GET') { write(response, 200, { account: { id: account.id, username: account.username, email: account.email } }); return; }
      if (path === '/auth/logout' && request.method === 'POST') {
        await repository.revokeSession(token);
        for (const player of world.players.values()) if (player.accountId === account.id && player.sessionId === account.session_id) player.socket.close(4002, 'Oturum kapatıldı.');
        response.setHeader('Set-Cookie', `${config.cookieName}=; HttpOnly; ${config.production ? 'Secure; ' : ''}SameSite=Lax; Path=/; Max-Age=0`);
        write(response, 200, { ok: true }); return;
      }
      if (path === '/characters' && request.method === 'GET') { write(response, 200, { characters: await repository.listCharacters(account.id) }); return; }
      if (path === '/characters' && request.method === 'POST') {
        if (limited(`character:${account.id}`, 8, 60_000)) throw new PublicError(429, 'Bir süre sonra tekrar dene.');
        write(response, 201, { character: await repository.createCharacter(account.id, await readBody(request)) }); return;
      }
      write(response, 404, { error: 'Adres bulunamadı.' });
    } catch (error) {
      if (!(error instanceof PublicError)) console.error('HTTP request failed:', error);
      write(response, error instanceof PublicError ? error.status : 500, { error: error instanceof PublicError ? error.message : 'Sunucu hatası.' });
    }
  });
  const wss = new WebSocketServer({ noServer: true, maxPayload: 4096, perMessageDeflate: false });
  server.on('upgrade', async (request, socket, head) => {
    try {
      const url = new URL(request.url, 'http://localhost');
      if (url.pathname !== '/game' || badOrigin(request, config) || !request.headers.origin) throw new PublicError(403, 'Origin izinli değil.');
      if (Number(url.searchParams.get('v')) !== PROTOCOL_VERSION) throw new PublicError(426, 'İstemci sürümü güncel değil.');
      const account = await repository.session(cookieToken(request, config.cookieName));
      if (!account) throw new PublicError(401, 'Oturum gerekli.');
      if (limited(`ws:${account.id}`, 16, 60_000)) throw new PublicError(429, 'Çok fazla bağlantı.');
      const characterId = url.searchParams.get('characterId');
      if (!/^[0-9a-f-]{36}$/i.test(characterId || '')) throw new PublicError(400, 'Karakter geçersiz.');
      // Ownership is checked before the HTTP upgrade so failures remain HTTP errors.
      await repository.loadCharacter(account.id, characterId);
      wss.handleUpgrade(request, socket, head, ws => {
        wss.emit('connection', ws, request);
        void world.join(ws, account, characterId).catch(error => { console.error('World join failed:', error); ws.close(1011, 'Dünyaya girilemedi.'); });
      });
    } catch (error) {
      if (!(error instanceof PublicError)) console.error('WebSocket upgrade failed:', error);
      const code = error instanceof PublicError ? error.status : 500;
      socket.write(`HTTP/1.1 ${code} Error\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`);
      socket.destroy();
    }
  });
  return {
    server, world, repository, pool,
    async listen(port = config.port) { await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, resolve); }); world.start(); return server.address(); },
    async close() { await world.stop(); await new Promise(resolve => wss.close(resolve)); await new Promise(resolve => server.close(resolve)); await pool.end(); },
  };
}
