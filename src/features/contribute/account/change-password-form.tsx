import { useEffect, useState } from 'react';

import { Button } from '@/design-system/primitives/button';
import { PasswordField } from '@/design-system/primitives/password-field';
import { Turnstile } from '@/shared/ui/turnstile';

import { checkChangePassword, type ChangePasswordFields } from './account-fields';
import { NewPasswordField } from './new-password-field';
import type { Captcha } from './use-captcha';

interface ChangePasswordFormProps {
  isBusy: boolean;
  /** One line about the last try, or null. */
  error: string | null;
  /** Para said the current password given is not the account's: said on that field. */
  currentPasswordError: string | null;
  /** The new password was taken: said once, and the fields are cleared. */
  isDone: boolean;
  /** The bot check the current password's sign-in needs, as on Sign in. */
  captcha: Captcha;
  onSubmit: (fields: ChangePasswordFields) => void;
}

const EMPTY: ChangePasswordFields = { currentPassword: '', password: '', confirmation: '' };

/**
 * A new password for the account signed in, on Account settings: the current password first, so
 * a phone left unlocked cannot change it, then the reset flow's two new-password fields.
 */
export function ChangePasswordForm({
  isBusy,
  error,
  currentPasswordError,
  isDone,
  captcha,
  onSubmit,
}: ChangePasswordFormProps) {
  const [fields, setFields] = useState<ChangePasswordFields>(EMPTY);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof ChangePasswordFields, string>>
  >({});
  const onToken = captcha.onToken;
  // The widget goes with the form; its token must not outlive it.
  useEffect(() => () => onToken(null), [onToken]);

  const handleSubmit = () => {
    const checked = checkChangePassword(fields);
    setFieldErrors(checked.isValid ? {} : checked.errors);
    if (checked.isValid) onSubmit(checked.value);
  };
  const setField = (name: keyof ChangePasswordFields, value: string) =>
    setFields((current) => ({ ...current, [name]: value }));

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
      <PasswordField
        label="Current password"
        autoComplete="current-password"
        value={fields.currentPassword}
        error={fieldErrors.currentPassword ?? currentPasswordError ?? undefined}
        onChange={(event) => setField('currentPassword', event.target.value)}
      />
      <NewPasswordField
        label="New password"
        value={fields.password}
        error={fieldErrors.password}
        onChange={(event) => setField('password', event.target.value)}
      />
      <PasswordField
        label="Confirm password"
        autoComplete="new-password"
        value={fields.confirmation}
        error={fieldErrors.confirmation}
        onChange={(event) => setField('confirmation', event.target.value)}
      />
      {error && (
        <p role="alert" className="text-sm/5 text-content-error">
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
          disabled={isBusy || !captcha.isReady}
        />
      </div>
      {captcha.siteKey && (
        <Turnstile
          key={captcha.round}
          siteKey={captcha.siteKey}
          appearance="interaction-only"
          onToken={captcha.onToken}
          onNeedsTap={captcha.onNeedsTap}
        />
      )}
    </form>
  );
}
