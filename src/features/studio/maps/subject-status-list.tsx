import { useState } from 'react';

import { Button } from '@/design-system/primitives/button';

import type { PublicationSubject } from '../data/publication';
import { reviewMessage } from '../data/review-commands';
import { usePublicationQuery, useSubjectStatusMutation } from '../data/use-review-query';

/** How many routes and places a search lists: the search box is narrow, a name narrows it. */
const MAX_SHOWN = 5;

interface SubjectStatusListProps {
  /** What is typed in the studio's search. */
  query: string;
  /** Taken down or put back: the map's routes and places are read again. */
  onChanged: () => void;
}

const QUESTION = {
  approved: (label: string) =>
    `Take down "${label}"? Its data is kept, and it leaves the public map at the next publish. You can put it back.`,
  taken_down: (label: string) =>
    `Put back "${label}"? It returns to the public map at the next publish, if no route or terminal conflicts.`,
} satisfies Record<PublicationSubject['status'], (label: string) => string>;

/**
 * Under the studio's search: the approved and taken-down routes and places whose name holds what is
 * typed, each with Take down or Put back (the owner's Q121). A taken-down route is on no map, so
 * this is where it is found again. A look for now, until the owner designs it.
 */
export function SubjectStatusList({ query, onChanged }: SubjectStatusListProps) {
  const publication = usePublicationQuery();
  const mutation = useSubjectStatusMutation();
  const [notice, setNotice] = useState<string | null>(null);
  const text = query.trim().toLowerCase();

  const handlePress = (subject: PublicationSubject) => {
    if (mutation.isPending || !window.confirm(QUESTION[subject.status](subject.label))) return;
    setNotice(null);
    mutation.mutate(subject, {
      onSuccess: (result) => {
        const isChanged = result.code === 'taken_down' || result.code === 'put_back';
        setNotice(
          result.code === 'blocked'
            ? 'A route still ends here. Change or take down that route first.'
            : reviewMessage(result),
        );
        if (isChanged) onChanged();
      },
    });
  };

  const said = (notice ?? mutation.error) && (
    <p role="status" className="px-4 py-2 text-sm text-content-secondary">
      {notice ?? mutation.error?.message}
    </p>
  );
  if (text.length < 2) return said ? <Panel>{said}</Panel> : null;
  if (publication.isPending)
    return (
      <Panel>
        <p role="status" className="px-4 py-2 text-sm text-content-secondary">
          Reading routes and places…
        </p>
      </Panel>
    );
  if (publication.isError)
    return (
      <Panel>
        <div className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
          <p role="alert">Couldn’t read the routes and places to take down.</p>
          <Button
            variant="secondary"
            size="small"
            label="Try again"
            onClick={() => void publication.refetch()}
          />
        </div>
      </Panel>
    );
  const matches = publication.data.subjects
    .filter((subject) => subject.label.toLowerCase().includes(text))
    .slice(0, MAX_SHOWN);
  if (matches.length === 0) return said ? <Panel>{said}</Panel> : null;
  return (
    <Panel>
      <h3 className="px-4 pt-2 text-xs font-medium text-content-tertiary">Take down or put back</h3>
      {said}
      <ul aria-label="Routes and places to take down or put back">
        {matches.map((subject) => (
          <li
            key={`${subject.kind}:${subject.id}`}
            className="flex items-center justify-between gap-3 px-4 py-2"
          >
            <div className="min-w-0">
              <p className="truncate text-sm text-content-primary">{subject.label}</p>
              <p className="text-xs text-content-tertiary">
                {subject.kind === 'route' ? 'Route' : 'Place'} ·{' '}
                {subject.status === 'approved' ? 'Published' : 'Taken down'}
              </p>
            </div>
            <Button
              variant="secondary"
              size="small"
              label={subject.status === 'approved' ? 'Take down' : 'Put back'}
              disabled={mutation.isPending}
              onClick={() => handlePress(subject)}
            />
          </li>
        ))}
      </ul>
    </Panel>
  );
}

/** The search's own panel look (PlaceSearchResults), so the list reads as part of the search. */
function Panel({ children }: { children: React.ReactNode }) {
  return <section className="rounded-xl bg-surface py-1 shadow-large">{children}</section>;
}
