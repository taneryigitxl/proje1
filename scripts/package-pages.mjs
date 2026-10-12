import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const root=process.cwd(),target=path.resolve(root,'.pages-output');
if(target!==path.join(root,'.pages-output')||!target.startsWith(root+path.sep))throw new Error('Unsafe artifact target');
await fs.mkdir(target,{recursive:true});
const tracked=execFileSync('git',['ls-files','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);
for(const file of tracked){
  if(file.startsWith('tora-online/')||file.startsWith('.github/')||file.startsWith('scripts/')||/(^|\/)(node_modules|test-results|playwright-report|reports|tests)(\/|$)/.test(file))continue;
  const destination=path.join(target,file);await fs.mkdir(path.dirname(destination),{recursive:true});await fs.copyFile(path.join(root,file),destination);
}
await fs.cp(path.join(root,'tora-online/dist'),path.join(target,'tora-online'),{recursive:true});
await fs.writeFile(path.join(target,'.nojekyll'),'');
console.log('Pages artifact prepared: existing site plus hashed Tora release.');
