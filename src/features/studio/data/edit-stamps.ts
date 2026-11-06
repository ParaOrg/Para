import * as z from 'zod/mini';

import { fetchEditorNames } from './editor-names';
import { parsed, readAll } from './read-all';
import type { DraftKind } from './review-schema';
import { requireSupabase } from './supabase';

/**
 * A route's or hotspot's Draft and Published facts, as the studio's list
 * shows them (CONTEXT.md, "Draft / Published"; 20261105160000_draft_published).
 */
export interface EditStamp {
  kind: DraftKind;
  /** The route's id, or the hotspot's (its stop row's). */
  id: string;
  /** On the public map at the next publish. */
  isPublished: boolean;
  /** A draft is waiting: always, for one never published. */
  hasDraft: boolean;
  /** Author: who last saved it, its draft's saver when it has one, else the published row's. */
  authorId: string | null;
  /** The author's name from editor_name; null when they have none on file. */
  authorName: string | null;
  /** Date published: its last publish, ISO. Null when never published. Approximate before 2026-11-05. */
  publishedAt: string | null;
  /** Last edited: its draft's last save when it has one, else the published row's, ISO. */
  lastEditedAt: string | null;
}

export interface EditStamps {
  routes: Map<string, EditStamp>;
  hotspots: Map<string, EditStamp>;
}

const STAMP_COLUMNS = 'id, status, published_at, last_saved_at, last_saved_by';
const stampRowSchema = z.object({
  id: z.string(),
  status: z.string(),
  published_at: z.nullable(z.string()),
  last_saved_at: z.nullable(z.string()),
  last_saved_by: z.nullable(z.string()),
});
type StampRow = z.infer<typeof stampRowSchema>;

const draftStampSchema = z.object({
  kind: z.enum(['route', 'hotspot']),
  subject_id: z.string(),
  updated_at: z.string(),
  editor_id: z.nullable(z.string()),
  last_saved_by: z.nullable(z.string()),
});
type DraftStamp = z.infer<typeof draftStampSchema>;

/** Every route's and hotspot's stamps, the ones that exist only as a new draft among them. */
export async function fetchEditStamps(): Promise<EditStamps> {
  const client = requireSupabase();
  const [routeRows, stopRows, draftRows, names] = await Promise.all([
    readAll((from, to) =>
      client.from('route').select(STAMP_COLUMNS, { count: 'exact' }).order('id').range(from, to),
    ),
    readAll((from, to) =>
      client.from('stop').select(STAMP_COLUMNS, { count: 'exact' }).order('id').range(from, to),
    ),
    readAll((from, to) =>
      client
        .from('draft')
        .select('kind, subject_id, updated_at, editor_id, last_saved_by', { count: 'exact' })
        .order('id')
        .range(from, to),
    ),
    fetchEditorNames(),
  ]);
  const drafts = parsed(draftStampSchema, draftRows, 'draft');
  const draftOf = new Map(drafts.map((d) => [`${d.kind}:${d.subject_id}`, d]));
  const stamp = (kind: DraftKind, id: string, row: StampRow | null): EditStamp => {
    const draft = draftOf.get(`${kind}:${id}`) ?? null;
    const authorId = draft
      ? (draft.last_saved_by ?? draft.editor_id)
      : (row?.last_saved_by ?? null);
    return {
      kind,
      id,
      isPublished: row?.status === 'approved',
      hasDraft: draft !== null,
      authorId,
      authorName: authorId === null ? null : (names.get(authorId) ?? null),
      publishedAt: row?.published_at ?? null,
      lastEditedAt: draft ? draft.updated_at : (row?.last_saved_at ?? null),
    };
  };
  const stampsOf = (kind: DraftKind, rows: StampRow[]): Map<string, EditStamp> => {
    const stamps = new Map(rows.map((row) => [row.id, stamp(kind, row.id, row)]));
    const draftsOnly = drafts.filter(
      (d: DraftStamp) => d.kind === kind && !stamps.has(d.subject_id),
    );
    for (const d of draftsOnly) stamps.set(d.subject_id, stamp(kind, d.subject_id, null));
    return stamps;
  };
  return {
    routes: stampsOf('route', parsed(stampRowSchema, routeRows, 'route')),
    hotspots: stampsOf('hotspot', parsed(stampRowSchema, stopRows, 'hotspot')),
  };
}
