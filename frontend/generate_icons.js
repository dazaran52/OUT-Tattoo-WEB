const sharp = require('sharp');
const fs = require('fs');

const svgBuffer = Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="128" fill="#171717"/>
  <text x="50%" y="54%" font-family="Arial, sans-serif" font-weight="900" font-size="200" fill="#ffffff" text-anchor="middle" dominant-baseline="middle" letter-spacing="10">HUB</text>
</svg>`);

async function generate() {
  await sharp(svgBuffer).resize(512, 512).png().toFile('public/icon-512x512.png');
  await sharp(svgBuffer).resize(192, 192).png().toFile('public/icon-192x192.png');
  await sharp(svgBuffer).resize(32, 32).png().toFile('public/favicon.ico');
  await sharp(svgBuffer).resize(512, 512).png().toFile('public/icon512_maskable.png');
  await sharp(svgBuffer).resize(512, 512).png().toFile('public/icon512_rounded.png');
  fs.writeFileSync('public/icon.svg', svgBuffer);
  console.log('Icons generated successfully.');
}
generate();
