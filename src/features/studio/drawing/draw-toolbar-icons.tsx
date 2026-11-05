import './draw-toolbar-icons.css';

/**
 * The drawing toolbar's icons, from the owner's toolbar frame (4614:15351):
 * Figma's own files, painted in currentColor through a mask
 * (draw-toolbar-icons.css), 20 across as the frame draws them.
 */

/** Undo's arrow, turning back to the left. */
export function UndoIcon() {
  return <span aria-hidden className="draw-icon draw-icon-undo size-5" />;
}

/** Redo's arrow: Undo's, mirrored. */
export function RedoIcon() {
  return <span aria-hidden className="draw-icon draw-icon-redo size-5" />;
}

/** Move's arrow, the cursor that selects and drags. */
export function MoveIcon() {
  return <span aria-hidden className="draw-icon draw-icon-move size-5" />;
}

/** Snap's crosshair: the point lands on the street. */
export function SnapIcon() {
  return <span aria-hidden className="draw-icon draw-icon-snap size-5" />;
}

/** Draw's pencil: the stretch goes where the hand puts it. */
export function DrawIcon() {
  return <span aria-hidden className="draw-icon draw-icon-draw size-5" />;
}
