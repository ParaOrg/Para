import { readFixLog } from './native-fix-log';
import { startNativeWatch } from './native-location';
import { setRideNoticeState } from './ride-notice';
import { LIMITS } from '../map/basemap-cache';
import { fixOfRow, rowOfFix, takeWatchedFixes } from '../recorder/recording-fixes';
import { newRecording } from '../recorder/recording-transitions';
import type { Recording } from '../storage/recording-schema';
import { loadFixes, loadRecordings, putFixes, putRecording } from '../storage/recording-store';

const REPORT_EVERY_MS = 30_000;
const IMPORT_POLL_MS = 500;
const IMPORT_GIVE_UP_MS = 60_000;

/** One line the emulator test reads from logcat. They are `warn` because lint allows no other. */
function say(line: string): void {
  console.warn(`PARA_RIDE ${line}`);
}

/**
 * Waits for the page's own load (recorder-opening.ts) to import the native log: until the ride holds
 * every fix the service had kept before this page opened (`performance.timeOrigin`, after the last
 * page was gone). True once it does; false when it gives up after a minute, and the report then
 * shows what the ride holds. The ride's service records on through a rebuilt activity and a reopened
 * app (RideService), so the log keeps growing while the page loads: the fixes after the page opened
 * are the live watch's to take (startNativeWatch), not the opening import's, and are not waited for.
 */
async function waitForImport(recordingId: string): Promise<boolean> {
  const openedAt = performance.timeOrigin;
  const giveUpAt = Date.now() + IMPORT_GIVE_UP_MS;
  while (Date.now() < giveUpAt) {
    const log = await readFixLog();
    const rows = await loadFixes(recordingId);
    const keptBefore = log.fixes.filter((fix) => fix.timestamp <= openedAt);
    const keptEnd = keptBefore[keptBefore.length - 1]?.timestamp ?? 0;
    if (log.recordingId === recordingId && (rows[rows.length - 1]?.time ?? 0) >= keptEnd) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, IMPORT_POLL_MS));
  }
  return false;
}

/**
 * What the app's basemap cache holds (basemap-cache.ts), for emulator-ride.sh: the map loads under
 * the driver's screens as on a phone, so its tiles and files are kept in the WebView's own Cache
 * Storage, or not. `none` where the WebView has no Cache Storage.
 */
async function keptBasemap(): Promise<string> {
  if (typeof caches === 'undefined') return 'tiles=none meta=none';
  const count = async (name: string) => String((await (await caches.open(name)).keys()).length);
  return `tiles=${await count(LIMITS.tiles.name)} meta=${await count(LIMITS.meta.name)}`;
}

async function snapshot(recordingId: string): Promise<string> {
  const rows = await loadFixes(recordingId);
  const times = rows.map((row) => row.time);
  const sorted = times.every((time, index) => index === 0 || time > times[index - 1]);
  const log = await readFixLog();
  return `rows=${rows.length} first=${times[0] ?? 0} last=${times[times.length - 1] ?? 0} sorted=${sorted} native=${log.fixes.length} ${await keptBasemap()}`;
}

/**
 * The emulator ride's driver (.github/workflows/contributor-app.yml, scripts/apk/emulator-ride.sh),
 * in a build made with VITE_EMULATOR_RIDE=1 only: the emulator has no account to sign in with, so
 * this starts a recording and the native watch with no taps, taking fixes through the recorder's own
 * step (takeWatchedFixes) and writing them as the recorder does.
 * After the test rebuilds the activity, or kills the app and opens it again, the page's own load
 * imports the native log; this waits for that (it polls until the ride holds the log's last fix),
 * reports what the ride then holds, and goes on recording.
 */
export async function runEmulatorRide(): Promise<void> {
  const open = (await loadRecordings()).find((recording) => recording.status === 'recording');
  let recording: Recording;
  if (open) {
    recording = open;
    const hasCaughtUp = await waitForImport(recording.id);
    say(`imported id=${recording.id} caught=${hasCaughtUp} ${await snapshot(recording.id)}`);
  } else {
    recording = newRecording(crypto.randomUUID(), Date.now());
    await putRecording(recording);
    // Said as the ride exists, before the watch: an activity rebuilt from here on finds it open.
    say(`started id=${recording.id}`);
  }

  const { id: recordingId } = recording;
  const stored = await loadFixes(recordingId);
  const held = stored.map(fixOfRow);
  let nextSeq = stored.length > 0 ? stored[stored.length - 1].seq + 1 : 0;
  await startNativeWatch({
    recordingId,
    onFixes: (watched) => {
      // The recorder's own step (use-recording.ts takeFixes).
      const taken = takeWatchedFixes(held, watched);
      if (taken.length === 0) return;
      held.push(...taken);
      const rows = taken.map((fix) => rowOfFix(recordingId, nextSeq++, fix));
      putFixes(rows).catch((error: unknown) => say(`write-failed ${String(error)}`));
    },
    onError: (error) => say(`error ${error.message}`),
  });
  // The ride's notification, held as the recorder holds it; its taps are left to the native side,
  // as a page asleep leaves them (scripts/apk/emulator-notification.sh).
  await setRideNoticeState({
    recordingId,
    phase: 'recording',
    mode: 'walk',
    startedAt: recording.startedAt,
    pausedSeconds: 0,
    stoppedAt: null,
  });
  say(`${open ? 'resumed' : 'watching'} id=${recordingId}`);
  window.setInterval(() => {
    snapshot(recordingId)
      .then((line) => say(`report ${line}`))
      .catch((error: unknown) => say(`report-failed ${String(error)}`));
  }, REPORT_EVERY_MS);
}
