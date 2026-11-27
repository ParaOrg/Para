import type { MapLibreMap } from 'maplibre-gl';

import { ListFilter, type FilteredList } from '@/features/routes/cards/list-filter';
import { listWay } from '@/features/routes/cards/list-way';
import { ViceVersaButton } from '@/features/routes/cards/vice-versa-button';
import { OverviewPill } from '@/features/routes/map/overview-pill';
import type { ModePicks } from '@/features/routes/model/mode-filter';

interface PlaygroundListControlsProps {
  map: MapLibreMap | null;
  /** The route list as useSavedRoutes keeps it. */
  list: FilteredList;
  /** The Overview button's camera (useOverview): its drawing alone over a list. */
  overview: { isShown: boolean; go: () => void };
  /** Vice Versa: every route listed the other way round. */
  onFlip: () => void;
  /** The modes picked in the filter the sliders open. */
  onFilter: (picks: ModePicks) => void;
}

/**
 * The studio's route list's controls on the map on a computer (Figma 4905:21658), 16 from the
 * map's top and the left panel the list fills: Vice Versa over the Overview, the filter right of
 * them, as the public map floats its own. Vice Versa is not there when only loops are listed:
 * they have no way back.
 */
export function PlaygroundListControls({
  map,
  list,
  overview,
  onFlip,
  onFilter,
}: PlaygroundListControlsProps) {
  const way = listWay(list.candidates, list.back, list.listing, list.modePicks);
  return (
    <div data-testid="map-controls" className="absolute top-4 left-4 z-10 flex items-start gap-3">
      <div className="flex flex-col items-start gap-3">
        {way.way !== null && (
          <ViceVersaButton
            way={way.way}
            wayTo={way.wayTo}
            isSwitchable={way.isSwitchable}
            isBack={list.back}
            onSwitch={onFlip}
          />
        )}
        <OverviewPill isShown={overview.isShown} go={overview.go} map={map} isIconOnly />
      </div>
      <ListFilter list={list} onFilter={onFilter} tooltip="top" />
    </div>
  );
}
