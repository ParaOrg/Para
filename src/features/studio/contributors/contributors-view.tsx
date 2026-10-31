import { useCallback, useId, useState, type ReactNode } from 'react';

import { Button } from '@/design-system/primitives/button';
import { SelectField } from '@/design-system/primitives/select-field';

import { OpenedActions } from './actions/opened-actions';
import { OpenedExtras } from './actions/opened-extras';
import { ContributionDetails } from './contribution-details';
import { ContributionList } from './contribution-list';
import type { StudioContributorsProps } from './contributors-props';
import { useContributionLayers } from './use-contribution-layers';
import {
  CONTRIBUTION_LIMIT,
  CONTRIBUTION_PERIODS,
  type ContributionPeriod,
} from '../data/contributions-read';
import { useContributionDetailQuery, useContributionsQuery } from '../data/use-contributions-query';

const PANEL =
  'absolute inset-x-0 bottom-0 z-10 flex max-h-[55%] flex-col overflow-hidden rounded-t-2xl bg-surface shadow-lg ring-1 ring-content-primary/10 sm:inset-y-4 sm:right-auto sm:left-4 sm:max-h-none sm:w-96 sm:rounded-2xl';

/**
 * The Contributors map: the uploads of a period on the studio's map and in a
 * list beside it, both from the one query, and one upload opened with its
 * whole trail. Provisional layout until the owner's design.
 */
export function ContributorsView({
  map,
  isSignedIn,
  onSignIn,
  onOpenPlayground,
  onStart,
}: StudioContributorsProps) {
  const headingId = useId();
  const periodId = useId();
  const hiddenId = useId();
  const [showHidden, setShowHidden] = useState(false);
  const [days, setDays] = useState<ContributionPeriod>(30);
  const [openedId, setOpenedId] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const list = useContributionsQuery(days, showHidden, isSignedIn);
  const contributions = list.data?.contributions ?? [];
  const opened = contributions.find((c) => c.id === openedId) ?? null;
  const detail = useContributionDetailQuery(opened ? opened.id : null);
  // The ride highlighted on the map, by its trail part; another upload opened starts with none.
  const [highlight, setHighlight] = useState<{ id: string | null; piece: number | null }>({
    id: null,
    piece: null,
  });
  const highlightedPiece = highlight.id === openedId ? highlight.piece : null;
  const handleOpen = useCallback((id: string) => {
    setOpenedId(id);
    setNotice('');
  }, []);
  useContributionLayers(
    map,
    contributions,
    opened?.id ?? null,
    detail.data ?? null,
    handleOpen,
    highlightedPiece,
  );

  return (
    <section aria-labelledby={headingId} className={PANEL}>
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border-primary p-4">
        <h2 id={headingId} className="text-base font-bold text-content-primary">
          Contributors
        </h2>
        <div className="w-44">
          <SelectField
            id={periodId}
            label="Uploaded in the last"
            value={days}
            onChange={(event) => {
              const next = CONTRIBUTION_PERIODS.find((d) => String(d) === event.target.value);
              if (next) setDays(next);
              setOpenedId(null);
            }}
          >
            {CONTRIBUTION_PERIODS.map((d) => (
              <option key={d} value={d}>
                {d} days
              </option>
            ))}
          </SelectField>
        </div>
        <label
          htmlFor={hiddenId}
          className="flex items-center gap-2 text-sm text-content-secondary"
        >
          <input
            id={hiddenId}
            type="checkbox"
            checked={showHidden}
            onChange={(event) => setShowHidden(event.target.checked)}
          />
          Show hidden
        </label>
      </header>
      <p role="status" className="px-4 pt-2 text-sm text-content-primary empty:hidden">
        {notice}
      </p>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <PanelBody
          isSignedIn={isSignedIn}
          onSignIn={onSignIn}
          onOpenPlayground={onOpenPlayground}
          isLoading={list.isPending}
          error={list.error?.message ?? null}
          onRetry={() => void list.refetch()}
          count={contributions.length}
          isCut={list.data?.isCut ?? false}
          days={days}
        >
          {opened ? (
            <ContributionDetails
              contribution={opened}
              detail={detail.data}
              isDetailLoading={detail.isPending}
              detailError={detail.error?.message ?? null}
              onClose={() => setOpenedId(null)}
              actions={
                <OpenedActions
                  contribution={opened}
                  detail={detail.data}
                  isDetailLoading={detail.isPending}
                  showHidden={showHidden}
                  onClose={() => setOpenedId(null)}
                  onNotice={setNotice}
                  onStart={onStart}
                  onHighlightRide={(piece) => setHighlight({ id: openedId, piece })}
                />
              }
              extras={<OpenedExtras contribution={opened} detail={detail.data} onStart={onStart} />}
            />
          ) : (
            <ContributionList
              contributions={contributions}
              openedId={openedId}
              onOpen={handleOpen}
            />
          )}
        </PanelBody>
      </div>
    </section>
  );
}

interface PanelBodyProps {
  isSignedIn: boolean;
  onSignIn: () => void;
  onOpenPlayground: () => void;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  count: number;
  isCut: boolean;
  days: number;
  children: ReactNode;
}

function PanelBody({
  isSignedIn,
  onSignIn,
  onOpenPlayground,
  isLoading,
  error,
  onRetry,
  count,
  isCut,
  days,
  children,
}: PanelBodyProps) {
  const body = 'flex flex-col gap-3 p-4 text-sm text-content-secondary';
  if (!isSignedIn) {
    return (
      <div className={body}>
        <p>Uploads are private: sign in as an editor to see them.</p>
        <Button variant="primary" label="Sign in" onClick={onSignIn} />
        <Button variant="secondary" label="Back to the Playground" onClick={onOpenPlayground} />
      </div>
    );
  }
  if (isLoading)
    return (
      <p className={body} aria-live="polite">
        Reading uploads…
      </p>
    );
  if (error) {
    return (
      <div className={body} role="alert">
        <p>The uploads could not be read. {error}</p>
        <Button variant="secondary" label="Try again" onClick={onRetry} />
      </div>
    );
  }
  if (count === 0) {
    return (
      <p className={body}>
        No uploads in the last {days} days. Only editors see uploads; a phone's own are not shown
        here until it has sent them.
      </p>
    );
  }
  return (
    <>
      <p className="px-4 pt-3 text-xs text-content-quaternary" aria-live="polite">
        {isCut
          ? `The newest ${CONTRIBUTION_LIMIT} uploads of the last ${days} days. Choose a shorter period to see the rest.`
          : `${count} ${count === 1 ? 'upload' : 'uploads'} in the last ${days} days, newest first.`}
      </p>
      {children}
    </>
  );
}
