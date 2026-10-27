import { Button } from '@/design-system/primitives/button';

import type { PublicationSubject } from '../data/publication';

export type WaitingListState =
  | { status: 'loading' }
  | { status: 'error'; message: string; onRetry: () => void }
  | { status: 'ready'; publishedAt: string; subjects: PublicationSubject[] };

interface WaitingListProps {
  state: WaitingListState;
}

const EFFECT_TEXT: Record<PublicationSubject['status'], string> = {
  approved: 'Approved or put back · reaches the map at tonight’s publish',
  taken_down: 'Taken down · leaves the map at tonight’s publish',
};

/** What approved, taken-down or put-back changes have not reached the published map yet. */
export function WaitingList({ state }: WaitingListProps) {
  if (state.status === 'loading') return <p role="status">Checking what is waiting…</p>;
  if (state.status === 'error')
    return (
      <div className="flex flex-col items-start gap-2">
        <p role="alert">{state.message}</p>
        <Button variant="secondary" size="small" label="Try again" onClick={state.onRetry} />
      </div>
    );
  return (
    <section aria-labelledby="waiting-heading" className="flex flex-col gap-2">
      <h2 id="waiting-heading" className="font-bold">
        Waiting for tonight’s publish
      </h2>
      <p className="text-sm text-content-secondary">
        Changes since the map published on{' '}
        <time dateTime={state.publishedAt}>{new Date(state.publishedAt).toLocaleString()}</time>.
      </p>
      {state.subjects.length === 0 ? (
        <p>Nothing is waiting. The published map is up to date.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {state.subjects.map((subject) => (
            <li
              key={`${subject.kind}:${subject.id}`}
              className="rounded-lg border border-border-primary p-3"
            >
              <strong>{subject.label}</strong>
              <p className="text-sm">
                {subject.kind === 'route' ? 'Route' : 'Hotspot'} · {EFFECT_TEXT[subject.status]}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
