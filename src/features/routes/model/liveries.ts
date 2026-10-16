import { RAIL_LINES, type RailLine } from './routes';

/**
 * The route cards' colours — the jeepney liveries of Figma's RouteCard set
 * (3665:2265): red, orange, violet, rose, fuchsia and pink (4071:7014). The
 * rule: shown at random, but kept for the whole visit, the same in the list
 * and on the trip's own card, and two cards side by side never alike.
 *
 * A colour belongs to a route: a card wears the colour of the route its first
 * row belongs to, so a route reads in one colour whichever way round the list
 * shows it, Papunta or Pabalik. Colours do not change at random (the owner's
 * call): one is added only when the Papunta or Pabalik list has an additional
 * route. Tala's card lists Tala → SM Fairview and Tala → Novaliches in the
 * first row's route's colour; the way back makes Novaliches → Tala a card of
 * its own, which draws a colour of its own and keeps it. The list a trip's ‹
 * opens leads with the trip's own route (sharingAnEnd), so the card it lists
 * the trip on wears the trip's colour. The colour is not the place's: the way
 * back renames the place, which would draw the cards anew. Once open, a
 * trip's card keeps its colour until it closes, even SWITCHed to leave from
 * another place: turned round, it is the same card (`useTripLivery` in
 * trip-card.tsx, since its line wears the colour too).
 */
export const JEEPNEY_LIVERIES = ['red', 'orange', 'violet', 'rose', 'fuchsia', 'pink'] as const;
type JeepneyLivery = (typeof JEEPNEY_LIVERIES)[number];

/**
 * A train route's colour is its line's, never drawn (Figma's RouteCards for
 * them, 4074:7402 LRT-1, 4080:4124 LRT-2, 4080:4241 MRT-3): Figma's
 * Map/Rail/LightRailWayOne, LightRailWayTwo and MetroRailWayThree, by the
 * line its routeCode names.
 */
const RAIL_LIVERY = {
  'LRT-1': 'light-rail-way-one',
  'LRT-2': 'light-rail-way-two',
  'MRT-3': 'metro-rail-way-three',
} as const satisfies Record<RailLine, string>;
type RailLivery = (typeof RAIL_LIVERY)[RailLine];

/** Every colour a card may wear: a jeepney's drawn livery, or a train line's own. */
export const LIVERIES = [...JEEPNEY_LIVERIES, ...RAIL_LINES.map((l) => RAIL_LIVERY[l])] as const;
export type Livery = JeepneyLivery | RailLivery;

/** This visit's draws, by route id. A new visit draws again. */
const visit = new Map<string, JeepneyLivery>();

/**
 * The colours for a list of cards, in order: each card its rows' route ids,
 * the first row's first, which the card is keyed by. No colour comes twice in
 * a list until every one has come once (the owner's rule); then the round
 * starts again, never beside the same colour. A route drawn before keeps its
 * colour — unless this round has had it, or it would sit beside itself, when
 * it draws again and keeps that (a clash settles once, so nothing changes
 * colour at random). A redraw, and a route new to the visit, draws among the
 * colours this round has not had, leaving those that routes further down keep
 * and, where it can, those any listed row's route keeps: the way round leads
 * a card with any of them, so a redraw clear of them makes no clash of its
 * own there.
 */
export function liveriesFor(
  cards: readonly (readonly string[])[],
  random = Math.random,
  drawn = visit,
): JeepneyLivery[] {
  const out: JeepneyLivery[] = [];
  let round = new Set<JeepneyLivery>();
  const keptOf = (routes: readonly string[]) =>
    new Set(routes.map((r) => drawn.get(r)).filter((l): l is JeepneyLivery => !!l));
  // Every listed route's kept colour, rows included, as the list is met.
  const listed = keptOf(cards.flat());
  cards.forEach((card, i) => {
    const route = card[0];
    if (round.size === JEEPNEY_LIVERIES.length) round = new Set();
    const before = out[i - 1];
    const kept = drawn.get(route);
    let pick: JeepneyLivery;
    if (kept && !round.has(kept) && kept !== before) pick = kept;
    else {
      // Kept further down this round: left for the routes that keep them.
      const ahead = keptOf(
        cards.slice(i + 1, i + 1 + JEEPNEY_LIVERIES.length - round.size).map((c) => c[0]),
      );
      const open = JEEPNEY_LIVERIES.filter((l) => !round.has(l) && l !== before);
      const free = open.filter((l) => !ahead.has(l));
      const clear = free.filter((l) => !listed.has(l));
      const from = clear.length
        ? clear
        : free.length
          ? free
          : open.length
            ? open
            : JEEPNEY_LIVERIES.filter((l) => l !== before);
      pick = from[Math.floor(random() * from.length)] ?? JEEPNEY_LIVERIES[0];
      drawn.set(route, pick);
    }
    round.add(pick);
    out.push(pick);
  });
  return out;
}

/**
 * The colours for a list of cards, in order, as liveriesFor's, with each
 * card's train line beside it (its first row's route's, railLineOf; null
 * for a jeepney's). A train card wears its line's (RAIL_LIVERY), and the
 * jeepney cards are drawn as if the train cards were not in the list: a
 * train never changes what a jeepney draws, takes none of the six from a
 * round, and keeps no draw for the visit. Two jeepney cards either side of
 * a train may match, then, but never side by side.
 */
export function cardLiveries(
  cards: readonly (readonly string[])[],
  lines: readonly (RailLine | null)[],
  random = Math.random,
  drawn = visit,
): Livery[] {
  const jeepneys = liveriesFor(
    cards.filter((_, i) => !lines[i]),
    random,
    drawn,
  );
  let next = 0;
  return cards.map((_, i) => {
    const line = lines[i];
    return line ? RAIL_LIVERY[line] : jeepneys[next++];
  });
}
