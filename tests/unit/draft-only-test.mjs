// Routes and hotspots that are drafts only, as the sidebar opens them
// (src/features/studio/data/draft-only.ts): built from the draft's payload,
// named as approved ones are, a draft whose subject is approved left to the
// approved rows, and one draft that cannot be read left out alone.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/draft-only-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  draftOnlyDirections,
  draftOnlyHotspots,
} from '../../src/features/studio/data/draft-only.ts';
import { routePayloadOf } from '../../src/features/studio/data/route-draft-state.ts';

const line = [
  [121.04, 14.7],
  [121.05, 14.7],
];
const square = {
  type: 'Polygon',
  coordinates: [
    [
      [121.04, 14.7],
      [121.041, 14.7],
      [121.041, 14.701],
      [121.04, 14.7],
    ],
  ],
};
const hotspot = (id, name) => ({
  id,
  name,
  informal: null,
  aliases: [],
  kind: 'terminal',
  point: { type: 'Point', coordinates: [121.04, 14.7] },
  area: square,
  note: null,
  createdAt: '2026-11-01T00:00:00Z',
});
const hotspots = [hotspot('tala', 'Tala'), hotspot('fairview', 'SM Fairview')];

const direction = (id, reversed, shape) => ({
  id,
  reversed,
  direction_name: null,
  origin_terminal: null,
  destination_terminal: null,
  control_points: shape ? line : [],
  segments: [],
  shape,
  overview: null,
  confidence: 'drawn',
  borrowed_from: null,
  borrowed_part: null,
  borrowed_m: null,
  signboards: [],
  links: [],
});
const routeDraft = (subjectId, over = {}) => ({
  id: `draft-${subjectId}`,
  kind: 'route',
  subject_id: subjectId,
  is_new: true,
  base_revision: null,
  revision: 1,
  status: 'draft',
  payload: routePayloadOf({
    subjectId,
    isNew: true,
    baseRevision: null,
    draft: null,
    route: {
      signboard: 'Tala',
      mode: 'jeepney',
      fare_note: null,
      via: null,
      head_stop_id: 'tala',
      tail_stop_id: 'fairview',
      is_loop: false,
    },
    routeCode: null,
    directions: [
      direction('out', false, { type: 'LineString', coordinates: line }),
      direction('back', true, null),
    ],
  }),
  note: null,
  editor_id: 'me',
  created_at: '2026-11-09T08:00:00Z',
  updated_at: '2026-11-09T09:00:00Z',
  submitted_at: null,
  ...over,
});
const hotspotDraft = (subjectId, payload) => ({
  ...routeDraft(subjectId),
  id: `draft-${subjectId}`,
  kind: 'hotspot',
  payload,
});

test("a new route's draft opens as its directions, named from its ends, its empty slot too", () => {
  const rows = draftOnlyDirections([routeDraft('new-route')], new Set(), hotspots);
  assert.deepEqual(
    rows.map((v) => [v.id, v.routeId, v.reversed, v.shape === null]),
    [
      ['out', 'new-route', false, false],
      ['back', 'new-route', true, true],
    ],
  );
  assert.equal(rows[0].route.name, 'Tala – SM Fairview');
  assert.equal(rows[0].name, 'Tala → SM Fairview');
  assert.equal(rows[0].route.headHotspotId, 'tala');
});

test('a draft of an approved route is left to its approved rows', () => {
  assert.deepEqual(draftOnlyDirections([routeDraft('r')], new Set(['r']), hotspots), []);
});

test('a draft that cannot be read is left out, and the rest still open', () => {
  const warn = console.warn;
  console.warn = () => {};
  try {
    const rows = draftOnlyDirections(
      [routeDraft('broken', { payload: { version: 1 } }), routeDraft('fine')],
      new Set(),
      hotspots,
    );
    assert.deepEqual([...new Set(rows.map((v) => v.routeId))], ['fine']);
  } finally {
    console.warn = warn;
  }
});

test("a new hotspot's draft opens as its row, with the draft's names and outline", () => {
  const stop = {
    name: 'Lagro Terminal',
    informal: 'Lagro',
    aliases: [],
    kind: 'terminal',
    note: null,
    area: square,
    point: { type: 'Point', coordinates: [121.0405, 14.7005] },
  };
  const [row] = draftOnlyHotspots(
    [hotspotDraft('new-spot', { version: 1, stop, links: [] })],
    new Set(),
  );
  assert.equal(row.id, 'new-spot');
  assert.equal(row.name, 'Lagro Terminal');
  assert.equal(row.informal, 'Lagro');
  assert.deepEqual(row.area, square);
  assert.equal(row.createdAt, '2026-11-09T08:00:00Z');
  assert.equal(row.line, null);
});

test('a draft of an approved hotspot, and a route draft, are not hotspots that are drafts only', () => {
  const stop = {
    name: 'X',
    informal: null,
    aliases: [],
    kind: 'hintuan',
    note: null,
    area: square,
    point: { type: 'Point', coordinates: [121, 14] },
  };
  assert.deepEqual(
    draftOnlyHotspots(
      [hotspotDraft('tala', { version: 1, stop, links: [] }), routeDraft('r')],
      new Set(['tala']),
    ),
    [],
  );
});
