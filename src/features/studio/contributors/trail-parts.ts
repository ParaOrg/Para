import { lineLength } from '@/shared/utils/geo';

import type { ContributionMode, ContributionPart } from '../data/contribution-events';
import type { TrailPoint } from '../data/contributions-read';

/** The trail's points in one part: a walk or a ride, in time order. */
export interface TrailPart {
  mode: ContributionMode;
  points: TrailPoint[];
}

/**
 * The trail cut into its walk and ride parts by the points' times. A point
 * before the first part belongs to it, one after the last to the last. Each
 * part ends on the next one's first point, where the mode changed, so the
 * parts join with no gap. A part no point fell in is left out, and the
 * stretches either side of it, both of the other mode, join.
 */
export function splitTrail(
  trail: readonly TrailPoint[],
  parts: readonly ContributionPart[],
): TrailPart[] {
  const pieces: TrailPart[] = [];
  let index = 0;
  for (const point of trail) {
    while (index < parts.length - 1 && point.time >= (parts[index]?.to ?? Infinity)) index += 1;
    const mode = parts[index]?.mode ?? 'ride';
    const last = pieces.at(-1);
    if (last?.mode === mode) {
      last.points.push(point);
      continue;
    }
    last?.points.push(point);
    pieces.push({ mode, points: [point] });
  }
  return pieces;
}

/** How far a part's points run, in metres. */
export const partLength = (part: TrailPart): number => lineLength(part.points.map((p) => p.at));

/** The longest ride part with a line (two points or more): what becomes route material. */
export function longestRide(pieces: readonly TrailPart[]): TrailPart | null {
  return pieces
    .filter((part) => part.mode === 'ride' && part.points.length >= 2)
    .reduce<TrailPart | null>(
      (best, part) => (best && partLength(best) >= partLength(part) ? best : part),
      null,
    );
}

/** The mode at a time: the part holding it, the first before the start, the last after the end. */
export function modeAt(parts: readonly ContributionPart[], time: number): ContributionMode {
  const part = parts.find((p) => time < p.to) ?? parts.at(-1);
  return part?.mode ?? 'ride';
}
