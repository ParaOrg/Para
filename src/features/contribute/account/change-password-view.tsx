import { useState } from 'react';

import { useBackLayer } from '@/shared/hooks/use-back-layer';

import { messageOf } from './account-message';
import { ChangePasswordScreen } from './change-password-screen';
import { PasswordResetFlow } from './password-reset-flow';
import { useCaptcha } from './use-captcha';
import { AccountError } from '../api/account-problem';
import { useAccountQuery } from '../api/use-account-query';
import { useChangePasswordMutation } from '../api/use-change-password-mutation';

interface ChangePasswordViewProps {
  onBack: () => void;
  /** The password is changed, here or by the reset: back to Account settings, which says so. */
  onDone: () => void;
}

/**
 * Change password with its data: the old password checked by signing in with it, then the new
 * one. Forgot password? runs the reset by email for the account's own address, in its place.
 */
export function ChangePasswordView({ onBack, onDone }: ChangePasswordViewProps) {
  const account = useAccountQuery();
  const password = useChangePasswordMutation();
  const captcha = useCaptcha();
  const [isResetting, setIsResetting] = useState(false);
  const email = account.data?.email ?? '';
  // The phone's Back is the screen's back arrow; from the reset, back to Change password.
  useBackLayer(true, onBack);
  useBackLayer(isResetting, () => setIsResetting(false));

  if (isResetting) {
    return (
      <PasswordResetFlow
        captcha={captcha}
        lockedEmail={email}
        onBack={() => setIsResetting(false)}
        onDone={onDone}
      />
    );
  }

  const isOldPasswordWrong =
    password.error instanceof AccountError && password.error.problem === 'wrong-current-password';
  return (
    <ChangePasswordScreen
      isBusy={password.isPending}
      error={isOldPasswordWrong ? null : messageOf(password.error)}
      oldPasswordError={isOldPasswordWrong ? messageOf(password.error) : null}
      captcha={captcha}
      onSubmit={(fields) =>
        password.mutate(
          {
            email,
            currentPassword: fields.currentPassword,
            newPassword: fields.password,
            captchaToken: captcha.takeToken(),
          },
          { onSuccess: onDone },
        )
      }
      onForgotPassword={() => {
        password.reset();
        setIsResetting(true);
      }}
      onBack={onBack}
    />
  );
}
