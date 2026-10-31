import { readFixLog } from './native-fix-log';
import { startNativeWatch } from './native-location';
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
 * the log's last fix, as read in the same look. True once it does; false when it gives up after a
 * minute, and the report then shows what the ride holds. The service goes on writing meanwhile, so
 * a count read later may be a fix ahead of the ride: this answer is the one the test reads.
 */
async function waitForImport(recordingId: string): Promise<boolean> {
  const giveUpAt = Date.now() + IMPORT_GIVE_UP_MS;
  while (Date.now() < giveUpAt) {
    const log = await readFixLog();
    const rows = await loadFixes(recordingId);
    const logEnd = log.fixes[log.fixes.length - 1]?.timestamp ?? 0;
    if (log.recordingId === recordingId && (rows[rows.length - 1]?.time ?? 0) >= logEnd) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, IMPORT_POLL_MS));
  }
  return false;
}

async function snapshot(recordingId: string): Promise<string> {
  const rows = await loadFixes(recordingId);
  const times = rows.map((row) => row.time);
  const sorted = times.every((time, index) => index === 0 || time > times[index - 1]);
  const log = await readFixLog();
  return `rows=${rows.length} first=${times[0] ?? 0} last=${times[times.length - 1] ?? 0} sorted=${sorted} native=${log.fixes.length}`;
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
  say(`${open ? 'resumed' : 'watching'} id=${recordingId}`);
  window.setInterval(() => {
    snapshot(recordingId)
      .then((line) => say(`report ${line}`))
      .catch((error: unknown) => say(`report-failed ${String(error)}`));
  }, REPORT_EVERY_MS);
}
