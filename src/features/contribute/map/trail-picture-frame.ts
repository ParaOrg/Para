import type { RecordingTrail } from '@/features/routes/map/recording-trail';
import { LOW_PX } from '@/shared/ui/sheet-gesture';
import type { LngLat } from '@/shared/utils/geo';

/** History's card picture, in CSS pixels: twice the card's 90 by 120, a 3:4 portrait. */
export const TRAIL_PICTURE = { width: 180, height: 240 } as const;

/** Room around the trail inside the picture, in screen pixels. */
const MARGIN_PX = 16;

/** The box the picture is cut from, in CSS pixels of the map's canvas. */
export interface PictureBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** What fitBounds is given: the trail's corners and the padding that leaves it inside the box. */
export interface TrailFit {
  bounds: [LngLat, LngLat];
  box: PictureBox;
  padding: { top: number; bottom: number; left: number; right: number };
}

/** The corners of the whole trail, every run of it; null with fewer than two points in all. */
export function trailBounds(trail: RecordingTrail): [LngLat, LngLat] | null {
  const points = trail.lines.flatMap((line) => line.path);
  if (points.length < 2) return null;
  let [west, south] = points[0] ?? [0, 0];
  let [east, north] = [west, south];
  for (const [lng, lat] of points) {
    west = Math.min(west, lng);
    east = Math.max(east, lng);
    south = Math.min(south, lat);
    north = Math.max(north, lat);
  }
  return [
    [west, south],
    [east, north],
  ];
}

/**
 * Room left around a ride's trail on its screen (Figma 4558:11792), in screen pixels: under the
 * status bar at the top, beside the map's buttons at the sides, and over the folded sheet, its
 * Low height (LOW_PX), and Back, at the foot.
 */
export const RIDE_FRAME_PADDING = { top: 72, bottom: LOW_PX + 88, left: 32, right: 72 } as const;

/**
 * The whole trail, every run of it, framed in the largest 3:4 box centred on a canvas of the given
 * size, with a margin. Null when there is nothing to frame: fewer than two points in all.
 */
export function trailFit(
  trail: RecordingTrail,
  canvasWidth: number,
  canvasHeight: number,
): TrailFit | null {
  const bounds = trailBounds(trail);
  if (!bounds) return null;
  const ratio = TRAIL_PICTURE.width / TRAIL_PICTURE.height;
  const width = Math.min(canvasWidth, canvasHeight * ratio);
  const height = width / ratio;
  const box = { x: (canvasWidth - width) / 2, y: (canvasHeight - height) / 2, width, height };
  return {
    bounds,
    box,
    padding: {
      top: box.y + MARGIN_PX,
      bottom: box.y + MARGIN_PX,
      left: box.x + MARGIN_PX,
      right: box.x + MARGIN_PX,
    },
  };
}
