import type { RecordingTrail } from '@/features/routes/map/recording-trail';
import type { Mode } from '@/features/routes/model/ride-recording';

/** A run of the trail as an SVG path in the sketch's own pixels. */
export interface SketchLine {
  mode: Mode;
  d: string;
}

/** Room around the trail inside the sketch, in its pixels. */
const MARGIN = 12;

/**
 * The whole trail fitted into a width by height box, north up, as SVG paths: degrees of longitude
 * shrunk by the cosine of the middle latitude so the shape is the one on the map. Empty when the
 * trail has fewer than two points in all.
 */
export function sketchLines(trail: RecordingTrail, width: number, height: number): SketchLine[] {
  const runs = trail.lines.filter((line) => line.path.length >= 2);
  const points = runs.flatMap((line) => line.path);
  if (points.length < 2) return [];
  const lats = points.map(([, lat]) => lat);
  const north = Math.max(...lats);
  const south = Math.min(...lats);
  const shrink = Math.cos((((north + south) / 2) * Math.PI) / 180);
  const xs = points.map(([lng]) => lng * shrink);
  const west = Math.min(...xs);
  const spanX = Math.max(...xs) - west;
  const spanY = north - south;
  // A trail that never moved has no span: any scale draws it as the one point it is.
  const scale = Math.min(
    spanX > 0 ? (width - 2 * MARGIN) / spanX : Infinity,
    spanY > 0 ? (height - 2 * MARGIN) / spanY : Infinity,
  );
  const fit = Number.isFinite(scale) ? scale : 0;
  const left = (width - spanX * fit) / 2;
  const top = (height - spanY * fit) / 2;
  const at = (n: number) => Math.round(n * 10) / 10;
  return runs.map((line) => ({
    mode: line.mode,
    d: line.path
      .map(([lng, lat], index) => {
        const x = left + (lng * shrink - west) * fit;
        const y = top + (north - lat) * fit;
        return `${index === 0 ? 'M' : 'L'}${at(x)} ${at(y)}`;
      })
      .join(''),
  }));
}
