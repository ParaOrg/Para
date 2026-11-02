import { useState } from 'react';

import { Button } from '@/design-system/primitives/button';
import { cn } from '@/shared/utils/cn';

import { HISTORY_HEADING_ID, canUploadFromMenu } from './card-status';
import { HistoryCard } from './history-card';
import { HistoryLoadLine } from './history-load-line';
import { HistorySkeleton } from './history-skeleton';
import type { HistoryItems } from './use-history-items';
import { useIsOnline } from './use-is-online';
import { useFocusHeading } from '../common/use-focus-heading';
import { useIsSlowLoad } from '../common/use-is-slow-load';
import { useScreenEntry } from '../motion/use-screen-entry';
import type { Recording } from '../storage/recording-schema';
import { TOOLBAR_FOOT, TOOLBAR_ROOM } from '../toolbar/toolbar-place';
import type { UploadStatus } from '../uploads/upload-state';

/** In flight: taking the recording off the phone now would cut that short. */
const BUSY_STATES: ReadonlySet<UploadStatus['state']> = new Set([
  'checking',
  'uploading',
  'removing',
]);

interface HistoryScreenProps {
  items: HistoryItems;
  /** The pictures of the trails kept on this phone, by recording. */
  pictures: ReadonlyMap<string, string>;
  /** Record a route, with nothing recorded yet: back to Start. */
  onOpenRecord: () => void;
  onRemoveFromPhone: (recording: Recording) => void;
}

/**
 * Figma's History (4518:24819), a tab like Account: the large title, its shadow once the list
 * scrolls under it, and every recording newest first, this phone's and the account's uploads from
 * its other phones alike, over the page's toolbar (contribute-page.tsx) with History marked.
 */
export function HistoryScreen({
  items,
  pictures,
  onOpenRecord,
  onRemoveFromPhone,
}: HistoryScreenProps) {
  const headingRef = useFocusHeading();
  const entryRef = useScreenEntry<HTMLElement>();
  const [isScrolled, setIsScrolled] = useState(false);
  const isOnline = useIsOnline();
  const { recordings, uploads, isOnPhone, factsOf, load } = items;
  // Nothing to list until the account's uploads come: their cards' shapes stand in for them.
  const isFirstLoad = load.state === 'loading' && recordings.length === 0;
  const isSkeletonShown = useIsSlowLoad(isFirstLoad);

  return (
    <section
      ref={entryRef}
      aria-labelledby={HISTORY_HEADING_ID}
      data-screen-hash="#history"
      className="tab-screen absolute inset-0 z-20 flex flex-col bg-surface font-sn-pro text-content-primary"
    >
      <header
        className={cn(
          'relative z-10 bg-surface px-5 pt-[calc(env(safe-area-inset-top)+1.25rem)] pb-3 transition-shadow',
          isScrolled && 'shadow-bottom-shadow',
        )}
      >
        <h1
          id={HISTORY_HEADING_ID}
          ref={headingRef}
          tabIndex={-1}
          className="text-3xl/9 font-extrabold focus:outline-none"
        >
          History
        </h1>
      </header>
      <div
        aria-busy={load.state === 'loading' || undefined}
        onScroll={(event) => setIsScrolled(event.currentTarget.scrollTop > 0)}
        className="flex flex-1 flex-col gap-3 overflow-y-auto px-5 pt-6 pb-40"
      >
        {load.state === 'error' && <HistoryLoadLine load={load} />}
        {isFirstLoad && <HistorySkeleton isShown={isSkeletonShown} />}
        {recordings.length === 0 && load.state === 'ready' && (
          <div className="flex flex-col items-center gap-4 pt-16 text-center">
            <p className="text-base/6 text-content-quaternary">No recordings yet.</p>
            <Button variant="primary" label="Record a route" onClick={onOpenRecord} />
          </div>
        )}
        {recordings.length > 0 && (
          <ul aria-label="Recordings" className="flex flex-col gap-3">
            {recordings.map((recording) => {
              const status = uploads.statusOf(recording);
              const isKept = isOnPhone(recording);
              return (
                <HistoryCard
                  key={recording.id}
                  recording={recording}
                  status={status}
                  actions={{
                    canUpload: isKept && canUploadFromMenu(status),
                    isOnPhone: isKept,
                    canDeleteFromPara: uploads.canRemove(recording),
                    isBusy: BUSY_STATES.has(status.state),
                  }}
                  facts={factsOf(recording)}
                  picture={pictures.get(recording.id) ?? null}
                  isOnline={isOnline}
                  onUpload={() => uploads.upload(recording)}
                  onDeleteFromPara={() => void uploads.removeUploaded(recording)}
                  onRemoveFromPhone={() => onRemoveFromPhone(recording)}
                />
              );
            })}
          </ul>
        )}
        {/* Over a list already drawn, Loading waits under it: going, it moves no card. */}
        {load.state === 'loading' && recordings.length > 0 && <HistoryLoadLine load={load} />}
      </div>
      {/* The list fading out under the page's toolbar (4518:24829), which stands over this foot
          (TOOLBAR_FOOT) on all three tabs, so it never moves between them. */}
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-b from-transparent to-surface pt-6',
          TOOLBAR_FOOT,
        )}
      >
        <div className={TOOLBAR_ROOM} />
      </div>
    </section>
  );
}
