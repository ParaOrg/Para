import { createFixCatchUp } from './fix-catch-up';
import { beginFixLog, readFixLog } from './native-fix-log';
import { noteRideWatch } from './ride-notice';
import { watchErrorOfRideProblem, watchErrorOfThrown } from './watch-error';
import { lazyPlugin } from '../native-bridge/native-app';
import {
  fixLineSchema,
  NO_ACCURACY_M,
  PLUGIN_NAMES,
  RIDE_FIX_EVENT_NAME,
  RIDE_FIX_PROBLEM_EVENT_NAME,
  rideFixProblemSchema,
  type WatchedFix,
  type WatchError,
} from '../native-bridge/native-contract';

interface NativeWatchHandlers {
  recordingId: string;
  onFixes: (fixes: WatchedFix[]) => void;
  onError: (error: WatchError) => void;
}

interface Listening {
  remove: () => Promise<void>;
}

interface RideRecordingPlugin {
  startRecording: (options: { recordingId: string }) => Promise<void>;
  stopRecording: () => Promise<void>;
  addListener: (
    event: typeof RIDE_FIX_EVENT_NAME | typeof RIDE_FIX_PROBLEM_EVENT_NAME,
    listener: (data: unknown) => void,
  ) => Promise<Listening>;
}

const getPlugin = lazyPlugin<RideRecordingPlugin>(PLUGIN_NAMES.ride);

/**
 * Starts the ride's own foreground service (RideService.java), which keeps the notification up and
 * the fixes coming with the screen off and with the app swiped away, and hands each fix to the
 * recorder while the page is there. The service writes every fix to a native log (FixLog) too,
 * because Android freezes the page's JavaScript a few minutes after the screen goes off. The log
 * is read right after the start, whenever the page is shown again and whenever a live fix follows a
 * silence, for the fixes after the last one handed on (fix-catch-up.ts). The recorder skips fixes it
 * already holds. Returns the function that stops the watch, and the service with it. The
 * permissions are asked for by start-gate.tsx before Start.
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

  const plugin = getPlugin();
  const listening: Listening[] = [];
  try {
    // One at a time, each kept as it comes: a second that fails leaves none of the first behind.
    listening.push(
      await plugin.addListener(RIDE_FIX_EVENT_NAME, (data) => {
        const read = fixLineSchema.safeParse(data);
        if (!read.success) {
          console.warn('A fix from the ride could not be read; the log keeps it.', read.error);
          return;
        }
        const fix = read.data;
        handleLive({
          timestamp: fix.time,
          coords: {
            longitude: fix.lng,
            latitude: fix.lat,
            accuracy: fix.accuracyM ?? NO_ACCURACY_M,
          },
        });
      }),
    );
    listening.push(
      await plugin.addListener(RIDE_FIX_PROBLEM_EVENT_NAME, (data) => {
        const read = rideFixProblemSchema.safeParse(data);
        onError(
          read.success
            ? watchErrorOfRideProblem(read.data)
            : watchErrorOfThrown(new Error('The ride could not record.')),
        );
      }),
    );
    await plugin.startRecording({ recordingId });
  } catch (error) {
    for (const handle of listening) void handle.remove();
    onError(watchErrorOfThrown(error));
    return () => undefined;
  }

  // The ride's notification may resume the ride itself while the watch is on (RideNotification).
  noteRideWatch(true);
  const handleVisibility = () => {
    if (document.visibilityState === 'visible') readLog();
  };
  document.addEventListener('visibilitychange', handleVisibility);
  readLog();
  return () => {
    document.removeEventListener('visibilitychange', handleVisibility);
    noteRideWatch(false);
    for (const handle of listening) void handle.remove();
    plugin.stopRecording().catch((error: unknown) => {
      console.warn('The ride could not be stopped; its notification stops it.', error);
    });
  };
}
