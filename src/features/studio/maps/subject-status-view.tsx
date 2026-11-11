import type { ReactNode } from 'react';

import { Button } from '@/design-system/primitives/button';

import type { PublicationSubject } from '../data/publication';

/** Where the list stands: too little typed, reading, the read failed, or read. */
export type SubjectStatusState = 'idle' | 'reading' | 'failed' | 'ready';

interface SubjectStatusViewProps {
  state: SubjectStatusState;
  /** The routes and places whose name holds what is typed, read. */
  matches: readonly PublicationSubject[];
  /** What the last Take down or Put back did, in the editor's words. */
  notice: string | null;
  /** A change is under way: no second one. */
  isBusy: boolean;
  onPress: (subject: PublicationSubject) => void;
  onRetry: () => void;
}

/**
 * The look of the studio search's Take down and Put back (SubjectStatusList): the search results'
 * own panel, under them. The notice is spoken from a status region that stays mounted, so a screen
 * reader hears it change. A look for now, until the owner designs it.
 */
export function SubjectStatusView({
  state,
  matches,
  notice,
  isBusy,
  onPress,
  onRetry,
}: SubjectStatusViewProps) {
  const announcement = (
    <p role="status" className="sr-only">
      {notice}
    </p>
  );
  const shown = notice && <p className="px-4 py-2 text-sm text-content-secondary">{notice}</p>;
  if (state === 'reading')
    return (
      <Panel>
        <p role="status" className="px-4 py-2 text-sm text-content-secondary">
          Reading routes and places…
        </p>
      </Panel>
    );
  if (state === 'failed')
    return (
      <Panel>
        <div className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
          <p role="alert" className="text-content-error">
            Couldn’t read the routes and places to take down.
          </p>
          <Button variant="secondary" size="small" label="Try again" onClick={onRetry} />
        </div>
      </Panel>
    );
  if (state === 'idle' || matches.length === 0)
    return shown ? (
      <Panel>
        {announcement}
        {shown}
      </Panel>
    ) : (
      announcement
    );
  return (
    <Panel>
      {announcement}
      <h3 className="px-4 pt-2 text-xs font-medium text-content-tertiary">Take down or put back</h3>
      {shown}
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
              disabled={isBusy}
              onClick={() => onPress(subject)}
            />
          </li>
        ))}
      </ul>
    </Panel>
  );
}

interface PanelProps {
  children: ReactNode;
}

/** The search results' panel look (PlaceSearchResults), so the list reads as part of the search. */
function Panel({ children }: PanelProps) {
  return <section className="rounded-xl bg-surface py-1 shadow-large">{children}</section>;
}
