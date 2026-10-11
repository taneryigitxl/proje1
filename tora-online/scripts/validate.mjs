import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const walk=async dir=>{const files=[];for(const e of await fs.readdir(dir,{withFileTypes:true}))files.push(...(e.isDirectory()?await walk(path.join(dir,e.name)):[path.join(dir,e.name)]));return files;};
const modules=(await walk('src')).filter(f=>f.endsWith('.js'));
for(const file of modules){execFileSync(process.execPath,['--check',file]);const text=await fs.readFile(file,'utf8');for(const match of text.matchAll(/from\s+['"]([^'"]+)['"]/g))if(match[1].startsWith('.'))await fs.access(path.resolve(path.dirname(file),match[1].split('?')[0]));}
const manifest=JSON.parse(await fs.readFile('assets/models/manifest.json','utf8'));
let assets=0,bytes=0;const visit=async value=>{if(Array.isArray(value)){for(const entry of value)await visit(entry);}else if(value&&typeof value==='object'){for(const entry of Object.values(value))await visit(entry);}else if(typeof value==='string'&&value.startsWith('assets/')){const b=await fs.readFile(value);if(value.endsWith('.glb')){if(b.readUInt32LE(0)!==0x46546c67)throw new Error('Invalid GLB '+value);JSON.parse(b.subarray(20,20+b.readUInt32LE(12)));}assets++;bytes+=b.length;}};
await visit(manifest);console.log(`${modules.length} modules; ${assets} referenced assets; ${(bytes/1048576).toFixed(1)} MB validated.`);
