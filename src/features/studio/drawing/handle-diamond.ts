import type { ExpressionSpecification, MapLibreMap } from 'maplibre-gl';

import type { HandleRef } from './curve-handles';

/*
 * A curve's handle while it is held, as a pen tool draws it: its dot, a
 * circle at rest, is a diamond under the press and back to a circle when let
 * go. The diamond is an image the map draws (diamondImage, pure, so
 * tests/unit/handle-diamond-test.mjs can hold it); which handle is held is
 * the two layers' filters (holdHandle), so the drawing itself never changes.
 */

/** The image the held handle's layer draws. */
export const DIAMOND_IMAGE = 'draw-handle-diamond';

/** The held handle's layer: its dot drawn as a diamond. */
export const HANDLE_HELD_LAYER = 'draw-handle-held';

/** Corner to corner, in CSS pixels: a little wider than the dot's 8 px, as a diamond's points need. */
const DIAMOND_PX = 12;

/** The white rim round it, in CSS pixels, as the dot's. */
const RIM_PX = 1;

/** Samples per pixel along each side, for soft edges. */
const SAMPLES = 4;

/** An image as MapLibre's addImage takes one: RGBA bytes, row by row. */
export interface RgbaImage {
  width: number;
  height: number;
  data: Uint8Array;
}

/** `#rrggbb` as red, green and blue, 0–255. */
function rgbOf(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/**
 * A diamond in `fill` with a `rim` round it, `DIAMOND_PX` across, drawn at
 * `pixelRatio` so it stays sharp on a dense screen.
 */
export function diamondImage(fill: string, rim: string, pixelRatio: number): RgbaImage {
  const size = Math.round(DIAMOND_PX * pixelRatio);
  const half = size / 2;
  const inner = half - RIM_PX * pixelRatio;
  const [fr, fg, fb] = rgbOf(fill);
  const [rr, rg, rb] = rgbOf(rim);
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let inFill = 0;
      let inRim = 0;
      for (let sy = 0; sy < SAMPLES; sy++) {
        for (let sx = 0; sx < SAMPLES; sx++) {
          const dx = Math.abs(x + (sx + 0.5) / SAMPLES - half);
          const dy = Math.abs(y + (sy + 0.5) / SAMPLES - half);
          const reach = dx + dy;
          if (reach <= inner) inFill++;
          else if (reach <= half) inRim++;
        }
      }
      const covered = inFill + inRim;
      if (covered === 0) continue;
      const i = (y * size + x) * 4;
      const fillShare = inFill / covered;
      data[i] = Math.round(fr * fillShare + rr * (1 - fillShare));
      data[i + 1] = Math.round(fg * fillShare + rg * (1 - fillShare));
      data[i + 2] = Math.round(fb * fillShare + rb * (1 - fillShare));
      data[i + 3] = Math.round((255 * covered) / (SAMPLES * SAMPLES));
    }
  }
  return { width: size, height: size, data };
}

const IS_POINT: ExpressionSpecification = ['==', ['geometry-type'], 'Point'];

/** Whether a handle feature is `held`'s. */
const isHeld = ({ seg, end }: HandleRef): ExpressionSpecification => [
  'all',
  ['==', ['get', 'seg'], seg],
  ['==', ['get', 'end'], end],
];

/**
 * The handle `held` drawn as a diamond and not as a dot, or (null) every
 * handle a dot again. Only the layers' filters change.
 */
export function holdHandle(map: MapLibreMap, dotLayer: string, held: HandleRef | null): void {
  if (!map.getLayer(dotLayer) || !map.getLayer(HANDLE_HELD_LAYER)) return;
  if (!held) {
    map.setFilter(dotLayer, IS_POINT);
    map.setFilter(HANDLE_HELD_LAYER, ['all', IS_POINT, false]);
    return;
  }
  map.setFilter(dotLayer, ['all', IS_POINT, ['!', isHeld(held)]]);
  map.setFilter(HANDLE_HELD_LAYER, ['all', IS_POINT, isHeld(held)]);
}
