import {
  listedDepartures,
  otherWayHasRoutes,
  routeCards,
  switchWord,
  wayWord,
  type Listing,
} from '../model/departures';
import { passesModePicks, type ModePicks } from '../model/mode-filter';
import { isLoop, type Direction } from '../model/routes';

/** The way round a route list shows, for the control that turns it: PAPUNTA, or Vice Versa. */
export interface ListWay {
  /** The way showing (wayWord), or null when only loops show: they have no way back, so no control. */
  way: string | null;
  /** Where a tap leads (switchWord), the control's spoken hint. */
  wayTo: string;
  /** False when the other way round has nothing drawn: the control rests disabled. */
  isSwitchable: boolean;
}

/** How many RouteCards a list shows under the picks, as RouteCardList counts them. */
export function listedRouteCount(
  routes: readonly Direction[],
  back: boolean,
  listing: Listing,
  picks: ModePicks,
): number {
  return routeCards(
    routes.filter((v) => passesModePicks(v, picks)),
    back,
    listing,
  ).length;
}

/**
 * The way round of the routes a list shows, the filter applied, as RouteCardList lists them, for
 * Vice Versa on the map (MapSheetControls).
 */
export function listWay(
  routes: readonly Direction[],
  back: boolean,
  listing: Listing,
  picks: ModePicks,
): ListWay {
  const filtered = routes.filter((v) => passesModePicks(v, picks));
  const shown = listedDepartures(filtered, back, listing).flatMap((p) =>
    p.directions.map((d) => d.v),
  );
  return {
    way: shown.length > 0 && shown.every(isLoop) ? null : wayWord(back, shown),
    wayTo: switchWord(back, shown),
    isSwitchable: otherWayHasRoutes(filtered, back),
  };
}
