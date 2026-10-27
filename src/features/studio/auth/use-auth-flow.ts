import type { Session } from '@supabase/supabase-js';
import { useState } from 'react';

/**
 * The studio's account dialogs, as the workshop opens them: sign-in (asked
 * for at Done, or from the account pill), the password change, and the reset
 * a valid reset link or an invite starts.
 */
export function useAuthFlow(session: Session | null, recovery: { recovering: boolean }) {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const isSignedIn = !!session;

  // Signed in from the dialog Done opened: the dialog hides itself on the
  // session, so its flag is cleared here, during render — left set, it would
  // keep the drawing keys (Ctrl+Z, Enter, F) off for the rest of the visit.
  if (isSignedIn && isSigningIn) setIsSigningIn(false);

  return {
    isSignedIn,
    isSigningIn,
    setIsSigningIn,
    isChangingPassword,
    setIsChangingPassword,
    // Back from a valid reset link or an invite: the link gave us a session,
    // now set the password.
    isResetting: recovery.recovering && isSignedIn,
  };
}
