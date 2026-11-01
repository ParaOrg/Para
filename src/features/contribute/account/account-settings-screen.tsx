import { useEffect, useRef } from 'react';

import { Button } from '@/design-system/primitives/button';
import { TextField } from '@/design-system/primitives/text-field';

import type { ProfileFields } from './account-fields';
import { PasswordButtonField } from './password-button-field';
import { ProfileForm } from './profile-form';
import { SettingsHeader } from './settings-header';
import { useFocusHeading } from '../common/use-focus-heading';
import { useScreenEntry } from '../common/use-screen-entry';

interface AccountSettingsScreenProps {
  email: string;
  /** The stored name and number, or null until they have loaded. */
  profile: ProfileFields | null;
  /** One line when the profile could not be loaded. */
  loadError: string | null;
  isSaving: boolean;
  /** One line about the last save, or null. */
  saveError: string | null;
  /** The password was just changed, on Change password: said once, under Password. */
  isPasswordChanged: boolean;
  onRetry: () => void;
  onSave: (fields: ProfileFields) => void;
  onOpenChangePassword: () => void;
  onOpenDeleteAccount: () => void;
  onBack: () => void;
}

/**
 * Account settings (Figma 4540:4821), from Account's General: the name and number to change, with
 * Save changes and Cancel rising once either is changed; the email as it is; Password, which
 * opens Change password; and Delete account, which opens Delete account. Shown only on Ready, so never
 * while a recording runs.
 */
export function AccountSettingsScreen({
  email,
  profile,
  loadError,
  isSaving,
  saveError,
  isPasswordChanged,
  onRetry,
  onSave,
  onOpenChangePassword,
  onOpenDeleteAccount,
  onBack,
}: AccountSettingsScreenProps) {
  const headingRef = useFocusHeading();
  const entryRef = useScreenEntry<HTMLElement>();
  // A save that went through takes its sheet, and the focus on it, away: focus goes to the
  // heading rather than to the page.
  const wasSaving = useRef(isSaving);
  useEffect(() => {
    if (wasSaving.current && !isSaving && !saveError) headingRef.current?.focus();
    wasSaving.current = isSaving;
  }, [isSaving, saveError, headingRef]);

  return (
    <section
      ref={entryRef}
      aria-labelledby="account-settings-heading"
      data-screen-hash="#account-settings"
      className="tab-screen absolute inset-0 z-30 flex flex-col bg-surface font-sn-pro text-content-primary"
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <SettingsHeader
          title="Account settings"
          headingId="account-settings-heading"
          headingRef={headingRef}
          // Back from Change password, the heading takes focus as the screen arrives: it reads the
          // news out, where a status line arriving with its words would go unheard.
          describedBy={isPasswordChanged ? 'password-changed' : undefined}
          isBackDisabled={isSaving}
          onBack={onBack}
        />
        <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 pt-5 pb-48">
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
          {/* Drawn from the first, under the name and number once they are here: nothing in it is
              drawn again, or loses focus, as they arrive. */}
          <TextField label="Email" value={email} disabled readOnly />
          <div className="flex flex-col gap-1.5">
            <PasswordButtonField onOpen={onOpenChangePassword} />
            {isPasswordChanged && (
              <p id="password-changed" className="text-sm/5 text-content-quaternary">
                Your password is changed.
              </p>
            )}
          </div>
          <div className="*:w-full">
            <Button
              variant="plain"
              tone="error"
              label="Delete account"
              onClick={onOpenDeleteAccount}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
