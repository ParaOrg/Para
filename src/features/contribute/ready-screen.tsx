import { lazy, Suspense, useEffect, useRef, useState } from 'react';

import { IconButton } from '@/design-system/primitives/icon-button';

import { BackToMapButton, goBackToMap } from './back-to-map-button';
import { ConsentPanel } from './consent-panel';
import { EarlierRecordingsPanel, type EarlierQuestion } from './earlier-recordings-panel';
import { TrackingButton } from './tracking-button';
import { HistoryIcon } from './tracking-icons';
import { useStackRoom } from './use-stack-room';

// The update gate exists in the Android app's build only: on the web this is null and the chunk is
// never built, so the page's first load does not carry it.
const AppUpdateGate =
  import.meta.env.MODE === 'apk'
    ? lazy(() =>
        import('./app-update/app-update-gate').then((module) => ({
          default: module.AppUpdateGate,
        })),
      )
    : null;

interface ReadyScreenProps {
  hasConsent: boolean;
  onConsent: () => void;
  earlierQuestion: EarlierQuestion | null;
  onStart: () => void;
  onOpenHistory: () => void;
  /** Set when History was open before this screen: focus goes back to the button that opened it. */
  shouldFocusHistoryButton: boolean;
}

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
  const startBar = <TrackingButton variant="start" onClick={onStart} />;

  return (
    <>
      <BackToMapButton>
        {hasConsent && (
          <IconButton
            ref={historyRef}
            tooltip="top"
            size="large"
            label="History"
            icon={<HistoryIcon />}
            onClick={onOpenHistory}
          />
        )}
      </BackToMapButton>
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
          {AppUpdateGate ? (
            <Suspense fallback={startBar}>
              <AppUpdateGate>{startBar}</AppUpdateGate>
            </Suspense>
          ) : (
            startBar
          )}
        </section>
      )}
      {!hasConsent && <ConsentPanel onAgree={onConsent} onDecline={goBackToMap} />}
    </>
  );
}
