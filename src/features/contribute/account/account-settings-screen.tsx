import { useRef, useState } from 'react';
import { flushSync } from 'react-dom';

import { Button } from '@/design-system/primitives/button';
import { TextField } from '@/design-system/primitives/text-field';

import type { ProfileFields } from './account-fields';
import { DELETE_ACCOUNT_TEXT } from './delete-account-words';
import { PasswordButtonField } from './password-button-field';
import { ProfileForm } from './profile-form';
import { QuestionSheet } from './question-sheet';
import { SettingsHeader } from './settings-header';
import { useClosedWhenHidden } from '../common/use-closed-when-hidden';
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
  isDeleting: boolean;
  /** One line about a Delete account that failed, or null. */
  deleteError: string | null;
  /** Delete account's question opens: a last try's error is not carried into it. */
  onDeleteAsked: () => void;
  onDeleteAccount: () => void;
  onBack: () => void;
}

/**
 * Account settings (Figma 4540:4821), from Account's General: the name and number to change, with
 * Save changes and Cancel rising once either is changed; the email as it is; Password, which
 * opens Change password; and Delete account, which asks first. Shown only on Ready, so never
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
  isDeleting,
  deleteError,
  onDeleteAsked,
  onDeleteAccount,
  onBack,
}: AccountSettingsScreenProps) {
  const headingRef = useFocusHeading();
  const entryRef = useScreenEntry<HTMLElement>();
  const [isDeleteAsked, setIsDeleteAsked] = useState(false);
  useClosedWhenHidden(setIsDeleteAsked, false);
  const deleteRowRef = useRef<HTMLDivElement>(null);
  // Back on Delete account once the page is live again: it was inert under the question.
  const handleDeleteCancel = () => {
    flushSync(() => setIsDeleteAsked(false));
    deleteRowRef.current?.querySelector('button')?.focus();
  };

  // The email as it is, Password and Delete account: under the name and number once they are
  // here, on their own while they load.
  const rest = (
    <>
      <TextField label="Email" value={email} disabled readOnly />
      <div className="flex flex-col gap-1.5">
        <PasswordButtonField onOpen={onOpenChangePassword} />
        {isPasswordChanged && (
          <p id="password-changed" className="text-sm/5 text-content-quaternary">
            Your password is changed.
          </p>
        )}
      </div>
      <div ref={deleteRowRef} className="*:w-full">
        <Button
          variant="plain"
          tone="error"
          label="Delete account"
          onClick={() => {
            onDeleteAsked();
            setIsDeleteAsked(true);
          }}
        />
      </div>
    </>
  );

  return (
    <section
      ref={entryRef}
      aria-labelledby="account-settings-heading"
      data-screen-hash="#account-settings"
      className="tab-screen absolute inset-0 z-30 flex flex-col bg-surface font-sn-pro text-content-primary"
    >
      <div inert={isDeleteAsked} className="flex min-h-0 flex-1 flex-col">
        <SettingsHeader
          title="Account settings"
          headingId="account-settings-heading"
          headingRef={headingRef}
          // Back from Change password, the heading takes focus as the screen arrives: it reads the
          // news out, where a status line arriving with its words would go unheard.
          describedBy={isPasswordChanged ? 'password-changed' : undefined}
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
          {profile ? (
            <ProfileForm
              // A saved profile arrives as new values: the form starts again from them.
              key={`${profile.name}|${profile.phone}`}
              profile={profile}
              isBusy={isSaving}
              error={saveError}
              onSubmit={onSave}
            >
              {rest}
            </ProfileForm>
          ) : (
            rest
          )}
        </div>
      </div>
      {isDeleteAsked && (
        <QuestionSheet
          title="Delete your account?"
          text={DELETE_ACCOUNT_TEXT}
          confirmLabel="Delete account"
          busyLabel="Deleting…"
          isBusy={isDeleting}
          error={deleteError}
          onConfirm={onDeleteAccount}
          onCancel={handleDeleteCancel}
        />
      )}
    </section>
  );
}
