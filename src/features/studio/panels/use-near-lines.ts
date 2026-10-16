import { useEffect, useState } from 'react';

import { PASS_WITHIN_M } from '@/features/routes/geo/pass';
import { directionLine, type DirectionRow } from '@/features/routes/model/routes';
import { bboxOf, bboxesOverlap, OVERVIEW_M, type LngLat } from '@/shared/utils/geo';

import { linesOf } from '../data/live';

/**
 * Every direction, those an outline at `ring` can reach read in full: the
 * list holds overviews (0009), and a link's sequence is an index into the
 * full line, so they are read before anything is worked out on them. Null
 * until they are in; a failed read is told to `onError`, in the panel's words.
 */
export function useNearLines(
  ring: LngLat[],
  directions: DirectionRow[],
  onError: (message: string) => void,
): DirectionRow[] | null {
  const [lined, setLined] = useState<DirectionRow[] | null>(null);
  useEffect(() => {
    let live = true;
    // Reach: the starts-here distance, the pass rule and the overview's own slack.
    const reach = bboxOf(ring, 100 + PASS_WITHIN_M + OVERVIEW_M);
    const near = directions.filter((v) => {
      const line = directionLine(v);
      return line.length > 1 && bboxesOverlap(bboxOf(line), reach);
    });
    linesOf(near).then(
      (full) => {
        if (!live) return;
        const byId = new Map(full.map((v) => [v.id, v]));
        setLined(directions.map((v) => byId.get(v.id) ?? v));
      },
      (e: unknown) =>
        live &&
        onError(
          `Couldn't read the lines near this outline: ${e instanceof Error ? e.message : String(e)}`,
        ),
    );
    return () => {
      live = false;
    };
  }, [ring, directions, onError]);
  return lined;
}
