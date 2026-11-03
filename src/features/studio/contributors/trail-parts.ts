import { lineLength, type LngLat } from '@/shared/utils/geo';

import type { ContributionMode, ContributionPart } from '../data/contribution-events';
import type { TrailPoint } from '../data/contributions-read';

/**
 * A fix less certain than this is too vague to place a ride: the recorder's
 * MAX_ACCURACY_M (routes/model/ride-recording.ts), which a unit check holds
 * equal. Not imported: that would put the recorder's module in the chunk the
 * public page loads.
 */
export const TRAIL_MAX_ACCURACY_M = 50;

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

/** A ride part as route material, with which part of the trail it is. */
export interface RideLine {
  /** Its index among splitTrail's parts: the map draws each part with it. */
  piece: number;
  /** Its accurate fixes, in time order. */
  line: LngLat[];
  lengthM: number;
}

/**
 * Every ride part usable as route material, in time order: only its fixes
 * accurate enough to place the ride (TRAIL_MAX_ACCURACY_M, the rule the
 * upload's own line is made by; the upload already left out impossible jumps).
 * A ride with fewer than two such fixes has no line and is left out.
 */
export function rideLines(pieces: readonly TrailPart[]): RideLine[] {
  return pieces.flatMap((part, piece) => {
    if (part.mode !== 'ride') return [];
    const line = part.points
      .filter((point) => point.accuracyM <= TRAIL_MAX_ACCURACY_M)
      .map((point) => point.at);
    return line.length >= 2 ? [{ piece, line, lengthM: lineLength(line) }] : [];
  });
}

/** The mode at a time: the part holding it, the first before the start, the last after the end. */
export function modeAt(parts: readonly ContributionPart[], time: number): ContributionMode {
  const part = parts.find((p) => time < p.to) ?? parts.at(-1);
  return part?.mode ?? 'ride';
}
