import { lazy, Suspense, useEffect, useRef, useState, type Ref } from 'react';

import { BottomToolbar } from './bottom-toolbar';
import { StartBar } from './start-bar';
import { useStackRoom } from '../common/use-stack-room';
import { EarlierRecordingsPanel, type EarlierQuestion } from '../consent/earlier-recordings-panel';
import { CreditsButton } from '../map/credits-button';

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
  earlierQuestion: EarlierQuestion | null;
  onStart: () => void;
  onOpenHistory: () => void;
  /** Opens Account from the Account tab; left out in a build with no accounts. */
  onOpenAccount?: () => void;
  /** The tab whose screen was open before this one: focus goes back to it. */
  backFrom: 'history' | 'account' | null;
  /** The ⓘ: opens the map's credits, the Map Data Source sheet. */
  onOpenCredits: () => void;
  /** The ⓘ, for focus to come back to when the credits close. */
  creditsButtonRef: Ref<HTMLButtonElement>;
}

/**
 * Before a recording, Figma's Start (4485:24815): at the foot, the map's ⓘ (Figma 4494:10300)
 * and the Record, History and Account tabs over the Start Tracking bar. The top corners are empty: the
 * top left waits for the tutorial's ?.
 */
export function ReadyScreen({
  earlierQuestion,
  onStart,
  onOpenHistory,
  onOpenAccount,
  backFrom,
  onOpenCredits,
  creditsButtonRef,
}: ReadyScreenProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const historyRef = useRef<HTMLButtonElement>(null);
  const accountRef = useRef<HTMLButtonElement>(null);
  // Decided once, as the screen opens: a later change must not move focus again.
  const [focusTab] = useState(backFrom);
  useEffect(() => {
    const tabRefs = { history: historyRef, account: accountRef };
    ((focusTab && tabRefs[focusTab].current) ?? headingRef.current)?.focus();
  }, [focusTab]);
  const stackRef = useStackRoom();
  const startBar = StartGate ? <StartGate onStart={onStart} /> : <StartBar onClick={onStart} />;

  return (
    <>
      {/* TODO: show HelpButton (help-button.tsx) here, at the top left, once the tutorial it opens
          is designed. Until then the corner is empty, as Figma has no Back to the map on Start:
          the browser's back is the way to the public map. */}
      <section
        ref={stackRef}
        aria-labelledby={earlierQuestion ? undefined : 'ready-heading'}
        className="absolute inset-x-0 bottom-0 z-10 flex flex-col"
      >
        {!earlierQuestion && (
          <h1 id="ready-heading" ref={headingRef} tabIndex={-1} className="sr-only">
            Record a route
          </h1>
        )}
        {/* The tabs stay over the question too: History and Account are always a tap away. The
            ⓘ at the map's bottom left, 12 in and 12 over what stands under the tabs. */}
        <div className="relative flex justify-center px-4 pb-4">
          <div className="absolute bottom-3 left-3 z-10 flex">
            <CreditsButton ref={creditsButtonRef} onClick={onOpenCredits} />
          </div>
          <BottomToolbar
            historyRef={historyRef}
            accountRef={accountRef}
            onOpenHistory={onOpenHistory}
            onOpenAccount={onOpenAccount}
          />
        </div>
        {earlierQuestion && <EarlierRecordingsPanel {...earlierQuestion} />}
        {/* Nothing stands in for Start while the app's gates load: a plain Start would skip the permissions. */}
        {!earlierQuestion && AppUpdateGate && (
          <Suspense fallback={null}>
            <AppUpdateGate>{startBar}</AppUpdateGate>
          </Suspense>
        )}
        {!earlierQuestion && !AppUpdateGate && startBar}
      </section>
    </>
  );
}
