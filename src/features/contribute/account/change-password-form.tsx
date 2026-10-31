import { useState } from 'react';

import { Button } from '@/design-system/primitives/button';
import { PasswordField } from '@/design-system/primitives/password-field';

import { checkNewPassword, type NewPasswordFields } from './account-fields';
import { NewPasswordField } from './new-password-field';

interface ChangePasswordFormProps {
  isBusy: boolean;
  /** One line about the last try, or null. */
  error: string | null;
  /** The new password was taken: said once, and the fields are cleared. */
  isDone: boolean;
  onSubmit: (fields: NewPasswordFields) => void;
}

/**
 * A new password for the account signed in, twice: the reset flow's fields (NewPasswordScreen),
 * on Account settings.
 */
export function ChangePasswordForm({ isBusy, error, isDone, onSubmit }: ChangePasswordFormProps) {
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
    <form
      noValidate
      aria-labelledby="change-password-heading"
      onSubmit={(event) => {
        event.preventDefault();
        handleSubmit();
      }}
      className="flex flex-col gap-4"
    >
      <h2 id="change-password-heading" className="text-xl/7 font-semibold">
        Change password
      </h2>
      <NewPasswordField
        label="New password"
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
      {error && (
        <p role="alert" className="text-sm/5">
          {error}
        </p>
      )}
      {isDone && !error && (
        <p role="status" className="text-sm/5 text-content-quaternary">
          Your password is changed.
        </p>
      )}
      <div>
        <Button
          type="submit"
          variant="primary"
          label={isBusy ? 'Changing…' : 'Change password'}
          disabled={isBusy}
        />
      </div>
    </form>
  );
}
