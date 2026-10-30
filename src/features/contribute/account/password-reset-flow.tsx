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

/** Said after a Resend, the same whether or not the email has an account. */
const CODE_RESENT_NOTICE = 'We sent a new code';

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
 * stays on the last step until then.
 */
export function PasswordResetFlow({ captcha, onBack }: PasswordResetFlowProps) {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [hasResent, setHasResent] = useState(false);
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
        notice={hasResent ? CODE_RESENT_NOTICE : undefined}
        isBusy={verifyCode.isPending}
        isResending={requestCode.isPending}
        error={messageOf(verifyCode.error ?? requestCode.error)}
        captcha={captcha}
        onSubmit={({ code }) =>
          verifyCode.mutate(
            { email, code },
            {
              onSuccess: (account) => {
                setVerifiedAccount(account);
                setStep('new-password');
              },
            },
          )
        }
        onResend={() => {
          verifyCode.reset();
          requestCode.reset();
          setHasResent(false);
          sendCode(email, () => setHasResent(true));
        }}
        onBack={() => {
          verifyCode.reset();
          requestCode.reset();
          setHasResent(false);
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
