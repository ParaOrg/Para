import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { Button } from '@/design-system/primitives/button';

import { draftFacts, saveDraftFacts } from '../data/draft-facts';
import { reviewKeys } from '../data/review-keys';
import type { DraftRow } from '../data/review-schema';

interface DraftFactsFormProps {
  draft: DraftRow;
  onBusyChange?: (busy: boolean) => void;
}
export function DraftFactsForm({ draft, onBusyChange }: DraftFactsFormProps) {
  const fields = draftFacts(draft);
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((field) => [field.key, field.value])),
  );
  const [openedRevision, setOpenedRevision] = useState(draft.revision);
  const isStale = openedRevision !== draft.revision;
  const client = useQueryClient();
  const mutation = useMutation({
    onMutate: () => onBusyChange?.(true),
    mutationFn: () => {
      if (isStale)
        throw new Error('This draft changed. Your typed details are kept; refresh before saving.');
      return saveDraftFacts(draft, values);
    },
    onSuccess: (result) => {
      if (result.code === 'ok' && result.draft) {
        setOpenedRevision(result.draft.revision);
        setValues(
          Object.fromEntries(draftFacts(result.draft).map((field) => [field.key, field.value])),
        );
      }
    },
    onSettled: async () => {
      try {
        await client.invalidateQueries({ queryKey: reviewKeys.all });
      } finally {
        onBusyChange?.(false);
      }
    },
  });
  if (draft.status !== 'draft') return null;
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (!mutation.isPending) mutation.mutate();
      }}
    >
      <h3 className="font-bold">Edit draft details</h3>
      {isStale && (
        <div role="alert">
          <p>
            This draft changed while you were editing. Your typed details are kept. Copy them before
            loading the latest draft.
          </p>
          <Button
            variant="secondary"
            label="Load latest draft details"
            onClick={() => {
              if (
                !window.confirm(
                  'Replace the typed details with the latest draft? Copy any details you want to keep first.',
                )
              )
                return;
              setOpenedRevision(draft.revision);
              setValues(Object.fromEntries(fields.map((field) => [field.key, field.value])));
              mutation.reset();
            }}
          />
        </div>
      )}
      <p className="text-sm text-content-secondary">
        Drawing and links are kept. Save these details before submitting for review.
      </p>
      {fields.map((field) => (
        <label key={field.key} className="text-sm">
          {field.label}
          <input
            value={values[field.key] ?? ''}
            required={field.key === 'name'}
            disabled={mutation.isPending}
            maxLength={4000}
            onChange={(event) => setValues({ ...values, [field.key]: event.target.value })}
            className="mt-1 w-full rounded-lg border border-border-primary bg-surface p-3 text-base"
          />
        </label>
      ))}
      {mutation.isError && <p role="alert">{mutation.error.message}</p>}
      {mutation.data && mutation.data.code !== 'ok' && (
        <p role="alert">The draft changed. Refresh before editing again.</p>
      )}
      <Button
        type="submit"
        variant="secondary"
        label={mutation.isPending ? 'Saving…' : 'Save draft details'}
        disabled={mutation.isPending || isStale}
      />
    </form>
  );
}
