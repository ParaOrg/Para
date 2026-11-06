import { useQueryClient } from '@tanstack/react-query';

import { messageOf } from './account-message';
import { AccountSettingsScreen } from './account-settings-screen';
import { accountKeys } from '../api/account-keys';
import { ACCOUNT_MESSAGES } from '../api/account-problem';
import { useAccountQuery } from '../api/use-account-query';
import { useProfileQuery } from '../api/use-profile-query';
import { useUpdateProfileMutation } from '../api/use-update-profile-mutation';
import { askAgain, useLoadGiveUp } from '../common/use-load-give-up';

interface AccountSettingsViewProps {
  /** The password was just changed, on Change password. */
  isPasswordChanged: boolean;
  onOpenChangePassword: () => void;
  onOpenDeleteAccount: () => void;
  onBack: () => void;
}

/**
 * Account settings with its data: the stored name and number, and saving them. Change password
 * and Delete account are screens of their own.
 */
export function AccountSettingsView({
  isPasswordChanged,
  onOpenChangePassword,
  onOpenDeleteAccount,
  onBack,
}: AccountSettingsViewProps) {
  const account = useAccountQuery();
  const profile = useProfileQuery();
  const queryClient = useQueryClient();
  // A profile with no answer after a while is said as with no signal, with Try again.
  const giveUp = useLoadGiveUp(!profile.data && !profile.isError && profile.fetchStatus !== 'idle');
  const update = useUpdateProfileMutation();

  return (
    <AccountSettingsScreen
      email={account.data?.email ?? ''}
      profile={profile.data ?? null}
      loadError={giveUp.hasGivenUp ? ACCOUNT_MESSAGES.offline : messageOf(profile.error)}
      isSaving={update.isPending}
      saveError={messageOf(update.error)}
      isPasswordChanged={isPasswordChanged}
      onRetry={() => {
        giveUp.restart();
        void askAgain(queryClient, accountKeys.profile(), profile.refetch);
      }}
      onSave={(fields) => update.mutate(fields)}
      onOpenChangePassword={onOpenChangePassword}
      onOpenDeleteAccount={onOpenDeleteAccount}
      onBack={onBack}
    />
  );
}
