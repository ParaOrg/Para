import { useState } from 'react';

import { Button } from '@/design-system/primitives/button';
import { PasswordField } from '@/design-system/primitives/password-field';
import { PhoneField } from '@/design-system/primitives/phone-field';
import { TextField } from '@/design-system/primitives/text-field';

import { checkSignUp, type SignUpFields } from './account-fields';
import { AccountPage } from './account-page';
import type { Captcha } from './use-captcha';

interface CreateAccountScreenProps {
  isBusy: boolean;
  /** One line about the last try, or null. */
  error: string | null;
  captcha: Captcha;
  onSubmit: (fields: SignUpFields) => void;
  /** The back arrow: to Sign in. */
  onBack: () => void;
}

/** Make an account (Figma 4461:646): full name, email, phone number and password. */
export function CreateAccountScreen({
  isBusy,
  error,
  captcha,
  onSubmit,
  onBack,
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
    <AccountPage
      title="Create an account"
      onBack={onBack}
      error={error}
      captcha={captcha}
      onSubmit={handleSubmit}
      actions={
        <Button
          type="submit"
          variant="primary"
          label={isBusy ? 'Creating account…' : 'Continue'}
          disabled={isBusy || !captcha.isReady}
        />
      }
    >
      <TextField
        label="Full name"
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
      <PhoneField
        label="Phone Number"
        autoComplete="tel-national"
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
    </AccountPage>
  );
}
