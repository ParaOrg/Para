import { useMemo } from 'react';

import { RouteCard } from './route-card';
import { drawnDepartures } from '../model/departures';
import { cardLiveries, type Livery } from '../model/liveries';
import { isRailLine, railLineOf, type Direction } from '../model/routes';

/** A card picked: the place it stands for, the directions its rows list, and its colour, for the map to light them in. */
export interface PickedPlace {
  from: string;
  ids: readonly string[];
  livery: Livery;
}

interface Props {
  /** Every direction of every route to show, slots included, as the hooks hand them over. */
  routes: readonly Direction[];
  /** Whether they are shown the way back rather than outbound. */
  back: boolean;
  /** The place whose card is Selected, by name; null when none is. */
  selected: string | null;
  /** A card was picked, or let go (null). */
  onSelect: (place: PickedPlace | null) => void;
  /** Called with the direction a row opens, and the colour its card wore: its trip wears the same. */
  onRoute: (v: Direction, livery: Livery) => void;
  /** What the suites call each card and row (RouteCard). */
  testId: 'chooser' | 'card';
}

/**
 * Routes one way round as the owner's RouteCards (2026-09-28): a card per
 * place they leave from (departures), each in its livery — liveries.ts: its
 * first row's route's, at random, kept for the visit, the same the other
 * way round (the owner's ask, 2026-10-12), never two alike side by side; a
 * train's, its line's own, never drawn (2026-10-13) — with
 * a row per drawn direction. One card at a time is Selected, and the map lights its
 * directions alone; a row opens its trip straight away, whether its card is
 * picked or not, and picks none — selecting it too was confusing — and the
 * trip's ‹ comes back to every card at rest (the owner's calls, 2026-09-29).
 * The route list stacks them under its header; the public map's
 * HintuanCard under its place's boxes, the routes stopping at the Selected
 * one; the studio's hotspot card under "Routes that pass through", or a
 * terminal's "Routes that stage here" — edge to edge in all three.
 */
export function RouteCardStack({ routes, back, selected, onSelect, onRoute, testId }: Props) {
  const places = drawnDepartures(routes, back);

  // Drawn once per stack, not per render. Each card by its rows' routes,
  // its first row's first (drawnDepartures leaves no card empty), after its
  // train line and a bar ('' before it for a jeepney's): a train card wears
  // its line's colour, never a draw (cardLiveries). The ids are uuids, with
  // no space, bar or newline to split on.
  const cardKey = places
    .map(
      (p) =>
        (railLineOf(p.directions[0].v) ?? '') +
        '|' +
        p.directions.map((d) => d.v.routeId).join(' '),
    )
    .join('\n');
  const liveries = useMemo(() => {
    if (!cardKey) return [];
    const cards = cardKey.split('\n').map((card) => card.split('|'));
    return cardLiveries(
      cards.map(([, routes]) => routes.split(' ')),
      cards.map(([line]) => (isRailLine(line) ? line : null)),
    );
  }, [cardKey]);

  const byId = new Map(places.flatMap((p) => p.directions.map((d) => [d.v.id, d.v] as const)));

  return (
    <>
      {places.map((p, i) => (
        <RouteCard
          key={p.from}
          testId={testId}
          livery={liveries[i]}
          state={selected === p.from ? 'selected' : 'rest'}
          routeOrigin={p.from}
          endPoints={p.directions.map((d) => ({ id: d.v.id, routeDirection: d.to }))}
          onSelect={() =>
            onSelect(
              selected === p.from
                ? null
                : { from: p.from, ids: p.directions.map((d) => d.v.id), livery: liveries[i] },
            )
          }
          onPick={(id) => {
            const v = byId.get(id);
            if (v) onRoute(v, liveries[i]);
          }}
        />
      ))}
    </>
  );
}
