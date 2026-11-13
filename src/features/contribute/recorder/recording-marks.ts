import type { Fix } from '@/features/routes/model/ride-recording';

import { UPLOAD_LIMITS } from './recording-limits';
import type { MarkRow, Recording } from '../storage/recording-schema';

/** Most marks one ride keeps, so a start, a stop, a save and the mode switches still fit the upload's events. */
export const MAX_MARKS = 200;

/** The marks with one more at `time`, or the same marks once the ride holds the most. */
export function withMark(marks: MarkRow[], time: number): MarkRow[] {
  return marks.length >= MAX_MARKS ? marks : [...marks, { time }];
}

/** The longest note a flagged stop keeps, so a ride full of flags still fits one upload. */
export const NOTE_MAX_LENGTH = 200;

/** A note as it is kept: trimmed, and no longer than NOTE_MAX_LENGTH. */
export const keptNote = (note: string): string => note.trim().slice(0, NOTE_MAX_LENGTH);

/**
 * The recording with the note of its mark at `index` set, or taken off when the note is empty.
 * Marks are only ever added at the end, so a mark's index never changes. Null when there is no
 * such mark.
 */
export function notedRecording(
  recording: Recording,
  index: number,
  note: string,
): Recording | null {
  const marks = recording.marks ?? [];
  const mark = marks.at(index);
  if (index < 0 || mark === undefined) return null;
  const kept = keptNote(note);
  const noted: MarkRow = kept === '' ? { time: mark.time } : { time: mark.time, note: kept };
  return { ...recording, marks: marks.map((each, at) => (at === index ? noted : each)) };
}

/** A mark as the upload's events carry it, its note only when it has one. */
export function markEvent(mark: MarkRow): { time: number; kind: 'mark'; note?: string } {
  return mark.note
    ? { time: mark.time, kind: 'mark', note: mark.note }
    : { time: mark.time, kind: 'mark' };
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

/**
 * The marks that fit in the upload's events beside `taken` others (the start, the
 * stop, the save and every switch), earliest first. The others always go in whole.
 */
export function marksThatFit(marks: readonly MarkRow[], taken: number): readonly MarkRow[] {
  return marks.slice(0, Math.max(0, UPLOAD_LIMITS.listEntries - taken));
}
