import { lettersOf, typosAllowed, type MatchQuality } from '@/features/routes/model/place-search';
import { typosToWordStart } from '@/features/routes/model/typo-table';
import type { Spot, SpotMatch } from '@/features/routes/search/spot-source';
import { haversine, type LngLat } from '@/shared/utils/geo';

/*
 * The store search's matching (searchStores, store-search-data.ts): the cheap name tests, the typo
 * pass with its sieves, and the nearest first. Kept apart so a keystroke's cost reads in one place.
 */

/** A store as the matching reads it: its spot, its name folded, and that name's letters. */
interface MatchedStore {
  spot: Spot;
  folded: string;
  letters: number;
}

const SPACE = ' '.charCodeAt(0);

/** The plain match qualities, best first: the typo pass comes after them. */
export const PLAIN_QUALITIES = ['whole', 'start', 'word', 'inside'] as const;

/** The `count` nearest `from` among the stores, nearest first, then by name; in file order without it. */
export function nearest(
  stores: readonly MatchedStore[],
  from: LngLat | null,
  count: number,
): SpotMatch[] {
  const matches = stores.map(({ spot }) => ({
    spot,
    distanceM: from ? haversine(from, spot.point) : null,
  }));
  return matches
    .sort(
      (a, b) => (a.distanceM ?? 0) - (b.distanceM ?? 0) || a.spot.label.localeCompare(b.spot.label),
    )
    .slice(0, count);
}

/** matchFolded without its typo pass: the cheap matches, by plain string tests. */
export function plainMatch(foldedQuery: string, folded: string): MatchQuality | null {
  if (folded === foldedQuery) return 'whole';
  if (folded.startsWith(foldedQuery)) return 'start';
  if (` ${folded}`.includes(` ${foldedQuery}`)) return 'word';
  if (folded.includes(foldedQuery)) return 'inside';
  return null;
}

/**
 * matchFolded's typo pass for names the plain tests missed, with the query's work done once: its
 * letters, and a sieve before the costly table. An edit spoils at most three of the query's letter
 * pairs, so a name within the typos allowed holds all its pairs but three per typo. The sieve is
 * never false for a name the table would find, and false for most others.
 */
export function typoTest(foldedQuery: string): (store: MatchedStore) => boolean {
  const limit = typosAllowed(foldedQuery.length);
  if (limit === 0) return () => false;
  const queryLetters = [...foldedQuery].filter((char) => char !== ' ').map(lettersOf);
  const pairs = Array.from({ length: foldedQuery.length - 1 }, (_, i) =>
    foldedQuery.slice(i, i + 2),
  );
  const fewestPairs = pairs.length - 3 * limit;
  const holdsEnoughPairs = (folded: string) => {
    let held = 0;
    for (const pair of pairs) if (folded.includes(pair) && ++held >= fewestPairs) return true;
    return false;
  };
  // With one typo, a stretch from a word's start opens with the query's first or second letter in
  // its first two (a typo in either, a letter missing or added, or the two swapped).
  const [first, second] = [foldedQuery.charCodeAt(0), foldedQuery.charCodeAt(1)];
  const isOpening = (code: number) => code === first || code === second;
  const opensLikeTheQuery = (folded: string) => {
    for (let i = 0; i < folded.length; i++) {
      if (i > 0 && folded.charCodeAt(i - 1) !== SPACE) continue;
      if (isOpening(folded.charCodeAt(i)) || isOpening(folded.charCodeAt(i + 1))) return true;
    }
    return false;
  };
  return ({ folded, letters }) => {
    let missing = 0;
    for (const letter of queryLetters)
      if ((letter & letters) === 0 && ++missing > limit) return false;
    if (fewestPairs > 0 && !holdsEnoughPairs(folded)) return false;
    if (limit === 1 && !opensLikeTheQuery(folded)) return false;
    return typosToWordStart(foldedQuery, folded, limit) <= limit;
  };
}
