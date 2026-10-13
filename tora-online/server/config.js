import { existsSync } from 'node:fs';

if(existsSync('.env'))process.loadEnvFile('.env');

export function readConfig(env=process.env){
  if(!env.DATABASE_URL)throw new Error('DATABASE_URL gerekli. Sunucu veritabanı olmadan başlamaz.');
  const production=env.NODE_ENV==='production';
  if(production&&!env.ALLOWED_ORIGINS)throw new Error('Production için ALLOWED_ORIGINS gerekli.');
  const origins=(env.ALLOWED_ORIGINS||'http://localhost:5173,http://127.0.0.1:5173').split(',').map(s=>s.trim()).filter(Boolean);
  if(origins.some(origin=>origin==='*'||!/^https?:\/\/[^/]+$/.test(origin)))throw new Error('ALLOWED_ORIGINS geçersiz.');
  const port=Number(env.GAME_SERVER_PORT||8080);
  if(!Number.isInteger(port)||port<1||port>65535)throw new Error('GAME_SERVER_PORT geçersiz.');
  return {databaseUrl:env.DATABASE_URL,origins,port,production,trustLoopbackProxy:env.TRUST_LOOPBACK_PROXY==='true',cookieName:'tora_session',sessionDays:7};
}
