import { Button } from '@/design-system/primitives/button';

interface CardActionsProps {
  editLabel: string;
  onEdit: () => void;
  onDelete: () => void;
  /** A new route that borrows part of this direction's line. Drawn directions only. */
  onExtend?: () => void;
}

/**
 * Edit and Delete along the bottom of a card, and Extend on a drawn route.
 * The editor passes these into a shared card's `actions` slot; the public map
 * passes nothing.
 *
 * The design system's Button in three voices (the owner, 2026-10-13): Edit
 * Primary, Extend Secondary, Delete Error, each a pill at its word's width as
 * the Button set draws them. Base size is 40 px tall, under the 44 px the
 * hand-made row kept on phones; the owner took the design's height as it is
 * until a phone size is drawn.
 */
export function CardActions({ editLabel, onEdit, onDelete, onExtend }: CardActionsProps) {
  return (
    <>
      <Button variant="primary" label={editLabel} onClick={onEdit} />
      {onExtend && (
        <Button
          variant="secondary"
          label="Extend"
          title="Start a new route from part of this line"
          onClick={onExtend}
        />
      )}
      <Button variant="error" label="Delete" onClick={onDelete} />
    </>
  );
}
