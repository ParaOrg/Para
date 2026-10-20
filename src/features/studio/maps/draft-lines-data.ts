import { reviewWayLines } from '../data/review-geometry';
import type { DraftRow } from '../data/review-schema';

/** Each drawn way of each draft as one line feature carrying its draft's id, for the map's source. */
export function draftLinesData(drafts: readonly DraftRow[]) {
  const features = drafts.flatMap((draft) =>
    reviewWayLines(draft.payload)
      .filter((line) => line.length >= 2)
      .map((line) => ({
        type: 'Feature' as const,
        properties: { draftId: draft.id },
        geometry: { type: 'LineString' as const, coordinates: line.map((point) => [...point]) },
      })),
  );
  return { type: 'FeatureCollection' as const, features };
}
