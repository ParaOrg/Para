import { useId, useState } from 'react';

import { PasswordField } from '@/design-system/primitives/password-field';
import { coarse } from '@/features/routes/map/map-view';
import { Turnstile } from '@/shared/ui/turnstile';

import {
  PASSWORD_MIN_LENGTH,
  PASSWORD_RULE_ERROR,
  PASSWORD_RULE_HINT,
  meetsPasswordRule,
  setPasswordErrorMessage,
} from './password-rule';
import { useCaptcha } from './use-captcha';
import { getSupabase, supabaseConfigError } from '../data/supabase';

/**
 * Change password for a signed-in user. No email involved.
 *
 * Supabase's updateUser only checks the current password server-side when the
 * project has that option on, so it is verified here by signing in with it
 * first. That re-sign-in replaces the session with an equivalent one, which
 * is harmless.
 */
export function ChangePassword({ email, onDone }: { email: string; onDone: () => void }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const hintId = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const captcha = useCaptcha();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!meetsPasswordRule(next)) {
      setError(PASSWORD_RULE_ERROR);
      return;
    }
    if (next !== confirm) {
      setError('The two new passwords do not match.');
      return;
    }
    if (next === current) {
      setError('The new password is the same as the current one.');
      return;
    }
    const supabase = getSupabase();
    if (!supabase) {
      setError(supabaseConfigError);
      return;
    }

    setBusy(true);

    const check = await supabase.auth.signInWithPassword({
      email,
      password: current,
      options: captcha.takeToken(),
    });
    if (check.error) {
      setError(
        check.error.message === 'Invalid login credentials'
          ? 'That is not your current password.'
          : check.error.message,
      );
      setBusy(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: next });
    if (error) {
      setError(setPasswordErrorMessage(error));
      setBusy(false);
      return;
    }
    setSaved(true);
  }

  return (
    <div className="absolute inset-0 z-20 grid place-items-center bg-black/30 p-6">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        {saved ? (
          <>
            <h2 className="text-base font-medium text-neutral-900">Password changed</h2>
            <p className="mt-2 text-sm text-neutral-600">Use the new one next time you sign in.</p>
            <button
              type="button"
              onClick={onDone}
              className="mt-5 w-full rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white"
            >
              Done
            </button>
          </>
        ) : (
          <form onSubmit={submit}>
            <h2 className="text-base font-medium text-neutral-900">Change password</h2>
            <p className="mt-2 text-sm text-neutral-600">Signed in as {email}.</p>

            {/* Present but hidden so password managers attach the new password to the right account. */}
            <input type="email" autoComplete="username" value={email} readOnly hidden />

            <div className="mt-4">
              <PasswordField
                label="Current password"
                required
                // eslint-disable-next-line jsx-a11y/no-autofocus -- this overlay opens for typing, so its first field takes focus; not on touch, where it would open the keyboard unasked
                autoFocus={!coarse}
                autoComplete="current-password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                placeholder="Current password"
              />
            </div>
            <div className="mt-2">
              <PasswordField
                label="New password"
                aria-describedby={hintId}
                required
                minLength={PASSWORD_MIN_LENGTH}
                autoComplete="new-password"
                value={next}
                onChange={(e) => setNext(e.target.value)}
                placeholder="New password"
              />
              <p id={hintId} className="mt-1 text-xs text-neutral-500">
                {PASSWORD_RULE_HINT}
              </p>
            </div>
            <div className="mt-2">
              <PasswordField
                label="Confirm new password"
                required
                minLength={PASSWORD_MIN_LENGTH}
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Confirm new password"
              />
            </div>

            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

            {captcha.siteKey && (
              <div className="mt-4">
                <Turnstile
                  key={captcha.round}
                  siteKey={captcha.siteKey}
                  onToken={captcha.setToken}
                />
              </div>
            )}

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={onDone}
                className="flex-1 rounded-lg px-4 py-2.5 text-sm font-medium text-neutral-600 ring-1 ring-neutral-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy || !captcha.isReady}
                className="flex-1 rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
              >
                {busy ? 'Saving…' : 'Save password'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
