import type { WatchedFix } from './use-geolocation-watch';
import { isNativeApp } from '../native-bridge/native-app';
import type { Recording } from '../storage/recording-schema';

/*
 * What the recorder asks of the app's native fix log. The checks sit here, in the page's own code,
 * so the web build drops the native modules behind them (check-build.mjs proves it). The mode
 * check is repeated in each function, not shared: the bundler only drops an import it can see is dead.
 */

/** Stores the fixes the app's foreground service kept for an open recording. Nothing on the web. */
export async function importNativeFixes(recording: Recording): Promise<void> {
  if (import.meta.env.MODE !== 'apk' || !isNativeApp()) return;
  const { importFixLog } = await import('../native/import-fix-log');
  await importFixLog(recording);
}

/**
 * The fixes the service kept for a recording after `after` (the last one the recorder holds, null
 * for all of them), for the recorder to take at a Stop.
 */
export async function readNativeFixes(
  recordingId: string,
  after: number | null,
): Promise<WatchedFix[]> {
  if (import.meta.env.MODE !== 'apk' || !isNativeApp()) return [];
  const { readFixLog } = await import('../native/native-fix-log');
  const log = await readFixLog(after);
  return log.recordingId === recordingId ? log.fixes : [];
}

/** Ends the native log at a Stop: later fixes are dropped and none are taken until Resume. */
export async function endNativeFixes(time: number): Promise<void> {
  if (import.meta.env.MODE !== 'apk' || !isNativeApp()) return;
  const { endFixLog } = await import('../native/native-fix-log');
  await endFixLog(time);
}

/** Stops the native log and forgets its fixes, once the recording is saved or cancelled. */
export async function clearNativeFixes(): Promise<void> {
  if (import.meta.env.MODE !== 'apk' || !isNativeApp()) return;
  const { clearFixLog } = await import('../native/native-fix-log');
  await clearFixLog();
}

/** Whether the screen going off or another app coming up loses nothing the page already holds. */
export function keepsRecordingInBackground(): boolean {
  return import.meta.env.MODE === 'apk' && isNativeApp();
}
