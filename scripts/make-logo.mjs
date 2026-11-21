/**
 * Generator aset brand resmi Mamoo.
 *
 * Sumber:
 *   - assets/brand/mamoo-app-icon-source.png : wordmark HIJAU di tile PUTIH
 *                                              (khusus ikon peluncur APK)
 *   - assets/brand/mamoo-page1-logo.png      : wordmark hijau di putih (in-app)
 *   - assets/brand/mamoo-page2-splash.png    : wordmark putih di hijau #179C51 (in-app)
 *
 * Output dibagi 2 kelompok:
 *   A. Ikon peluncur APK (boleh berubah):
 *      icon.png, android-icon-foreground/background/monochrome.png
 *   B. Aset in-app (JANGAN diubah — intro & kartu Tentang):
 *      mamoo-wordmark.png (putih), mamoo-logo-green.png (hijau)
 */
import sharp from 'sharp';
import { mkdirSync, writeFileSync } from 'node:fs';

const OUT = 'assets/images';
const BRAND = 'assets/brand';
const ICON_SOURCE = `${BRAND}/mamoo-app-icon-source.png`;
const SIZE = 1024;
// Safe zone 580px menjamin logo tidak akan terpotong di launcher HP mana pun
// (baik lingkaran 72dp, squircle Samsung/Xiaomi, maupun rounded rectangle).
const WORDMARK_WIDTH_ADAPTIVE = 580;
const WORDMARK_WIDTH_ICON = 580;
const BRAND_GREEN = '#179C51';
// Tile ikon peluncur APK: putih, dengan wordmark hijau.
const ICON_TILE = '#FFFFFF';
const ICON_MARK_RGB = [26, 191, 92];

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

  // ── Mulai dari sini: HANYA aset ikon peluncur APK ──────────────────────
  // 2b. Ekstraksi wordmark hijau dari sumber ikon (tile putih, teks hijau)
  const { data: di, info: ii } = await sharp(ICON_SOURCE)
    .raw()
    .toBuffer({ resolveWithObject: true });

  let minXi = 1e9, maxXi = -1, minYi = 1e9, maxYi = -1;
  for (let y = 0; y < ii.height; y++) {
    for (let x = 0; x < ii.width; x++) {
      const idx = (y * ii.width + x) * ii.channels;
      const r = di[idx], g = di[idx + 1], b = di[idx + 2];
      if (g > 100 && g > r + 40 && g > b + 40) {
        if (x < minXi) minXi = x;
        if (x > maxXi) maxXi = x;
        if (y < minYi) minYi = y;
        if (y > maxYi) maxYi = y;
      }
    }
  }

  const pad = 8;
  const cXi = Math.max(0, minXi - pad);
  const cYi = Math.max(0, minYi - pad);
  const cWi = Math.min(ii.width - cXi, maxXi - minXi + 1 + pad * 2);
  const cHi = Math.min(ii.height - cYi, maxYi - minYi + 1 + pad * 2);
  const iconPixels = Buffer.alloc(cWi * cHi * 4);

  for (let y = 0; y < cHi; y++) {
    for (let x = 0; x < cWi; x++) {
      const srcIdx = ((cYi + y) * ii.width + (cXi + x)) * ii.channels;
      const tgtIdx = (y * cWi + x) * 4;
      const r = di[srcIdx], g = di[srcIdx + 1], b = di[srcIdx + 2];
      // Jarak dari putih: putih (255,255,255) = alpha 0.
      const whiteness = Math.min(r, g, b);
      const alpha = Math.max(0, Math.min(255, Math.round(((255 - whiteness) / 229) * 255)));
      iconPixels[tgtIdx] = ICON_MARK_RGB[0];
      iconPixels[tgtIdx + 1] = ICON_MARK_RGB[1];
      iconPixels[tgtIdx + 2] = ICON_MARK_RGB[2];
      iconPixels[tgtIdx + 3] = alpha;
    }
  }

  const iconMark = await sharp(iconPixels, {
    raw: { width: cWi, height: cHi, channels: 4 },
  })
    .trim()
    .png()
    .toBuffer();

  // 3. Ikon Aplikasi Legacy (1024x1024, tile PUTIH + wordmark hijau)
  const iconWordmark = await sharp(iconMark)
    .resize(WORDMARK_WIDTH_ICON, null, { kernel: sharp.kernel.lanczos3 })
    .toBuffer();

  await sharp({
    create: { width: SIZE, height: SIZE, channels: 4, background: ICON_TILE },
  })
    .composite([{ input: iconWordmark, gravity: 'center' }])
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(`${OUT}/icon.png`);
  console.log('OK', `${OUT}/icon.png`);

  // 4. Foreground Adaptive Icon (1024x1024 transparan, wordmark hijau di safe-zone 580px)
  const adaptiveWordmark = await sharp(iconMark)
    .resize(WORDMARK_WIDTH_ADAPTIVE, null, { kernel: sharp.kernel.lanczos3 })
    .toBuffer();

  const foregroundBuffer = await sharp({
    create: { width: SIZE, height: SIZE, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: adaptiveWordmark, gravity: 'center' }])
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();

  await sharp(foregroundBuffer).toFile(`${OUT}/android-icon-foreground.png`);

  // Monochrome: siluet putih + alpha (sistem Android 13+ yang memberi warna).
  const { data: fgRaw, info: fgInfo } = await sharp(foregroundBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const monoRaw = Buffer.alloc(fgRaw.length);
  for (let i = 0; i < fgRaw.length; i += 4) {
    monoRaw[i] = 255;
    monoRaw[i + 1] = 255;
    monoRaw[i + 2] = 255;
    monoRaw[i + 3] = fgRaw[i + 3];
  }
  await sharp(monoRaw, {
    raw: { width: fgInfo.width, height: fgInfo.height, channels: 4 },
  })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(`${OUT}/android-icon-monochrome.png`);
  console.log('OK', `${OUT}/android-icon-foreground.png`);
  console.log('OK', `${OUT}/android-icon-monochrome.png`);

  // 5. Background Adaptive Icon (1024x1024 solid putih)
  await sharp({
    create: { width: SIZE, height: SIZE, channels: 4, background: ICON_TILE },
  })
    .png({ compressionLevel: 9 })
    .toFile(`${OUT}/android-icon-background.png`);
  console.log('OK', `${OUT}/android-icon-background.png`);

  console.log('All brand assets successfully built!');
}

generate().catch((err) => {
  console.error('Failed to generate brand assets:', err);
  process.exit(1);
});
