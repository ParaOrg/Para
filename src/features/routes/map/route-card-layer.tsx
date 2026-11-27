import type { MapLibreMap } from 'maplibre-gl';
import { Fragment, type ReactNode } from 'react';

import { MapSheetControls } from './map-sheet-controls';
import { RideMarks } from './ride-marks';
import { openPlaceOf, openTripOf, type OpenPlace, type OpenTrip } from './route-card-slots';
import type { RouteCardsState } from './use-route-cards';
import type { useSavedHotspots } from './use-saved-hotspots';
import type { useSavedRoutes } from './use-saved-routes';
import { RouteCardList } from '../cards/route-card-list';
import type { PickedPlace } from '../cards/route-card-stack';
import type { Hotspot } from '../model/hotspots';
import { placeKey } from '../model/places';
import type { Direction } from '../model/routes';

interface RouteCardLayerProps<V extends Direction, S extends Hotspot> {
  map: MapLibreMap | null;
  saved: ReturnType<typeof useSavedRoutes<V>>;
  hotspots: ReturnType<typeof useSavedHotspots<S>>;
  /** What useRouteCards keeps. */
  routeCards: RouteCardsState<V, S>;
  /** The open trip's card: the public map's TripCard. */
  renderTrip: (trip: OpenTrip<V, S>) => ReactNode;
  /** A hotspot's card: the public map's HintuanCard. */
  renderPlace: (place: OpenPlace<V, S>) => ReactNode;
  /** At the route list's end, after its cards: the public map's donation card. */
  listEnd?: ReactNode;
  /**
   * The page's own, drawn after the cards' controls and before the ride's marks; and after the
   * marks and before the cards. Elements later in the page stack over earlier ones, markers in the
   * order they are added, and focus moves in this order, so the page keeps its own between.
   */
  besideControls?: ReactNode;
  underCards?: ReactNode;
}

/**
 * The route cards on a map: the controls for the card on show (MapSheetControls), the lit rides'
 * and the open trip's marks, the open trip, a hotspot's card and the route list. The trip comes
 * before the hotspot's card on purpose: the suites' first `card` is then the trip. The page
 * draws the two cards (`renderTrip`, `renderPlace`), so each app keeps its own.
 */
export function RouteCardLayer<V extends Direction, S extends Hotspot>({
  map,
  saved,
  hotspots,
  routeCards,
  renderTrip,
  renderPlace,
  listEnd,
  besideControls,
  underCards,
}: RouteCardLayerProps<V, S>) {
  const { cards, camera, listUp, floats, options } = routeCards;
  const trip = openTripOf(saved, routeCards);
  const place = openPlaceOf(saved, hotspots, routeCards);

  return (
    <>
      <MapSheetControls
        map={map}
        overview={camera.overviewButton}
        list={listUp}
        floats={floats}
        onFlip={camera.flipList}
        onSnap={cards.height.onSnap}
        onFilter={camera.filterList}
        place={{
          isBesideCredits: options.isBesideCredits,
          isAtTopLeft: options.isTripBeside && !!saved.selected,
        }}
      />
      {besideControls}
      <RideMarks map={map} saved={saved} hotspots={hotspots} routeCards={routeCards} />
      {underCards}
      {trip && renderTrip(trip)}
      {/* Keyed by the place: another of its boxes, a row or SWITCH, keeps the card as it is. */}
      {place && <Fragment key={placeKey(place.hotspot)}>{renderPlace(place)}</Fragment>}
      {/*
        Several things under the tap: the route list, kept hidden behind the trip picked from it,
        whole, for the trip to go back to; a hotspot's row opens its card in the list's place.
      */}
      {cards.choosing && (
        <RouteCardList
          key={cards.choice.map((c) => c.id).join()}
          hidden={!!saved.selected || cards.tripBehind}
          height={cards.height}
          routes={saved.candidates}
          hotspots={hotspots.candidates}
          back={saved.back}
          listing={saved.listing}
          modeFilter={{ picks: saved.modePicks, onPicks: camera.filterList }}
          selection={options.isCardSelectable ? listSelection(saved) : undefined}
          onRoute={camera.openTrip}
          onHotspot={(s) => cards.openHotspot(s.id)}
          onClose={cards.closeAll}
          end={listEnd}
        />
      )}
    </>
  );
}

/** The list's Selected card, where a tap off its rows selects one (isCardSelectable). */
function listSelection<V extends Direction>(saved: ReturnType<typeof useSavedRoutes<V>>) {
  return {
    selected: saved.highlight?.where === 'list' ? saved.highlight.card : null,
    onSelect: (p: PickedPlace | null) => saved.highlightCard(p && { where: 'list', ...p }),
  };
}
