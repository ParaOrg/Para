import { Button } from '@/design-system/primitives/button';

import { AuthCard } from './auth-card';

interface CheckEmailCardProps {
  /** The address the reset link went to. */
  email: string;
  onDone: () => void;
  /** What Escape does; without it, Escape leaves the card open. */
  onDismiss?: () => void;
}

/** After Forgot password: the reset link is on its way, in the sign-in's card. */
export function CheckEmailCard({ email, onDone, onDismiss }: CheckEmailCardProps) {
  return (
    <AuthCard
      title="Check your email"
      subtitle={`If an account exists for ${email}, a reset link is on its way. Open it on this device to choose a new password.`}
      onDismiss={onDismiss}
      onSubmit={onDone}
      actions={<Button type="submit" variant="primary" label="Done" />}
    />
  );
}
