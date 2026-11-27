import type { MapLibreMap } from 'maplibre-gl';

import { bboxOf, type LngLat } from '@/shared/utils/geo';

/** Takes the camera, at once, to show the whole of a line a drawing starts from. */
export function fitToLine(map: MapLibreMap | null, line: readonly LngLat[]): void {
  if (line.length === 0) return;
  const [west, south, east, north] = bboxOf(line);
  map?.fitBounds(
    [
      [west, south],
      [east, north],
    ],
    { padding: 80, maxZoom: 17, duration: 0 },
  );
}
