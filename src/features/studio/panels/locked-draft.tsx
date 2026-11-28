import { DraftLockNotice } from './draft-lock-notice';
import { useStoredDraft } from './use-stored-draft';
import type { DraftLock } from '../data/draft-lock';
import type { DraftKind } from '../data/review-schema';

interface LockedDraftProps {
  kind: DraftKind;
  subjectId: string;
  lock: DraftLock;
  onRetry: () => void;
  /** Their draft approved or discarded: the map reads its rows again. */
  onSettled: () => void;
}

/** A card's lock notice on another editor's draft, with Approve on the draft as it is stored, and Discard once it has gone 7 days without a change. */
export function LockedDraft({ kind, subjectId, lock, onRetry, onSettled }: LockedDraftProps) {
  const stored = useStoredDraft({
    kind,
    subjectId,
    onApproved: onSettled,
    onDiscarded: onSettled,
  });
  return (
    <DraftLockNotice
      lock={lock}
      onRetry={onRetry}
      onApprove={stored.approve}
      isApproving={stored.isApproving}
      otherDiscard={stored.otherDiscard}
      onDiscard={stored.discard}
      isDiscarding={stored.isDiscarding}
      error={stored.error}
    />
  );
}
