import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fakeSupabase } from './fixtures/fake-supabase.mjs';
import { setSupabase } from '../../src/features/studio/data/supabase.ts';
import { runReviewCommand } from '../../src/features/studio/data/review-commands.ts';
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

test('Publish sends the draft revision on screen to publish_draft, in one call', async () => {
  const { client, log } = fakeSupabase(() => ({ data: { code: 'approved' } }));
  setSupabase(client);
  assert.equal((await runReviewCommand({ action: 'publish', draft })).code, 'approved');
  assert.deepEqual(
    log.map((entry) => [entry.op, entry.payload]),
    [['publish_draft', { p_draft: 'd', p_revision: 3 }]],
  );
});
test('a refused publish is the answer', async () => {
  const { client } = fakeSupabase(() => ({
    data: { code: 'revision_mismatch', current_revision: 5 },
  }));
  setSupabase(client);
  const result = await runReviewCommand({ action: 'publish', draft });
  assert.equal(result.code, 'revision_mismatch');
});
test('drawing markers come from the draft geometry, including new draft-only places', () => {
  assert.deepEqual(reviewLines(draft.payload), [[[121, 14]]]);
  assert.deepEqual(reviewAnchor(draft.payload), [121, 14]);
  assert.equal(reviewAnchor({ bad: 'payload' }), null);
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
