import * as z from 'zod/mini';

import { assertNotAnothersDraft } from './draft-guard';
import { updateDraft } from './drafts';
import type { DraftRow } from './review-schema';

const payloadSchema = z.record(z.string(), z.unknown());
const factsSchema = z.record(z.string(), z.unknown());
export interface DraftFact {
  key: string;
  label: string;
  value: string;
}
const ROUTE_FIELDS = [
  ['signboard', 'Signboard'],
  ['fare_note', 'Fare note'],
  ['via', 'Via'],
];
const PLACE_FIELDS = [
  ['name', 'Ground name'],
  ['informal', 'Common name'],
  ['note', 'Note'],
];

export function draftFacts(draft: DraftRow): DraftFact[] {
  const payload = payloadSchema.parse(draft.payload);
  const facts = factsSchema.parse(payload[draft.kind === 'route' ? 'route' : 'stop']);
  return (draft.kind === 'route' ? ROUTE_FIELDS : PLACE_FIELDS).map(([key, label]) => ({
    key,
    label,
    value: typeof facts[key] === 'string' ? facts[key] : '',
  }));
}

export async function saveDraftFacts(draft: DraftRow, values: Record<string, string>) {
  await assertNotAnothersDraft(draft);
  if (draft.status !== 'draft') throw new Error('Send this draft back before editing it.');
  const payload = payloadSchema.parse(draft.payload);
  const key = draft.kind === 'route' ? 'route' : 'stop';
  const facts = factsSchema.parse(payload[key]);
  for (const field of draftFacts(draft)) {
    const value = z
      .string()
      .check(z.trim(), z.maxLength(4000))
      .parse(values[field.key] ?? field.value);
    if (field.key === 'name' && !value) throw new Error('Give the place a ground name.');
    facts[field.key] = value || null;
  }
  return updateDraft(draft.id, draft.revision, { ...payload, [key]: facts });
}
