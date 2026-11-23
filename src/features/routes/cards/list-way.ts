import {
  listedDepartures,
  otherWayHasRoutes,
  switchWord,
  wayWord,
  type Listing,
} from '../model/departures';
import { passesModeFilter, type ModeFilter } from '../model/mode-filter';
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

/**
 * The way round of the routes a list shows, the filter applied, as RouteCardList lists them: the
 * studio's Controller and the public map's Vice Versa read the same.
 */
export function listWay(
  routes: readonly Direction[],
  back: boolean,
  listing: Listing,
  filter: ModeFilter,
): ListWay {
  const filtered = routes.filter((v) => passesModeFilter(v, filter));
  const shown = listedDepartures(filtered, back, listing).flatMap((p) =>
    p.directions.map((d) => d.v),
  );
  return {
    way: shown.length > 0 && shown.every(isLoop) ? null : wayWord(back, shown),
    wayTo: switchWord(back, shown),
    isSwitchable: otherWayHasRoutes(filtered, back),
  };
}
