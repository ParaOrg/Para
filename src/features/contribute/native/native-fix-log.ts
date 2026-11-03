import { lazyPlugin } from '../native-bridge/native-app';
import {
  fixLineSchema,
  fixLogSchema,
  NO_ACCURACY_M,
  PLUGIN_NAMES,
  type WatchedFix,
} from '../native-bridge/native-contract';

export interface FixLog {
  recordingId: string | null;
  fixes: WatchedFix[];
}

/**
 * What the plugin returned, as a log. A fix that does not read is left out and said: one bad line
 * must not lose the ride.
 */
export function parseFixLog(raw: unknown): FixLog {
  const log = fixLogSchema.parse(raw);
  const fixes: WatchedFix[] = [];
  for (const item of log.fixes) {
    const read = fixLineSchema.safeParse(item);
    if (!read.success) {
      console.warn('A fix in the native log could not be read and was left out.', read.error);
      continue;
    }
    const fix = read.data;
    fixes.push({
      timestamp: fix.time,
      coords: { longitude: fix.lng, latitude: fix.lat, accuracy: fix.accuracyM ?? NO_ACCURACY_M },
    });
  }
  return { recordingId: log.recordingId, fixes };
}

interface FixLogPlugin {
  begin: (options: { recordingId: string }) => Promise<void>;
  read: (options: { after?: number }) => Promise<unknown>;
  end: (options: { time: number }) => Promise<void>;
  clear: () => Promise<void>;
}

const getPlugin = lazyPlugin<FixLogPlugin>(PLUGIN_NAMES.fixLog);

/** Starts the native fix log for a recording: the fixes the foreground service reports are kept. */
export function beginFixLog(recordingId: string): Promise<void> {
  return getPlugin().begin({ recordingId });
}

/**
 * The fixes the service kept for the recording being logged, in order, whether or not the page
 * was awake to hear them; with `after`, only those after that time. Null recording id when nothing
 * is being logged.
 */
export async function readFixLog(after: number | null = null): Promise<FixLog> {
  return parseFixLog(await getPlugin().read(fixLogReadOptions(after)));
}

/**
 * What the plugin is asked for. Java reads `after` as a whole number only, so it is rounded down:
 * at worst one fix the recorder holds comes again, and the recorder skips it.
 */
export function fixLogReadOptions(after: number | null): { after?: number } {
  return after === null ? {} : { after: Math.floor(after) };
}

/** Ends the log at a Stop: fixes after `time` are dropped and none are taken until begin. */
export function endFixLog(time: number): Promise<void> {
  return getPlugin().end({ time });
}

/** Stops the log and forgets its fixes, once the recording is saved or cancelled. */
export function clearFixLog(): Promise<void> {
  return getPlugin().clear();
}
