import type { Hotspot } from '@/features/routes/model/hotspots';
import type { Direction } from '@/features/routes/model/routes';
import { PlaceSearch } from '@/features/routes/search/place-search';
import { cn } from '@/shared/utils/cn';
import type { LngLat } from '@/shared/utils/geo';

interface PlaceSearchBarProps {
  hotspots: readonly Hotspot[];
  directionsAt: (hotspotId: string) => readonly Direction[];
  whereNow: () => LngLat | null;
  onPick: (hotspot: Hotspot) => void;
  onLookAt: (point: LngLat) => void;
  /** "Update Para!" is up, 24 below the top and 40 tall (Notices): the bar goes 12 under it. */
  isUnderUpdate: boolean;
  /** The offline pill is up, top left on a wide map (Notices): the bar goes under it there. */
  isUnderOfflinePill: boolean;
  /**
   * A card is open. A phone's sheet would cover the bar, so it hides there until the owner
   * designs the two together; a wide map's cards float under it (`--sheet-float-top`).
   */
  isCardOpen: boolean;
}

/**
 * How far down the floating cards start on a wide map, under the bar at rest: its top, then its
 * card (12 padding, the field's 20 label, 6 gap and 44 box, 12 padding) and 8 more. Literal
 * classes, so Tailwind finds them; a class on the page's root, so it is written only when a
 * notice comes or goes (BottomSheet reads it for its `corner` and `dock` kinds).
 */
const SHEET_TOP_UNDER = {
  map: '[--sheet-float-top:calc(env(safe-area-inset-top)+7.375rem)]',
  offlinePill: '[--sheet-float-top:calc(env(safe-area-inset-top)+9.875rem)]',
  update: '[--sheet-float-top:calc(env(safe-area-inset-top)+11.125rem)]',
} satisfies Record<'map' | 'offlinePill' | 'update', string>;

/** The root's class that starts the floating cards under the bar, as the notices place it. */
export function sheetTopUnderSearch(isUnderUpdate: boolean, isUnderOfflinePill: boolean): string {
  if (isUnderUpdate) return SHEET_TOP_UNDER.update;
  return isUnderOfflinePill ? SHEET_TOP_UNDER.offlinePill : SHEET_TOP_UNDER.map;
}

/**
 * Where place search sits on the public map (.scratch/place-search, decision 2): across the top
 * of a phone's map; on a wide map, in the top-left corner, over the cards that float there.
 * Stepped down under the page's notices rather than over them.
 */
export function PlaceSearchBar({
  hotspots,
  directionsAt,
  whereNow,
  onPick,
  onLookAt,
  isUnderUpdate,
  isUnderOfflinePill,
  isCardOpen,
}: PlaceSearchBarProps) {
  return (
    <div
      data-testid="place-search"
      className={cn(
        // From @float the bar ends where the docked route list does: 16 in, 352 wide, 368.
        'absolute inset-x-4 z-10 rounded-xl bg-surface p-3 shadow-large @wide:right-auto @wide:w-80 @float:w-88',
        isCardOpen && 'hidden @float:block',
        // These tops and the padding above are summed in SHEET_TOP_UNDER: change them together.
        isUnderUpdate
          ? 'top-[calc(env(safe-area-inset-top)+4.75rem)]'
          : 'top-[calc(env(safe-area-inset-top)+1rem)]',
        isUnderOfflinePill && !isUnderUpdate && '@wide:top-[calc(env(safe-area-inset-top)+3.5rem)]',
      )}
    >
      <PlaceSearch
        hotspots={hotspots}
        directionsAt={directionsAt}
        whereNow={whereNow}
        onPick={onPick}
        onLookAt={onLookAt}
      />
    </div>
  );
}
