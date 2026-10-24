import type { BackgroundGeolocationPlugin } from '@capacitor-community/background-geolocation';

import { nativePlugin } from './native-app';
import type { WatchedFix, WatchError } from './use-geolocation-watch';

export const RECORDING_NOTIFICATION = {
  title: 'ParaPo is recording',
  message: 'Your route is being recorded. Open ParaPo and tap Stop to finish.',
} as const;

/** What the native watch has done since the app opened, for the spike's panel. */
export interface NativeWatchStats {
  fixCount: number;
  lastFixAt: number | null;
  lastAccuracyM: number | null;
  lastError: string | null;
}

let stats: NativeWatchStats = {
  fixCount: 0,
  lastFixAt: null,
  lastAccuracyM: null,
  lastError: null,
};
const listeners = new Set<() => void>();

function update(next: Partial<NativeWatchStats>): void {
  stats = { ...stats, ...next };
  listeners.forEach((listener) => listener());
}

export function subscribeToNativeWatch(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function readNativeWatchStats(): NativeWatchStats {
  return stats;
}

const PERMISSION_DENIED = 1;
const POSITION_UNAVAILABLE = 2;

/**
 * Starts the plugin's foreground service, which keeps the notification up and the fixes coming
 * with the screen off, and hands each fix to the recorder. Returns the function that stops it.
 * Permissions are asked for by native-permissions.ts first; the plugin asks again for any that
 * are still missing.
 */
export async function startNativeWatch(handlers: {
  onFix: (fix: WatchedFix) => void;
  onError: (error: WatchError) => void;
}): Promise<() => void> {
  const plugin = nativePlugin<BackgroundGeolocationPlugin>('BackgroundGeolocation');
  const id = await plugin.addWatcher(
    {
      backgroundTitle: RECORDING_NOTIFICATION.title,
      backgroundMessage: RECORDING_NOTIFICATION.message,
      requestPermissions: true,
      stale: false,
      distanceFilter: 0,
    },
    (location, error) => {
      if (error) {
        const isDenied = error.code === 'NOT_AUTHORIZED';
        update({ lastError: `${error.code ?? 'ERROR'}: ${error.message}` });
        handlers.onError({
          code: isDenied ? PERMISSION_DENIED : POSITION_UNAVAILABLE,
          message: error.message,
        });
        return;
      }
      if (!location) return;
      const timestamp = location.time ?? Date.now();
      update({
        fixCount: stats.fixCount + 1,
        lastFixAt: timestamp,
        lastAccuracyM: location.accuracy,
        lastError: null,
      });
      handlers.onFix({
        timestamp,
        coords: {
          longitude: location.longitude,
          latitude: location.latitude,
          accuracy: location.accuracy,
        },
      });
    },
  );
  return () => {
    void plugin.removeWatcher({ id });
  };
}
