import { PROTOCOL_VERSION } from '../../shared/Protocol.js';

export const ONLINE_API_URL = (import.meta.env.VITE_GAME_API_URL || '').replace(/\/$/, '');
export const ONLINE_ENABLED = Boolean(ONLINE_API_URL);
export const ONLINE_WS_URL = ONLINE_API_URL.replace(/^http/, 'ws');

export async function api(path, { method = 'GET', body } = {}) {
  if (!ONLINE_ENABLED) throw Error('Oyun sunucusu yapılandırılmadı.');
  let response;
  try {
    response = await fetch(`${ONLINE_API_URL}${path}`, {
      method, credentials: 'include',
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch { throw Error('Sunucuya ulaşılamıyor. Bağlantını kontrol et.'); }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw Error(data.error || `Sunucu hatası (${response.status}).`);
  return data;
}

export function connectGame(characterId, onPacket, onState) {
  let socket = null, closed = false, attempts = 0, seq = 0, retry = null;
  const connect = () => {
    if (closed) return;
    onState(attempts ? 'Yeniden bağlanılıyor…' : 'Bağlanıyor…');
    const url = new URL(`${ONLINE_WS_URL}/game`);
    url.searchParams.set('v', String(PROTOCOL_VERSION));
    url.searchParams.set('characterId', characterId);
    socket = new WebSocket(url);
    socket.onopen = () => { attempts = 0; onState('Dünyaya giriliyor…'); };
    socket.onmessage = event => {
      try { onPacket(JSON.parse(event.data)); } catch (error) { console.error('[Tora Network] Paket okunamadı:', error); }
    };
    socket.onclose = () => {
      if (closed) return;
      onState('Bağlantı kesildi.');
      if (++attempts <= 8) retry = setTimeout(connect, Math.min(2000, 300 * attempts));
      else onState('Sunucuya ulaşılamıyor.');
    };
    socket.onerror = () => { /* close supplies the reconnect path */ };
  };
  connect();
  return {
    send(type, data = {}) { if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type, seq: ++seq, ...data })); },
    get ready() { return socket?.readyState === WebSocket.OPEN; },
    close() { closed = true; clearTimeout(retry); socket?.close(); },
  };
}
