import type { Hotspot } from '@/features/routes/model/hotspots';
import { PlaceSearch } from '@/features/routes/search/place-search';
import { cn } from '@/shared/utils/cn';
import type { LngLat } from '@/shared/utils/geo';

interface PlaceSearchBarProps {
  hotspots: readonly Hotspot[];
  whereNow: () => LngLat | null;
  onPick: (hotspot: Hotspot) => void;
  /** "Update Para!" is up, 24 below the top and 40 tall (Notices): the bar goes 12 under it. */
  isUnderUpdate: boolean;
  /** The offline pill is up, top left on a wide map (Notices): the bar goes under it there. */
  isUnderOfflinePill: boolean;
}

/**
 * Where place search sits on the public map (.scratch/place-search, decision 2): across the top
 * of a phone's map; on a wide map, in the top-left corner the cards float in, as wide as they
 * are. Stepped down under the page's notices rather than over them.
 */
export function PlaceSearchBar({
  hotspots,
  whereNow,
  onPick,
  isUnderUpdate,
  isUnderOfflinePill,
}: PlaceSearchBarProps) {
  return (
    <div
      data-testid="place-search"
      className={cn(
        'absolute inset-x-4 z-10 rounded-xl bg-surface p-3 shadow-large @wide:right-auto @wide:w-80',
        isUnderUpdate
          ? 'top-[calc(env(safe-area-inset-top)+4.75rem)]'
          : 'top-[calc(env(safe-area-inset-top)+1rem)]',
        isUnderOfflinePill && !isUnderUpdate && '@wide:top-[calc(env(safe-area-inset-top)+3.5rem)]',
      )}
    >
      <PlaceSearch hotspots={hotspots} whereNow={whereNow} onPick={onPick} />
    </div>
  );
}
