import { useEffect } from 'react';

import { isTyping } from './toolbar-text';
import type { Drawing } from './use-drawing';

interface UseDrawKeysOptions {
  draw: Drawing;
  /** Whether the keys may act: off while a panel is open, or while ✕ asks. */
  isOn: boolean;
  points: number;
  canDone: boolean;
  isArea: boolean;
  onDone: () => void;
}

/**
 * The drawing's keys, the toolbar's buttons by keyboard, as Figma's:
 * Ctrl/⌘+Z undoes; Ctrl/⌘+Shift+Z or Ctrl+Y redoes; Ctrl/⌘+Enter is Done;
 * V is Move, S is Snap, D is Draw, F flips between Snap and Draw (a route's
 * only); Escape hides
 * the selected point's handles. Plain Enter is no shortcut: it stays a
 * focused button's. A key typed in a field is the field's.
 */
export function useDrawKeys({ draw, isOn, points, canDone, isArea, onDone }: UseDrawKeysOptions) {
  useEffect(() => {
    if (!isOn) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isTyping(event.target) || event.altKey) return;
      const isCommandHeld = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();
      if (isCommandHeld && ((event.shiftKey && key === 'z') || (!event.shiftKey && key === 'y'))) {
        // Redo, by either computer's habit: Ctrl/⌘+Shift+Z, or Windows' Ctrl+Y.
        event.preventDefault();
        if (draw.canRedo) draw.redo();
      } else if (isCommandHeld && !event.shiftKey && key === 'z') {
        // Same as the button: nothing to undo is nothing to do, but the
        // browser's own undo must not run on the map either way.
        event.preventDefault();
        if (points > 0) draw.undo();
      } else if (isCommandHeld && !event.shiftKey && event.key === 'Enter') {
        event.preventDefault();
        if (canDone) onDone();
      } else if (isCommandHeld || event.shiftKey) {
        // The letters below are plain keys only: Ctrl+S or Ctrl+D stay the browser's.
        return;
      } else if (event.key === 'Escape') {
        // Deselects the point whose handles show, as a pen tool's Escape does.
        draw.hideHandles();
      } else if (!isArea && key === 'v') {
        event.preventDefault();
        draw.setMoving(true);
      } else if (!isArea && (key === 's' || key === 'd' || key === 'f')) {
        event.preventDefault();
        draw.setFreehand(key === 'f' ? !draw.freehand : key === 'd');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOn, points, canDone, isArea, draw, onDone]);
}
