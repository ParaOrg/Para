import colour from './basemap-thumbnails/colour.webp';
import fiord from './basemap-thumbnails/fiord.webp';
import monochrome from './basemap-thumbnails/monochrome.webp';

/*
 * The Map Style card's pictures of the public map's designs (Figma 4179:10790),
 * by the id the device remembers. Each is the design itself over the Pasig at
 * Quinta Market, where the Figma frame shows it, cropped at z14 and kept at
 * 176 px, twice its 88 px tile. Fresh crops, not Figma's, so Colour shows its
 * Apple palette. Apart from basemap.ts, which Node's unit checks import and which
 * cannot import a picture.
 */
export const BASEMAP_THUMBNAILS: Readonly<Record<string, string>> = {
  positron: monochrome,
  liberty: colour,
  fiord,
};
