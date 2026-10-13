import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import pg from 'pg';
import { readConfig } from './config.js';

export async function migrate(pool){
  const dir=fileURLToPath(new URL('../database/migrations/',import.meta.url));
  const files=(await fs.readdir(dir)).filter(name=>/^\d+_[\w-]+\.sql$/.test(name)).sort();
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(72616235)');
    await client.query('CREATE TABLE IF NOT EXISTS schema_migrations (version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
    for(const file of files){
      const found=await client.query('SELECT 1 FROM schema_migrations WHERE version=$1',[file]);
      if(found.rowCount)continue;
      await client.query(await fs.readFile(path.join(dir,file),'utf8'));
      await client.query('INSERT INTO schema_migrations(version) VALUES($1)',[file]);
    }
    await client.query('COMMIT');
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const config=readConfig();const pool=new pg.Pool({connectionString:config.databaseUrl});
  try{await migrate(pool);console.log('PostgreSQL migration tamamlandı.');}finally{await pool.end();}
}
