import { createContext } from 'react';

import type { ToastProps } from './toast';

/** What a screen asks the host to say: the toast's own words, icon and action. */
export type ToastMessage = Pick<ToastProps, 'kind' | 'icon' | 'title' | 'body' | 'action'>;

export interface ToastContextValue {
  /** Says it once the toast before it has gone; one shows at a time. */
  showToast: (message: ToastMessage) => void;
}

/** The host's queue, for useToast. Null outside a ToastHost. */
export const ToastContext = createContext<ToastContextValue | null>(null);

/** How long an info toast stays when nobody is pointing at it or in it. */
export const INFO_TOAST_MS = 4000;
