/**
 * Generator aset brand Mamoo dari artwork sumber 1024×1024.
 * Jalankan dari root project:
 *   node scripts/make-logo.mjs
 *
 * Sumber: assets/brand/mamoo-icon-source.png (mark putih di tile hijau).
 * Output: ikon legacy + foreground/background/monochrome untuk adaptive icon.
 * Tidak ada splash image — splash Android cukup memakai backgroundColor.
 */
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const SOURCE = 'assets/brand/mamoo-icon-source.png';
const OUT = 'assets/images';
const SIZE = 1024;

mkdirSync(OUT, { recursive: true });

// Legacy app icon: artwork penuh.
await sharp(SOURCE).resize(SIZE, SIZE, { fit: 'cover' }).png().toFile(`${OUT}/icon.png`);

// Foreground adaptive + monochrome: ambil mark putih dari tile hijau.
const { data, info } = await sharp(SOURCE)
  .resize(SIZE, SIZE, { fit: 'cover' })
  .removeAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const foreground = Buffer.alloc(info.width * info.height * 4);
for (let y = 0; y < info.height; y++) {
  for (let x = 0; x < info.width; x++) {
    const sourceIndex = (y * info.width + x) * 3;
    const targetIndex = (y * info.width + x) * 4;
    // Background tile punya red channel ~10–28; mark putih 255.
    const alpha = Math.max(
      0,
      Math.min(255, Math.round(((data[sourceIndex] - 28) / 227) * 255)),
    );
    foreground[targetIndex] = 255;
    foreground[targetIndex + 1] = 255;
    foreground[targetIndex + 2] = 255;
    foreground[targetIndex + 3] = alpha;
  }
}

const foregroundPng = await sharp(foreground, {
  raw: { width: info.width, height: info.height, channels: 4 },
})
  .png()
  .toBuffer();

await sharp(foregroundPng).toFile(`${OUT}/android-icon-foreground.png`);
await sharp(foregroundPng).toFile(`${OUT}/android-icon-monochrome.png`);

// Background adaptive: gradient hijau senada artwork.
const backgroundSvg = `<svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#18CD90"/>
      <stop offset="0.55" stop-color="#00AB6B"/>
      <stop offset="1" stop-color="#008F59"/>
    </linearGradient>
  </defs>
  <rect width="${SIZE}" height="${SIZE}" fill="url(#g)"/>
</svg>`;

await sharp(Buffer.from(backgroundSvg)).png().toFile(`${OUT}/android-icon-background.png`);

console.log('OK', `${OUT}/icon.png`);
console.log('OK', `${OUT}/android-icon-foreground.png`);
console.log('OK', `${OUT}/android-icon-background.png`);
console.log('OK', `${OUT}/android-icon-monochrome.png`);
