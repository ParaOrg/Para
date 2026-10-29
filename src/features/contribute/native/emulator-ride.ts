import { readFixLog } from './native-fix-log';
import { startNativeWatch } from './native-location';
import { fixOfRow, rowOfFix, takeWatchedFixes } from '../recorder/recording-fixes';
import { RECORDING_VERSION, type Recording } from '../storage/recording-schema';
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
 * the log's last fix. Gives up after a minute, and the report then shows what the ride holds.
 */
async function waitForImport(recordingId: string): Promise<void> {
  const giveUpAt = Date.now() + IMPORT_GIVE_UP_MS;
  while (Date.now() < giveUpAt) {
    const log = await readFixLog();
    const rows = await loadFixes(recordingId);
    const logEnd = log.fixes[log.fixes.length - 1]?.timestamp ?? 0;
    if (log.recordingId === recordingId && (rows[rows.length - 1]?.time ?? 0) >= logEnd) return;
    await new Promise((resolve) => setTimeout(resolve, IMPORT_POLL_MS));
  }
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
 * After the test kills the app and opens it again, the page's own load imports the native log; this
 * waits for that (it polls until the ride holds the log's last fix), reports what the ride then holds, and goes on recording.
 */
export async function runEmulatorRide(): Promise<void> {
  const open = (await loadRecordings()).find((recording) => recording.status === 'recording');
  let recording: Recording;
  if (open) {
    recording = open;
    await waitForImport(recording.id);
    say(`imported id=${recording.id} ${await snapshot(recording.id)}`);
  } else {
    recording = {
      version: RECORDING_VERSION,
      id: crypto.randomUUID(),
      status: 'recording',
      startedAt: Date.now(),
      stoppedAt: null,
      savedAt: null,
      gaps: [],
      switches: [],
      marks: [],
      startPointName: '',
      endPointName: '',
      description: '',
      rideKind: null,
    };
    await putRecording(recording);
  }

  const { id: recordingId } = recording;
  const stored = await loadFixes(recordingId);
  const held = stored.map(fixOfRow);
  let nextSeq = stored.length > 0 ? stored[stored.length - 1].seq + 1 : 0;
  await startNativeWatch({
    recordingId,
    onFixes: (watched) => {
      // The recorder's own step (use-recording.ts takeFixes). The scripted ride never switches to
      // the return, so it never comes back to its start; if it did, the report would say so.
      const { taken, isBackAtStart } = takeWatchedFixes(held, watched, recording);
      if (taken.length === 0) return;
      held.push(...taken);
      const rows = taken.map((fix) => rowOfFix(recordingId, nextSeq++, fix));
      putFixes(rows).catch((error: unknown) => say(`write-failed ${String(error)}`));
      if (isBackAtStart) say('error the ride came back to its start');
    },
    onError: (error) => say(`error ${error.message}`),
  });
  say(`${open ? 'resumed' : 'started'} id=${recordingId}`);
  window.setInterval(() => {
    snapshot(recordingId)
      .then((line) => say(`report ${line}`))
      .catch((error: unknown) => say(`report-failed ${String(error)}`));
  }, REPORT_EVERY_MS);
}
