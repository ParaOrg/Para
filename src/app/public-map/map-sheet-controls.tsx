import type { MapLibreMap } from 'maplibre-gl';

import type { TooltipPosition } from '@/design-system/primitives/icon-button';
import { listWay } from '@/features/routes/cards/list-way';
import { ModeFilterButton } from '@/features/routes/cards/mode-filter-button';
import { ViceVersaButton } from '@/features/routes/cards/vice-versa-button';
import { MapControlsDock } from '@/features/routes/map/map-controls-dock';
import { OverviewPill } from '@/features/routes/map/overview-pill';
import type { Listing } from '@/features/routes/model/departures';
import type { ModeFilter } from '@/features/routes/model/mode-filter';
import type { Direction } from '@/features/routes/model/routes';
import { FilterIcon } from '@/shared/ui/map-control-icons';
import { FRAMED_SHARE, type Snap } from '@/shared/ui/sheet-gesture';

import { ListTopBar } from './list-top-bar';

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
  /** The cards float (useMapFloats): the filter stands in this row, not over locate-me. */
  floats: boolean;
  /** Vice Versa: every route listed the other way round. */
  onFlip: () => void;
  /** The sheets' shared height (useCardStack): the bar's ⌄ sets the list at the middle. */
  onSnap: (snap: Snap) => void;
  /** A choice in the filter the sliders open. */
  onFilter: (filter: ModeFilter) => void;
}

/**
 * The public map's controls on the map for the card on show (4885:41761; wide, 4886:47571): the
 * route list's Vice Versa, its Overview (its drawing alone, the owner's Q4) and its filter, and a
 * trip's Overview, which shows wherever the camera is off what is framed. On a phone, a column at
 * the map's bottom left, Vice Versa lowest and the Overview over it; the filter stands over
 * locate-me (ListFilter, in its column). Where the card floats, a row at the map's top: Vice Versa
 * over the Overview, the filter right of them. Vice Versa is not there when only loops are listed:
 * they have no way back.
 */
export function MapSheetControls({
  map,
  overview,
  list,
  floats,
  onFlip,
  onSnap,
  onFilter,
}: MapSheetControlsProps) {
  const way = list && listWay(list.candidates, list.back, list.listing, list.modeFilter);
  return (
    <>
      {list && way && (
        <ListTopBar
          way={way.way === null ? null : { ...way, way: way.way }}
          isBack={list.back}
          onFlip={onFlip}
          onMiddle={() => onSnap(FRAMED_SHARE)}
        />
      )}
      <MapControlsDock>
        <div className="flex flex-col-reverse items-start gap-3 @float:flex-col">
          {list && way && way.way !== null && (
            <ViceVersaButton
              way={way.way}
              wayTo={way.wayTo}
              isSwitchable={way.isSwitchable}
              isBack={list.back}
              onSwitch={onFlip}
            />
          )}
          <OverviewPill isShown={overview.isShown} go={overview.go} map={map} isIconOnly={!!list} />
        </div>
        {list && floats && <ListFilter list={list} onFilter={onFilter} tooltip="top" />}
      </MapControlsDock>
    </>
  );
}

interface ListFilterProps {
  list: { modeFilter: ModeFilter };
  onFilter: (filter: ModeFilter) => void;
  /** Where its tooltip points from: beside locate-me on a phone, along the map's top floating. */
  tooltip: TooltipPosition;
}

/** The route list's filter (4879:37812): a 48 IconButton under shadow-sm, the modes picked counted. */
export function ListFilter({ list, onFilter, tooltip }: ListFilterProps) {
  return (
    <span className="flex rounded-full shadow-sm">
      <ModeFilterButton
        modeFilter={{ filter: list.modeFilter, onFilter }}
        icon={<FilterIcon />}
        size="large"
        tooltip={tooltip}
        testId="chooser-filter"
      />
    </span>
  );
}
