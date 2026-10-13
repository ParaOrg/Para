/**
 * The route cards' colours — the jeepney liveries of the owner's RouteCard
 * set (Figma 3665:2265): red, orange, violet, rose, fuchsia and pink. Violet
 * and rose came on 2026-09-30; later that day mist left ("mist is no longer
 * with us") and fuchsia joined; yellow left on 2026-10-12 ("it's not good
 * on the eyes"), its Card/yellow variables with it; pink came on 2026-10-13
 * (4071:7014). His rule of 2026-09-28:
 * shown at random, but kept for the whole visit, the same in the list and on
 * the trip's own card, and two cards side by side never alike.
 *
 * A colour belongs to a route: a card wears the colour of the route its
 * first row belongs to, so a route reads in one colour whichever way round
 * the list shows it, Papunta or Pabalik (the owner's ask of 2026-10-12:
 * "stop randomly changing colors, just add color if the pabalik or papunta
 * has additional route"). Tala's card lists Tala → SM Fairview and Tala →
 * Novaliches in the first row's route's colour; the way back makes
 * Novaliches → Tala a card of its own, which draws a colour of its own and
 * keeps it. The list a trip's ‹ opens leads with the trip's own route
 * (sharingAnEnd), so the card it lists the trip on wears the trip's colour.
 * Until then a colour belonged to the place a card leaves from, which the
 * way back renames, so the turn drew the cards anew. Once open, a trip's
 * card keeps that colour until it closes, even SWITCHed to leave from
 * another place: turned round, it is the same card (the owner, 2026-09-29;
 * `useTripLivery` in trip-card.tsx, since its line wears the colour too).
 */
export const LIVERIES = ['red', 'orange', 'violet', 'rose', 'fuchsia', 'pink'] as const;
export type Livery = (typeof LIVERIES)[number];

/** This visit's draws, by route id. A new visit draws again. */
const visit = new Map<string, Livery>();

/**
 * The colours for a list of cards, in order: each card its rows' route ids,
 * the first row's first, which the card is keyed by. No colour comes twice
 * in a list until every one has come once (the owner's ask, 2026-09-30: "it
 * must exhaust the existing colors before repeating it"); then the round
 * starts again, never beside the same colour. A route drawn before keeps
 * its colour — unless this round has had it, or it would sit beside itself,
 * when it draws again and keeps that (the owner's ask of 2026-10-12,
 * nothing changing colour at random: a clash settles once; it was worn for
 * that list only until then). A redraw, and a route new to the visit,
 * draws among the colours this round has not had, leaving those that
 * routes further down keep and, where it can, those any listed row's route
 * keeps: the way round leads a card with any of them, so a redraw clear of
 * them makes no clash of its own there.
 */
export function liveriesFor(
  cards: readonly (readonly string[])[],
  random = Math.random,
  drawn = visit,
): Livery[] {
  const out: Livery[] = [];
  let round = new Set<Livery>();
  const keptOf = (routes: readonly string[]) =>
    new Set(routes.map((r) => drawn.get(r)).filter((l): l is Livery => !!l));
  // Every listed route's kept colour, rows included, as the list is met.
  const listed = keptOf(cards.flat());
  cards.forEach((card, i) => {
    const route = card[0];
    if (round.size === LIVERIES.length) round = new Set();
    const before = out[i - 1];
    const kept = drawn.get(route);
    let pick: Livery;
    if (kept && !round.has(kept) && kept !== before) pick = kept;
    else {
      // Kept further down this round: left for the routes that keep them.
      const ahead = keptOf(
        cards.slice(i + 1, i + 1 + LIVERIES.length - round.size).map((c) => c[0]),
      );
      const open = LIVERIES.filter((l) => !round.has(l) && l !== before);
      const free = open.filter((l) => !ahead.has(l));
      const clear = free.filter((l) => !listed.has(l));
      const from = clear.length
        ? clear
        : free.length
          ? free
          : open.length
            ? open
            : LIVERIES.filter((l) => l !== before);
      pick = from[Math.floor(random() * from.length)] ?? LIVERIES[0];
      drawn.set(route, pick);
    }
    round.add(pick);
    out.push(pick);
  });
  return out;
}
