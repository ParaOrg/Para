import { MAP_COLOURS } from '@/design-system/foundation/map-colours';
import type { RecordingTrail } from '@/features/routes/map/recording-trail';
import type { Mode } from '@/features/routes/model/ride-recording';

import type { RideSummary } from './ride-summary';
import { sketchLines } from './trail-sketch-paths';

/** A portrait 4:5 picture, the size feeds and stories crop least. */
export const CARD_WIDTH = 1080;
export const CARD_HEIGHT = 1350;

const PAD = 72;
const FONT = "'SN Pro', system-ui, sans-serif";
const BRAND = '#4900be'; // parabrand/800, as Map/RouteLine/surface-selected
const INK = '#171717'; // neutral/900
const MUTED = '#737373'; // neutral/500
const GROUND = '#f5f5f5'; // neutral/100
/** The trail's box on the card, under the brand band. */
const TRAIL = { x: PAD, y: 180, width: CARD_WIDTH - 2 * PAD, height: 620 };
/** Room inside the trail's box, so the line and its end dots stay clear of the box's edge. */
const TRAIL_INSET = 48;

/** Each mode's line as the map and History's sketch draw it, thickened for the card's size. */
const LINE_STYLE: Record<Mode, { stroke: string; dash: number[] }> = {
  walk: { stroke: MAP_COLOURS['Map/Trail/lakad'], dash: [10, 26] },
  ride: { stroke: MAP_COLOURS['Map/Trail/sakay'], dash: [] },
};

/**
 * Text broken into lines no wider than `width`, at most `max` of them, the last cut short with an
 * ellipsis when the words run on. `measure` is the canvas's measureText width, passed in so the
 * breaking can be tested without a canvas.
 */
export function wrapLines(
  text: string,
  width: number,
  max: number,
  measure: (line: string) => number,
): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (measure(next) <= width || !line) {
      line = next;
      continue;
    }
    lines.push(line);
    line = word;
  }
  if (line) lines.push(line);
  if (lines.length <= max) return lines;
  const kept = lines.slice(0, max);
  let last = kept[max - 1];
  while (last && measure(`${last}…`) > width) last = last.slice(0, -1).trimEnd();
  kept[max - 1] = `${last}…`;
  return kept;
}

function drawTrail(ctx: CanvasRenderingContext2D, trail: RecordingTrail | null) {
  ctx.fillStyle = GROUND;
  ctx.beginPath();
  ctx.roundRect(TRAIL.x, TRAIL.y, TRAIL.width, TRAIL.height, 32);
  ctx.fill();
  // sketchLines keeps a margin sized for History's small picture: inset the box instead.
  const lines = trail
    ? sketchLines(trail, TRAIL.width - 2 * TRAIL_INSET, TRAIL.height - 2 * TRAIL_INSET)
    : [];
  if (lines.length === 0) return;
  ctx.save();
  ctx.translate(TRAIL.x + TRAIL_INSET, TRAIL.y + TRAIL_INSET);
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
  if (end) drawDot(ctx, end, INK);
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

/**
 * One of the figures under the names: its value large, its label small above it, both squeezed
 * into `width` when longer (`UV Express` is wider than its third of the card).
 */
function drawFigure(
  ctx: CanvasRenderingContext2D,
  x: number,
  width: number,
  label: string,
  value: string,
) {
  ctx.fillStyle = MUTED;
  ctx.font = `500 32px ${FONT}`;
  ctx.fillText(label, x, 1085, width);
  ctx.fillStyle = INK;
  ctx.font = `700 64px ${FONT}`;
  ctx.fillText(value, x, 1160, width);
}

/**
 * The ride's summary card drawn on a CARD_WIDTH by CARD_HEIGHT canvas: the Para band, the whole
 * trail on a plain ground, where it began and went, then distance, time and vehicle, and the day.
 * Its fonts must be loaded first (loadSummaryFonts), or the canvas draws in the fallback.
 */
export function drawRideSummary(
  ctx: CanvasRenderingContext2D,
  summary: RideSummary,
  trail: RecordingTrail | null,
) {
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  ctx.fillStyle = BRAND;
  ctx.fillRect(0, 0, CARD_WIDTH, 132);
  ctx.fillStyle = '#ffffff';
  ctx.font = `800 56px ${FONT}`;
  ctx.fillText('Para', PAD, 86);
  ctx.font = `500 32px ${FONT}`;
  ctx.textAlign = 'right';
  ctx.fillText('Ride summary', CARD_WIDTH - PAD, 82);
  ctx.textAlign = 'left';

  drawTrail(ctx, trail);

  const width = CARD_WIDTH - 2 * PAD;
  ctx.fillStyle = INK;
  ctx.font = `700 60px ${FONT}`;
  const title = wrapLines(
    summary.title,
    width,
    summary.to ? 1 : 2,
    (s) => ctx.measureText(s).width,
  );
  title.forEach((line, index) => ctx.fillText(line, PAD, 885 + index * 70));
  if (summary.to) {
    ctx.fillStyle = MUTED;
    ctx.font = `500 44px ${FONT}`;
    const [to] = wrapLines(`→ ${summary.to}`, width, 1, (s) => ctx.measureText(s).width);
    ctx.fillText(to, PAD, 955);
  }

  const column = width / 3;
  // A gap between figures, none after the last: it may run to the card's margin.
  const figure = column - 24;
  if (summary.distance) {
    const { value, unit } = summary.distance;
    drawFigure(ctx, PAD, figure, 'Distance', `${value} ${unit}`);
  }
  drawFigure(ctx, PAD + column, figure, 'Time', summary.time);
  if (summary.mode) drawFigure(ctx, PAD + 2 * column, column, 'Mode', summary.mode);

  ctx.fillStyle = MUTED;
  ctx.font = `500 32px ${FONT}`;
  ctx.fillText(summary.date, PAD, CARD_HEIGHT - 56);
  ctx.textAlign = 'right';
  ctx.fillText('Mapped with Para', CARD_WIDTH - PAD, CARD_HEIGHT - 56);
  ctx.textAlign = 'left';
}

/** The weights the card draws in, loaded before drawing so the canvas does not fall back. */
export async function loadSummaryFonts(): Promise<void> {
  await Promise.all(
    ['500', '700', '800'].map((weight) => document.fonts.load(`${weight} 32px 'SN Pro'`)),
  ).catch(() => undefined);
}

/** The card as a PNG, drawn on a canvas of its own. */
export async function rideSummaryPng(
  summary: RideSummary,
  trail: RecordingTrail | null,
): Promise<Blob> {
  await loadSummaryFonts();
  const canvas = document.createElement('canvas');
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No 2D canvas on this browser.');
  drawRideSummary(ctx, summary, trail);
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('The card could not be drawn.'))),
      'image/png',
    ),
  );
}
