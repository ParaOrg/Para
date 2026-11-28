import { useEffect, useId, useRef } from 'react';

import { Button } from '@/design-system/primitives/button';
import type { HotspotRow } from '@/features/routes/model/hotspots';

import { LockedDraft } from './locked-draft';
import { useDraftRowLock } from './use-draft-lock';
import type { DraftRow } from '../data/review-schema';

const KIND_LABEL = {
  terminal: 'Terminal',
  hintuan: 'Hintuan',
} satisfies Record<HotspotRow['kind'], string>;

interface DraftPlaceCardProps {
  /** The draft of a place with no approved row yet: a new terminal or hintuan. */
  draft: DraftRow;
  /** The place as its draft has it (useDraftOnly). */
  hotspot: HotspotRow;
  /** Opens the editor on the draft: Edit, the editor's own draft only. */
  onEdit: () => void;
  /** Another editor's draft approved from the card: the map reads its places again. */
  onApproved: () => void;
  onClose: () => void;
}

/**
 * A place that is a draft only, read before it is edited: its name, its kind and Status Draft,
 * and Edit for the editor's own draft; another editor's says who is changing it, with Approve.
 * It floats over the map's foot, not modal, so the map stays live; focus moves to its name as it
 * opens and back as it closes, and Escape closes it. A look for now, until the owner draws it.
 */
export function DraftPlaceCard({
  draft,
  hotspot,
  onEdit,
  onApproved,
  onClose,
}: DraftPlaceCardProps) {
  const headingId = useId();
  const { lock, retry } = useDraftRowLock(draft);
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const before = document.activeElement;
    headingRef.current?.focus();
    return () => {
      if (before instanceof HTMLElement && before.isConnected) before.focus();
    };
  }, []);
  // Escape closes it, as a card's ✕ does; not an Escape a field or a dialog has already answered.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.defaultPrevented) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);
  const kind = KIND_LABEL[hotspot.kind];

  return (
    <section
      aria-labelledby={headingId}
      data-testid="draft-place-card"
      className="absolute bottom-4 left-1/2 z-20 flex w-80 max-w-[calc(100%-2rem)] -translate-x-1/2 flex-col gap-3 rounded-xl bg-surface p-4 font-sn-pro shadow-large"
    >
      <div className="flex items-start justify-between gap-3">
        <h2
          id={headingId}
          ref={headingRef}
          tabIndex={-1}
          className="min-w-0 text-base font-semibold text-content-primary outline-none"
        >
          {hotspot.name}
        </h2>
        <Button variant="plain" size="small" label="Close" onClick={onClose} />
      </div>
      <dl className="flex flex-col gap-2.5 text-sm/5 text-content-quaternary">
        <div className="flex">
          <dt className="w-35 shrink-0 font-medium">Kind</dt>
          <dd className="min-w-0 flex-1">{kind}</dd>
        </div>
        <div className="flex">
          <dt className="w-35 shrink-0 font-medium">Status</dt>
          <dd className="min-w-0 flex-1 text-text-error">Draft</dd>
        </div>
      </dl>
      {lock ? (
        <LockedDraft
          kind="hotspot"
          subjectId={draft.subject_id}
          lock={lock}
          onRetry={retry}
          onSettled={() => {
            onApproved();
            onClose();
          }}
        />
      ) : (
        <div className="flex">
          <Button variant="primary" label={`Edit ${kind.toLowerCase()}`} onClick={onEdit} />
        </div>
      )}
    </section>
  );
}
