import { useIsMutating } from '@tanstack/react-query';
import { Activity, useEffect, useState } from 'react';

import { messageOf } from './account-message';
import { AccountScreen } from './account-screen';
import { AccountSettingsView } from './account-settings-view';
import { ChangePasswordView } from './change-password-view';
import type { CommuteStatsState } from './commute-stats';
import { DeleteAccountView } from './delete-account-view';
import { accountKeys } from '../api/account-keys';
import { AccountError } from '../api/account-problem';
import type { MyStats } from '../api/fetch-my-stats';
import { useAccountQuery } from '../api/use-account-query';
import { useMyStatsQuery } from '../api/use-my-stats-query';
import { useProfileQuery } from '../api/use-profile-query';
import { useSignOutMutation } from '../api/use-sign-out-mutation';
import { SCREENS } from '../navigation/screen-routes';
import { useScreenView } from '../navigation/use-screen-view';
import type { Recording } from '../storage/recording-schema';
import { isNotSent } from '../uploads/upload-rules';
import type { UploadStatus } from '../uploads/upload-state';

interface AccountViewProps {
  /** This phone's saved recordings, so Logout can warn about those not sent yet. */
  recordings: readonly Recording[];
  statusOf: (recording: Recording) => UploadStatus;
}

/**
 * Account with its data: the email, the name, the stats, and logging out. Account settings opens
 * in its place, so the page fetches the two together, on the Account tab's tap.
 */
export function AccountView({ recordings, statusOf }: AccountViewProps) {
  const settings = useScreenView('accountSettings');
  const changePassword = useScreenView('changePassword');
  const deleteAccount = useScreenView('deleteAccount');
  // Said once on Account settings, back from a password changed.
  const [isPasswordChanged, setIsPasswordChanged] = useState(false);
  const account = useAccountQuery();
  const profile = useProfileQuery();
  const stats = useMyStatsQuery();
  const signOut = useSignOutMutation();
  // A delete on its way keeps its screen up whatever the hash does (the phone's Back, the
  // browser's): its answer, a failure above all, is always seen where it was asked for.
  const isDeleting = useIsMutating({ mutationKey: accountKeys.deleteAccount() }) > 0;
  const isDeleteLeft = isDeleting && !deleteAccount.isOpen;
  const putDeleteBack = settings.replaceWith;
  useEffect(() => {
    // Back from it lands on Account settings: the URL is put back as the screen still shows.
    if (isDeleteLeft) putDeleteBack(SCREENS.deleteAccount.hash);
  }, [isDeleteLeft, putDeleteBack]);

  // Inside Account, so their Back returns there, even after a reload. Account settings stays
  // drawn, hidden, under Change password: a change not saved yet, or a save on its way, is still
  // there to come back to.
  if (deleteAccount.isOpen || isDeleting) {
    return <DeleteAccountView onBack={() => deleteAccount.closeTo(SCREENS.accountSettings.hash)} />;
  }
  if (settings.isOpen || changePassword.isOpen) {
    return (
      <>
        <Activity mode={changePassword.isOpen ? 'hidden' : 'visible'}>
          <AccountSettingsView
            isPasswordChanged={isPasswordChanged}
            onOpenChangePassword={() => {
              setIsPasswordChanged(false);
              changePassword.open();
            }}
            onOpenDeleteAccount={deleteAccount.open}
            onBack={() => {
              setIsPasswordChanged(false);
              settings.closeTo(SCREENS.profile.hash);
            }}
          />
        </Activity>
        {changePassword.isOpen && (
          <ChangePasswordView
            onBack={() => changePassword.closeTo(SCREENS.accountSettings.hash)}
            onDone={() => {
              setIsPasswordChanged(true);
              changePassword.closeTo(SCREENS.accountSettings.hash);
            }}
          />
        )}
      </>
    );
  }

  return (
    <AccountScreen
      name={profile.data?.name ?? null}
      email={account.data?.email ?? ''}
      stats={statsState(stats.data, stats.error)}
      unsentCount={recordings.filter((recording) => isNotSent(statusOf(recording))).length}
      isLoggingOut={signOut.isPending}
      error={messageOf(signOut.error)}
      onOpenSettings={settings.open}
      onLogout={() => signOut.mutate()}
      onLogoutAsked={() => signOut.reset()}
    />
  );
}

/**
 * What the Commute Statistics show: the last numbers while they are asked again or when asking
 * fails, placeholders until the first come, a line when none could be had, and nothing at all
 * while the project has no stats to give (get_my_stats not there yet).
 */
function statsState(data: MyStats | undefined, error: Error | null): CommuteStatsState | null {
  if (data) {
    return {
      kind: 'shown',
      numbers: {
        recordings: data.rides,
        seconds: data.movingSeconds + data.standingSeconds,
        distanceM: data.distanceM,
        walkM: data.walkM,
        farePhpTotal: data.farePhpTotal,
        fareRecordings: data.fareRecordings,
        ridesByVehicle: {
          jeep: data.ridesByVehicle.jeep,
          eJeep: data.ridesByVehicle.eJeep,
          uvExpress: data.ridesByVehicle.uvExpress,
          bus: data.ridesByVehicle.bus,
          train: data.ridesByVehicle.train,
          ferry: data.ridesByVehicle.ferry,
        },
      },
    };
  }
  if (!error) return { kind: 'loading' };
  if (error instanceof AccountError && error.problem === 'unavailable') return null;
  return {
    kind: 'failed',
    message:
      error instanceof AccountError && error.problem === 'offline'
        ? 'Your statistics show when you’re online.'
        : 'Your statistics can’t be shown right now.',
  };
}
