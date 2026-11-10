import { useEffect, useRef } from 'react';

import { Button } from '@/design-system/primitives/button';
import { TextField } from '@/design-system/primitives/text-field';
import { useFocusHeading } from '@/shared/hooks/use-focus-heading';
import { cn } from '@/shared/utils/cn';

import type { ProfileFields } from './account-fields';
import { AppSettingRow } from './app-setting-row';
import { PasswordButtonField } from './password-button-field';
import { ProfileForm } from './profile-form';
import { SettingsHeader } from './settings-header';
import { SCREEN_HASH_ATTR } from '../common/data-attributes';
import { Skeleton } from '../common/skeleton';
import { useIsSlowLoad } from '../common/use-is-slow-load';
import { useScreenEntry } from '../motion/use-screen-entry';
import { SCREENS } from '../navigation/screen-routes';

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
  /** Keep Para recording, in the Android app only: the maker's Autostart screen. */
  onOpenKeepRecording?: () => void;
  /** One line when Keep Para recording could not open the phone's settings. */
  keepRecordingError?: string | null;
  /** Share ride diagnostics, in the Android app only: the share sheet with the ride's log. */
  onShareDiagnostics?: () => void;
  /** One line when Share ride diagnostics could not open the share sheet. */
  shareDiagnosticsError?: string | null;
  onBack: () => void;
}

/**
 * Account settings (Figma 4540:4821), from Account's General: the name and number to change, with
 * Save changes and Cancel rising once either is changed; the email as it is; Password, which
 * opens Change password; in the app, Keep Para recording, which opens the maker's Autostart screen,
 * and Share ride diagnostics, which opens Android's share sheet with the ride's own log (ADR 0004:
 * it leaves the phone only where the contributor sends it); and Delete account, which opens
 * Delete account. Shown only on Ready, so never
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
  onOpenKeepRecording,
  keepRecordingError = null,
  onShareDiagnostics,
  shareDiagnosticsError = null,
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
      {...{ [SCREEN_HASH_ATTR]: SCREENS.accountSettings.hash }}
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
          {!profile && !loadError && <ProfileFormSkeleton />}
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
          {onOpenKeepRecording && (
            <AppSettingRow
              label="Keep Para recording"
              onClick={onOpenKeepRecording}
              error={keepRecordingError}
            />
          )}
          {/* No Figma design yet (the owner's Q97): Keep Para recording's look, until one. */}
          {onShareDiagnostics && (
            <AppSettingRow
              label="Share ride diagnostics"
              onClick={onShareDiagnostics}
              error={shareDiagnosticsError}
            />
          )}
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

/** The name and number fields while the profile loads (profile-form.tsx), in their sizes. */
function ProfileFormSkeleton() {
  const isShown = useIsSlowLoad(true);
  return (
    <div aria-busy="true" className="flex flex-col gap-5">
      <p role="status" className="sr-only">
        Loading your account
      </p>
      {FIELD_LABEL_WIDTHS.map((width) => (
        <span key={width} aria-hidden className="flex flex-col gap-1.5">
          <span className="flex h-5 items-center">
            <Skeleton isShown={isShown} className={cn('h-3.5 rounded-full', width)} />
          </span>
          <Skeleton isShown={isShown} className="h-11 rounded-xl" />
        </span>
      ))}
    </div>
  );
}

/** Name, then Phone number: each label's length, roughly. */
const FIELD_LABEL_WIDTHS = ['w-12', 'w-28'];
