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
 * The drawing's keys, the toolbar's buttons by keyboard: Ctrl+Z undoes,
 * Ctrl+Shift+Z or Ctrl+Y redoes,
 * Enter is Done, F flips Snap | Draw (a route's only), Escape hides the
 * selected point's handles. A key typed in a field
 * is the field's.
 */
export function useDrawKeys({ draw, isOn, points, canDone, isArea, onDone }: UseDrawKeysOptions) {
  useEffect(() => {
    if (!isOn) return;
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      if (mod && !e.altKey && ((e.shiftKey && key === 'z') || (!e.shiftKey && key === 'y'))) {
        // Redo, by either computer's habit: Ctrl+Shift+Z, or Windows' Ctrl+Y.
        e.preventDefault();
        if (draw.canRedo) draw.redo();
      } else if (mod && !e.shiftKey && !e.altKey && key === 'z') {
        // Same as the button: nothing to undo is nothing to do, but the
        // browser's own undo must not run on the map either way.
        e.preventDefault();
        if (points > 0) draw.undo();
      } else if (!mod && !e.altKey && e.key === 'Enter') {
        // Enter on a focused button or link presses it, as everywhere, so
        // it must not also open the save panel under it.
        const pressable = (e.target as Element | null)?.closest?.(
          'button, a[href], [role="button"], [role^="menuitem"], summary',
        );
        if (!canDone || pressable) return;
        e.preventDefault();
        onDone();
      } else if (!mod && !e.altKey && e.key === 'Escape') {
        // Deselects the point whose handles show, as a pen tool's Escape does.
        draw.hideHandles();
      } else if (!mod && !e.altKey && !isArea && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        draw.setFreehand(!draw.freehand);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOn, points, canDone, isArea, draw, onDone]);
}
