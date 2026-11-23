import type { MapLibreMap } from 'maplibre-gl';

import { drawEstablishmentExtras } from './establishment-extra';
import { addEstablishmentImage } from './establishment-images';
import { EXTRA_KIND_GLYPH, establishmentImageOf } from './establishment-kinds';
import { addEstablishmentLayers as addBasemapEstablishments } from './establishments';

/*
 * The establishments' chunk, by its one way in (establishment-loader.ts): their layers and their
 * markers, fetched together the first time a design shows them.
 */
export { addEstablishmentImage };

/**
 * Everything a style that wants the establishments gets: the basemap's own places as markers
 * (establishments.ts) and the places its tiles lack, from Para's files (establishment-extra.ts).
 */
export function addEstablishmentLayers(map: MapLibreMap): void {
  addBasemapEstablishments(map);
  for (const glyph of Object.values(EXTRA_KIND_GLYPH))
    addEstablishmentImage(map, establishmentImageOf(glyph));
  drawEstablishmentExtras(map);
}
