import { Button } from '@/design-system/primitives/button';
import { IconButton } from '@/design-system/primitives/icon-button';
import { ChevronLeftIcon } from '@/shared/ui/route-icons';

import type { ChangePasswordFields, ProfileFields } from './account-fields';
import { ChangePasswordForm } from './change-password-form';
import { ProfileForm } from './profile-form';
import type { Captcha } from './use-captcha';
import { useFocusHeading } from '../common/use-focus-heading';

interface AccountSettingsScreenProps {
  email: string;
  /** The stored name and number, or null until they have loaded. */
  profile: ProfileFields | null;
  /** One line when the profile could not be loaded. */
  loadError: string | null;
  isSaving: boolean;
  /** One line about the last save, or null. */
  saveError: string | null;
  isChangingPassword: boolean;
  /** One line about the last password change, or null. */
  passwordError: string | null;
  /** The current password given was not the account's: said on its field. */
  currentPasswordError: string | null;
  /** The bot check the password change's sign-in needs. */
  captcha: Captcha;
  /** When the last password change went through, or null: each one clears the fields. */
  passwordChangedAt: number | null;
  onRetry: () => void;
  onSave: (fields: ProfileFields) => void;
  onChangePassword: (fields: ChangePasswordFields) => void;
  onBack: () => void;
}

/**
 * Account settings, from Account's General: the name and number to change, the email as it is,
 * and a new password. No Figma of its own yet, so it keeps the profile form's look.
 */
export function AccountSettingsScreen({
  email,
  profile,
  loadError,
  isSaving,
  saveError,
  isChangingPassword,
  passwordError,
  currentPasswordError,
  captcha,
  passwordChangedAt,
  onRetry,
  onSave,
  onChangePassword,
  onBack,
}: AccountSettingsScreenProps) {
  const headingRef = useFocusHeading();

  return (
    <section
      aria-labelledby="account-settings-heading"
      className="absolute inset-0 z-30 flex flex-col bg-surface-secondary font-sn-pro text-content-primary"
    >
      <header className="flex items-center gap-3 pt-[max(1rem,env(safe-area-inset-top))] pr-4 pb-3 pl-[max(1rem,env(safe-area-inset-left))]">
        <IconButton
          tooltip="top"
          size="large"
          label="Back"
          icon={<ChevronLeftIcon />}
          onClick={onBack}
        />
        <h1
          id="account-settings-heading"
          ref={headingRef}
          tabIndex={-1}
          className="text-2xl/8 font-extrabold focus:outline-none"
        >
          Account settings
        </h1>
      </header>
      <div className="flex flex-1 flex-col gap-8 overflow-y-auto px-4 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="flex flex-col gap-4">
          <p className="text-base/6 break-words">{email}</p>
          {!profile && !loadError && (
            <p role="status" className="text-base/6 text-content-quaternary">
              Loading…
            </p>
          )}
          {loadError && (
            <div className="flex flex-col items-start gap-2">
              <p role="alert" className="text-base/6 text-content-quaternary">
                {loadError}
              </p>
              <Button variant="secondary" size="small" label="Try again" onClick={onRetry} />
            </div>
          )}
          {profile && (
            <ProfileForm
              // A saved profile arrives as new values: the form starts again from them.
              key={`${profile.name}|${profile.phone}`}
              profile={profile}
              isBusy={isSaving}
              error={saveError}
              onSubmit={onSave}
            />
          )}
        </div>
        <ChangePasswordForm
          // A changed password clears the fields: the form starts again empty.
          key={passwordChangedAt ?? 'unchanged'}
          isBusy={isChangingPassword}
          error={passwordError}
          currentPasswordError={currentPasswordError}
          captcha={captcha}
          isDone={passwordChangedAt !== null}
          onSubmit={onChangePassword}
        />
      </div>
    </section>
  );
}
