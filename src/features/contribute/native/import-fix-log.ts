import { fixesAfter } from '../recording-fixes';
import { loadFixes, putFixes } from '../recording-store';
import { readFixLog } from './native-fix-log';

/**
 * Stores the fixes the foreground service kept for a recording that the page has not stored yet,
 * so a ride that Android killed (or that the page slept through) comes back with every fix up to
 * the end. Idempotent: a fix at or before the last stored one is skipped. Nothing happens when the
 * log belongs to another recording.
 */
export async function importFixLog(recordingId: string): Promise<void> {
  const log = await readFixLog();
  if (log.recordingId !== recordingId) return;
  const stored = await loadFixes(recordingId);
  const last = stored[stored.length - 1];
  const fresh = fixesAfter(log.fixes, last?.time ?? null);
  const firstSeq = last ? last.seq + 1 : 0;
  await putFixes(
    fresh.map((fix, index) => ({
      recordingId,
      seq: firstSeq + index,
      time: fix.timestamp,
      lng: fix.coords.longitude,
      lat: fix.coords.latitude,
      accuracyM: fix.coords.accuracy,
    })),
  );
}
