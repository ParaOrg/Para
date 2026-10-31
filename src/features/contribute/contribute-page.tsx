import { lazy, Suspense, useEffect, useState } from 'react';

import { useAccountGate } from './account/use-account-gate';
import { useProfileView } from './account/use-profile-view';
import { canUpload } from './api/contribute-client';
import { useAccountQuery } from './api/use-account-query';
import { useEarlierQuestion } from './consent/use-earlier-question';
import { useHistoryView } from './history/use-history-view';
import { ContributeMap, type ContributeLocatorSlot } from './map/contribute-map';
import { useRecordingTrack } from './map/use-recording-track';
import { isNativeApp } from './native-bridge/native-app';
import { hasSeenPermissionsScreen } from './native-bridge/permissions-screen-flag';
import { MAX_MARKS } from './recorder/recording-marks';
import { useRecording } from './recorder/use-recording';
import { MarkButton } from './screens/mark-button';
import { ReadyScreen, type AccountOpener } from './screens/ready-screen';
import { SaveForm } from './screens/save-form';
import { SavedScreen } from './screens/saved-screen';
import { UploadCheck } from './uploads/upload-check';
import { uploadStatusText } from './uploads/upload-status';
import { useUploads } from './uploads/use-uploads';

// Opened from buttons, so the page's first load does not carry them.
const HistoryView = lazy(() =>
  import('./history/history-view').then((module) => ({ default: module.HistoryView })),
);
const ProfileView = lazy(() =>
  import('./account/profile-view').then((module) => ({ default: module.ProfileView })),
);
// Shown only once a recording is under way or found open, never on the page's first paint. Ready
// fetches both as it opens (below), so Start never waits on the network, nor fails without one.
const loadRecordingScreen = () => import('./screens/recording-screen');
const loadUnfinishedScreen = () => import('./screens/unfinished-screen');
const RecordingScreen = lazy(() =>
  loadRecordingScreen().then((module) => ({ default: module.RecordingScreen })),
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
  const hasConsent = accountGate === 'ready';
  const earlier = useEarlierQuestion(recording.saved, hasConsent, accountId);
  const uploads = useUploads(recording.saved, {
    hasConsent,
    earlier: earlier.choice,
  });
  const track = useRecordingTrack(
    recording.kept,
    recording.current?.modes,
    recording.current?.marks,
  );
  const history = useHistoryView();
  const profile = useProfileView();
  const { phase, figures } = recording;
  // Once per phone, after sign-in: the screen itself closes at once if every permission is granted.
  const [isPermissionsPending, setIsPermissionsPending] = useState(
    () => PermissionsOnboarding !== null && isNativeApp() && !hasSeenPermissionsScreen(),
  );
  const isPermissionsShown = isPermissionsPending && accountGate === 'ready' && phase === 'ready';
  const isHistoryShown = phase === 'ready' && hasConsent && history.isOpen && !isPermissionsShown;
  const isProfileShown =
    phase === 'ready' &&
    accountGate === 'ready' &&
    canUpload() &&
    profile.isOpen &&
    !isPermissionsShown;

  // A stale #history (a reload mid-recording, or before signing in) must not open History later,
  // when Record again is pressed or the account signs in. The account is unknown until it has
  // loaded; closing then would shut History on every reload.
  useEffect(() => {
    if (accountGate === 'loading') return;
    if (history.isOpen && (!hasConsent || (phase !== 'loading' && phase !== 'ready'))) {
      history.close();
    }
  }, [accountGate, phase, hasConsent, history]);

  // On Ready the recording screens are fetched ahead of Start. A failure here is only a missed
  // head start: the lazy screen asks again when it is shown.
  useEffect(() => {
    if (phase !== 'ready') return;
    Promise.all([loadRecordingScreen(), loadUnfinishedScreen()]).catch((error: unknown) => {
      console.warn('The recording screens could not be fetched ahead of Start.', error);
    });
  }, [phase]);

  // Signing out, or leaving Ready, must not leave #profile to reopen Profile after the next sign-in.
  useEffect(() => {
    const isUsable = accountGate === 'ready' && (phase === 'loading' || phase === 'ready');
    if (profile.isOpen && !isUsable && accountGate !== 'loading') profile.close();
  }, [phase, accountGate, profile]);

  // Account is Profile with History inside it; a build with no accounts has History alone. Once it
  // has been opened from Ready, Ready hands focus back to the button that opened it.
  const [lastOpened, setLastOpened] = useState<AccountOpener | null>(null);
  const hasAccount = canUpload();
  const handleOpenAccount = (opener: AccountOpener) => {
    setLastOpened(opener);
    if (hasAccount) profile.open();
    else history.open();
  };

  return (
    <main className="relative h-dvh overflow-hidden bg-surface-secondary font-sn-pro">
      {/* inert while History, Profile or the permissions screen covers it: no map control can be
          tabbed to behind the screen. */}
      <div inert={isHistoryShown || isProfileShown || isPermissionsShown} className="contents">
        <ContributeMap
          track={track}
          isRecording={phase === 'recording' || phase === 'paused'}
          locator={locator}
          mark={
            phase === 'recording' ? (
              <MarkButton
                canMark={(recording.current?.marks?.length ?? 0) < MAX_MARKS}
                onMark={recording.markPlace}
              />
            ) : null
          }
        />
      </div>
      {(accountGate === 'needs-account' || accountGate === 'needs-profile') && (
        <Suspense fallback={null}>
          <AccountGate needsProfile={accountGate === 'needs-profile'} />
        </Suspense>
      )}
      {accountGate === 'ready' && (
        <>
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
          {phase === 'ready' && !isHistoryShown && !isProfileShown && !isPermissionsShown && (
            <ReadyScreen
              earlierQuestion={earlier.question}
              onStart={recording.start}
              onOpenAccount={handleOpenAccount}
              returnFocusTo={lastOpened}
            />
          )}
          {isProfileShown && (
            <Suspense fallback={null}>
              <ProfileView onBack={profile.close} onOpenHistory={history.open} />
            </Suspense>
          )}
          {isHistoryShown && (
            <Suspense fallback={null}>
              <HistoryView
                recordings={recording.saved}
                uploads={uploads}
                // History is inside Account, so its Back returns there, even after a reload.
                onBack={hasAccount ? () => history.closeTo('#profile') : history.close}
                // Record a route leaves History and Account both, for Start.
                onRecord={hasAccount ? () => history.replaceWith('') : history.close}
                onDownload={recording.downloadSaved}
                onDeleteFromPhone={recording.deleteSaved}
              />
            </Suspense>
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
          {(phase === 'recording' || phase === 'paused') && figures && (
            <Suspense fallback={null}>
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
                onDiscard={recording.cancel}
              />
            </Suspense>
          )}
          {phase === 'form' && (
            <SaveForm
              failedFixWrites={recording.current?.failedFixWrites ?? 0}
              onDownload={recording.downloadCurrent}
              onKeepRecording={recording.keepRecording}
              onSave={recording.save}
            />
          )}
          {phase === 'saved' && (
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
              onDownload={recording.downloadLastSaved}
            />
          )}
        </>
      )}
    </main>
  );
}
