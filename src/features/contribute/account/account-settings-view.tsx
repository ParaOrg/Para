import { messageOf } from './account-message';
import { AccountSettingsScreen } from './account-settings-screen';
import { useAccountQuery } from '../api/use-account-query';
import { useDeleteAccountMutation } from '../api/use-delete-account-mutation';
import { useProfileQuery } from '../api/use-profile-query';
import { useUpdateProfileMutation } from '../api/use-update-profile-mutation';

interface AccountSettingsViewProps {
  /** The password was just changed, on Change password. */
  isPasswordChanged: boolean;
  onOpenChangePassword: () => void;
  onBack: () => void;
}

/**
 * Account settings with its data: the stored name and number, saving them, and deleting the
 * account. Change password is a screen of its own (change-password-view.tsx).
 */
export function AccountSettingsView({
  isPasswordChanged,
  onOpenChangePassword,
  onBack,
}: AccountSettingsViewProps) {
  const account = useAccountQuery();
  const profile = useProfileQuery();
  const update = useUpdateProfileMutation();
  const deletion = useDeleteAccountMutation();

  return (
    <AccountSettingsScreen
      email={account.data?.email ?? ''}
      profile={profile.data ?? null}
      loadError={profile.isError ? messageOf(profile.error) : null}
      isSaving={update.isPending}
      saveError={messageOf(update.error)}
      isPasswordChanged={isPasswordChanged}
      onRetry={() => void profile.refetch()}
      onSave={(fields) => update.mutate(fields)}
      onOpenChangePassword={onOpenChangePassword}
      isDeleting={deletion.isPending}
      deleteError={messageOf(deletion.error)}
      onDeleteAsked={() => deletion.reset()}
      onDeleteAccount={() => deletion.mutate()}
      onBack={onBack}
    />
  );
}
