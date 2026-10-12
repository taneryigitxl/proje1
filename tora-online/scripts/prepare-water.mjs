import sharp from 'sharp';const size=128,bytes=Buffer.alloc(size*size*3);
for(let y=0;y<size;y++)for(let x=0;x<size;x++){const i=(y*size+x)*3,a=x/size*Math.PI*2,b=y/size*Math.PI*2;const dx=.18*Math.cos(a*3+b*2)+.09*Math.sin(a*7-b*3),dy=.2*Math.cos(b*4+a*2);bytes[i]=128+dx*110;bytes[i+1]=128+dy*110;bytes[i+2]=250;}
await sharp(bytes,{raw:{width:size,height:size,channels:3}}).png().toFile('assets/textures/water-normal.png');
