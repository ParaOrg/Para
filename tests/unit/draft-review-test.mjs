import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  approveDraft,
  discardDraft,
  listDrafts,
  sendBackDraft,
  submitDraft,
} from '../../src/features/studio/data/drafts.ts';
import { reviewResultSchema } from '../../src/features/studio/data/review-schema.ts';
import { setSupabase } from '../../src/features/studio/data/supabase.ts';
import { fakeSupabase } from './fixtures/fake-supabase.mjs';

const row = (id, status = 'draft') => ({
  id,
  kind: 'route',
  subject_id: `subject-${id}`,
  is_new: false,
  base_revision: 7,
  revision: 3,
  status,
  payload: { version: 1 },
  note: null,
  editor_id: null,
  created_at: '2026-10-18T10:00:00Z',
  updated_at: '2026-10-18T10:00:00Z',
  submitted_at: status === 'pending' ? '2026-10-18T10:00:00Z' : null,
});

test('review RPC results reject unknown codes rather than trusting a cast', async () => {
  const { client } = fakeSupabase(() => ({ data: { code: 'approved_typo' } }));
  setSupabase(client);
  await assert.rejects(approveDraft('d'), /review result.*code/);
});

for (const result of [
  null,
  { code: 'submitted', draft: { id: 'partial' } },
  { code: 'conflict', current_revision: '7' },
  { code: 'conflict', current_revision: -1 },
  { code: 'conflict', current_revision: 1.5 },
  { code: 'ok', created: 'yes' },
]) {
  test(`rejects malformed result ${JSON.stringify(result)}`, () => {
    assert.equal(reviewResultSchema.safeParse(result).success, false);
  });
}

test('validates and retains draft and revision information on an RPC answer', async () => {
  const draft = row('d', 'pending');
  const { client, log } = fakeSupabase(() => ({ data: { code: 'submitted', draft } }));
  setSupabase(client);
  assert.deepEqual(await submitDraft('d', 3), { code: 'submitted', draft });
  assert.equal(log[0].op, 'submit_draft');
  assert.deepEqual(log[0].payload, { p_draft: 'd', p_revision: 3 });
});

test('send-back carries the reviewed revision and note', async () => {
  const { client, log } = fakeSupabase(() => ({ data: { code: 'sent_back' } }));
  setSupabase(client);
  assert.deepEqual(await sendBackDraft('d', 3, 'Check the terminal'), { code: 'sent_back' });
  assert.deepEqual(log[0].payload, {
    p_draft: 'd',
    p_revision: 3,
    p_note: 'Check the terminal',
  });
});

test('discard carries the revision when the reviewer supplies one', async () => {
  const { client, log } = fakeSupabase(() => ({
    data: { code: 'revision_mismatch', current_revision: 4 },
  }));
  setSupabase(client);
  assert.deepEqual(await discardDraft('d', 3), { code: 'revision_mismatch', current_revision: 4 });
  assert.deepEqual(log[0].payload, { p_draft: 'd', p_revision: 3 });
});

test('RPC transport failure is distinct from a lifecycle refusal and is not retried', async () => {
  const { client, log } = fakeSupabase(() => ({ error: { message: 'Connection interrupted' } }));
  setSupabase(client);
  await assert.rejects(approveDraft('d'), /approve_draft: Connection interrupted/);
  assert.equal(log.length, 1);
});

function pagedClient(rows, cap, failFrom = null) {
  const calls = [];
  return {
    calls,
    client: {
      from(table) {
        const call = { table, orders: [] };
        const builder = {
          select(columns, options) {
            call.columns = columns;
            call.options = options;
            return builder;
          },
          order(column, options) {
            call.orders.push([column, options]);
            return builder;
          },
          range(from, to) {
            call.from = from;
            call.to = to;
            return builder;
          },
          then(resolve, reject) {
            calls.push(call);
            return Promise.resolve({
              data: rows.slice(call.from, Math.min(call.to + 1, call.from + cap)),
              count: rows.length,
              error: call.from === failFrom ? { message: 'Page failed' } : null,
            }).then(resolve, reject);
          },
        };
        return builder;
      },
    },
  };
}

test('review queue reads beyond the server cap with stable paging and pending first', async () => {
  const rows = [row('a'), row('b', 'pending'), row('c'), row('d', 'pending'), row('e')];
  const { client, calls } = pagedClient(rows, 2);
  setSupabase(client);
  assert.deepEqual(
    (await listDrafts()).map((draft) => draft.id),
    ['b', 'd', 'a', 'c', 'e'],
  );
  assert.deepEqual(
    calls.map(({ from }) => from),
    [0, 2, 4],
  );
  for (const call of calls) {
    assert.deepEqual(call.options, { count: 'exact' });
    assert.deepEqual(call.orders, [
      ['updated_at', { ascending: false }],
      ['id', { ascending: true }],
    ]);
  }
});

test('a failed later page fails the queue instead of showing a partial list', async () => {
  const { client } = pagedClient([row('a'), row('b'), row('c')], 2, 2);
  setSupabase(client);
  await assert.rejects(listDrafts(), /Page failed/);
});

const { runReviewCommand, reviewMessage } =
  await import('../../src/features/studio/data/review-commands.ts');
const { reviewDraftOf } = await import('../../src/features/studio/data/review-label.ts');
const { createQueryClient } = await import('../../src/shared/lib/query-client.ts');

test('send-back refuses an empty or oversized note without a request', async () => {
  const { client, log } = fakeSupabase(() => ({ data: { code: 'sent_back' } }));
  setSupabase(client);
  for (const note of [undefined, '', '  ', 'a'.repeat(4001)]) {
    await assert.rejects(
      runReviewCommand({ action: 'send-back', draft: row('d', 'pending'), note }),
      /reason/,
    );
  }
  assert.equal(log.length, 0);
});

test('a send-back note is trimmed and the reviewed revision is preserved', async () => {
  const { client, log } = fakeSupabase(() => ({ data: { code: 'sent_back' } }));
  setSupabase(client);
  await runReviewCommand({
    action: 'send-back',
    draft: row('d', 'pending'),
    note: '  Check the terminal  ',
  });
  assert.deepEqual(log[0].payload, { p_draft: 'd', p_revision: 3, p_note: 'Check the terminal' });
});

test('invalid lifecycle actions do not send requests', async () => {
  const { client, log } = fakeSupabase(() => ({}));
  setSupabase(client);
  await assert.rejects(
    runReviewCommand({ action: 'submit', draft: row('d', 'pending') }),
    /Refresh/,
  );
  await assert.rejects(
    runReviewCommand({ action: 'send-back', draft: row('d'), note: 'Reason' }),
    /not waiting/,
  );
  assert.equal(log.length, 0);
});

test('discard from a pending draft always carries a revision guard', async () => {
  const { client, log } = fakeSupabase(() => ({ data: { code: 'discarded' } }));
  setSupabase(client);
  await runReviewCommand({ action: 'discard', draft: row('d', 'pending') });
  assert.deepEqual(log[0].payload, { p_draft: 'd', p_revision: 3 });
});

test('a missing draft or conflict never claims approval', () => {
  assert.match(reviewMessage({ code: 'no_draft' }), /no longer available/);
  assert.match(reviewMessage({ code: 'conflict' }), /changed since/);
  assert.match(reviewMessage({ code: 'revision_mismatch' }), /Someone changed/);
});

test('review labels tolerate unnamed routes and malformed payloads', () => {
  assert.equal(reviewDraftOf(row('d')).label, 'Unnamed route');
  assert.equal(
    reviewDraftOf({ ...row('d'), kind: 'hotspot', payload: { stop: { name: 'Palma Hall' } } })
      .label,
    'Palma Hall',
  );
  assert.equal(reviewDraftOf({ ...row('d'), payload: null }).label, 'Unnamed route');
  assert.equal('subject_id' in reviewDraftOf(row('d')), false);
});

test('query clients isolate private queues and never retry a mutation automatically', () => {
  const first = createQueryClient();
  const second = createQueryClient();
  first.setQueryData(['test-private-drafts'], ['private']);
  assert.equal(second.getQueryData(['test-private-drafts']), undefined);
  assert.equal(first.getDefaultOptions().mutations.retry, false);
  first.clear();
  second.clear();
});
