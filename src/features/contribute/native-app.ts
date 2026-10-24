import type { CapacitorGlobal } from '@capacitor/core';

function isCapacitor(value: unknown): value is CapacitorGlobal {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof Reflect.get(value, 'isNativePlatform') === 'function' &&
    typeof Reflect.get(value, 'registerPlugin') === 'function'
  );
}

/**
 * Capacitor's global, set before the page loads inside the Android app and absent on the web.
 * Read from `window` rather than imported, so the web build carries no Capacitor code.
 */
function capacitor(): CapacitorGlobal | null {
  const value: unknown = Reflect.get(window, 'Capacitor');
  return isCapacitor(value) ? value : null;
}

/** Whether the page runs inside the Android app. */
export function isNativeApp(): boolean {
  return capacitor()?.isNativePlatform() === true;
}

/** A native plugin's bridge, by the name it registers under. Only inside the app. */
export function nativePlugin<T>(name: string): T {
  const cap = capacitor();
  if (!cap) throw new Error('This page is not running inside the Android app.');
  return cap.registerPlugin<T>(name);
}
