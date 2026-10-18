import * as z from 'zod/mini';

import { parsed } from './read-all';
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

export type DraftKind = 'route' | 'hotspot';
export type DraftStatus = 'draft' | 'pending';

/** The machine codes approve_draft and friends answer with (0022). */
export type ReviewCode =
  | 'ok'
  | 'approved'
  | 'submitted'
  | 'sent_back'
  | 'discarded'
  | 'taken_down'
  | 'put_back'
  | 'already_pending'
  | 'conflict'
  | 'revision_mismatch'
  | 'no_draft'
  | 'not_pending'
  | 'not_approved'
  | 'not_taken_down'
  | 'subject_exists'
  | 'subject_gone'
  | 'ends_taken'
  | 'loop_taken'
  | 'terminal_place_taken'
  | 'direction_clash'
  | 'direction_elsewhere'
  | 'payload_incomplete'
  | 'blocked'
  | 'bad_payload'
  | 'refused';

const draftRowSchema = z.object({
  id: z.string(),
  kind: z.enum(['route', 'hotspot']),
  subject_id: z.string(),
  is_new: z.boolean(),
  base_revision: z.nullable(z.number()),
  revision: z.number(),
  status: z.enum(['draft', 'pending']),
  payload: z.unknown(),
  note: z.nullable(z.string()),
  editor_id: z.nullable(z.string()),
  created_at: z.string(),
  updated_at: z.string(),
  submitted_at: z.nullable(z.string()),
});
export type DraftRow = z.infer<typeof draftRowSchema>;

const resultSchema = z.looseObject({ code: z.string() });

export interface ReviewResult {
  code: ReviewCode;
  draft?: DraftRow;
  current_revision?: number;
  created?: boolean;
}

async function call(fn: string, args: Record<string, unknown>): Promise<ReviewResult> {
  const client = requireSupabase();
  // 0022's functions are not in the generated types until the owner applies
  // it and the types are regenerated; the code answers a string either way.
  const { data, error } = await client.rpc(fn as never, args as never);
  if (error) throw new Error(`${fn}: ${error.message}`);
  const [row] = parsed(resultSchema, [data], 'review result');
  return row as ReviewResult;
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
  return call('claim_draft', {
    p_kind: kind,
    p_subject_id: subjectId,
    p_is_new: isNew,
    p_base_revision: baseRevision,
    p_payload: payload,
    p_note: note ?? null,
  });
}

export async function submitDraft(draftId: string, revision: number): Promise<ReviewResult> {
  return call('submit_draft', { p_draft: draftId, p_revision: revision });
}

export async function sendBackDraft(
  draftId: string,
  revision: number,
  note: string,
): Promise<ReviewResult> {
  return call('send_back_draft', { p_draft: draftId, p_revision: revision, p_note: note });
}

export async function discardDraft(draftId: string, revision?: number): Promise<ReviewResult> {
  return call('discard_draft', { p_draft: draftId, p_revision: revision ?? null });
}

export async function approveDraft(draftId: string): Promise<ReviewResult> {
  return call('approve_draft', { p_draft: draftId });
}

export async function takeDown(kind: DraftKind, subjectId: string): Promise<ReviewResult> {
  return call('take_down', { p_kind: kind, p_subject_id: subjectId });
}

export async function putBack(kind: DraftKind, subjectId: string): Promise<ReviewResult> {
  return call('put_back', { p_kind: kind, p_subject_id: subjectId });
}

// --- Reading drafts for the review list and the playground markers.

const DRAFT_LIST_SELECT =
  'id, kind, subject_id, is_new, base_revision, revision, status, payload, note, editor_id, created_at, updated_at, submitted_at';

/** Every draft, pending first then by recent activity: the review list. */
export async function listDrafts(): Promise<DraftRow[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('draft')
    .select(DRAFT_LIST_SELECT)
    .order('status', { ascending: false }) // 'pending' after 'draft' alphabetically? keep explicit below
    .order('updated_at', { ascending: false });
  if (error) throw new Error(`draft list: ${error.message}`);
  const rows = parsed(draftRowSchema, data ?? [], 'draft');
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
