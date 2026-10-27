import { toJson } from './json';
import { parsed, readAll } from './read-all';
import { notifyReviewChange } from './review-events';
import {
  draftRowSchema,
  reviewResultSchema,
  type DraftKind,
  type DraftRow,
  type ReviewResult,
} from './review-schema';
import { requireSupabase } from './supabase';

/**
 * The studio's side of the review workflow (0022): every save becomes a
 * draft, a draft waits pending, approving applies it, and taking down /
 * putting back flips a row's status. All of it through RPCs that answer a
 * small jsonb result, never an exception a screen would read.
 *
 * Payload v1, as approve_draft reads it (the migration's header documents it
 * for both sides): a route draft is the route's editable columns plus the
 * complete direction set, each direction with its full route_stop list; a
 * hotspot draft is the stop's columns plus its full link list. The payload
 * is the whole subject, so approving it twice writes the same thing.
 */

export type { DraftKind, DraftRow, DraftStatus, ReviewCode, ReviewResult } from './review-schema';

export async function callReview(fn: string, args: Record<string, unknown>): Promise<ReviewResult> {
  const client = requireSupabase();
  // SQL-null arguments are valid here, although the generated RPC Args
  // describe those scalar inputs as non-null. Validate every response below.
  const { data, error } = await client.rpc(fn as never, args as never);
  if (error) throw new Error(`${fn}: ${error.message}`);
  const [row] = parsed(reviewResultSchema, [data], 'review result');
  if (
    ['ok', 'approved', 'submitted', 'sent_back', 'discarded', 'taken_down', 'put_back'].includes(
      row.code,
    )
  )
    notifyReviewChange();
  return row;
}

// --- Payload builders: the subject's whole state, as the draft carries it.

export interface RouteDraftDirection {
  id: string;
  reversed: boolean;
  direction_name?: string | null;
  origin_terminal?: string | null;
  destination_terminal?: string | null;
  control_points: unknown;
  segments: unknown;
  /** SQL null — a slot with no line (deleteDirection's emptied direction). */
  shape: unknown;
  overview: unknown;
  /** Carried over as the row has it: approve_draft writes 'drawn' when it is absent. */
  confidence?: string;
  borrowed_from?: string | null;
  borrowed_part?: string | null;
  borrowed_m?: number | null;
  signboards: string[];
  /** The direction's complete route_stop set. */
  links: { stop_id: string; stop_sequence: number }[];
}

export interface RouteDraftRoute {
  signboard: string | null;
  mode: string;
  fare_note: string | null;
  via: string | null;
  head_stop_id: string | null;
  tail_stop_id: string | null;
  is_loop: boolean;
}

export function routeDraftPayload(
  route: RouteDraftRoute,
  directions: RouteDraftDirection[],
): Record<string, unknown> {
  return { version: 1, route, directions };
}

export function hotspotDraftPayload(
  stop: {
    name: string;
    informal: string | null;
    aliases: string[];
    kind: string;
    note: string | null;
    area: unknown;
    point: unknown;
    line: string | null;
  },
  links: { route_variant_id: string; stop_sequence: number }[],
): Record<string, unknown> {
  return { version: 1, stop, links };
}

// --- The operations, in lifecycle order.

export async function claimDraft(
  kind: DraftKind,
  subjectId: string,
  isNew: boolean,
  baseRevision: number | null,
  payload: Record<string, unknown>,
  note?: string,
): Promise<ReviewResult> {
  return callReview('claim_draft', {
    p_kind: kind,
    p_subject_id: subjectId,
    p_is_new: isNew,
    p_base_revision: baseRevision,
    p_payload: payload,
    p_note: note ?? null,
  });
}

/**
 * A draft's payload replaced, if nobody changed it since it was read
 * (`revision`). Editing a draft takes it back out of review: a pending draft
 * goes back to 'draft', so an approval cannot pass a payload the reviewer has
 * not seen. approve_draft validates the payload again before it applies it.
 */
export async function updateDraft(
  draftId: string,
  revision: number,
  payload: Record<string, unknown>,
): Promise<ReviewResult> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('draft')
    .update({ payload: toJson(payload), status: 'draft', submitted_at: null })
    .eq('id', draftId)
    .eq('revision', revision)
    .select(DRAFT_LIST_SELECT)
    .maybeSingle();
  if (error) throw new Error(`draft ${draftId}: ${error.message}`);
  if (!data) return { code: 'revision_mismatch' };
  const [row] = parsed(draftRowSchema, [data], 'draft');
  notifyReviewChange();
  return { code: 'ok', created: false, draft: row };
}

export async function submitDraft(draftId: string, revision: number): Promise<ReviewResult> {
  return callReview('submit_draft', { p_draft: draftId, p_revision: revision });
}

export async function discardDraft(draftId: string, revision?: number): Promise<ReviewResult> {
  return callReview('discard_draft', { p_draft: draftId, p_revision: revision ?? null });
}

export async function approveDraft(draftId: string, revision?: number): Promise<ReviewResult> {
  if (revision === undefined) return callReview('approve_draft', { p_draft: draftId });
  return callReview('approve_reviewed_draft', { p_draft: draftId, p_revision: revision });
}

export async function takeDown(kind: DraftKind, subjectId: string): Promise<ReviewResult> {
  return callReview('take_down', { p_kind: kind, p_subject_id: subjectId });
}

export async function putBack(kind: DraftKind, subjectId: string): Promise<ReviewResult> {
  return callReview('put_back', { p_kind: kind, p_subject_id: subjectId });
}

// --- Reading drafts for the review list and the playground markers.

const DRAFT_LIST_SELECT =
  'id, kind, subject_id, is_new, base_revision, revision, status, payload, note, editor_id, created_at, updated_at, submitted_at';

/** Every draft, pending first then by recent activity: the review list. */
export async function listDrafts(): Promise<DraftRow[]> {
  const client = requireSupabase();
  const data = await readAll((from, to) =>
    client
      .from('draft')
      .select(DRAFT_LIST_SELECT, { count: 'exact' })
      .order('updated_at', { ascending: false })
      .order('id', { ascending: true })
      .range(from, to),
  );
  const rows = parsed(draftRowSchema, data, 'draft');
  return rows.sort((a, b) => (a.status === b.status ? 0 : a.status === 'pending' ? -1 : 1));
}

/** The draft a subject has, if any — one per (kind, subject). */
export async function draftOf(kind: DraftKind, subjectId: string): Promise<DraftRow | null> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('draft')
    .select(DRAFT_LIST_SELECT)
    .eq('kind', kind)
    .eq('subject_id', subjectId)
    .maybeSingle();
  if (error) throw new Error(`draft of ${kind} ${subjectId}: ${error.message}`);
  if (!data) return null;
  const [row] = parsed(draftRowSchema, [data], 'draft');
  return row;
}
