import { RouteCard } from './route-card';
import { routeCards, type Listing } from '../model/departures';
import { isRoadLivery, type Livery } from '../model/liveries';
import { stationCode } from '../model/rail-codes';
import { directionEnds, railLineOf, type Direction } from '../model/routes';
import { isRailwayVehicle } from '../model/vehicles';

/** A card picked: which card it is, the place it stands for, the directions its rows list, and its colour, for the map to light them in. */
export interface PickedPlace {
  /** The card's key (routeCards): a place has a card per mode, and per train line and bound. */
  card: string;
  from: string;
  ids: readonly string[];
  livery: Livery;
}

interface Props {
  /** Every direction of every route to show, slots included, as the hooks hand them over. */
  routes: readonly Direction[];
  /** Whether they are shown the way back rather than outbound. */
  back: boolean;
  /** The way round alone, or every line, a route with none drawn that way by its other: the route list's (routeCards). */
  listing?: Listing;
  /**
   * The card that is Selected, by its key (PickedPlace's card), and what picks one or lets it go
   * (null): the studio's alone, its editors keep Selected. Without them a card opens on a tap.
   */
  selection?: { selected: string | null; onSelect: (place: PickedPlace | null) => void };
  /** Called with the direction a row opens, and the colour its card wore: its trip wears the same. */
  onRoute: (v: Direction, livery: Livery) => void;
  /** What the suites call each card and row (RouteCard). */
  testId: 'chooser' | 'card';
}

/** The station a train card's directions leave, as its line's table codes it; null on the ferry or an unknown station. */
function originCodeOf(directions: readonly { v: Direction }[]): string | null {
  const [first] = directions;
  const line = first && railLineOf(first.v);
  return first && line ? stationCode(line, directionEnds(first.v).from) : null;
}

/** A row's station code at its end, as its line's table codes it; null off a train line or for an unknown station. */
function endCodeOf(v: Direction): string | null {
  const line = railLineOf(v);
  return line && stationCode(line, directionEnds(v).to);
}

/**
 * Routes one way round as RouteCards, edge to edge (RouteCardStackedList, 4633:19780): a card per
 * place they leave from and mode, run by mode (routeCards), and per train line and bound or the
 * ferry, each in its livery — its first row's mode's, or a train's or the ferry's line's own
 * (liveryOf) — with a row per drawn direction. Every card shows its mode, the cards after one of
 * the same mode too. A row opens its trip; a tap elsewhere on a card opens its first row's. With
 * `selection` (the studio's), that tap selects the card instead, one at a
 * time, and the map lights its directions alone; a row still opens its trip and picks none. The route
 * list stacks them over its Controller; the public map's HintuanCard under its place's boxes, the
 * routes stopping at the Selected one; the studio's hotspot card under "Routes that pass through",
 * or a terminal's "Routes that stage here".
 */
export function RouteCardStack({
  routes,
  back,
  listing = 'way-round',
  selection,
  onRoute,
  testId,
}: Props) {
  const places = routeCards(routes, back, listing);

  const byId = new Map(places.flatMap((p) => p.directions.map((d) => [d.v.id, d.v] as const)));

  const pick = (
    p: (typeof places)[number],
    { selected, onSelect }: NonNullable<Props['selection']>,
  ) =>
    onSelect(
      selected === p.card
        ? null
        : {
            card: p.card,
            from: p.from,
            ids: p.directions.map((d) => d.v.id),
            livery: p.livery,
          },
    );
  const open = (id: string, livery: Livery) => {
    const v = byId.get(id);
    if (v) onRoute(v, livery);
  };

  return (
    <>
      {places.map((p) => (
        <RouteCard
          key={p.card}
          testId={testId}
          ride={
            p.railway
              ? {
                  kind: 'rail',
                  railway: p.railway,
                  bound: p.bound,
                  originCode: originCodeOf(p.directions),
                }
              : // A road card's livery is its mode's; one unnamed wears Jeep's, as liveryOf has it.
                {
                  kind: 'road',
                  livery: isRoadLivery(p.livery) ? p.livery : 'jeep',
                  vehicle: p.vehicle && !isRailwayVehicle(p.vehicle) ? p.vehicle : null,
                }
          }
          routeOrigin={p.from}
          endPoints={p.directions.map((d) => ({
            id: d.v.id,
            destination: d.to,
            via: d.via,
            stationCode: endCodeOf(d.v),
          }))}
          selection={
            selection && {
              state: selection.selected === p.card ? 'selected' : 'rest',
              onSelect: () => pick(p, selection),
            }
          }
          onPick={(id) => open(id, p.livery)}
        />
      ))}
    </>
  );
}
