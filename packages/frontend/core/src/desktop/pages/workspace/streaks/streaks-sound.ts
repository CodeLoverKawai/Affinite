/**
 * Web Audio API synthesized completion chime & notification dispatcher
 * Zero external audio assets required; produces a clean, soothing harmonic bell sound.
 */

import { playCompletionSound } from '@affine/core/modules/affinite-hub/sound';

export const playStreakCompletionSound = playCompletionSound;

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
