import {
  Activity,
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type ComponentType,
  type ReactNode,
} from 'react';
import { flushSync } from 'react-dom';

import { ErrorBoundary } from '@/shared/ui/error-boundary';
import { cn } from '@/shared/utils/cn';

import { useAccountGate } from './account/use-account-gate';
import { useAccountSettingsView } from './account/use-account-settings-view';
import { useProfileView } from './account/use-profile-view';
import { canUpload } from './api/contribute-client';
import { useAccountQuery } from './api/use-account-query';
import { retryingImport } from './common/retrying-import';
import { ToolbarHoldProvider, useIsToolbarHeld } from './common/toolbar-hold';
import { useEarlierQuestion } from './consent/use-earlier-question';
import { useHistoryView } from './history/use-history-view';
import { ContributeMap, type ContributeLocatorSlot } from './map/contribute-map';
import { useRecordingTrack } from './map/use-recording-track';
import { isNativeApp } from './native-bridge/native-app';
import { hasSeenPermissionsScreen } from './native-bridge/permissions-screen-flag';
import { MAX_MARKS } from './recorder/recording-marks';
import { useRecording } from './recorder/use-recording';
import { accountChunk, historyChunk, warmScreen } from './screen-loaders';
import { BottomToolbar, TOOLBAR_PLACE, type ToolbarTab } from './screens/bottom-toolbar';
import type { FlagStopButtonProps } from './screens/flag-stop-button';
import { ReadyScreen } from './screens/ready-screen';
import { ScreenUnavailable } from './screens/screen-unavailable';
import { START_BUTTON_ATTR, morphStartIntoCard } from './screens/start-morph';
import { isStopQuestionShown, stopQuestionIn, type StopAskedWhile } from './screens/stop-question';
import { warmToolbarSlide } from './screens/use-toolbar-slide';
import { putThumbnail } from './storage/recording-store';
import { UploadCheck } from './uploads/upload-check';
import { uploadStatusText } from './uploads/upload-status';
import { useUploads } from './uploads/use-uploads';

/*
 * History and Account, drawn at once when their chunk is already here (screen-loaders.ts), else
 * through React.lazy. A lazy screen whose fetch failed stays failed for good: ScreenUnavailable's
 * Try again makes fresh ones (makeLazyScreens) before it draws the screen again. Not on the
 * failure itself: React renders a failed screen a second time, and a fresh one there would fetch
 * again, fail again, and never stop.
 */
const lazyHistory = () =>
  lazy(() => historyChunk.load().then((chunk) => ({ default: chunk.HistoryView })));
const lazyAccount = () =>
  lazy(() => accountChunk.load().then((chunk) => ({ default: chunk.AccountView })));
let LazyHistoryView = lazyHistory();
let LazyAccountView = lazyAccount();
function makeLazyScreens(): void {
  LazyHistoryView = lazyHistory();
  LazyAccountView = lazyAccount();
}

type HistoryViewProps = ComponentProps<typeof LazyHistoryView>;
type AccountViewProps = ComponentProps<typeof LazyAccountView>;

// The map's credits, opened from the ⓘ on Start: fetched on the tap, not with the page.
const MapDataSourceView = lazy(() =>
  import('@/features/routes/map/map-data-source-view').then((module) => ({
    default: module.MapDataSourceView,
  })),
);

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
  const [Screen] = useState(() => historyChunk.loaded()?.HistoryView ?? LazyHistoryView);
  return <Screen {...props} />;
}

/** Account, as History: at once if its chunk is here, else lazily, decided once as it opens. */
function AccountView(props: AccountViewProps) {
  const [Screen] = useState(() => accountChunk.loaded()?.AccountView ?? LazyAccountView);
  return <Screen {...props} />;
}
// Shown only once a recording is under way or found open, never on the page's first paint. Ready
// fetches them as it opens (below), so Start never waits on the network, nor fails without one.
// A fetch ahead that failed offline does not leave them unreachable: each asks again afresh.
const loadRecordingScreen = retryingImport(() => import('./screens/recording-screen'));
const loadUnfinishedScreen = retryingImport(() => import('./screens/unfinished-screen'));
const loadStopRecordingScreen = retryingImport(() => import('./screens/stop-recording-screen'));
const loadFlagStopButton = retryingImport(() => import('./screens/flag-stop-button'));
const loadSaveForm = retryingImport(() => import('./screens/save-form'));
const loadSavedScreen = retryingImport(() => import('./screens/saved-screen'));
const SaveForm = lazy(() => loadSaveForm().then((module) => ({ default: module.SaveForm })));
const SavedScreen = lazy(() =>
  loadSavedScreen().then((module) => ({ default: module.SavedScreen })),
);
const RecordingScreen = lazy(() =>
  loadRecordingScreen().then((module) => ({ default: module.RecordingScreen })),
);
const StopRecordingScreen = lazy(() =>
  loadStopRecordingScreen().then((module) => ({ default: module.StopRecordingScreen })),
);
/** Flag a stop's place when its code could not be fetched: nothing, and the ride goes on. */
function NoFlagStopButton(): null {
  return null;
}
// Not fetched (offline before the worker kept it): the ride records on without the button, rather
// than the failed load taking the page down with it.
const FlagStopButton = lazy<ComponentType<FlagStopButtonProps>>(() =>
  loadFlagStopButton().then(
    (module) => ({ default: module.FlagStopButton }),
    (error: unknown) => {
      console.warn('Flag a stop could not be fetched; the ride records without it.', error);
      return { default: NoFlagStopButton };
    },
  ),
);
const UnfinishedScreen = lazy(() =>
  loadUnfinishedScreen().then((module) => ({ default: module.UnfinishedScreen })),
);
// Sign-in, sign-up and the profile step show only to a phone with no finished account, and bring
// the form fields and their checks with them: after the first sign-in the page never opens them.
const AccountGate = lazy(() =>
  import('./account/account-gate').then((module) => ({ default: module.AccountGate })),
);

// The permissions screen exists in the Android app's build only: on the web this is null and the
// chunk is never built.
const PermissionsOnboarding =
  import.meta.env.MODE === 'apk'
    ? lazy(() =>
        import('./native/permissions-onboarding').then((module) => ({
          default: module.PermissionsOnboarding,
        })),
      )
    : null;

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
  const accountId = useAccountQuery().data?.id ?? null;
  const accountGate = useAccountGate();
  // Having an account is the agreement (CONSENT_VERSION 4): nothing is sent until one is signed
  // in, and recordings made before wait on the phone.
  const canSend = accountGate === 'ready';
  const earlier = useEarlierQuestion(recording.saved, canSend, accountId);
  const uploads = useUploads(recording.saved, {
    hasConsent: canSend,
    earlier: earlier.choice,
  });
  const track = useRecordingTrack(
    recording.kept,
    recording.current?.modes,
    recording.current?.marks,
  );
  const history = useHistoryView();
  const profile = useProfileView();
  const settings = useAccountSettingsView();
  const { phase, figures } = recording;
  // Once per phone, after sign-in: the screen itself closes at once if every permission is granted.
  const [isPermissionsPending, setIsPermissionsPending] = useState(
    () => PermissionsOnboarding !== null && isNativeApp() && !hasSeenPermissionsScreen(),
  );
  const isPermissionsShown = isPermissionsPending && accountGate === 'ready' && phase === 'ready';
  const isHistoryShown = phase === 'ready' && canSend && history.isOpen && !isPermissionsShown;
  const isProfileShown =
    phase === 'ready' &&
    accountGate === 'ready' &&
    canUpload() &&
    // Account settings is shown by Account, in its place.
    (profile.isOpen || settings.isOpen) &&
    !isPermissionsShown;
  const isRecordingShown = phase === 'recording' || phase === 'paused';
  // History and Account stay drawn once opened, hidden while another screen shows (<Activity>):
  // going back is a show, with no fetch, read or layout again. Hidden, their effects and queries
  // rest. Signed out, they go.
  const [isHistoryKept, setIsHistoryKept] = useState(false);
  if (isHistoryShown && !isHistoryKept) setIsHistoryKept(true);
  if (!canSend && isHistoryKept) setIsHistoryKept(false);
  const [isProfileKept, setIsProfileKept] = useState(false);
  if (isProfileShown && !isProfileKept) setIsProfileKept(true);
  if (!canSend && isProfileKept) setIsProfileKept(false);
  const isStartShown =
    accountGate === 'ready' &&
    phase === 'ready' &&
    !isHistoryShown &&
    !isProfileShown &&
    !isPermissionsShown;
  // The map's credits, over Start or a recording: closed by ✕, Escape or a tap on the dimmed map.
  // Their own ⓘ opens them; every other screen over the map keeps MapLibre's corner ⓘ.
  const [isCreditsOpen, setIsCreditsOpen] = useState(false);
  // Closed and sliding down: still drawn, the page under it live again.
  const [isCreditsLeaving, setIsCreditsLeaving] = useState(false);
  // The recording screen's ⓘ is there once the screen is, with the figures it waits for.
  const hasCreditsButton =
    isStartShown || (accountGate === 'ready' && isRecordingShown && figures !== null);
  const isCreditsShown = hasCreditsButton && isCreditsOpen;
  const isCreditsDrawn = hasCreditsButton && (isCreditsOpen || isCreditsLeaving);
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
  const isAccountGateShown = accountGate === 'needs-account' || accountGate === 'needs-profile';
  // Every screen drawn over the whole map, and the questions that must be answered first.
  // Unfinished is not one: its card leaves the map and its buttons in sight, and in use.
  const isMapCovered =
    isAccountGateShown ||
    isHistoryShown ||
    isProfileShown ||
    isPermissionsShown ||
    isCreditsShown ||
    isStopShown ||
    phase === 'form' ||
    phase === 'saved';
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
  // when Record again is pressed or the account signs in. The account is unknown until it has
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
      loadSavedScreen(),
    ]).catch((error: unknown) => {
      console.warn('The recording screens could not be fetched ahead of Start.', error);
    });
  }, [phase]);

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

  // Signing out, or leaving Ready, must not leave #profile or #account-settings to reopen Account
  // after the next sign-in.
  useEffect(() => {
    const isUsable = accountGate === 'ready' && (phase === 'loading' || phase === 'ready');
    if (isUsable || accountGate === 'loading') return;
    if (profile.isOpen) profile.close();
    if (settings.isOpen) settings.close();
  }, [phase, accountGate, profile, settings]);

  // History and Account are tabs on Ready; a build with no accounts has History alone. Ready hands
  // focus back to the tab whose screen was open.
  const [openedTab, setOpenedTab] = useState<'history' | 'account' | null>(null);
  const hasAccount = canUpload();
  const handleOpenHistory = () => {
    setOpenedTab('history');
    history.open();
  };
  const handleOpenAccount = () => {
    setOpenedTab('account');
    profile.open();
  };
  // Record, from History, goes to Start wherever History was opened from.
  const openRecordFromHistory = () => history.replaceWith('');

  // The page's one toolbar, over Record, History and Account alike: drawn once and kept while
  // any of the three shows, so it stands still as they slide under it; only its pill moves.
  const toolbarTab: ToolbarTab | null = isHistoryShown
    ? 'history'
    : isProfileShown && !settings.isOpen
      ? 'account'
      : isStartShown
        ? 'record'
        : null;
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
            history.replaceWith('#profile');
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
      // The toolbar's screens that can open now: a move to any other draws nothing to wait for
      // (tab-motion.ts).
      data-screens={[canSend && '#history', hasAccount && '#profile #account-settings']
        .filter(Boolean)
        .join(' ')}
      className="contribute-page relative h-dvh bg-surface-secondary font-sn-pro"
    >
      {/* inert while a screen or a question covers it: no map control can be tabbed to, or
          found by a screen reader, behind it. */}
      <div inert={isMapCovered} className="contents">
        <ContributeMap
          track={track}
          isRecording={phase === 'recording' || phase === 'paused'}
          locator={locator}
          areCreditsShown={!hasCreditsButton}
          pictureFor={phase === 'form' ? (recording.current?.id ?? null) : null}
          onPicture={keepTrailPicture}
          mark={
            isRecordingShown ? (
              <Suspense fallback={null}>
                <FlagStopButton
                  isRecording={phase === 'recording'}
                  canFlag={(recording.current?.marks?.length ?? 0) < MAX_MARKS}
                  onFlag={recording.markPlace}
                />
              </Suspense>
            ) : null
          }
        />
      </div>
      {isAccountGateShown && (
        <Suspense fallback={null}>
          <AccountGate needsProfile={accountGate === 'needs-profile'} />
        </Suspense>
      )}
      {accountGate === 'ready' && (
        // A question on Record, History or Account holds the toolbar (toolbar-hold.tsx).
        <ToolbarHoldProvider>
          {recording.problem && (
            <p
              role="alert"
              className="absolute inset-x-4 top-[calc(env(safe-area-inset-top)+5.5rem)] z-30 bg-surface p-2 text-sm/5 text-content-primary"
            >
              {recording.problem}
            </p>
          )}
          {uploads.check && (phase === 'ready' || phase === 'saved') && (
            <UploadCheck check={uploads.check} />
          )}
          <p role="status" className="sr-only">
            {recording.announcement}
          </p>
          {isPermissionsShown && PermissionsOnboarding && (
            <Suspense fallback={<div className="absolute inset-0 z-40 bg-surface" />}>
              <PermissionsOnboarding onDone={() => setIsPermissionsPending(false)} />
            </Suspense>
          )}
          {/* TODO: show TrackRoutesCard (tutorial/track-routes-card.tsx) over the map here, on Ready
              after the permissions screen, once the tutorial screens it opens are designed. */}
          {isStartShown && (
            // Inert under the credits, as the map is: nothing of Start is reached behind them.
            <div inert={isCreditsShown} className="contents">
              <ReadyScreen
                earlierQuestion={earlier.question}
                onStart={() => {
                  // A ride begun: the next Start opens fresh, focus on its heading, not the tab.
                  setOpenedTab(null);
                  // The button as it stands at the tap, for the morph: read before the
                  // recording begins, which takes it off the screen.
                  const startButton = document.querySelector<HTMLElement>(`[${START_BUTTON_ATTR}]`);
                  recording.start();
                  // After the start, never before it: the morph holds nothing back.
                  if (startButton) morphStartIntoCard(startButton);
                }}
                backFrom={openedTab}
                historyTabRef={historyTabRef}
                accountTabRef={accountTabRef}
                onOpenCredits={openCredits}
                creditsButtonRef={creditsButtonRef}
              />
            </div>
          )}
          {isCreditsDrawn && (
            <Suspense fallback={null}>
              <MapDataSourceView
                key={creditsOpenings}
                onClose={closeCredits}
                onClosed={creditsGone}
              />
            </Suspense>
          )}
          {isProfileKept && (
            <Activity mode={isProfileShown ? 'visible' : 'hidden'}>
              <ErrorBoundary
                key={screenTries}
                fallback={
                  <ScreenUnavailable
                    name="Account"
                    screenHash="#profile"
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
            <Activity mode={isHistoryShown ? 'visible' : 'hidden'}>
              <ErrorBoundary
                key={screenTries}
                fallback={
                  <ScreenUnavailable
                    name="History"
                    screenHash="#history"
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
          {toolbarTab && (
            // Out of reach under the credits, as Start is.
            <ToolbarPlace isOutOfReach={isCreditsShown}>
              <BottomToolbar
                current={toolbarTab}
                onOpenRecord={toolbarOpeners[toolbarTab].record}
                onOpenHistory={toolbarOpeners[toolbarTab].history}
                onOpenAccount={toolbarOpeners[toolbarTab].account}
                onTabPointerDown={warmScreen}
                historyRef={historyTabRef}
                accountRef={accountTabRef}
              />
            </ToolbarPlace>
          )}
          {phase === 'unfinished' && figures && (
            <Suspense fallback={null}>
              <UnfinishedScreen
                figures={figures}
                onResume={recording.resume}
                onStop={recording.stopAtLastFix}
              />
            </Suspense>
          )}
          {isRecordingShown && figures && (
            <Suspense fallback={null}>
              <div inert={isCreditsShown || isStopShown} className="contents">
                <RecordingScreen
                  figures={figures}
                  mode={recording.mode}
                  isPaused={phase === 'paused'}
                  isAwake={recording.isAwake}
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
          {phase === 'form' && figures && (
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
          {phase === 'saved' && (
            <Suspense fallback={null}>
              <SavedScreen
                failedFixWrites={recording.lastSaved?.failedFixWrites ?? 0}
                uploadText={
                  recording.lastSaved
                    ? uploadStatusText(
                        uploads.statusOf(recording.lastSaved),
                        uploads.canRemove(recording.lastSaved),
                      )
                    : ''
                }
                onRecordAgain={recording.recordAgain}
              />
            </Suspense>
          )}
        </ToolbarHoldProvider>
      )}
    </main>
  );
}
