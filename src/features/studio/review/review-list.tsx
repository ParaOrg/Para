import { Button } from '@/design-system/primitives/button';

import type { ReviewAction } from '../data/review-commands';
import type { ReviewDraft } from '../data/review-label';

interface ReviewListProps {
  drafts: ReviewDraft[];
  isBusy: boolean;
  onReview: (draftId: string) => void;
  onAction: (action: ReviewAction, draftId: string) => void;
}

export function ReviewList({ drafts, isBusy, onAction, onReview }: ReviewListProps) {
  if (drafts.length === 0) return <p>No drafts are waiting here.</p>;
  return (
    <ul className="flex flex-col gap-3">
      {drafts.map((draft) => (
        <li
          key={draft.id}
          className="flex flex-col gap-3 rounded-xl border border-border-primary p-4"
        >
          <div>
            <h3 className="font-bold">{draft.label}</h3>
            <p className="text-sm text-content-secondary">
              {draft.isNew ? 'New ' : ''}
              {draft.kind} · {draft.status === 'pending' ? 'Waiting for review' : 'Draft'}
            </p>
          </div>
          {draft.note && <p className="text-sm">Reviewer note: {draft.note}</p>}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              label="Review changes"
              disabled={isBusy}
              onClick={() => onReview(draft.id)}
            />
            {draft.status === 'draft' ? (
              <Button
                variant="primary"
                label="Submit for review"
                disabled={isBusy}
                onClick={() => onAction('submit', draft.id)}
              />
            ) : (
              <Button
                variant="secondary"
                label="Send back"
                disabled={isBusy}
                onClick={() => onAction('send-back', draft.id)}
              />
            )}
            <Button
              variant="secondary"
              label="Discard…"
              disabled={isBusy}
              onClick={() => onAction('discard', draft.id)}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
