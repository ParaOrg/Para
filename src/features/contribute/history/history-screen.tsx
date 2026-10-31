import { useState } from 'react';

import { Button } from '@/design-system/primitives/button';
import { cn } from '@/shared/utils/cn';

import { HISTORY_HEADING_ID, canUploadFromMenu } from './card-status';
import { HistoryCard } from './history-card';
import { HistoryLoadLine } from './history-load-line';
import type { HistoryItems } from './use-history-items';
import { useIsOnline } from './use-is-online';
import { useFocusHeading } from '../common/use-focus-heading';
import { useScreenEntry } from '../common/use-screen-entry';
import { BottomToolbar } from '../screens/bottom-toolbar';
import type { Recording } from '../storage/recording-schema';
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
  /** Record: back to Start, wherever History was opened from. */
  onOpenRecord: () => void;
  /** Account. Left out in a build with no accounts, which has no Account tab. */
  onOpenAccount?: () => void;
  onDownload: (recording: Recording) => void;
  onRemoveFromPhone: (recording: Recording) => void;
}

/**
 * Figma's History (4518:24819), a tab like Account: the large title, its shadow once the list
 * scrolls under it, and every recording newest first, this phone's and the account's uploads from
 * its other phones alike, over the toolbar with History marked.
 */
export function HistoryScreen({
  items,
  pictures,
  onOpenRecord,
  onOpenAccount,
  onDownload,
  onRemoveFromPhone,
}: HistoryScreenProps) {
  const headingRef = useFocusHeading();
  const entryRef = useScreenEntry<HTMLElement>();
  const [isScrolled, setIsScrolled] = useState(false);
  const isOnline = useIsOnline();
  const { recordings, uploads, isOnPhone, factsOf, load } = items;

  return (
    <section
      ref={entryRef}
      aria-labelledby={HISTORY_HEADING_ID}
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
        onScroll={(event) => setIsScrolled(event.currentTarget.scrollTop > 0)}
        className="flex flex-1 flex-col gap-3 overflow-y-auto px-5 pt-6 pb-40"
      >
        {load.state !== 'ready' && <HistoryLoadLine load={load} />}
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
                  onDownload={() => onDownload(recording)}
                  onDeleteFromPara={() => void uploads.removeUploaded(recording)}
                  onRemoveFromPhone={() => onRemoveFromPhone(recording)}
                />
              );
            })}
          </ul>
        )}
      </div>
      {/* The toolbar over the page's foot, the list fading out under it (4518:24829). */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-b from-transparent to-surface px-4 pt-6 pb-[max(3rem,env(safe-area-inset-bottom))] *:pointer-events-auto">
        <BottomToolbar
          current="history"
          onOpenRecord={onOpenRecord}
          onOpenAccount={onOpenAccount}
        />
      </div>
    </section>
  );
}
