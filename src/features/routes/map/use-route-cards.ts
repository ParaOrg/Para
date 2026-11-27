import type { MapLibreMap } from 'maplibre-gl';
import type { RefObject } from 'react';

import { noop } from '@/shared/utils/noop';

import { useCardCamera } from './use-card-camera';
import { useCardStack } from './use-card-stack';
import { useEmptyMapTap } from './use-empty-map-tap';
import { useLitRides } from './use-lit-rides';
import { useLoopTip } from './use-loop-tip';
import { useMapFloats } from './use-map-floats';
import type { useSavedHotspots } from './use-saved-hotspots';
import type { useSavedRoutes } from './use-saved-routes';
import { useBackClosesCards, type Hush } from '../cards/use-back-closes-cards';
import { useTripTimeline } from '../cards/use-trip-timeline';
import type { Hotspot } from '../model/hotspots';
import type { CommuterWhere } from '../model/loop-tip';
import type { Direction } from '../model/routes';

/**
 * How a page wants the route cards to behave; an optional switch defaults to the public map's way.
 */
export interface RouteCardsOptions {
  /** Wraps the cards' ‹ and ✕ and Back, so going back hushes the dot's gaze (useGazeHush). */
  hush: Hush;
  /**
   * Where the commuter is, as the locator last said, read once as a loop's trip opens to choose
   * its tip (useLoopTip). A ref, as a fix renders nothing. Null, or left out, where no locator is.
   */
  where?: RefObject<CommuterWhere | null> | null;
  /** A hintuan can be picked on the trip and on the map, and a ride's start set (the env flag). */
  isRidePickingOn: boolean;
  /**
   * Whether the cards answer Back and the empty map tapped. Default true; the studio's is false
   * while it draws or shows another of its maps, the cards hidden or out of reach.
   */
  isActive?: boolean;
  /**
   * A card of the page's own standing in the cards' place, and what closes it: the empty map
   * tapped and Back close it, as they leave a trip. The studio's draft-only route detail; default
   * none.
   */
  ownCard?: { close: () => void } | null;
  /** Layers the page draws and answers itself (the studio's drafts): a tap on one is not empty. */
  ownLayers?: readonly string[];
  /**
   * A tap on a list's card off its rows selects it, lighting its routes with their chevrons and
   * ends; a lit route then wears them with no trip open. Kept for the studio to switch on should
   * the owner want it. Default false: the tap opens its first row's trip, and only an open trip
   * wears them.
   */
  isCardSelectable?: boolean;
  /** The direction the studio is redrawing: none of its green stretches over the draft. */
  hiddenDirectionId?: string | null;
  /**
   * On a phone the cards' controls (MapSheetControls) stand right of the map's ⓘ, which the
   * studio keeps at the bottom left. Default false: 16 in, the public map's ⓘ in its top corner.
   */
  isBesideCredits?: boolean;
  /**
   * The open trip stands beside the map, not on it (the studio's left panel on a computer): its
   * controls stand at the map's top left, following no sheet. Default false.
   */
  isTripBeside?: boolean;
}

const NO_LAYERS: readonly string[] = [];

/**
 * The route cards' shared state, for the public map and the studio: the route list, a
 * hotspot's card and the trip opened from either (useCardStack), the camera with them
 * (useCardCamera), what the lit routes wear (useLitRides), the open trip's timeline and a loop's
 * tip, and what Back, Escape and the empty map tapped close. RouteCardLayer draws it.
 *
 * The page calls it before its own useTurn: the cards' camera (useCardCamera) then moves before
 * the locator's camera, which runs at the page's turn after it (commit-turn.ts) and so moves last.
 */
export function useRouteCards<V extends Direction, S extends Hotspot>(
  map: MapLibreMap | null,
  saved: ReturnType<typeof useSavedRoutes<V>>,
  hotspots: ReturnType<typeof useSavedHotspots<S>>,
  {
    hush,
    where = null,
    isRidePickingOn,
    isActive = true,
    ownCard = null,
    ownLayers = NO_LAYERS,
    isCardSelectable = false,
    hiddenDirectionId = null,
    isBesideCredits = false,
    isTripBeside = false,
  }: RouteCardsOptions,
) {
  // A loop's trip leaves from where the commuter is, or the place it was opened from.
  const tipId = useLoopTip(saved.selected, hotspots, { where, openedFrom: hotspots.selected });
  // Which card is up, what stands behind what, their height and colours.
  const cards = useCardStack(map, saved, hotspots);
  // The camera with the cards: a hintuan picked on the trip, gliding there; the camera from
  // before a hotspot's card was picked, back as it is let go.
  const camera = useCardCamera(map, saved, hotspots, cards, { tipId });
  // A picked hintuan's ride flowing only as far as there.
  const { ridden, startId } = camera.ride;
  const rides = useLitRides(
    map,
    saved,
    hotspots.hotspots,
    hiddenDirectionId,
    ridden,
    startId,
    tipId,
    !isCardSelectable,
  );
  useBackClosesCards(saved, hotspots, cards, camera.backFromTrip, hush, { isActive, ownCard });
  // The empty map tapped, Escape or a pull down: the trip's ‹, which it no longer draws.
  const leaveTrip = hush(camera.backFromTrip) ?? cards.closeAll;
  const emptyTap = ownCard?.close ?? (saved.selected ? leaveTrip : null);
  // Out of play with something open (the studio's other maps), an empty tap is claimed and does
  // nothing: the routes' own taps would otherwise close what waits there.
  const isWaiting = !isActive && (cards.open || ownCard !== null);
  useEmptyMapTap(map, isActive ? emptyTap : isWaiting ? noop : null, ownLayers);
  // The open trip's hintuans, worked out once per trip.
  const timeline = useTripTimeline(saved.selected, hotspots, tipId);
  const floats = useMapFloats(camera.root);
  // The list's controls on the map, while the list is what is up.
  const listUp = cards.choosing && !saved.selected && !cards.tripBehind ? saved : null;

  return {
    cards,
    camera,
    rides,
    timeline,
    leaveTrip,
    listUp,
    floats,
    /** A hotspot's card's ‹ back to the trip it was opened over, hushed; null: no ‹. */
    backToTrip: hush(cards.backToTrip),
    /** A hotspot's card's ✕, hushed. */
    closePlace: hush(cards.closeHotspot),
    options: { isRidePickingOn, isCardSelectable, isBesideCredits, isTripBeside },
  };
}

/** What useRouteCards gives the page and RouteCards. */
export type RouteCardsState<V extends Direction, S extends Hotspot> = ReturnType<
  typeof useRouteCards<V, S>
>;
