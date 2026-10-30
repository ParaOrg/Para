import { useState } from 'react';

import { messageOf } from './account-message';
import { ForgotPasswordScreen } from './forgot-password-screen';
import { NewPasswordScreen } from './new-password-screen';
import type { Captcha } from './use-captcha';
import { VerifyCodeScreen } from './verify-code-screen';
import type { Account } from '../api/account';
import { useRequestPasswordCodeMutation } from '../api/use-request-password-code-mutation';
import { useSessionWriter } from '../api/use-session-writer';
import { useSetNewPasswordMutation } from '../api/use-set-new-password-mutation';
import { useVerifyPasswordCodeMutation } from '../api/use-verify-password-code-mutation';

type Step = 'email' | 'code' | 'new-password';

interface PasswordResetFlowProps {
  captcha: Captcha;
  /** Back from the email step: to Sign in. */
  onBack: () => void;
}

/**
 * Forgot password in three steps: the email, the code, the new password. The code step follows
 * every send, so the page never tells whether the email has an account. A right code signs the
 * phone in, but the page learns of the account only once the new password is saved, so the gate
 * stays on the last step until then. That holds while the page is open: closed or reloaded on the
 * last step, the phone opens signed in with the old password, which the owner accepted (the code
 * already proved the email is theirs).
 */
export function PasswordResetFlow({ captcha, onBack }: PasswordResetFlowProps) {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  // The account the code signed in to, written to the session when the new password is saved.
  const [verifiedAccount, setVerifiedAccount] = useState<Account | null>(null);
  const requestCode = useRequestPasswordCodeMutation();
  const verifyCode = useVerifyPasswordCodeMutation();
  const setNewPassword = useSetNewPasswordMutation();
  const writeSession = useSessionWriter();

  const sendCode = (to: string, onSent: () => void) =>
    requestCode.mutate({ email: to, captchaToken: captcha.takeToken() }, { onSuccess: onSent });

  if (step === 'new-password' && verifiedAccount) {
    return (
      <NewPasswordScreen
        isBusy={setNewPassword.isPending}
        error={messageOf(setNewPassword.error)}
        onSubmit={({ password }) =>
          setNewPassword.mutate({ password }, { onSuccess: () => writeSession(verifiedAccount) })
        }
      />
    );
  }

  if (step === 'code') {
    return (
      <VerifyCodeScreen
        email={email}
        isBusy={verifyCode.isPending}
        isResending={requestCode.isPending}
        error={messageOf(verifyCode.error ?? requestCode.error)}
        captcha={captcha}
        onSubmit={({ code }) => {
          requestCode.reset();
          verifyCode.mutate(
            { email, code },
            {
              onSuccess: (account) => {
                setVerifiedAccount(account);
                setStep('new-password');
              },
            },
          );
        }}
        onResend={() => {
          verifyCode.reset();
          requestCode.reset();
          sendCode(email, () => undefined);
        }}
        onBack={() => {
          verifyCode.reset();
          requestCode.reset();
          setStep('email');
        }}
      />
    );
  }

  return (
    <ForgotPasswordScreen
      initialEmail={email}
      isBusy={requestCode.isPending}
      error={messageOf(requestCode.error)}
      captcha={captcha}
      onSubmit={(fields) => {
        setEmail(fields.email);
        sendCode(fields.email, () => setStep('code'));
      }}
      onBack={onBack}
    />
  );
}
