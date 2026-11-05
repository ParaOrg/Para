import { useState } from 'react';

import { authErrorMessage } from './auth-error-message';
import { useCaptcha } from './use-captcha';
import { getSupabase, supabaseConfigError } from '../data/supabase';

/** Signing in, or asking for a reset link. */
export type SignInMode = 'signin' | 'forgot';

/**
 * The sign-in card's state and its two Auth requests: email and password, and
 * the reset link. Each request spends one Turnstile token.
 *
 * "Forgot password" is the one path that must send mail: the reset link is
 * how ownership of the account is proved. It leads to /studio/, the only page
 * that can finish it; landing there is handled by usePasswordRecovery and
 * ResetPassword, not here.
 */
export function useSignIn(notice: string | null) {
  const [mode, setMode] = useState<SignInMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Said on opening, such as why a reset link was refused: not about what was typed, so the
  // fields stay as they are. Gone once the person tries again or switches.
  const [openingNotice, setOpeningNotice] = useState<string | null>(notice);
  const captcha = useCaptcha();

  async function submit() {
    setIsBusy(true);
    setError(null);
    setOpeningNotice(null);

    const supabase = getSupabase();
    if (!supabase) {
      setError(supabaseConfigError);
      setIsBusy(false);
      return;
    }

    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
        options: captcha.takeToken(),
      });
      if (error) {
        setError(authErrorMessage(error, 'That email and password do not match an account.'));
      }
      // On success an editor's session replaces this card (useEditorSession).
      // Ready again either way: an account that is not an editor is signed
      // out, and may come back to this card to try another.
      setIsBusy(false);
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      // Only the studio has the form that sets the new password.
      redirectTo: `${window.location.origin}/studio/`,
      ...captcha.takeToken(),
    });
    if (error) {
      setError(authErrorMessage(error, 'That email was not accepted. Check it and try again.'));
      setIsBusy(false);
      return;
    }
    setIsSent(true);
    setIsBusy(false);
  }

  function switchMode(next: SignInMode) {
    setMode(next);
    setError(null);
    setOpeningNotice(null);
    setPassword('');
  }

  /** After "Check your email", back to signing in. */
  function backToSignIn() {
    setIsSent(false);
    switchMode('signin');
  }

  return {
    mode,
    email,
    setEmail,
    password,
    setPassword,
    isBusy,
    isSent,
    error,
    notice: openingNotice,
    captcha,
    submit,
    switchMode,
    backToSignIn,
  };
}
