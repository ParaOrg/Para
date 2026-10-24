import { useState } from 'react';

import { Button } from '@/design-system/primitives/button';
import { PasswordField } from '@/design-system/primitives/password-field';
import { TextField } from '@/design-system/primitives/text-field';

import { checkSignUp, type SignUpFields } from './account-fields';
import { AccountPanel } from './account-panel';
import type { Captcha } from './use-captcha';

interface CreateAccountScreenProps {
  isBusy: boolean;
  /** One line about the last try, or null. */
  error: string | null;
  captcha: Captcha;
  onSubmit: (fields: SignUpFields) => void;
  onSignIn: () => void;
}

/** Make an account: name, email, number and password, and the way back to Sign in. */
export function CreateAccountScreen({
  isBusy,
  error,
  captcha,
  onSubmit,
  onSignIn,
}: CreateAccountScreenProps) {
  const [fields, setFields] = useState<SignUpFields>({
    name: '',
    email: '',
    phone: '',
    password: '',
  });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof SignUpFields, string>>>({});

  const handleChange = (key: keyof SignUpFields) => (value: string) =>
    setFields((current) => ({ ...current, [key]: value }));

  const handleSubmit = () => {
    const checked = checkSignUp(fields);
    setFieldErrors(checked.isValid ? {} : checked.errors);
    if (checked.isValid) onSubmit(checked.value);
  };

  return (
    <AccountPanel
      title="Create account"
      error={error}
      captcha={captcha}
      onSubmit={handleSubmit}
      actions={
        <>
          <Button
            type="submit"
            variant="primary"
            label={isBusy ? 'Creating account…' : 'Create account'}
            disabled={isBusy || !captcha.isReady}
          />
          <Button variant="secondary" label="Sign in" disabled={isBusy} onClick={onSignIn} />
        </>
      }
    >
      <TextField
        label="Name"
        autoComplete="name"
        value={fields.name}
        error={fieldErrors.name}
        onChange={(event) => handleChange('name')(event.target.value)}
      />
      <TextField
        label="Email"
        type="email"
        autoComplete="email"
        value={fields.email}
        error={fieldErrors.email}
        onChange={(event) => handleChange('email')(event.target.value)}
      />
      <TextField
        label="Number"
        type="tel"
        autoComplete="tel"
        value={fields.phone}
        error={fieldErrors.phone}
        onChange={(event) => handleChange('phone')(event.target.value)}
      />
      <PasswordField
        label="Password"
        autoComplete="new-password"
        value={fields.password}
        error={fieldErrors.password}
        onChange={(event) => handleChange('password')(event.target.value)}
      />
    </AccountPanel>
  );
}
