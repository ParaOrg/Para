import { lazy, Suspense, useEffect, useRef, useState } from 'react';

import { IconButton } from '@/design-system/primitives/icon-button';
import { InformationIcon } from '@/shared/ui/route-icons';

import { BottomToolbar } from './bottom-toolbar';
import { StartBar } from './start-bar';
import { goBackToMap } from '../common/back-to-map-button';
import { useStackRoom } from '../common/use-stack-room';
import { ConsentPanel } from '../consent/consent-panel';
import { EarlierRecordingsPanel, type EarlierQuestion } from '../consent/earlier-recordings-panel';

import './start-icons.css';

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

/** Which button opened Account: focus goes back to it when Account closes. */
export type AccountOpener = 'person' | 'tab';

interface ReadyScreenProps {
  hasConsent: boolean;
  onConsent: () => void;
  earlierQuestion: EarlierQuestion | null;
  onStart: () => void;
  /** Opens Account, from the person button or the Account tab; absent when there is none to open. */
  onOpenAccount?: (opener: AccountOpener) => void;
  /** The button that opened the screen that was open before this one. */
  returnFocusTo: AccountOpener | null;
  /** The ⓘ: opens the map's credits, the Map Data Source sheet. */
  onOpenCredits: () => void;
}

/**
 * Before a recording, Figma's Start (4485:24815): the person button at the top right and, at the
 * foot, the map's ⓘ (Figma 4494:10300) beside the Record and Account tabs, over the Start
 * Tracking bar (or, on a first visit, what the page does). The top left waits for the tutorial's ?.
 */
export function ReadyScreen({
  hasConsent,
  onConsent,
  earlierQuestion,
  onStart,
  onOpenAccount,
  returnFocusTo,
  onOpenCredits,
}: ReadyScreenProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const personRef = useRef<HTMLButtonElement>(null);
  const tabRef = useRef<HTMLButtonElement>(null);
  // Decided once, as the screen opens: a later change must not move focus again.
  const [focusTarget] = useState(returnFocusTo);
  useEffect(() => {
    const openers = { person: personRef.current, tab: tabRef.current };
    (focusTarget ? openers[focusTarget] : headingRef.current)?.focus();
  }, [focusTarget]);
  const stackRef = useStackRoom();
  const startBar = StartGate ? <StartGate onStart={onStart} /> : <StartBar onClick={onStart} />;

  return (
    <>
      {/* TODO: show HelpButton (help-button.tsx) here, at the top left, once the tutorial it opens
          is designed. Until then the corner is empty, as Figma has no Back to the map on Start:
          the browser's back is the way to the public map. */}
      {onOpenAccount && (
        <div className="absolute top-0 right-0 z-30 pt-[calc(env(safe-area-inset-top)+1.5rem)] pr-[max(1rem,env(safe-area-inset-right))]">
          <IconButton
            ref={personRef}
            tooltip="top"
            size="large"
            label="Account"
            icon={<span className="start-icon start-icon-account" />}
            onClick={() => onOpenAccount('person')}
          />
        </div>
      )}
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
          {/* The ⓘ at the left, level with the tabs centred between it and an empty right. */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center px-4 pb-4">
            <button
              type="button"
              aria-label="Map data sources"
              onClick={onOpenCredits}
              className="size-6 justify-self-start text-content-quaternary"
            >
              <InformationIcon />
            </button>
            {onOpenAccount && (
              <BottomToolbar accountRef={tabRef} onOpenAccount={() => onOpenAccount('tab')} />
            )}
          </div>
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
