import {
  foldForSearch,
  lettersOf,
  matchFolded,
  qualityRank,
  type MatchQuality,
} from '@/features/routes/model/place-search';
import type { Spot, SpotMatch } from '@/features/routes/search/spot-source';
import { haversine, type LngLat } from '@/shared/utils/geo';

import { STORE_FILES, storeFileSchema, type StoreFile, type StoreSource } from './store-files';

/*
 * The studio's store search (the owner's call, 2026-11-25: the studio's search only; the public
 * map's search never reads these): the stores and establishments research builds into
 * /data/search/v1/ (scripts/search/search-file.mjs), from Overture Maps Places and OpenStreetMap.
 * A chunk of its own, fetched on the first letter typed, as the landmarks are.
 */

/** A store, its name folded once, so a keystroke over a hundred thousand folds only the query. */
interface SearchStore {
  spot: Spot;
  folded: string;
  letters: number;
}

/** The stores ready to search, and the credit each source's licence asks for. */
export interface Stores {
  stores: SearchStore[];
  attribution: Record<StoreSource, string>;
}

/** Where a store comes from, by its id ("osm:12", "overture:7"), for the credit. */
export const sourceOf = (spot: Spot): StoreSource =>
  spot.id.startsWith('overture:') ? 'overture' : 'osm';

/** The same name this close is one place: listed once, OpenStreetMap's first. */
export const SAME_STORE_M = 50;
/** A grid cell a little over SAME_STORE_M, so a twin is in the same cell or a neighbour. */
const CELL_DEG = 0.0005;

const SOURCE_LABEL = { osm: 'OpenStreetMap', overture: 'Overture' } satisfies Record<
  StoreSource,
  string
>;

/** A file's category as words: "fast_food" is "Fast food". */
function categoryLabel(category: string): string {
  const words = category.replaceAll('_', ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

async function fetchFile(source: StoreSource) {
  const response = await fetch(STORE_FILES[source]);
  if (!response.ok) throw new Error(`${STORE_FILES[source]}: HTTP ${response.status}`);
  return storeFileSchema.parse(await response.json());
}

/** Both files, read and checked, as one list (storesFrom). */
export async function fetchStores(): Promise<Stores> {
  const [osm, overture] = await Promise.all([fetchFile('osm'), fetchFile('overture')]);
  return storesFrom({ osm, overture });
}

/**
 * The two files' places as one list: OpenStreetMap's first, then Overture's, each place that has
 * the same name as one already listed within SAME_STORE_M left out.
 */
export function storesFrom(files: Record<StoreSource, StoreFile>): Stores {
  const kept = new Map<string, LngLat[]>();
  const cellKey = (folded: string, x: number, y: number) => `${folded}|${x}|${y}`;
  const isTwin = (folded: string, point: LngLat) => {
    const x = Math.floor(point[0] / CELL_DEG);
    const y = Math.floor(point[1] / CELL_DEG);
    for (let dx = -1; dx <= 1; dx++)
      for (let dy = -1; dy <= 1; dy++)
        for (const other of kept.get(cellKey(folded, x + dx, y + dy)) ?? [])
          if (haversine(point, other) <= SAME_STORE_M) return true;
    return false;
  };
  const keep = (folded: string, point: LngLat) => {
    const key = cellKey(folded, Math.floor(point[0] / CELL_DEG), Math.floor(point[1] / CELL_DEG));
    kept.set(key, [...(kept.get(key) ?? []), point]);
  };
  const stores: SearchStore[] = [];
  const ORDER: readonly StoreSource[] = ['osm', 'overture'];
  for (const source of ORDER) {
    const file = files[source];
    file.places.forEach(([label, category, lng, lat], index) => {
      const folded = foldForSearch(label);
      const point: LngLat = [lng, lat];
      if (folded === '' || isTwin(folded, point)) return;
      keep(folded, point);
      stores.push({
        spot: {
          id: `${source}:${index}`,
          label,
          detail: `${categoryLabel(file.categories[category] ?? '')} · ${SOURCE_LABEL[source]}`,
          point,
        },
        folded,
        letters: lettersOf(folded),
      });
    });
  }
  return {
    stores,
    attribution: { osm: files.osm.attribution, overture: files.overture.attribution },
  };
}

/** The stores the query matches, ranked as landmarks are: match, distance, name. */
export function searchStores(
  query: string,
  stores: readonly SearchStore[],
  from: LngLat | null,
): SpotMatch[] {
  const foldedQuery = foldForSearch(query);
  if (foldedQuery === '') return [];
  const matches: { match: SpotMatch; quality: MatchQuality }[] = [];
  for (const { spot, folded, letters } of stores) {
    const quality = matchFolded(foldedQuery, folded, letters);
    if (!quality) continue;
    matches.push({
      match: { spot, distanceM: from ? haversine(from, spot.point) : null },
      quality,
    });
  }
  return matches
    .sort(
      (a, b) =>
        qualityRank(a.quality) - qualityRank(b.quality) ||
        (a.match.distanceM ?? 0) - (b.match.distanceM ?? 0) ||
        a.match.spot.label.localeCompare(b.match.spot.label),
    )
    .map(({ match }) => match);
}
