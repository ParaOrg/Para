import type { MapLibreMap } from 'maplibre-gl';

import { lookAt } from '@/features/routes/map/look-at';

import { CheckSpotMarks } from './check-spot-marks';
import { OsmRouteHint } from './osm-route-hint';
import { OsmRoutePicker } from './osm-route-picker';
import type { OsmRouteStart } from './use-osm-route-start';

interface OsmRouteStartToolsProps {
  map: MapLibreMap | null;
  osmStart: OsmRouteStart;
  isDrawing: boolean;
}

/**
 * "Start from OSM route" over the Playground (.scratch/osm-route-start/plan.md): the picker while
 * it is open and nothing is drawn, then, while a drawing from a route lasts, its hint and the dots
 * at the places to check.
 */
export function OsmRouteStartTools({ map, osmStart, isDrawing }: OsmRouteStartToolsProps) {
  if (!isDrawing && osmStart.isPickerOpen)
    return (
      <OsmRoutePicker
        mapCentre={() => {
          if (!map) return null;
          const { lng, lat } = map.getCenter();
          return [lng, lat];
        }}
        onStart={osmStart.begin}
        onClose={osmStart.closePicker}
      />
    );
  if (!isDrawing || !osmStart.route) return null;
  return (
    <>
      <OsmRouteHint
        route={osmStart.route}
        spots={osmStart.spots}
        onLookAt={(at) => lookAt(map, at)}
        onForget={osmStart.forget}
      />
      {map && <CheckSpotMarks map={map} spots={osmStart.spots} />}
    </>
  );
}
