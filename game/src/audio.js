// Breakwater — sound: every effect synthesized with WebAudio, no audio files.
// A tiny synth: oscillators through a gain envelope, plus a noise buffer for
// splashes and booms. Nothing plays until the player interacts (the Start
// button resumes the AudioContext), so browsers never block us.

let ctx = null;
let master = null;

export function ensureAudio(muted) {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.35;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return true;
}

export function setMuted(muted) {
  if (master && ctx) master.gain.setValueAtTime(muted ? 0 : 0.35, ctx.currentTime);
}

function tone(freq, dur, type = 'sine', vol = 0.5, slideTo = null, delay = 0) {
  if (!ctx || !master) return;
  const t0 = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g);
  g.connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

function noise(dur, vol = 0.4, lowpass = 1200, delay = 0) {
  if (!ctx || !master) return;
  const t0 = ctx.currentTime + delay;
  const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = lowpass;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filter);
  filter.connect(g);
  g.connect(master);
  src.start(t0);
}

export const sfx = {
  shoot() { tone(720, 0.07, 'square', 0.12, 420); },
  frost() { tone(1180, 0.16, 'sine', 0.14, 620); },
  cannon() { noise(0.22, 0.5, 700); tone(140, 0.2, 'sine', 0.35, 55); },
  hit() { tone(220, 0.05, 'triangle', 0.1, 160); },
  place() { tone(392, 0.09, 'triangle', 0.3); tone(523, 0.12, 'triangle', 0.3, null, 0.07); },
  upgrade() { tone(523, 0.1, 'triangle', 0.3); tone(659, 0.1, 'triangle', 0.3, null, 0.08); tone(784, 0.16, 'triangle', 0.3, null, 0.16); },
  sell() { tone(660, 0.1, 'sine', 0.25, 330); },
  error() { tone(160, 0.14, 'sawtooth', 0.2, 110); },
  coin() { tone(988, 0.08, 'sine', 0.18); tone(1319, 0.12, 'sine', 0.18, null, 0.06); },
  leak() { noise(0.35, 0.5, 500); tone(98, 0.4, 'sawtooth', 0.3, 49); },
  waveStart() { tone(262, 0.12, 'triangle', 0.3); tone(392, 0.12, 'triangle', 0.3, null, 0.1); tone(523, 0.2, 'triangle', 0.3, null, 0.2); },
  waveClear() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, 'triangle', 0.28, null, i * 0.09)); },
  victory() { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.3, 'triangle', 0.3, null, i * 0.12)); noise(0.6, 0.12, 3000, 0.3); },
  defeat() { [392, 330, 262, 196].forEach((f, i) => tone(f, 0.32, 'sawtooth', 0.22, null, i * 0.16)); },
  click() { tone(840, 0.04, 'sine', 0.12); },
};
