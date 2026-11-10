import * as z from 'zod/mini';

export type DraftKind = 'route' | 'hotspot';
export type DraftStatus = 'draft' | 'pending';

/** The machine codes publish_draft and friends answer with (0022, 20261105160000_draft_published). */
const reviewCodeSchema = z.enum([
  'ok',
  'approved',
  'discarded',
  'taken_down',
  'put_back',
  'unpublished',
  'conflict',
  'revision_mismatch',
  'no_draft',
  'not_your_draft',
  'not_approved',
  'not_published',
  'not_taken_down',
  'subject_exists',
  'subject_gone',
  'ends_taken',
  'loop_taken',
  'terminal_place_taken',
  'direction_clash',
  'direction_elsewhere',
  'payload_incomplete',
  'blocked',
  'bad_payload',
  'busy',
  'refused',
]);
export type ReviewCode = z.infer<typeof reviewCodeSchema>;

export const draftRowSchema = z.object({
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
  /** Who saved it last: its maker, or another editor once the maker's account is gone. */
  last_saved_by: z.optional(z.nullable(z.string())),
  created_at: z.string(),
  updated_at: z.string(),
  submitted_at: z.nullable(z.string()),
});
export type DraftRow = z.infer<typeof draftRowSchema>;

export const reviewResultSchema = z.object({
  code: reviewCodeSchema,
  draft: z.optional(draftRowSchema),
  current_revision: z.optional(z.number().check(z.int(), z.nonnegative())),
  created: z.optional(z.boolean()),
});
export type ReviewResult = z.infer<typeof reviewResultSchema>;
