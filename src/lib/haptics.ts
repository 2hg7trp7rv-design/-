export type HapticPattern = number | number[];

export function triggerHaptic(enabled: boolean, pattern: HapticPattern): void {
  if (!enabled) return;
  if (typeof navigator === 'undefined') return;
  if (typeof navigator.vibrate !== 'function') return;

  navigator.vibrate(pattern);
}
