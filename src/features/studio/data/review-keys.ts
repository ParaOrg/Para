import type { DraftKind } from './review-schema';

export const reviewKeys = {
  all: ['studio-review'] as const,
  publication: () => [...reviewKeys.all, 'publication'] as const,
  comparison: (id: string, revision: number) =>
    [...reviewKeys.all, 'comparison', id, revision] as const,
  drafts: () => [...reviewKeys.all, 'drafts'] as const,
  /** Every subject's draft as read for its card and its Edit: what a draft save makes stale. */
  draftsOf: () => [...reviewKeys.all, 'draft-of'] as const,
  draftOf: (kind: DraftKind, subjectId: string) =>
    [...reviewKeys.all, 'draft-of', kind, subjectId] as const,
};
