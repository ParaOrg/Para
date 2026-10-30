import { useState } from 'react';

import { Button } from '@/design-system/primitives/button';
import { PasswordField } from '@/design-system/primitives/password-field';
import { TextField } from '@/design-system/primitives/text-field';

import { checkResetPassword, type ResetPasswordFields } from './account-fields';
import { AccountPage } from './account-page';

interface ResetPasswordScreenProps {
  /** What just happened, said the same whether or not the email has an account. */
  notice: string;
  isBusy: boolean;
  /** One line about the last try, or null. */
  error: string | null;
  onSubmit: (fields: ResetPasswordFields) => void;
  onSendNewCode: () => void;
  onBack: () => void;
}

/** The second step of a password reset: the emailed code and the new password. */
export function ResetPasswordScreen({
  notice,
  isBusy,
  error,
  onSubmit,
  onSendNewCode,
  onBack,
}: ResetPasswordScreenProps) {
  const [fields, setFields] = useState<ResetPasswordFields>({ code: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof ResetPasswordFields, string>>
  >({});

  const handleSubmit = () => {
    const checked = checkResetPassword(fields);
    setFieldErrors(checked.isValid ? {} : checked.errors);
    if (checked.isValid) onSubmit(checked.value);
  };

  return (
    <AccountPage
      title="Reset password"
      onBack={onBack}
      notice={notice}
      error={error}
      onSubmit={handleSubmit}
      actions={
        <>
          <Button
            type="submit"
            variant="primary"
            label={isBusy ? 'Resetting…' : 'Reset password'}
            disabled={isBusy}
          />
          <Button
            variant="secondary"
            label="Send a new code"
            disabled={isBusy}
            onClick={onSendNewCode}
          />
          <Button variant="secondary" label="Sign in" disabled={isBusy} onClick={onBack} />
        </>
      }
    >
      <TextField
        label="Code"
        autoComplete="one-time-code"
        inputMode="numeric"
        maxLength={12}
        value={fields.code}
        error={fieldErrors.code}
        onChange={(event) => setFields((current) => ({ ...current, code: event.target.value }))}
      />
      <PasswordField
        label="New password"
        autoComplete="new-password"
        value={fields.password}
        error={fieldErrors.password}
        onChange={(event) => setFields((current) => ({ ...current, password: event.target.value }))}
      />
    </AccountPage>
  );
}
