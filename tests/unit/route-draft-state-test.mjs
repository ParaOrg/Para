// A route's draft state, the pure part of the studio's draft saves
// (src/features/studio/data/route-draft-state.ts, route-draft-edits.ts and
// hotspot-draft-state.ts): read from the approved rows or a kept draft, the
// same state either way, and stored as 0022's payload v1.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/route-draft-state-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hotspotPayloadOf } from '../../src/features/studio/data/hotspot-draft-state.ts';
import {
  DIRECTION_GONE,
  withSignboards,
} from '../../src/features/studio/data/route-draft-edits.ts';
import {
  blankToNull,
  newRouteState,
  routePayloadOf,
  routeStateFromDraft,
  routeStateFromLive,
} from '../../src/features/studio/data/route-draft-state.ts';

const line = [
  [121.04, 14.7],
  [121.05, 14.7],
];
const routeRow = {
  id: 'r',
  revision: 4,
  route_code: 'T1',
  signboard: 'Tala',
  mode: 'jeepney',
  fare_note: null,
  via: null,
  head_stop_id: 'tala',
  tail_stop_id: 'fairview',
  is_loop: false,
};
const direction = (id, reversed, over = {}) => ({
  id,
  reversed,
  control_points: line,
  segments: [],
  shape: { type: 'LineString', coordinates: line },
  overview: null,
  ...over,
});
const live = () =>
  routeStateFromLive(
    routeRow,
    // The way back first, and links out of order: the state puts both in order.
    [direction('back', true), direction('out', false)],
    [
      { route_variant_id: 'out', stop_id: 'b', stop_sequence: 2 },
      { route_variant_id: 'out', stop_id: 'a', stop_sequence: 0 },
      { route_variant_id: 'back', stop_id: 'c', stop_sequence: 1 },
    ],
  );
const draftRow = (payload, over = {}) => ({
  id: 'd',
  kind: 'route',
  subject_id: 'r',
  is_new: false,
  base_revision: 4,
  revision: 3,
  status: 'draft',
  payload,
  note: null,
  editor_id: null,
  created_at: '',
  updated_at: '',
  submitted_at: null,
  ...over,
});

test('the approved rows: the way there first, links by sequence, columns the rows left out filled', () => {
  const s = live();
  assert.deepEqual(
    s.directions.map((d) => d.id),
    ['out', 'back'],
  );
  assert.deepEqual(
    s.directions[0].links.map((l) => l.stop_id),
    ['a', 'b'],
  );
  assert.equal(s.directions[0].confidence, 'drawn');
  assert.deepEqual(s.directions[0].signboards, []);
  assert.equal(s.directions[0].direction_name, null);
  assert.equal(s.baseRevision, 4);
  assert.equal(s.routeCode, 'T1');
  assert.equal(s.draft, null);
  assert.equal(s.isNew, false);
});

test('a kept draft reads back as the state it was stored from, at its revision', () => {
  const s = live();
  const back = routeStateFromDraft(draftRow(routePayloadOf(s)));
  assert.deepEqual(back.directions, s.directions);
  assert.deepEqual(back.route, s.route);
  assert.equal(back.routeCode, 'T1');
  assert.equal(back.baseRevision, 4);
  assert.deepEqual(back.draft, { id: 'd', revision: 3 });
});

test("a hotspot's draft is not read as a route", () => {
  assert.throws(
    () => routeStateFromDraft(draftRow({}, { kind: 'hotspot' })),
    /is a hotspot, not a route/,
  );
});

test('a new route has no facts, no directions and no base', () => {
  const s = newRouteState('n');
  assert.equal(s.subjectId, 'n');
  assert.equal(s.isNew, true);
  assert.equal(s.baseRevision, null);
  assert.deepEqual(s.directions, []);
  assert.deepEqual(routePayloadOf(s), {
    version: 1,
    route: s.route,
    directions: [],
    route_code: null,
  });
});

test('signboards replace one direction’s list and leave the other alone', () => {
  const s = withSignboards(live(), 'back', ['x.svg', 'y.svg']);
  assert.deepEqual(s.directions.find((d) => d.id === 'back').signboards, ['x.svg', 'y.svg']);
  assert.deepEqual(s.directions.find((d) => d.id === 'out').signboards, []);
  assert.throws(() => withSignboards(live(), 'gone', []), new Error(DIRECTION_GONE));
});

test('a blank field is null; anything else is trimmed', () => {
  assert.equal(blankToNull('   '), null);
  assert.equal(blankToNull(' Tala '), 'Tala');
});

test("a hotspot's payload carries its row, the line it is given and its links", () => {
  const ring = [
    [121.04, 14.7],
    [121.041, 14.7],
    [121.041, 14.701],
  ];
  const p = hotspotPayloadOf(
    {
      hotspotId: 'h',
      kind: 'hintuan',
      name: ' Puregold ',
      informal: '',
      aliases: [],
      note: '',
      ring,
      directions: [],
    },
    'LRT-1',
  );
  assert.equal(p.version, 1);
  assert.equal(p.stop.name, 'Puregold');
  assert.equal(p.stop.line, 'LRT-1');
  assert.equal(p.stop.area.type, 'Polygon');
  assert.deepEqual(p.links, []);
});
