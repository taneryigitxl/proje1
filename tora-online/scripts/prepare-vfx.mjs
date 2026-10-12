import sharp from 'sharp';import fs from 'node:fs/promises';
const source=process.argv[2],m=await sharp(source).metadata();await fs.mkdir('assets/vfx',{recursive:true});
const w=Math.floor(m.width/3),h=Math.floor(m.height/2),names=['slash','sparks','fracture','wind','rage','execution'];
for(let i=0;i<6;i++)await sharp(source).extract({left:i%3*w,top:Math.floor(i/3)*h,width:w,height:h}).resize(256,256).webp({quality:88,alphaQuality:100}).toFile('assets/vfx/'+names[i]+'.webp');
console.log(m.hasAlpha?'VFX alpha preserved':'VFX source has no alpha');
