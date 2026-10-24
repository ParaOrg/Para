import type { ReactNode } from 'react';

import { AppUpdateNotice } from './app-update-notice';
import { useAppUpdate } from './use-app-update';

interface AppUpdateGateProps {
  /** What the update may stand in front of: the Start bar. */
  children: ReactNode;
}

/**
 * Wraps Start. A newer app puts a notice above it; an app below the oldest version still allowed
 * shows the notice in its place. Loaded in the app's build only (ready-screen.tsx), so the web page
 * carries none of it.
 */
export function AppUpdateGate({ children }: AppUpdateGateProps) {
  const { update, downloadUrl } = useAppUpdate();
  if (update === 'current') return children;
  return (
    <>
      <AppUpdateNotice update={update} downloadUrl={downloadUrl} />
      {update === 'available' && children}
    </>
  );
}
