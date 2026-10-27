import type { WatchError } from '../use-geolocation-watch';

const PERMISSION_DENIED = 1;
const POSITION_UNAVAILABLE = 2;

/**
 * The location plugin refuses with NOT_AUTHORIZED both when the permission is missing and when
 * the phone's location switch is off, and tells them apart only in its message. Switched off is
 * "unavailable" (check that location is on); anything else is denied.
 */
export function watchErrorOf(error: { code?: string; message: string }): WatchError {
  const isDenied = error.code === 'NOT_AUTHORIZED' && !/services disabled/i.test(error.message);
  return { code: isDenied ? PERMISSION_DENIED : POSITION_UNAVAILABLE, message: error.message };
}

/** The same for whatever a rejected call threw: Capacitor's errors carry the plugin's code. */
export function watchErrorOfThrown(error: unknown): WatchError {
  const code = error instanceof Error && 'code' in error ? error.code : undefined;
  return watchErrorOf({
    code: typeof code === 'string' ? code : undefined,
    message: error instanceof Error ? error.message : 'The native watch failed.',
  });
}
