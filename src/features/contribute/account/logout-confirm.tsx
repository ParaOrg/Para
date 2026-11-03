import { HandQuestion } from './hand-question';

interface LogoutConfirmProps {
  /** Saved recordings not yet sent: they stay on this phone, unsent, after logging out. */
  unsentCount: number;
  isLoggingOut: boolean;
  /** One line about a Logout that failed, or null: said here, where the contributor is. */
  error: string | null;
  onLogout: () => void;
  /** Cancel or Escape; neither while logging out. */
  onCancel: () => void;
}

/**
 * The question before Logout (Figma 4521:3500), Logout above Cancel. With recordings not sent
 * yet, one grey line under the question says they stay behind on this phone (the frame draws
 * none yet: the owner is asked).
 */
export function LogoutConfirm({
  unsentCount,
  isLoggingOut,
  error,
  onLogout,
  onCancel,
}: LogoutConfirmProps) {
  return (
    <HandQuestion
      title="Are you sure you want to logout?"
      text={unsentWarning(unsentCount)}
      error={error}
      confirmLabel="Logout"
      confirmVariant="primary"
      busyLabel="Logging out…"
      cancelLabel="Cancel"
      isBusy={isLoggingOut}
      onConfirm={onLogout}
      onCancel={onCancel}
    />
  );
}

/** What logging out leaves behind: recordings not sent yet stay on this phone, unsent. */
function unsentWarning(unsentCount: number): string | null {
  if (unsentCount <= 0) return null;
  const noun = unsentCount === 1 ? 'recording' : 'recordings';
  return `${unsentCount} ${noun} not sent yet will be left behind on this phone, unsent.`;
}
