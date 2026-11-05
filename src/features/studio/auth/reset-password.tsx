import { useId, useState } from 'react';

import { Button } from '@/design-system/primitives/button';
import { PasswordField } from '@/design-system/primitives/password-field';
import { coarse } from '@/features/routes/map/map-view';

import { AuthCard } from './auth-card';
import {
  PASSWORD_MIN_LENGTH,
  PASSWORD_RULE_ERROR,
  PASSWORD_RULE_HINT,
  meetsPasswordRule,
  setPasswordErrorMessage,
} from './password-rule';
import { getSupabase, supabaseConfigError } from '../data/supabase';

interface ResetPasswordProps {
  onDone: () => void;
  /** Arrived from an invite: the account's first password, so nothing to skip to. */
  isInvite?: boolean;
}

/** Which field a message belongs under: the rule is the new password's, the rest the pair's. */
interface ResetError {
  field: 'password' | 'confirm';
  message: string;
}

/**
 * Shown after the user lands from a password-reset link or an invite, once
 * supabase-js has turned that link into a session. Sets the password on that
 * session, in the sign-in's card (Figma 4618:10477).
 *
 * An invite's account has no password yet, so its card has no Skip: an
 * editor who closed it could not sign in again without "Forgot password".
 */
export function ResetPassword({ onDone, isInvite = false }: ResetPasswordProps) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const hintId = useId();
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<ResetError | null>(null);

  async function submit() {
    setError(null);

    if (!meetsPasswordRule(password)) {
      setError({ field: 'password', message: PASSWORD_RULE_ERROR });
      return;
    }
    if (password !== confirm) {
      setError({ field: 'confirm', message: 'The two passwords do not match.' });
      return;
    }

    const supabase = getSupabase();
    if (!supabase) {
      setError(supabaseConfigError ? { field: 'confirm', message: supabaseConfigError } : null);
      return;
    }

    setIsBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError({ field: 'confirm', message: setPasswordErrorMessage(error) });
      setIsBusy(false);
      return;
    }
    onDone();
  }

  const errorUnder = (field: ResetError['field']) =>
    error?.field === field ? error.message : undefined;

  return (
    <AuthCard
      title={isInvite ? 'Set your password' : 'Choose a new password'}
      subtitle={
        isInvite
          ? 'Welcome to Para Studio. You are signed in from your invite. Choose a password to sign in with next time.'
          : 'You are signed in from your reset link. Set a password to finish.'
      }
      fields={
        <>
          <div className="flex flex-col gap-1.5">
            <PasswordField
              label="New password"
              aria-describedby={hintId}
              required
              // eslint-disable-next-line jsx-a11y/no-autofocus -- this overlay opens for typing, so its first field takes focus; not on touch, where it would open the keyboard unasked
              autoFocus={!coarse}
              minLength={PASSWORD_MIN_LENGTH}
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              error={errorUnder('password')}
            />
            <p id={hintId} className="font-sn-pro text-sm/5 text-content-tertiary">
              {PASSWORD_RULE_HINT}
            </p>
          </div>
          <PasswordField
            label="Confirm new password"
            required
            minLength={PASSWORD_MIN_LENGTH}
            autoComplete="new-password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            error={errorUnder('confirm')}
          />
        </>
      }
      onSubmit={submit}
      actions={
        <>
          <Button
            type="submit"
            variant="primary"
            label={isBusy ? 'Saving…' : 'Save password'}
            disabled={isBusy}
          />
          {!isInvite && (
            <Button
              variant="secondary"
              label="Skip for now"
              title="Stay signed in with your old password"
              onClick={onDone}
            />
          )}
        </>
      }
    />
  );
}
