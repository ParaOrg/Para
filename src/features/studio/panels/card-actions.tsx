import { Button } from '@/design-system/primitives/button';

interface CardActionsProps {
  editLabel: string;
  onEdit: () => void;
  onDelete: () => void;
  /** A new route that borrows part of this direction's line. Drawn directions only. */
  onExtend?: () => void;
  /** Starts drawing the route's other way, offered only while that way is an undrawn slot. */
  onDrawOtherWay?: () => void;
}

/**
 * Edit and Delete along the bottom of a card, Extend on a drawn route, and
 * "Draw the return trip" while the route's other way is not drawn yet.
 * The editor passes these into a shared card's `actions` slot; the public map
 * passes nothing.
 *
 * The design system's Button in three voices: Edit Primary, Extend Secondary,
 * Delete Error, each a pill at its word's width as the Button set draws them,
 * Base size, 40 px tall, on phones too: touch targets are the size Figma
 * draws them.
 */
export function CardActions({
  editLabel,
  onEdit,
  onDelete,
  onExtend,
  onDrawOtherWay,
}: CardActionsProps) {
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
      {onDrawOtherWay && (
        <Button variant="secondary" label="Draw the return trip" onClick={onDrawOtherWay} />
      )}
      <Button variant="error" label="Delete" onClick={onDelete} />
    </>
  );
}
