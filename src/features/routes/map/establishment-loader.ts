import type { BackgroundLayerSpecification, MapLibreMap } from 'maplibre-gl';

import type * as Establishments from './establishment-drawing';

/*
 * The establishments' part of the page's opening code, and all of it: a marker layer and two
 * listeners. Everything else, the layers (establishments.ts), their kinds and colours
 * (establishment-kinds.ts) and the markers' glyphs (establishment-images.ts), is one chunk of its
 * own, fetched the first time a design shows them: establishment-drawing.ts is its one way in.
 */

/**
 * Where the establishments go, and the sign that they are wanted: a design whose Location Labels
 * are shown carries it last among its layers (withLocationLabels), drawing nothing itself.
 */
export const ESTABLISHMENT_ANCHOR: BackgroundLayerSpecification = {
  id: 'establishments',
  type: 'background',
  layout: { visibility: 'none' },
};

/** The map image of an establishment's marker, drawn on demand: this, and its glyph's name. */
export const ESTABLISHMENT_IMAGE_PREFIX = 'establishment-';

/**
 * Draws the establishments once a style that wants them arrives, as the page opens or after a
 * switch, and each marker the first time the map asks for it. MapLibre lays the waiting places
 * out again once their image arrives. Once per map.
 */
export function drawEstablishments(map: MapLibreMap): void {
  const later = (draw: (chunk: typeof Establishments) => void) =>
    import('./establishment-drawing')
      .then(draw)
      .catch((error: unknown) => console.warn('The map could not draw its places.', error));
  map.on('styledata', () => {
    if (map.getLayer(ESTABLISHMENT_ANCHOR.id)) later((chunk) => chunk.addEstablishmentLayers(map));
  });
  map.on('styleimagemissing', ({ id }: { id: string }) => {
    if (id.startsWith(ESTABLISHMENT_IMAGE_PREFIX))
      later((chunk) => chunk.addEstablishmentImage(map, id));
  });
}
