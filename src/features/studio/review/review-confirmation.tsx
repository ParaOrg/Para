import { Button } from '@/design-system/primitives/button';

import type { ReviewAction } from '../data/review-commands';
import type { ReviewDraft } from '../data/review-label';

interface ReviewConfirmationProps {
  action: ReviewAction;
  draft: ReviewDraft;
  isBusy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

const LABELS: Record<ReviewAction, string> = {
  approve: 'Approve',
  discard: 'Discard draft',
};

const EXPLANATIONS: Record<ReviewAction, string> = {
  approve:
    'The Studio map changes as soon as you approve. The public map changes at the next publish.',
  discard: 'This removes the draft. Approved data stays as it is. You cannot undo this.',
};

export function ReviewConfirmation({
  action,
  draft,
  isBusy,
  onCancel,
  onConfirm,
}: ReviewConfirmationProps) {
  return (
    <form
      className="flex flex-col gap-4 rounded-xl bg-surface-secondary p-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!isBusy) onConfirm();
      }}
    >
      <h3 className="font-bold">
        {LABELS[action]}: {draft.label}
      </h3>
      <p className="text-sm text-content-secondary">{EXPLANATIONS[action]}</p>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" label="Cancel" disabled={isBusy} onClick={onCancel} />
        <Button
          type="submit"
          variant={action === 'discard' ? 'error' : 'primary'}
          label={isBusy ? 'Working…' : LABELS[action]}
          disabled={isBusy}
        />
      </div>
    </form>
  );
}
