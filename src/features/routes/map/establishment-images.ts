import type { MapLibreMap } from 'maplibre-gl';

import { MAP_PAINT } from '@/design-system/foundation/map-colours';

import bank from './establishment-icons/maki/bank.svg?raw';
import cafe from './establishment-icons/maki/cafe.svg?raw';
import college from './establishment-icons/maki/college.svg?raw';
import convenience from './establishment-icons/maki/convenience.svg?raw';
import dentist from './establishment-icons/maki/dentist.svg?raw';
import doctor from './establishment-icons/maki/doctor.svg?raw';
import fastFood from './establishment-icons/maki/fast-food.svg?raw';
import fuel from './establishment-icons/maki/fuel.svg?raw';
import grocery from './establishment-icons/maki/grocery.svg?raw';
import hospital from './establishment-icons/maki/hospital.svg?raw';
import jewelryStore from './establishment-icons/maki/jewelry-store.svg?raw';
import laundry from './establishment-icons/maki/laundry.svg?raw';
import lodging from './establishment-icons/maki/lodging.svg?raw';
import pharmacy from './establishment-icons/maki/pharmacy.svg?raw';
import police from './establishment-icons/maki/police.svg?raw';
import restaurant from './establishment-icons/maki/restaurant.svg?raw';
import school from './establishment-icons/maki/school.svg?raw';
import shop from './establishment-icons/maki/shop.svg?raw';
import toilet from './establishment-icons/maki/toilet.svg?raw';
import atm from './establishment-icons/temaki/atm.svg?raw';
import moneyHand from './establishment-icons/temaki/money-hand.svg?raw';
import { FAMILY_COLOUR, familyOfGlyph, type EstablishmentGlyph } from './establishment-kinds';
import { ESTABLISHMENT_IMAGE_PREFIX } from './establishment-loader';

/*
 * The establishments' markers, a chunk of its own, fetched the first time the map asks for one
 * (establishment-loader.ts). A marker is a disc in its family's colour, rimmed in the map's
 * white so it holds on Dark too, with the glyph in white over it. The glyphs are Maki 8.2.0 and
 * Temaki 5.13.0 (the ATM and money in hand), both CC0, kept as their projects ship them, each with its licence.
 */

const GLYPHS: Record<EstablishmentGlyph, string> = {
  restaurant,
  'fast-food': fastFood,
  cafe,
  shop,
  grocery,
  convenience,
  atm,
  bank,
  pharmacy,
  hospital,
  doctor,
  dentist,
  college,
  school,
  fuel,
  laundry,
  lodging,
  toilet,
  police,
  'jewelry-store': jewelryStore,
  'money-hand': moneyHand,
};

/** The marker's size in CSS pixels: the disc with its rim, and the glyph inside it. */
export const MARKER = { size: 20, rim: 1.5, glyph: 12 } as const;
const SCALE = 2;

/** An SVG's paths and the side of its square view box. Entities in a path (Maki's tabs and line breaks) read as spaces. */
export function glyphPaths(svg: string): { paths: string[]; side: number } {
  const paths = [...svg.matchAll(/\sd="([^"]+)"/g)].map(([, d = '']) =>
    d.replace(/&#x[0-9a-f]+;/gi, ' '),
  );
  const box = /viewBox="[\d.-]+ [\d.-]+ ([\d.]+) [\d.]+"/.exec(svg)?.[1];
  return { paths, side: box ? Number(box) : 15 };
}

/** A glyph's marker as an image, at twice its size for a sharp screen. Drawn on a canvas, so in the browser only. */
export function markerImage(glyph: EstablishmentGlyph): ImageData | null {
  const family = familyOfGlyph(glyph);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = MARKER.size * SCALE;
  const context = canvas.getContext('2d');
  if (!family || !context) return null;
  context.scale(SCALE, SCALE);
  const middle = MARKER.size / 2;
  context.beginPath();
  context.arc(middle, middle, middle, 0, Math.PI * 2);
  context.fillStyle = MAP_PAINT['Paint/casing'];
  context.fill();
  context.beginPath();
  context.arc(middle, middle, middle - MARKER.rim, 0, Math.PI * 2);
  context.fillStyle = FAMILY_COLOUR[family];
  context.fill();
  const { paths, side } = glyphPaths(GLYPHS[glyph]);
  const offset = (MARKER.size - MARKER.glyph) / 2;
  context.translate(offset, offset);
  context.scale(MARKER.glyph / side, MARKER.glyph / side);
  context.fillStyle = MAP_PAINT['Paint/casing'];
  for (const d of paths) context.fill(new Path2D(d));
  return context.getImageData(0, 0, canvas.width, canvas.height);
}

const isGlyph = (name: string): name is EstablishmentGlyph => Object.hasOwn(GLYPHS, name);

/** Gives the map the marker an image id names, unless it has it already or the id is not a marker's. */
export function addEstablishmentImage(
  map: Pick<MapLibreMap, 'hasImage' | 'addImage'>,
  id: string,
): void {
  const glyph = id.slice(ESTABLISHMENT_IMAGE_PREFIX.length);
  if (!id.startsWith(ESTABLISHMENT_IMAGE_PREFIX) || !isGlyph(glyph) || map.hasImage(id)) return;
  const image = markerImage(glyph);
  if (image) map.addImage(id, image, { pixelRatio: SCALE });
}
