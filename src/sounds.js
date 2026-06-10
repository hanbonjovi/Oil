let ctx = null;

function getCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

// iOS only allows audio after a user gesture; call this from a tap handler
export function unlockAudio() {
  getCtx();
}

function blip(freqStart, freqEnd, duration, type, volume, delay = 0) {
  const c = getCtx();
  if (!c) return;
  const t = c.currentTime + delay;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freqStart, t);
  osc.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 1), t + duration);
  gain.gain.setValueAtTime(volume, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(t);
  osc.stop(t + duration);
}

export function playGulp() {
  blip(280, 110, 0.15, 'sine', 0.25);
}

export function playGold() {
  blip(660, 660, 0.08, 'triangle', 0.18);
  blip(880, 880, 0.08, 'triangle', 0.18, 0.07);
  blip(1320, 1320, 0.14, 'triangle', 0.18, 0.14);
}

export function playCrash() {
  const c = getCtx();
  if (!c) return;
  const dur = 0.5;
  const buffer = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  }
  const src = c.createBufferSource();
  src.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 700;
  const gain = c.createGain();
  gain.gain.value = 0.3;
  src.connect(filter);
  filter.connect(gain);
  gain.connect(c.destination);
  src.start();
}
