import { useId, useState } from 'react';

import { Button } from '@/design-system/primitives/button';
import { TextAreaField } from '@/design-system/primitives/text-area-field';

import { useContributorQuery, useBlockContributorMutation } from '../../data/use-contributor-query';
import { manilaTime } from '../contribution-format';

/** Said under the phone when a later read fails: what is shown is the last read. */
const staleNotice = (phoneCode: string) =>
  `Couldn’t refresh phone ${phoneCode}. Showing what was last read.`;

interface PhoneBlockProps {
  contributorId: string;
  phoneCode: string;
}

/**
 * The phone an upload came from: how many uploads it has sent, and Block, with
 * an optional note, or Unblock. A blocked phone's next uploads are refused by
 * the database; the ones it already sent stay.
 */
export function PhoneBlock({ contributorId, phoneCode }: PhoneBlockProps) {
  const [isAsking, setIsAsking] = useState(false);
  const [note, setNote] = useState('');
  const noteId = useId();
  const phone = useContributorQuery(contributorId);
  const change = useBlockContributorMutation(contributorId);

  const handleRetry = () => void phone.refetch();
  // Greyed while the read is under way, so a second tap cannot start another.
  const retryButton = (
    <Button
      variant="secondary"
      size="small"
      label={phone.isFetching ? 'Trying…' : 'Try again'}
      disabled={phone.isFetching}
      onClick={handleRetry}
    />
  );
  if (phone.isPending) return <p aria-live="polite">Reading phone {phoneCode}…</p>;
  // A later read that fails keeps what was read: only a first read that failed has nothing to show.
  if (phone.data === undefined)
    return (
      <div className="flex w-full flex-col items-start gap-2">
        <p role="alert">
          Phone {phoneCode} could not be read. {phone.error.message}
        </p>
        {retryButton}
      </div>
    );
  const { uploadCount, blockedAt, blockNote } = phone.data;
  const notice = phone.error ? staleNotice(phoneCode) : null;

  const send = (isBlocking: boolean) =>
    change.mutate(
      { isBlocking, note },
      {
        onSuccess: () => {
          setIsAsking(false);
          setNote('');
        },
      },
    );

  // The status line stays mounted, so a screen reader hears the notice when it appears.
  const summary = (
    <>
      <p>
        Phone {phoneCode} has sent {uploadCount} {uploadCount === 1 ? 'upload' : 'uploads'}.
      </p>
      <p role="status" className="sr-only">
        {notice}
      </p>
      {notice && (
        <div className="flex items-center gap-2 text-sm text-content-secondary">
          <p aria-hidden="true">{notice}</p>
          {retryButton}
        </div>
      )}
    </>
  );
  if (blockedAt !== null) {
    return (
      <div className="flex w-full flex-col gap-2">
        {summary}
        <p>
          Blocked {manilaTime(blockedAt)}
          {blockNote && `: ${blockNote}`}. Its next uploads are refused.
        </p>
        {change.error && <p role="alert">{change.error.message}</p>}
        <Button
          variant="secondary"
          label={change.isPending ? 'Unblocking…' : 'Unblock phone'}
          onClick={() => send(false)}
          disabled={change.isPending}
        />
      </div>
    );
  }
  if (!isAsking) {
    return (
      <div className="flex w-full flex-col gap-2">
        {summary}
        <Button variant="secondary" label="Block phone" onClick={() => setIsAsking(true)} />
      </div>
    );
  }
  return (
    <div className="flex w-full flex-col gap-2 rounded-xl border border-border-primary p-3">
      {summary}
      <TextAreaField
        id={noteId}
        label="Why block it? (optional)"
        // The question opens on a tap, so its field takes the focus.
        // eslint-disable-next-line jsx-a11y/no-autofocus -- opened by the editor's own tap
        autoFocus
        rows={2}
        maxLength={500}
        value={note}
        onChange={(event) => setNote(event.target.value)}
      />
      <p>Its next uploads are refused. The ones already sent stay. Unblock undoes it.</p>
      {change.error && <p role="alert">{change.error.message}</p>}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="error"
          label={change.isPending ? 'Blocking…' : 'Block phone'}
          onClick={() => send(true)}
          disabled={change.isPending}
        />
        <Button variant="secondary" label="Cancel" onClick={() => setIsAsking(false)} />
      </div>
    </div>
  );
}
