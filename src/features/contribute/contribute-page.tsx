import { useQueryClient } from '@tanstack/react-query';
import { Activity, Suspense, useEffect, useRef, useState, type ComponentProps } from 'react';

import { ErrorBoundary } from '@/shared/ui/error-boundary';

import { useAccountGate } from './account/use-account-gate';
import { canUpload } from './api/contribute-config';
import { isAccountConfirmed, useAccountQuery } from './api/use-account-query';
import { OPENABLE_SCREENS_ATTR } from './common/data-attributes';
import { useLatch } from './common/use-latch';
import { useEarlierQuestion } from './consent/use-earlier-question';
import { FlagStopMark } from './flag-stop-mark';
import {
  AccountGate,
  MapDataSourceView,
  PageToasts,
  PermissionsOnboarding,
  RecordingScreen,
  SaveForm,
  StopNoteSheet,
  StopRecordingScreen,
  TrackRoutesOffer,
  Tutorial,
  UnfinishedScreen,
  UploadCheck,
  lazyScreens,
  loadForgetOtherAccounts,
  makeLazyScreens,
} from './lazy-screens';
import { ContributeMap, type ContributeLocatorSlot } from './map/contribute-map';
import { useRecordingTrack } from './map/use-recording-track';
import { useRideTrail } from './map/use-ride-trail';
import { useStartMorph } from './motion/use-start-morph';
import { isNativeApp } from './native-bridge/native-app';
import { hasSeenPermissionsScreen } from './native-bridge/permissions-screen-flag';
import { SCREENS } from './navigation/screen-routes';
import { useRideView, useScreenView } from './navigation/use-screen-view';
import { pageLayout, pageScreens } from './page-layout';
import { useRecording } from './recorder/use-recording';
import { accountChunk, historyChunk, warmScreen } from './screen-loaders';
import { ReadyScreen } from './screens/ready-screen';
import { ScreenUnavailable } from './screens/screen-unavailable';
import { useStopNote } from './screens/use-stop-note';
import { useStopQuestion } from './screens/use-stop-question';
import { putThumbnail } from './storage/recording-store';
import { BottomToolbar, type ToolbarTab } from './toolbar/bottom-toolbar';
import { ToolbarHoldProvider } from './toolbar/toolbar-hold';
import { ToolbarPlace } from './toolbar/toolbar-slot';
import { useTutorialEntry } from './tutorial/use-tutorial-entry';
import { useUploads } from './uploads/use-uploads';
import { useCreditsSheet } from './use-credits-sheet';
import { usePageNotices } from './use-page-notices';
import { useScreenWarmup } from './use-screen-warmup';

type HistoryViewProps = ComponentProps<typeof lazyScreens.history>;
type AccountViewProps = ComponentProps<typeof lazyScreens.account>;

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
  const ride = useRideView();
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
  // Where Ready puts focus as it opens: back on the tab whose screen was open, on Start tracking
  // after a save, else its heading.
  const [openedTab, setOpenedTab] = useState<'history' | 'account' | 'save' | null>(null);
  const stopNote = useStopNote(recording);
  const notices = usePageNotices({
    recording,
    statusOf: uploads.statusOf,
    accountGate,
    // Record opens with focus on Start tracking, the toast read out politely.
    onRouteRecorded: () => setOpenedTab('save'),
    onAddNote: stopNote.openLatest,
  });
  // History and Account are tabs on Ready; a build with no accounts has History alone.
  const hasAccount = canUpload();
  const screens = pageScreens({
    phase,
    accountGate,
    hasAccount,
    isPermissionsPending,
    isHistoryOpen: history.isOpen,
    isRideDetailOpen: ride.rideId !== null,
    isProfileOpen: profile.isOpen,
    isAccountSettingsOpen: settings.isOpen,
    isChangePasswordOpen: changePassword.isOpen,
    isDeleteAccountOpen: deleteAccount.isOpen,
  });
  const tutorial = useTutorialEntry(screens.isReadyClear);
  const credits = useCreditsSheet();
  const stopQuestion = useStopQuestion(recording);
  const layout = pageLayout(screens, {
    hasFigures: figures !== null,
    isTutorialOpen: tutorial.isOpen,
    tutorialDemo: tutorial.demo,
    isCreditsOpen: credits.isOpen,
    isCreditsLeaving: credits.isLeaving,
    isStopShown: stopQuestion.isShown || stopNote.isShown,
  });
  // The ride whose screen shows: the map draws an overview of its whole trail and frames it, from
  // its fixes when this phone keeps it, else from the line Para keeps of the upload.
  const shownRideId = layout.isRideDetailShown ? ride.rideId : null;
  const shownRideSaved =
    shownRideId === null
      ? null
      : (recording.saved.find((saved) => saved.id === shownRideId) ?? null);
  const shownRideTrail = useRideTrail(shownRideId, shownRideSaved);
  // History and Account stay drawn once opened, hidden while another screen shows (<Activity>):
  // going back is a show, with no fetch, read or layout again. Hidden, their effects and queries
  // rest. Signed out, they go.
  // A ride's screen is History's too: it finds the ride among History's.
  const isHistoryKept = useLatch(layout.isHistoryShown || layout.isRideDetailShown, !canSend);
  const isProfileKept = useLatch(layout.isProfileShown, !canSend);
  // The recording card folded away, by the recording it was folded on: each recording opens with
  // its card out, and the contributor's choice holds through its switches, pauses and the form.
  const [foldedRecordingId, setFoldedRecordingId] = useState<string | null>(null);
  const isCardFolded = foldedRecordingId !== null && foldedRecordingId === recording.current?.id;
  const { fetchAhead: fetchStartMorph, startWithMorph } = useStartMorph();
  useScreenWarmup(phase, fetchStartMorph);

  // A stale #history (a reload mid-recording, or before signing in) must not open History later,
  // when a save returns to Record or the account signs in. The account is unknown until it has
  // loaded; closing then would shut History on every reload.
  useEffect(() => {
    if (accountGate === 'loading') return;
    if (history.isOpen && (!canSend || (phase !== 'loading' && phase !== 'ready'))) {
      history.close();
    }
  }, [accountGate, phase, canSend, history]);

  // A ride's address, as #history's: a stale one must not open the ride later.
  useEffect(() => {
    if (accountGate === 'loading') return;
    if (ride.rideId !== null && (!canSend || (phase !== 'loading' && phase !== 'ready'))) {
      ride.replaceWith(SCREENS.record.hash);
    }
  }, [accountGate, phase, canSend, ride]);

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
      // A ride's sheet says where its top is here (`--dock-y`) at rest, and on the buttons on the map
      // that follow it (`data-dock-follower`) as a finger drags it.
      data-dock-host
      className="contribute-page relative h-dvh bg-surface-secondary font-sn-pro"
    >
      {/* inert while a screen or a question covers it: no map control can be tabbed to, or
          found by a screen reader, behind it. */}
      <div inert={layout.isMapCovered} className="contents">
        <ContributeMap
          track={track}
          ride={shownRideId && shownRideTrail ? { id: shownRideId, trail: shownRideTrail } : null}
          isRecording={layout.isRecordingShown}
          isFrosted={phase === 'paused'}
          locator={locator}
          onMapNote={notices.handleMapNote}
          areCreditsShown={!layout.hasCreditsButton}
          isCovered={layout.isMapCovered}
          isDocked={layout.isRideDetailShown}
          pictureFor={phase === 'form' ? (recording.current?.id ?? null) : null}
          onPicture={keepTrailPicture}
          mark={
            <FlagStopMark
              isRecordingShown={layout.isRecordingShown}
              phase={phase}
              marks={recording.current?.marks}
              demo={tutorial.demo}
              onFlag={notices.handleFlag}
              buttonRef={stopNote.flagButtonRef}
            />
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
          {notices.hasHadToasts && (
            <Suspense fallback={null}>
              <PageToasts {...notices.toasts} />
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
          {tutorial.isOfferShown && !earlier.question && (
            <Suspense fallback={null}>
              <TrackRoutesOffer
                onTutorial={tutorial.open}
                onClose={tutorial.closeOffer}
                helpButtonRef={tutorial.helpButtonRef}
              />
            </Suspense>
          )}
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
                onOpenCredits={credits.open}
                creditsButtonRef={credits.buttonRef}
                onOpenTutorial={tutorial.openOffer}
                helpButtonRef={tutorial.helpButtonRef}
              />
            </div>
          )}
          {tutorial.isShown && (
            <Suspense fallback={null}>
              <Tutorial onDemoChange={tutorial.changeDemo} onClose={tutorial.close} />
            </Suspense>
          )}
          {layout.isCreditsDrawn && (
            <Suspense fallback={null}>
              <MapDataSourceView
                key={credits.openings}
                onClose={credits.close}
                onClosed={credits.handleGone}
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
            <Activity
              mode={layout.isHistoryShown || layout.isRideDetailShown ? 'visible' : 'hidden'}
            >
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
                    rideId={layout.isRideDetailShown ? ride.rideId : null}
                    onOpenRecord={openRecordFromHistory}
                    onOpenRide={ride.open}
                    onCloseRide={() => ride.closeTo(SCREENS.history.hash)}
                    onRideGone={() => ride.closeTo(SCREENS.history.hash)}
                    onDeleteFromPhone={recording.deleteSaved}
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
                  onOpenCredits={credits.open}
                  creditsButtonRef={credits.buttonRef}
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
                  onAskToStop={stopQuestion.ask}
                  discardButtonRef={stopQuestion.discardButtonRef}
                  isCardFolded={isCardFolded}
                  onCardFoldedChange={(isFolded) =>
                    setFoldedRecordingId(isFolded ? (recording.current?.id ?? null) : null)
                  }
                  onOpenCredits={credits.open}
                  creditsButtonRef={credits.buttonRef}
                />
              </div>
            </Suspense>
          )}
          {stopQuestion.isShown && figures && (
            <Suspense fallback={null}>
              <StopRecordingScreen
                figures={figures}
                onKeep={stopQuestion.keep}
                onStop={stopQuestion.stopWithoutSaving}
              />
            </Suspense>
          )}
          {stopNote.isShown && (
            <Suspense fallback={null}>
              <StopNoteSheet note={stopNote.note} onSave={stopNote.save} onClose={stopNote.close} />
            </Suspense>
          )}
          {layout.isFormShown && figures && (
            <Suspense fallback={null}>
              <SaveForm
                figures={figures}
                failedFixWrites={recording.current?.failedFixWrites ?? 0}
                marks={recording.current?.marks ?? []}
                onNoteMark={recording.noteMark}
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
