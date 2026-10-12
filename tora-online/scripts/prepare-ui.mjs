import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';

const source = process.argv[2];
if (!source) throw new Error('Pass the generated atlas directory.');
const inputs = [
  ['skills', 'exec-43173f25-1860-480c-91a9-cdfa65f2bcbf.png', 768, 768],
  ['items', 'exec-83eba8ac-27c2-4dcc-b748-30977bf15053.png', 1024, 512],
  ['portraits', 'exec-67d37adc-bdfb-4c49-8426-d9be7c73db89.png', 1536, 512],
];
for (const [name, filename, width, height] of inputs) {
  const input = path.join(source, filename);
  const info = await sharp(input).metadata();
  if (name !== 'portraits' && !info.hasAlpha) throw new Error(`${name}: alpha missing`);
  await sharp(input).resize(width, height, { fit: 'fill' }).webp({ quality: 90, alphaQuality: 100 })
    .toFile(`assets/ui/${name}-atlas.webp`);
  console.log(name, info.width, info.height, 'alpha:', info.hasAlpha);
}
await fs.mkdir('assets/ui/portraits', { recursive: true });
for (const [i, name] of ['warrior', 'ayame', 'guardian'].entries()) {
  await sharp('assets/ui/portraits-atlas.webp').extract({ left: i * 512, top: 0, width: 512, height: 512 })
    .webp({ quality: 88 }).toFile(`assets/ui/portraits/${name}.webp`);
}
