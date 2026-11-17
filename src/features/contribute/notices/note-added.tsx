import { CheckCircleIcon } from '../stop-notes/stop-note-icons';

/**
 * Figma's Note successfully added (4716:9216): the compact info toast, its check in
 * Content/success, after a stop's note is saved from its card.
 */
export const NOTE_ADDED_MESSAGE = {
  id: 'note-added',
  kind: 'info',
  size: 'compact',
  icon: (
    <span className="text-content-success *:size-full">
      <CheckCircleIcon />
    </span>
  ),
  title: 'Note successfully added',
} as const;
