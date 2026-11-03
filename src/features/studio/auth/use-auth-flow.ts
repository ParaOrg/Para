import type { Session } from '@supabase/supabase-js';
import { useState } from 'react';

/**
 * The account dialog an editor opened: sign-in (signed out) or the password
 * change (signed in). One at a time: either one makes the map behind it inert,
 * so the other's buttons can't be reached while it is up.
 */
type OpenedAccountDialog = 'sign-in' | 'change-password';

/**
 * The studio's account dialogs, as the workshop opens them: sign-in (asked
 * for at Done, or from the account pill), the password change, and the reset
 * a valid reset link or an invite starts.
 */
export function useAuthFlow(session: Session | null, recovery: { recovering: boolean }) {
  const [opened, setOpened] = useState<OpenedAccountDialog | null>(null);
  const isSignedIn = !!session;

  // Signed in from the dialog Done opened: the dialog hides itself on the
  // session, so it is closed here, during render — left open, it would keep
  // the drawing keys (Ctrl+Z, Enter, F) off for the rest of the visit.
  if (isSignedIn && opened === 'sign-in') setOpened(null);

  // Back from a valid reset link or an invite: the link gave us a session,
  // now set the password. It comes from outside the page (a link opened in
  // another tab too), so it can arrive over a save or an opened dialog.
  const isResetting = recovery.recovering && isSignedIn;

  return {
    isSignedIn,
    isSigningIn: opened === 'sign-in',
    isChangingPassword: opened === 'change-password',
    isResetting,
    /** Any account dialog is up, so nothing behind it may be reached. */
    isAccountDialogOpen: opened !== null || isResetting,
    openSignIn: () => setOpened('sign-in'),
    openPasswordChange: () => setOpened('change-password'),
    closeAccountDialog: () => setOpened(null),
  };
}
