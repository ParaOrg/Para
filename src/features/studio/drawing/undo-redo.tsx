import { RedoIcon, UndoIcon } from './draw-toolbar-icons';
import { ICON_TOOL, PILL } from './draw-toolbar-look';
import type { Drawing } from './use-drawing';

interface UndoRedoProps {
  draw: Drawing;
  /** What the drawing places: a route's points, a hotspot's corners. */
  noun: string;
}

/**
 * Undo | Redo, the drawing toolbar's first pill (4304:21645): icons only, so
 * each is named for a screen reader and titled with its key.
 */
export function UndoRedo({ draw, noun }: UndoRedoProps) {
  return (
    <div className={PILL}>
      <button
        type="button"
        onClick={draw.undo}
        disabled={draw.controlPoints.length === 0}
        aria-label="Undo"
        title={`Undo last ${noun} (Ctrl+Z)`}
        className={ICON_TOOL}
      >
        <UndoIcon />
      </button>
      <button
        type="button"
        onClick={draw.redo}
        disabled={!draw.canRedo}
        aria-label="Redo"
        title={`Redo the ${noun} undone (Ctrl+Shift+Z)`}
        className={ICON_TOOL}
      >
        <RedoIcon />
      </button>
    </div>
  );
}
