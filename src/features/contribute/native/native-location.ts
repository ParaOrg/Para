import type { BackgroundGeolocationPlugin } from '@capacitor-community/background-geolocation';

import { nativePlugin } from '../native-app';
import type { WatchedFix, WatchError } from '../use-geolocation-watch';
import { beginFixLog, NO_ACCURACY_M, readFixLog } from './native-fix-log';

const RECORDING_NOTIFICATION = {
  title: 'ParaPo is recording',
  message: 'Your route is being recorded. Open ParaPo and tap Stop to finish.',
} as const;

const PERMISSION_DENIED = 1;
const POSITION_UNAVAILABLE = 2;

interface NativeWatchHandlers {
  recordingId: string;
  onFixes: (fixes: WatchedFix[]) => void;
  onError: (error: WatchError) => void;
}

/**
 * Starts the foreground service that keeps the notification up and the fixes coming with the
 * screen off, and hands each fix to the recorder. The service's fixes are also written to a
 * native log (FixLog), because Android freezes the page's JavaScript a few minutes after the
 * screen goes off; whenever the page is shown again it reads that log, and the recorder skips the
 * fixes it already holds. Returns the function that stops the watch. The permissions are asked
 * for by start-gate.tsx before Start, so the plugin does not ask again.
 */
export async function startNativeWatch({
  recordingId,
  onFixes,
  onError,
}: NativeWatchHandlers): Promise<() => void> {
  await beginFixLog(recordingId);
  const plugin = nativePlugin<BackgroundGeolocationPlugin>('BackgroundGeolocation');
  const watcherId = await plugin.addWatcher(
    {
      backgroundTitle: RECORDING_NOTIFICATION.title,
      backgroundMessage: RECORDING_NOTIFICATION.message,
      requestPermissions: false,
      stale: false,
      distanceFilter: 0,
    },
    (location, error) => {
      if (error) {
        const isDenied = error.code === 'NOT_AUTHORIZED';
        onError({
          code: isDenied ? PERMISSION_DENIED : POSITION_UNAVAILABLE,
          message: error.message,
        });
        return;
      }
      if (!location) return;
      onFixes([
        {
          timestamp: location.time ?? Date.now(),
          coords: {
            longitude: location.longitude,
            latitude: location.latitude,
            accuracy: location.accuracy ?? NO_ACCURACY_M,
          },
        },
      ]);
    },
  );

  const handleVisibility = () => {
    if (document.visibilityState !== 'visible') return;
    readFixLog()
      .then((log) => {
        if (log.recordingId === recordingId) onFixes(log.fixes);
      })
      .catch((error: unknown) => console.error('The native fix log could not be read.', error));
  };
  document.addEventListener('visibilitychange', handleVisibility);
  return () => {
    document.removeEventListener('visibilitychange', handleVisibility);
    void plugin.removeWatcher({ id: watcherId });
  };
}
