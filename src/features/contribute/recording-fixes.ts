import { keptFixes, type Fix } from '@/features/routes/model/ride-recording';

import { shouldAutoStop, type WaySwitch } from './recording-rules';
import type { FixRow } from './recording-schema';
import type { WatchedFix } from './use-geolocation-watch';

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
 * How many of the fixes it takes before `isDone` first holds, when it holds for a list and stays
 * true for every longer one (the back-at-start rule does). Null when it never holds. Asks about
 * the whole list once, then halves, so a long batch costs a handful of runs of the rule.
 */
export function firstCountWhere<T>(
  items: readonly T[],
  isDone: (items: readonly T[]) => boolean,
): number | null {
  if (!isDone(items)) return null;
  let low = 1;
  let high = items.length;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (isDone(items.slice(0, middle))) high = middle;
    else low = middle + 1;
  }
  return low;
}

/**
 * How many of the fresh fixes it takes, added to the ones held, for the ride to have come back to
 * its start; null when it has not. The rule stays true once it has fired, so the count is the
 * first fix that fired it and the ones after it are not part of the ride.
 */
export function backAtStartCount(
  held: readonly Fix[],
  fresh: readonly Fix[],
  switches: readonly WaySwitch[],
): number | null {
  return firstCountWhere(fresh, (some) => shouldAutoStop(keptFixes([...held, ...some]), switches));
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
