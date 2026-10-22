import { useId, useState } from 'react';

import { Button } from '@/design-system/primitives/button';
import { TextAreaField } from '@/design-system/primitives/text-area-field';

import { manilaTime } from './contribution-format';
import { useHideContributionMutation } from '../data/use-contributions-query';

interface HideUploadProps {
  contributionId: string;
  hiddenAt: number | null;
  hiddenNote: string;
  /** After a change, with what to say and whether the upload is now hidden. */
  onChanged: (notice: string, isHidden: boolean) => void;
}

/**
 * Hide, with an optional note, or Show again. Hidden is not deleted: the upload
 * leaves the studio's default list and map, and Show hidden brings it back.
 */
export function HideUpload({ contributionId, hiddenAt, hiddenNote, onChanged }: HideUploadProps) {
  const [isAsking, setIsAsking] = useState(false);
  const [note, setNote] = useState('');
  const noteId = useId();
  const change = useHideContributionMutation();

  const send = (isHiding: boolean) =>
    change.mutate(
      { id: contributionId, isHiding, note },
      {
        onSuccess: () => {
          setIsAsking(false);
          setNote('');
          onChanged(
            isHiding ? 'Upload hidden. Show hidden lists it again.' : 'Upload shown again.',
            isHiding,
          );
        },
      },
    );

  if (hiddenAt !== null) {
    return (
      <div className="flex w-full flex-col gap-2">
        <p>
          Hidden {manilaTime(hiddenAt)}
          {hiddenNote && `: ${hiddenNote}`}
        </p>
        {change.error && <p role="alert">{change.error.message}</p>}
        <Button
          variant="secondary"
          label={change.isPending ? 'Showing…' : 'Show again'}
          onClick={() => send(false)}
          disabled={change.isPending}
        />
      </div>
    );
  }
  if (!isAsking)
    return <Button variant="secondary" label="Hide" onClick={() => setIsAsking(true)} />;
  return (
    <div className="flex w-full flex-col gap-2 rounded-xl border border-border-primary p-3">
      <TextAreaField
        id={noteId}
        label="Why hide it? (optional)"
        // The question opens on a tap, so its field takes the focus.
        // eslint-disable-next-line jsx-a11y/no-autofocus -- opened by the editor's own tap
        autoFocus
        rows={2}
        maxLength={500}
        value={note}
        onChange={(event) => setNote(event.target.value)}
      />
      {change.error && <p role="alert">{change.error.message}</p>}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="primary"
          label={change.isPending ? 'Hiding…' : 'Hide upload'}
          onClick={() => send(true)}
          disabled={change.isPending}
        />
        <Button variant="secondary" label="Cancel" onClick={() => setIsAsking(false)} />
      </div>
    </div>
  );
}
