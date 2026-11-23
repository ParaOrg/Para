import { DraftLockNotice } from './draft-lock-notice';
import { useStoredDraft } from './use-stored-draft';
import type { DraftLock } from '../data/draft-lock';
import type { DraftKind } from '../data/review-schema';

interface LockedDraftProps {
  kind: DraftKind;
  subjectId: string;
  lock: DraftLock;
  onRetry: () => void;
  /** Their draft approved: what is published changed, so the map reads it again. */
  onApproved: () => void;
}

/** A card's lock notice on another editor's draft, with Approve on the draft as it is stored. */
export function LockedDraft({ kind, subjectId, lock, onRetry, onApproved }: LockedDraftProps) {
  const stored = useStoredDraft({ kind, subjectId, onApproved });
  return (
    <DraftLockNotice
      lock={lock}
      onRetry={onRetry}
      onApprove={stored.approve}
      isApproving={stored.isApproving}
      error={stored.error}
    />
  );
}
