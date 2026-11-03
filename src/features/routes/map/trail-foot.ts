import type { MapLibreMap } from 'maplibre-gl';

import { MAP_COLOURS, MAP_PAINT } from '@/design-system/foundation/map-colours';

/** The foot drawn along a walked line. */
export const FOOT_IMAGE = 'recording-trail-foot';

/** The Icon Set's `footsteps` (filled, stroke 2, radius 2, round join), on its 24 px grid. */
const FOOTSTEPS = [
  'M10 16C10.0275 15.1798 9.37001 14.5 8.54937 14.5H5.55105C4.71416 14.5 4.028 15.1636 4 16C4 17.6569 5.34315 19 7 19C8.65685 19 10 17.6569 10 16Z',
  'M10.4246 11.9405C10.186 12.6186 9.5059 13 8.78706 13H5.21302C4.49415 13 3.81401 12.6186 3.57547 11.9405C2.29304 8.29464 3.03655 2 6.99985 2C10.9632 2 11.7071 8.2947 10.4246 11.9405Z',
  'M20.4246 14.9405C20.186 15.6186 19.5059 16 18.7871 16H15.213C14.4941 16 13.814 15.6186 13.5755 14.9405C12.293 11.2946 13.0365 5 16.9998 5C20.9632 5 21.7071 11.2947 20.4246 14.9405Z',
  'M20 19C20 18.1716 19.3284 17.5 18.5 17.5H15.5C14.6716 17.5 14 18.1716 14 19C14 20.6569 15.3431 22 17 22C18.6569 22 20 20.6569 20 19Z',
];
/** The foot's disc, in CSS pixels; drawn at twice that for a sharp screen. */
const FOOT_SIZE = 20;

/**
 * The foot as an image: the footsteps in white on a disc of the walked line's colour with a casing
 * ring, so it reads on the dashes and between them. Drawn on a canvas, so in the browser only.
 */
function footImage(): ImageData | null {
  const size = FOOT_SIZE * 2;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (!context) return null;
  context.beginPath();
  context.arc(size / 2, size / 2, size / 2 - 2, 0, 2 * Math.PI);
  context.fillStyle = MAP_COLOURS['Map/Trail/lakad'];
  context.fill();
  context.lineWidth = 3;
  context.strokeStyle = MAP_PAINT['Paint/casing'];
  context.stroke();
  // The 24 px drawing, unscaled, centred on the disc's 40 image pixels.
  context.translate((size - 24) / 2, (size - 24) / 2);
  context.fillStyle = MAP_PAINT['Paint/casing'];
  for (const path of FOOTSTEPS) context.fill(new Path2D(path));
  return context.getImageData(0, 0, size, size);
}

/** Gives the map the foot image when it has none: on first use, and after a basemap swaps the style. */
export function addFootImage(map: MapLibreMap): void {
  if (map.hasImage(FOOT_IMAGE)) return;
  const image = footImage();
  if (image) map.addImage(FOOT_IMAGE, image, { pixelRatio: 2 });
}
