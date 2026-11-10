import { useState } from 'react';

import { SubjectStatusView } from './subject-status-view';
import type { PublicationSubject } from '../data/publication';
import { reviewMessage } from '../data/review-commands';
import { usePublicationQuery, useSubjectStatusMutation } from '../data/use-review-query';

/** How many routes and places a search lists: the search box is narrow, a name narrows it. */
const MAX_SHOWN = 5;

/** Said when a take down or put back did not reach the database, in place of the raw error. */
export const NOT_CHANGED = 'Couldn’t change it. Check your connection and try again.';

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
 * typed, each with Take down or Put back. A taken-down route is on no map, so this is where it is
 * found again. Its look is SubjectStatusView's.
 */
export function SubjectStatusList({ query, onChanged }: SubjectStatusListProps) {
  const publication = usePublicationQuery();
  const mutation = useSubjectStatusMutation();
  const [notice, setNotice] = useState<string | null>(null);
  const text = query.trim().toLowerCase();

  const handlePress = (subject: PublicationSubject) => {
    if (mutation.isPending || !window.confirm(QUESTION[subject.status](subject.label))) return;
    setNotice(null);
    mutation.mutateAsync(subject).then(
      (result) => {
        setNotice(
          result.code === 'blocked'
            ? 'A route still ends here. Change or take down that route first.'
            : reviewMessage(result),
        );
        if (result.code === 'taken_down' || result.code === 'put_back') onChanged();
      },
      () => setNotice(NOT_CHANGED),
    );
  };

  const matches =
    text.length < 2 || !publication.data
      ? []
      : publication.data.subjects
          .filter((subject) => subject.label.toLowerCase().includes(text))
          .slice(0, MAX_SHOWN);
  return (
    <SubjectStatusView
      state={
        text.length < 2
          ? 'idle'
          : publication.isPending
            ? 'reading'
            : publication.isError
              ? 'failed'
              : 'ready'
      }
      matches={matches}
      notice={notice}
      isBusy={mutation.isPending}
      onPress={handlePress}
      onRetry={() => void publication.refetch()}
    />
  );
}
