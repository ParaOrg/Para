import type { MapLibreMap } from 'maplibre-gl';
import { useEffect, useState } from 'react';

import { lookAt } from '@/features/routes/map/look-at';
import type { Hotspot } from '@/features/routes/model/hotspots';
import type { Direction } from '@/features/routes/model/routes';
import { PlaceSearch } from '@/features/routes/search/place-search';
import type { LngLat } from '@/shared/utils/geo';

import { SearchMark } from './search-mark';

/** How long the dot stays where a search took the camera. */
const MARK_MS = 8000;

interface StudioSearchProps {
  map: MapLibreMap | null;
  /** The studio's hotspots as the database holds them, unpublished ones too. */
  hotspots: readonly Hotspot[];
  directionsAt: (hotspotId: string) => readonly Direction[];
  /** A line is being drawn: a search then only moves the camera (decision 46). */
  isDrawing: boolean;
  /** A hotspot chosen while nothing is drawn: its card, as a tap on its box opens it. */
  onOpenHotspot: (hotspotId: string) => void;
}

/**
 * Place search in the studio (.scratch/place-search, ticket 05): the commuter's search over the
 * studio's own hotspots and the OpenStreetMap landmarks, at the top of the map, on a computer
 * only. A hotspot opens its card; a landmark, or anything found while a line is drawn, only moves
 * the camera and leaves a dot for a while. It never touches the drawing or a draft, and offers no
 * "make a hotspot here".
 */
export function StudioSearch({
  map,
  hotspots,
  directionsAt,
  isDrawing,
  onOpenHotspot,
}: StudioSearchProps) {
  // Where the dot is, and which search put it there, so a second search on the same point shows anew.
  const [mark, setMark] = useState<{ at: LngLat; id: number } | null>(null);
  useEffect(() => {
    if (!mark) return;
    const timer = setTimeout(() => setMark(null), MARK_MS);
    return () => clearTimeout(timer);
  }, [mark]);

  const showMark = (at: LngLat) => setMark((last) => ({ at, id: (last?.id ?? 0) + 1 }));

  const handlePick = (hotspot: Hotspot) => {
    if (isDrawing) {
      lookAt(map, hotspot.point.coordinates);
      showMark(hotspot.point.coordinates);
    } else {
      onOpenHotspot(hotspot.id);
    }
  };

  return (
    <>
      <div
        data-testid="studio-search"
        className="absolute top-4 left-1/2 z-10 hidden w-80 -translate-x-1/2 rounded-xl bg-surface p-3 shadow-large @float:block"
      >
        <PlaceSearch
          hotspots={hotspots}
          directionsAt={directionsAt}
          onPick={handlePick}
          onLookAt={(point) => lookAt(map, point)}
          onPickLandmark={(landmark) => showMark(landmark.point)}
        />
      </div>
      {map && mark && <SearchMark key={mark.id} map={map} at={mark.at} />}
    </>
  );
}
