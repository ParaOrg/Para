import { lazy, Suspense, useEffect, useRef, useState } from 'react';

import { BottomToolbar } from './bottom-toolbar';
import { StartBar } from './start-bar';
import { goBackToMap } from '../common/back-to-map-button';
import { useStackRoom } from '../common/use-stack-room';
import { ConsentPanel } from '../consent/consent-panel';
import { EarlierRecordingsPanel, type EarlierQuestion } from '../consent/earlier-recordings-panel';

// The update gate exists in the Android app's build only: on the web this is null and the chunk is
// never built, so the page's first load does not carry it.
const AppUpdateGate =
  import.meta.env.MODE === 'apk'
    ? lazy(() =>
        import('../app-update/app-update-gate').then((module) => ({
          default: module.AppUpdateGate,
        })),
      )
    : null;

// Start in the app asks for the permissions first; the web build never builds it.
const StartGate =
  import.meta.env.MODE === 'apk'
    ? lazy(() => import('../native/start-gate').then((module) => ({ default: module.StartGate })))
    : null;

interface ReadyScreenProps {
  hasConsent: boolean;
  onConsent: () => void;
  earlierQuestion: EarlierQuestion | null;
  onStart: () => void;
  /** Opens Account from the Account tab; absent when there is none to open. */
  onOpenAccount?: () => void;
  /** Account was open before this screen: focus goes back to the Account tab. */
  isBackFromAccount: boolean;
}

/**
 * Before a recording, Figma's Start (4485:24815): at the foot, the Record and Account tabs over
 * the Start Tracking bar (or, on a first visit, what the page does). The top corners are empty:
 * the top left waits for the tutorial's ?.
 */
export function ReadyScreen({
  hasConsent,
  onConsent,
  earlierQuestion,
  onStart,
  onOpenAccount,
  isBackFromAccount,
}: ReadyScreenProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const tabRef = useRef<HTMLButtonElement>(null);
  // Decided once, as the screen opens: a later change must not move focus again.
  const [shouldFocusTab] = useState(isBackFromAccount);
  useEffect(() => {
    (shouldFocusTab ? tabRef.current : headingRef.current)?.focus();
  }, [shouldFocusTab]);
  const stackRef = useStackRoom();
  const startBar = StartGate ? <StartGate onStart={onStart} /> : <StartBar onClick={onStart} />;

  return (
    <>
      {/* TODO: show HelpButton (help-button.tsx) here, at the top left, once the tutorial it opens
          is designed. Until then the corner is empty, as Figma has no Back to the map on Start:
          the browser's back is the way to the public map. */}
      {hasConsent && earlierQuestion && <EarlierRecordingsPanel {...earlierQuestion} />}
      {hasConsent && !earlierQuestion && (
        <section
          ref={stackRef}
          aria-labelledby="ready-heading"
          className="absolute inset-x-0 bottom-0 z-10 flex flex-col"
        >
          <h1 id="ready-heading" ref={headingRef} tabIndex={-1} className="sr-only">
            Record a route
          </h1>
          {onOpenAccount && (
            <div className="px-4 pb-4">
              <BottomToolbar accountRef={tabRef} onOpenAccount={onOpenAccount} />
            </div>
          )}
          {/* Nothing stands in for Start while the app's gates load: a plain Start would skip the permissions. */}
          {AppUpdateGate ? (
            <Suspense fallback={null}>
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
