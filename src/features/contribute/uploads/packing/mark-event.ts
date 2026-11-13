import type { MarkRow } from '../../storage/recording-schema';

/** A mark as the upload's events carry it, its note only when it has one. */
export function markEvent(mark: MarkRow): { time: number; kind: 'mark'; note?: string } {
  return mark.note
    ? { time: mark.time, kind: 'mark', note: mark.note }
    : { time: mark.time, kind: 'mark' };
}
