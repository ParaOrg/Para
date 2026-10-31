import { messageOf } from './account-message';
import { AccountSettingsScreen } from './account-settings-screen';
import { useCaptcha } from './use-captcha';
import { AccountError } from '../api/account-problem';
import { useAccountQuery } from '../api/use-account-query';
import { useChangePasswordMutation } from '../api/use-change-password-mutation';
import { useDeleteAccountMutation } from '../api/use-delete-account-mutation';
import { useProfileQuery } from '../api/use-profile-query';
import { useUpdateProfileMutation } from '../api/use-update-profile-mutation';

interface AccountSettingsViewProps {
  onBack: () => void;
}

/**
 * Account settings with its data: the stored name and number, saving them, and a new password
 * once the current one is checked, and deleting the account.
 */
export function AccountSettingsView({ onBack }: AccountSettingsViewProps) {
  const account = useAccountQuery();
  const profile = useProfileQuery();
  const update = useUpdateProfileMutation();
  const password = useChangePasswordMutation();
  const captcha = useCaptcha();
  const deletion = useDeleteAccountMutation();
  const isCurrentPasswordWrong =
    password.error instanceof AccountError && password.error.problem === 'wrong-current-password';
  const email = account.data?.email ?? '';

  return (
    <AccountSettingsScreen
      email={email}
      profile={profile.data ?? null}
      loadError={profile.isError ? messageOf(profile.error) : null}
      isSaving={update.isPending}
      saveError={messageOf(update.error)}
      isChangingPassword={password.isPending}
      passwordError={isCurrentPasswordWrong ? null : messageOf(password.error)}
      currentPasswordError={isCurrentPasswordWrong ? messageOf(password.error) : null}
      captcha={captcha}
      passwordChangedAt={password.isSuccess ? password.submittedAt : null}
      onRetry={() => void profile.refetch()}
      onSave={(fields) => update.mutate(fields)}
      onChangePassword={(fields) =>
        password.mutate({
          email,
          currentPassword: fields.currentPassword,
          newPassword: fields.password,
          captchaToken: captcha.takeToken(),
        })
      }
      isDeleting={deletion.isPending}
      deleteError={messageOf(deletion.error)}
      onDeleteAsked={() => deletion.reset()}
      onDeleteAccount={() => deletion.mutate()}
      onBack={onBack}
    />
  );
}
