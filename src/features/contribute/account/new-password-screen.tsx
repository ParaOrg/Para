import { useState } from 'react';

import { Button } from '@/design-system/primitives/button';
import { PasswordField } from '@/design-system/primitives/password-field';

import { checkNewPassword, type NewPasswordFields } from './account-fields';
import { AccountPage } from './account-page';

interface NewPasswordScreenProps {
  isBusy: boolean;
  /** One line about the last try, or null. */
  error: string | null;
  onSubmit: (fields: NewPasswordFields) => void;
}

/**
 * A password reset's last step (Figma 4461:5382): the new password, twice. The code has signed
 * the phone in, so there is no going back from here; Figma hides the back arrow.
 */
export function NewPasswordScreen({ isBusy, error, onSubmit }: NewPasswordScreenProps) {
  const [fields, setFields] = useState<NewPasswordFields>({ password: '', confirmation: '' });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof NewPasswordFields, string>>>(
    {},
  );

  const handleSubmit = () => {
    const checked = checkNewPassword(fields);
    setFieldErrors(checked.isValid ? {} : checked.errors);
    if (checked.isValid) onSubmit(checked.value);
  };

  return (
    <AccountPage
      title="Enter new password"
      error={error}
      onSubmit={handleSubmit}
      actions={
        <Button
          type="submit"
          variant="primary"
          label={isBusy ? 'Saving…' : 'Save'}
          disabled={isBusy}
        />
      }
    >
      <PasswordField
        label="New password"
        autoComplete="new-password"
        value={fields.password}
        error={fieldErrors.password}
        onChange={(event) => setFields((current) => ({ ...current, password: event.target.value }))}
      />
      <PasswordField
        label="Confirm password"
        autoComplete="new-password"
        value={fields.confirmation}
        error={fieldErrors.confirmation}
        onChange={(event) =>
          setFields((current) => ({ ...current, confirmation: event.target.value }))
        }
      />
    </AccountPage>
  );
}
