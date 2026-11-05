import { useState } from 'react';

import { meetsPasswordRule, PASSWORD_RULE_ERROR, setPasswordErrorMessage } from './password-rule';
import { ResetPasswordCard, type ResetError } from './reset-password-card';
import { getSupabase, supabaseConfigError } from '../data/supabase';

interface ResetPasswordProps {
  onDone: () => void;
  /** Arrived from an invite: the account's first password, so nothing to skip to. */
  isInvite?: boolean;
}

/**
 * Shown after the user lands from a password-reset link or an invite, once
 * supabase-js has turned that link into a session. Sets the password on that
 * session.
 *
 * An invite's account has no password yet, so its card has no Skip: an
 * editor who closed it could not sign in again without "Forgot password".
 */
export function ResetPassword({ onDone, isInvite = false }: ResetPasswordProps) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
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

  return (
    <ResetPasswordCard
      isInvite={isInvite}
      password={password}
      confirm={confirm}
      isBusy={isBusy}
      error={error}
      onPasswordChange={setPassword}
      onConfirmChange={setConfirm}
      onSubmit={submit}
      onSkip={onDone}
    />
  );
}
