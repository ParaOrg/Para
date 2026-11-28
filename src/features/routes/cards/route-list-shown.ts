import { listedDepartures, routeCards, type Listing } from '../model/departures';
import type { Hotspot } from '../model/hotspots';
import { isNarrowed, passesModePicks, type ModePicks } from '../model/mode-filter';
import { hotspotCount } from '../model/places';
import type { Direction } from '../model/routes';

/** What a route list shows under the filter's picks, wherever it stands (a sheet, the studio's panel). */
export interface RouteListShown {
  /** The routes the picks let through, every way round, for RouteCardStack. */
  routes: readonly Direction[];
  /** The picks narrow the list to nothing: ModeFilterEmpty says so in the cards' place. */
  isEmptyUnderPicks: boolean;
  /** How many RouteCards it shows: a place and mode each, so a place two modes leave from counts twice. */
  cardTotal: number;
  /**
   * Its name for a screen reader: its count of cards, "1 Route" for Tala with its two ways out;
   * only with no route to count, its hotspots, "2 Hotspots", as a rider counts them (hotspotCount).
   */
  label: string;
}

/** The routes and the count a route list shows, the filter applied, as RouteCardList lists them. */
export function routeListShown(
  routes: readonly Direction[],
  hotspots: readonly Hotspot[],
  back: boolean,
  listing: Listing,
  picks: ModePicks,
): RouteListShown {
  const filtered = routes.filter((v) => passesModePicks(v, picks));
  const cardTotal = routeCards(filtered, back, listing).length;
  const hotspotTotal = hotspotCount(hotspots);
  const label =
    cardTotal === 0 && hotspotTotal > 0
      ? `${hotspotTotal} ${hotspotTotal === 1 ? 'Hotspot' : 'Hotspots'}`
      : `${cardTotal} ${cardTotal === 1 ? 'Route' : 'Routes'}`;
  return {
    routes: filtered,
    isEmptyUnderPicks: isNarrowed(picks) && listedDepartures(filtered, back, listing).length === 0,
    cardTotal,
    label,
  };
}
