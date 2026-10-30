import { useState } from 'react';

import { Button } from '@/design-system/primitives/button';
import { TextField } from '@/design-system/primitives/text-field';

import { checkForgotPassword, type ForgotPasswordFields } from './account-fields';
import { AccountPage } from './account-page';
import type { Captcha } from './use-captcha';

interface ForgotPasswordScreenProps {
  /** The email to start with: what was typed before, when a new code is asked for. */
  initialEmail: string;
  isBusy: boolean;
  /** One line about the last try, or null. */
  error: string | null;
  captcha: Captcha;
  onSubmit: (fields: ForgotPasswordFields) => void;
  onBack: () => void;
}

/** The first step of a password reset: the email the code goes to. */
export function ForgotPasswordScreen({
  initialEmail,
  isBusy,
  error,
  captcha,
  onSubmit,
  onBack,
}: ForgotPasswordScreenProps) {
  const [email, setEmail] = useState(initialEmail);
  const [emailError, setEmailError] = useState<string | undefined>();

  const handleSubmit = () => {
    const checked = checkForgotPassword({ email });
    setEmailError(checked.isValid ? undefined : checked.errors.email);
    if (checked.isValid) onSubmit(checked.value);
  };

  return (
    <AccountPage
      title="Forgot password"
      onBack={onBack}
      isBackDisabled={isBusy}
      error={error}
      captcha={captcha}
      onSubmit={handleSubmit}
      actions={
        <>
          <Button
            type="submit"
            variant="primary"
            label={isBusy ? 'Sending…' : 'Send code'}
            disabled={isBusy || !captcha.isReady}
          />
          <Button variant="secondary" label="Sign in" disabled={isBusy} onClick={onBack} />
        </>
      }
    >
      <TextField
        label="Email"
        type="email"
        autoComplete="email"
        value={email}
        error={emailError}
        onChange={(event) => setEmail(event.target.value)}
      />
    </AccountPage>
  );
}
