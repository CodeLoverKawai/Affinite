/**
 * Web Audio API synthesized chime and completion chord engine.
 * Zero external audio assets required; produces clean, soothing harmonic bell tones.
 */

export interface HarmonicNote {
  freq: number;
  time: number;
  duration: number;
}

/**
 * Ascending harmonic chord frequencies (Sol-Do harmony: C5, E5, G5, C6).
 */
export const HARMONIC_NOTES: HarmonicNote[] = [
  { freq: 523.25, time: 0, duration: 1.8 },
  { freq: 659.25, time: 0.12, duration: 1.8 },
  { freq: 783.99, time: 0.24, duration: 2.2 },
  { freq: 1046.5, time: 0.38, duration: 2.5 },
];

/**
 * Reminder / attention chime frequencies (G5, C6).
 */
export const CHIME_NOTES: HarmonicNote[] = [
  { freq: 783.99, time: 0, duration: 1.0 },
  { freq: 1046.5, time: 0.12, duration: 1.2 },
];

let audioCtx: AudioContext | null = null;

export function resetAudioContextForTesting(): void {
  audioCtx = null;
}

export function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioContextClass =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;

  if (!AudioContextClass) return null;

  try {
    if (!audioCtx || audioCtx.state === 'closed') {
      audioCtx = new AudioContextClass();
    }

    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }

    return audioCtx;
  } catch {
    return null;
  }
}

function playSynthesizedNotes(notes: HarmonicNote[], peakVolume = 0.25): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    notes.forEach(({ freq, time, duration }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + time);

      // Natural exponential chime envelope
      gain.gain.setValueAtTime(0.0001, now + time);
      gain.gain.exponentialRampToValueAtTime(peakVolume, now + time + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + time + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + time);
      osc.stop(now + time + duration);
    });
  } catch {
    // Autoplay policy fallback or audio hardware errors
  }
}

/**
 * Plays a synthesized 4-note ascending chord for habit/streak completion.
 */
export function playCompletionSound(): void {
  playSynthesizedNotes(HARMONIC_NOTES, 0.25);
}

/**
 * Plays a gentle synthesized dual-tone bell chime for reminders and notifications.
 */
export function playChimeSound(): void {
  playSynthesizedNotes(CHIME_NOTES, 0.2);
}
