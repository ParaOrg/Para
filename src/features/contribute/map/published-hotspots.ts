import type { MapLibreMap, MapStyleImageMissingEvent } from 'maplibre-gl';

import { addPinImages, addPinLayer } from '@/features/routes/map/hotspot-pin-images';
import { isPinImage } from '@/features/routes/map/hotspot-pins';
import { TRAIL_SRC } from '@/features/routes/map/recording-trail';
import {
  SRC,
  addSavedHotspots,
  removeSavedHotspots,
} from '@/features/routes/map/saved-hotspots-layers';
import { maskStations } from '@/features/routes/map/station-mask';
import { fetchIndex } from '@/features/routes/published/fetch-index';

import { PUBLISHED_CASING, layerToGoUnder } from './published-routes-layers';

/*
 * The published hotspots behind a recording: every box on the published map, its pin and its
 * name, drawn as the public map draws them at rest, so a contributor sees the terminals and
 * hintuans Para already has. Only a picture: nothing here listens for a tap, so a box, a pin or a
 * dot does nothing when touched.
 */

/** The trail's first layer: the pins and names go under it, so the rider's line stays on top. */
function trailLayer(map: MapLibreMap): string | undefined {
  return map.getLayersOrder().find((id) => map.getLayer(id)?.source === TRAIL_SRC);
}

/**
 * Reads the published index and draws its hotspots on `map`: the boxes under the published
 * routes (as the public map's are under its routes), whether those are drawn yet or come after,
 * and under the basemap's names; the pins and names under the trail. Resolves with what takes
 * them off again; rejects when the index cannot be read, and the map then shows no hotspots.
 */
export async function drawPublishedHotspots(map: MapLibreMap): Promise<() => void> {
  const { hotspots } = await fetchIndex();
  if (map.getSource(SRC)) return () => undefined;

  const marksUnder = trailLayer(map);
  addSavedHotspots(map, hotspots, {
    boxesUnder: map.getLayer(PUBLISHED_CASING) ? PUBLISHED_CASING : layerToGoUnder(map),
    marksUnder,
  });
  addPinLayer(map);
  // The basemap's stations beside ours, hidden, as on the public map (station-mask.ts).
  maskStations(map, hotspots);

  // A basemap switch brings a new style without the pins' images; the map asks again.
  const handleImageMissing = (event: MapStyleImageMissingEvent) => {
    if (isPinImage(event.id)) addPinImages(map);
  };
  map.on('styleimagemissing', handleImageMissing);

  return () => {
    map.off('styleimagemissing', handleImageMissing);
    removeSavedHotspots(map);
    maskStations(map, []);
  };
}
