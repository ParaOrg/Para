import * as z from 'zod/mini';

import { routeName } from '@/features/routes/model/routes';

import type { DraftRow } from './review-schema';

const nameSchema = z.object({
  stop: z.optional(z.object({ name: z.optional(z.string()) })),
  route: z.optional(
    z.object({
      signboard: z.optional(z.nullable(z.string())),
      head_stop_id: z.optional(z.nullable(z.string())),
      tail_stop_id: z.optional(z.nullable(z.string())),
      via: z.optional(z.nullable(z.string())),
    }),
  ),
});

export interface ReviewDraft {
  id: string;
  label: string;
  kind: 'route' | 'hotspot';
  status: 'draft' | 'pending';
  isNew: boolean;
  /** The account that made the draft; null once that account is gone. */
  editorId: string | null;
  revision: number;
  note: string | null;
  updatedAt: string;
}

export function reviewDraftOf(
  row: DraftRow,
  places: ReadonlyMap<string, string> = new Map(),
): ReviewDraft {
  const names = nameSchema.safeParse(row.payload);
  const name = names.success
    ? row.kind === 'hotspot'
      ? names.data.stop?.name
      : names.data.route?.signboard
    : null;
  const route = names.success ? names.data.route : null;
  const head = route?.head_stop_id ? places.get(route.head_stop_id) : null;
  const tail = route?.tail_stop_id ? places.get(route.tail_stop_id) : null;
  const label =
    row.kind === 'route' && head && tail
      ? routeName(head, tail, route?.via)
      : name?.trim() || `Unnamed ${row.kind}`;
  return {
    id: row.id,
    label,
    kind: row.kind,
    status: row.status,
    isNew: row.is_new,
    editorId: row.editor_id,
    revision: row.revision,
    note: row.note,
    updatedAt: row.updated_at,
  };
}
