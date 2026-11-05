import { useState } from 'react';

import { coarsePointer } from '@/features/routes/map/tap';
import { cn } from '@/shared/utils/cn';

import { CloseLoop } from './close-loop';
import { DrawCount } from './draw-count';
import { PILL, TOOL } from './draw-toolbar-look';
import { PickBar } from './pick-bar';
import { FollowChip, PointBar, PutBack } from './point-bar';
import { SnapDraw } from './snap-draw';
import {
  drawHint,
  uTurnWarning,
  whyCannotSave,
  withCommand,
  type ExtendEnds,
} from './toolbar-text';
import { UndoRedo } from './undo-redo';
import { useDrawKeys } from './use-draw-keys';
import type { Drawing } from './use-drawing';
import type { LoopPlan } from './use-loop-closing';

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
  /** While drawing a route's return trip: where the loop closes (use-loop-closing.ts). */
  loop?: LoopPlan | null;
  /**
   * The route's sidebar stands beside the map and shows the count, the hint
   * and Close the loop itself: the toolbar is then Undo/Redo | Move · Snap ·
   * Draw and ✕, with Done only when `onDone` is given (beside the route's
   * form its Save is Done, as without the sidebar). Without it (a phone, a
   * narrow screen, signed out) the toolbar keeps them.
   */
  isBesideSidebar?: boolean;
}

/**
 * Replaces the single idle button while drawing: Undo | Redo in one pill and
 * Snap | Draw | Done in another, after the owner's frame (4304:21645), with
 * the count above them. Deliberately small: the map is the document, and
 * this is the only chrome allowed to compete with it.
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
export function DrawToolbar({
  draw,
  onDone,
  keys = true,
  ends = null,
  loop = null,
  isBesideSidebar = false,
}: DrawToolbarProps) {
  if (draw.picking) return <PickBar draw={draw} ends={ends} />;
  return (
    <Toolbar
      draw={draw}
      onDone={onDone}
      keys={keys}
      loop={loop}
      isBesideSidebar={isBesideSidebar}
    />
  );
}

function Toolbar({
  draw,
  onDone,
  keys,
  loop,
  isBesideSidebar,
}: {
  draw: Drawing;
  onDone: (() => void) | undefined;
  keys: boolean;
  loop: LoopPlan | null;
  isBesideSidebar: boolean;
}) {
  const points = draw.controlPoints.length;
  const area = draw.area;
  const noun = area ? 'corner' : 'point';
  const uTurns = draw.uTurns.length;
  // A phone has no hover for a title, no right-click and no shift key: it is
  // told what a finger does, asked before ✕ throws the drawing away, and
  // gets the point bar (point-bar.tsx) for what the mouse's clicks do.
  const finger = coarsePointer();
  const [confirming, setConfirming] = useState(false);
  const [uTurnHelp, setUTurnHelp] = useState(false);
  const uTurnText = uTurnWarning(uTurns);
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

  const hint = drawHint({
    uTurnHelp: uTurnHelp ? uTurnText : null,
    isFinger: finger,
    isArea: !!area,
    points,
    isMoving: draw.moving,
    loopOther: loop?.other ?? null,
  });
  const contextual = draw.selected !== null || draw.canPutBack || draw.followOffer !== null;

  return (
    <div
      data-testid="draw-toolbar"
      className="absolute bottom-[calc(1.5rem+env(safe-area-inset-bottom))] left-1/2 z-10 flex w-max max-w-[calc(100%-2rem)] -translate-x-1/2 flex-col items-center gap-2"
    >
      {/* Dragging and right-clicking are not discoverable on a bare map (drawHint). */}
      {hint && !contextual && !isBesideSidebar && (
        <p
          className={
            finger
              ? 'rounded-full bg-surface-transparent px-3 py-1.5 text-center text-xs text-content-inverse'
              : 'text-center text-[11px] text-content-quaternary [text-shadow:0_1px_2px_white]'
          }
        >
          {hint}
        </p>
      )}

      <PointBar draw={draw} />
      <PutBack draw={draw} />
      <FollowChip draw={draw} />

      {!isBesideSidebar && (
        <DrawCount
          draw={draw}
          isFinger={finger}
          doneReason={doneReason}
          onUTurnHelp={() => setUTurnHelp(!uTurnHelp)}
        />
      )}

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

          {loop && !isBesideSidebar && (
            <div className={PILL}>
              <CloseLoop draw={draw} loop={loop} />
            </div>
          )}

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
