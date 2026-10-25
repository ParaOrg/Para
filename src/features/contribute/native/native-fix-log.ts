import * as z from 'zod/mini';

import { nativePlugin } from '../native-app';
import type { WatchedFix } from '../use-geolocation-watch';

/** The accuracy a fix with none gets: far past what the recorder keeps, so it never draws. */
export const NO_ACCURACY_M = 1_000;

const fixLogSchema = z.object({
  recordingId: z.nullable(z.string()),
  fixes: z.array(
    z.object({
      time: z.number(),
      lng: z.number(),
      lat: z.number(),
      accuracyM: z.optional(z.number()),
    }),
  ),
});

interface FixLogPlugin {
  begin: (options: { recordingId: string }) => Promise<void>;
  read: () => Promise<unknown>;
  clear: () => Promise<void>;
}

const getPlugin = () => nativePlugin<FixLogPlugin>('FixLog');

/** Starts the native fix log for a recording: the fixes the foreground service reports are kept. */
export function beginFixLog(recordingId: string): Promise<void> {
  return getPlugin().begin({ recordingId });
}

/**
 * The fixes the service kept for the recording being logged, in order, whether or not the page
 * was awake to hear them. Null recording id when nothing is being logged.
 */
export async function readFixLog(): Promise<{ recordingId: string | null; fixes: WatchedFix[] }> {
  const log = fixLogSchema.parse(await getPlugin().read());
  return {
    recordingId: log.recordingId,
    fixes: log.fixes.map((fix) => ({
      timestamp: fix.time,
      coords: { longitude: fix.lng, latitude: fix.lat, accuracy: fix.accuracyM ?? NO_ACCURACY_M },
    })),
  };
}

/** Stops the log and forgets its fixes, once the recording is saved or cancelled. */
export function clearFixLog(): Promise<void> {
  return getPlugin().clear();
}
