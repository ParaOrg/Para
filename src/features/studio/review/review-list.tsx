import { Button } from '@/design-system/primitives/button';

import type { ReviewAction } from '../data/review-commands';
import type { ReviewDraft } from '../data/review-label';

interface ReviewListProps {
  drafts: ReviewDraft[];
  /** Who is changing a draft, in words, when it is another editor's. */
  changedBy?: (draft: ReviewDraft) => string | null;
  isBusy: boolean;
  onReview: (draftId: string) => void;
  onAction: (action: ReviewAction, draftId: string) => void;
}

export function ReviewList({ drafts, changedBy, isBusy, onAction, onReview }: ReviewListProps) {
  if (drafts.length === 0) return <p>No drafts. Changes saved in the Playground appear here.</p>;
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
              {draft.kind} · {draft.status === 'pending' ? 'Pending' : 'Draft'}
            </p>
            {changedBy?.(draft) && (
              <p className="text-sm text-content-secondary">{changedBy(draft)}</p>
            )}
          </div>
          {draft.note && <p className="text-sm">Note: {draft.note}</p>}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              label="Review changes"
              disabled={isBusy}
              onClick={() => onReview(draft.id)}
            />
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
