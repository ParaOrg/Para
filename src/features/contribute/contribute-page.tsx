import { lazy, Suspense, useEffect, useState } from 'react';

import { useAccountGate } from './account/use-account-gate';
import { useProfileView } from './account/use-profile-view';
import { canUpload } from './api/contribute-client';
import { useAccountQuery } from './api/use-account-query';
import { useConsent } from './consent/use-consent';
import { useEarlierQuestion } from './consent/use-earlier-question';
import { useHistoryView } from './history/use-history-view';
import { ContributeMap, type ContributeLocatorSlot } from './map/contribute-map';
import { useRecordingTrack } from './map/use-recording-track';
import { isNativeApp } from './native-bridge/native-app';
import { hasSeenPermissionsScreen } from './native-bridge/permissions-screen-flag';
import { MAX_MARKS } from './recorder/recording-marks';
import { useRecording } from './recorder/use-recording';
import { MarkButton } from './screens/mark-button';
import { ReadyScreen } from './screens/ready-screen';
import { RecordingScreen } from './screens/recording-screen';
import { SaveForm } from './screens/save-form';
import { SavedScreen } from './screens/saved-screen';
import { UnfinishedScreen } from './screens/unfinished-screen';
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
  const { hasConsent, giveConsent } = useConsent(accountId);
  const earlier = useEarlierQuestion(recording.saved, hasConsent, accountId);
  const accountGate = useAccountGate();
  // Nothing is sent until an account is signed in: recordings made before wait on the phone.
  const uploads = useUploads(recording.saved, {
    hasConsent: hasConsent && accountGate === 'ready',
    earlier: earlier.choice,
  });
  const track = useRecordingTrack(
    recording.kept,
    recording.current?.switches,
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

  // A stale #history (a reload mid-recording, or before consent was given) must not open History
  // later, when Record again or Okay is pressed. Consent is the account's, so it is unknown until
  // the account has loaded; closing then would shut History on every reload.
  useEffect(() => {
    if (accountGate === 'loading') return;
    if (history.isOpen && (!hasConsent || (phase !== 'loading' && phase !== 'ready'))) {
      history.close();
    }
  }, [accountGate, phase, hasConsent, history]);

  // Signing out, or leaving Ready, must not leave #profile to reopen Profile after the next sign-in.
  useEffect(() => {
    const isUsable = accountGate === 'ready' && (phase === 'loading' || phase === 'ready');
    if (profile.isOpen && !isUsable && accountGate !== 'loading') profile.close();
  }, [phase, accountGate, profile]);

  // Once History or Profile has been opened from Ready's button, Ready hands focus back to it.
  const [lastOpened, setLastOpened] = useState<'history' | 'profile' | null>(null);
  const handleOpenHistory = () => {
    setLastOpened('history');
    history.open();
  };
  const handleOpenProfile = () => {
    setLastOpened('profile');
    profile.open();
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
              className="absolute inset-x-4 top-[calc(max(1rem,env(safe-area-inset-top))+3.5rem)] z-30 bg-surface p-2 text-sm/5 text-content-primary"
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
          {phase === 'ready' && !isHistoryShown && !isProfileShown && !isPermissionsShown && (
            <ReadyScreen
              hasConsent={hasConsent}
              onConsent={giveConsent}
              earlierQuestion={earlier.question}
              onStart={recording.start}
              onOpenHistory={handleOpenHistory}
              onOpenProfile={canUpload() ? handleOpenProfile : undefined}
              returnFocusTo={lastOpened}
            />
          )}
          {isProfileShown && (
            <Suspense fallback={null}>
              <ProfileView onBack={profile.close} />
            </Suspense>
          )}
          {isHistoryShown && (
            <Suspense fallback={null}>
              <HistoryView
                recordings={recording.saved}
                uploads={uploads}
                onBack={history.close}
                onDownload={recording.downloadSaved}
                onDeleteFromPhone={recording.deleteSaved}
              />
            </Suspense>
          )}
          {phase === 'unfinished' && figures && (
            <UnfinishedScreen
              figures={figures}
              way={recording.way}
              onResume={recording.resume}
              onStop={recording.stopAtLastFix}
            />
          )}
          {(phase === 'recording' || phase === 'paused') && figures && (
            <RecordingScreen
              figures={figures}
              way={recording.way}
              isPaused={phase === 'paused'}
              isAwake={recording.isAwake}
              shouldFocusStop={recording.focusTarget === 'stop'}
              onStop={recording.stop}
              onResume={recording.resume}
              onWaySwitch={recording.switchWay}
              onSave={recording.openSave}
              onCancel={recording.cancel}
              onLeave={recording.flushFixes}
            />
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
