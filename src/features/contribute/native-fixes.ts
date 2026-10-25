import { isNativeApp } from './native-app';

/*
 * What the recorder asks of the app's native fix log. The checks sit here, in the page's own code,
 * so the web build drops the native modules behind them (check-build.mjs proves it).
 */

/** Stores the fixes the app's foreground service kept for the recording; nothing on the web. */
export async function importNativeFixes(recordingId: string): Promise<void> {
  if (import.meta.env.MODE !== 'apk' || !isNativeApp()) return;
  const { importFixLog } = await import('./native/import-fix-log');
  await importFixLog(recordingId);
}

/** Stops the native log and forgets its fixes, once the recording is saved or cancelled. */
export async function clearNativeFixes(): Promise<void> {
  if (import.meta.env.MODE !== 'apk' || !isNativeApp()) return;
  const { clearFixLog } = await import('./native/native-fix-log');
  await clearFixLog();
}

/** Whether the screen going off or another app coming up loses nothing the page already holds. */
export function keepsRecordingInBackground(): boolean {
  return import.meta.env.MODE === 'apk' && isNativeApp();
}
