import { placeMark } from './mark-placement';
import { splitTrail } from './trail-parts';
import type { ContributionDetail } from '../data/contributions-read';

/**
 * The opened upload: its trail in walk and ride parts, a circle per hinto
 * sized by its minutes, and a pin per mark.
 */
export function openedData(detail: ContributionDetail | null) {
  if (!detail) return { type: 'FeatureCollection' as const, features: [] };
  const pieces = splitTrail(detail.trail, detail.parts);
  return {
    type: 'FeatureCollection' as const,
    features: [
      ...pieces.flatMap((piece) => {
        const line = piece.points.map((p) => [...p.at]);
        return line.length >= 2
          ? [
              {
                type: 'Feature' as const,
                properties: { kind: 'trail', mode: piece.mode },
                geometry: { type: 'LineString' as const, coordinates: line },
              },
            ]
          : [];
      }),
      ...detail.hintos.map((h) => ({
        type: 'Feature' as const,
        properties: { kind: 'hinto', minutes: Math.round(h.seconds / 60) },
        geometry: { type: 'Point' as const, coordinates: [...h.at] },
      })),
      ...detail.marks.flatMap((time) => {
        const at = placeMark(detail.trail, time);
        return at
          ? [
              {
                type: 'Feature' as const,
                properties: { kind: 'mark', time },
                geometry: { type: 'Point' as const, coordinates: [...at] },
              },
            ]
          : [];
      }),
    ],
  };
}
