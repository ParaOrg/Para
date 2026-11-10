import type { ReactNode } from 'react';

import { RouteCard } from './route-card';
import { routeCards, type Listing } from '../model/departures';
import { isRoadLivery, type Livery } from '../model/liveries';
import { stationCode } from '../model/rail-codes';
import { directionEnds, railLineOf, type Direction } from '../model/routes';
import { vehicleOf } from '../model/vehicles';

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
  /** The card that is Selected, by its key (PickedPlace's card); null when none is. */
  selected: string | null;
  /** A card was picked, or let go (null). */
  onSelect: (place: PickedPlace | null) => void;
  /** Called with the direction a row opens, and the colour its card wore: its trip wears the same. */
  onRoute: (v: Direction, livery: Livery) => void;
  /** What the suites call each card and row (RouteCard). */
  testId: 'chooser' | 'card';
  /** Drawn after the last card, handed that card's livery; nothing when no card is listed. */
  end?: (livery: Livery) => ReactNode;
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
 * the same mode too. One card at a time is Selected, and the map lights its directions alone; a
 * row opens its trip straight away, whether its card is picked or not, and picks none: selecting it
 * too is confusing, and the trip's ‹ comes back to every card at rest. The route
 * list stacks them over its Controller; the public map's HintuanCard under its place's boxes, the
 * routes stopping at the Selected one; the studio's hotspot card under "Routes that pass through",
 * or a terminal's "Routes that stage here".
 */
export function RouteCardStack({
  routes,
  back,
  listing = 'way-round',
  selected,
  onSelect,
  onRoute,
  testId,
  end,
}: Props) {
  const places = routeCards(routes, back, listing);

  const byId = new Map(places.flatMap((p) => p.directions.map((d) => [d.v.id, d.v] as const)));

  const pick = (p: (typeof places)[number]) =>
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
                { kind: 'road', livery: isRoadLivery(p.livery) ? p.livery : 'jeep' }
          }
          state={selected === p.card ? 'selected' : 'rest'}
          routeOrigin={p.from}
          endPoints={p.directions.map((d) => ({
            id: d.v.id,
            routeDirection: d.to,
            vehicle: vehicleOf(d.v),
            stationCode: endCodeOf(d.v),
          }))}
          onSelect={() => pick(p)}
          onPick={(id) => open(id, p.livery)}
        />
      ))}
      {end && places.length > 0 && end(places[places.length - 1].livery)}
    </>
  );
}
