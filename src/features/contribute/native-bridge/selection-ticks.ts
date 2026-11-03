import type { HapticsPlugin } from '@capacitor/haptics';

import { isNativeApp, lazyPlugin } from './native-app';

/*
 * A light tick under the finger as the toolbar's pill is picked up and as it crosses into another
 * tab. In the Android app through the Haptics plugin (@capacitor/haptics, owner-approved
 * 2026-11-01), reached by name so the web bundle carries none of it, and which follows the
 * phone's own haptics setting. On the web, a 10 ms vibration where the browser has one (Android
 * Chrome); nothing on iPhones and desktops, which have none.
 */

/** How long the web's tick lasts: a tap felt, not a buzz. */
const WEB_TICK_MS = 10;

const nativeHaptics = lazyPlugin<HapticsPlugin>('Haptics');

const warnOnce = (() => {
  let hasWarned = false;
  return (error: unknown) => {
    if (hasWarned) return;
    hasWarned = true;
    console.warn('The toolbar could not tick under the finger; it slides all the same.', error);
  };
})();

function webTick(): void {
  if ('vibrate' in navigator) navigator.vibrate(WEB_TICK_MS);
}

/** The pill picked up: a selection begins, with its first tick. */
export function startSelectionTicks(): void {
  if (!isNativeApp()) {
    webTick();
    return;
  }
  const plugin = nativeHaptics();
  plugin
    .selectionStart()
    .then(() => plugin.selectionChanged())
    .catch(warnOnce);
}

/** The pill crossed into another tab: one tick. */
export function selectionTick(): void {
  if (!isNativeApp()) {
    webTick();
    return;
  }
  nativeHaptics().selectionChanged().catch(warnOnce);
}

/** The pill let go: the selection ends, with no tick of its own. */
export function endSelectionTicks(): void {
  if (!isNativeApp()) return;
  nativeHaptics().selectionEnd().catch(warnOnce);
}
