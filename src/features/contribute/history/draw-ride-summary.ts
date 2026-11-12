import type { RecordingTrail } from '@/features/routes/map/recording-trail';

import { LOGO, loadSummaryFonts, loadWhiteLogo } from './card-assets';
import { drawTrail } from './draw-summary-trail';
import type { RideSummary } from './ride-summary';
import { wrapLines } from './wrap-lines';

/** A portrait 4:5 picture, the size feeds and stories crop least. */
export const CARD_WIDTH = 1080;
export const CARD_HEIGHT = 1350;

const PAD = 72;
const FONT = "'SN Pro', system-ui, sans-serif";
const BRAND = '#4900be'; // parabrand/800, as Map/RouteLine/surface-selected
const INK = '#171717'; // neutral/900
const MUTED = '#737373'; // neutral/500
/** The card on its white ground, or see-through: its words white, for over a story's photo. */
export type CardLook = 'card' | 'see-through';
const LOOKS = {
  card: { ink: INK, muted: MUTED, link: BRAND },
  'see-through': { ink: '#ffffff', muted: '#ffffff', link: '#ffffff' },
} satisfies Record<CardLook, { ink: string; muted: string; link: string }>;
type Colours = (typeof LOOKS)[CardLook];
/** The trail's box on the card, under the brand band. */
const TRAIL = { x: PAD, y: 180, width: CARD_WIDTH - 2 * PAD, height: 620 };
/** A figure under the names: value large, label small above, both squeezed into `width`. */
function drawFigure(
  ctx: CanvasRenderingContext2D,
  x: number,
  width: number,
  label: string,
  value: string,
  colours: Colours,
) {
  ctx.fillStyle = colours.muted;
  ctx.font = `500 32px ${FONT}`;
  ctx.fillText(label, x, 1085, width);
  ctx.fillStyle = colours.ink;
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
  logo: CanvasImageSource | null,
  look: CardLook = 'card',
) {
  const colours = LOOKS[look];
  const isSeeThrough = look === 'see-through';
  ctx.textBaseline = 'alphabetic';
  if (isSeeThrough) {
    // Over whatever photo the story puts under it: a soft shadow keeps the white words readable.
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = 12;
  } else {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
    ctx.fillStyle = BRAND;
    ctx.fillRect(0, 0, CARD_WIDTH, 132);
  }
  ctx.fillStyle = '#ffffff';
  ctx.font = `800 56px ${FONT}`;
  if (logo) ctx.drawImage(logo, PAD, LOGO.y, LOGO.width, LOGO.height);
  else ctx.fillText('Para', PAD, 86);
  ctx.font = `500 32px ${FONT}`;
  ctx.textAlign = 'right';
  ctx.fillText('Ride summary', CARD_WIDTH - PAD, 82);
  ctx.textAlign = 'left';

  drawTrail(ctx, trail, TRAIL, !isSeeThrough);

  const width = CARD_WIDTH - 2 * PAD;
  ctx.fillStyle = colours.ink;
  ctx.font = `700 60px ${FONT}`;
  const title = wrapLines(
    summary.title,
    width,
    summary.to ? 1 : 2,
    (s) => ctx.measureText(s).width,
  );
  title.forEach((line, index) => ctx.fillText(line, PAD, 885 + index * 70));
  if (summary.to) {
    ctx.fillStyle = colours.muted;
    ctx.font = `500 44px ${FONT}`;
    // The arrow is kept out of the wrapping, so a long one-word place is cut and not dropped.
    const room = width - ctx.measureText('→ ').width;
    const [to = ''] = wrapLines(summary.to, room, 1, (s) => ctx.measureText(s).width);
    ctx.fillText(`→ ${to}`, PAD, 955);
  }

  const column = width / 3;
  // A gap between figures, none after the last: it may run to the card's margin.
  const figure = column - 24;
  if (summary.distance) {
    const { value, unit } = summary.distance;
    drawFigure(ctx, PAD, figure, 'Distance', `${value} ${unit}`, colours);
  }
  drawFigure(ctx, PAD + column, figure, 'Time', summary.time, colours);
  if (summary.mode) drawFigure(ctx, PAD + 2 * column, column, 'Mode', summary.mode, colours);

  ctx.fillStyle = colours.muted;
  ctx.font = `500 32px ${FONT}`;
  ctx.fillText(summary.date, PAD, CARD_HEIGHT - 56);
  // Where whoever sees the card gets the app: the download page the posters' QR codes open too.
  ctx.textAlign = 'right';
  ctx.fillStyle = colours.link;
  ctx.fillText('para-commute.org/app', CARD_WIDTH - PAD, CARD_HEIGHT - 56);
  ctx.textAlign = 'left';
}

/** The card as a PNG, drawn on a canvas of its own; see-through, its ground is left clear. */
export async function rideSummaryPng(
  summary: RideSummary,
  trail: RecordingTrail | null,
  look: CardLook = 'card',
): Promise<Blob> {
  const [logo] = await Promise.all([loadWhiteLogo(), loadSummaryFonts()]);
  const canvas = document.createElement('canvas');
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No 2D canvas on this browser.');
  drawRideSummary(ctx, summary, trail, logo, look);
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('The card could not be drawn.'))),
      'image/png',
    ),
  );
}
