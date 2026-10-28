import * as z from 'zod/mini';

import { assertNotAnothersDraft } from './draft-guard';
import { routeApprovedState } from './draft-reads';
import { callReview } from './drafts';
import { readAll } from './read-all';
import { reviewDependencies, type ReviewDependency } from './review-dependencies';
import type { DraftRow } from './review-schema';
import { routePayloadOf, routeStateFromDraft } from './route-draft-state';
import { requireSupabase } from './supabase';

const hotspotColumnsSchema = z.object({
  name: z.string(),
  informal: z.nullable(z.string()),
  aliases: z.array(z.string()),
  kind: z.enum(['terminal', 'hintuan']),
  note: z.nullable(z.string()),
  area: z.unknown(),
  point: z.unknown(),
  line: z.nullable(z.string()),
});
const hotspotPayloadSchema = z.object({
  version: z.literal(1),
  stop: hotspotColumnsSchema,
  links: z.array(z.object({ route_variant_id: z.string(), stop_sequence: z.number() })),
});
const hotspotLiveSchema = z.extend(hotspotColumnsSchema, { revision: z.number() });
const linkSchema = z.object({ route_variant_id: z.string(), stop_sequence: z.number() });

export interface ReviewComparison {
  approved: Record<string, unknown> | null;
  proposed: Record<string, unknown>;
  currentRevision: number | null;
  hasConflict: boolean;
  dependencies: ReviewDependency[];
}

export async function fetchReviewComparison(draft: DraftRow): Promise<ReviewComparison> {
  const client = requireSupabase();
  const proposed =
    draft.kind === 'route'
      ? routePayloadOf(routeStateFromDraft(draft))
      : hotspotPayloadSchema.parse(draft.payload);
  const dependencies = draft.kind === 'route' ? await reviewDependencies(proposed) : [];
  if (draft.is_new)
    return { approved: null, proposed, currentRevision: null, hasConflict: false, dependencies };
  if (draft.kind === 'route') {
    const state = await routeApprovedState(draft.subject_id);
    return {
      approved: routePayloadOf(state),
      proposed,
      currentRevision: state.baseRevision,
      hasConflict: state.baseRevision !== draft.base_revision,
      dependencies,
    };
  }
  const { data, error } = await client
    .from('stop')
    .select('name, informal, aliases, kind, note, area, point, line, revision')
    .eq('id', draft.subject_id)
    .single();
  if (error) throw new Error(error.message);
  const { revision, ...stop } = hotspotLiveSchema.parse(data);
  const rows = await readAll((from, to) =>
    client
      .from('route_stop')
      .select('route_variant_id, stop_sequence', { count: 'exact' })
      .eq('stop_id', draft.subject_id)
      .order('route_variant_id')
      .range(from, to),
  );
  const approved = { version: 1, stop, links: z.array(linkSchema).parse(rows) };
  return {
    approved,
    proposed,
    currentRevision: revision,
    hasConflict: revision !== draft.base_revision,
    dependencies,
  };
}

/** Conflict resolution is explicit replacement, followed by a fresh submission and review. */
export async function refreshDraftBase(draft: DraftRow, currentRevision: number) {
  await assertNotAnothersDraft(draft);
  return callReview('refresh_draft_base', {
    p_draft: draft.id,
    p_revision: draft.revision,
    p_base_revision: currentRevision,
  });
}
