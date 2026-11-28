import type { MapLibreMap } from 'maplibre-gl';

import type { Hotspot } from '@/features/routes/model/hotspots';
import type { DirectionRow } from '@/features/routes/model/routes';
import type { LngLat } from '@/shared/utils/geo';

import type { AddWay } from './add-way';
import { sameWayNotice } from './return-trip-notes';
import { useOldParaRouteStart } from '../old-para-routes/use-old-para-route-start';
import { useOsmRouteStart, type StartableDrawing } from '../osm-routes/use-osm-route-start';

interface UseRouteStartsOptions {
  map: MapLibreMap | null;
  draw: StartableDrawing;
  /** Says something in the Playground's toast. */
  setNotice: (text: string | null) => void;
  /** The saved directions, for the slot's route and its drawn way, and the hotspots they end at. */
  saved: { directions: readonly DirectionRow[] };
  hotspots: { hotspots: readonly Hotspot[] };
  /** Starts drawing a route's empty slot by hand (useLoopClosing's startReturnTrip). */
  startReturnTrip: (routeId: string) => void;
}

/**
 * The Playground's "start from" pickers (OSM, old Para), for a new route from the New + and for
 * a route's empty slot from "+ Add route". A line picked for a slot fills that slot, and one
 * that plainly runs the same way as the route's drawn direction is said in the toast.
 */
export function useRouteStarts({
  map,
  draw,
  setNotice,
  saved: { directions },
  hotspots: { hotspots },
  startReturnTrip,
}: UseRouteStartsOptions) {
  const onSlotStart = (routeId: string, line: readonly LngLat[]) => {
    const notice = sameWayNotice(directions, routeId, hotspots, line);
    if (notice) setNotice(notice);
  };
  const osm = useOsmRouteStart({ map, draw, setNotice, onSlotStart });
  const oldPara = useOldParaRouteStart({ map, draw, setNotice, onSlotStart });

  /** "+ Add route"'s choice for a route's undrawn direction. */
  const addOtherWay = (routeId: string, how: AddWay) => {
    osm.closePicker();
    oldPara.closePicker();
    if (how === 'draw') startReturnTrip(routeId);
    if (how === 'osm') osm.openPicker({ routeId });
    if (how === 'old-para') oldPara.openPicker({ routeId });
  };

  return { osm, oldPara, addOtherWay };
}

export type RouteStarts = ReturnType<typeof useRouteStarts>;
