import { readFixLog, type FixLog } from './native-fix-log';
import { fixOfRow, rowOfFix, takeWatchedFixes } from '../recorder/recording-fixes';
import type { FixRow, Recording } from '../storage/recording-schema';
import { loadFixes, putFixes } from '../storage/recording-store';

/**
 * The rows the native log adds to a recording whose stored rows are `stored`. A fix at or before
 * the last stored one is skipped, so importing twice adds nothing. A recording already stopped
 * takes only the fixes up to its Stop. A log that belongs to another recording adds nothing.
 */
export function fixLogRows(recording: Recording, log: FixLog, stored: readonly FixRow[]): FixRow[] {
  if (log.recordingId !== recording.id) return [];
  const last = stored[stored.length - 1];
  const until =
    recording.status === 'stopped' && recording.stoppedAt !== null
      ? recording.stoppedAt
      : undefined;
  const taken = takeWatchedFixes(stored.map(fixOfRow), log.fixes, until);
  const firstSeq = last ? last.seq + 1 : 0;
  return taken.map((fix, index) => rowOfFix(recording.id, firstSeq + index, fix));
}

/**
 * Stores the fixes the foreground service kept for an open recording that the page has not stored
 * yet, so a ride that Android killed (or that the page slept through) comes back with every fix up
 * to the end (fixLogRows says which).
 */
export async function importFixLog(recording: Recording): Promise<void> {
  const stored = await loadFixes(recording.id);
  // Only what came after the last stored fix crosses the bridge: a long ride's log is large.
  const log = await readFixLog(stored[stored.length - 1]?.time ?? null);
  await putFixes(fixLogRows(recording, log, stored));
}
