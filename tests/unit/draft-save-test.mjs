// The studio's saves as drafts (src/features/studio/data/draft-save.ts), behind
// STUDIO_DRAFTS: the whole route or hotspot built as 0022's payload, stored in
// `draft` only — never a write to route, route_variant, stop or route_stop.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/draft-save-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fakeSupabase } from './fixtures/fake-supabase.mjs';
import { setSupabase } from '../../src/features/studio/data/supabase.ts';
import {
  deleteDirectionDraft,
  hintuanLinksFor,
  newRouteState,
  routePayloadOf,
  routeStateFromLive,
  saveHotspotDraft,
  saveRouteDraft,
  signboardsDraft,
  withDirectionEmptied,
  withDirectionSaved,
} from '../../src/features/studio/data/draft-save.ts';
import { STUDIO_DRAFTS } from '../../src/features/studio/data/flags.ts';

const line = [
  [121.04, 14.7],
  [121.05, 14.7],
];
const input = {
  routeId: null,
  directionId: null,
  signboard: ' Tala ',
  mode: 'jeepney',
  fareNote: '',
  headHotspotId: 'tala',
  tailHotspotId: 'fairview',
  isLoop: false,
  via: '',
  reversed: false,
  controlPoints: line,
  segments: [{ mode: 'freehand', coordinates: line }],
  borrowedFrom: null,
  borrowedPart: null,
  borrowedMetres: null,
};

const routeRow = {
  id: 'r',
  revision: 7,
  route_code: null,
  signboard: 'Tala',
  mode: 'jeepney',
  fare_note: null,
  via: null,
  head_stop_id: 'tala',
  tail_stop_id: 'fairview',
  is_loop: false,
};
const variant = (over) => ({
  id: 'out',
  reversed: false,
  direction_name: null,
  origin_terminal: null,
  destination_terminal: null,
  control_points: line,
  segments: [],
  shape: { type: 'LineString', coordinates: line },
  overview: null,
  confidence: 'estimated',
  borrowed_from: null,
  borrowed_part: null,
  borrowed_m: null,
  signboards: ['a.svg'],
  ...over,
});
const variants = [
  variant({}),
  variant({
    id: 'back',
    reversed: true,
    signboards: ['b.svg'],
    borrowed_from: 'out',
    borrowed_part: 'start',
    borrowed_m: 40,
  }),
];
const links = [
  { route_variant_id: 'out', stop_id: 'term', stop_sequence: 0 },
  { route_variant_id: 'out', stop_id: 'old-hintuan', stop_sequence: 1 },
  { route_variant_id: 'back', stop_id: 'h-back', stop_sequence: 3 },
];
const live = () => routeStateFromLive(routeRow, variants, links);

/** Every table write a log holds: a draft save must have none. */
const approvedWrites = (log) =>
  log.filter(
    (q) => ['route', 'route_variant', 'stop', 'route_stop'].includes(q.table) && q.op !== 'select',
  );

/** A fake whose answers come from `answers[table]` (a function of the query), else nothing. */
function fake(answers) {
  const f = fakeSupabase((q) => (answers[q.table] ?? (() => ({ data: null })))(q));
  setSupabase(f.client);
  return f;
}
const claimed = (q) => ({
  data: { code: 'ok', created: true, draft: { id: 'd', payload: q.payload.p_payload } },
});

test('the flag is off unless VITE_STUDIO_DRAFTS=1', () => {
  assert.equal(STUDIO_DRAFTS, false);
});

test('a new route: drawn direction and an empty slot, each with a links list', () => {
  const ids = ['dir-1', 'slot-1'];
  const { state, directionId } = withDirectionSaved(
    newRouteState('new-r'),
    input,
    { fresh: [{ stop_id: 'h1', stop_sequence: 0 }], managed: new Set(['h1']) },
    () => ids.shift(),
  );
  assert.equal(directionId, 'dir-1');
  const p = JSON.parse(JSON.stringify(routePayloadOf(state)));
  assert.equal(p.version, 1);
  assert.deepEqual(p.route, {
    signboard: 'Tala',
    mode: 'jeepney',
    fare_note: null,
    via: null,
    head_stop_id: 'tala',
    tail_stop_id: 'fairview',
    is_loop: false,
  });
  assert.deepEqual(
    p.directions.map((d) => [d.id, d.reversed, d.shape === null, d.links]),
    [
      ['dir-1', false, false, [{ stop_id: 'h1', stop_sequence: 0 }]],
      ['slot-1', true, true, []],
    ],
  );
});

test('a new loop: one direction, no ends', () => {
  const { state } = withDirectionSaved(
    newRouteState('loop'),
    { ...input, isLoop: true, reversed: true },
    { fresh: [], managed: new Set() },
    () => 'only',
  );
  assert.equal(state.directions.length, 1);
  assert.equal(state.directions[0].reversed, false);
  assert.equal(state.route.head_stop_id, null);
  assert.equal(state.route.is_loop, true);
});

test('an edit replaces the hintuan links it decides and keeps the rest', () => {
  const { state } = withDirectionSaved(
    live(),
    { ...input, routeId: 'r', directionId: 'out', signboard: 'Changed' },
    {
      fresh: [{ stop_id: 'new-hintuan', stop_sequence: 2 }],
      managed: new Set(['old-hintuan', 'new-hintuan', 'h-back']),
    },
  );
  const [out, back] = state.directions;
  // The ticked terminal stays; the hintuan the line no longer passes goes.
  assert.deepEqual(out.links, [
    { stop_id: 'term', stop_sequence: 0 },
    { stop_id: 'new-hintuan', stop_sequence: 2 },
  ]);
  assert.equal(out.confidence, 'estimated', 'confidence carried, not reset to drawn');
  assert.deepEqual(out.signboards, ['a.svg'], 'boards kept');
  // The other way is untouched, links and all.
  assert.deepEqual(back, live().directions[1]);
  // Without writeRoute the facts stay.
  assert.equal(state.route.signboard, 'Tala');
  assert.equal(state.baseRevision, 7);
});

test('Edit route writes the facts', () => {
  const { state } = withDirectionSaved(
    live(),
    { ...input, routeId: 'r', directionId: 'out', writeRoute: true, via: 'Mindanao Ave' },
    { fresh: [], managed: new Set() },
  );
  assert.equal(state.route.via, 'Mindanao Ave');
});

test('a direction no longer in the route is refused, not added', () => {
  assert.throws(
    () =>
      withDirectionSaved(
        live(),
        { ...input, routeId: 'r', directionId: 'gone' },
        { fresh: [], managed: new Set() },
      ),
    /no longer part of the route/,
  );
});

test('a drawn direction is not filled again without its id', () => {
  assert.throws(
    () => withDirectionSaved(live(), { ...input, routeId: 'r' }, { fresh: [], managed: new Set() }),
    /already has this direction drawn/,
  );
});

test('emptying a direction clears its line, links, boards and who borrowed it', () => {
  const state = withDirectionEmptied(live(), 'out');
  const [out, back] = state.directions;
  assert.equal(out.shape, null);
  assert.deepEqual([out.links, out.signboards, out.control_points], [[], [], []]);
  assert.equal(back.borrowed_from, null);
  assert.deepEqual(back.links, [{ stop_id: 'h-back', stop_sequence: 3 }]);
});

test('the hintuan rule links a box the line passes', () => {
  const box = {
    id: 'h1',
    name: 'Box',
    informal: null,
    aliases: [],
    kind: 'hintuan',
    point: { type: 'Point', coordinates: [121.045, 14.7] },
    area: {
      type: 'Polygon',
      coordinates: [
        [
          [121.044, 14.699],
          [121.046, 14.699],
          [121.046, 14.701],
          [121.044, 14.701],
          [121.044, 14.699],
        ],
      ],
    },
    note: null,
    createdAt: '',
  };
  const far = {
    ...box,
    id: 'far',
    area: { type: 'Polygon', coordinates: [box.area.coordinates[0].map(([x, y]) => [x, y + 1])] },
  };
  const term = { ...box, id: 't', kind: 'terminal' };
  const r = hintuanLinksFor(line, [box, far, term], { mode: 'jeepney' });
  assert.deepEqual(
    r.fresh.map((l) => l.stop_id),
    ['h1'],
  );
  assert.deepEqual([...r.managed].sort(), ['far', 'h1']);
  const loop = hintuanLinksFor(line, [box, term], { mode: 'jeepney', isLoop: true });
  assert.deepEqual([...loop.managed].sort(), ['h1', 't'], 'a loop decides its terminals too');
});

test('saveRouteDraft: reads the route first, claims a draft, writes no approved row', async () => {
  const f = fake({
    draft: () => ({ data: null }),
    route: () => ({ data: routeRow }),
    route_variant: () => ({ data: variants }),
    route_stop: () => ({ data: links, count: links.length }),
    rpc: claimed,
  });
  const saved = await saveRouteDraft({ ...input, routeId: 'r', directionId: 'back' }, []);
  assert.equal(saved.result.code, 'ok');
  assert.deepEqual(approvedWrites(f.log), []);
  const order = f.log.map((q) => q.table);
  assert.ok(
    order.indexOf('route') < order.indexOf('route_variant'),
    'revision read before content',
  );
  const call = f.log.find((q) => q.table === 'rpc');
  assert.equal(call.op, 'claim_draft');
  assert.equal(call.payload.p_kind, 'route');
  assert.equal(call.payload.p_is_new, false);
  assert.equal(call.payload.p_base_revision, 7);
  assert.equal(call.payload.p_payload.directions.length, 2);
  for (const d of call.payload.p_payload.directions) assert.ok(Array.isArray(d.links));
});

test('saveRouteDraft: a new line on ends nobody has is a new route', async () => {
  const f = fake({ route: () => ({ data: null }), rpc: claimed });
  const saved = await saveRouteDraft(input, []);
  const call = f.log.find((q) => q.table === 'rpc');
  assert.equal(call.payload.p_is_new, true);
  assert.equal(call.payload.p_base_revision, null);
  assert.equal(call.payload.p_subject_id, saved.routeId);
  assert.deepEqual(approvedWrites(f.log), []);
});

test('a claim that meets another draft made meanwhile stores nothing and says so', async () => {
  fake({
    draft: () => ({ data: null }),
    route: () => ({ data: routeRow }),
    route_variant: () => ({ data: variants }),
    route_stop: () => ({ data: links, count: links.length }),
    rpc: () => ({ data: { code: 'ok', created: false } }),
  });
  const saved = await saveRouteDraft({ ...input, routeId: 'r', directionId: 'out' }, []);
  assert.equal(saved.result.code, 'revision_mismatch');
});

const keptDraft = (payload, over = {}) => ({
  id: 'd',
  kind: 'route',
  subject_id: 'r',
  is_new: false,
  base_revision: 5,
  revision: 3,
  status: 'pending',
  payload,
  note: null,
  editor_id: null,
  created_at: '',
  updated_at: '',
  submitted_at: '',
  ...over,
});

test('an edit of a kept draft builds on it, at its revision, and takes it out of review', async () => {
  const kept = keptDraft(routePayloadOf(live()));
  const f = fake({
    draft: (q) =>
      q.op === 'update' ? { data: { ...kept, revision: 4, status: 'draft' } } : { data: kept },
  });
  const r = await signboardsDraft({ id: 'out', routeId: 'r' }, ['new.svg']);
  assert.equal(r.code, 'ok');
  assert.deepEqual(approvedWrites(f.log), []);
  assert.ok(
    !f.log.some((q) => q.table === 'route'),
    'approved rows not read: the draft is the base',
  );
  const up = f.log.find((q) => q.table === 'draft' && q.op === 'update');
  assert.deepEqual(up.filters, [
    ['eq', 'id', 'd'],
    ['eq', 'revision', 3],
  ]);
  assert.equal(up.payload.status, 'draft');
  assert.equal(up.payload.submitted_at, null);
  const dirs = up.payload.payload.directions;
  assert.deepEqual(
    dirs.map((d) => d.signboards),
    [['new.svg'], ['b.svg']],
  );
});

test('a kept draft changed since it was read is not overwritten', async () => {
  const kept = keptDraft(routePayloadOf(live()));
  fake({ draft: (q) => (q.op === 'update' ? { data: null } : { data: kept }) });
  const r = await deleteDirectionDraft({ id: 'out', routeId: 'r' });
  assert.equal(r.code, 'revision_mismatch');
});

const ring = [
  [121.044, 14.699],
  [121.046, 14.699],
  [121.046, 14.701],
  [121.044, 14.701],
];
const hotspotInput = {
  hotspotId: 'h',
  kind: 'hintuan',
  name: ' Box  Stop ',
  informal: '',
  aliases: [],
  note: '',
  ring,
  directions: [],
};

test('saveHotspotDraft: base from the stop revision, line carried, links listed', async () => {
  const f = fake({
    draft: () => ({ data: null }),
    stop: () => ({ data: { revision: 9, line: 'LRT-1' } }),
    rpc: claimed,
  });
  const { result } = await saveHotspotDraft(hotspotInput);
  assert.equal(result.code, 'ok');
  assert.deepEqual(approvedWrites(f.log), []);
  const call = f.log.find((q) => q.table === 'rpc');
  assert.equal(call.payload.p_kind, 'hotspot');
  assert.equal(call.payload.p_base_revision, 9);
  assert.equal(call.payload.p_payload.stop.name, 'Box Stop');
  assert.equal(call.payload.p_payload.stop.line, 'LRT-1');
  assert.deepEqual(call.payload.p_payload.links, []);
});

test('saveHotspotDraft: a new hotspot gets its id and no base', async () => {
  const f = fake({ rpc: claimed });
  const { hotspotId } = await saveHotspotDraft({ ...hotspotInput, hotspotId: null });
  const call = f.log.find((q) => q.table === 'rpc');
  assert.equal(call.payload.p_subject_id, hotspotId);
  assert.equal(call.payload.p_is_new, true);
  assert.equal(call.payload.p_base_revision, null);
});

test('draftRefusal: stored or taken down says nothing; every refusal says why', async () => {
  const { draftRefusal } = await import('../../src/features/studio/data/draft-save.ts');
  assert.equal(draftRefusal({ code: 'ok' }), null);
  assert.equal(draftRefusal({ code: 'taken_down' }), null);
  for (const code of [
    'revision_mismatch',
    'conflict',
    'subject_gone',
    'blocked',
    'busy',
    'bad_payload',
    'loop_taken',
  ])
    assert.match(draftRefusal({ code }), /\w/, code);
  assert.match(draftRefusal({ code: 'conflict' }), /changed on the map/);
});
