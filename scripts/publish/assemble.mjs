// Assembles the map's rows from the database's, by the app's own rules: no
// reading, no writing. Each direction's line is thinned to within half a metre
// of the original and rounded to 6 decimals (about 0.1 m): the router's points
// every metre or two on a straight road go, the bends stay. It was 5 m and 5
// decimals until 2026-09-25, when the owner zoomed to a street and saw the
// lines cut the corners and the two routes that share the road out of Tala
// braid across each other, each thinned on its own; at zoom 20 five metres is
// sixty pixels. A hotspot's point and box are rounded to 6 decimals as well:
// the editor saves them with 15 or more, and those digits were half the file.
//
// It checks its own work: every original point must lie within half a metre of
// the thinned line, or it fails.
import {
  overviewOf,
  pointToSegmentM,
  round6,
  roundLngLat,
  simplifyLine,
} from '../../src/shared/utils/geo.ts';
import {
  directionName,
  isLineMode,
  loopName,
  routeName,
} from '../../src/features/routes/model/routes.ts';
import { hotspotLabel } from '../../src/features/routes/model/hotspots.ts';

/**
 * Douglas–Peucker tolerance. With 6-decimal rounding (≤ 0.08 m) the total
 * stays under half a metre: the lit line is 10 px wide at zoom 20, where a
 * pixel is 7 cm, so the drawn line never leaves its own width.
 */
export const SIMPLIFY_M = 0.3;
export const MAX_DEVIATION_M = 0.5;
/**
 * The overview in the index: OVERVIEW_M (5 m) and 5 decimals (about 1 m),
 * the file's diet before 2026-09-25 — geo.ts's overviewOf, which the editor's
 * list draws too. Below zoom 15 a pixel here is more than 2 m, so it is the
 * full line to the eye; closer in, and for a lit direction, the map reads
 * the full line.
 */
export const OVERVIEW_MAX_DEVIATION_M = 7;

/** Says why the rows cannot be published. The publish prints it and stops. */
export class AssembleError extends Error {}

/** A Point or Polygon with every coordinate rounded to 6 decimals; anything else as it came. */
export function roundGeometry(g) {
  if (!g || typeof g !== 'object') return g;
  if (g.type === 'Point' && Array.isArray(g.coordinates)) {
    return { ...g, coordinates: g.coordinates.map(round6) };
  }
  if (g.type === 'Polygon' && Array.isArray(g.coordinates)) {
    return { ...g, coordinates: g.coordinates.map((ring) => ring.map((c) => c.map(round6))) };
  }
  return g;
}

/**
 * The largest distance from any original point to the simplified line. Every
 * segment is tried for every point: a route that doubles back on itself has
 * its nearest segment anywhere, and a few hundred by a hundred is nothing.
 */
export function maxDeviation(original, simplified) {
  let worst = 0;
  for (const p of original) {
    let best = Infinity;
    for (let i = 0; i + 1 < simplified.length; i++) {
      const d = pointToSegmentM(p, simplified[i], simplified[i + 1]);
      if (d < best) best = d;
    }
    if (best > worst) worst = best;
  }
  return worst;
}

/** A direction's name, and its route's, from its ends' hotspots or, for a loop, its signboard. */
function namesOf(v, hotspotName) {
  // A loop has no ends and is called by its signboard (0021); any other route
  // has both ends, and a missing one is a stop table that was not fully readable.
  if (v.route.is_loop === true) {
    if (v.route.head_stop_id != null || v.route.tail_stop_id != null) {
      throw new AssembleError(
        `FAIL  loop ${v.route.id} has an end hotspot: a loop has neither head nor tail`,
      );
    }
    if (!v.route.signboard?.trim()) {
      throw new AssembleError(`FAIL  loop ${v.route.id} has no signboard: a loop is called by it`);
    }
    const name = loopName(v.route.signboard, v.route.via);
    return { name, direction: name };
  }
  const head = hotspotName.get(v.route.head_stop_id);
  const tail = hotspotName.get(v.route.tail_stop_id);
  if (!head || !tail) {
    // The foreign keys make this impossible unless the stop table was not fully readable.
    throw new AssembleError(
      `FAIL  route ${v.route.id}: an end hotspot is missing from the stop rows (${v.route.head_stop_id}, ${v.route.tail_stop_id})`,
    );
  }
  return {
    name: routeName(head, tail, v.route.via),
    direction: directionName(head, tail, v.reversed),
  };
}

/**
 * The map's rows from the database's, in the file's key order: its directions,
 * hotspots and links, each direction's overview by id, and what the thinning
 * did to each line. Throws an AssembleError for rows that cannot be published.
 */
export function assembleMap(directionRows, hotspotRows, linkRows) {
  // Names are generated from the hotspots at each route's ends and never stored
  // (PLAN.md, "Naming and creating a route", 2026-09-21). The file carries the
  // generated strings so commuters need no join; a renamed hotspot shows on the
  // next publish: routeName and directionName, from a hotspot's hotspotLabel — its
  // informal name, what people say, or the name on the ground (0007).
  const hotspotName = new Map(hotspotRows.map((s) => [s.id, hotspotLabel(s)]));

  const stats = [];
  /** Each direction's overview, by id: its line at 5 m, 5 decimals. */
  const overviews = new Map();
  const variants = directionRows.map((v) => {
    if (!v.route) {
      throw new AssembleError(
        `FAIL  direction ${v.id} came without its route: is the route table still readable?`,
      );
    }
    const isLoop = v.route.is_loop === true;
    const { name, direction } = namesOf(v, hotspotName);
    const coords = Array.isArray(v.shape?.coordinates) ? v.shape.coordinates : [];
    let shape = null;
    if (coords.length > 1) {
      const slim = simplifyLine(coords, SIMPLIFY_M).map(roundLngLat);
      const dev = maxDeviation(coords, slim);
      if (dev > MAX_DEVIATION_M) {
        throw new AssembleError(
          `FAIL  "${name}" ${direction}: simplified line strays ${dev.toFixed(1)} m from the original`,
        );
      }
      // The overview is thinned from the original, not from the full line, and
      // checked the same way against its own, looser bound.
      const rough = overviewOf(coords);
      const roughDev = maxDeviation(coords, rough);
      if (roughDev > OVERVIEW_MAX_DEVIATION_M) {
        throw new AssembleError(
          `FAIL  "${name}" ${direction}: its overview strays ${roughDev.toFixed(1)} m from the original`,
        );
      }
      stats.push({
        name: `${name} · ${direction}`,
        before: coords.length,
        after: slim.length,
        overview: rough.length,
        dev,
      });
      shape = { type: 'LineString', coordinates: slim };
      overviews.set(v.id, { type: 'LineString', coordinates: rough });
    }
    // Key order is the file's contract; keep it fixed. A direction with no line
    // yet is published as it is — shape null — so a card can offer the flip and
    // say the return trip is not mapped yet.
    return {
      id: v.id,
      route_id: v.route_id,
      direction_name: direction,
      origin_terminal: v.origin_terminal,
      destination_terminal: v.destination_terminal,
      shape,
      reversed: v.reversed,
      confidence: v.confidence,
      route: {
        id: v.route.id,
        signboard: v.route.signboard,
        long_name: v.route.long_name,
        mode: v.route.mode,
        fare_note: v.route.fare_note,
        head_stop_id: v.route.head_stop_id,
        tail_stop_id: v.route.tail_stop_id,
        via: v.route.via,
        name,
        // The line (0011, 0012), only on a train's or the ferry's: every other
        // route's file stays byte for byte what it was.
        ...(v.route.route_code && isLineMode(v.route.mode)
          ? { route_code: v.route.route_code }
          : {}),
        // Last, and only on a loop (0021): every other route's row stays byte for byte what it was.
        ...(isLoop ? { is_loop: true } : {}),
      },
    };
  });

  const stops = hotspotRows.map((s) => ({
    id: s.id,
    name: s.name,
    informal: s.informal ?? null,
    aliases: Array.isArray(s.aliases) ? s.aliases : [],
    kind: s.kind,
    point: roundGeometry(s.point),
    area: roundGeometry(s.area),
    note: s.note,
    created_at: s.created_at,
    // A station's line (0011), only on a station.
    ...(s.line ? { line: s.line } : {}),
  }));

  const links = linkRows.map((l) => ({
    route_variant_id: l.route_variant_id,
    stop_id: l.stop_id,
    stop_sequence: l.stop_sequence,
  }));

  return { variants, stops, links, overviews, stats };
}

/**
 * The revision of every route and hotspot read. These public counters identify
 * the versions actually read, even if another approval lands while this
 * publication is running. No editor data is included.
 */
export function sourceRevisionsOf(directionRows, hotspotRows) {
  return {
    routes: Object.fromEntries(
      [
        ...new Map(
          directionRows.filter((row) => row.route).map((row) => [row.route.id, row.route.revision]),
        ).entries(),
      ].sort(([a], [b]) => a.localeCompare(b)),
    ),
    hotspots: Object.fromEntries(
      hotspotRows.map((row) => [row.id, row.revision]).sort(([a], [b]) => a.localeCompare(b)),
    ),
  };
}

const sameText = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/**
 * `published_at` is carried over when nothing else changed, so an unchanged
 * map is a byte-identical file and the daily workflow has nothing to commit.
 * `prior` is the newest index read back (shape 5, or, until it exists, shape 4,
 * which is the same map while no loop is saved); `rows` its rows as built now.
 */
export function publishedAtOf({ prior, rows, sourceRevisions, now = new Date() }) {
  const same =
    prior &&
    sameText({ variants: prior.variants, stops: prior.stops, links: prior.links }, rows) &&
    sameText(prior.source_revisions, sourceRevisions);
  return same ? prior.published_at : now.toISOString().replace(/\.\d{3}Z$/, 'Z');
}
