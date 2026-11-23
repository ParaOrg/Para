import { Toast } from './toast';

/** The workshop's one toast: what a save, a publish or a problem says. */
export interface SaveToast {
  text: string;
}

interface SaveToastsProps {
  toast: SaveToast | null;
  onDismiss: () => void;
}

/**
 * The toast the workshop holds: what a save, a publish or an unpublish says, or a problem. It
 * shows while drawing too: a follow refused, a save that failed.
 */
export function SaveToasts({ toast, onDismiss }: SaveToastsProps) {
  if (!toast) return null;
  return <Toast onDismiss={onDismiss}>{toast.text}</Toast>;
}
