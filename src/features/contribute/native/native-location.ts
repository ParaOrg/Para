import type { BackgroundGeolocationPlugin } from '@capacitor-community/background-geolocation';

import { nativePlugin } from '../native-app';
import type { WatchedFix, WatchError } from '../use-geolocation-watch';
import { createFixCatchUp } from './fix-catch-up';
import { beginFixLog, NO_ACCURACY_M, readFixLog } from './native-fix-log';
import { watchErrorOf, watchErrorOfThrown } from './watch-error';

const RECORDING_NOTIFICATION = {
  title: 'Para is recording',
  message: 'Your route is being recorded. Open Para and tap Stop to finish.',
} as const;

interface NativeWatchHandlers {
  recordingId: string;
  onFixes: (fixes: WatchedFix[]) => void;
  onError: (error: WatchError) => void;
}

let plugin: BackgroundGeolocationPlugin | null = null;
const getPlugin = () =>
  (plugin ??= nativePlugin<BackgroundGeolocationPlugin>('BackgroundGeolocation'));

/**
 * Starts the foreground service that keeps the notification up and the fixes coming with the
 * screen off, and hands each fix to the recorder. The service's fixes are also written to a
 * native log (FixLog), because Android freezes the page's JavaScript a few minutes after the
 * screen goes off. The log is read right after the start, whenever the page is shown again and
 * whenever a live fix follows a silence, for the fixes after the last one handed on
 * (fix-catch-up.ts). The recorder skips fixes it already holds. Returns the function that stops
 * the watch. The permissions are asked for by start-gate.tsx before Start, so the plugin does not
 * ask again.
 */
export async function startNativeWatch({
  recordingId,
  onFixes,
  onError,
}: NativeWatchHandlers): Promise<() => void> {
  await beginFixLog(recordingId);
  const { readLog, handleLive } = createFixCatchUp(async (after) => {
    const log = await readFixLog(after);
    return log.recordingId === recordingId ? log.fixes : [];
  }, onFixes);

  let watcherId: string;
  try {
    watcherId = await getPlugin().addWatcher(
      {
        backgroundTitle: RECORDING_NOTIFICATION.title,
        backgroundMessage: RECORDING_NOTIFICATION.message,
        requestPermissions: false,
        stale: false,
        distanceFilter: 0,
      },
      (location, error) => {
        if (error) {
          onError(watchErrorOf(error));
          return;
        }
        if (!location) return;
        handleLive({
          timestamp: location.time ?? Date.now(),
          coords: {
            longitude: location.longitude,
            latitude: location.latitude,
            accuracy: location.accuracy ?? NO_ACCURACY_M,
          },
        });
      },
    );
  } catch (error) {
    onError(watchErrorOfThrown(error));
    return () => undefined;
  }

  const handleVisibility = () => {
    if (document.visibilityState === 'visible') readLog();
  };
  document.addEventListener('visibilitychange', handleVisibility);
  readLog();
  return () => {
    document.removeEventListener('visibilitychange', handleVisibility);
    void getPlugin().removeWatcher({ id: watcherId });
  };
}
