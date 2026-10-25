import type { LngLat } from '@/shared/utils/geo';

import type { TrailPoint } from '../data/contributions-read';

/** Between two fixes further apart than this the phone lost its signal: the ride is not assumed to run straight. */
export const MAX_INTERPOLATION_GAP_MS = 30_000;

/**
 * Where on the ride a mark was pressed, from its time alone. Between two close
 * fixes it is interpolated; before the first or after the last it is clamped
 * to that fix; inside a gap it is the nearer fix. Null when the trail is empty.
 * The trail must be in time order, as decodeTrail returns it.
 */
export function placeMark(trail: readonly TrailPoint[], time: number): LngLat | null {
  const first = trail[0];
  const last = trail.at(-1);
  if (!first || !last) return null;
  if (time <= first.time) return first.at;
  if (time >= last.time) return last.at;
  const nextIndex = trail.findIndex((p) => p.time >= time);
  const next = trail[nextIndex];
  const before = trail[nextIndex - 1];
  if (!next || !before) return last.at;
  if (next.time === time) return next.at;
  const span = next.time - before.time;
  if (span > MAX_INTERPOLATION_GAP_MS) {
    return time - before.time <= next.time - time ? before.at : next.at;
  }
  const t = (time - before.time) / span;
  return [
    before.at[0] + (next.at[0] - before.at[0]) * t,
    before.at[1] + (next.at[1] - before.at[1]) * t,
  ];
}
