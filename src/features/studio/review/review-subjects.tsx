import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { Button } from '@/design-system/primitives/button';
import { TextField } from '@/design-system/primitives/text-field';

import { putBack, takeDown } from '../data/drafts';
import type { PublicationSubject } from '../data/publication';
import { reviewKeys } from '../data/review-keys';
import { usePublicationQuery } from '../data/use-review-query';

interface ReviewSubjectsProps {
  onChanged: () => void;
  onBusyChange: (busy: boolean) => void;
}
export function ReviewSubjects({ onChanged, onBusyChange }: ReviewSubjectsProps) {
  const query = usePublicationQuery();
  const client = useQueryClient();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<PublicationSubject | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: async (subject: PublicationSubject) => {
      onBusyChange(true);
      try {
        return subject.status === 'approved'
          ? await takeDown(subject.kind, subject.id)
          : await putBack(subject.kind, subject.id);
      } finally {
        onBusyChange(false);
      }
    },
    onSuccess: (result) => {
      const changed = result.code === 'taken_down' || result.code === 'put_back';
      setNotice(
        changed
          ? 'Updated approved data. Waiting for publication.'
          : result.code === 'blocked'
            ? 'A route still ends here. Change or take down that route first.'
            : `No change was made (${result.code}). Refresh and check again.`,
      );
      setSelected(null);
      if (changed) onChanged();
    },
    onSettled: () => client.invalidateQueries({ queryKey: reviewKeys.all }),
  });
  if (query.isPending) return <p role="status">Loading routes and places…</p>;
  if (query.isError)
    return (
      <div>
        <p role="alert">{query.error.message}</p>
        <Button variant="secondary" label="Try again" onClick={() => void query.refetch()} />
      </div>
    );
  const subjects = query.data.subjects.filter((subject) =>
    subject.label.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <section className="flex flex-col gap-4" aria-label="Take down and put back">
      <h3 className="font-bold">Approved routes and places</h3>
      {notice && <p role="status">{notice}</p>}
      {mutation.isError && (
        <p role="alert">
          {mutation.error.message} Refresh before retrying if the connection was interrupted.
        </p>
      )}
      {selected ? (
        <div className="flex flex-col gap-3 rounded-xl bg-surface-secondary p-4">
          <h4 className="font-bold">
            {selected.status === 'approved' ? 'Take down' : 'Put back'} {selected.label}?
          </h4>
          <p>
            {selected.status === 'approved'
              ? 'This keeps its data but removes it from the next public map. You can put it back later.'
              : 'This makes it approved again. It returns to the public map at the next publication, if no route or terminal conflicts.'}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              label="Cancel"
              disabled={mutation.isPending}
              onClick={() => setSelected(null)}
            />
            <Button
              variant="primary"
              label={
                mutation.isPending
                  ? 'Working…'
                  : selected.status === 'approved'
                    ? 'Confirm take down'
                    : 'Confirm put back'
              }
              disabled={mutation.isPending}
              onClick={() => {
                if (!mutation.isPending) mutation.mutate(selected);
              }}
            />
          </div>
        </div>
      ) : (
        <>
          <TextField
            label="Find a route or place"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onClear={() => setSearch('')}
          />
          <Button
            variant="secondary"
            label="Refresh approved data"
            disabled={query.isFetching}
            onClick={() => void query.refetch()}
          />
          {subjects.length === 0 && <p>No routes or places match.</p>}
          <ul className="flex flex-col gap-2">
            {subjects.map((subject) => (
              <li
                key={`${subject.kind}:${subject.id}`}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border-primary p-3"
              >
                <div>
                  <strong>{subject.label}</strong>
                  <p className="text-sm">
                    {subject.kind} · {subject.status === 'approved' ? 'Approved' : 'Taken down'}
                  </p>
                </div>
                <Button
                  variant="secondary"
                  label={subject.status === 'approved' ? 'Take down…' : 'Put back…'}
                  disabled={mutation.isPending}
                  onClick={() => {
                    mutation.reset();
                    setSelected(subject);
                  }}
                />
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
