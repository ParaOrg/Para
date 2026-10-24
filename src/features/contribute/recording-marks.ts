import type { Fix } from '@/features/routes/model/ride-recording';
import type { LngLat } from '@/shared/utils/geo';

import { UPLOAD_LIMITS } from './recording-limits';
import type { MarkRow } from './recording-schema';

/** Most marks one ride keeps, so a start, a stop, a save and the way switches still fit the upload's events. */
export const MAX_MARKS = 200;

/** The marks with one more at `time`, or the same marks once the ride holds the most. */
export function withMark(marks: MarkRow[], time: number): MarkRow[] {
  return marks.length >= MAX_MARKS ? marks : [...marks, { time }];
}

/** Where each mark is on the map: the latest fix at or before the tap, or the first fix when the tap came first. */
export function markPlaces(kept: readonly Fix[], marks: readonly MarkRow[]): LngLat[] {
  const places: LngLat[] = [];
  for (const mark of marks) {
    let place: Fix | undefined;
    for (const fix of kept) {
      if (fix.time > mark.time) break;
      place = fix;
    }
    const at = (place ?? kept[0])?.at;
    if (at) places.push(at);
  }
  return places;
}

/**
 * The marks that fit in the upload's events beside `taken` others (the start, the
 * stop, the save and every switch), earliest first. The others always go in whole.
 */
export function marksThatFit(marks: readonly MarkRow[], taken: number): readonly MarkRow[] {
  return marks.slice(0, Math.max(0, UPLOAD_LIMITS.listEntries - taken));
}
