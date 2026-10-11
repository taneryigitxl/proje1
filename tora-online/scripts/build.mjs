import fs from 'node:fs/promises';
import path from 'node:path';
import './validate.mjs';
// Static ES modules are also the GitHub Pages artifact. No CDN runtime dependency.
const target=path.resolve('dist');if(target!==path.join(process.cwd(),'dist'))throw new Error('Invalid build target');
await fs.mkdir(target,{recursive:true});
for(const entry of ['index.html','styles.css','menu.js','src','vendor','assets','THIRD_PARTY_LICENSES.md','README.md','IMPLEMENTATION_REPORT.md'])await fs.cp(entry,path.join(target,entry),{recursive:true});
console.log('Static production artifact ready in dist/');
