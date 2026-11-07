import type { MapLibreMap } from 'maplibre-gl';
import { useEffect, useState } from 'react';

import { lookAt } from '@/features/routes/map/look-at';
import type { Hotspot } from '@/features/routes/model/hotspots';
import type { SearchPlace } from '@/features/routes/model/place-search';
import type { Direction } from '@/features/routes/model/routes';
import { PlaceSearch } from '@/features/routes/search/place-search';
import type { LoadLandmarks } from '@/features/routes/search/use-landmarks';
import type { LngLat } from '@/shared/utils/geo';

import { SearchMark } from './search-mark';
import { searchableHotspots } from '../data/search-hotspots';
import { useReviewQuery } from '../data/use-review-query';

/** How long the dot stays where a search took the camera. */
const MARK_MS = 8000;

interface StudioSearchProps {
  map: MapLibreMap | null;
  /** The studio's hotspots as the database holds them, unpublished ones too. */
  hotspots: readonly Hotspot[];
  /** Signed in: the drafts are read too, new places among them marked "Draft". */
  isSignedIn: boolean;
  directionsAt: (hotspotId: string) => readonly Direction[];
  /** A line is being drawn: a search then only moves the camera (decision 46). */
  isDrawing: boolean;
  /**
   * A saved hotspot chosen while nothing is drawn: its card, as a tap on its box opens it. Left
   * out on the Contributors map, which has no cards: there a hotspot only moves the camera.
   */
  onOpenHotspot?: (hotspotId: string) => void;
  /** Where the landmarks come from: the file unless given (stories). */
  loadLandmarks?: LoadLandmarks;
}

/**
 * Place search in the studio (.scratch/place-search, ticket 05): the commuter's search over the
 * studio's own hotspots, drafts included, and the OpenStreetMap landmarks, at the top of the
 * workshop and the Contributors map, on a computer only. A saved hotspot opens its card in the
 * workshop; a draft, a landmark, anything on the Contributors map or found while a line is drawn
 * only moves the camera and leaves a dot for a while. It never touches the drawing or a draft, and offers no
 * "make a hotspot here".
 */
export function StudioSearch({
  map,
  hotspots,
  isSignedIn,
  directionsAt,
  isDrawing,
  onOpenHotspot,
  loadLandmarks,
}: StudioSearchProps) {
  // Where the dot is, and which search put it there, so a second search on the same point shows anew.
  const [mark, setMark] = useState<{ at: LngLat; id: number } | null>(null);
  useEffect(() => {
    if (!mark) return;
    const timer = setTimeout(() => setMark(null), MARK_MS);
    return () => clearTimeout(timer);
  }, [mark]);

  const showMark = (at: LngLat) => setMark((last) => ({ at, id: (last?.id ?? 0) + 1 }));

  // Signed out, none: a disabled query still answers with what an earlier sign-in left cached.
  const draftsRead = useReviewQuery({ isEnabled: isSignedIn }).data;
  const drafts = isSignedIn ? (draftsRead ?? []) : [];
  const searchable = searchableHotspots(hotspots, drafts);
  const isDraftPlace = (place: SearchPlace) =>
    place.hotspots.every((hotspot) => searchable.draftIds.has(hotspot.id));

  // A draft is not on the map and has no card yet; while drawing, nothing opens (decision 46).
  const handlePick = (hotspot: Hotspot) => {
    if (onOpenHotspot && !isDrawing && !searchable.draftIds.has(hotspot.id)) {
      onOpenHotspot(hotspot.id);
      return;
    }
    lookAt(map, hotspot.point.coordinates);
    showMark(hotspot.point.coordinates);
  };

  return (
    <>
      <div
        data-testid="studio-search"
        className="absolute top-4 left-1/2 z-10 hidden w-80 -translate-x-1/2 rounded-xl bg-surface p-3 shadow-large @float:block"
      >
        <PlaceSearch
          hotspots={searchable.hotspots}
          directionsAt={directionsAt}
          onPick={handlePick}
          onLookAt={(point) => lookAt(map, point)}
          onPickLandmark={(landmark) => showMark(landmark.point)}
          noteOf={(place) => (isDraftPlace(place) ? 'Draft' : null)}
          loadLandmarks={loadLandmarks}
        />
      </div>
      {map && mark && <SearchMark key={mark.id} map={map} at={mark.at} />}
    </>
  );
}
