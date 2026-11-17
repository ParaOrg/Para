// The studio's route tables (route, route_variant, route_stop, stop) for the database's stand-in
// (lib/stand-ins.mjs), built at run time from the published map in this repo: public/data/index.v5.json
// and public/data/lines/<id>.json. Nothing is read from the database to make them, and they hold
// no contribution, account, contributor, draft or editor row: only routes, their directions and
// hotspots, as the public map already carries them.
//
// Copied from the published map:
//   route          id, signboard, long_name, mode, fare_note, head_stop_id, tail_stop_id, via,
//                  and route_code and is_loop where published (the published `name` is worked
//                  out from the directions, not a column: left out)
//   route_variant  id, route_id, direction_name, origin_terminal, destination_terminal, reversed,
//                  confidence, overview, signboards where published, and `shape` from its line
//                  file
//   route_stop     route_variant_id, stop_id, stop_sequence (the published links)
//   stop           id, name, informal, aliases, kind, point, area, note, created_at, and line
//                  where published (null where not)
//
// Made up, since the published map does not carry them:
//   route_variant  overview: null for the two SUBJECT_LINES (published for every other line):
//                  c0d2d9f4, the line the suites draw on, so they click its full shape; and
//                  9c8e6422, the line extend-test follows, whose drawing it compares point for
//                  point with what the map draws, chosen for a stretch no other line shares.
//                  Both have no overview in the live tables, so the map draws their shapes there
//                  too.
//                  updated_at: one fixed date for every row
//                  borrowed_from, borrowed_part, borrowed_m: null; signboards: [] where none
//                  is published
//                  control_points and segments: the shape cut into routed segments of up to
//                  SEGMENT_POINTS points, each starting where the one before ends, with a
//                  control point at every cut, as the studio saves a routed line
//
// After a publish changes the lines, the router's recorded answers may need re-recording
// (tests/e2e/README.md); a request with no recording fails the suite naming itself.
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const DATA = fileURLToPath(new URL('../../../public/data/', import.meta.url));
/**
 * The lines the drawing suites use (lib/subject-line.mjs): the one they draw on, and the one
 * extend-test follows. Their overviews are left out, as they are in the live tables, so the studio
 * reads their full shapes and the suites click and follow road vertices; every other line keeps
 * its published overview, so the overview path is drawn too.
 */
export const SUBJECT_LINES = {
  drawnOn: 'c0d2d9f4-5501-4116-b61c-42b9571bcea4',
  followed: '9c8e6422-0faa-4a1a-87bb-d0305125671c',
};
const NO_OVERVIEW = new Set(Object.values(SUBJECT_LINES));
/** The stand-in's one date for every direction's last change. */
const UPDATED_AT = '2026-11-01T00:00:00+00:00';
/** Points per made-up segment, the last one shorter: as the studio's routed segments run. */
const SEGMENT_POINTS = 20;

/** The shape cut into segments sharing their ends, and the control points at the cuts. */
const drawingOf = (coordinates) => {
  const segments = [];
  const controlPoints = [coordinates[0]];
  for (let from = 0; from < coordinates.length - 1; from += SEGMENT_POINTS - 1) {
    const to = Math.min(from + SEGMENT_POINTS - 1, coordinates.length - 1);
    segments.push({ snap: 'snapped', coordinates: coordinates.slice(from, to + 1) });
    controlPoints.push(coordinates[to]);
  }
  return { control_points: controlPoints, segments };
};

/** The four tables, as rows the live tables hold, keyed by table name. */
export const buildRouteTables = () => {
  const index = JSON.parse(readFileSync(`${DATA}index.v5.json`, 'utf8'));
  const lines = new Map(
    readdirSync(`${DATA}lines`)
      .filter((f) => f.endsWith('.json'))
      .map((f) => {
        const line = JSON.parse(readFileSync(`${DATA}lines/${f}`, 'utf8'));
        return [line.id, line.shape];
      }),
  );
  const routes = new Map();
  for (const v of index.variants) {
    const r = v.route;
    routes.set(r.id, {
      id: r.id,
      signboard: r.signboard,
      long_name: r.long_name,
      mode: r.mode,
      fare_note: r.fare_note,
      head_stop_id: r.head_stop_id,
      tail_stop_id: r.tail_stop_id,
      via: r.via,
      ...(r.route_code === undefined ? {} : { route_code: r.route_code }),
      ...(r.is_loop === undefined ? {} : { is_loop: r.is_loop }),
    });
  }
  const variants = index.variants.map((v) => {
    const shape = lines.get(v.id) ?? null;
    return {
      id: v.id,
      route_id: v.route_id,
      direction_name: v.direction_name,
      origin_terminal: v.origin_terminal,
      destination_terminal: v.destination_terminal,
      reversed: v.reversed,
      confidence: v.confidence,
      overview: NO_OVERVIEW.has(v.id) ? null : v.overview,
      shape,
      updated_at: UPDATED_AT,
      borrowed_from: null,
      borrowed_part: null,
      borrowed_m: null,
      signboards: v.signboards ?? [],
      ...(shape ? drawingOf(shape.coordinates) : { control_points: [], segments: [] }),
    };
  });
  const stops = index.stops.map((s) => ({
    id: s.id,
    name: s.name,
    informal: s.informal,
    aliases: s.aliases,
    kind: s.kind,
    point: s.point,
    area: s.area,
    note: s.note,
    created_at: s.created_at,
    line: s.line ?? null,
  }));
  const links = index.links.map((l) => ({
    route_variant_id: l.route_variant_id,
    stop_id: l.stop_id,
    stop_sequence: l.stop_sequence,
  }));
  return { route: [...routes.values()], route_variant: variants, route_stop: links, stop: stops };
};
