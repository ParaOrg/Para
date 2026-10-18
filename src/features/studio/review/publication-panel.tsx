import { Button } from '@/design-system/primitives/button';

import { usePublicationQuery } from '../data/use-review-query';

export function PublicationPanel() {
  const query = usePublicationQuery();
  if (query.isPending) return <p role="status">Checking the last publication…</p>;
  if (query.isError)
    return (
      <div>
        <p role="alert">{query.error.message}</p>
        <Button variant="secondary" label="Try again" onClick={() => void query.refetch()} />
      </div>
    );
  return (
    <section className="flex flex-col gap-4" aria-label="Waiting for publication">
      <h3 className="font-bold">Waiting for publication</h3>
      <p>
        Last published:{' '}
        <time dateTime={query.data.publishedAt}>
          {new Date(query.data.publishedAt).toLocaleString()}
        </time>
      </p>
      <p className="text-sm text-content-secondary">
        These approved changes reach commuters at the next publication. Drafts are not included.
        Check the Public view after publication.
      </p>
      <Button
        variant="secondary"
        label={query.isFetching ? 'Checking…' : 'Check publication again'}
        disabled={query.isFetching}
        onClick={() => void query.refetch()}
      />
      {query.data.waiting.length === 0 ? (
        <p>No approved changes are waiting for publication.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {query.data.waiting.map((subject) => (
            <li
              key={`${subject.kind}:${subject.id}`}
              className="rounded-lg border border-border-primary p-3"
            >
              <strong>{subject.label}</strong>
              <p className="text-sm">
                {subject.kind} ·{' '}
                {subject.status === 'taken_down'
                  ? 'Removal waiting for publication'
                  : 'Approved change waiting for publication'}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
