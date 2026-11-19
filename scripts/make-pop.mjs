/**
 * Generate suara "pop" lembut (blip pendek) untuk momen M mendarat.
 * Jalankan dari root project: node scripts/make-pop.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs';

const SR = 44100;
const DUR = 0.14;
const N = Math.floor(SR * DUR);

const samples = new Float64Array(N);
for (let i = 0; i < N; i++) {
  const t = i / SR;
  // pitch turun cepat (600 -> 300 Hz) = "bop" lembut
  const f = 600 - 300 * (t / DUR);
  const env = Math.exp(-28 * t) * Math.min(1, t / 0.004);
  samples[i] = Math.sin(2 * Math.PI * f * t) * env * 0.35;
}

const dataSize = N * 2;
const buf = Buffer.alloc(44 + dataSize);
buf.write('RIFF', 0);
buf.writeUInt32LE(36 + dataSize, 4);
buf.write('WAVE', 8);
buf.write('fmt ', 12);
buf.writeUInt32LE(16, 16);
buf.writeUInt16LE(1, 20);
buf.writeUInt16LE(1, 22);
buf.writeUInt32LE(SR, 24);
buf.writeUInt32LE(SR * 2, 28);
buf.writeUInt16LE(2, 32);
buf.writeUInt16LE(16, 34);
buf.write('data', 36);
buf.writeUInt32LE(dataSize, 40);
for (let i = 0; i < N; i++) {
  buf.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(samples[i] * 32767))), 44 + i * 2);
}

mkdirSync('assets/sounds', { recursive: true });
writeFileSync('assets/sounds/pop.wav', buf);
console.log('OK assets/sounds/pop.wav');
