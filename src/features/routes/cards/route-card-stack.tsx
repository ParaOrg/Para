import { useMemo } from 'react';

import { RouteCard } from './route-card';
import { RouteCardRailway } from './route-card-railway';
import { routeCards } from '../model/departures';
import { cardLiveries, type Livery } from '../model/liveries';
import { stationCode } from '../model/rail-codes';
import { directionEnds, railLineOf, type Direction } from '../model/routes';
import { isRailwayVehicle, vehicleOf } from '../model/vehicles';

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
  /** The card that is Selected, by its key (PickedPlace's card); null when none is. */
  selected: string | null;
  /** A card was picked, or let go (null). */
  onSelect: (place: PickedPlace | null) => void;
  /** Called with the direction a row opens, and the colour its card wore: its trip wears the same. */
  onRoute: (v: Direction, livery: Livery) => void;
  /** What the suites call each card and row (RouteCard). */
  testId: 'chooser' | 'card';
}

/**
 * Routes one way round as RouteCards: a card per place they leave from
 * (departures), and per train line and bound or the ferry a RouteCardRailway
 * besides (routeCards), each in its livery — liveries.ts: its first row's route's, at
 * random, kept for the visit, the same the other way round, never two alike
 * side by side; a train's, its line's own, never drawn — with a row per drawn
 * direction. One card at a time is Selected, and the map lights its
 * directions alone; a row opens its trip straight away, whether its card is
 * picked or not, and picks none: selecting it too is confusing (the owner's
 * call), and the trip's ‹ comes back to every card at rest. The route list
 * stacks them under its header; the public map's HintuanCard under its
 * place's boxes, the routes stopping at the Selected one; the studio's
 * hotspot card under "Routes that pass through", or a terminal's "Routes that
 * stage here" — edge to edge in all three.
 */
export function RouteCardStack({ routes, back, selected, onSelect, onRoute, testId }: Props) {
  const places = routeCards(routes, back);

  // Drawn once per stack, not per render. Each card by its rows' routes,
  // its first row's first (routeCards leaves no card empty), after its
  // line and a bar ('' before it for a jeepney's): a train or ferry card
  // wears its line's colour, never a draw (cardLiveries). The ids are uuids, with
  // no space, bar or newline to split on. String(), because the React
  // Compiler cannot tell what routeCards' join gives is a string, and
  // would otherwise drop the memo below as one that may change under it.
  const cardKey = String(
    places
      .map((p) => (p.railway ?? '') + '|' + p.directions.map((d) => d.v.routeId).join(' '))
      .join('\n'),
  );
  const liveries = useMemo(() => {
    if (!cardKey) return [];
    const cards = cardKey.split('\n').map((card) => card.split('|'));
    return cardLiveries(
      cards.map(([, routes]) => routes.split(' ')),
      cards.map(([line]) => (isRailwayVehicle(line) ? line : null)),
    );
  }, [cardKey]);

  const byId = new Map(places.flatMap((p) => p.directions.map((d) => [d.v.id, d.v] as const)));

  const pick = (p: (typeof places)[number], i: number) =>
    onSelect(
      selected === p.card
        ? null
        : {
            card: p.card,
            from: p.from,
            ids: p.directions.map((d) => d.v.id),
            livery: liveries[i],
          },
    );
  const open = (id: string, i: number) => {
    const v = byId.get(id);
    if (v) onRoute(v, liveries[i]);
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
            endPoints={p.directions.map((d) => {
              const line = railLineOf(d.v);
              return {
                id: d.v.id,
                routeDirection: d.to,
                stationCode: line && stationCode(line, directionEnds(d.v).to),
              };
            })}
            onSelect={() => pick(p, i)}
            onPick={(id) => open(id, i)}
          />
        ) : (
          <RouteCard
            key={p.card}
            testId={testId}
            livery={liveries[i]}
            state={selected === p.card ? 'selected' : 'rest'}
            routeOrigin={p.from}
            endPoints={p.directions.map((d) => ({
              id: d.v.id,
              routeDirection: d.to,
              vehicle: vehicleOf(d.v),
            }))}
            onSelect={() => pick(p, i)}
            onPick={(id) => open(id, i)}
          />
        ),
      )}
    </>
  );
}
