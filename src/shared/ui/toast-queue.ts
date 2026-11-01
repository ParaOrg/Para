import { createContext } from 'react';

import type { ToastContent } from './toast';

/**
 * What a screen asks the host to say. Asked again while it shows or waits, it is said once: `id`
 * names it, by default its kind and title.
 */
export type ToastMessage = ToastContent & { id?: string };

export interface ToastContextValue {
  /**
   * Says it once the toast before it has gone; one shows at a time. The same toast asked again is
   * not queued twice: showing, it is refreshed in place (an info's clock starts again).
   */
  showToast: (message: ToastMessage) => void;
  /**
   * Takes back the toast with this id (its `id`, or its kind and title): showing, it leaves as ✕
   * makes it, held or not; waiting, it leaves the queue. An id the host does not have does nothing.
   */
  hideToast: (id: string) => void;
}

/** The host's queue, for useToast. Null outside a ToastHost. */
export const ToastContext = createContext<ToastContextValue | null>(null);

/** How long an info toast stays when nobody is pointing at it or in it. */
export const INFO_TOAST_MS = 4000;
