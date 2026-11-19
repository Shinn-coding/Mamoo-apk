/**
 * Generator aset brand Mamoo: monogram m + panah naik.
 * Raster SVG -> PNG dengan sharp. Jalankan dari root project.
 *   node scripts/make-logo.mjs
 *
 * Path mark di bawah harus sama dengan yang dipakai intro
 * (src/components/ui/bubble-splash.tsx).
 */
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const OUT = 'assets/images';
mkdirSync(OUT, { recursive: true });

// ---- Mark dalam koordinat 200x200 ----
// Titik tengah visual sudah dihitung dari bounds mark + stroke.
const MARK = {
  size: 200,
  cx: 102,
  cy: 92.5,
  stroke: 14,
  body: 'M 48 150 L 48 100 C 48 82 60 72 78 72 C 92 72 97 82 97 98 L 97 150',
  arch: 'M 97 98 C 97 82 106 72 122 72 C 136 72 146 82 146 98',
  shaft: 'M 146 150 L 146 56',
  head: 'M 146 28 L 129 60 L 146 52 L 163 60 Z',
};

function markPaths(color = '#FFFFFF') {
  return `
    <path d="${MARK.body}" fill="none" stroke="${color}" stroke-width="${MARK.stroke}"
      stroke-linecap="round" stroke-linejoin="round"/>
    <path d="${MARK.arch}" fill="none" stroke="${color}" stroke-width="${MARK.stroke}"
      stroke-linecap="round" stroke-linejoin="round"/>
    <path d="${MARK.shaft}" fill="none" stroke="${color}" stroke-width="${MARK.stroke}"
      stroke-linecap="round"/>
    <path d="${MARK.head}" fill="${color}"/>`;
}

/** Mark di tengah canvas `size`, dengan skala relatif terhadap 200. */
function markGroup({ size = 1024, scale = 1, color = '#FFFFFF' } = {}) {
  const factor = (size / MARK.size) * scale;
  return `<g transform="translate(${size / 2} ${size / 2}) scale(${factor}) translate(${-MARK.cx} ${-MARK.cy})">
    ${markPaths(color)}
  </g>`;
}

const bgDefs = `
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0.35" y2="1">
      <stop offset="0" stop-color="#00C583"/>
      <stop offset="0.55" stop-color="#00AB6B"/>
      <stop offset="1" stop-color="#008F59"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.26" cy="0.16" r="0.85">
      <stop offset="0" stop-color="#A7FFD9" stop-opacity="0.22"/>
      <stop offset="1" stop-color="#A7FFD9" stop-opacity="0"/>
    </radialGradient>
  </defs>`;

const bgRect = `${bgDefs}
  <rect width="1024" height="1024" fill="url(#bg)"/>
  <rect width="1024" height="1024" fill="url(#glow)"/>`;

/**
 * Splash native: glass tile + m-arrow.
 * Koordinat 200 agar sama persis dengan tile di intro JS.
 */
function splashTile() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
    <defs>
      <linearGradient id="tileStroke" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.62"/>
        <stop offset="0.52" stop-color="#FFFFFF" stop-opacity="0.14"/>
        <stop offset="1" stop-color="#FFFFFF" stop-opacity="0.38"/>
      </linearGradient>
      <radialGradient id="tileSheen" cx="0.3" cy="0.16" r="0.9">
        <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.24"/>
        <stop offset="0.55" stop-color="#FFFFFF" stop-opacity="0.05"/>
        <stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect x="32" y="32" width="136" height="136" rx="37"
      fill="#FFFFFF" fill-opacity="0.08" stroke="url(#tileStroke)" stroke-width="2.2"/>
    <rect x="32" y="32" width="136" height="136" rx="37" fill="url(#tileSheen)"/>
    <path d="M 54 48.5 H 104" fill="none" stroke="#FFFFFF" stroke-opacity="0.4"
      stroke-width="1.4" stroke-linecap="round"/>
    <g transform="translate(100 100) scale(0.85) translate(${-MARK.cx} ${-MARK.cy})">
      ${markPaths('#FFFFFF')}
    </g>
  </svg>`;
}

const variants = [
  // ikon utama (iOS + fallback): full-bleed, tanpa kartu rounded/shadow
  {
    file: `${OUT}/icon.png`,
    size: 1024,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">${bgRect}${markGroup()}</svg>`,
  },
  // adaptive icon Android: foreground transparan, mark di safe zone
  {
    file: `${OUT}/android-icon-foreground.png`,
    size: 1024,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">${markGroup({ scale: 0.94 })}</svg>`,
  },
  // background adaptive: gradient senada
  {
    file: `${OUT}/android-icon-background.png`,
    size: 1024,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">${bgRect}</svg>`,
  },
  // monochrome (themed icon): siluet putih di atas transparan
  {
    file: `${OUT}/android-icon-monochrome.png`,
    size: 1024,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">${markGroup({ scale: 0.94 })}</svg>`,
  },
  // splash native: tile kaca + m-arrow, transparan
  {
    file: `${OUT}/splash-icon.png`,
    size: 1024,
    svg: splashTile(),
  },
];

for (const v of variants) {
  await sharp(Buffer.from(v.svg)).resize(v.size, v.size).png().toFile(v.file);
  console.log('OK', v.file);
}
