import type { GeoJSONSource, MapLibreMap } from 'maplibre-gl';
import { useEffect, useRef } from 'react';

import { boxState, type BoxMark } from './hotspots-shown';
import { useLayerSwitch } from './layer-switch';
import { applyHidden, layOutOnce } from './layers';
import { hotspotsData } from './saved-hotspots-data';
import {
  HATCH_LAYERS,
  FILL,
  SIBLING_LAYERS,
  SIBLINGS,
  SRC,
  WASH_SRC,
  addSavedHotspots,
  hiddenHotspotFilters,
} from './saved-hotspots-layers';
import { maskStations } from './station-mask';
import { ringToPolygon, type Ring } from '../geo/ring';
import type { Hotspot } from '../model/hotspots';

/**
 * The saved hotspots' sources and layers on `map`: laid out from `hotspots`, the
 * one being edited hidden, each box marked as `marks` says (hotspots-shown.ts),
 * and the place wash over `hull`.
 */
export function useSavedHotspotsLayers(
  map: MapLibreMap | null,
  hotspots: readonly Hotspot[],
  hiddenHotspotId: string | null | undefined,
  marks: ReadonlyMap<string, BoxMark>,
  hull: Ring,
) {
  // The hotspots the source was last laid out from: added with them when they are already in,
  // laid out in the one worker round trip that adds the source rather
  // than an empty one and then the hotspots; later ones are the next
  // effect's, and the same ones are not laid out twice.
  const laidOut = useRef<readonly Hotspot[] | null>(null);
  useEffect(() => {
    if (!map || map.getSource(SRC)) return;
    addSavedHotspots(map, hotspots);
    maskStations(map, hotspots);
    laidOut.current = hotspots;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- lays out the hotspots the source is made with; later ones are the next effect's
  }, [map]);

  useEffect(() => {
    if (!map) return;
    const src = map.getSource(SRC) as GeoJSONSource | undefined;
    if (!src) return;
    layOutOnce(laidOut, hotspots, (next) => {
      src.setData(hotspotsData(next));
      // The basemap's stations beside ours, hidden (station-mask.ts).
      maskStations(map, next);
    });
  }, [map, hotspots]);

  // What a tap did to each box, as feature state: lit (chosen, or under the
  // tap while the sheet asks), the chosen one, and its siblings — nothing
  // while muted. Only the boxes whose state changed are set, and none is ever
  // removed: a removal and a set of one id in the same frame leave the
  // removal in charge.
  // The siblings' and the stripes' layers are off while no box is either,
  // from the start, and switched here with the feature state; their GL
  // programs compiled by twins while the map is idle (layer-switch.ts).
  const was = useRef<ReadonlyMap<string, BoxMark>>(new Map());
  const siblingSwitch = useLayerSwitch(map, SIBLING_LAYERS, map !== null);
  const hatchSwitch = useLayerSwitch(map, HATCH_LAYERS, map !== null);
  useEffect(() => {
    if (!map || !map.getSource(SRC)) return;
    for (const id of new Set([...was.current.keys(), ...marks.keys()])) {
      const state = marks.get(id);
      if (was.current.get(id) === state) continue;
      map.setFeatureState({ source: SRC, id }, boxState(state));
    }
    was.current = marks;
    const states = [...marks.values()].map(boxState);
    siblingSwitch.set(
      map,
      states.some((s) => s.sibling),
    );
    hatchSwitch.set(
      map,
      states.some((s) => s.lit),
    );
  }, [map, marks, siblingSwitch, hatchSwitch]);

  // The place highlight's wash: a hull over the chosen box and its siblings.
  useEffect(() => {
    if (!map || !map.getLayer(SIBLINGS)) return;
    const wash = map.getSource(WASH_SRC) as GeoJSONSource | undefined;
    wash?.setData({
      type: 'FeatureCollection',
      features:
        hull.length >= 3
          ? [{ type: 'Feature', properties: {}, geometry: ringToPolygon(hull) }]
          : [],
    });
  }, [map, hull]);

  // The hotspot being edited is drawn by the editor; hide the saved copy.
  // Set only once there is one, and once more to show it again
  // (applyHidden): the public map never hides one, and sets no filter.
  const hiddenNow = useRef<string | null>(null);
  useEffect(() => {
    if (!map || !map.getLayer(FILL)) return;
    applyHidden(hiddenNow, hiddenHotspotId, (hidden) => {
      for (const [id, filter] of hiddenHotspotFilters(hidden)) map.setFilter(id, filter as never);
    });
  }, [map, hiddenHotspotId]);
}
