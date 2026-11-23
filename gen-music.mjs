/* gen-music.mjs — synthesizes the video's soundtrack: a 50 s chiptune loop
   (square-wave arpeggio, bass, kick, hats) written as a 16-bit WAV.
   No samples, no copyrighted music — every sample is computed here. */
import { writeFileSync } from 'node:fs';

const SR = 22050, DUR = 50.0, N = Math.floor(SR * DUR);
const out = new Float32Array(N);
const BPM = 122, BEAT = 60 / BPM, BAR = BEAT * 4;
const midi = m => 440 * Math.pow(2, (m - 69) / 12);

/* A minor loop: Am — F — C — G, one chord per bar */
const CHORDS = [
  { root: 33, tones: [57, 60, 64, 69] },  /* A1 bass, A3 C4 E4 A4 */
  { root: 29, tones: [53, 57, 60, 65] },  /* F */
  { root: 36, tones: [60, 64, 67, 72] },  /* C */
  { root: 31, tones: [55, 59, 62, 67] },  /* G */
];
function addTone(t0, dur, freq, amp, wave, decay = 6) {
  const s0 = Math.floor(t0 * SR), s1 = Math.min(N, Math.floor((t0 + dur) * SR));
  for (let i = s0; i < s1; i++) {
    const t = (i - s0) / SR, ph = (t * freq) % 1;
    let v;
    if (wave === 'square') v = ph < 0.5 ? 1 : -1;
    else if (wave === 'tri') v = 2 * Math.abs(2 * ph - 1) - 1;
    else v = Math.sin(2 * Math.PI * freq * t);
    out[i] += v * amp * Math.exp(-decay * t) * Math.min(1, t / 0.004 + 0.15);
  }
}
function addKick(t0) {
  const s0 = Math.floor(t0 * SR), len = Math.floor(0.13 * SR);
  for (let i = 0; i < len && s0 + i < N; i++) {
    const t = i / SR, f = 130 - 700 * t;
    out[s0 + i] += Math.sin(2 * Math.PI * Math.max(f, 38) * t) * 0.85 * Math.exp(-16 * t);
  }
}
let noiseSeed = 987654321;
function noise() { noiseSeed = (noiseSeed * 1103515245 + 12345) & 0x7fffffff; return noiseSeed / 0x40000000 - 1; }
function addHat(t0, amp) {
  const s0 = Math.floor(t0 * SR), len = Math.floor(0.035 * SR);
  let prev = 0;
  for (let i = 0; i < len && s0 + i < N; i++) {
    const w = noise(), hp = w - prev; prev = w;
    out[s0 + i] += hp * amp * Math.exp(-60 * (i / SR));
  }
}

const bars = Math.ceil(DUR / BAR);
for (let b = 0; b < bars; b++) {
  const ch = CHORDS[b % 4], t0 = b * BAR;
  /* bass: root on beats 1 and 3, octave hop on 4 */
  addTone(t0, BEAT * 0.9, midi(ch.root + 12), 0.30, 'tri', 2.2);
  addTone(t0 + BEAT * 2, BEAT * 0.9, midi(ch.root + 12), 0.30, 'tri', 2.2);
  addTone(t0 + BEAT * 3, BEAT * 0.9, midi(ch.root + 24), 0.20, 'tri', 2.2);
  /* arpeggio: 8th notes cycling the chord tones */
  for (let e = 0; e < 8; e++) {
    const tone = ch.tones[[0, 1, 2, 3, 2, 1, 2, 3][e]];
    addTone(t0 + e * BEAT / 2, BEAT / 2, midi(tone + 12), 0.115, 'square', 5);
  }
  /* sparkle: a high echo note on beat 4 of every second bar */
  if (b % 2 === 1) addTone(t0 + BEAT * 3.5, BEAT / 2, midi(ch.tones[3] + 24), 0.06, 'square', 7);
  for (let beat = 0; beat < 4; beat++) {
    addKick(t0 + beat * BEAT);
    addHat(t0 + beat * BEAT + BEAT / 2, 0.16);
    addHat(t0 + beat * BEAT, 0.07);
  }
}
/* gentle fades + normalize */
for (let i = 0; i < N; i++) {
  const t = i / SR;
  const fadeIn = Math.min(1, t / 0.25), fadeOut = Math.min(1, (DUR - t) / 0.6);
  out[i] *= fadeIn * fadeOut;
}
let peak = 0; for (const v of out) peak = Math.max(peak, Math.abs(v));
const gain = 0.82 / Math.max(peak, 1e-6);

const buf = Buffer.alloc(44 + N * 2);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 2, 4); buf.write('WAVE', 8);
buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20);
buf.writeUInt16LE(1, 22); buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 2, 28);
buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36);
buf.writeUInt32LE(N * 2, 40);
for (let i = 0; i < N; i++) buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, out[i] * gain)) * 32767), 44 + i * 2);
const path = new URL('music.wav', import.meta.url).pathname;
writeFileSync(path, buf);
console.log('wrote', path, DUR + 's @', SR, 'Hz');
