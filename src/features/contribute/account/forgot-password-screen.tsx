import { useState } from 'react';

import { Button } from '@/design-system/primitives/button';
import { TextField } from '@/design-system/primitives/text-field';

import { checkForgotPassword, type ForgotPasswordFields } from './account-fields';
import { AccountPage } from './account-page';
import type { Captcha } from './use-captcha';

interface ForgotPasswordScreenProps {
  /** The email to start with: what was typed before, on coming back from the code. */
  initialEmail: string;
  isBusy: boolean;
  /** One line about the last try, or null. */
  error: string | null;
  captcha: Captcha;
  onSubmit: (fields: ForgotPasswordFields) => void;
  /** The back arrow: to Sign in. */
  onBack: () => void;
}

/** A password reset's first step (Figma 4461:4689): the email the code goes to. */
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
      error={error}
      captcha={captcha}
      onSubmit={handleSubmit}
      actions={
        <Button
          type="submit"
          variant="primary"
          label={isBusy ? 'Sending…' : 'Verify'}
          disabled={isBusy || !captcha.isReady}
        />
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
