/**
 * The drawing toolbar's icons, read from the owner's frames (4304:21645,
 * and 4300:20893 for Move): flattened captures with no layers, so these are
 * drawn to match the pictures, 20 across, in currentColor.
 */

/** Undo's arrow, turning back to the left. */
export function UndoIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="M7.5 4.5 4 8l3.5 3.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4.5 8h7.25a4 4 0 0 1 0 8H9" strokeLinecap="round" />
    </svg>
  );
}

/** Redo's arrow: Undo's, mirrored. */
export function RedoIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="M12.5 4.5 16 8l-3.5 3.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15.5 8H8.25a4 4 0 0 0 0 8H11" strokeLinecap="round" />
    </svg>
  );
}

/** Move's arrow, the cursor that selects and drags, as the owner's frame (4300:20893) draws it. */
export function MoveIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path
        d="M4 3.5 16.5 8.25l-5.5 1.75-2 5.5L4 3.5Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Snap's crosshair: the point lands on the street. */
export function SnapIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <circle cx="10" cy="10" r="5" />
      <circle cx="10" cy="10" r="1.25" fill="currentColor" stroke="none" />
      <path d="M10 2v3.5M10 14.5V18M2 10h3.5M14.5 10H18" strokeLinecap="round" />
    </svg>
  );
}

/** Draw's pencil: the stretch goes where the hand puts it. */
export function DrawIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path
        d="M13.25 3.75a1.77 1.77 0 0 1 2.5 2.5L7 15l-3.5 1 1-3.5 8.75-8.75Z"
        strokeLinejoin="round"
      />
      <path d="m11.75 5.25 2.5 2.5" />
    </svg>
  );
}
