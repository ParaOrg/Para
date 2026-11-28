import type { MapLibreMap } from 'maplibre-gl';

import { lookAt } from '@/features/routes/map/look-at';

import { EndMark } from './end-mark';
import { OldParaRouteHint } from './old-para-route-hint';
import { OldParaRoutePicker } from './old-para-route-picker';
import type { OldParaRouteStart } from './use-old-para-route-start';
import { CheckSpotMarks } from '../osm-routes/check-spot-marks';

interface OldParaRouteStartToolsProps {
  map: MapLibreMap | null;
  oldParaStart: OldParaRouteStart;
  isDrawing: boolean;
}

/**
 * "Start from an old Para route" over the Playground (.scratch/old-para-routes/spec.md), as the
 * OSM start's tools: the picker while it is open and nothing is drawn, then, while a drawing from
 * a route lasts, its hint, the dots at the places to check, and the end of a route with no line.
 */
export function OldParaRouteStartTools({
  map,
  oldParaStart,
  isDrawing,
}: OldParaRouteStartToolsProps) {
  const { start } = oldParaStart;
  if (!isDrawing && oldParaStart.isPickerOpen)
    return (
      <OldParaRoutePicker
        key={oldParaStart.slot?.routeId ?? 'new'}
        mapCentre={() => {
          if (!map) return null;
          const { lng, lat } = map.getCenter();
          return [lng, lat];
        }}
        onStartFromLine={oldParaStart.beginFromLine}
        onStartFromEnds={oldParaStart.beginFromEnds}
        onClose={oldParaStart.closePicker}
      />
    );
  if (!isDrawing || !start) return null;
  return (
    <>
      <OldParaRouteHint
        start={start}
        spots={oldParaStart.spots}
        onLookAt={(at) => lookAt(map, at)}
        onForget={oldParaStart.forget}
      />
      {map && <CheckSpotMarks map={map} spots={oldParaStart.spots} />}
      {map && start.end && <EndMark map={map} at={start.end} />}
    </>
  );
}
