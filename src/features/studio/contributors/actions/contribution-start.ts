import { simplifyLine, type LngLat } from '@/shared/utils/geo';

/** How a contribution enters the Playground. */
export type ContributionStart =
  | {
      kind: 'direction';
      contributionId: string;
      /** The upload's line, thinned to the control points the router is asked for. */
      points: LngLat[];
      startName: string;
      endName: string;
    }
  | {
      kind: 'hintuan';
      /** The box's first four corners around the hinto. */
      ring: LngLat[];
    };

/** Most control points the router is asked for at once; the public router refuses long requests. */
const MAX_CONTROL_POINTS = 25;
/** How far the thinned line may stray from the upload's, in metres: within a road's width. */
const THIN_TO_M = 30;
/** Half the side of the box a hinto starts, in metres: a stop's own width, to be reshaped by hand. */
const BOX_HALF_SIDE_M = 20;
const M_PER_DEG_LAT = 111_320;

/** The upload's line as control points: thinned, then spread evenly if still too many. Ends always stay. */
export function controlPointsOf(line: readonly LngLat[]): LngLat[] {
  const thin = simplifyLine(line, THIN_TO_M);
  if (thin.length <= MAX_CONTROL_POINTS) return thin;
  const last = thin.length - 1;
  return Array.from(
    { length: MAX_CONTROL_POINTS },
    (_, i) => thin[Math.round((i * last) / (MAX_CONTROL_POINTS - 1))],
  );
}

/** A small square around a hinto, corners in order. */
export function boxAround([lng, lat]: LngLat): LngLat[] {
  const dLat = BOX_HALF_SIDE_M / M_PER_DEG_LAT;
  const dLng = dLat / Math.cos((lat * Math.PI) / 180);
  return [
    [lng - dLng, lat - dLat],
    [lng + dLng, lat - dLat],
    [lng + dLng, lat + dLat],
    [lng - dLng, lat + dLat],
  ];
}
