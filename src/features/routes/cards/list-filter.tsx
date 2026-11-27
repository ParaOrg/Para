import type { TooltipPosition } from '@/design-system/primitives/icon-button';
import { FilterIcon } from '@/shared/ui/map-control-icons';

import { listedRouteCount } from './list-way';
import { ModeFilterButton } from './mode-filter-button';
import type { Listing } from '../model/departures';
import type { ModePicks } from '../model/mode-filter';
import type { Direction } from '../model/routes';

/** The route list a filter on the map narrows, as useSavedRoutes keeps it. */
export interface FilteredList {
  candidates: readonly Direction[];
  back: boolean;
  listing: Listing;
  modePicks: ModePicks;
}

interface ListFilterProps {
  list: FilteredList;
  onFilter: (picks: ModePicks) => void;
  /** Where its tooltip points from, as the place it stands needs. */
  tooltip: TooltipPosition;
}

/**
 * A route list's filter floating on the map (4879:37812), on the public map and the studio's on a
 * computer: a 48 IconButton under shadow-sm, the modes picked counted.
 */
export function ListFilter({ list, onFilter, tooltip }: ListFilterProps) {
  return (
    <span className="flex rounded-full shadow-sm">
      <ModeFilterButton
        modeFilter={{
          picks: list.modePicks,
          onPicks: onFilter,
          routeCount: listedRouteCount(list.candidates, list.back, list.listing, list.modePicks),
        }}
        icon={<FilterIcon />}
        tooltip={tooltip}
        testId="chooser-filter"
      />
    </span>
  );
}
