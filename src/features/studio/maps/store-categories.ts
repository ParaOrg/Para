import { foldForSearch } from '@/features/routes/model/place-search';

/*
 * The words an editor types for a kind of place, in English and Tagalog, and the categories of the
 * studio's search files they stand for: Overture's (its primary categories, scripts/search/) and
 * OpenStreetMap's (the establishment kinds). A query that is one of these words lists the places
 * of those categories nearest the map's centre, whatever their names (store-search-data.ts).
 */

/** Overture's restaurant categories are many ("filipino_restaurant", "pizza_restaurant"). */
const isRestaurant = (category: string) =>
  category === 'restaurant' || category.endsWith('_restaurant');

interface CategoryGroup {
  words: readonly string[];
  /** Whether a file's category belongs to the group. */
  has: (category: string) => boolean;
}

const among =
  (categories: readonly string[]) =>
  (category: string): boolean =>
    categories.includes(category);

const GROUPS: readonly CategoryGroup[] = [
  {
    words: ['pharmacy', 'botika', 'drugstore', 'drug store'],
    has: among(['pharmacy', 'drugstore']),
  },
  {
    words: ['grocery', 'palengke', 'supermarket', 'grocery store'],
    has: among([
      'grocery_store',
      'organic_grocery_store',
      'korean_grocery_store',
      'seafood_market',
      'flea_market',
      'supermarket',
    ]),
  },
  {
    words: ['laundry', 'labahan', 'laundromat'],
    has: among(['laundromat', 'laundry_service', 'laundry']),
  },
  {
    words: ['kainan', 'restaurant', 'food', 'karinderya', 'carinderia'],
    has: (category) =>
      isRestaurant(category) ||
      ['fast_food', 'diner', 'food_court', 'cafeteria'].includes(category),
  },
  {
    words: ['sari sari', 'sarisari', 'convenience', 'convenience store'],
    has: among(['convenience_store', 'convenience']),
  },
  {
    words: ['hotel', 'lodging', 'transient'],
    // Not Overture's bare "lodging": most of its places are subdivisions and streets.
    has: among(['hotel', 'motel', 'hostel', 'lodge', 'resort', 'beach_resort']),
  },
  { words: ['bangko', 'bank'], has: among(['bank']) },
  { words: ['atm'], has: among(['atm']) },
];

const GROUP_OF_WORD = new Map(
  GROUPS.flatMap((group) => group.words.map((word) => [foldForSearch(word), group] as const)),
);

/**
 * The test for a query that is a category word, folded as search folds it ("Sari-Sari" is "sari
 * sari"), or null when it is not one: then the query matches names.
 */
export function categoryOfQuery(foldedQuery: string): ((category: string) => boolean) | null {
  return GROUP_OF_WORD.get(foldedQuery)?.has ?? null;
}
