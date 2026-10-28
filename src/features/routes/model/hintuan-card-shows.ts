import { drawnDepartures } from './departures';
import type { Hotspot } from './hotspots';
import { boxTheOtherWay, placeBoxes } from './places';
import { isLoop, type Direction } from './routes';

/** What a hotspot's HintuanCard is shown: its box, the place around it, and the way round asked for. */
export interface HintuanCardInputs<V extends Direction> {
  /** The box picked: the one tapped on the map, or a row since. */
  hotspot: Hotspot;
  /** Every hotspot, for the other boxes of its place. */
  hotspots: readonly Hotspot[];
  /** The directions that stop at a box, by its id. */
  linkedDirectionIds: (id: string) => readonly string[];
  directions: readonly V[];
  /** No row Selected: the routes are the whole place's. */
  deselected: boolean;
  /** The way round SWITCH asked for, true for the way back: heeded where the routes run both ways. */
  flipped: boolean;
}

/** What the card shows for its inputs: its rows, its routes and which way round, and where SWITCH goes. */
export interface HintuanCardShows<V extends Direction> {
  /** A row per box of the place, in placeBoxes' order. */
  rows: { box: Hotspot; label: string }[];
  /** What the routes below are of: the Selected box's, or with none, every box's, each once. */
  routes: V[];
  /** Whether the routes show the way back. */
  back: boolean;
  /** The directions the RouteCards show, the way round `back` has them. */
  showing: V[];
  /** Their ids: what the map lights. */
  shown: string[];
  /** How many RouteCards, a head route each: the counter's number. */
  heads: number;
  /** Where SWITCH takes the selection, here or another box of the place; null when it is disabled. */
  switchTo: Hotspot | null;
}

/**
 * The HintuanCard's rule for what it shows. The routes below are those of the
 * Selected box, or with no row Selected those of every box of the place. They
 * show one way round: the way asked for (`flipped`) when they run both ways,
 * else the one way they run. SWITCH turns them here when these routes run both
 * ways, else at the nearest box of the place passed the other way, and with no
 * row Selected, where the whole place already shows, nowhere.
 */
export function hintuanCardShows<V extends Direction>({
  hotspot,
  hotspots,
  linkedDirectionIds,
  directions,
  deselected,
  flipped,
}: HintuanCardInputs<V>): HintuanCardShows<V> {
  const rows = placeBoxes(
    hotspot,
    hotspots.some((s) => s.id === hotspot.id) ? hotspots : [hotspot, ...hotspots],
  );
  const byId = new Map(directions.map((v) => [v.id, v]));
  const linked = (id: string) =>
    linkedDirectionIds(id)
      .map((v) => byId.get(v))
      .filter((v): v is V => !!v);
  // A loop is passed both ways round, so it never decides which way a box is passed.
  const passes = (id: string, isBack: boolean) =>
    drawnDepartures(
      linked(id).filter((v) => !isLoop(v)),
      isBack,
    ).length > 0;

  const routes = deselected
    ? [...new Map(rows.flatMap((r) => linked(r.box.id)).map((v) => [v.id, v])).values()]
    : linked(hotspot.id);

  const twoEnded = routes.filter((v) => !isLoop(v));
  const there = drawnDepartures(twoEnded, false).length > 0;
  const backToo = drawnDepartures(twoEnded, true).length > 0;
  const back = there && backToo ? flipped : backToo;
  const departing = drawnDepartures(routes, back);
  const showing = departing.flatMap((p) => p.directions.map((d) => d.v));

  const switchTo =
    there && backToo
      ? hotspot
      : deselected
        ? null
        : boxTheOtherWay(
            hotspot,
            rows.map((r) => r.box),
            (id) => passes(id, !back),
          );

  return {
    rows,
    routes,
    back,
    showing,
    shown: showing.map((v) => v.id),
    heads: departing.length,
    switchTo,
  };
}
