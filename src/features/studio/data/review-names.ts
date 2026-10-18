import type { PublicationSubject } from './publication';
import { reviewDraftOf } from './review-label';
import type { DraftRow } from './review-schema';

/** Draft-only places also name the route that depends on them. */
export function reviewPlaceNames(
  drafts: DraftRow[],
  subjects: PublicationSubject[],
): Map<string, string> {
  const names = new Map(
    subjects
      .filter((subject) => subject.kind === 'hotspot')
      .map((subject) => [subject.id, subject.label]),
  );
  for (const draft of drafts)
    if (draft.kind === 'hotspot') names.set(draft.subject_id, reviewDraftOf(draft).label);
  return names;
}
