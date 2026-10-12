import fs from 'node:fs/promises';import http from 'node:http';import path from 'node:path';
export async function serve(root='dist',port=0){
 const directory=path.resolve(root),types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.glb':'model/gltf-binary','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml','.mp3':'audio/mpeg','.ogg':'audio/ogg','.flac':'audio/flac','.wasm':'application/wasm','.md':'text/plain'};
 const server=http.createServer(async(req,res)=>{try{const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname),file=path.resolve(directory,'.'+(name.endsWith('/')?name+'index.html':name));if(file!==directory&&!file.startsWith(directory+path.sep)){res.writeHead(403);res.end();return;}const data=await fs.readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(data);}catch{res.writeHead(404);res.end('Not found');}});
 await new Promise(resolve=>server.listen(port,'127.0.0.1',resolve));return {server,url:'http://127.0.0.1:'+server.address().port+'/'};
}
if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(new URL(import.meta.url).pathname.replace(/^\/(w:)/,'$1'))){const {url}=await serve(process.argv[2]||'dist',Number(process.env.PORT)||5174);console.log(url);}
