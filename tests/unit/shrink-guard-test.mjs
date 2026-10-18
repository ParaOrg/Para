// The publish's guard on a shrunk map (scripts/publish/shrinkGuard.mjs).
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/shrink-guard-test.mjs
//
// Takedowns (0018) leave the file on purpose and don't count toward the 30%;
// rows gone with no takedown behind them still do.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shrinkRefusals, takenDownSets } from '../../scripts/publish/shrinkGuard.mjs';

const maxShrink = 0.3;
/** Ten routes of one direction each, each direction linked to its own two hotspots. */
function map(routes = 10) {
  const variants = [];
  const stops = [];
  const links = [];
  for (let i = 0; i < routes; i++) {
    variants.push({ id: `v${i}`, route_id: `r${i}` });
    stops.push({ id: `s${i}a` }, { id: `s${i}b` });
    links.push(
      { route_variant_id: `v${i}`, stop_id: `s${i}a` },
      { route_variant_id: `v${i}`, stop_id: `s${i}b` },
    );
  }
  return { variants, stops, links };
}
const without = (m, routes) => ({
  variants: m.variants.filter((v) => !routes.includes(v.route_id)),
  stops: m.stops,
  links: m.links.filter((l) => !routes.some((r) => l.route_variant_id === `v${r.slice(1)}`)),
});
const none = { routes: new Set(), hotspots: new Set() };

test('four of ten routes taken down publishes', () => {
  const was = map();
  const gone = ['r0', 'r1', 'r2', 'r3'];
  const takenDown = { routes: new Set(gone), hotspots: new Set() };
  assert.deepEqual(shrinkRefusals({ was, now: without(was, gone), takenDown, maxShrink }), []);
});

test('four of ten routes gone with no takedown is refused', () => {
  const was = map();
  const refusals = shrinkRefusals({
    was,
    now: without(was, ['r0', 'r1', 'r2', 'r3']),
    takenDown: none,
    maxShrink,
  });
  assert.equal(refusals.length, 2);
  assert.match(refusals[0], /^variants: 10 → 6 rows, more than 30%/);
  assert.match(refusals[1], /^links: 20 → 12 rows/);
});

test('a table read back empty fails, whatever was taken down elsewhere', () => {
  const was = map();
  const takenDown = { routes: new Set(['r0']), hotspots: new Set(['s5a']) };
  const refusals = shrinkRefusals({ was, now: { ...was, stops: [] }, takenDown, maxShrink });
  assert.equal(refusals.length, 1);
  assert.match(refusals[0], /^stops: 20 → 0 rows \(1 taken down on purpose\)/);
});

test('takedowns do not hide other rows lost with them', () => {
  // Three taken down, three more gone unexplained: 7 left of the 10 - 3 = 7
  // expected would pass, but 4 left of 7 does not.
  const was = map();
  const takenDown = { routes: new Set(['r0', 'r1', 'r2']), hotspots: new Set() };
  const now = without(was, ['r0', 'r1', 'r2', 'r3', 'r4', 'r5']);
  assert.match(
    shrinkRefusals({ was, now, takenDown, maxShrink })[0],
    /^variants: 10 → 4 rows \(3 taken down/,
  );
});

test('every route taken down on purpose publishes the emptied map', () => {
  const was = map(3);
  const all = ['r0', 'r1', 'r2'];
  const takenDown = { routes: new Set(all), hotspots: new Set() };
  assert.deepEqual(shrinkRefusals({ was, now: without(was, all), takenDown, maxShrink }), []);
});

test('a taken-down hotspot takes its links with it', () => {
  const was = map();
  const hotspots = ['s0a', 's1a', 's2a', 's3a', 's4a', 's5a', 's6a'];
  const now = {
    variants: was.variants,
    stops: was.stops.filter((s) => !hotspots.includes(s.id)),
    links: was.links.filter((l) => !hotspots.includes(l.stop_id)),
  };
  assert.deepEqual(
    shrinkRefusals({
      was,
      now,
      takenDown: { routes: new Set(), hotspots: new Set(hotspots) },
      maxShrink,
    }),
    [],
  );
  assert.equal(shrinkRefusals({ was, now, takenDown: none, maxShrink }).length, 2);
});

test('no published map yet: nothing to compare', () => {
  assert.deepEqual(shrinkRefusals({ was: null, now: map(), takenDown: none, maxShrink }), []);
});

test('an older file names its route as route.id', () => {
  const was = {
    variants: [
      { id: 'v0', route: { id: 'r0' } },
      { id: 'v1', route: { id: 'r1' } },
    ],
    stops: [],
    links: [],
  };
  const takenDown = { routes: new Set(['r0', 'r1']), hotspots: new Set() };
  assert.deepEqual(
    shrinkRefusals({ was, now: { variants: [], stops: [], links: [] }, takenDown, maxShrink }),
    [],
  );
});

test('takenDownSets leaves out what was put back', () => {
  const sets = takenDownSets([
    { kind: 'route', subject_id: 'r0', put_back_at: null },
    { kind: 'route', subject_id: 'r1', put_back_at: '2026-10-18T00:00:00Z' },
    { kind: 'hotspot', subject_id: 's0', put_back_at: null },
  ]);
  assert.deepEqual([...sets.routes], ['r0']);
  assert.deepEqual([...sets.hotspots], ['s0']);
});
