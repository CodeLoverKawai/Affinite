import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import {
  getAudioContext,
  HARMONIC_NOTES,
  playChimeSound,
  playCompletionSound,
  resetAudioContextForTesting,
} from '../sound';

describe('affinite-hub sound module', () => {
  const hadWindow = 'window' in globalThis;
  const initialWindow = (globalThis as { window?: unknown }).window;

  afterEach(() => {
    resetAudioContextForTesting();
    vi.restoreAllMocks();
    if (hadWindow) {
      (globalThis as { window?: unknown }).window = initialWindow;
    } else {
      // @ts-expect-error cleanup window in node
      delete globalThis.window;
    }
  });

  describe('HARMONIC_NOTES', () => {
    test('is defined as an array of harmonic bell notes', () => {
      expect(Array.isArray(HARMONIC_NOTES)).toBe(true);
      expect(HARMONIC_NOTES.length).toBeGreaterThanOrEqual(3);
    });

    test('each harmonic note has valid frequency, time offset, and duration', () => {
      let previousTime = 0;
      for (const note of HARMONIC_NOTES) {
        expect(typeof note.freq).toBe('number');
        expect(note.freq).toBeGreaterThan(0);

        expect(typeof note.time).toBe('number');
        expect(note.time).toBeGreaterThanOrEqual(0);
        expect(note.time).toBeGreaterThanOrEqual(previousTime);

        expect(typeof note.duration).toBe('number');
        expect(note.duration).toBeGreaterThan(0);

        previousTime = note.time;
      }
    });

    test('includes standard Sol-Do completion chord frequencies', () => {
      const frequencies = HARMONIC_NOTES.map(n => Math.round(n.freq));
      // C5 (523), E5 (659), G5 (784), C6 (1047)
      expect(frequencies).toContain(523);
      expect(frequencies).toContain(659);
      expect(frequencies).toContain(784);
      expect(frequencies).toContain(1047);
    });
  });

  describe('playChimeSound & playCompletionSound without Web Audio', () => {
    test('execute safely without throwing when window is undefined', () => {
      // @ts-expect-error test SSR/node environment
      delete globalThis.window;

      expect(() => playChimeSound()).not.toThrow();
      expect(() => playCompletionSound()).not.toThrow();
      expect(getAudioContext()).toBeNull();
    });

    test('execute safely when AudioContext constructor is undefined in window', () => {
      // @ts-expect-error test missing AudioContext in browser
      globalThis.window = {} as unknown as Window & typeof globalThis;

      expect(() => playChimeSound()).not.toThrow();
      expect(() => playCompletionSound()).not.toThrow();
      expect(getAudioContext()).toBeNull();
    });
  });

  describe('synthesized Web Audio playback with mock AudioContext', () => {
    let mockOscillators: Array<{
      type: string;
      frequency: { setValueAtTime: ReturnType<typeof vi.fn> };
      connect: ReturnType<typeof vi.fn>;
      start: ReturnType<typeof vi.fn>;
      stop: ReturnType<typeof vi.fn>;
    }>;
    let mockGains: Array<{
      gain: {
        setValueAtTime: ReturnType<typeof vi.fn>;
        exponentialRampToValueAtTime: ReturnType<typeof vi.fn>;
      };
      connect: ReturnType<typeof vi.fn>;
    }>;
    let contextCreationCount = 0;
    let mockAudioContextInstance: {
      state: AudioContextState;
      currentTime: number;
      destination: Record<string, unknown>;
      createOscillator: ReturnType<typeof vi.fn>;
      createGain: ReturnType<typeof vi.fn>;
      resume: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
      mockOscillators = [];
      mockGains = [];
      contextCreationCount = 0;

      const MockAudioContext = vi.fn().mockImplementation(() => {
        contextCreationCount++;
        mockAudioContextInstance = {
          state: 'running' as AudioContextState,
          currentTime: 10,
          destination: {},
          createOscillator: vi.fn().mockImplementation(() => {
            const osc = {
              type: '',
              frequency: { setValueAtTime: vi.fn() },
              connect: vi.fn(),
              start: vi.fn(),
              stop: vi.fn(),
            };
            mockOscillators.push(osc);
            return osc;
          }),
          createGain: vi.fn().mockImplementation(() => {
            const gain = {
              gain: {
                setValueAtTime: vi.fn(),
                exponentialRampToValueAtTime: vi.fn(),
              },
              connect: vi.fn(),
            };
            mockGains.push(gain);
            return gain;
          }),
          resume: vi.fn().mockResolvedValue(undefined),
        };
        return mockAudioContextInstance;
      });

      // @ts-expect-error assign mock AudioContext to simulated window
      globalThis.window = {
        AudioContext: MockAudioContext,
      } as unknown as Window & typeof globalThis;
    });

    test('playCompletionSound creates oscillators and envelopes for all harmonic notes', () => {
      playCompletionSound();

      expect(mockOscillators.length).toBe(HARMONIC_NOTES.length);
      expect(mockGains.length).toBe(HARMONIC_NOTES.length);

      HARMONIC_NOTES.forEach((note, index) => {
        const osc = mockOscillators[index];
        const gain = mockGains[index];

        expect(osc.type).toBe('sine');
        expect(osc.frequency.setValueAtTime).toHaveBeenCalledWith(
          note.freq,
          10 + note.time
        );
        expect(gain.gain.setValueAtTime).toHaveBeenCalledWith(
          0.0001,
          10 + note.time
        );
        expect(gain.gain.exponentialRampToValueAtTime).toHaveBeenCalledWith(
          0.25,
          10 + note.time + 0.03
        );
        expect(gain.gain.exponentialRampToValueAtTime).toHaveBeenCalledWith(
          0.0001,
          10 + note.time + note.duration
        );
        expect(osc.connect).toHaveBeenCalledWith(gain);
        expect(gain.connect).toHaveBeenCalledWith(
          mockAudioContextInstance.destination
        );
        expect(osc.start).toHaveBeenCalledWith(10 + note.time);
        expect(osc.stop).toHaveBeenCalledWith(10 + note.time + note.duration);
      });
    });

    test('playChimeSound plays synthesized chime notes safely', () => {
      playChimeSound();

      expect(mockOscillators.length).toBeGreaterThanOrEqual(1);
      expect(mockGains.length).toBeGreaterThanOrEqual(1);
      for (const osc of mockOscillators) {
        expect(osc.type).toBe('sine');
        expect(osc.start).toHaveBeenCalled();
        expect(osc.stop).toHaveBeenCalled();
      }
    });

    test('recreates AudioContext if previous context is closed', () => {
      // First call creates context
      const ctx1 = getAudioContext();
      expect(ctx1).not.toBeNull();
      expect(contextCreationCount).toBe(1);

      // Simulate context closure
      if (mockAudioContextInstance) {
        mockAudioContextInstance.state = 'closed';
      }

      // Next call should detect closed state and instantiate new context
      const ctx2 = getAudioContext();
      expect(ctx2).not.toBeNull();
      expect(contextCreationCount).toBe(2);
    });

    test('resumes AudioContext if suspended', () => {
      const ctx = getAudioContext();
      expect(ctx).not.toBeNull();

      if (mockAudioContextInstance) {
        mockAudioContextInstance.state = 'suspended';
      }

      getAudioContext();
      expect(mockAudioContextInstance.resume).toHaveBeenCalled();
    });

    test('swallows autoplay policy or audio graph runtime errors gracefully', () => {
      if (mockAudioContextInstance) {
        mockAudioContextInstance.createOscillator = vi
          .fn()
          .mockImplementation(() => {
            throw new Error('NotAllowedError: play was prevented by browser');
          });
      }

      expect(() => playCompletionSound()).not.toThrow();
      expect(() => playChimeSound()).not.toThrow();
    });

    test('handles AudioContext constructor throwing exception without error', () => {
      resetAudioContextForTesting();
      // @ts-expect-error mock throwing constructor
      globalThis.window.AudioContext = vi.fn().mockImplementation(() => {
        throw new Error('AudioContext blocked');
      });

      expect(() => playCompletionSound()).not.toThrow();
      expect(() => playChimeSound()).not.toThrow();
      expect(getAudioContext()).toBeNull();
    });
  });

  describe('streaks-sound retrocompatibility', () => {
    test('re-exports playStreakCompletionSound as alias of playCompletionSound', async () => {
      const streaksSound = await import(
        '../../../desktop/pages/workspace/streaks/streaks-sound'
      );
      expect(streaksSound.playStreakCompletionSound).toBe(playCompletionSound);
      expect(typeof streaksSound.triggerStreakNotification).toBe('function');
    });
  });
});


