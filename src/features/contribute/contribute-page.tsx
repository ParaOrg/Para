import { useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from 'react';
import { flushSync } from 'react-dom';

import { ErrorBoundary } from '@/shared/ui/error-boundary';
import { cn } from '@/shared/utils/cn';

import { useAccountGate } from './account/use-account-gate';
import { canUpload } from './api/contribute-client';
import { isAccountConfirmed, useAccountQuery } from './api/use-account-query';
import { OPENABLE_SCREENS_ATTR } from './common/data-attributes';
import { useEarlierQuestion } from './consent/use-earlier-question';
import {
  AccountGate,
  FlagStopButton,
  MapDataSourceView,
  PageToasts,
  PermissionsOnboarding,
  RecordingScreen,
  SaveForm,
  StopRecordingScreen,
  Tutorial,
  UnfinishedScreen,
  UploadCheck,
  lazyScreens,
  loadFlagStopButton,
  loadForgetOtherAccounts,
  loadRecordingScreen,
  loadSaveForm,
  loadStopRecordingScreen,
  loadUnfinishedScreen,
  makeLazyScreens,
} from './lazy-screens';
import { ContributeMap, type ContributeLocatorSlot } from './map/contribute-map';
import { useRecordingTrack } from './map/use-recording-track';
import { useStartMorph } from './motion/use-start-morph';
import { isNativeApp } from './native-bridge/native-app';
import { hasSeenPermissionsScreen } from './native-bridge/permissions-screen-flag';
import { SCREENS } from './navigation/screen-routes';
import { useScreenView } from './navigation/use-screen-view';
import type { MapNote, MapNoteGiven } from './notices/map-note';
import {
  pointsLostWords,
  routeRecordedWords,
  uploadFailedProblem,
  type RouteRecordedGiven,
} from './notices/route-recorded';
import { pageLayout, pageScreens } from './page-layout';
import { MAX_MARKS } from './recorder/recording-marks';
import { useRecording } from './recorder/use-recording';
import { accountChunk, historyChunk, warmScreen } from './screen-loaders';
import { ReadyScreen } from './screens/ready-screen';
import { ScreenUnavailable } from './screens/screen-unavailable';
import { isStopQuestionShown, stopQuestionIn, type StopAskedWhile } from './screens/stop-question';
import { putThumbnail } from './storage/recording-store';
import { BottomToolbar, type ToolbarTab } from './toolbar/bottom-toolbar';
import { ToolbarHoldProvider, useIsToolbarHeld } from './toolbar/toolbar-hold';
import { TOOLBAR_PLACE } from './toolbar/toolbar-place';
import { warmToolbarSlide } from './toolbar/use-toolbar-slide';
import { TUTORIAL_ENTRY, isTutorialEntry } from './tutorial/tutorial-entry';
import type { TutorialDemo } from './tutorial/tutorial-steps';
import { useUploads } from './uploads/use-uploads';

type HistoryViewProps = ComponentProps<typeof lazyScreens.history>;
type AccountViewProps = ComponentProps<typeof lazyScreens.account>;

interface ToolbarPlaceProps {
  /** Under something that holds the page (the credits): out of reach, still in sight. */
  isOutOfReach: boolean;
  children: ReactNode;
}

/**
 * Where the page's toolbar stands (TOOLBAR_PLACE): out of sight and out of reach while a question
 * is asked on the screen under it (toolbar-hold.tsx).
 */
function ToolbarPlace({ isOutOfReach, children }: ToolbarPlaceProps) {
  const isHeld = useIsToolbarHeld();
  return (
    <div inert={isOutOfReach || isHeld} className={cn(TOOLBAR_PLACE, isHeld && 'invisible')}>
      {children}
    </div>
  );
}

/**
 * History, at once if its chunk is here, else lazily: decided once as it opens, so the chunk
 * arriving later never swaps it for another and resets its scroll, menus and focus.
 */
function HistoryView(props: HistoryViewProps) {
  const [Screen] = useState(() => historyChunk.loaded()?.HistoryView ?? lazyScreens.history);
  return <Screen {...props} />;
}

/** Account, as History: at once if its chunk is here, else lazily, decided once as it opens. */
function AccountView(props: AccountViewProps) {
  const [Screen] = useState(() => accountChunk.loaded()?.AccountView ?? lazyScreens.account);
  return <Screen {...props} />;
}

/** How long Start waits for the browser's idle time before fetching History and Account anyway. */
const WARM_SCREENS_WITHIN_MS = 2000;

/** Keeps the picture of a recording's trail for History's card; without it the card draws the trail. */
function keepTrailPicture(recordingId: string, picture: string): void {
  putThumbnail(recordingId, picture).catch((error: unknown) => {
    console.warn("The trail's picture could not be kept; History draws the trail.", error);
  });
}

interface ContributePageProps {
  /** The locator on the map: the shell's, since this feature may not import the locator's. */
  locator?: ContributeLocatorSlot;
}

/** The contributor's page: a map with the recording drawn on it, and the screen for where the recording is. */
export function ContributePage({ locator }: ContributePageProps) {
  const recording = useRecording();
  const accountQuery = useAccountQuery();
  const accountId = accountQuery.data?.id ?? null;
  const accountGate = useAccountGate();
  // Only a later check (online again, back to the front) can find another account: the watch is
  // fetched as the page opens, not carried by its opening. Not fetched for want of signal, it is
  // asked for again as the signal comes back, so it is never missing for the page's life.
  const queryClient = useQueryClient();
  useEffect(() => {
    let stop: (() => void) | null = null;
    let isLeft = false;
    const watch = () => {
      loadForgetOtherAccounts().then(
        ({ forgetOtherAccounts }) => {
          if (!isLeft) stop = forgetOtherAccounts(queryClient);
        },
        // No signal: asked for again when it comes back.
        () => window.addEventListener('online', watch, { once: true }),
      );
    };
    watch();
    return () => {
      isLeft = true;
      window.removeEventListener('online', watch);
      stop?.();
    };
  }, [queryClient]);
  // Having an account is the agreement (CONSENT_VERSION 4): nothing is sent until one is signed
  // in, and recordings made before wait on the phone. Start shows on the session the phone
  // stored; nothing is sent until the session check has its answer (use-account-query.ts), and a
  // send never signs in anonymously.
  const canSend = accountGate === 'ready';
  const canSendNow = canSend && isAccountConfirmed(accountQuery);
  const earlier = useEarlierQuestion(recording.saved, canSend, accountId);
  const uploads = useUploads(recording.saved, {
    hasConsent: canSendNow,
    earlier: earlier.choice,
  });
  const track = useRecordingTrack(
    recording.kept,
    recording.current?.modes,
    recording.current?.marks,
  );
  const history = useScreenView('history');
  const profile = useScreenView('profile');
  const settings = useScreenView('accountSettings');
  const changePassword = useScreenView('changePassword');
  const deleteAccount = useScreenView('deleteAccount');
  const { phase, figures } = recording;
  // The Android app's permissions screen, once per phone, after sign-in: the screen itself closes
  // at once if every permission is granted.
  const [isPermissionsPending, setIsPermissionsPending] = useState(
    () => PermissionsOnboarding !== null && isNativeApp() && !hasSeenPermissionsScreen(),
  );
  // Said in toasts at the top: what went wrong, until closed or fixed (the recorder's problem, a
  // recording running with the screen free to sleep), and a stop just flagged. Their code is
  // fetched the first time there is one, then kept, to take them away once fixed.
  const isScreenFreeToSleep = phase === 'recording' && recording.isWakeRefused;
  // The locator's note: what it says, and a count that grows with each tap, said again each time.
  const [mapNote, setMapNote] = useState<MapNoteGiven | null>(null);
  const handleMapNote = (note: MapNote | null) =>
    setMapNote((given) => (note ? { note, timesGiven: (given?.timesGiven ?? 0) + 1 } : null));
  // The stops flagged while the toasts are drawn: one more says "Stop flagged". Back to none while
  // they are not (signed out), so drawn again they never take an old flag for a new one.
  const [stopsFlagged, setStopsFlagged] = useState(0);
  if (accountGate !== 'ready' && stopsFlagged !== 0) setStopsFlagged(0);
  const handleFlag = () => {
    if (recording.markPlace()) setStopsFlagged((flagged) => flagged + 1);
  };
  // Where Ready puts focus as it opens: back on the tab whose screen was open, on Start tracking
  // after a save, else its heading.
  const [openedTab, setOpenedTab] = useState<'history' | 'account' | 'save' | null>(null);
  // Each route saved: back on Record, a toast says so and where it goes next, in words fixed at
  // the save. Back to none while the toasts are not drawn, as the flags are.
  const [routeRecorded, setRouteRecorded] = useState<RouteRecordedGiven | null>(null);
  const [toldOfSave, setToldOfSave] = useState(recording.lastSaved);
  if (recording.lastSaved !== toldOfSave) {
    setToldOfSave(recording.lastSaved);
    const saved = recording.lastSaved;
    if (saved) {
      const words = routeRecordedWords(uploads.statusOf(saved), navigator.onLine);
      const pointsLost = pointsLostWords(saved.failedFixWrites ?? 0);
      setRouteRecorded((told) => ({ words, pointsLost, times: (told?.times ?? 0) + 1 }));
      // Record opens with focus on Start tracking, the toast read out politely.
      setOpenedTab('save');
    }
  }
  if (accountGate !== 'ready' && routeRecorded) setRouteRecorded(null);
  // The just-saved route's upload failing reaches the contributor on Record, not only in History.
  const uploadProblem = recording.lastSaved
    ? uploadFailedProblem(uploads.statusOf(recording.lastSaved))
    : null;
  const [hasHadToasts, setHasHadToasts] = useState(false);
  if (
    (recording.problem ||
      isScreenFreeToSleep ||
      mapNote ||
      stopsFlagged ||
      routeRecorded ||
      uploadProblem) &&
    !hasHadToasts
  ) {
    setHasHadToasts(true);
  }
  // The tutorial, from Record's ?; under its later steps, a demo recording in Record's place.
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [tutorialDemo, setTutorialDemo] = useState<TutorialDemo>(null);
  const helpButtonRef = useRef<HTMLButtonElement>(null);
  // Back on Record, focus goes back to the ? that opened it, as a closed sheet hands it back.
  const closeTutorialNow = useCallback(() => {
    flushSync(() => {
      setTutorialDemo(null);
      setIsTutorialOpen(false);
    });
    helpButtonRef.current?.focus();
  }, []);
  // Opened with a history entry of its own, so the phone's Back closes it rather than leaving the
  // page; its own Skip, Escape and Got it take that entry back off.
  const openTutorial = () => {
    window.history.pushState({ [TUTORIAL_ENTRY]: true }, '');
    setIsTutorialOpen(true);
  };
  const closeTutorial = useCallback(() => {
    if (isTutorialEntry(window.history.state)) window.history.back();
    else closeTutorialNow();
  }, [closeTutorialNow]);
  useEffect(() => {
    if (!isTutorialOpen) return;
    window.addEventListener('popstate', closeTutorialNow);
    return () => window.removeEventListener('popstate', closeTutorialNow);
  }, [isTutorialOpen, closeTutorialNow]);
  // The map's credits, over Start, a recording or one left open: closed by ✕, Escape or a tap on
  // the dimmed map. Their own ⓘ opens them; every other screen over the map keeps MapLibre's
  // corner ⓘ.
  const [isCreditsOpen, setIsCreditsOpen] = useState(false);
  // Closed and sliding down: still drawn, the page under it live again.
  const [isCreditsLeaving, setIsCreditsLeaving] = useState(false);
  // The recording card folded away, by the recording it was folded on: each recording opens with
  // its card out, and the contributor's choice holds through its switches, pauses and the form.
  const [foldedRecordingId, setFoldedRecordingId] = useState<string | null>(null);
  const isCardFolded = foldedRecordingId !== null && foldedRecordingId === recording.current?.id;
  // ✕ pauses the recording and asks over the whole screen: what it was doing then, so Keep
  // recording puts it back. Focus returns to ✕ once the recording screen is live again. The
  // question shows once the pause lands, and goes as the page leaves the recording screen
  // (stop-question.ts): dropped during render, as React does for state that follows other state.
  const [stopAskedWhile, setStopAskedWhile] = useState<StopAskedWhile>(null);
  if (stopQuestionIn(phase, stopAskedWhile) !== stopAskedWhile) setStopAskedWhile(null);
  const isStopShown = isStopQuestionShown(phase, stopAskedWhile);
  // History and Account are tabs on Ready; a build with no accounts has History alone.
  const hasAccount = canUpload();
  const screens = pageScreens({
    phase,
    accountGate,
    hasAccount,
    isPermissionsPending,
    isHistoryOpen: history.isOpen,
    isProfileOpen: profile.isOpen,
    isAccountSettingsOpen: settings.isOpen,
    isChangePasswordOpen: changePassword.isOpen,
    isDeleteAccountOpen: deleteAccount.isOpen,
  });
  const layout = pageLayout(screens, {
    hasFigures: figures !== null,
    isTutorialOpen,
    tutorialDemo,
    isCreditsOpen,
    isCreditsLeaving,
    isStopShown,
  });
  // Only over Ready: a ride, or the account gate, taking its place ends it, demo and all.
  // A hash move (the browser's Forward onto History, say) ends it as a ride does.
  const isTutorialShown = isTutorialOpen && layout.isReadyClear;
  if (isTutorialOpen && !isTutorialShown) {
    setIsTutorialOpen(false);
    setTutorialDemo(null);
  }
  // History and Account stay drawn once opened, hidden while another screen shows (<Activity>):
  // going back is a show, with no fetch, read or layout again. Hidden, their effects and queries
  // rest. Signed out, they go.
  const [isHistoryKept, setIsHistoryKept] = useState(false);
  if (layout.isHistoryShown && !isHistoryKept) setIsHistoryKept(true);
  if (!canSend && isHistoryKept) setIsHistoryKept(false);
  const [isProfileKept, setIsProfileKept] = useState(false);
  if (layout.isProfileShown && !isProfileKept) setIsProfileKept(true);
  if (!canSend && isProfileKept) setIsProfileKept(false);
  const discardButtonRef = useRef<HTMLButtonElement>(null);
  const askToStop = () => {
    setStopAskedWhile(phase === 'paused' ? 'paused' : 'recording');
    if (phase === 'recording') recording.stop();
  };
  const keepRecording = () => {
    const wasRecording = stopAskedWhile === 'recording';
    flushSync(() => setStopAskedWhile(null));
    if (wasRecording) recording.resume();
    discardButtonRef.current?.focus();
  };
  const stopWithoutSaving = () => {
    setStopAskedWhile(null);
    recording.cancel();
  };
  // Focus goes back to the ⓘ as the sheet starts down, once Start is live again: the sheet cannot
  // hand it back itself, as the ⓘ turned inert under it the moment it opened.
  const creditsButtonRef = useRef<HTMLButtonElement>(null);
  const { fetchAhead: fetchStartMorph, startWithMorph } = useStartMorph();
  const closeCredits = useCallback(() => {
    flushSync(() => {
      setIsCreditsOpen(false);
      setIsCreditsLeaving(true);
    });
    creditsButtonRef.current?.focus();
  }, []);
  const creditsGone = useCallback(() => setIsCreditsLeaving(false), []);
  // Each opening a sheet of its own, so one opened while the last slides down rises afresh.
  const [creditsOpenings, setCreditsOpenings] = useState(0);
  const openCredits = () => {
    setIsCreditsLeaving(false);
    setCreditsOpenings((n) => n + 1);
    setIsCreditsOpen(true);
  };

  // A stale #history (a reload mid-recording, or before signing in) must not open History later,
  // when a save returns to Record or the account signs in. The account is unknown until it has
  // loaded; closing then would shut History on every reload.
  useEffect(() => {
    if (accountGate === 'loading') return;
    if (history.isOpen && (!canSend || (phase !== 'loading' && phase !== 'ready'))) {
      history.close();
    }
  }, [accountGate, phase, canSend, history]);

  // On Ready the recording screens are fetched ahead of Start, and the save screens too, also when
  // the page opens on a ride already under way, so stopping one never waits on the network. A
  // failure here is only a missed head start: the lazy screen asks again when it is shown.
  useEffect(() => {
    if (phase !== 'ready' && phase !== 'recording' && phase !== 'paused') return;
    Promise.all([
      loadRecordingScreen(),
      loadUnfinishedScreen(),
      loadStopRecordingScreen(),
      loadFlagStopButton(),
      loadSaveForm(),
      fetchStartMorph(),
    ]).catch((error: unknown) => {
      console.warn('The recording screens could not be fetched ahead of Start.', error);
    });
  }, [phase, fetchStartMorph]);

  // History and Account fetched ahead once Start has settled, in the browser's idle time, so the
  // first tap on their tab finds them here: its move starts at once, on the real screen. The
  // toolbar's slide comes with them.
  useEffect(() => {
    if (phase !== 'ready') return;
    const warm = () => {
      warmScreen('history');
      if (canUpload()) warmScreen('account');
      warmToolbarSlide();
    };
    if ('requestIdleCallback' in window) {
      const idle = window.requestIdleCallback(warm, { timeout: WARM_SCREENS_WITHIN_MS });
      return () => window.cancelIdleCallback(idle);
    }
    // Safari has no idle callback: a plain wait stands in for it.
    const later = setTimeout(warm, WARM_SCREENS_WITHIN_MS);
    return () => clearTimeout(later);
  }, [phase]);

  // Signing out, or leaving Ready, must not leave #profile or a screen inside Account settings to
  // reopen Account after the next sign-in.
  useEffect(() => {
    const isUsable = accountGate === 'ready' && (phase === 'loading' || phase === 'ready');
    if (isUsable || accountGate === 'loading') return;
    if (profile.isOpen) profile.close();
    if (settings.isOpen) settings.close();
    if (changePassword.isOpen) changePassword.close();
    if (deleteAccount.isOpen) deleteAccount.close();
  }, [phase, accountGate, profile, settings, changePassword, deleteAccount]);

  const handleOpenHistory = () => {
    setOpenedTab('history');
    history.open();
  };
  const handleOpenAccount = () => {
    setOpenedTab('account');
    profile.open();
  };
  // Record, from History, goes to Start wherever History was opened from.
  const openRecordFromHistory = () => history.replaceWith(SCREENS.record.hash);

  const historyTabRef = useRef<HTMLButtonElement>(null);
  const accountTabRef = useRef<HTMLButtonElement>(null);
  const toolbarOpeners: Record<ToolbarTab, Partial<Record<ToolbarTab, () => void>>> = {
    record: { history: handleOpenHistory, account: hasAccount ? handleOpenAccount : undefined },
    history: {
      record: openRecordFromHistory,
      // Account takes History's place.
      account: hasAccount
        ? () => {
            setOpenedTab('account');
            history.replaceWith(SCREENS.profile.hash);
          }
        : undefined,
    },
    account: { record: profile.close, history: history.open },
  };

  // A screen whose code could not be fetched shows ScreenUnavailable; its Try again draws the
  // screen afresh, with a fresh fetch.
  const [screenTries, setScreenTries] = useState(0);
  const tryScreenAgain = () => {
    makeLazyScreens();
    setScreenTries((n) => n + 1);
  };

  return (
    // The page never scrolls, not even from code (contribute.css, .contribute-page).
    <main
      // The toolbar's screens that can open now (tab-motion.ts).
      {...{ [OPENABLE_SCREENS_ATTR]: layout.openableScreens }}
      className="contribute-page relative h-dvh bg-surface-secondary font-sn-pro"
    >
      {/* inert while a screen or a question covers it: no map control can be tabbed to, or
          found by a screen reader, behind it. */}
      <div inert={layout.isMapCovered} className="contents">
        <ContributeMap
          track={track}
          isRecording={layout.isRecordingShown}
          isFrosted={phase === 'paused'}
          locator={locator}
          onMapNote={handleMapNote}
          areCreditsShown={!layout.hasCreditsButton}
          isCovered={layout.isMapCovered}
          pictureFor={phase === 'form' ? (recording.current?.id ?? null) : null}
          onPicture={keepTrailPicture}
          mark={
            layout.isRecordingShown ? (
              <Suspense fallback={null}>
                <FlagStopButton
                  isRecording={phase === 'recording'}
                  canFlag={(recording.current?.marks?.length ?? 0) < MAX_MARKS}
                  onFlag={handleFlag}
                />
              </Suspense>
            ) : tutorialDemo ? (
              // The demo's: where a recording's stands, and it flags nothing. Inert, as the rest of
              // the demo is: under the tutorial's overlay, never focused or pressed.
              <div inert className="contents">
                <Suspense fallback={null}>
                  <FlagStopButton
                    isRecording={tutorialDemo === 'recording'}
                    canFlag
                    onFlag={() => undefined}
                  />
                </Suspense>
              </div>
            ) : null
          }
        />
      </div>
      {layout.isAccountGateShown && (
        <Suspense fallback={null}>
          <AccountGate needsProfile={accountGate === 'needs-profile'} />
        </Suspense>
      )}
      {accountGate === 'ready' && (
        // A question on Record, History or Account holds the toolbar (toolbar-hold.tsx).
        <ToolbarHoldProvider>
          {hasHadToasts && (
            <Suspense fallback={null}>
              <PageToasts
                problem={recording.problem}
                isScreenFreeToSleep={isScreenFreeToSleep}
                mapNote={mapNote}
                stopsFlagged={stopsFlagged}
                routeRecorded={routeRecorded}
                uploadProblem={uploadProblem}
              />
            </Suspense>
          )}
          {uploads.check && phase === 'ready' && (
            <Suspense fallback={null}>
              <UploadCheck check={uploads.check} />
            </Suspense>
          )}
          <p role="status" className="sr-only">
            {recording.announcement}
          </p>
          {layout.isPermissionsShown && PermissionsOnboarding && (
            <Suspense fallback={<div className="absolute inset-0 z-40 bg-surface" />}>
              <PermissionsOnboarding onDone={() => setIsPermissionsPending(false)} />
            </Suspense>
          )}
          {/* TODO: show TrackRoutesCard (tutorial/track-routes-card.tsx) over the map here, on Ready
              after the permissions screen, once the tutorial screens it opens are designed. */}
          {layout.isStartShown && (
            // Inert under the credits and the tutorial, as the map is: nothing of Start is reached
            // behind them. The tutorial's spotlight only shows Start; it is never pressed there.
            <div inert={layout.isStartOutOfReach} className="contents">
              <ReadyScreen
                earlierQuestion={earlier.question}
                onStart={() => {
                  // A ride begun: the next Start opens fresh, focus on its heading, not the tab.
                  setOpenedTab(null);
                  startWithMorph(() => recording.start());
                }}
                backFrom={openedTab}
                historyTabRef={historyTabRef}
                accountTabRef={accountTabRef}
                onOpenCredits={openCredits}
                creditsButtonRef={creditsButtonRef}
                onOpenTutorial={openTutorial}
                helpButtonRef={helpButtonRef}
              />
            </div>
          )}
          {isTutorialShown && (
            <Suspense fallback={null}>
              <Tutorial onDemoChange={setTutorialDemo} onClose={closeTutorial} />
            </Suspense>
          )}
          {layout.isCreditsDrawn && (
            <Suspense fallback={null}>
              <MapDataSourceView
                key={creditsOpenings}
                onClose={closeCredits}
                onClosed={creditsGone}
              />
            </Suspense>
          )}
          {isProfileKept && (
            <Activity mode={layout.isProfileShown ? 'visible' : 'hidden'}>
              <ErrorBoundary
                key={screenTries}
                fallback={
                  <ScreenUnavailable
                    name="Account"
                    screenHash={SCREENS.profile.hash}
                    hasFetchFailed={accountChunk.hasFailed}
                    onTryAgain={tryScreenAgain}
                  />
                }
              >
                <Suspense fallback={null}>
                  <AccountView recordings={recording.saved} statusOf={uploads.statusOf} />
                </Suspense>
              </ErrorBoundary>
            </Activity>
          )}
          {isHistoryKept && (
            <Activity mode={layout.isHistoryShown ? 'visible' : 'hidden'}>
              <ErrorBoundary
                key={screenTries}
                fallback={
                  <ScreenUnavailable
                    name="History"
                    screenHash={SCREENS.history.hash}
                    hasFetchFailed={historyChunk.hasFailed}
                    onTryAgain={tryScreenAgain}
                  />
                }
              >
                <Suspense fallback={null}>
                  <HistoryView
                    recordings={recording.saved}
                    uploads={uploads}
                    onOpenRecord={openRecordFromHistory}
                    onRemoveFromPhone={recording.deleteSaved}
                  />
                </Suspense>
              </ErrorBoundary>
            </Activity>
          )}
          {layout.toolbarTab && (
            // Drawn once and kept while Record, History or Account shows, so it stands still as
            // they slide under it; only its pill moves. Out of reach where Start is.
            <ToolbarPlace isOutOfReach={layout.isStartOutOfReach}>
              <BottomToolbar
                current={layout.toolbarTab}
                onOpenRecord={toolbarOpeners[layout.toolbarTab].record}
                onOpenHistory={toolbarOpeners[layout.toolbarTab].history}
                onOpenAccount={toolbarOpeners[layout.toolbarTab].account}
                onTabPointerDown={warmScreen}
                historyRef={historyTabRef}
                accountRef={accountTabRef}
              />
            </ToolbarPlace>
          )}
          {phase === 'unfinished' && figures && (
            <Suspense fallback={null}>
              <div inert={layout.isCreditsShown} className="contents">
                <UnfinishedScreen
                  figures={figures}
                  onResume={recording.resume}
                  onStop={recording.stopAtLastFix}
                  onOpenCredits={openCredits}
                  creditsButtonRef={creditsButtonRef}
                />
              </div>
            </Suspense>
          )}
          {layout.isRecordingShown && figures && (
            <Suspense fallback={null}>
              <div inert={layout.isRecordingOutOfReach} className="contents">
                <RecordingScreen
                  figures={figures}
                  mode={recording.mode}
                  isPaused={phase === 'paused'}
                  shouldFocusPause={recording.focusTarget === 'pause'}
                  onPause={recording.stop}
                  onResume={recording.resume}
                  onModeSwitch={recording.switchMode}
                  onFinish={recording.openSave}
                  onAskToStop={askToStop}
                  discardButtonRef={discardButtonRef}
                  isCardFolded={isCardFolded}
                  onCardFoldedChange={(isFolded) =>
                    setFoldedRecordingId(isFolded ? (recording.current?.id ?? null) : null)
                  }
                  onOpenCredits={openCredits}
                  creditsButtonRef={creditsButtonRef}
                />
              </div>
            </Suspense>
          )}
          {isStopShown && figures && (
            <Suspense fallback={null}>
              <StopRecordingScreen
                figures={figures}
                onKeep={keepRecording}
                onStop={stopWithoutSaving}
              />
            </Suspense>
          )}
          {layout.isFormShown && figures && (
            <Suspense fallback={null}>
              <SaveForm
                figures={figures}
                failedFixWrites={recording.current?.failedFixWrites ?? 0}
                onDiscard={recording.cancel}
                onKeepRecording={recording.keepRecording}
                onSave={recording.save}
              />
            </Suspense>
          )}
        </ToolbarHoldProvider>
      )}
    </main>
  );
}
