import { useQuery } from '@tanstack/react-query';

import { useStudioSession } from '../auth/use-studio-session';
import { editorNameOf, isAnothersDraft, type DraftLock } from '../data/draft-lock';
import { draftOf } from '../data/drafts';
import { reviewKeys } from '../data/review-keys';
import type { DraftKind, DraftRow } from '../data/review-schema';
import { useEditorNamesQuery } from '../data/use-editor-names-query';

interface UseDraftLock {
  /** Null when the editor may change the subject: no draft, or their own. */
  lock: DraftLock | null;
  retry: () => void;
}

/**
 * Whether `draft`, once read, is another editor's: the lock to show, or null
 * when it is the editor's own or absent. The name is read
 * only when it is needed.
 */
export function useDraftRowLock(draft: DraftRow | null | undefined): UseDraftLock {
  const session = useStudioSession();
  const userId = session?.user.id ?? null;
  const isAnothers = userId !== null && isAnothersDraft(draft ?? null, userId);
  const names = useEditorNamesQuery(isAnothers);
  const retry = () => {
    if (isAnothers) void names.refetch();
  };
  // Not yet known whose session this is: whether the draft is another's waits on it.
  if (draft && session === undefined) return { lock: { state: 'checking' }, retry };
  if (!isAnothers || !draft) return { lock: null, retry };
  if (names.isPending) return { lock: { state: 'checking' }, retry };
  // A name that cannot be read still leaves the draft locked, under plain words.
  const name = names.data ? editorNameOf(names.data, draft.editor_id) : null;
  return { lock: { state: 'other', name }, retry };
}

/**
 * Whether another editor holds the draft of this route or hotspot. Read each
 * time a card opens, so an editor who just started a draft is seen. Needs
 * `StudioSessionProvider` above it.
 */
export function useDraftLock(kind: DraftKind, subjectId: string): UseDraftLock {
  const session = useStudioSession();
  const userId = session?.user.id ?? null;
  const isSignedIn = userId !== null;
  const draft = useQuery({
    queryKey: reviewKeys.draftOf(kind, subjectId),
    queryFn: () => draftOf(kind, subjectId),
    enabled: isSignedIn,
  });
  const held = useDraftRowLock(draft.data);
  const retry = () => {
    void draft.refetch();
    held.retry();
  };
  // Still restoring the session, which says whose draft is whose: checking, not open to edit.
  if (session === undefined) return { lock: { state: 'checking' }, retry };
  if (!isSignedIn) return { lock: null, retry };
  if (draft.isError) return { lock: { state: 'unknown' }, retry };
  if (draft.isPending) return { lock: { state: 'checking' }, retry };
  return { lock: held.lock, retry };
}
