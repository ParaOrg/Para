import { backAtStartCount, fixesAfter, fixOfRow, fixOfWatched, rowOfFix } from '../recording-fixes';
import type { Recording } from '../recording-schema';
import { loadFixes, putFixes } from '../recording-store';
import { readFixLog } from './native-fix-log';

/**
 * Stores the fixes the foreground service kept for an open recording that the page has not stored
 * yet, so a ride that Android killed (or that the page slept through) comes back with every fix up
 * to the end. Idempotent: a fix at or before the last stored one is skipped. A recording already
 * stopped takes only the fixes up to its Stop. One still recording is checked for coming back to
 * its start, as it is live: it stops at that fix and the ones after it are left out. Returns the
 * recording as it now stands, for the caller to store when it changed; nothing happens when the
 * log belongs to another recording.
 */
export async function importFixLog(recording: Recording): Promise<Recording> {
  const log = await readFixLog();
  if (log.recordingId !== recording.id) return recording;
  const stored = await loadFixes(recording.id);
  const last = stored[stored.length - 1];
  let fresh = fixesAfter(log.fixes, last?.time ?? null).map(fixOfWatched);
  let result = recording;
  if (recording.status === 'stopped' && recording.stoppedAt !== null) {
    const { stoppedAt } = recording;
    fresh = fresh.filter((fix) => fix.time <= stoppedAt);
  } else if (!recording.hasAutoStopped) {
    const count = backAtStartCount(stored.map(fixOfRow), fresh, recording.switches ?? []);
    if (count !== null) {
      fresh = fresh.slice(0, count);
      result = {
        ...recording,
        status: 'stopped',
        stoppedAt: fresh[fresh.length - 1].time,
        hasAutoStopped: true,
      };
    }
  }
  const firstSeq = last ? last.seq + 1 : 0;
  await putFixes(fresh.map((fix, index) => rowOfFix(recording.id, firstSeq + index, fix)));
  return result;
}
