import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { Button } from '@/design-system/primitives/button';

import { reviewMessage } from '../data/review-commands';
import { refreshDraftBase } from '../data/review-comparison';
import { reviewKeys } from '../data/review-keys';
import type { DraftRow } from '../data/review-schema';

interface ReviewConflictProps {
  draft: DraftRow;
  currentRevision: number;
}
export function ReviewConflict({ draft, currentRevision }: ReviewConflictProps) {
  const [hasCompared, setHasCompared] = useState(false);
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => refreshDraftBase(draft, currentRevision),
    // The kept draft has a new revision: the drafts list holds it at once, so a
    // Discard or Approve pressed before the list refetches acts on it, not the old one.
    onSuccess: (result) => {
      const kept = result.draft;
      if (result.code !== 'ok' || !kept) return;
      client.setQueryData<DraftRow[]>(reviewKeys.drafts(), (drafts) =>
        drafts?.map((row) => (row.id === kept.id ? kept : row)),
      );
    },
    onSettled: () => client.invalidateQueries({ queryKey: reviewKeys.all }),
  });
  return (
    <section
      className="flex flex-col gap-3 rounded-xl border border-border-primary bg-surface-secondary p-4"
      aria-label="Resolve conflict"
    >
      <h3 className="font-bold">Approved data changed</h3>
      <p>
        This draft cannot be approved yet. Compare it with the latest approved version below. You
        can discard the draft, or keep its full contents for a new review. Keeping it can replace
        changes another editor made.
      </p>
      <label className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={hasCompared}
          disabled={mutation.isPending}
          onChange={(event) => setHasCompared(event.target.checked)}
        />
        I compared both versions and want to keep this draft’s contents.
      </label>
      <Button
        variant="secondary"
        label={mutation.isPending ? 'Updating…' : 'Keep draft for a new review'}
        disabled={!hasCompared || mutation.isPending}
        onClick={() => mutation.mutate()}
      />
      {mutation.isError && <p role="alert">{mutation.error.message}</p>}
      {mutation.data && (
        <p role="status">
          {mutation.data.code === 'ok'
            ? 'Draft kept. Submit it again when ready.'
            : reviewMessage(mutation.data)}
        </p>
      )}
    </section>
  );
}
