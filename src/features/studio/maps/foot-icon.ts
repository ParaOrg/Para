/** The name the walk parts' foot is added to the map under. */
export const FOOT_ICON = 'studio-walk-foot';

/** The foot's size in bitmap pixels; drawn at twice its screen size for a sharp screen. */
export const FOOT_SIZE = 24;

/** A sole and four toes, as ellipses on the bitmap: centre x, centre y, radius x, radius y. */
const FOOT_SHAPES: readonly [number, number, number, number][] = [
  [12, 15, 4, 6.5],
  [8.5, 6.5, 1.4, 1.6],
  [11, 5.2, 1.4, 1.6],
  [13.6, 5.4, 1.3, 1.5],
  [15.8, 6.8, 1.2, 1.4],
];
/** The white rim round the foot, in bitmap pixels: it reads on any basemap. */
const RIM = 1.5;
/** Samples per pixel side, for smooth edges. */
const SAMPLES = 4;

const isInside = (x: number, y: number, grow: number): boolean =>
  FOOT_SHAPES.some(
    ([cx, cy, rx, ry]) => ((x - cx) / (rx + grow)) ** 2 + ((y - cy) / (ry + grow)) ** 2 <= 1,
  );

/**
 * The walk parts' foot, toes up: a bitmap MapLibre repeats along a walk's line,
 * in the line's colour with a white rim. Provisional: the owner's file has no
 * walk icon yet.
 */
export function footIcon(hex: string): { width: number; height: number; data: Uint8Array } {
  const foot = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const data = new Uint8Array(FOOT_SIZE * FOOT_SIZE * 4);
  for (let y = 0; y < FOOT_SIZE; y++) {
    for (let x = 0; x < FOOT_SIZE; x++) {
      let footShare = 0;
      let rimShare = 0;
      for (let sy = 0; sy < SAMPLES; sy++) {
        for (let sx = 0; sx < SAMPLES; sx++) {
          const px = x + (sx + 0.5) / SAMPLES;
          const py = y + (sy + 0.5) / SAMPLES;
          if (isInside(px, py, 0)) footShare += 1;
          else if (isInside(px, py, RIM)) rimShare += 1;
        }
      }
      const covered = footShare + rimShare;
      if (covered === 0) continue;
      // Each channel mixes the foot's colour and the rim's white by their shares.
      const rgb = foot.map((c) => Math.round((c * footShare + 255 * rimShare) / covered));
      const alpha = Math.round((covered / SAMPLES ** 2) * 255);
      data.set([...rgb, alpha], (y * FOOT_SIZE + x) * 4);
    }
  }
  return { width: FOOT_SIZE, height: FOOT_SIZE, data };
}
