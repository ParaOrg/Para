import { useState } from 'react';

import { PasswordField } from '@/design-system/primitives/password-field';
import { coarse } from '@/features/routes/map/map-view';

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
 * An invite's account has no password yet, so its form has no Skip: an
 * editor who closed it could not sign in again without "Forgot password?".
 */
export function ResetPassword({ onDone, isInvite = false }: ResetPasswordProps) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError('The two passwords do not match.');
      return;
    }

    const supabase = getSupabase();
    if (!supabase) {
      setError(supabaseConfigError);
      return;
    }

    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
      setBusy(false);
      return;
    }
    onDone();
  }

  return (
    <div className="absolute inset-0 z-20 grid place-items-center bg-black/30 p-6">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <form onSubmit={submit}>
          <h2 className="text-base font-medium text-neutral-900">
            {isInvite ? 'Set your password' : 'Choose a new password'}
          </h2>
          <p className="mt-2 text-sm text-neutral-600">
            {isInvite
              ? 'Welcome to Para Studio. You are signed in from your invite. Choose a password to sign in with next time.'
              : 'You are signed in from your reset link. Set a password to finish.'}
          </p>

          <div className="mt-4">
            <PasswordField
              label="New password"
              required
              // eslint-disable-next-line jsx-a11y/no-autofocus -- this overlay opens for typing, so its first field takes focus; not on touch, where it would open the keyboard unasked
              autoFocus={!coarse}
              minLength={12}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New password"
            />
          </div>
          <div className="mt-2">
            <PasswordField
              label="Confirm new password"
              required
              minLength={12}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Confirm new password"
            />
          </div>
          <p className="mt-2 text-xs text-neutral-500">
            At least 12 characters, with upper- and lowercase letters, a number and a symbol.
          </p>

          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

          <div className="mt-4 flex gap-2">
            {!isInvite && (
              <button
                type="button"
                onClick={onDone}
                title="Stay signed in with your old password"
                className="flex-1 rounded-lg px-4 py-2.5 text-sm font-medium text-neutral-600 ring-1 ring-neutral-300"
              >
                Skip for now
              </button>
            )}
            <button
              type="submit"
              disabled={busy}
              className="flex-1 rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {busy ? 'Saving…' : 'Save password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
