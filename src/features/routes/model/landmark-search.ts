import { haversine, type LngLat } from '@/shared/utils/geo';

import type { Hotspot, HotspotLink } from './hotspots';
import {
  distanceToPlace,
  foldForSearch,
  lettersOf,
  matchFolded,
  qualityRank,
  type MatchQuality,
  type PlaceMatch,
  type SearchPlace,
} from './place-search';
import type { Landmark } from '../published/landmark-file-schema';

/*
 * Place search's step 2 (.scratch/place-search, decisions 8 and 9): OpenStreetMap landmarks
 * matched as places are, listed after Para's own places, and for a landmark that is not a Para
 * place, the hintuans near it with their routes.
 */

/** A landmark this close to a place of the same name is that place, not a second row. */
export const SAME_PLACE_M = 250;
/** How far "routes near here" looks: straight-line, not walking (decision 8). */
export const NEAR_HERE_M = 500;

export interface LandmarkMatch {
  landmark: Landmark;
  quality: MatchQuality;
  /** The name that matched: the landmark's name, or one of its aliases. */
  matchedTerm: string;
  /** Straight-line metres from the commuter; null without a location. */
  distanceM: number | null;
}

/** A landmark with its names folded once, so a keystroke over thousands folds only the query. */
export interface SearchLandmark {
  landmark: Landmark;
  /** Its name, then its aliases, each beside its fold and that fold's letters. */
  terms: { term: string; folded: string; letters: number }[];
}

/** The landmarks ready to search: each name folded once, when the file is read. */
export function searchableLandmarks(landmarks: readonly Landmark[]): SearchLandmark[] {
  return landmarks.map((landmark) => ({
    landmark,
    terms: [landmark.name, ...landmark.aliases].map((term) => {
      const folded = foldForSearch(term);
      return { term, folded, letters: lettersOf(folded) };
    }),
  }));
}

/** The landmarks the query matches, ranked as places are: match, own name, distance, name. */
export function searchLandmarks(
  query: string,
  landmarks: readonly SearchLandmark[],
  from: LngLat | null = null,
): LandmarkMatch[] {
  const foldedQuery = foldForSearch(query);
  if (foldedQuery === '') return [];
  const matches: LandmarkMatch[] = [];
  for (const { landmark, terms } of landmarks) {
    let best: { quality: MatchQuality; term: string } | null = null;
    for (const { term, folded, letters } of terms) {
      const quality = matchFolded(foldedQuery, folded, letters);
      if (quality && (!best || qualityRank(quality) < qualityRank(best.quality))) {
        best = { quality, term };
      }
    }
    if (!best) continue;
    matches.push({
      landmark,
      quality: best.quality,
      matchedTerm: best.term,
      distanceM: from ? haversine(from, landmark.point) : null,
    });
  }
  const byOther = (match: LandmarkMatch) => (match.matchedTerm === match.landmark.name ? 0 : 1);
  return matches.sort(
    (a, b) =>
      qualityRank(a.quality) - qualityRank(b.quality) ||
      byOther(a) - byOther(b) ||
      (a.distanceM ?? 0) - (b.distanceM ?? 0) ||
      a.landmark.name.localeCompare(b.landmark.name),
  );
}

/** Whether a landmark is a Para place already: one of its names is the place's, within SAME_PLACE_M. */
export function isParaPlace(landmark: Landmark, places: readonly SearchPlace[]): boolean {
  const names = new Set([landmark.name, ...landmark.aliases].map(foldForSearch));
  return places.some(
    (place) =>
      place.terms.some((term) => names.has(foldForSearch(term))) &&
      distanceToPlace(landmark.point, place) <= SAME_PLACE_M,
  );
}

export interface SearchResults {
  places: PlaceMatch[];
  landmarks: LandmarkMatch[];
}

/**
 * Para's places first, then the landmarks that are not one of them (decision 9), `max` rows in
 * all: places take what they need, landmarks the rest.
 */
export function combineResults(
  placeMatches: readonly PlaceMatch[],
  landmarkMatches: readonly LandmarkMatch[],
  places: readonly SearchPlace[],
  max: number,
): SearchResults {
  const shownPlaces = placeMatches.slice(0, max);
  const room = max - shownPlaces.length;
  const shownLandmarks: LandmarkMatch[] = [];
  for (const match of landmarkMatches) {
    if (shownLandmarks.length >= room) break;
    if (!isParaPlace(match.landmark, places)) shownLandmarks.push(match);
  }
  return { places: shownPlaces, landmarks: shownLandmarks };
}

export interface HintuanNearHere {
  hintuan: Hotspot;
  /** Straight-line metres from the landmark. */
  distanceM: number;
  /** The directions linked to it, in link order. */
  directionIds: string[];
}

/**
 * The hintuans within NEAR_HERE_M of any of the points, straight-line, nearest first, each with
 * the directions that stop there; a hintuan no direction stops at is left out. A landmark's
 * points are its `reach`: its point, and a street's points along it. Empty means "No Para
 * routes near here yet".
 */
export function routesNearHere(
  points: readonly LngLat[],
  hotspots: readonly Hotspot[],
  links: readonly HotspotLink[],
): HintuanNearHere[] {
  const near: HintuanNearHere[] = [];
  for (const hotspot of hotspots) {
    if (hotspot.kind !== 'hintuan') continue;
    const distanceM = Math.min(
      ...points.map((point) => haversine(point, hotspot.point.coordinates)),
    );
    if (distanceM > NEAR_HERE_M) continue;
    const directionIds = links
      .filter((link) => link.hotspotId === hotspot.id)
      .sort((a, b) => a.sequence - b.sequence)
      .map((link) => link.directionId);
    if (directionIds.length > 0) near.push({ hintuan: hotspot, distanceM, directionIds });
  }
  return near.sort(
    (a, b) => a.distanceM - b.distanceM || a.hintuan.name.localeCompare(b.hintuan.name),
  );
}
