import { useRef, useState } from 'react';

import { Button } from '@/design-system/primitives/button';

import { ReviewConfirmation } from './review-confirmation';
import { ReviewDetails } from './review-details';
import { ReviewList } from './review-list';
import { reviewMessage, type ReviewAction } from '../data/review-commands';
import { reviewDraftOf } from '../data/review-label';
import type { DraftRow } from '../data/review-schema';
import { useReviewMutation, useReviewNames, useReviewQuery } from '../data/use-review-query';

interface ReviewQueueProps {
  onBusyChange: (isBusy: boolean) => void;
  onChanged: () => void;
  initialDraftId?: string | null;
}

interface Selection {
  action: ReviewAction;
  draft: DraftRow;
}

export function ReviewQueue({ onBusyChange, onChanged, initialDraftId = null }: ReviewQueueProps) {
  const query = useReviewQuery();
  const mutation = useReviewMutation();
  const names = useReviewNames(query.data ?? []);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [reviewId, setReviewId] = useState<string | null>(initialDraftId);
  const inFlight = useRef(false);
  const [notice, setNotice] = useState<string | null>(null);

  const handleAction = (action: ReviewAction, draftId: string) => {
    const draft = query.data?.find((row) => row.id === draftId);
    if (!draft || mutation.isPending) return;
    mutation.reset();
    setNotice(null);
    // Keep this exact revision through confirmation, even if the queue refreshes.
    setSelection({ action, draft });
  };
  const handleConfirm = async (note?: string) => {
    if (!selection || inFlight.current) return;
    inFlight.current = true;
    onBusyChange(true);
    try {
      const result = await mutation.mutateAsync({ ...selection, note });
      setNotice(reviewMessage(result));
      if (result.code === 'approved') onChanged();
      setSelection(null);
    } catch {
      // The mutation keeps the error and the confirmation open for an explicit retry.
    } finally {
      inFlight.current = false;
      onBusyChange(false);
    }
  };

  if (query.isPending) return <p role="status">Loading drafts…</p>;
  if (query.isError)
    return (
      <div className="flex flex-col gap-3">
        <p role="alert">Could not load drafts: {query.error.message}</p>
        <Button variant="secondary" label="Try again" onClick={() => void query.refetch()} />
      </div>
    );
  const drafts = query.data.map((row) => reviewDraftOf(row, names));
  const reviewedDraft = query.data.find((draft) => draft.id === reviewId);
  const pendingCount = drafts.filter((draft) => draft.status === 'pending').length;
  return (
    <div className="flex flex-col gap-4">
      <p>
        {drafts.length} drafts · {pendingCount} waiting for review
      </p>
      <p className="text-sm text-content-secondary">
        Submitting sends a draft for review. The public map changes only after approval and
        publication.
      </p>
      <Button
        variant="secondary"
        label={query.isFetching ? 'Refreshing…' : 'Refresh drafts'}
        disabled={mutation.isPending || query.isFetching}
        onClick={() => void query.refetch()}
      />
      {notice && <p role="status">{notice}</p>}
      {mutation.isError && (
        <p role="alert">
          {mutation.error.message} Refresh before retrying if the connection was interrupted.
        </p>
      )}
      {selection ? (
        <ReviewConfirmation
          key={`${selection.action}:${selection.draft.id}:${selection.draft.revision}`}
          action={selection.action}
          draft={reviewDraftOf(selection.draft, names)}
          isBusy={mutation.isPending}
          onCancel={() => {
            setSelection(null);
            mutation.reset();
          }}
          onConfirm={(note) => void handleConfirm(note)}
        />
      ) : reviewedDraft ? (
        <ReviewDetails
          draft={reviewedDraft}
          label={reviewDraftOf(reviewedDraft, names).label}
          isBusy={mutation.isPending}
          onBusyChange={onBusyChange}
          onBack={() => setReviewId(null)}
          onReviewDependency={setReviewId}
          onAction={(action, draft) => {
            mutation.reset();
            setSelection({ action, draft });
          }}
        />
      ) : (
        <ReviewList
          drafts={drafts}
          isBusy={mutation.isPending}
          onAction={handleAction}
          onReview={setReviewId}
        />
      )}
    </div>
  );
}
