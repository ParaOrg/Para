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
 * What the drawing toolbar says beside the map moves into the sidebar: how to draw (drawHint),
 * what a U-turn means when the line has one, and Close the loop while a return trip is drawn.
 * The toolbar keeps them where there is no sidebar (DrawToolbar's isBesideSidebar).
 */
export function DrawingHint({ draw, loop = null }: DrawingHintProps) {
  const uTurns = draw.uTurns.length;
  const hint = drawHint({
    uTurnHelp: null,
    isFinger: coarsePointer(),
    isArea: draw.area !== null,
    points: draw.controlPoints.length,
    isMoving: draw.moving,
    loopOther: loop?.other ?? null,
  });
  if (!hint && uTurns === 0 && !loop) return null;
  return (
    <div data-testid="drawing-hint" className="flex flex-col items-start gap-2">
      {hint && <p className="text-xs text-content-quaternary">{hint}</p>}
      {uTurns > 0 && <p className="text-xs text-content-quaternary">⚠ {uTurnWarning(uTurns)}</p>}
      {loop && <CloseLoop draw={draw} loop={loop} />}
    </div>
  );
}
