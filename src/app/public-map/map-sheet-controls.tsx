import type { MapLibreMap } from 'maplibre-gl';

import { listWay } from '@/features/routes/cards/list-way';
import { ModeFilterButton } from '@/features/routes/cards/mode-filter-button';
import { ViceVersaButton } from '@/features/routes/cards/vice-versa-button';
import { MapControlsDock } from '@/features/routes/map/map-controls-dock';
import { OverviewPill } from '@/features/routes/map/overview-pill';
import type { Listing } from '@/features/routes/model/departures';
import type { ModeFilter } from '@/features/routes/model/mode-filter';
import type { Direction } from '@/features/routes/model/routes';
import { FilterIcon } from '@/shared/ui/map-control-icons';

interface MapSheetControlsProps {
  map: MapLibreMap | null;
  /** The Overview button's camera (useOverview). */
  overview: { isShown: boolean; go: () => void };
  /** The route list's routes as useSavedRoutes keeps them, while the list is the card on show. */
  list: {
    candidates: readonly Direction[];
    back: boolean;
    listing: Listing;
    modeFilter: ModeFilter;
  } | null;
  /** Vice Versa: every route listed the other way round. */
  onFlip: () => void;
  /** A choice in the filter the sliders open. */
  onFilter: (filter: ModeFilter) => void;
}

/**
 * The public map's controls on the map for the card on show (Figma 4831:54489, 4831:54492); its
 * sheets carry no Controller bar: the route list's Vice Versa and sliders, and the Overview, which
 * shows wherever the camera is off what is framed (a trip, the picked cards). One column at the
 * map's left, from the sheet up: Vice Versa where it was (the owner to confirm), then the Overview
 * and the sliders stacked over it (the owner, 2026-11-22). Vice Versa is not there when only loops
 * are listed: they have no way back. The map's ⓘ is in the top-left corner, so nothing stands
 * beside the column.
 */
export function MapSheetControls({ map, overview, list, onFlip, onFilter }: MapSheetControlsProps) {
  const way = list && listWay(list.candidates, list.back, list.listing, list.modeFilter);
  return (
    <MapControlsDock>
      {list && way && way.way !== null && (
        <ViceVersaButton
          way={way.way}
          wayTo={way.wayTo}
          isSwitchable={way.isSwitchable}
          isBack={list.back}
          onSwitch={onFlip}
        />
      )}
      <OverviewPill isShown={overview.isShown} go={overview.go} map={map} />
      {list && (
        // Figma's shadow-sm under the group, round each control.
        <span className="flex rounded-full shadow-sm">
          <ModeFilterButton
            modeFilter={{ filter: list.modeFilter, onFilter }}
            icon={<FilterIcon />}
            tooltip="left"
            testId="chooser-filter"
          />
        </span>
      )}
    </MapControlsDock>
  );
}
