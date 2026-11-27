import type { MapLibreMap } from 'maplibre-gl';

import { RouteCardList } from '@/features/routes/cards/route-card-list';
import type { PickedPlace } from '@/features/routes/cards/route-card-stack';
import type { useCardCamera } from '@/features/routes/map/use-card-camera';
import type { useCardStack } from '@/features/routes/map/use-card-stack';
import type { useSavedHotspots } from '@/features/routes/map/use-saved-hotspots';
import type { useSavedRoutes } from '@/features/routes/map/use-saved-routes';
import type { HotspotRow } from '@/features/routes/model/hotspots';
import type { DirectionRow } from '@/features/routes/model/routes';

import { PlaygroundListControls } from './playground-list-controls';

interface PlaygroundListProps {
  map: MapLibreMap | null;
  saved: ReturnType<typeof useSavedRoutes<DirectionRow>>;
  hotspots: ReturnType<typeof useSavedHotspots<HotspotRow>>;
  cards: ReturnType<typeof useCardStack<DirectionRow, HotspotRow>>;
  camera: ReturnType<typeof useCardCamera<DirectionRow, HotspotRow>>;
  /** A computer's screen: the list docks on the map's left, its controls on the map beside it. */
  isWideScreen: boolean;
}

/**
 * Several saved things under one click: the public map's list, kept hidden behind the trip picked
 * from it. It lists only what is drawn, the owner's way. On a computer it docks on the map's left
 * as the public map's does, ending at its last card with the map below it, and Vice Versa, the
 * filter and the Overview stand on the map beside it (Figma 4905:21658); on a phone it is the
 * sheet with its Controller: ✕, PAPUNTA and the filter.
 */
export function PlaygroundList({
  map,
  saved,
  hotspots,
  cards,
  camera,
  isWideScreen,
}: PlaygroundListProps) {
  const { choice, choosing, closeAll, height } = cards;
  const { flipList, filterList, openTrip } = camera;
  if (!choosing) return null;

  const key = choice.map((c) => c.id).join();
  // Behind a trip picked from it, and behind a place's card a trip opened over (tripBehind), as
  // the public map keeps it: one card answers Escape at a time.
  const isHidden = !!saved.selected || cards.tripBehind;
  const modeFilter = { picks: saved.modePicks, onPicks: filterList };
  const selection = {
    selected: saved.highlight?.where === 'list' ? saved.highlight.card : null,
    onSelect: (p: PickedPlace | null) => saved.highlightCard(p && { where: 'list', ...p }),
  };
  const handleHotspot = (s: HotspotRow) => cards.openHotspot(s.id);

  // On a computer the list docks on the map's left, as the public map's does, its controls on the
  // map beside it instead of the phone's Controller.
  return (
    <>
      {isWideScreen && !isHidden && (
        <PlaygroundListControls
          map={map}
          list={saved}
          overview={camera.overviewButton}
          onFlip={flipList}
          onFilter={filterList}
        />
      )}
      <RouteCardList
        hasController={!isWideScreen}
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
    </>
  );
}
