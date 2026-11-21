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
  /** Whether the map's ⓘ stands at the left, for the controls to stand beside. */
  isBesideCredits: boolean;
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
 * shows wherever the camera is off what is framed (a trip, the picked cards). Vice Versa is not
 * there when only loops are listed: they have no way back. The row holding Vice Versa and the
 * Overview is drawn only with one of them showing, so the sliders keep their 12 over the sheet.
 */
export function MapSheetControls({
  map,
  overview,
  isBesideCredits,
  list,
  onFlip,
  onFilter,
}: MapSheetControlsProps) {
  const way = list && listWay(list.candidates, list.back, list.listing, list.modeFilter);
  return (
    <MapControlsDock isBesideCredits={isBesideCredits}>
      <div className="hidden gap-2 has-[>:not([hidden])]:flex">
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
      </div>
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
