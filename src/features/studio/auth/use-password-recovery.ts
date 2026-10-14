import { useCallback, useEffect, useState } from 'react';

import { getSupabase } from '../data/supabase';

interface RecoveryUrl {
  recovering: boolean;
  /** The link was an invite: the account has no password yet. */
  isInvite: boolean;
  error: string | null;
}

/**
 * Tracks arrival from a password-reset link, or from an invite.
 *
 *  - `recovering`: the link was valid and a new password should be collected
 *    (the caller should wait for the session before showing the form).
 *  - `isInvite`: the link was an invite (`type=invite`), so the password is
 *    the account's first. supabase-js signs an invite in with SIGNED_IN, not
 *    PASSWORD_RECOVERY, so the URL is the only signal for it.
 *  - `error`: the link was rejected — expired, already used — said in our own
 *    words, picked by Supabase's `error_code`. Never the URL's
 *    `error_description`: anyone can write that into a link to /studio/, so
 *    showing it would let a stranger put their words on the editor's door.
 *    `recovering` is false in that case so the app behaves as plainly signed
 *    out.
 *
 * Two signals, because either alone can be missed:
 *  - the URL carries `type=recovery` (hash for the implicit flow, query for
 *    PKCE) — checked synchronously on mount, before supabase-js has consumed
 *    and cleared it;
 *  - supabase-js emits PASSWORD_RECOVERY once it has turned that URL into a
 *    session — but if it does so before this effect subscribes, the event is
 *    gone, which is why the URL check comes first.
 */
export function usePasswordRecovery(): RecoveryUrl & { done: () => void } {
  const [state, setState] = useState<RecoveryUrl>(() => readRecoveryUrl());

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY')
        setState({ recovering: true, isInvite: false, error: null });
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const done = useCallback(() => {
    setState({ recovering: false, isInvite: false, error: null });
    // Drop the token fragment / code so a refresh does not re-open the form.
    window.history.replaceState(null, '', window.location.pathname);
  }, []);

  return { ...state, done };
}

function readRecoveryUrl(): RecoveryUrl {
  const none = { recovering: false, isInvite: false, error: null };
  if (typeof window === 'undefined') return none;
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const query = new URLSearchParams(window.location.search);
  const params = hash.get('type') || hash.get('error') ? hash : query;

  const type = params.get('type');
  const isInvite = type === 'invite';

  if (type !== 'recovery' && !isInvite && !params.get('error')) return none;
  if (params.get('error')) {
    return { ...none, error: linkError(params.get('error_code')) };
  }
  return { recovering: true, isInvite, error: null };
}

function linkError(code: string | null): string {
  return code === 'otp_expired'
    ? 'the link has expired or was already used. Ask for a new one.'
    : 'the link could not be used. Ask for a new one.';
}
