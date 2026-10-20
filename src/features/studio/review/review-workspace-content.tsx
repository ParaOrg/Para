import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';

import { Button } from '@/design-system/primitives/button';

import { PublicationPanel } from './publication-panel';
import type { StudioReviewProps } from './review-props';
import { ReviewQueue } from './review-queue';
import { ReviewSubjects } from './review-subjects';
import { subscribeReviewChanges } from '../data/review-events';
import { reviewKeys } from '../data/review-keys';
import { useReviewNames, useReviewQuery } from '../data/use-review-query';
import { DraftMarkers } from '../maps/draft-markers';

type ReviewTab = 'drafts' | 'subjects' | 'publication';
const TABS: { id: ReviewTab; label: string }[] = [
  { id: 'drafts', label: 'Drafts' },
  { id: 'subjects', label: 'Routes and places' },
  { id: 'publication', label: 'Waiting for publication' },
];
export function ReviewWorkspaceContent({ map, onChanged }: StudioReviewProps) {
  const client = useQueryClient();
  const query = useReviewQuery();
  const names = useReviewNames(query.data ?? []);
  const [isOpen, setIsOpen] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [tab, setTab] = useState<ReviewTab>('drafts');
  const [draftId, setDraftId] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openDraft = useCallback((id: string) => {
    setDraftId(id);
    setTab('drafts');
    setIsOpen(true);
  }, []);
  useEffect(
    () =>
      subscribeReviewChanges(() => {
        void client.invalidateQueries({ queryKey: reviewKeys.all });
      }),
    [client],
  );
  useEffect(() => {
    const dialog = dialogRef.current;
    if (isOpen && dialog && !dialog.open) dialog.showModal();
    return () => dialog?.close();
  }, [isOpen]);
  return (
    <>
      {query.data && (
        <DraftMarkers map={map} drafts={query.data} places={names} onReview={openDraft} />
      )}
      <div className="absolute top-44 right-4 z-10 max-w-[calc(100%-2rem)]">
        <Button
          variant="secondary"
          label={query.data ? `Drafts (${query.data.length})` : 'Drafts'}
          onClick={() => {
            setDraftId(null);
            setIsOpen(true);
          }}
        />
      </div>
      <dialog
        ref={dialogRef}
        aria-labelledby="studio-review-title"
        onCancel={(event) => {
          event.preventDefault();
          if (!isBusy) setIsOpen(false);
        }}
        className="fixed inset-0 m-auto max-h-full w-full max-w-3xl overflow-y-auto rounded-xl bg-surface p-6 text-content-primary shadow-xl backdrop:bg-black/30"
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 id="studio-review-title" className="text-lg font-bold">
            Studio review · Provisional UI
          </h2>
          <Button
            variant="secondary"
            label="Close"
            disabled={isBusy}
            onClick={() => setIsOpen(false)}
          />
        </div>
        <nav aria-label="Studio review sections" className="mb-4 flex flex-wrap gap-2">
          {TABS.map((item) => (
            <Button
              key={item.id}
              variant="secondary"
              size="small"
              label={item.label}
              aria-pressed={tab === item.id}
              disabled={isBusy}
              onClick={() => setTab(item.id)}
            />
          ))}
        </nav>
        {isOpen && tab === 'drafts' && (
          <ReviewQueue
            key={draftId}
            initialDraftId={draftId}
            onBusyChange={setIsBusy}
            onChanged={onChanged}
          />
        )}
        {isOpen && tab === 'subjects' && (
          <ReviewSubjects onBusyChange={setIsBusy} onChanged={onChanged} />
        )}
        {isOpen && tab === 'publication' && <PublicationPanel />}
      </dialog>
    </>
  );
}
