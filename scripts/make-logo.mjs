/**
 * Generator logo Mamoo: monogram M + koin emas.
 * Raster SVG -> PNG dengan sharp. Jalankan dari root project.
 *   node scripts/make-logo.mjs
 */
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const OUT = 'assets/images';
mkdirSync(OUT, { recursive: true });

// ---- Elemen monogram (viewBox 1024x1024, pusat di 512,540) ----
function mark({ scale = 1, ring = true, mono = false } = {}) {
  const white = '#FFFFFF';
  const gold = mono ? '#FFFFFF' : '#FFC93C';
  const goldDark = mono ? '#FFFFFF' : '#E8A400';
  return `
  <g transform="translate(512,540) scale(${scale})">
    ${ring ? `
    <circle r="372" fill="none" stroke="${white}" stroke-opacity="0.55" stroke-width="13"/>
    <path d="M -322 -196 A 372 372 0 0 1 -140 -337" fill="none" stroke="#FFFFFF" stroke-opacity="0.95" stroke-width="26" stroke-linecap="round"/>
    <circle cx="335" cy="-300" r="26" fill="#FFFFFF" fill-opacity="0.85"/>
    <circle cx="-352" cy="140" r="18" fill="#FFFFFF" fill-opacity="0.6"/>` : ''}
    <!-- monogram M -->
    <path d="M -185 165 L -185 -150 L 0 55 L 185 -150 L 185 165"
      fill="none" stroke="${white}" stroke-width="76"
      stroke-linecap="round" stroke-linejoin="round"/>
    <!-- koin emas -->
    <g transform="translate(240,235)">
      <circle r="95" fill="${gold}"/>
      <circle r="95" fill="none" stroke="${goldDark}" stroke-width="16"/>
      <circle r="58" fill="none" stroke="${white}" stroke-opacity="0.85" stroke-width="12"/>
      <path d="M -34 -20 L 0 -58 L 34 -20" fill="none" stroke="${white}" stroke-opacity="0.9" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>
    </g>
  </g>`;
}

function deco() {
  return `
  <circle cx="150" cy="180" r="66" fill="#FFFFFF" fill-opacity="0.13"/>
  <circle cx="882" cy="238" r="46" fill="#FFFFFF" fill-opacity="0.13"/>
  <circle cx="838" cy="824" r="74" fill="#FFFFFF" fill-opacity="0.11"/>
  <circle cx="168" cy="842" r="42" fill="#FFFFFF" fill-opacity="0.13"/>`;
}

const bgRect = `
  <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#00C583"/>
    <stop offset="1" stop-color="#00A05E"/>
  </linearGradient>
  <rect width="1024" height="1024" fill="url(#bg)"/>`;

/**
 * Splash native: glass tile + M + koin, disamakan dengan intro JS
 * (box emblem 200 → 252dp, koin di pojok kanan bawah).
 */
function splashTile() {
  const gold = `
    <defs>
      <linearGradient id="splashCoin" x1="0" y1="0" x2="0.8" y2="1">
        <stop offset="0" stop-color="#FFDE7A"/>
        <stop offset="0.55" stop-color="#FFC93C"/>
        <stop offset="1" stop-color="#E8A400"/>
      </linearGradient>
    </defs>`;
  return `${gold}
  <g>
    <!-- tile kaca + monogram + koin, tanpa dekorasi tepi agar aman di splash Android 12 -->
    <rect x="163.8" y="163.8" width="696.4" height="696.4" rx="189.4"
      fill="#FFFFFF" fill-opacity="0.08" stroke="#FFFFFF" stroke-opacity="0.42" stroke-width="11.3"/>
    <path d="M 240.6 660.5 L 240.6 327.7 L 512 609.3 L 783.4 327.7 L 783.4 660.5"
      fill="none" stroke="#FFFFFF" stroke-width="71.7" stroke-linecap="round" stroke-linejoin="round"/>
    <g transform="translate(845,853)">
      <circle r="114" fill="url(#splashCoin)" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="5.7"/>
      <circle r="60.7" fill="none" stroke="#FFFFFF" stroke-opacity="0.85" stroke-width="9.5"/>
      <path d="M -26.6 -11.4 L 0 -41.7 L 26.6 -11.4" fill="none" stroke="#FFFFFF" stroke-width="13.3" stroke-linecap="round" stroke-linejoin="round"/>
    </g>
  </g>`;
}

const variants = [
  // ikon utama (iOS + fallback): penuh, gradasi hijau, dekorasi halus
  { file: `${OUT}/icon.png`, size: 1024, svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">${bgRect}${deco()}${mark({ scale: 1, ring: false })}</svg>` },
  // adaptive icon Android: latar transparan + monogram di zona aman (66%)
  { file: `${OUT}/android-icon-foreground.png`, size: 1024, svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">${mark({ scale: 0.62, ring: true })}</svg>` },
  // ikon latar adaptive: hijau solid
  { file: `${OUT}/android-icon-background.png`, size: 1024, svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><rect width="1024" height="1024" fill="#00AB6B"/></svg>` },
  // monochrome (themed icon): siluet putih
  { file: `${OUT}/android-icon-monochrome.png`, size: 1024, svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">${mark({ scale: 0.62, ring: false, mono: true })}</svg>` },
  // splash native: glass tile + M + koin (sama dengan intro JS)
  { file: `${OUT}/splash-icon.png`, size: 1024, svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">${splashTile()}</svg>` },
];

for (const v of variants) {
  await sharp(Buffer.from(v.svg)).resize(v.size, v.size).png().toFile(v.file);
  console.log('OK', v.file);
}
