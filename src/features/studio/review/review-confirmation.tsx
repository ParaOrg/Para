import { useId, useState } from 'react';

import { Button } from '@/design-system/primitives/button';

import type { ReviewAction } from '../data/review-commands';
import type { ReviewDraft } from '../data/review-label';

interface ReviewConfirmationProps {
  action: ReviewAction;
  draft: ReviewDraft;
  isBusy: boolean;
  onCancel: () => void;
  onConfirm: (note?: string) => void;
}

const LABELS: Record<ReviewAction, string> = {
  submit: 'Submit for review',
  approve: 'Approve draft',
  'send-back': 'Send back',
  discard: 'Discard draft',
};

export function ReviewConfirmation({
  action,
  draft,
  isBusy,
  onCancel,
  onConfirm,
}: ReviewConfirmationProps) {
  const [note, setNote] = useState('');
  const noteId = useId();
  const needsNote = action === 'send-back';
  return (
    <form
      className="flex flex-col gap-4 rounded-xl bg-surface-secondary p-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!isBusy) onConfirm(note);
      }}
    >
      <h3 className="font-bold">
        {LABELS[action]}: {draft.label}
      </h3>
      <p className="text-sm text-content-secondary">
        {action === 'discard'
          ? 'This removes the draft, including any submitted changes. Approved data stays as it is. You cannot undo this.'
          : action === 'approve'
            ? 'Apply the reviewed changes to approved data. They reach the public map at the next publication.'
            : action === 'submit'
              ? 'The draft will wait for review. Submitting does not change the public map.'
              : 'The draft returns to editing with your note. Approved data stays as it is.'}
      </p>
      {needsNote && (
        <label htmlFor={noteId} className="text-sm">
          Reason for sending back
          <textarea
            id={noteId}
            value={note}
            required
            maxLength={4000}
            disabled={isBusy}
            onChange={(event) => setNote(event.target.value)}
            className="mt-2 w-full rounded-lg border border-border-primary bg-surface p-3 text-base"
          />
        </label>
      )}
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" label="Cancel" disabled={isBusy} onClick={onCancel} />
        <Button
          type="submit"
          variant={action === 'discard' ? 'error' : 'primary'}
          label={isBusy ? 'Working…' : LABELS[action]}
          disabled={isBusy || (needsNote && !note.trim())}
        />
      </div>
    </form>
  );
}
