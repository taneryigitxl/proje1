import fs from 'node:fs/promises';import path from 'node:path';import {build} from 'vite';import './validate.mjs';
const target=path.resolve('dist');if(target!==path.join(process.cwd(),'dist'))throw new Error('Invalid build target');
await build({base:'./',publicDir:false,build:{outDir:target,emptyOutDir:true,assetsInlineLimit:0}});
for(const entry of ['vendor','THIRD_PARTY_LICENSES.md'])await fs.cp(entry,path.join(target,entry),{recursive:true});
// Runtime asset URLs from the manifest remain relative; UI art is hashed by Vite CSS.
const manifest=JSON.parse(await fs.readFile('assets/models/manifest.json','utf8'));const urls=new Set(['assets/models/manifest.json','assets/textures/water-normal.png']);
function visit(value){if(typeof value==='string'&&value.startsWith('assets/'))urls.add(value);else if(value&&typeof value==='object')Object.values(value).forEach(visit);}visit(manifest);
for(const dir of ['assets/audio','assets/vfx'])for(const entry of await fs.readdir(dir))urls.add(dir+'/'+entry);
for(const file of urls){await fs.mkdir(path.join(target,path.dirname(file)),{recursive:true});await fs.copyFile(file,path.join(target,file));}
console.log('Hashed production artifact ready; source, tests and node_modules excluded.');
