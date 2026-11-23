import { useEffect, useRef, useState } from 'react';

import { Button } from '@/design-system/primitives/button';
import { PasswordField } from '@/design-system/primitives/password-field';
import { useFocusHeading } from '@/shared/hooks/use-focus-heading';
import { Turnstile } from '@/shared/ui/turnstile';

import { checkChangePassword, type ChangePasswordFields } from './account-fields';
import { NewPasswordField } from './new-password-field';
import { SaveChangesSheet } from './save-changes-sheet';
import { SettingsHeader } from './settings-header';
import type { Captcha } from './use-captcha';
import { SCREEN_HASH_ATTR } from '../common/data-attributes';
import { useScreenEntry } from '../motion/use-screen-entry';
import { SCREENS } from '../navigation/screen-routes';

interface ChangePasswordScreenProps {
  isBusy: boolean;
  /** One line about the last try, or null. */
  error: string | null;
  /** Para said the old password given is not the account's: said on that field. */
  oldPasswordError: string | null;
  /** The bot check the old password's sign-in needs, as on Sign in. */
  captcha: Captcha;
  onSubmit: (fields: ChangePasswordFields) => void;
  /** The reset by email, for one who does not know the old password. */
  onForgotPassword: () => void;
  onBack: () => void;
}

const FORM_ID = 'change-password-form';

const EMPTY: ChangePasswordFields = { currentPassword: '', password: '', confirmation: '' };

/**
 * Change password (Figma 4540:4399), from Account settings' Password: the old password first, so
 * a phone left unlocked cannot change it, then the new one twice. Save changes and Cancel rise
 * once anything is typed; Cancel goes back to Account settings.
 */
export function ChangePasswordScreen({
  isBusy,
  error,
  oldPasswordError,
  captcha,
  onSubmit,
  onForgotPassword,
  onBack,
}: ChangePasswordScreenProps) {
  const headingRef = useFocusHeading();
  const entryRef = useScreenEntry<HTMLElement>();
  const [fields, setFields] = useState<ChangePasswordFields>(EMPTY);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof ChangePasswordFields, string>>
  >({});
  const onToken = captcha.onToken;
  // The widget goes with the screen; its token must not outlive it.
  useEffect(() => () => onToken(null), [onToken]);
  // Para's word that the old password is wrong lands on its field, focus with it, so a screen
  // reader says it: focus was left on Save changes, where nothing changed.
  const oldPasswordRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (oldPasswordError) oldPasswordRef.current?.querySelector('input')?.focus();
  }, [oldPasswordError]);

  const isTyped =
    fields.currentPassword !== '' || fields.password !== '' || fields.confirmation !== '';
  const handleSubmit = () => {
    const checked = checkChangePassword(fields);
    setFieldErrors(checked.isValid ? {} : checked.errors);
    if (checked.isValid) onSubmit(checked.value);
  };
  const setField = (name: keyof ChangePasswordFields, value: string) =>
    setFields((current) => ({ ...current, [name]: value }));

  return (
    <section
      ref={entryRef}
      aria-labelledby="change-password-heading"
      {...{ [SCREEN_HASH_ATTR]: SCREENS.changePassword.hash }}
      className="tab-screen absolute inset-0 z-30 flex flex-col bg-surface font-sn-pro text-content-primary"
    >
      <SettingsHeader
        title="Change password"
        headingId="change-password-heading"
        headingRef={headingRef}
        isBackDisabled={isBusy}
        onBack={onBack}
      />
      <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 pt-5 pb-48">
        <form
          id={FORM_ID}
          noValidate
          aria-labelledby="change-password-heading"
          onSubmit={(event) => {
            event.preventDefault();
            handleSubmit();
          }}
          className="flex flex-col gap-5"
        >
          <div ref={oldPasswordRef} className="contents">
            <PasswordField
              label="Old password"
              autoComplete="current-password"
              value={fields.currentPassword}
              error={fieldErrors.currentPassword ?? oldPasswordError ?? undefined}
              onChange={(event) => setField('currentPassword', event.target.value)}
            />
          </div>
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
        </form>
        <div className="*:w-full">
          <Button
            variant="plain"
            label="Forgot password?"
            disabled={isBusy}
            onClick={onForgotPassword}
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
      </div>
      {(isTyped || isBusy) && (
        <SaveChangesSheet
          formId={FORM_ID}
          isBusy={isBusy}
          error={error}
          canSave={captcha.isReady}
          onCancel={onBack}
        />
      )}
    </section>
  );
}
