import { passIndex } from '@/features/routes/geo/pass';
import { entryDistance, firstTouchIndex, type Ring } from '@/features/routes/geo/ring';
import { servedBy, directionLine, isLoop, type DirectionRow } from '@/features/routes/model/routes';

// Pure functions, kept apart from the writes (hotspots-write.ts), which need the
// Supabase client a test cannot load: so they can be unit-tested, and so the
// save panel can show exactly what a save will write before it writes it.

/**
 * Which directions pass this outline, and where along each one. This is a
 * hintuan's whole route list, by the one rule in `passIndex` — the same one
 * the route side's `hintuansAlong` asks, so a box saved before or after its
 * route ends up linked the same way. `line` is the station's train line,
 * null for any other hintuan: a direction that does not stop here is not
 * linked however near it runs (servedBy).
 */
export function linksThrough(
  ring: Ring,
  directions: DirectionRow[],
  line: string | null,
): { directionId: string; sequence: number }[] {
  const out: { directionId: string; sequence: number }[] = [];
  for (const v of directions) {
    if (!servedBy({ line }, v.route)) continue;
    const idx = passIndex(directionLine(v), ring);
    if (idx >= 0) out.push({ directionId: v.id, sequence: idx });
  }
  return out;
}

/**
 * A terminal's links: the directions the owner ticked, and every ikot the
 * outline is passed by. An ikot has no ends, so a terminal on it is a place
 * like a hintuan and is linked by the line (the ticks never carry one, and a
 * stale link to an ikot the outline no longer meets is dropped). `sequence`
 * is where the direction first meets the outline, 0 when a ticked route never
 * enters it.
 */
export function terminalLinks(
  ring: Ring,
  ticked: readonly string[],
  directions: DirectionRow[],
): { directionId: string; sequence: number }[] {
  const byId = new Map(directions.map((v) => [v.id, v]));
  const chosen = ticked.flatMap((id) => {
    const v = byId.get(id);
    if (!v || isLoop(v)) return [];
    return [{ directionId: id, sequence: Math.max(0, firstTouchIndex(directionLine(v), ring)) }];
  });
  const loops = linksThrough(ring, directions.filter(isLoop), null);
  return [...chosen, ...loops];
}

/** How far into a route "starts here" still holds, in metres. */
const STARTS_WITHIN_M = 100;

/**
 * Directions that begin at this outline — the pre-ticked suggestion for a
 * terminal. The owner adjusts from there.
 *
 * "Begins at" means the route touches the outline within its first 100 m,
 * not that its very first vertex is inside: a hand-traced corner is often a
 * metre or two off the road, and the first real terminal traced (Tala) had
 * the route start 20 cm outside its outline.
 */
export function directionsStartingIn(ring: Ring, directions: DirectionRow[]): string[] {
  return directions
    .filter((v) => {
      const d = entryDistance(directionLine(v), ring);
      return d >= 0 && d <= STARTS_WITHIN_M;
    })
    .map((v) => v.id);
}
