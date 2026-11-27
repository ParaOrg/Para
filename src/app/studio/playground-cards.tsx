import type { MapLibreMap } from 'maplibre-gl';

import type { useGazeHush } from '@/features/locator';
import type { useCardCamera } from '@/features/routes/map/use-card-camera';
import type { useCardStack } from '@/features/routes/map/use-card-stack';
import type { useSavedHotspots } from '@/features/routes/map/use-saved-hotspots';
import type { useSavedRoutes } from '@/features/routes/map/use-saved-routes';
import type { HotspotRow } from '@/features/routes/model/hotspots';
import type { DirectionRow } from '@/features/routes/model/routes';
import {
  StudioHotspotCard,
  type useDeleteActions,
  type useDrawing,
  type useFollow,
  type useOpenDraft,
  type useStudioTrip,
} from '@/features/studio';

import { PlaygroundDraftTrip } from './playground-draft-trip';
import { PlaygroundList } from './playground-list';
import { PlaygroundMarks } from './playground-marks';
import { PlaygroundTrip } from './playground-trip';

interface PlaygroundCardsProps {
  map: MapLibreMap | null;
  draw: ReturnType<typeof useDrawing>;
  saved: ReturnType<typeof useSavedRoutes<DirectionRow>>;
  hotspots: ReturnType<typeof useSavedHotspots<HotspotRow>>;
  cards: ReturnType<typeof useCardStack<DirectionRow, HotspotRow>>;
  camera: ReturnType<typeof useCardCamera<DirectionRow, HotspotRow>>;
  trip: ReturnType<typeof useStudioTrip>;
  canEdit: boolean;
  /** A computer's screen: a trip opens in the left panel. */
  isWideScreen: boolean;
  /** The left panel area's host for the route list and the route line detail. */
  leftPanel: HTMLElement | null;
  /** A route that is a draft only, open from its draft (useOpenDraft). */
  draftTrip: ReturnType<typeof useOpenDraft>['trip'];
  opening: ReturnType<typeof useFollow>['opening'];
  deletes: ReturnType<typeof useDeleteActions>;
  hush: ReturnType<typeof useGazeHush>['hush'];
  onDrawReturnTrip: (routeId: string) => void;
}

/**
 * The Playground's cards, as on the public map (marks, trip, hotspot, list); a tap selects a card.
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
  isWideScreen,
  leftPanel,
  draftTrip,
  opening,
  deletes,
  hush,
  onDrawReturnTrip,
}: PlaygroundCardsProps) {
  const { closeAll, tripLivery, litLivery, height } = cards;
  const { ride, clearOfOpen, pickOnPlaceCard, openTrip, pickOnTrip } = camera;
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

      {/* The open trip: the trip card on a phone, the route line detail on a computer. */}
      <PlaygroundTrip
        map={map}
        draw={draw}
        saved={saved}
        hotspots={hotspots}
        cards={cards}
        camera={camera}
        trip={trip}
        canEdit={canEdit}
        isWideScreen={isWideScreen}
        leftPanel={leftPanel}
        opening={opening}
        deletes={deletes}
        hush={hush}
        onDrawReturnTrip={onDrawReturnTrip}
      />
      {draftTrip && isWideScreen && leftPanel && !draw.drawing && (
        <PlaygroundDraftTrip
          map={map}
          trip={draftTrip}
          saved={saved}
          hotspots={hotspots}
          draw={draw}
          canEdit={canEdit}
          leftPanel={leftPanel}
          opening={opening}
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

      {!draw.drawing && (
        <PlaygroundList
          map={map}
          saved={saved}
          hotspots={hotspots}
          cards={cards}
          camera={camera}
          isWideScreen={isWideScreen}
          leftPanel={leftPanel}
        />
      )}
    </>
  );
}
