import { messageOf } from './account-message';
import { AccountScreen } from './account-screen';
import type { CommuteStatsState } from './commute-stats';
import { AccountError } from '../api/account-problem';
import type { MyStats } from '../api/fetch-my-stats';
import { useAccountQuery } from '../api/use-account-query';
import { useMyStatsQuery } from '../api/use-my-stats-query';
import { useProfileQuery } from '../api/use-profile-query';
import { useSignOutMutation } from '../api/use-sign-out-mutation';

interface AccountViewProps {
  /** Saved recordings not yet sent, for Logout's warning. */
  unsentCount: number;
  onOpenHistory: () => void;
  onOpenSettings: () => void;
  /** Record, in the toolbar: back to Start. */
  onOpenRecord: () => void;
}

/** Account with its data: the email, the name, the stats, and logging out. */
export function AccountView({
  unsentCount,
  onOpenHistory,
  onOpenSettings,
  onOpenRecord,
}: AccountViewProps) {
  const account = useAccountQuery();
  const profile = useProfileQuery();
  const stats = useMyStatsQuery();
  const signOut = useSignOutMutation();

  return (
    <AccountScreen
      name={profile.data?.name ?? null}
      email={account.data?.email ?? ''}
      stats={statsState(stats.data, stats.error)}
      unsentCount={unsentCount}
      isLoggingOut={signOut.isPending}
      error={messageOf(signOut.error)}
      onOpenHistory={onOpenHistory}
      onOpenSettings={onOpenSettings}
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
