import { save } from './store';

type Sfx = 'tap' | 'right' | 'wrong' | 'harvest' | 'plant';
type AudioCtor = new () => AudioContext;

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (ctx) return ctx;
  const w = window as unknown as { AudioContext?: AudioCtor; webkitAudioContext?: AudioCtor };
  const Ctor = w.AudioContext ?? w.webkitAudioContext;
  if (!Ctor) return null;
  try {
    ctx = new Ctor();
  } catch {
    ctx = null;
  }
  return ctx;
}

// [frequency Hz, start s, duration s, waveform]
const NOTES: Record<Sfx, [number, number, number, OscillatorType][]> = {
  tap: [[660, 0, 0.05, 'triangle']],
  right: [[660, 0, 0.09, 'triangle'], [880, 0.08, 0.14, 'triangle']],
  wrong: [[220, 0, 0.16, 'sine'], [180, 0.1, 0.18, 'sine']],
  harvest: [[523, 0, 0.08, 'triangle'], [659, 0.07, 0.08, 'triangle'], [784, 0.14, 0.16, 'triangle']],
  plant: [[392, 0, 0.08, 'sine'], [523, 0.06, 0.1, 'sine']],
};

/** Tiny synthesized blips: no audio files to download. */
export function sfx(kind: Sfx): void {
  if (!save.value.settings.sound) return;
  const ac = audio();
  if (!ac) return;
  if (ac.state === 'suspended') void ac.resume();
  for (const [freq, start, dur, type] of NOTES[kind]) {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    const t0 = ac.currentTime + start;
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(0.06, t0 + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }
}

export function buzz(ms = 12): void {
  if (!save.value.settings.haptics) return;
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') navigator.vibrate(ms);
}
