import type { MapLibreMap } from 'maplibre-gl';
import { useMemo, useState } from 'react';

import { lookAt } from '@/features/routes/map/look-at';
import type { Hotspot } from '@/features/routes/model/hotspots';
import type { SearchPlace } from '@/features/routes/model/place-search';
import type { Direction } from '@/features/routes/model/routes';
import { PlaceSearch } from '@/features/routes/search/place-search';
import type { LoadLandmarks } from '@/features/routes/search/use-landmarks';
import type { LngLat } from '@/shared/utils/geo';

import { SearchMark } from './search-mark';
import type { DraftRow } from '../data/review-schema';
import { searchableHotspots } from '../data/search-hotspots';
import { useReviewQuery } from '../data/use-review-query';

/** No drafts: one list, so the memo below holds while signed out. */
const NO_DRAFTS: readonly DraftRow[] = [];

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
 * only moves the camera and leaves a dot until the search starts over or another result is
 * picked. It never touches the drawing or a draft, and offers no "make a hotspot here".
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
  // Where the dot is, and which search put it there, so a second search on the same point shows
  // anew. It stays until the search starts over or another result is picked, as the commuter's
  // landmark pin does.
  const [mark, setMark] = useState<{ at: LngLat; id: number } | null>(null);

  const showMark = (at: LngLat) => setMark((last) => ({ at, id: (last?.id ?? 0) + 1 }));

  // Signed out, none: a disabled query still answers with what an earlier sign-in left cached.
  const draftsRead = useReviewQuery({ isEnabled: isSignedIn }).data;
  const drafts = (isSignedIn && draftsRead) || NO_DRAFTS;
  // Memoised for a stable list: the search's own memo (useSearchRows) keys on it, and its landmark
  // match costs up to some 20 ms, while the workshop renders far more often than this changes.
  const searchable = useMemo(() => searchableHotspots(hotspots, drafts), [hotspots, drafts]);
  const isDraftPlace = (place: SearchPlace) =>
    place.hotspots.every((hotspot) => searchable.draftIds.has(hotspot.id));

  // A draft is not on the map and has no card yet; while drawing, nothing opens (decision 46).
  const handlePick = (hotspot: Hotspot) => {
    if (onOpenHotspot && !isDrawing && !searchable.draftIds.has(hotspot.id)) {
      setMark(null);
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
        // Centred, but never over the Contributors panel at the map's left (16 in, 384 wide) or the
        // hotspot card: its left edge stays 8 past the panel's on a narrow computer.
        className="absolute top-4 left-[max(calc(50%-10rem),25.5rem)] z-10 hidden w-80 rounded-xl bg-surface p-3 shadow-large @float:block"
      >
        <PlaceSearch
          hotspots={searchable.hotspots}
          directionsAt={directionsAt}
          onPick={handlePick}
          onLookAt={(point) => lookAt(map, point)}
          onPickLandmark={(landmark) => showMark(landmark.point)}
          onSearchRestart={() => setMark(null)}
          noteOf={(place) => (isDraftPlace(place) ? 'Draft' : null)}
          loadLandmarks={loadLandmarks}
        />
      </div>
      {map && mark && <SearchMark key={mark.id} map={map} at={mark.at} />}
    </>
  );
}
