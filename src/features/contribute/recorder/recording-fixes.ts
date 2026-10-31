import type { Fix } from '@/features/routes/model/ride-recording';

import type { WatchedFix } from './use-geolocation-watch';
import type { FixRow } from '../storage/recording-schema';

/**
 * The fixes that come after the last one stored. A fix at or before that time is already in the
 * ride: the app hands over the whole native log whenever the page wakes, and the plugin's queued
 * fixes arrive again after it. The provider's fix times only go forward.
 */
export function fixesAfter(fixes: readonly WatchedFix[], lastTime: number | null): WatchedFix[] {
  const fresh = fixes.filter((fix) => lastTime === null || fix.timestamp > lastTime);
  return fresh.sort((a, b) => a.timestamp - b.timestamp).filter(isNewTime);
}

function isNewTime(fix: WatchedFix, index: number, sorted: WatchedFix[]): boolean {
  return index === 0 || sorted[index - 1].timestamp !== fix.timestamp;
}

/**
 * The one step every fix goes through on its way into a ride: the recorder's live watch, the
 * import of the native log on reopening, and the CI emulator ride. It takes the fixes after the
 * last one held; `until` is a Stop's time, past which none are taken.
 */
export function takeWatchedFixes(
  held: readonly Fix[],
  watched: readonly WatchedFix[],
  until?: number,
): Fix[] {
  const lastTime = held[held.length - 1]?.time ?? null;
  return fixesAfter(watched, lastTime)
    .filter((fix) => until === undefined || fix.timestamp <= until)
    .map(fixOfWatched);
}

export const fixOfRow = (row: FixRow): Fix => ({
  time: row.time,
  at: [row.lng, row.lat],
  accuracyM: row.accuracyM,
});

export const fixOfWatched = (fix: WatchedFix): Fix => ({
  time: fix.timestamp,
  at: [fix.coords.longitude, fix.coords.latitude],
  accuracyM: fix.coords.accuracy,
});

/** The row IndexedDB keeps for a fix, at its place in the recording. */
export const rowOfFix = (recordingId: string, seq: number, fix: Fix): FixRow => ({
  recordingId,
  seq,
  time: fix.time,
  lng: fix.at[0],
  lat: fix.at[1],
  accuracyM: fix.accuracyM,
});
