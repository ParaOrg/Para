import type { Session } from '@supabase/supabase-js';

import { AuthDialogs, type useAuthFlow, type usePasswordRecovery } from '@/features/studio';

interface AccountDialogsProps {
  session: Session | null;
  auth: ReturnType<typeof useAuthFlow>;
  recovery: ReturnType<typeof usePasswordRecovery>;
}

/**
 * The account dialog the workshop has open, on every map: the Contributors map
 * asks for a sign-in too. A password change waits while a reset is up.
 */
export function AccountDialogs({ session, auth, recovery }: AccountDialogsProps) {
  const { isSigningIn, isChangingPassword, isResetting, closeAccountDialog } = auth;

  return (
    <AuthDialogs
      signingIn={isSigningIn}
      onSignInDismiss={closeAccountDialog}
      resetting={isResetting}
      isInvite={recovery.isInvite}
      onResetDone={recovery.done}
      changingPasswordFor={
        isChangingPassword && !isResetting ? (session?.user.email ?? null) : null
      }
      onPasswordDone={closeAccountDialog}
    />
  );
}
