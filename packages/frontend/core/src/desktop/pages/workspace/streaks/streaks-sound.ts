/**
 * Web Audio API synthesized completion chime & notification dispatcher
 * Zero external audio assets required; produces a clean, soothing harmonic bell sound.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioContextClass =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext })
      .webkitAudioContext;

  if (!AudioContextClass) return null;

  if (!audioCtx || audioCtx.state === 'closed') {
    audioCtx = new AudioContextClass();
  }

  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }

  return audioCtx;
}

export function playStreakCompletionSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // Harmonic chord frequencies (Sol-Do harmony: 523.25Hz C5, 659.25Hz E5, 783.99Hz G5, 1046.50Hz C6)
  const notes = [
    { freq: 523.25, time: 0, duration: 1.8 },
    { freq: 659.25, time: 0.12, duration: 1.8 },
    { freq: 783.99, time: 0.24, duration: 2.2 },
    { freq: 1046.5, time: 0.38, duration: 2.5 },
  ];

  notes.forEach(({ freq, time, duration }) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now + time);

    // Natural exponential chime envelope
    gain.gain.setValueAtTime(0.0001, now + time);
    gain.gain.exponentialRampToValueAtTime(0.25, now + time + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + time + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + time);
    osc.stop(now + time + duration);
  });
}

export function triggerStreakNotification(
  title: string,
  body: string,
  sound = true
) {
  if (sound) {
    try {
      playStreakCompletionSound();
    } catch {
      // Audio autoplay policy fallback
    }
  }

  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: '/favicon.ico',
        });
      } catch {
        // Fallback for notification construction
      }
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification(title, {
            body,
            icon: '/favicon.ico',
          });
        }
      });
    }
  }
}
