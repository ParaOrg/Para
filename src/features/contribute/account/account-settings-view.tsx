import { messageOf } from './account-message';
import { AccountSettingsScreen } from './account-settings-screen';
import { useAccountQuery } from '../api/use-account-query';
import { useProfileQuery } from '../api/use-profile-query';
import { useUpdateProfileMutation } from '../api/use-update-profile-mutation';

// Keep Para recording exists in the Android app's build only: the web build never builds the
// native chunk it opens.
const openKeepRecording =
  import.meta.env.MODE === 'apk'
    ? () => {
        import('../native/native-permissions')
          .then((module) => module.openAutostartSettings())
          .catch((error: unknown) => {
            console.warn('The phone’s Autostart settings could not be opened.', error);
          });
      }
    : undefined;

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
  const update = useUpdateProfileMutation();

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
      onOpenDeleteAccount={onOpenDeleteAccount}
      onOpenKeepRecording={openKeepRecording}
      onBack={onBack}
    />
  );
}
