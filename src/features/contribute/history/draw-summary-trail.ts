// The ride's trail on the summary card (draw-ride-summary.ts), drawn as History's sketch draws it.
import { MAP_COLOURS } from '@/design-system/foundation/map-colours';
import type { RecordingTrail } from '@/features/routes/map/recording-trail';
import type { Mode } from '@/features/routes/model/ride-recording';

import { sketchLines } from './trail-sketch-paths';

const GROUND = '#f5f5f5'; // neutral/100
const END_DOT = '#171717'; // neutral/900, the card's ink
/** Room inside the trail's box, so the line and its end dots stay clear of the box's edge. */
const TRAIL_INSET = 48;

/** Each mode's line as the map and History's sketch draw it, thickened for the card's size. */
const LINE_STYLE: Record<Mode, { stroke: string; dash: number[] }> = {
  walk: { stroke: MAP_COLOURS['Map/Trail/lakad'], dash: [10, 26] },
  ride: { stroke: MAP_COLOURS['Map/Trail/sakay'], dash: [] },
};

/** The trail's box on the card, in the card's pixels. */
export interface TrailBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** The ride's trail on the card, on a grey ground, with a dot where it began and one where it ended. */
export function drawTrail(
  ctx: CanvasRenderingContext2D,
  trail: RecordingTrail | null,
  box: TrailBox,
) {
  ctx.fillStyle = GROUND;
  ctx.beginPath();
  ctx.roundRect(box.x, box.y, box.width, box.height, 32);
  ctx.fill();
  // sketchLines keeps a margin sized for History's small picture: inset the box instead.
  const lines = trail
    ? sketchLines(trail, box.width - 2 * TRAIL_INSET, box.height - 2 * TRAIL_INSET)
    : [];
  if (lines.length === 0) return;
  ctx.save();
  ctx.translate(box.x + TRAIL_INSET, box.y + TRAIL_INSET);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 12;
  for (const line of lines) {
    ctx.strokeStyle = LINE_STYLE[line.mode].stroke;
    ctx.setLineDash(LINE_STYLE[line.mode].dash);
    ctx.stroke(new Path2D(line.d));
  }
  ctx.setLineDash([]);
  const start = pathEnds(lines[0].d)?.first;
  const end = pathEnds(lines[lines.length - 1].d)?.last;
  if (start) drawDot(ctx, start, MAP_COLOURS['Map/Trail/sakay']);
  if (end) drawDot(ctx, end, END_DOT);
  ctx.restore();
}

/** A path's first and last points, read back from the `M x y L x y` sketchLines writes. */
export function pathEnds(d: string): { first: [number, number]; last: [number, number] } | null {
  const points = [...d.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)].map(
    (m) => [Number(m[1]), Number(m[2])] as [number, number],
  );
  if (points.length === 0) return null;
  return { first: points[0], last: points[points.length - 1] };
}

/** Where the ride began or ended: a filled dot ringed in white, as Strava marks them. */
function drawDot(ctx: CanvasRenderingContext2D, [x, y]: [number, number], fill: string) {
  ctx.beginPath();
  ctx.arc(x, y, 18, 0, 2 * Math.PI);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, y, 12, 0, 2 * Math.PI);
  ctx.fillStyle = fill;
  ctx.fill();
}
