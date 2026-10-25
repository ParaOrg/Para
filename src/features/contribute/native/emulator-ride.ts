import { fixesAfter } from '../recording-fixes';
import { RECORDING_VERSION } from '../recording-schema';
import { loadFixes, loadRecordings, putFixes, putRecording } from '../recording-store';
import { readFixLog } from './native-fix-log';
import { startNativeWatch } from './native-location';

const REPORT_EVERY_MS = 30_000;
/** Long enough for the page's own load (use-recording.ts) to import the native log first. */
const IMPORT_WAIT_MS = 10_000;

/** One line the emulator test reads from logcat. They are `warn` because lint allows no other. */
function say(line: string): void {
  console.warn(`PARAPO_RIDE ${line}`);
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
 * this starts a recording and the native watch with no taps, writing fixes as the recorder does.
 * After the test kills the app and opens it again, the page's own load imports the native log; this
 * waits for that, reports what the ride then holds, and goes on recording.
 */
export async function runEmulatorRide(): Promise<void> {
  const open = (await loadRecordings()).find((recording) => recording.status === 'recording');
  const recordingId = open?.id ?? crypto.randomUUID();
  if (open) {
    await new Promise((resolve) => setTimeout(resolve, IMPORT_WAIT_MS));
    say(`imported id=${recordingId} ${await snapshot(recordingId)}`);
  } else {
    await putRecording({
      version: RECORDING_VERSION,
      id: recordingId,
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
    });
  }

  const stored = await loadFixes(recordingId);
  let lastTime = stored[stored.length - 1]?.time ?? null;
  let nextSeq = stored.length > 0 ? stored[stored.length - 1].seq + 1 : 0;
  await startNativeWatch({
    recordingId,
    onFixes: (watched) => {
      const fresh = fixesAfter(watched, lastTime);
      if (fresh.length === 0) return;
      lastTime = fresh[fresh.length - 1].timestamp;
      const rows = fresh.map((fix) => ({
        recordingId,
        seq: nextSeq++,
        time: fix.timestamp,
        lng: fix.coords.longitude,
        lat: fix.coords.latitude,
        accuracyM: fix.coords.accuracy,
      }));
      putFixes(rows).catch((error: unknown) => say(`write-failed ${String(error)}`));
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
