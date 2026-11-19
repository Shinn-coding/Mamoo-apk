/**
 * Generate suara "cling" (ding bel lembut) — disintesis offline, WAV 16-bit mono.
 * Jalankan dari root project: node scripts/make-cling.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs';

const SR = 44100;
const DUR = 0.55;
const N = Math.floor(SR * DUR);

// Dua partial bel: dasar + overtone, decay eksponensial + sedikit sparkle.
const partials = [
  { f: 1046.5, gain: 0.5, decay: 5.5 },  // C6
  { f: 1568.0, gain: 0.3, decay: 6.5 },  // G6
  { f: 2093.0, gain: 0.18, decay: 8 },   // C7
  { f: 3136.0, gain: 0.08, decay: 10 },  // G7
];

const samples = new Float64Array(N);
for (let i = 0; i < N; i++) {
  const t = i / SR;
  let v = 0;
  for (const p of partials) {
    v += p.gain * Math.sin(2 * Math.PI * p.f * t) * Math.exp(-p.decay * t);
  }
  // attack singkat biar "cling" tidak keras di awal
  const attack = Math.min(1, t / 0.006);
  samples[i] = v * attack * 0.6;
}

// WAV header 16-bit PCM mono
const dataSize = N * 2;
const buf = Buffer.alloc(44 + dataSize);
buf.write('RIFF', 0);
buf.writeUInt32LE(36 + dataSize, 4);
buf.write('WAVE', 8);
buf.write('fmt ', 12);
buf.writeUInt32LE(16, 16);          // PCM chunk size
buf.writeUInt16LE(1, 20);           // PCM
buf.writeUInt16LE(1, 22);           // mono
buf.writeUInt32LE(SR, 24);
buf.writeUInt32LE(SR * 2, 28);      // byte rate
buf.writeUInt16LE(2, 32);           // block align
buf.writeUInt16LE(16, 34);          // bits
buf.write('data', 36);
buf.writeUInt32LE(dataSize, 40);
for (let i = 0; i < N; i++) {
  buf.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(samples[i] * 32767))), 44 + i * 2);
}

mkdirSync('assets/sounds', { recursive: true });
writeFileSync('assets/sounds/cling.wav', buf);
console.log('OK assets/sounds/cling.wav', dataSize, 'bytes');
