import { cn } from '@/shared/utils/cn';

import { TOOL } from './draw-toolbar-look';
import { whyCannotCloseLoop } from './loop-closing';
import type { Drawing } from './use-drawing';
import type { LoopPlan } from './use-loop-closing';

interface CloseLoopProps {
  draw: Drawing;
  loop: LoopPlan;
}

/**
 * Ends a return trip on the first point of the way already drawn, routed like
 * any click (or straight in freehand). Disabled, and saying why in its label,
 * until there is a point to come from and while the loop is already closed.
 */
export function CloseLoop({ draw, loop }: CloseLoopProps) {
  const reason = whyCannotCloseLoop(draw.controlPoints, loop.closeAt, loop.other === null);
  const label = reason ? `Close the loop: ${reason}` : 'Close the loop';
  return (
    <button
      type="button"
      data-testid="close-loop"
      onClick={() => void draw.addPoint(loop.closeAt)}
      disabled={reason !== null}
      aria-label={label}
      title={reason ? label : `End the line where ${loop.other ?? 'it'} began`}
      className={cn(TOOL, 'text-content-tertiary')}
    >
      ⟲ Close the loop
    </button>
  );
}
