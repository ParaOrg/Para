import { lazy, Suspense, useEffect, useRef, useState, type Ref, type RefObject } from 'react';

import { CreditsButton } from '@/features/routes/map/credits-button';

import { TOOLBAR_ROOM } from './bottom-toolbar';
import { HelpButton } from './help-button';
import { ParaMark } from './para-mark';
import { StartBar } from './start-bar';
import { useStackRoom } from '../common/use-stack-room';
import { useToolbarLift } from '../common/use-toolbar-lift';
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
  earlierQuestion: EarlierQuestion | null;
  onStart: () => void;
  /** The tab whose screen was open before this one: focus goes back to it. */
  backFrom: 'history' | 'account' | null;
  /** The page's History tab (contribute-page.tsx), for focus to come back to from History. */
  historyTabRef: RefObject<HTMLButtonElement | null>;
  /** The page's Account tab, for focus to come back to from Account. */
  accountTabRef: RefObject<HTMLButtonElement | null>;
  /** The ⓘ: opens the map's credits, the Map Data Source sheet. */
  onOpenCredits: () => void;
  /** The ⓘ, for focus to come back to when the credits close. */
  creditsButtonRef: Ref<HTMLButtonElement>;
  /** The ?: opens the tutorial. */
  onOpenTutorial?: () => void;
  /** The ?, for focus to come back to when the tutorial closes. */
  helpButtonRef?: Ref<HTMLButtonElement>;
}

/**
 * Before a recording, Figma's Record (4520:3197): at the foot, Start tracking over the Record,
 * History and Account tabs, on the map fading into white, and the map's ⓘ (4494:10300) in the
 * bottom left corner. The map-type and locator column stands at the right, 20 in and 24 over
 * Start tracking. Along the top (Figma's Frame 259, 20 in and 24 under the status bar): Para's mark
 * at the left, and at the right the tutorial's ?, laid over the map: nothing else moves for it.
 */
export function ReadyScreen({
  earlierQuestion,
  onStart,
  backFrom,
  historyTabRef,
  accountTabRef,
  onOpenCredits,
  creditsButtonRef,
  onOpenTutorial,
  helpButtonRef,
}: ReadyScreenProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  // Decided once, as the screen opens: a later change must not move focus again.
  const [focusTab] = useState(backFrom);
  useEffect(() => {
    const tab = { history: historyTabRef, account: accountTabRef };
    ((focusTab && tab[focusTab].current) ?? headingRef.current)?.focus();
  }, [focusTab, historyTabRef, accountTabRef]);
  const stackRef = useStackRoom();
  // The page's toolbar stands over the earlier-recordings question, as over Start.
  const liftRef = useToolbarLift();

  // Figma's Record stands the right-hand column 20 in and 24 over Start tracking.
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--dock-right', '1.25rem');
    root.style.setProperty('--dock-gap', '1.5rem');
    return () => {
      root.style.removeProperty('--dock-right');
      root.style.removeProperty('--dock-gap');
    };
  }, []);
  const startBar = StartGate ? <StartGate onStart={onStart} /> : <StartBar onClick={onStart} />;

  return (
    <>
      <div className="pointer-events-none absolute inset-x-5 top-[calc(env(safe-area-inset-top)+1.5rem)] z-20 flex items-center justify-between">
        <ParaMark />
        {/* Not over the earlier recordings' question: the tutorial points at Start, which
            waits for its answer. */}
        {onOpenTutorial && !earlierQuestion && (
          <div className="pointer-events-auto">
            <HelpButton ref={helpButtonRef} onClick={onOpenTutorial} />
          </div>
        )}
      </div>
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
        {/* The map fades into white under Start tracking and the tabs (Figma's Frame 393). The
            tabs are the page's own toolbar, over this foot (contribute-page.tsx): room is kept
            for them here, and they stay over the question too. */}
        <div className="relative flex flex-col gap-3 bg-linear-to-b from-transparent to-surface pb-[max(2rem,env(safe-area-inset-bottom))]">
          {/* Figma's ⓘ, 12 in from the frame's left and foot; lifted over the gesture bar where
              the phone has one, so the bar does not take its taps. */}
          <div className="absolute bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-3 z-10 flex">
            <CreditsButton ref={creditsButtonRef} onClick={onOpenCredits} />
          </div>
          {/* Nothing stands in for Start while the app's gates load: a plain Start would skip the
              permissions. */}
          {!earlierQuestion && AppUpdateGate && (
            <Suspense fallback={null}>
              <AppUpdateGate>{startBar}</AppUpdateGate>
            </Suspense>
          )}
          {!earlierQuestion && !AppUpdateGate && startBar}
          <div aria-hidden className={TOOLBAR_ROOM} />
        </div>
        {earlierQuestion && (
          <div ref={liftRef}>
            <EarlierRecordingsPanel {...earlierQuestion} />
          </div>
        )}
      </section>
    </>
  );
}
