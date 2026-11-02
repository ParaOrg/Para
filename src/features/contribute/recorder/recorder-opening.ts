import { importNativeFixes } from './native-fixes';
import { holdRecorderLock } from './recorder-lock';
import { stoppedRecording } from './recording-transitions';
import { withRideTaps } from './ride-events';
import { dropRideTaps, readRideTaps } from './ride-notice-bridge';
import type { FixRow, Recording } from '../storage/recording-schema';
import { loadFixes, loadRecordings, putRecording } from '../storage/recording-store';

/** What the page finds on this phone as it opens. */
export type RecorderOpening =
  | { kind: 'other-tab' }
  | { kind: 'nothing-open' }
  | {
      kind: 'open';
      recording: Recording;
      rows: FixRow[];
      /** Finished from the app's notification: it opens on its Save form. */
      isFinished: boolean;
    };

interface OpeningSteps {
  /** Whether the page went away meanwhile: then nothing more is read or written. */
  isCancelled: () => boolean;
  /** Hears every recording the phone holds, as soon as they are read. */
  onListed: (all: Recording[]) => void;
  /** Hears that the app's native fix log could not be imported. */
  onNativeLogProblem: (error: unknown) => void;
}

/**
 * Takes the recorder for this tab and reads what the phone holds: the saved recordings, and the
 * one still open with the fixes the app kept for it imported. Null when the page went away
 * meanwhile. Rejects when the phone's storage cannot be read.
 */
export async function openRecorder({
  isCancelled,
  onListed,
  onNativeLogProblem,
}: OpeningSteps): Promise<RecorderOpening | null> {
  const isOurs = await holdRecorderLock();
  const all = await loadRecordings();
  if (isCancelled()) return null;
  onListed(all);
  if (!isOurs) return { kind: 'other-tab' };
  const found = all.find((r) => r.status !== 'saved') ?? null;
  let open = found;
  let isFinished = false;
  if (found) {
    try {
      await importNativeFixes(found);
      const tapped = await applyRideTaps(found);
      open = tapped.recording;
      isFinished = tapped.isFinished;
    } catch (error) {
      onNativeLogProblem(error);
    }
  } else {
    // Taps on a ride the page no longer holds open have nothing to apply to.
    await dropRideTaps(Date.now()).catch(onNativeLogProblem);
  }
  const rows = open ? await loadFixes(open.id) : [];
  if (isCancelled()) return null;
  return open ? { kind: 'open', recording: open, rows, isFinished } : { kind: 'nothing-open' };
}

/**
 * The open ride with the taps made on the app's notification while the page was gone: its
 * switches, its pauses, and the Stop of a pause or a Finish not yet resumed. Stored, then the taps
 * are forgotten.
 */
async function applyRideTaps(
  recording: Recording,
): Promise<{ recording: Recording; isFinished: boolean }> {
  const taps = await readRideTaps(recording.id);
  if (!taps) return { recording, isFinished: false };
  const tapped = withRideTaps(recording, taps);
  const applied =
    tapped.stopAt === null
      ? tapped.recording
      : stoppedRecording(tapped.recording, tapped.stopAt, tapped.recording.failedFixWrites ?? 0);
  await putRecording(applied);
  await dropRideTaps(taps.lastTime);
  return { recording: applied, isFinished: tapped.isFinished };
}
