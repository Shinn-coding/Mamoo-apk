/**
 * Generator aset brand resmi Mamoo.
 * Berdasarkan dokumen "Logo dan splash icon Mamoo - 20 Nov 2026":
 *   - Page 1 (1.png): Wordmark hijau di background putih.
 *   - Page 2 (2.png): Wordmark putih di background hijau (#179C51).
 *
 * Output:
 *   - assets/images/icon.png: Ikon aplikasi utama (1024×1024)
 *   - assets/images/android-icon-foreground.png: Foreground adaptive icon Android (1024×1024, safe zone)
 *   - assets/images/android-icon-background.png: Background adaptive icon Android (#179C51)
 *   - assets/images/android-icon-monochrome.png: Ikon tema Android 13+
 *   - assets/images/mamoo-wordmark.png: Wordmark putih transparan (untuk splash intro & dark mode)
 *   - assets/images/mamoo-logo-green.png: Wordmark hijau transparan (untuk light mode in-app)
 */
import sharp from 'sharp';
import { mkdirSync, writeFileSync } from 'node:fs';

const OUT = 'assets/images';
const BRAND = 'assets/brand';
const SIZE = 1024;
const WORDMARK_WIDTH_ADAPTIVE = 720;
const WORDMARK_WIDTH_ICON = 760;
const BRAND_GREEN = '#179C51';

mkdirSync(OUT, { recursive: true });

async function generate() {
  console.log('Generating brand assets from official PDF sources...');

  // 1. Ekstraksi wordmark putih transparan dari Page 2 (background hijau, teks putih)
  const { data: d2, info: i2 } = await sharp(`${BRAND}/mamoo-page2-splash.png`)
    .raw()
    .toBuffer({ resolveWithObject: true });

  const cropX = 220, cropY = 840, cropW = 1560, cropH = 315;
  const whiteBuffer = Buffer.alloc(cropW * cropH * 4);

  for (let y = 0; y < cropH; y++) {
    for (let x = 0; x < cropW; x++) {
      const srcIdx = ((cropY + y) * i2.width + (cropX + x)) * i2.channels;
      const tgtIdx = (y * cropW + x) * 4;
      const r = d2[srcIdx], b = d2[srcIdx + 2];
      const val = Math.min(r, b);
      const bgVal = 50;
      let alpha = 0;
      if (val > bgVal) {
        alpha = Math.min(255, Math.round(((val - bgVal) / (255 - bgVal)) * 255));
      }
      whiteBuffer[tgtIdx] = 255;
      whiteBuffer[tgtIdx + 1] = 255;
      whiteBuffer[tgtIdx + 2] = 255;
      whiteBuffer[tgtIdx + 3] = alpha;
    }
  }

  const whiteWordmark = await sharp(whiteBuffer, {
    raw: { width: cropW, height: cropH, channels: 4 },
  })
    .trim()
    .png()
    .toBuffer();

  writeFileSync(`${OUT}/mamoo-wordmark.png`, whiteWordmark);
  console.log('OK', `${OUT}/mamoo-wordmark.png`);

  // 2. Ekstraksi wordmark hijau transparan dari Page 1 (background putih, teks hijau)
  const { data: d1, info: i1 } = await sharp(`${BRAND}/mamoo-page1-logo.png`)
    .raw()
    .toBuffer({ resolveWithObject: true });

  let minX1 = 9999, maxX1 = 0, minY1 = 9999, maxY1 = 0;
  for (let y = 0; y < i1.height; y++) {
    for (let x = 0; x < i1.width; x++) {
      const idx = (y * i1.width + x) * i1.channels;
      if (d1[idx] < 200 || d1[idx + 2] < 200) {
        if (x < minX1) minX1 = x;
        if (x > maxX1) maxX1 = x;
        if (y < minY1) minY1 = y;
        if (y > maxY1) maxY1 = y;
      }
    }
  }

  const cX1 = minX1 - 5, cY1 = minY1 - 5, cW1 = (maxX1 - minX1) + 10, cH1 = (maxY1 - minY1) + 10;
  const greenBuffer = Buffer.alloc(cW1 * cH1 * 4);
  for (let y = 0; y < cH1; y++) {
    for (let x = 0; x < cW1; x++) {
      const srcIdx = ((cY1 + y) * i1.width + (cX1 + x)) * i1.channels;
      const tgtIdx = (y * cW1 + x) * 4;
      const r = d1[srcIdx], g = d1[srcIdx + 1], b = d1[srcIdx + 2];
      const whiteness = Math.min(r, g, b);
      const alpha = Math.max(0, Math.min(255, Math.round(((255 - whiteness) / (255 - 26)) * 255)));
      greenBuffer[tgtIdx] = 26;
      greenBuffer[tgtIdx + 1] = 191;
      greenBuffer[tgtIdx + 2] = 92;
      greenBuffer[tgtIdx + 3] = alpha;
    }
  }

  const greenWordmark = await sharp(greenBuffer, {
    raw: { width: cW1, height: cH1, channels: 4 },
  })
    .trim()
    .png()
    .toBuffer();

  writeFileSync(`${OUT}/mamoo-logo-green.png`, greenWordmark);
  console.log('OK', `${OUT}/mamoo-logo-green.png`);

  // 3. Ikon Aplikasi Legacy (1024x1024, background hijau #179C51 dengan wordmark putih)
  const iconWordmark = await sharp(whiteWordmark)
    .resize(WORDMARK_WIDTH_ICON)
    .toBuffer();

  await sharp({
    create: { width: SIZE, height: SIZE, channels: 4, background: BRAND_GREEN },
  })
    .composite([{ input: iconWordmark, gravity: 'center' }])
    .png()
    .toFile(`${OUT}/icon.png`);
  console.log('OK', `${OUT}/icon.png`);

  // 4. Foreground Adaptive Icon (1024x1024 transparan, wordmark di safe-zone 720px)
  const adaptiveWordmark = await sharp(whiteWordmark)
    .resize(WORDMARK_WIDTH_ADAPTIVE)
    .toBuffer();

  const foregroundBuffer = await sharp({
    create: { width: SIZE, height: SIZE, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: adaptiveWordmark, gravity: 'center' }])
    .png()
    .toBuffer();

  await sharp(foregroundBuffer).toFile(`${OUT}/android-icon-foreground.png`);
  await sharp(foregroundBuffer).toFile(`${OUT}/android-icon-monochrome.png`);
  console.log('OK', `${OUT}/android-icon-foreground.png`);
  console.log('OK', `${OUT}/android-icon-monochrome.png`);

  // 5. Background Adaptive Icon (1024x1024 solid #179C51)
  await sharp({
    create: { width: SIZE, height: SIZE, channels: 4, background: BRAND_GREEN },
  })
    .png()
    .toFile(`${OUT}/android-icon-background.png`);
  console.log('OK', `${OUT}/android-icon-background.png`);

  console.log('All brand assets successfully built!');
}

generate().catch((err) => {
  console.error('Failed to generate brand assets:', err);
  process.exit(1);
});
