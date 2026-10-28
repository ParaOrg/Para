import { useState } from 'react';

import { messageOf } from './account-message';
import { ForgotPasswordScreen } from './forgot-password-screen';
import { ResetPasswordScreen } from './reset-password-screen';
import type { Captcha } from './use-captcha';
import { useRequestPasswordCodeMutation } from '../api/use-request-password-code-mutation';
import { useResetPasswordMutation } from '../api/use-reset-password-mutation';

/** Said after every send, so the page never tells whether the email has an account. */
const CODE_SENT_NOTICE = 'If that email has an account, we sent a code';

interface PasswordResetFlowProps {
  captcha: Captcha;
  onBack: () => void;
}

/**
 * Forgot password: the email, then the code and a new password. Signing in is the gate's:
 * a finished reset writes the account where the sign-in does.
 */
export function PasswordResetFlow({ captcha, onBack }: PasswordResetFlowProps) {
  const [email, setEmail] = useState('');
  const [hasSentCode, setHasSentCode] = useState(false);
  const requestCode = useRequestPasswordCodeMutation();
  const reset = useResetPasswordMutation();

  if (!hasSentCode) {
    return (
      <ForgotPasswordScreen
        initialEmail={email}
        isBusy={requestCode.isPending}
        error={messageOf(requestCode.error)}
        captcha={captcha}
        onSubmit={(fields) => {
          setEmail(fields.email);
          requestCode.mutate(
            { email: fields.email, captchaToken: captcha.takeToken() },
            { onSuccess: () => setHasSentCode(true) },
          );
        }}
        onBack={onBack}
      />
    );
  }

  return (
    <ResetPasswordScreen
      notice={CODE_SENT_NOTICE}
      isBusy={reset.isPending}
      error={messageOf(reset.error)}
      onSubmit={(fields) => reset.mutate({ email, ...fields })}
      onSendNewCode={() => {
        reset.reset();
        requestCode.reset();
        setHasSentCode(false);
      }}
      onBack={onBack}
    />
  );
}
