import { SignInCard } from './sign-in-card';
import { useSignIn } from './use-sign-in';

interface SignInProps {
  /** Heading while signing in. */
  title?: string;
  /** A message to open with, such as why a reset link was refused. */
  notice?: string | null;
  /** Closes the card; without it the card is the studio's front door. */
  onDismiss?: () => void;
}

/**
 * Email and password sign-in: the studio's front door, and the card that opens
 * at Done in a test session.
 *
 * There is no sign-up. Only accounts on the editor list may write (migration
 * 0005), and sign-ups are off in the Supabase dashboard.
 */
export function SignIn({ title = 'Sign in to save', notice = null, onDismiss }: SignInProps) {
  const form = useSignIn(notice);

  return (
    <SignInCard
      title={title}
      mode={form.mode}
      email={form.email}
      password={form.password}
      isBusy={form.isBusy}
      isSent={form.isSent}
      error={form.error}
      captcha={form.captcha}
      onEmailChange={form.setEmail}
      onPasswordChange={form.setPassword}
      onModeChange={form.switchMode}
      onSubmit={form.submit}
      // A dialog closes; the front door goes back to sign-in.
      onSentDone={onDismiss ?? form.backToSignIn}
      onDismiss={onDismiss}
    />
  );
}
