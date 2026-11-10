import type { Database } from '@/shared/types/database.types';

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
 * The studio's side of Draft and Published (0022, 20261105160000_draft_published):
 * every save is a draft, publishing applies it, unpublishing takes the row
 * down and leaves it a draft, and taking down / putting back flips a row's
 * status. All of it through RPCs that answer a small jsonb result, never an
 * exception a screen would read.
 *
 * Payload v1, as approve_draft reads it (the migration's header documents it
 * for both sides): a route draft is the route's editable columns plus the
 * complete direction set, each direction with its full route_stop list; a
 * hotspot draft is the stop's columns plus its full link list. The payload
 * is the whole subject, so approving it twice writes the same thing.
 */

export type { DraftKind, DraftRow, DraftStatus, ReviewCode, ReviewResult } from './review-schema';

/** The review functions, with their arguments as the generated types have them. */
type ReviewFunctions = Pick<
  Database['public']['Functions'],
  | 'claim_draft'
  | 'save_draft'
  | 'discard_draft'
  | 'publish_draft'
  | 'unpublish'
  | 'take_down'
  | 'put_back'
>;

export async function callReview<TName extends keyof ReviewFunctions>(
  fn: TName,
  args: ReviewFunctions[TName]['Args'],
): Promise<ReviewResult> {
  const client = requireSupabase();
  // Every answer is validated below: the generated Returns is only Json.
  const { data, error } = await client.rpc(fn, args);
  if (error) throw new Error(`${fn}: ${error.message}`);
  const [row] = parsed(reviewResultSchema, [data], 'review result');
  if (['ok', 'approved', 'discarded', 'taken_down', 'put_back', 'unpublished'].includes(row.code))
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
    // A new subject has no base: SQL null, which the generator cannot express (every argument
    // it types is non-null), so this one argument is widened. The function requires the null.
    p_base_revision: baseRevision as number,
    p_payload: toJson(payload),
    // Left out rather than null: the argument's default is null.
    ...(note === undefined ? {} : { p_note: note }),
  });
}

/**
 * A draft's payload replaced (save_draft), if nobody changed it since it was
 * read (`revision`), by its maker or by anyone once its maker's account is
 * gone. publish_draft validates the payload again before it applies it.
 */
export async function saveDraft(
  draftId: string,
  revision: number,
  payload: Record<string, unknown>,
): Promise<ReviewResult> {
  return callReview('save_draft', {
    p_draft: draftId,
    p_revision: revision,
    p_payload: toJson(payload),
  });
}

export async function discardDraft(draftId: string, revision?: number): Promise<ReviewResult> {
  // No revision is left out rather than null: the argument's default is null.
  return callReview(
    'discard_draft',
    revision === undefined ? { p_draft: draftId } : { p_draft: draftId, p_revision: revision },
  );
}

/** The draft published, at the revision the editor saw: the map changes now, the public map at the next publish. */
export async function publishDraft(draftId: string, revision: number): Promise<ReviewResult> {
  return callReview('publish_draft', { p_draft: draftId, p_revision: revision });
}

/**
 * Taken off the public map at the next publish, and left a draft: the one it
 * already had, or a new one of it as it stands. A hotspot that ends a
 * published route answers `blocked`.
 */
export async function unpublish(kind: DraftKind, subjectId: string): Promise<ReviewResult> {
  return callReview('unpublish', { p_kind: kind, p_subject_id: subjectId });
}

export async function takeDown(kind: DraftKind, subjectId: string): Promise<ReviewResult> {
  return callReview('take_down', { p_kind: kind, p_subject_id: subjectId });
}

export async function putBack(kind: DraftKind, subjectId: string): Promise<ReviewResult> {
  return callReview('put_back', { p_kind: kind, p_subject_id: subjectId });
}

// --- Reading drafts for the review list and the playground markers.

const DRAFT_LIST_SELECT =
  'id, kind, subject_id, is_new, base_revision, revision, status, payload, note, editor_id, last_saved_by, created_at, updated_at, submitted_at';

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
