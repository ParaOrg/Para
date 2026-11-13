import type { ToastMessage } from '@/shared/ui/toast-queue';

import { FlagStopIcon } from '../common/flag-stop-icon';

/** How long Stop flagged stays: a little longer than other news, to reach Add a note. */
export const STOP_FLAGGED_MS = 5000;

/**
 * "Stop flagged", with Add a note for the flag just made. The button goes with the toast, which
 * hides itself; the save form lists every flag with its note, so a note missed here is added
 * there (toast.tsx, on an info toast's action).
 */
export function stopFlaggedMessage(onAddNote: () => void): ToastMessage & { id: string } {
  return {
    id: 'stop-flagged',
    kind: 'info',
    icon: <FlagStopIcon />,
    title: 'Stop flagged',
    action: { label: 'Add a note', onAction: onAddNote },
    durationMs: STOP_FLAGGED_MS,
  };
}
