import { useEffect, useId } from 'react';

import { Button } from '@/design-system/primitives/button';

import { reviewDraftOf } from '../data/review-label';
import type { DraftRow } from '../data/review-schema';
import { LockedDraft } from '../panels/locked-draft';
import { useDraftRowLock } from '../panels/use-draft-lock';

interface HeldDraftSheetProps {
  /** Another editor's draft of a route or place with no approved row: it has no card to open. */
  draft: DraftRow;
  /** The places' names, for the draft's label (useReviewNames). */
  places: ReadonlyMap<string, string>;
  /** Approved: the map's routes and places are read again. */
  onApproved: () => void;
  onClose: () => void;
}

/**
 * A small sheet over the map for another editor's draft of a new route or place (the owner's
 * Q122): its name, who is changing it, and Approve, which any editor may press. Nothing in it is
 * editable, as on a card with a lock. A look for now, until the owner designs it.
 */
export function HeldDraftSheet({ draft, places, onApproved, onClose }: HeldDraftSheetProps) {
  const headingId = useId();
  const { lock, retry } = useDraftRowLock(draft);
  // Escape closes it, as a card's ✕ does.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <section
      aria-labelledby={headingId}
      data-testid="held-draft-sheet"
      className="absolute bottom-4 left-1/2 z-20 flex w-80 max-w-[calc(100%-2rem)] -translate-x-1/2 flex-col gap-3 rounded-xl bg-surface p-4 font-sn-pro shadow-large"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 id={headingId} className="text-base font-semibold text-content-primary">
          {reviewDraftOf(draft, places).label}
        </h2>
        <Button variant="plain" size="small" label="Close" onClick={onClose} />
      </div>
      <LockedDraft
        kind={draft.kind}
        subjectId={draft.subject_id}
        lock={lock ?? { state: 'checking' }}
        onRetry={retry}
        onApproved={() => {
          onApproved();
          onClose();
        }}
      />
    </section>
  );
}
