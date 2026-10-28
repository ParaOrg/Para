import type { MapLibreMap } from 'maplibre-gl';

import type { useGazeHush } from '@/features/locator';
import { RouteCardList } from '@/features/routes/cards/route-card-list';
import type { useCardCamera } from '@/features/routes/map/use-card-camera';
import type { useCardStack } from '@/features/routes/map/use-card-stack';
import type { useSavedHotspots } from '@/features/routes/map/use-saved-hotspots';
import type { useSavedRoutes } from '@/features/routes/map/use-saved-routes';
import type { HotspotRow } from '@/features/routes/model/hotspots';
import type { DirectionRow } from '@/features/routes/model/routes';
import {
  StudioHotspotCard,
  StudioTripCard,
  type useDeleteActions,
  type useDrawing,
  type useFollow,
  type useStudioTrip,
} from '@/features/studio';

import { PlaygroundMarks } from './playground-marks';

interface PlaygroundCardsProps {
  map: MapLibreMap | null;
  draw: ReturnType<typeof useDrawing>;
  saved: ReturnType<typeof useSavedRoutes<DirectionRow>>;
  hotspots: ReturnType<typeof useSavedHotspots<HotspotRow>>;
  cards: ReturnType<typeof useCardStack<DirectionRow, HotspotRow>>;
  camera: ReturnType<typeof useCardCamera<DirectionRow, HotspotRow>>;
  trip: ReturnType<typeof useStudioTrip>;
  canEdit: boolean;
  opening: ReturnType<typeof useFollow>['opening'];
  deletes: ReturnType<typeof useDeleteActions>;
  hush: ReturnType<typeof useGazeHush>['hush'];
  onDrawReturnTrip: (routeId: string) => void;
}

/**
 * The Playground's cards over the map, as on the public map: the trip's marks
 * on the map (PlaygroundMarks), the trip card, a hotspot's card and the route
 * list.
 */
export function PlaygroundCards({
  map,
  draw,
  saved,
  hotspots,
  cards,
  camera,
  trip,
  canEdit,
  opening,
  deletes,
  hush,
  onDrawReturnTrip,
}: PlaygroundCardsProps) {
  const { choice, choosing, closeAll, tripLivery, litLivery, height } = cards;
  const {
    ride,
    tripDock,
    clearOfOpen,
    switchTrip,
    flipList,
    pickOnPlaceCard,
    openTrip,
    backFromTrip,
    pickOnTrip,
    endOnTrip,
  } = camera;
  const { rides, timeline } = trip;

  return (
    <>
      <PlaygroundMarks
        map={map}
        isDrawing={draw.drawing}
        selected={saved.selected}
        hotspots={hotspots.hotspots}
        rides={rides}
        timeline={timeline}
        ride={ride}
        tripLivery={tripLivery}
        litLivery={litLivery}
        onPick={pickOnTrip}
      />

      {/*
        The tapped direction as the public map's trip card, the editor's facts
        and its Edit, Extend and Delete under its tiles. Keyed on the route,
        unlike the public map's: SWITCH keeps the card and its colour.
      */}
      {!draw.drawing && saved.selected && tripLivery && timeline && (
        <StudioTripCard
          key={saved.selected.routeId}
          direction={saved.selected}
          saved={saved}
          hotspots={hotspots}
          draw={draw}
          timeline={timeline}
          livery={tripLivery}
          ride={ride}
          tripDock={tripDock}
          height={height}
          canEdit={canEdit}
          opening={opening}
          onDelete={deletes.onDelete}
          onBackToList={hush(backFromTrip)}
          onSwitch={switchTrip}
          onDrawOtherWay={() => {
            const routeId = saved.selected?.routeId;
            if (!routeId) return;
            closeAll();
            onDrawReturnTrip(routeId);
          }}
          onClose={closeAll}
          onPick={pickOnTrip}
          onEnd={endOnTrip}
        />
      )}

      {/*
        A hotspot's card, its routes as RouteCards; it stays behind the trip
        picked from them, hidden, for the trip's ‹. After the trip on
        purpose, as on the public map: the suites' first `card` is the trip.
      */}
      {!draw.drawing && hotspots.selected && (
        <StudioHotspotCard
          key={hotspots.selected.id}
          hotspot={hotspots.selected}
          map={map}
          saved={saved}
          hotspots={hotspots}
          draw={draw}
          height={height}
          canEdit={canEdit}
          clearOfOpen={clearOfOpen}
          onPickOnPlaceCard={pickOnPlaceCard}
          onOpenTrip={openTrip}
          onDeleteHotspot={deletes.onDeleteHotspot}
          onCloseAll={closeAll}
          onClose={hush(cards.closeHotspot)}
        />
      )}

      {/*
        Several saved things under one click: the same list the public map
        has, kept hidden behind the trip picked from it. It lists only what is
        drawn, and the owner keeps it so.
      */}
      {!draw.drawing && choosing && (
        <RouteCardList
          key={choice.map((c) => c.id).join()}
          hidden={!!saved.selected}
          height={height}
          routes={saved.candidates}
          hotspots={hotspots.candidates}
          back={saved.back}
          onFlip={flipList}
          selected={saved.highlight?.where === 'list' ? saved.highlight.card : null}
          onSelect={(p) => saved.highlightCard(p && { where: 'list', ...p })}
          onRoute={openTrip}
          onHotspot={(s) => cards.openHotspot(s.id)}
          onClose={closeAll}
        />
      )}
    </>
  );
}
