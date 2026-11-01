import { useContext } from 'react';

import { ToastContext, type ToastContextValue } from './toast-queue';

/** The nearest ToastHost's showToast. */
export function useToast(): ToastContextValue {
  const value = useContext(ToastContext);
  if (!value) throw new Error('useToast needs a ToastHost above it');
  return value;
}
