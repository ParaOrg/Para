import { useState } from 'react';

import { IconButton } from '@/design-system/primitives/icon-button';
import { ChevronLeftIcon } from '@/shared/ui/route-icons';

import { ConsentPanel } from './consent-panel';
import { EarlierRecordingsPanel } from './earlier-recordings-panel';
import type { Recording } from './recording-schema';
import { SAVED_RIDES_ID, SavedRides } from './saved-rides';
import { TrackingButton } from './tracking-button';
import { HistoryIcon } from './tracking-icons';
import type { Consent } from './use-consent';
import { useFocusHeading } from './use-focus-heading';
import { useStackRoom } from './use-stack-room';
import type { Uploads } from './use-uploads';

/** The question about recordings made before the current consent text; absent when none is open. */
export interface EarlierQuestion {
  count: number;
  onSend: () => void;
  onKeep: () => void;
}

interface ReadyScreenProps {
  consent: Consent;
  earlierQuestion: EarlierQuestion | null;
  onStart: () => void;
  saved: readonly Recording[];
  uploads: Uploads;
  onDownloadSaved: (recording: Recording) => void;
  onDeleteSaved: (recording: Recording) => void;
}

const goBackToMap = () => window.location.assign('/');

/**
 * Before a recording: back to the map, History, and one Start bar (or, on a first visit, what the
 * page does). History is closed at first, so only the Start bar covers the map; its button shows
 * the recordings kept on this phone above Start, and a second press hides them.
 */
export function ReadyScreen({
  consent,
  earlierQuestion,
  onStart,
  saved,
  uploads,
  onDownloadSaved,
  onDeleteSaved,
}: ReadyScreenProps) {
  const { hasConsent, giveConsent } = consent;
  const headingRef = useFocusHeading();
  const stackRef = useStackRoom();
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  return (
    <>
      <div className="absolute top-0 left-0 z-10 flex gap-2 pt-[max(1rem,env(safe-area-inset-top))] pl-[max(1rem,env(safe-area-inset-left))]">
        <IconButton
          tooltip="top"
          label="Back to the map"
          icon={<ChevronLeftIcon />}
          onClick={goBackToMap}
        />
        {hasConsent && (
          <IconButton
            tooltip="top"
            label="History"
            icon={<HistoryIcon />}
            aria-expanded={isHistoryOpen}
            aria-controls={SAVED_RIDES_ID}
            onClick={() => setIsHistoryOpen((isOpen) => !isOpen)}
          />
        )}
      </div>
      {hasConsent && earlierQuestion && <EarlierRecordingsPanel {...earlierQuestion} />}
      {hasConsent && !earlierQuestion && (
        <section
          ref={stackRef}
          aria-labelledby="ready-heading"
          className="absolute inset-x-0 bottom-0 z-10 pb-[env(safe-area-inset-bottom)]"
        >
          <h1 id="ready-heading" ref={headingRef} tabIndex={-1} className="sr-only">
            Record a route
          </h1>
          {isHistoryOpen && (
            <SavedRides
              recordings={saved}
              uploads={uploads}
              onDownload={onDownloadSaved}
              onDeleteFromPhone={onDeleteSaved}
            />
          )}
          <TrackingButton variant="start" onClick={onStart} />
        </section>
      )}
      {!hasConsent && <ConsentPanel onAgree={giveConsent} onDecline={goBackToMap} />}
    </>
  );
}
