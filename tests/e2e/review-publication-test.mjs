// Real SQL/API publication checks on disposable data only; no browser or Supabase.
import assert from 'node:assert/strict';
import { previewToken } from '../../scripts/preview/review-fixture.mjs';
import { indexSchema } from '../../src/features/routes/published/index-schema.ts';
import { waitingForPublication } from '../../src/features/studio/data/publication.ts';
const BASE = 'http://127.0.0.1:4180';
const api = async (path, body) => {
  const response = await fetch(`${BASE}/api/rest/v1/${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { Authorization: `Bearer ${previewToken()}`, 'content-type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  assert.ok(response.ok, `${path}: ${response.status}`);
  return response.json();
};
const id = crypto.randomUUID();
const payload = {
  version: 1,
  stop: {
    name: 'Publication verification sample',
    informal: null,
    aliases: [],
    kind: 'hintuan',
    note: 'Version 1',
    line: null,
    area: null,
    point: { type: 'Point', coordinates: [121.06, 14.65] },
  },
  links: [],
};
const claim = await api('rpc/claim_draft', {
  p_kind: 'hotspot',
  p_subject_id: id,
  p_is_new: true,
  p_base_revision: null,
  p_payload: payload,
});
const submit = await api('rpc/submit_draft', {
  p_draft: claim.draft.id,
  p_revision: claim.draft.revision,
});
assert.equal(
  (
    await api('rpc/approve_reviewed_draft', {
      p_draft: claim.draft.id,
      p_revision: submit.draft.revision,
    })
  ).code,
  'approved',
);
const publish = async () =>
  assert.ok((await fetch(`${BASE}/preview-admin/publish`, { method: 'POST' })).ok);
const snapshot = async () =>
  indexSchema.parse(await (await fetch(`${BASE}/data/index.v5.json`)).json());
const subject = async () => {
  const [row] = await api(`stop?id=eq.${id}`);
  return {
    id: row.id,
    kind: 'hotspot',
    label: row.name,
    status: row.status,
    revision: row.revision,
    updatedAt: row.updated_at,
    statusAt: row.status_at,
  };
};
assert.equal(waitingForPublication([await subject()], await snapshot()).length, 1);
await publish();
assert.equal(
  waitingForPublication([await subject()], await snapshot()).length,
  0,
  'snapshot carries the exact approved version',
);
const current = await subject();
const next = await api('rpc/claim_draft', {
  p_kind: 'hotspot',
  p_subject_id: id,
  p_is_new: false,
  p_base_revision: current.revision,
  p_payload: payload,
});
const again = await api('rpc/submit_draft', {
  p_draft: next.draft.id,
  p_revision: next.draft.revision,
});
await api('rpc/approve_reviewed_draft', {
  p_draft: next.draft.id,
  p_revision: again.draft.revision,
});
assert.equal(
  waitingForPublication([await subject()], await snapshot()).length,
  1,
  'approval after snapshot stays waiting',
);
await publish();
assert.equal(
  waitingForPublication([await subject()], await snapshot()).length,
  0,
  'even an identical-content approval is accounted for',
);
assert.equal(
  (await api('rpc/take_down', { p_kind: 'hotspot', p_subject_id: id })).code,
  'taken_down',
);
await publish();
assert.ok(
  !(await snapshot()).hotspots.some((place) => place.id === id),
  'published takedown removes the place',
);
assert.equal((await api('rpc/put_back', { p_kind: 'hotspot', p_subject_id: id })).code, 'put_back');
await publish();
assert.ok(
  (await snapshot()).hotspots.some((place) => place.id === id),
  'publication restores the place',
);
console.log(
  'PASS: exact publication versions, late approval, identical-content approval, take-down publication and put-back publication',
);
