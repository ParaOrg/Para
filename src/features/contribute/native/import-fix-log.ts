import { fixOfRow, rowOfFix, takeWatchedFixes } from '../recording-fixes';
import type { FixRow, Recording } from '../recording-schema';
import { loadFixes, putFixes } from '../recording-store';
import { readFixLog, type FixLog } from './native-fix-log';

/** What importing the native log does to a recording: the rows to store, and the recording after. */
export interface FixLogImport {
  rows: FixRow[];
  recording: Recording;
}

/**
 * The rows the native log adds to a recording whose stored rows are `stored`, and the recording as
 * it then stands. A fix at or before the last stored one is skipped, so importing twice adds
 * nothing. A recording already stopped takes only the fixes up to its Stop. One still recording
 * is checked for coming back to its start, as it is live: it stops at that fix and the ones after
 * it are left out. A log that belongs to another recording adds nothing.
 */
export function fixLogImport(
  recording: Recording,
  log: FixLog,
  stored: readonly FixRow[],
): FixLogImport {
  if (log.recordingId !== recording.id) return { rows: [], recording };
  const last = stored[stored.length - 1];
  const until =
    recording.status === 'stopped' && recording.stoppedAt !== null
      ? recording.stoppedAt
      : undefined;
  const { taken, isBackAtStart } = takeWatchedFixes(
    stored.map(fixOfRow),
    log.fixes,
    recording,
    until,
  );
  const firstSeq = last ? last.seq + 1 : 0;
  const rows = taken.map((fix, index) => rowOfFix(recording.id, firstSeq + index, fix));
  if (!isBackAtStart) return { rows, recording };
  return {
    rows,
    recording: {
      ...recording,
      status: 'stopped',
      stoppedAt: taken[taken.length - 1].time,
      hasAutoStopped: true,
    },
  };
}

/**
 * Stores the fixes the foreground service kept for an open recording that the page has not stored
 * yet, so a ride that Android killed (or that the page slept through) comes back with every fix up
 * to the end (fixLogImport says which). Returns the recording as it now stands, for the caller to
 * store when it changed.
 */
export async function importFixLog(recording: Recording): Promise<Recording> {
  const stored = await loadFixes(recording.id);
  // Only what came after the last stored fix crosses the bridge: a long ride's log is large.
  const log = await readFixLog(stored[stored.length - 1]?.time ?? null);
  if (log.recordingId !== recording.id) return recording;
  const imported = fixLogImport(recording, log, stored);
  await putFixes(imported.rows);
  return imported.recording;
}
