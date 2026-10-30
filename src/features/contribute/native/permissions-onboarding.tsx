import { PermissionsScreen } from './permissions-screen';
import { usePermissionsScreen } from './use-permissions-screen';

interface PermissionsOnboardingProps {
  /** Continue was tapped, or nothing needed asking. */
  onDone: () => void;
}

/**
 * The permissions screen the Android app shows once, after sign-in and before the rest of the
 * page, when a permission recording needs is not granted yet. Loaded in the app's build only
 * (contribute-page.tsx); Start still asks, for a permission turned off later.
 */
export function PermissionsOnboarding({ onDone }: PermissionsOnboardingProps) {
  const screen = usePermissionsScreen(onDone);
  return (
    <PermissionsScreen
      rows={screen.rows}
      canContinue={screen.canContinue}
      problem={screen.problem}
      onSwitch={screen.handleSwitch}
      onContinue={screen.handleContinue}
    />
  );
}
