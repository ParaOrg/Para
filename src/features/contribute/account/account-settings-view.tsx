import { messageOf } from './account-message';
import { AccountSettingsScreen } from './account-settings-screen';
import { useAccountQuery } from '../api/use-account-query';
import { useProfileQuery } from '../api/use-profile-query';
import { useSetNewPasswordMutation } from '../api/use-set-new-password-mutation';
import { useUpdateProfileMutation } from '../api/use-update-profile-mutation';

interface AccountSettingsViewProps {
  onBack: () => void;
}

/** Account settings with its data: the stored name and number, saving them, and a new password. */
export function AccountSettingsView({ onBack }: AccountSettingsViewProps) {
  const account = useAccountQuery();
  const profile = useProfileQuery();
  const update = useUpdateProfileMutation();
  const password = useSetNewPasswordMutation();

  return (
    <AccountSettingsScreen
      email={account.data?.email ?? ''}
      profile={profile.data ?? null}
      loadError={profile.isError ? messageOf(profile.error) : null}
      isSaving={update.isPending}
      saveError={messageOf(update.error)}
      isChangingPassword={password.isPending}
      passwordError={messageOf(password.error)}
      passwordChangedAt={password.isSuccess ? password.submittedAt : null}
      onRetry={() => void profile.refetch()}
      onSave={(fields) => update.mutate(fields)}
      onChangePassword={(fields) => password.mutate(fields)}
      onBack={onBack}
    />
  );
}
