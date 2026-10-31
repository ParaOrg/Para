import type { MapLibreMap } from 'maplibre-gl';

import { MAP_COLOURS, MAP_PAINT } from '@/design-system/foundation/map-colours';

/** The pin a flagged stop is drawn as. */
export const FLAG_IMAGE = 'recording-trail-flag';

/** The Icon Set's `falgstop` (Figma's spelling), on its 24 px grid. */
const FLAG =
  'M9.87622 20.25V11.25H15.8816C16.369 11.25 16.7771 11.25 17.0891 11.2315C17.3972 11.2132 17.7352 11.1735 18.0237 11.0273C18.8958 10.5853 19.3348 9.58348 19.0305 8.64356C18.9297 8.3324 18.7134 8.06718 18.509 7.84278C18.2968 7.60979 18.0061 7.32721 17.6524 6.98343L17.6262 6.95801C17.4822 6.81806 17.3961 6.73414 17.3352 6.66797C17.3025 6.63246 17.2873 6.61253 17.2815 6.6045C17.2472 6.53814 17.2472 6.46187 17.2815 6.39551C17.2873 6.3875 17.3025 6.3676 17.3352 6.33204C17.3961 6.26587 17.4822 6.18196 17.6262 6.042L17.6502 6.01866C18.0045 5.67431 18.2966 5.3905 18.509 5.15723C18.7134 4.93283 18.9297 4.66761 19.0305 4.35645C19.3348 3.41653 18.8958 2.41469 18.0237 1.97266C17.7352 1.8265 17.3972 1.78683 17.0891 1.76856C16.7751 1.74995 16.3714 1.74997 15.8799 1.75L9.87622 1.75001L8.62622 1.75C8.21201 1.75 7.87622 2.08579 7.87622 2.5V20.25V21.2501C7.87627 21.7975 8.3163 22.2424 8.86199 22.25H8.89045C9.43614 22.2424 9.87617 21.7975 9.87622 21.2501V20.25Z';

/**
 * Figma's flagstop (4496:18697), in CSS pixels: a head 26 wide and 42 tall, round but for its
 * bottom-left corner, holding the flag 24 across 10 from its top; under that corner, overlapping
 * it by 2, a stem 4 wide and 16 tall, rounded at its foot, which is the pin's point.
 */
const PIN = { width: 26, height: 56, head: 42, stemWidth: 4, stemTop: 40, flagTop: 10 };

/** Where the pin's point is, from the image's bottom-left corner: the stem's middle, at its foot. */
export const FLAG_POINT_X = PIN.stemWidth / 2;

/** The pin as an image, at twice its size for a sharp screen. Drawn on a canvas, so in the browser only. */
function flagImage(): ImageData | null {
  const scale = 2;
  const canvas = document.createElement('canvas');
  canvas.width = PIN.width * scale;
  canvas.height = PIN.height * scale;
  const context = canvas.getContext('2d');
  if (!context) return null;
  context.scale(scale, scale);
  context.fillStyle = MAP_COLOURS['Map/Trail/flag'];
  const round = PIN.width / 2;
  context.beginPath();
  // The head: rounded at its top two corners and its bottom right, square at its bottom left.
  context.roundRect(0, 0, PIN.width, PIN.head, [round, round, round, 0]);
  context.fill();
  context.beginPath();
  context.roundRect(0, PIN.stemTop, PIN.stemWidth, PIN.height - PIN.stemTop, [
    0,
    0,
    PIN.stemWidth / 2,
    PIN.stemWidth / 2,
  ]);
  context.fill();
  context.translate(0, PIN.flagTop);
  context.fillStyle = MAP_PAINT['Paint/casing'];
  context.fill(new Path2D(FLAG));
  return context.getImageData(0, 0, canvas.width, canvas.height);
}

/** Gives the map the pin when it has none: on first use, and after a basemap swaps the style. */
export function addFlagImage(map: MapLibreMap): void {
  if (map.hasImage(FLAG_IMAGE)) return;
  const image = flagImage();
  if (image) map.addImage(FLAG_IMAGE, image, { pixelRatio: 2 });
}
