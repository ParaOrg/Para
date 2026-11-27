import type { MapLibreMap } from 'maplibre-gl';
import { createPortal } from 'react-dom';

import { RouteCardList } from '@/features/routes/cards/route-card-list';
import type { PickedPlace } from '@/features/routes/cards/route-card-stack';
import type { useCardCamera } from '@/features/routes/map/use-card-camera';
import type { useCardStack } from '@/features/routes/map/use-card-stack';
import type { useSavedHotspots } from '@/features/routes/map/use-saved-hotspots';
import type { useSavedRoutes } from '@/features/routes/map/use-saved-routes';
import type { HotspotRow } from '@/features/routes/model/hotspots';
import type { DirectionRow } from '@/features/routes/model/routes';
import { StudioRouteList } from '@/features/studio';

import { PlaygroundListControls } from './playground-list-controls';

interface PlaygroundListProps {
  map: MapLibreMap | null;
  saved: ReturnType<typeof useSavedRoutes<DirectionRow>>;
  hotspots: ReturnType<typeof useSavedHotspots<HotspotRow>>;
  cards: ReturnType<typeof useCardStack<DirectionRow, HotspotRow>>;
  camera: ReturnType<typeof useCardCamera<DirectionRow, HotspotRow>>;
  /** A computer's screen: the list fills the left panel, its controls on the map. */
  isWideScreen: boolean;
  /** The left panel area's host, hidden on the studio's other maps. */
  leftPanel: HTMLElement | null;
}

/**
 * Several saved things under one click: the public map's list, kept hidden behind the trip picked
 * from it. It lists only what is drawn, the owner's way. On a computer it fills the left panel
 * (StudioRouteList) and Vice Versa, the filter and the Overview stand on the map beside it; on a
 * phone it is the sheet with its Controller: ✕, PAPUNTA and the filter.
 */
export function PlaygroundList({
  map,
  saved,
  hotspots,
  cards,
  camera,
  isWideScreen,
  leftPanel,
}: PlaygroundListProps) {
  const { choice, choosing, closeAll, height } = cards;
  const { flipList, filterList, openTrip } = camera;
  if (!choosing) return null;

  const key = choice.map((c) => c.id).join();
  const isHidden = !!saved.selected;
  const modeFilter = { picks: saved.modePicks, onPicks: filterList };
  const selection = {
    selected: saved.highlight?.where === 'list' ? saved.highlight.card : null,
    onSelect: (p: PickedPlace | null) => saved.highlightCard(p && { where: 'list', ...p }),
  };
  const handleHotspot = (s: HotspotRow) => cards.openHotspot(s.id);

  if (!isWideScreen) {
    return (
      <RouteCardList
        hasController
        key={key}
        hidden={isHidden}
        height={height}
        routes={saved.candidates}
        hotspots={hotspots.candidates}
        back={saved.back}
        listing={saved.listing}
        onFlip={flipList}
        modeFilter={modeFilter}
        selection={selection}
        onRoute={openTrip}
        onHotspot={handleHotspot}
        onClose={closeAll}
      />
    );
  }
  return (
    <>
      {!isHidden && (
        <PlaygroundListControls
          map={map}
          list={saved}
          overview={camera.overviewButton}
          onFlip={flipList}
          onFilter={filterList}
        />
      )}
      {leftPanel &&
        createPortal(
          <StudioRouteList
            key={key}
            hidden={isHidden}
            routes={saved.candidates}
            hotspots={hotspots.candidates}
            back={saved.back}
            listing={saved.listing}
            modeFilter={modeFilter}
            selection={selection}
            onRoute={openTrip}
            onHotspot={handleHotspot}
            onClose={closeAll}
          />,
          leftPanel,
        )}
    </>
  );
}
