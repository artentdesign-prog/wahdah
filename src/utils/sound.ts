let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioCtxClass) {
      try {
        audioCtx = new AudioCtxClass();
      } catch {
        // AudioContext not supported
      }
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function playTone(
  freq: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume: number = 0.12,
  delay: number = 0,
  isMuted: boolean = false
) {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const t = ctx.currentTime + (delay || 0);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume), t + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + duration + 0.05);
  } catch {
    // Ignore audio playback errors
  }
}

export const sfx = {
  resume: () => {
    getAudioContext();
  },
  nav: (muted: boolean) => {
    playTone(196, 0.35, 'sine', 0.07, 0, muted);
    playTone(294, 0.45, 'sine', 0.05, 0.08, muted);
  },
  start: (muted: boolean) => {
    playTone(660, 0.12, 'triangle', 0.1, 0, muted);
  },
  tick: (muted: boolean) => {
    playTone(880, 0.07, 'square', 0.04, 0, muted);
  },
  urgent: (muted: boolean) => {
    playTone(1240, 0.09, 'square', 0.07, 0, muted);
  },
  buzzer: (muted: boolean) => {
    playTone(150, 0.9, 'sawtooth', 0.16, 0, muted);
    playTone(113, 0.9, 'sawtooth', 0.12, 0.03, muted);
  },
  reveal: (muted: boolean) => {
    playTone(523, 0.3, 'triangle', 0.13, 0, muted);
    playTone(784, 0.55, 'triangle', 0.13, 0.12, muted);
    playTone(1047, 0.7, 'triangle', 0.09, 0.26, muted);
  },
  hint: (muted: boolean) => {
    playTone(660, 0.22, 'sine', 0.1, 0, muted);
    playTone(990, 0.35, 'sine', 0.08, 0.1, muted);
  },
  point: (muted: boolean) => {
    playTone(988, 0.12, 'triangle', 0.1, 0, muted);
    playTone(1319, 0.3, 'triangle', 0.1, 0.1, muted);
  },
  fanfare: (muted: boolean) => {
    const freqs = [392, 494, 587, 784, 988, 1175];
    freqs.forEach((f, i) => {
      playTone(f, 0.5, 'triangle', 0.11, i * 0.14, muted);
    });
    playTone(1568, 1.4, 'sine', 0.08, 0.9, muted);
  }
};
