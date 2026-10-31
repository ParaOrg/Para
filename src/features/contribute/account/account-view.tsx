import { messageOf } from './account-message';
import { AccountScreen } from './account-screen';
import { AccountSettingsView } from './account-settings-view';
import type { CommuteStatsState } from './commute-stats';
import { useAccountSettingsView } from './use-account-settings-view';
import { AccountError } from '../api/account-problem';
import type { MyStats } from '../api/fetch-my-stats';
import { useAccountQuery } from '../api/use-account-query';
import { useMyStatsQuery } from '../api/use-my-stats-query';
import { useProfileQuery } from '../api/use-profile-query';
import { useSignOutMutation } from '../api/use-sign-out-mutation';
import type { Recording } from '../storage/recording-schema';
import { isNotSent } from '../uploads/upload-rules';
import type { UploadStatus } from '../uploads/upload-state';

interface AccountViewProps {
  /** This phone's saved recordings, so Logout can warn about those not sent yet. */
  recordings: readonly Recording[];
  statusOf: (recording: Recording) => UploadStatus;
  onOpenHistory: () => void;
  /** Record, in the toolbar: back to Start. */
  onOpenRecord: () => void;
}

/**
 * Account with its data: the email, the name, the stats, and logging out. Account settings opens
 * in its place, so the page fetches the two together, on the Account tab's tap.
 */
export function AccountView({
  recordings,
  statusOf,
  onOpenHistory,
  onOpenRecord,
}: AccountViewProps) {
  const settings = useAccountSettingsView();
  const account = useAccountQuery();
  const profile = useProfileQuery();
  const stats = useMyStatsQuery();
  const signOut = useSignOutMutation();

  // Inside Account, so its Back returns there, even after a reload.
  if (settings.isOpen) return <AccountSettingsView onBack={() => settings.closeTo('#profile')} />;

  return (
    <AccountScreen
      name={profile.data?.name ?? null}
      email={account.data?.email ?? ''}
      stats={statsState(stats.data, stats.error)}
      unsentCount={recordings.filter((recording) => isNotSent(statusOf(recording))).length}
      isLoggingOut={signOut.isPending}
      error={messageOf(signOut.error)}
      onOpenHistory={onOpenHistory}
      onOpenSettings={settings.open}
      onLogout={() => signOut.mutate()}
      onOpenRecord={onOpenRecord}
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
