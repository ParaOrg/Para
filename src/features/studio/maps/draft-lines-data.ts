import { reviewWayLines } from '../data/review-geometry';
import type { DraftRow } from '../data/review-schema';

/** A draft's directions, as its payload lists them; none when the payload has no list. */
function directionsOf(payload: unknown): unknown[] {
  if (typeof payload !== 'object' || payload === null || !('directions' in payload)) return [];
  return Array.isArray(payload.directions) ? payload.directions : [];
}

/** A direction's id, when the payload gives one: a tap opens that direction, not its sibling. */
function directionIdOf(direction: unknown): string | null {
  if (typeof direction !== 'object' || direction === null || !('id' in direction)) return null;
  return typeof direction.id === 'string' ? direction.id : null;
}

/**
 * Each drawn way of each draft as one line feature carrying its draft's id, and its direction's id
 * when the payload has one, for the map's source.
 */
export function draftLinesData(drafts: readonly DraftRow[]) {
  const features = drafts.flatMap((draft) =>
    directionsOf(draft.payload).flatMap((direction) => {
      const directionId = directionIdOf(direction);
      return reviewWayLines({ directions: [direction] })
        .filter((line) => line.length >= 2)
        .map((line) => ({
          type: 'Feature' as const,
          properties:
            directionId === null ? { draftId: draft.id } : { draftId: draft.id, directionId },
          geometry: { type: 'LineString' as const, coordinates: line.map((point) => [...point]) },
        }));
    }),
  );
  return { type: 'FeatureCollection' as const, features };
}
