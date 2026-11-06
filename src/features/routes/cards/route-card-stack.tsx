import type { ReactNode } from 'react';

import { RouteCard } from './route-card';
import { RouteCardRailway } from './route-card-railway';
import { routeCards, type Listing } from '../model/departures';
import type { Livery } from '../model/liveries';
import { stationCode } from '../model/rail-codes';
import { directionEnds, railLineOf, type Direction } from '../model/routes';
import { vehicleOf } from '../model/vehicles';

/** A card picked: which card it is, the place it stands for, the directions its rows list, and its colour, for the map to light them in. */
export interface PickedPlace {
  /** The card's key (routeCards): a place has a card per train line and bound besides its own. */
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

/**
 * Routes one way round as RouteCards: a card per place they leave from
 * (departures), and per train line and bound or the ferry a RouteCardRailway
 * besides (routeCards), each in its livery — its first row's mode's, or a
 * train's or the ferry's line's own (liveryOf) — with a row per drawn
 * direction. One card at a time is Selected, and the map lights its
 * directions alone; a row opens its trip straight away, whether its card is
 * picked or not, and picks none: selecting it too is confusing (the owner's
 * call), and the trip's ‹ comes back to every card at rest. The route list
 * stacks them under its header; the public map's HintuanCard under its
 * place's boxes, the routes stopping at the Selected one; the studio's
 * hotspot card under "Routes that pass through", or a terminal's "Routes that
 * stage here" — edge to edge in all three.
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
      {places.map((p, i) =>
        p.railway ? (
          <RouteCardRailway
            key={p.card}
            testId={testId}
            railway={p.railway}
            bound={p.bound}
            state={selected === p.card ? 'selected' : 'rest'}
            routeOrigin={p.from}
            originCode={originCodeOf(p.directions)}
            endPoints={p.directions.map((d) => {
              const line = railLineOf(d.v);
              return {
                id: d.v.id,
                routeDirection: d.to,
                stationCode: line && stationCode(line, directionEnds(d.v).to),
              };
            })}
            onSelect={() => pick(p)}
            onPick={(id) => open(id, p.livery)}
          />
        ) : (
          <RouteCard
            key={p.card}
            testId={testId}
            livery={p.livery}
            showsMode={i === 0 || places[i - 1].livery !== p.livery}
            state={selected === p.card ? 'selected' : 'rest'}
            routeOrigin={p.from}
            endPoints={p.directions.map((d) => ({
              id: d.v.id,
              routeDirection: d.to,
              vehicle: vehicleOf(d.v),
            }))}
            onSelect={() => pick(p)}
            onPick={(id) => open(id, p.livery)}
          />
        ),
      )}
      {end && places.length > 0 && end(places[places.length - 1].livery)}
    </>
  );
}
