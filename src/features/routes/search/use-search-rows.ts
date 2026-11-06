import { useMemo } from 'react';

import type { LngLat } from '@/shared/utils/geo';

import type { SearchRow } from './search-rows';
import type { LandmarksState } from './use-landmarks';
import type { Hotspot } from '../model/hotspots';
import { combineResults, searchLandmarks } from '../model/landmark-search';
import { placeVehicles, searchPlaces, searchablePlaces } from '../model/place-search';
import type { Direction } from '../model/routes';

/** The most results listed: more than a phone shows above its keyboard. */
export const MAX_RESULTS = 8;

/**
 * Place search's rows for what is typed: Para's places first, then the landmarks that are not one
 * of them, MAX_RESULTS in all (decision 9). The matching is memoised: over the landmarks it costs
 * up to about 20 ms on a laptop and more on a phone (tests/unit/landmark-search-test.mjs), and the
 * public map renders far more often than the query changes.
 */
export function useSearchRows(
  query: string,
  hotspots: readonly Hotspot[],
  landmarks: LandmarksState,
  from: LngLat | null,
  directionsAt: (hotspotId: string) => readonly Direction[],
): SearchRow[] {
  const places = useMemo(() => searchablePlaces(hotspots), [hotspots]);
  const landmarkList = landmarks.status === 'ready' ? landmarks.landmarks.landmarks : null;
  const matched = useMemo(() => {
    if (query.trim() === '') return null;
    return combineResults(
      searchPlaces(query, places, from),
      landmarkList ? searchLandmarks(query, landmarkList, from) : [],
      places,
      MAX_RESULTS,
    );
  }, [query, places, landmarkList, from]);
  if (!matched) return [];
  return [
    ...matched.places.map((match) => ({
      type: 'place' as const,
      match,
      vehicles: placeVehicles(match.place, directionsAt),
    })),
    ...matched.landmarks.map((match) => ({ type: 'landmark' as const, match })),
  ];
}
