import { useState } from 'react';

import { coarsePointer } from '@/features/routes/map/tap';
import { cn } from '@/shared/utils/cn';

import { DrawCount } from './draw-count';
import { PILL, TOOL } from './draw-toolbar-look';
import { PickBar } from './pick-bar';
import { FollowChip, PointBar, PutBack } from './point-bar';
import { SnapDraw } from './snap-draw';
import { whyCannotSave, withCommand, type ExtendEnds } from './toolbar-text';
import { UndoRedo } from './undo-redo';
import { useDrawKeys } from './use-draw-keys';
import type { Drawing } from './use-drawing';

interface DrawToolbarProps {
  draw: Drawing;
  /**
   * Done, opening the save form. Absent while the route's form stands beside
   * the map, where its Save is Done: then the toolbar has no Done, and
   * Ctrl/⌘+Enter does nothing.
   */
  onDone?: () => void;
  /** Whether the keyboard shortcuts may act. False while a panel is open. */
  keys?: boolean;
  /**
   * While extending: the places the direction being extended runs from and
   * to, and whether its stored line runs the other way round, so the two
   * keep buttons can say which part they keep in the jeep's own order.
   */
  ends?: ExtendEnds | null;
  /**
   * Accepted and unused: the toolbar has no Close the loop any more (a line
   * closes by its first point's connect badge, use-connect-hint.ts). Still
   * taken because the studio passes it; removed with the callers.
   */
  loop?: unknown;
  /** Accepted and unused, as `loop`: nothing on the toolbar hides beside the sidebar now. */
  isBesideSidebar?: boolean;
}

/**
 * Replaces the single idle button while drawing: Undo | Redo in one pill and
 * Move · Snap · Draw | Done in another, after the owner's frame. No Close the
 * loop (a line closes by its first point's badge), and no hint and no count: the owner's toolbar has neither, and what is drawn so
 * far is read out to a screen reader instead (draw-count.tsx). Deliberately
 * small: the map is the document, and this is the only chrome allowed to
 * compete with it.
 *
 * Serves both a route trace and a hotspot outline. The outline needs three
 * corners, has no router to wait for, and has no Snap | Draw switch because
 * every edge is already straight.
 *
 * The buttons answer to keys as well (use-draw-keys.ts) — Ctrl/⌘+Z,
 * Ctrl/⌘+Shift+Z, Ctrl/⌘+Enter, S, D, F — but only while `keys` is true: the
 * studio turns them off the moment a panel opens, so Enter in the save form
 * submits the form and Ctrl+Z in a field is the browser's own undo. Escape
 * only hides the selected point's handles; it never cancels, because cancel
 * discards the whole trace, and that should not be one stray key away.
 */
export function DrawToolbar({ draw, onDone, keys = true, ends = null }: DrawToolbarProps) {
  if (draw.picking) return <PickBar draw={draw} ends={ends} />;
  return <Toolbar draw={draw} onDone={onDone} keys={keys} />;
}

function Toolbar({
  draw,
  onDone,
  keys,
}: {
  draw: Drawing;
  onDone: (() => void) | undefined;
  keys: boolean;
}) {
  const points = draw.controlPoints.length;
  const area = draw.area;
  const noun = area ? 'corner' : 'point';
  // A phone has no right-click and no shift key: it is asked before ✕ throws
  // the drawing away, and gets the point bar (point-bar.tsx) for what the
  // mouse's clicks do.
  const finger = coarsePointer();
  const [confirming, setConfirming] = useState(false);
  const doneReason = whyCannotSave(draw);
  const canDone = doneReason === null;

  // While ✕ asks, Ctrl/⌘+Enter must not save what is about to be thrown away.
  useDrawKeys({
    draw,
    isOn: keys && !confirming,
    points,
    canDone: canDone && onDone !== undefined,
    isArea: !!area,
    onDone: () => onDone?.(),
  });

  return (
    <div
      data-testid="draw-toolbar"
      className="absolute bottom-[calc(1.5rem+env(safe-area-inset-bottom))] left-1/2 z-10 flex w-max max-w-[calc(100%-2rem)] -translate-x-1/2 flex-col items-center gap-2"
    >
      <PointBar draw={draw} />
      <PutBack draw={draw} />
      <FollowChip draw={draw} />

      {/* The count, for a screen reader only: the owner's toolbar shows none. */}
      <DrawCount draw={draw} />

      {confirming ? (
        <div className={PILL}>
          <span className="px-2 text-sm text-content-tertiary">
            Discard this {area ? 'hotspot' : 'route'}?
          </span>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className={cn(TOOL, 'text-content-tertiary')}
          >
            Keep
          </button>
          <button type="button" onClick={draw.cancel} className={cn(TOOL, 'text-content-error')}>
            Discard
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-center gap-2">
          <UndoRedo draw={draw} noun={noun} />

          <div className={PILL}>
            {!area && <SnapDraw draw={draw} />}
            {onDone && (
              <button
                type="button"
                onClick={onDone}
                disabled={!canDone}
                title={
                  doneReason ??
                  `${area ? 'Save this hotspot' : 'Save this route'} (${withCommand('Enter')})`
                }
                className="rounded-full bg-parabrand-800 px-4 py-1.5 text-sm font-medium text-content-inverse disabled:cursor-not-allowed disabled:opacity-40"
              >
                Done
              </button>
            )}
          </div>

          <div className={PILL}>
            <button
              type="button"
              onClick={finger && points > 0 ? () => setConfirming(true) : draw.cancel}
              aria-label={area ? 'Discard this hotspot' : 'Discard this route'}
              title={area ? 'Discard this hotspot' : 'Discard this route'}
              className={cn(TOOL, 'text-content-quaternary')}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
