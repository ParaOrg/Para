import { useEffect, useId, useRef, useState } from 'react';

import { Button } from '@/design-system/primitives/button';

import { useDeleteContributionMutation } from '../data/use-contributions-query';

interface DeleteUploadProps {
  contributionId: string;
  onDeleted: () => void;
}

/** Delete upload, asked first: it goes for everyone, and only Para's copy goes. */
export function DeleteUpload({ contributionId, onDeleted }: DeleteUploadProps) {
  const [isAsking, setIsAsking] = useState(false);
  const questionId = useId();
  const groupRef = useRef<HTMLDivElement>(null);
  const deletion = useDeleteContributionMutation();

  // Keep it, the safe answer, is focused when the question opens; Button takes no ref.
  useEffect(() => {
    if (!isAsking) return;
    const keep = groupRef.current?.querySelector('button:last-of-type');
    if (keep instanceof HTMLElement) keep.focus();
  }, [isAsking]);

  const confirm = () => {
    deletion.mutate(contributionId, {
      onSuccess: () => {
        setIsAsking(false);
        onDeleted();
      },
    });
  };

  if (!isAsking) {
    return <Button variant="error" label="Delete upload" onClick={() => setIsAsking(true)} />;
  }
  return (
    <div
      ref={groupRef}
      role="group"
      aria-labelledby={questionId}
      className="flex w-full flex-col gap-2 rounded-xl border border-border-primary p-3"
    >
      <p id={questionId} className="font-bold text-content-primary">
        Delete this upload from Para? Its trail and hintos go for every editor, and it cannot be
        undone. The contributor&apos;s phone keeps its own copy.
      </p>
      {deletion.error && <p role="alert">{deletion.error.message}</p>}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="error"
          label={deletion.isPending ? 'Deleting…' : 'Delete upload'}
          onClick={confirm}
          disabled={deletion.isPending}
        />
        <Button variant="secondary" label="Keep it" onClick={() => setIsAsking(false)} />
      </div>
    </div>
  );
}
