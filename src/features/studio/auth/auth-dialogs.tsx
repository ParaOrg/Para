import { ChangePassword } from './change-password';
import { ResetPassword } from './reset-password';
import { SignIn } from './sign-in';

/**
 * The account's dialogs over the workshop: sign-in, from the pill's Sign in
 * or asked for at Done when signed out; setting a new password, back from a
 * reset link, or a first one, back from an invite; changing it, from the pill.
 * Each shows on its own flag; the workshop keeps them apart (a password
 * change waits while a reset is up).
 */
export function AuthDialogs({
  signingIn,
  onSignInDismiss,
  resetting,
  isInvite = false,
  onResetDone,
  changingPasswordFor,
  onPasswordDone,
}: {
  signingIn: boolean;
  onSignInDismiss: () => void;
  resetting: boolean;
  /** The link being finished was an invite: the account's first password. */
  isInvite?: boolean;
  onResetDone: () => void;
  /** The signed-in email while its password is being changed; null otherwise. */
  changingPasswordFor: string | null;
  onPasswordDone: () => void;
}) {
  return (
    <>
      {signingIn && <SignIn onDismiss={onSignInDismiss} />}

      {resetting && <ResetPassword onDone={onResetDone} isInvite={isInvite} />}

      {changingPasswordFor && (
        <ChangePassword email={changingPasswordFor} onDone={onPasswordDone} />
      )}
    </>
  );
}
