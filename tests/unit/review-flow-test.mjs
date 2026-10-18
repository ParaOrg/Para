import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fakeSupabase } from './fixtures/fake-supabase.mjs';
import { setSupabase } from '../../src/features/studio/data/supabase.ts';
import { runReviewCommand } from '../../src/features/studio/data/review-commands.ts';
import { saveDraftFacts } from '../../src/features/studio/data/draft-facts.ts';
import { reviewFields } from '../../src/features/studio/data/review-diff.ts';
import { reviewDependencies } from '../../src/features/studio/data/review-dependencies.ts';
import { reviewAnchor, reviewLines } from '../../src/features/studio/data/review-geometry.ts';
import { waitingForPublication } from '../../src/features/studio/data/publication.ts';

const draft = {
  id: 'd',
  kind: 'hotspot',
  subject_id: 's',
  is_new: true,
  base_revision: null,
  revision: 3,
  status: 'pending',
  payload: {
    version: 1,
    stop: {
      name: 'Place',
      informal: null,
      note: null,
      point: { type: 'Point', coordinates: [121, 14] },
      area: null,
    },
    links: [{ route_variant_id: 'v', stop_sequence: 2 }],
  },
  note: null,
  editor_id: null,
  created_at: '',
  updated_at: '',
  submitted_at: null,
};

test('approval sends the reviewed draft revision through the guarded RPC', async () => {
  const { client, log } = fakeSupabase(() => ({ data: { code: 'approved' } }));
  setSupabase(client);
  assert.equal((await runReviewCommand({ action: 'approve', draft })).code, 'approved');
  assert.equal(log[0].op, 'approve_reviewed_draft');
  assert.deepEqual(log[0].payload, { p_draft: 'd', p_revision: 3 });
});
test('approval of a draft that is not pending is refused before any request', async () => {
  const { client, log } = fakeSupabase(() => ({}));
  setSupabase(client);
  await assert.rejects(
    runReviewCommand({ action: 'approve', draft: { ...draft, status: 'draft' } }),
    /not waiting/,
  );
  assert.equal(log.length, 0);
});
test('editing sent-back facts preserves geometry and the complete link set', async () => {
  const { client, log } = fakeSupabase((query) => ({
    data: { ...draft, status: 'draft', revision: 4, payload: query.payload.payload },
  }));
  setSupabase(client);
  await saveDraftFacts({ ...draft, status: 'draft' }, { name: ' Corrected place ' });
  assert.deepEqual(
    log.map((q) => [q.table, q.op]),
    [['draft', 'update']],
  );
  assert.equal(log[0].payload.payload.stop.name, 'Corrected place');
  assert.deepEqual(log[0].payload.payload.stop.point, draft.payload.stop.point);
  assert.deepEqual(log[0].payload.payload.links, draft.payload.links);
  assert.ok(
    log[0].filters.some(([op, key, value]) => op === 'eq' && key === 'revision' && value === 3),
  );
});
test('comparison detects moved geometry even with the same number of points', () => {
  const before = {
    version: 1,
    stop: { name: 'Same', point: { type: 'Point', coordinates: [121, 14] } },
  };
  const after = {
    version: 1,
    stop: { name: 'Same', point: { type: 'Point', coordinates: [122, 14] } },
  };
  const fields = reviewFields({ approved: before, proposed: after });
  assert.equal(fields[0].label, 'Place / Position');
  assert.equal(fields[0].changed, true);
  assert.equal(
    fields.find((field) => field.label === 'Place / Ground name' || field.label === 'Place / name')
      .changed,
    false,
  );
});
test('drawing markers come from the draft geometry, including new draft-only places', () => {
  assert.deepEqual(reviewLines(draft.payload), [[[121, 14]]]);
  assert.deepEqual(reviewAnchor(draft.payload), [121, 14]);
  assert.equal(reviewAnchor({ bad: 'payload' }), null);
});
test('route dependencies include new linked places, not only endpoints', async () => {
  const dependent = { ...draft, id: 'new-place-draft', subject_id: 'new-place' };
  const { client } = fakeSupabase((query) =>
    query.table === 'stop'
      ? {
          data: [
            { id: 'head', name: 'Head', status: 'approved' },
            { id: 'tail', name: 'Tail', status: 'approved' },
          ],
        }
      : { data: dependent },
  );
  setSupabase(client);
  const missing = await reviewDependencies({
    route: { head_stop_id: 'head', tail_stop_id: 'tail' },
    directions: [{ links: [{ stop_id: 'new-place' }] }],
  });
  assert.deepEqual(missing, [
    { subjectId: 'new-place', label: 'Place', draftId: 'new-place-draft' },
  ]);
});
test('dependency lookups keep request batches bounded', async () => {
  const { client, log } = fakeSupabase((query) => ({
    data: query.filters
      .find(([op]) => op === 'in')[2]
      .map((id) => ({ id, name: id, status: 'approved' })),
  }));
  setSupabase(client);
  await reviewDependencies({
    route: { head_stop_id: null, tail_stop_id: null },
    directions: [{ links: Array.from({ length: 95 }, (_, i) => ({ stop_id: `s${i}` })) }],
  });
  assert.equal(log.length, 4);
  assert.ok(log.every((query) => query.filters.find(([op]) => op === 'in')[2].length <= 30));
});
const index = {
  publishedAt: '2026-10-18T10:00:00Z',
  directions: [{ routeId: 'published-route' }],
  hotspots: [{ id: 'published-place' }],
};
const subject = (id, over = {}) => ({
  id,
  kind: 'route',
  label: id,
  status: 'approved',
  revision: 1,
  updatedAt: '2026-10-18T09:00:00Z',
  statusAt: '2026-10-18T09:00:00Z',
  ...over,
});
test('waiting list includes new approvals, edits and removals, and excludes unpublished takedowns', () => {
  const rows = [
    subject('published-route'),
    subject('new-route'),
    subject('published-place', { kind: 'hotspot', status: 'taken_down' }),
    subject('never-published', { status: 'taken_down' }),
  ];
  assert.deepEqual(
    waitingForPublication(rows, index).map((row) => row.id),
    ['new-route', 'published-place'],
  );
  assert.equal(
    waitingForPublication(
      [subject('published-route', { updatedAt: '2026-10-18T11:00:00Z' })],
      index,
    ).length,
    1,
  );
});
test('a publication clears waiting changes after its timestamp advances', () => {
  const changed = subject('published-route', { updatedAt: '2026-10-18T11:00:00Z' });
  assert.deepEqual(
    waitingForPublication([changed], { ...index, publishedAt: '2026-10-18T12:00:00Z' }),
    [],
  );
});

test('source versions detect an approval during publication even when its timestamp is older', () => {
  const withVersions = {
    ...index,
    source_revisions: { routes: { 'published-route': 3 }, hotspots: { 'published-place': 1 } },
  };
  const next = subject('published-route', { revision: 4 });
  assert.equal(waitingForPublication([next], withVersions).length, 1);
  assert.deepEqual(
    waitingForPublication([next], {
      ...withVersions,
      source_revisions: { ...withVersions.source_revisions, routes: { 'published-route': 4 } },
    }),
    [],
  );
});

test('routes without signboards are named by their endpoint places', async () => {
  const { reviewDraftOf } = await import('../../src/features/studio/data/review-label.ts');
  const routeDraft = {
    ...draft,
    kind: 'route',
    payload: { route: { signboard: null, head_stop_id: 'head', tail_stop_id: 'tail', via: null } },
  };
  const label = reviewDraftOf(
    routeDraft,
    new Map([
      ['head', 'Palma Hall'],
      ['tail', 'Sunken Garden'],
    ]),
  ).label;
  assert.ok(label.includes('Palma Hall') && label.includes('Sunken Garden'));
});
