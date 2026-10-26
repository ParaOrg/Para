import { useQuery } from '@tanstack/react-query';

import { useSession } from '../auth/use-session';
import { editorNameOf, isAnothersDraft, type DraftLock } from '../data/draft-lock';
import { draftOf } from '../data/drafts';
import { editorKeys } from '../data/editor-keys';
import { fetchEditorNames } from '../data/editor-names';
import { STUDIO_DRAFTS } from '../data/flags';
import { reviewKeys } from '../data/review-keys';
import type { DraftKind } from '../data/review-schema';

interface UseDraftLock {
  /** Null when the editor may change the subject: no draft, their own, or drafts are off. */
  lock: DraftLock | null;
  retry: () => void;
}

/**
 * Whether another editor holds the draft of this route or hotspot. Read each
 * time a card opens, so an editor who just started a draft is seen. Needs
 * `DraftLocksProvider` above it.
 */
export function useDraftLock(kind: DraftKind, subjectId: string): UseDraftLock {
  const userId = useSession()?.user.id ?? null;
  const isOn = STUDIO_DRAFTS && userId !== null;
  const draft = useQuery({
    queryKey: reviewKeys.draftOf(kind, subjectId),
    queryFn: () => draftOf(kind, subjectId),
    enabled: isOn,
  });
  const draftIsAnothers = isOn && isAnothersDraft(draft.data ?? null, userId);
  const names = useQuery({
    queryKey: editorKeys.names(),
    queryFn: fetchEditorNames,
    enabled: draftIsAnothers,
  });
  const retry = () => {
    void draft.refetch();
    if (draftIsAnothers) void names.refetch();
  };

  if (!isOn) return { lock: null, retry };
  if (draft.isError) return { lock: { state: 'unknown' }, retry };
  if (draft.isPending) return { lock: { state: 'checking' }, retry };
  if (!draft.data || !isAnothersDraft(draft.data, userId)) return { lock: null, retry };
  if (names.isPending) return { lock: { state: 'checking' }, retry };
  // A name that cannot be read still leaves the draft locked, under plain words.
  const name = names.data ? editorNameOf(names.data, draft.data.editor_id) : null;
  return { lock: { state: 'other', name }, retry };
}
