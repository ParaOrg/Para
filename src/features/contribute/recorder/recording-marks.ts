import type { Fix } from '@/features/routes/model/ride-recording';
import type { LngLat } from '@/shared/utils/geo';

import { UPLOAD_LIMITS } from './recording-limits';
import type { MarkRow, Recording } from '../storage/recording-schema';

/** Most marks one ride keeps, so a start, a stop, a save and the mode switches still fit the upload's events. */
export const MAX_MARKS = 200;

/** The marks with one more at `time`, or the same marks once the ride holds the most. */
export function withMark(marks: MarkRow[], time: number): MarkRow[] {
  return marks.length >= MAX_MARKS ? marks : [...marks, { time }];
}

/** A recording with one more mark, and how many it holds now. */
export interface MarkedRecording {
  recording: Recording;
  count: number;
}

/** A running recording with a mark at `time`, or null when it takes no mark: stopped, or full. */
export function markedRecording(recording: Recording, time: number): MarkedRecording | null {
  if (recording.status !== 'recording') return null;
  const marks = recording.marks ?? [];
  const next = withMark(marks, time);
  if (next === marks) return null;
  return { recording: { ...recording, marks: next }, count: next.length };
}

/** The fix each mark sits on: the latest at or before the tap, or the first when the tap came first. */
export function markFixIndexes(kept: readonly Fix[], marks: readonly MarkRow[]): number[] {
  if (kept.length === 0) return [];
  return marks.map((mark) => {
    let low = 0;
    let high = kept.length - 1;
    while (low < high) {
      const middle = Math.ceil((low + high) / 2);
      if (kept[middle].time <= mark.time) low = middle;
      else high = middle - 1;
    }
    return low;
  });
}

/** Where each mark is on the map: the fix it sits on. */
export function markPlaces(kept: readonly Fix[], marks: readonly MarkRow[]): LngLat[] {
  return markFixIndexes(kept, marks).map((index) => kept[index].at);
}

/**
 * The marks that fit in the upload's events beside `taken` others (the start, the
 * stop, the save and every switch), earliest first. The others always go in whole.
 */
export function marksThatFit(marks: readonly MarkRow[], taken: number): readonly MarkRow[] {
  return marks.slice(0, Math.max(0, UPLOAD_LIMITS.listEntries - taken));
}
