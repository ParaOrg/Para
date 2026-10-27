import type { GeoJSONSource, MapLibreMap } from 'maplibre-gl';
import { useEffect, useRef } from 'react';

import { useLayerSwitch } from './layer-switch';
import { applyHidden, layOutOnce } from './layers';
import { useLighting } from './lighting';
import { RESTING_FILTER, RESTING_LAYERS, ROUTES_LINE } from './rail-rest-layers';
import { routesData, unpatched } from './saved-routes-data';
import {
  CASING,
  HIT,
  LIT_LAYERS,
  SELECTED,
  SELECTED_CASING,
  SRC,
  addSavedRoutes,
} from './saved-routes-layers';
import type { Direction, LineStringGeoJSON } from '../model/routes';

/**
 * The saved directions' source and layers on `map`: laid out from `rows` as
 * loaded, the full `lines` read since patched in, the one being edited
 * hidden, and exactly `lit` lit.
 */
export function useSavedRoutesLayers(
  map: MapLibreMap | null,
  rows: readonly Direction[],
  lines: ReadonlyMap<string, LineStringGeoJSON>,
  hiddenDirectionId: string | null | undefined,
  lit: readonly string[],
) {
  // The rows the source was last laid out from, and the full lines patched in
  // since, each by the very array or object handed on: what was sent is not
  // sent again.
  const laidOut = useRef<readonly Direction[] | null>(null);
  const patched = useRef(new Map<string, LineStringGeoJSON>());

  // Added with the rows already in, when they are (the public map's file
  // usually comes in before the basemap's style): laid out in the one
  // worker round trip that adds the source, not an empty one and then
  // the rows. Later rows are the next effect's.
  useEffect(() => {
    if (!map || map.getSource(SRC)) return;
    addSavedRoutes(map, rows);
    laidOut.current = rows;
    patched.current = new Map();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- lays out the rows the source is made with; later rows are the next effect's
  }, [map]);

  // The source is laid out from the rows as loaded — on the public map, the
  // overviews — and a full line read later is patched into it alone
  // (updateData), not the whole source laid out again. New rows lay it all
  // out again, the full lines with it: those are patched in afresh.
  useEffect(() => {
    if (!map) return;
    const src = map.getSource(SRC) as GeoJSONSource | undefined;
    if (!src) return;
    layOutOnce(laidOut, rows, (next) => {
      patched.current = new Map();
      src.setData(routesData(next));
    });
  }, [map, rows]);

  // Only the lines not patched in yet: each arrival would send every line
  // read so far again, and MapLibre would lay out again each tile within any
  // of their bounds (GeoJSONSource.shouldReloadTile).
  //
  // And all of them again whenever the map makes its style afresh: a lost GL
  // context given back, or a basemap switch. MapLibre then builds the source
  // anew from a copy of its data taken at the loss or at setStyle (map.ts),
  // and a patch reaches that data only once the worker has answered it
  // (geojson_source.ts): a line still on its way then, or patched in after,
  // is not in the new source. So the record starts again at 'style.load',
  // and every line read so far goes to the new source. Otherwise such a
  // line would stay drawn as its overview, as only lines not yet patched in
  // are sent.
  useEffect(() => {
    if (!map) return;
    const send = () => {
      const src = map.getSource(SRC) as GeoJSONSource | undefined;
      if (!src || lines.size === 0) return;
      const update = unpatched(patched.current, lines);
      if (update.length > 0) void src.updateData({ update });
    };
    const afresh = () => {
      patched.current = new Map();
      send();
    };
    send();
    map.on('style.load', afresh);
    return () => {
      map.off('style.load', afresh);
    };
  }, [map, rows, lines]);

  // The direction being edited is drawn by the editor; hide the saved copy.
  // Set only once there is one, and once more to show it again
  // (applyHidden): the public map never hides one, and sets no filter.
  const hiddenNow = useRef<string | null>(null);
  useEffect(() => {
    if (!map || !map.getLayer(ROUTES_LINE)) return;
    applyHidden(hiddenNow, hiddenDirectionId, (hidden) => {
      const filter = ['!=', ['get', 'id'], hidden] as const;
      for (const id of [CASING, SELECTED_CASING, SELECTED, HIT]) map.setFilter(id, filter as never);
      // A resting layer keeps its own filter, the line it draws, with the hidden one taken out.
      for (const id of RESTING_LAYERS)
        map.setFilter(id, ['all', RESTING_FILTER[id], filter] as never);
    });
  }, [map, hiddenDirectionId]);

  // The lit copy and its casing, off while nothing is lit, from the start;
  // their GL program compiled by a twin while the map is idle (layer-switch.ts).
  const litSwitch = useLayerSwitch(map, LIT_LAYERS, map !== null);
  useLighting(map, SRC, lit, true, litSwitch);
}
