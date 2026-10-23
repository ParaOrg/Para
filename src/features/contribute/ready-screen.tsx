import { useEffect, useRef, useState } from 'react';

import { IconButton } from '@/design-system/primitives/icon-button';
import { ChevronLeftIcon } from '@/shared/ui/route-icons';

import { ConsentPanel } from './consent-panel';
import { EarlierRecordingsPanel } from './earlier-recordings-panel';
import { TrackingButton } from './tracking-button';
import { HistoryIcon } from './tracking-icons';
import { useStackRoom } from './use-stack-room';

/** The question about recordings made before the current consent text; absent when none is open. */
export interface EarlierQuestion {
  count: number;
  onSend: () => void;
  onKeep: () => void;
}

interface ReadyScreenProps {
  hasConsent: boolean;
  onConsent: () => void;
  earlierQuestion: EarlierQuestion | null;
  onStart: () => void;
  onOpenHistory: () => void;
  /** Set when History was open before this screen: focus goes back to the button that opened it. */
  shouldFocusHistoryButton: boolean;
}

const goBackToMap = () => window.location.assign('/');

/**
 * Before a recording: back to the map, History, and one Start bar (or, on a first visit, what the
 * page does). History is a screen of its own, so nothing of it shows here.
 */
export function ReadyScreen({
  hasConsent,
  onConsent,
  earlierQuestion,
  onStart,
  onOpenHistory,
  shouldFocusHistoryButton,
}: ReadyScreenProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const historyRef = useRef<HTMLButtonElement>(null);
  // Decided once, as the screen opens: a later change must not move focus again.
  const [shouldFocusButton] = useState(shouldFocusHistoryButton);
  useEffect(() => {
    (shouldFocusButton ? historyRef.current : headingRef.current)?.focus();
  }, [shouldFocusButton]);
  const stackRef = useStackRoom();

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
            ref={historyRef}
            tooltip="top"
            label="History"
            icon={<HistoryIcon />}
            onClick={onOpenHistory}
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
          <TrackingButton variant="start" onClick={onStart} />
        </section>
      )}
      {!hasConsent && <ConsentPanel onAgree={onConsent} onDecline={goBackToMap} />}
    </>
  );
}
