export type GameSound =
  | 'menu'
  | 'countdown'
  | 'start'
  | 'normalHit'
  | 'goldenHit'
  | 'angryHit'
  | 'combo'
  | 'miss'
  | 'pause'
  | 'resume'
  | 'gameOver';

interface SoundStep {
  frequency: number;
  duration: number;
  offset?: number;
  gain?: number;
  type?: OscillatorType;
}

type BrowserWindow = Window & {
  webkitAudioContext?: typeof AudioContext;
};

let audioContext: AudioContext | null = null;
let musicTimer: ReturnType<typeof setInterval> | null = null;
let musicStep = 0;

const musicMelody = [523.25, 659.25, 783.99, 659.25, 587.33, 698.46, 880, 698.46];

const soundMap: Record<GameSound, SoundStep[]> = {
  menu: [{ frequency: 523.25, duration: 0.06, gain: 0.035, type: 'triangle' }],
  countdown: [{ frequency: 659.25, duration: 0.08, gain: 0.04, type: 'square' }],
  start: [
    { frequency: 523.25, duration: 0.06, gain: 0.035, type: 'triangle' },
    { frequency: 783.99, duration: 0.09, offset: 0.07, gain: 0.04, type: 'triangle' },
  ],
  normalHit: [
    { frequency: 587.33, duration: 0.04, gain: 0.035, type: 'triangle' },
    { frequency: 783.99, duration: 0.06, offset: 0.04, gain: 0.03, type: 'triangle' },
  ],
  goldenHit: [
    { frequency: 659.25, duration: 0.05, gain: 0.04, type: 'sine' },
    { frequency: 880, duration: 0.07, offset: 0.05, gain: 0.04, type: 'sine' },
    { frequency: 1174.66, duration: 0.09, offset: 0.11, gain: 0.035, type: 'sine' },
  ],
  angryHit: [
    { frequency: 174.61, duration: 0.12, gain: 0.05, type: 'sawtooth' },
    { frequency: 130.81, duration: 0.08, offset: 0.07, gain: 0.04, type: 'sawtooth' },
  ],
  combo: [
    { frequency: 783.99, duration: 0.04, gain: 0.035, type: 'triangle' },
    { frequency: 1046.5, duration: 0.08, offset: 0.05, gain: 0.035, type: 'triangle' },
  ],
  miss: [{ frequency: 220, duration: 0.08, gain: 0.03, type: 'sine' }],
  pause: [{ frequency: 392, duration: 0.06, gain: 0.025, type: 'triangle' }],
  resume: [{ frequency: 587.33, duration: 0.08, gain: 0.03, type: 'triangle' }],
  gameOver: [
    { frequency: 392, duration: 0.08, gain: 0.035, type: 'triangle' },
    { frequency: 329.63, duration: 0.1, offset: 0.1, gain: 0.03, type: 'triangle' },
    { frequency: 261.63, duration: 0.14, offset: 0.22, gain: 0.035, type: 'triangle' },
  ],
};

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;

  if (!audioContext) {
    const AudioContextConstructor =
      window.AudioContext ?? (window as BrowserWindow).webkitAudioContext;
    if (!AudioContextConstructor) return null;

    audioContext = new AudioContextConstructor();
  }

  return audioContext;
}

function resumeContext(context: AudioContext): void {
  if (context.state === 'suspended') {
    void context.resume();
  }
}

export function unlockAudio(): void {
  const context = getAudioContext();
  if (!context) return;

  resumeContext(context);
}

function playTone(context: AudioContext, step: SoundStep): void {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const now = context.currentTime + (step.offset ?? 0);

  oscillator.type = step.type ?? 'triangle';
  oscillator.frequency.setValueAtTime(step.frequency, now);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(step.gain ?? 0.035, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + step.duration);

  oscillator.connect(gain);
  gain.connect(context.destination);

  oscillator.start(now);
  oscillator.stop(now + step.duration + 0.02);
}

export function playGameSound(enabled: boolean, sound: GameSound): void {
  if (!enabled) return;

  const context = getAudioContext();
  if (!context) return;

  resumeContext(context);
  soundMap[sound].forEach((step) => playTone(context, step));
}

export function startBackgroundMusic(enabled: boolean): void {
  if (!enabled || musicTimer) return;

  const context = getAudioContext();
  if (!context) return;

  resumeContext(context);

  const playNext = () => {
    const frequency = musicMelody[musicStep % musicMelody.length];
    musicStep += 1;

    playTone(context, {
      frequency,
      duration: 0.12,
      gain: 0.012,
      type: 'triangle',
    });
  };

  playNext();
  musicTimer = setInterval(playNext, 650);
}

export function stopBackgroundMusic(): void {
  if (!musicTimer) return;

  clearInterval(musicTimer);
  musicTimer = null;
}

export function syncBackgroundMusic(enabled: boolean, active: boolean): void {
  if (enabled && active) {
    startBackgroundMusic(true);
    return;
  }

  stopBackgroundMusic();
}
