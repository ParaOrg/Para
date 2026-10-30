import { useState } from 'react';

import { Button } from '@/design-system/primitives/button';
import { PasswordField } from '@/design-system/primitives/password-field';
import { TextField } from '@/design-system/primitives/text-field';

import { checkSignIn, type SignInFields } from './account-fields';
import { AccountPage } from './account-page';
import paraLogo from './para-logo.svg';
import type { Captcha } from './use-captcha';

interface SignInScreenProps {
  isBusy: boolean;
  /** One line about the last try, or null. */
  error: string | null;
  captcha: Captcha;
  onSubmit: (fields: SignInFields) => void;
  onCreateAccount: () => void;
  onForgotPassword: () => void;
}

/**
 * The contributor page for a phone with no account (Figma 4451:7904): email and password, and the
 * ways to Create an account and to Forgot password.
 */
export function SignInScreen({
  isBusy,
  error,
  captcha,
  onSubmit,
  onCreateAccount,
  onForgotPassword,
}: SignInScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof SignInFields, string>>>({});

  const handleSubmit = () => {
    const checked = checkSignIn({ email, password });
    setFieldErrors(checked.isValid ? {} : checked.errors);
    if (checked.isValid) onSubmit(checked.value);
  };

  return (
    <AccountPage
      title="Welcome Contributor"
      subtitle="Log in with your email and password"
      picture={<img src={paraLogo} alt="Para" className="mb-6 h-16 w-auto" />}
      placement="centre"
      error={error}
      captcha={captcha}
      onSubmit={handleSubmit}
      actions={
        <>
          <Button
            type="submit"
            variant="primary"
            label={isBusy ? 'Signing in…' : 'Sign in'}
            disabled={isBusy || !captcha.isReady}
          />
          <Button
            variant="secondary"
            label="Create an account"
            disabled={isBusy}
            onClick={onCreateAccount}
          />
          <Button
            variant="plain"
            label="Forgot password"
            disabled={isBusy}
            onClick={onForgotPassword}
          />
        </>
      }
    >
      <TextField
        label="Email"
        type="email"
        autoComplete="email"
        value={email}
        error={fieldErrors.email}
        onChange={(event) => setEmail(event.target.value)}
      />
      <PasswordField
        label="Password"
        autoComplete="current-password"
        value={password}
        error={fieldErrors.password}
        onChange={(event) => setPassword(event.target.value)}
      />
    </AccountPage>
  );
}
