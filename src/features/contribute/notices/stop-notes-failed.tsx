import { AlertCircleIcon } from '@/design-system/primitives/field-icons';

/**
 * Said when a stop's card or Stops notes could not be fetched: the view has closed, the ride goes
 * on, and the toast stays until ✕.
 */
export const STOP_NOTES_FAILED_MESSAGE = {
  id: 'stop-notes-failed',
  kind: 'problem',
  icon: <AlertCircleIcon />,
  title: 'Stop notes could not be opened',
  body: 'Check your connection, then try again.',
} as const;
