import { coarsePointer } from '@/features/routes/map/tap';

import { CloseLoop } from '../drawing/close-loop';
import { drawHint, uTurnWarning } from '../drawing/toolbar-text';
import type { Drawing } from '../drawing/use-drawing';
import type { LoopPlan } from '../drawing/use-loop-closing';

interface DrawingHintProps {
  draw: Drawing;
  /** While a route's return trip is drawn: where the loop closes. */
  loop?: LoopPlan | null;
}

/**
 * Beside the map, the sidebar says what the toolbar would: how to draw (drawHint), what a U-turn
 * means when the line has one, and Close the loop while a return trip is drawn. Where there is no
 * sidebar, the toolbar keeps them (DrawToolbar's isBesideSidebar).
 */
export function DrawingHint({ draw, loop = null }: DrawingHintProps) {
  const uTurns = draw.uTurns.length;
  const hint = drawHint({
    uTurnHelp: null,
    isFinger: coarsePointer(),
    isArea: !!draw.area,
    points: draw.controlPoints.length,
    isMoving: draw.moving,
    loopOther: loop?.other ?? null,
  });
  if (!hint && uTurns === 0 && !loop) return null;
  return (
    <div data-testid="drawing-hint" className="flex flex-col items-start gap-2">
      {hint && <p className="text-xs text-content-quaternary">{hint}</p>}
      {uTurns > 0 && (
        <p role="status" className="text-xs text-content-quaternary">
          <span aria-hidden="true">⚠ </span>
          {uTurnWarning(uTurns)}
        </p>
      )}
      {loop && <CloseLoop draw={draw} loop={loop} />}
    </div>
  );
}
