import type { CapacitorGlobal } from '@capacitor/core';

let capacitor: CapacitorGlobal | null = null;

/**
 * Loads Capacitor's JavaScript in the Android app's build (`--mode apk`) and does nothing on
 * the web, whose bundle then carries none of it. Android injects only the low-level bridge
 * (`window.androidBridge`); `window.Capacitor` and `registerPlugin` come from this import, so the
 * entry point waits for it before the page renders.
 */
export async function prepareNativeApp(): Promise<void> {
  if (import.meta.env.MODE !== 'apk') return;
  capacitor = (await import('@capacitor/core')).Capacitor;
}

/** Whether the page runs inside the Android app. */
export function isNativeApp(): boolean {
  return capacitor?.isNativePlatform() === true;
}

/** What the page found of the native bridge, in words, for the spike's panel. */
export function describeNativeBridge(): string {
  const bridge = typeof Reflect.get(window, 'androidBridge');
  return `Capacitor loaded: ${capacitor ? 'yes' : 'no'}, platform: ${capacitor?.getPlatform() ?? '-'}, androidBridge: ${bridge}`;
}

/** A native plugin's bridge, by the name it registers under. Only inside the app. */
export function nativePlugin<T>(name: string): T {
  if (!capacitor) throw new Error('This page is not running inside the Android app.');
  return capacitor.registerPlugin<T>(name);
}
