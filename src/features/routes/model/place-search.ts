import { haversine, type LngLat } from '@/shared/utils/geo';

import { hotspotLabel, type Hotspot } from './hotspots';
import { placeKey } from './places';
import type { Direction } from './routes';
import { VEHICLES, vehicleOf, type Vehicle } from './vehicles';

/*
 * Place search over Para's own places (.scratch/place-search/README.md, step 1):
 * a query matched against each place's informal name, its boxes' names and
 * their aliases, ignoring case, accents and small typos, and ranked by how
 * well it matched, then by distance from the commuter, then by name.
 */

/** How well a query matched, best first. A typo match is the weakest. */
export type MatchQuality = 'whole' | 'start' | 'word' | 'inside' | 'typo';
const QUALITY_ORDER: readonly MatchQuality[] = ['whole', 'start', 'word', 'inside', 'typo'];

/** A place as search sees it: every box sharing one informal name, and every name it answers to. */
export interface SearchPlace {
  key: string;
  label: string;
  hotspots: Hotspot[];
  /** The label first, then the boxes' names and aliases, each once. */
  terms: string[];
}

export interface PlaceMatch {
  place: SearchPlace;
  quality: MatchQuality;
  /** The name that matched: the label, or a box's name or alias to show beside it. */
  matchedTerm: string;
  /** Straight-line metres from the commuter to the place's nearest box; null without a location. */
  distanceM: number | null;
}

/** Text as search compares it: lower case, accents and punctuation removed, spaces collapsed. */
export function foldForSearch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

/** Every place among the hotspots, its terms gathered from all its boxes. */
export function searchablePlaces(hotspots: readonly Hotspot[]): SearchPlace[] {
  const byKey = new Map<string, SearchPlace>();
  for (const hotspot of hotspots) {
    const key = placeKey(hotspot);
    const place = byKey.get(key) ?? { key, label: hotspotLabel(hotspot), hotspots: [], terms: [] };
    place.hotspots.push(hotspot);
    byKey.set(key, place);
  }
  for (const place of byKey.values()) {
    const seen = new Set<string>();
    const names = [place.label, ...place.hotspots.flatMap((h) => [h.name, ...h.aliases])];
    for (const name of names) {
      const folded = foldForSearch(name);
      if (folded === '' || seen.has(folded)) continue;
      seen.add(folded);
      place.terms.push(name.trim());
    }
  }
  return [...byKey.values()];
}

/** The typos a query of this many letters may carry: none under 4, one up to 7, two from 8. */
export function typosAllowed(length: number): number {
  if (length < 4) return 0;
  return length < 8 ? 1 : 2;
}

/** Edits (insert, delete, change, swap two neighbours) between two texts, or limit + 1 once past it. */
export function editDistance(a: string, b: string, limit: number): number {
  if (Math.abs(a.length - b.length) > limit) return limit + 1;
  let before: number[] = [];
  let previous = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    let rowBest = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let value = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        value = Math.min(value, before[j - 2] + 1);
      }
      current.push(value);
      rowBest = Math.min(rowBest, value);
    }
    if (rowBest > limit) return limit + 1;
    before = previous;
    previous = current;
  }
  return previous[b.length];
}

/** How well a folded query matches one name, or null when it does not. */
export function matchQuality(foldedQuery: string, term: string): MatchQuality | null {
  return matchFolded(foldedQuery, foldForSearch(term));
}

/**
 * A bit for each letter a–z and digit group in a folded text: what lets a typo match be turned
 * down without its table, since every letter of the query missing from the name costs an edit.
 */
export function lettersOf(folded: string): number {
  let mask = 0;
  for (const char of folded) {
    const code = char.charCodeAt(0);
    if (code >= 97 && code <= 122) mask |= 1 << (code - 97);
    else if (code >= 48 && code <= 57) mask |= 1 << (26 + ((code - 48) % 5));
    else if (char !== ' ') mask |= 1 << 31;
  }
  return mask;
}

/** How many of the query's characters have no letter like them anywhere in the name: each one an edit at least. */
function missingLetters(foldedQuery: string, nameLetters: number): number {
  let missing = 0;
  for (const char of foldedQuery) {
    if (char !== ' ' && (lettersOf(char) & nameLetters) === 0) missing++;
  }
  return missing;
}

/**
 * matchQuality on a name folded already, with its letters (lettersOf) when kept: for a long list
 * folded once, not on every keystroke.
 */
export function matchFolded(
  foldedQuery: string,
  folded: string,
  nameLetters: number = lettersOf(folded),
): MatchQuality | null {
  if (foldedQuery === '' || folded === '') return null;
  if (folded === foldedQuery) return 'whole';
  if (folded.startsWith(foldedQuery)) return 'start';
  if (` ${folded}`.includes(` ${foldedQuery}`)) return 'word';
  if (folded.includes(foldedQuery)) return 'inside';
  const limit = typosAllowed(foldedQuery.length);
  if (limit === 0 || missingLetters(foldedQuery, nameLetters) > limit) return null;
  return typosToWordStart(foldedQuery, folded, limit) <= limit ? 'typo' : null;
}

/**
 * The fewest edits (insert, delete, change, swap two neighbours) between the query and a stretch
 * of the name that starts at a word's start, any length; limit + 1 once past it. One table over
 * the whole name: row 0 costs the letters skipped since the last word's start, and the last row's
 * smallest cell is the best stretch's end.
 */
export function typosToWordStart(query: string, name: string, limit: number): number {
  const width = name.length + 1;
  let twoBack = new Int32Array(width);
  let previous = new Int32Array(width);
  let current = new Int32Array(width);
  let sinceWordStart = 0;
  for (let j = 0; j < width; j++) {
    previous[j] = sinceWordStart;
    sinceWordStart = name[j] === ' ' ? 0 : sinceWordStart + 1;
  }
  for (let i = 1; i <= query.length; i++) {
    current[0] = i;
    let rowBest = i;
    for (let j = 1; j < width; j++) {
      const cost = query[i - 1] === name[j - 1] ? 0 : 1;
      let value = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost);
      if (i > 1 && j > 1 && query[i - 1] === name[j - 2] && query[i - 2] === name[j - 1]) {
        value = Math.min(value, twoBack[j - 2] + 1);
      }
      current[j] = value;
      if (value < rowBest) rowBest = value;
    }
    if (rowBest > limit) return limit + 1;
    [twoBack, previous, current] = [previous, current, twoBack];
  }
  return Math.min(...previous);
}

/** A match quality's place in the order, 0 the best: what both place and landmark ranking sort by. */
export function qualityRank(quality: MatchQuality): number {
  return QUALITY_ORDER.indexOf(quality);
}

/** The place's best match among its terms, the first term winning a tie. */
function bestMatch(foldedQuery: string, place: SearchPlace) {
  let best: { quality: MatchQuality; term: string } | null = null;
  for (const term of place.terms) {
    const quality = matchQuality(foldedQuery, term);
    if (quality && (!best || qualityRank(quality) < qualityRank(best.quality)))
      best = { quality, term };
  }
  return best;
}

/** Metres from a point to the place's nearest box. */
export function distanceToPlace(from: LngLat, place: SearchPlace): number {
  return Math.min(...place.hotspots.map((h) => haversine(from, h.point.coordinates)));
}

/**
 * The places the query matches: best match first, then those matched by their own label, then
 * nearest (when `from` is known), then by name.
 */
export function searchPlaces(
  query: string,
  places: readonly SearchPlace[],
  from: LngLat | null = null,
): PlaceMatch[] {
  const foldedQuery = foldForSearch(query);
  if (foldedQuery === '') return [];
  const matches: PlaceMatch[] = [];
  for (const place of places) {
    const best = bestMatch(foldedQuery, place);
    if (!best) continue;
    matches.push({
      place,
      quality: best.quality,
      matchedTerm: best.term,
      distanceM: from ? distanceToPlace(from, place) : null,
    });
  }
  // At one quality, a place matched by its own label comes before one matched by another name.
  const byOther = (match: PlaceMatch) => (match.matchedTerm === match.place.label ? 0 : 1);
  return matches.sort(
    (a, b) =>
      qualityRank(a.quality) - qualityRank(b.quality) ||
      byOther(a) - byOther(b) ||
      (a.distanceM ?? 0) - (b.distanceM ?? 0) ||
      a.place.label.localeCompare(b.place.label),
  );
}

/**
 * What rides from a place (decision 9's mode icon): the vehicles of the directions stopping at
 * any of its boxes, each once, in VEHICLES' order. Empty for a place nothing stops at yet.
 */
export function placeVehicles(
  place: SearchPlace,
  directionsAt: (hotspotId: string) => readonly Direction[],
): Vehicle[] {
  const riding = new Set<Vehicle>();
  for (const hotspot of place.hotspots) {
    for (const direction of directionsAt(hotspot.id)) {
      const vehicle = vehicleOf(direction);
      if (vehicle) riding.add(vehicle);
    }
  }
  return VEHICLES.filter((vehicle) => riding.has(vehicle));
}
