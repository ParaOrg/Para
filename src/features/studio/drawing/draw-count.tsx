import { formatDistance, uTurnWarning } from './toolbar-text';
import type { Drawing } from './use-drawing';

interface DrawCountProps {
  draw: Drawing;
  isFinger: boolean;
  /** Why Done can't be pressed yet (whyNotDone), told to a finger, which has no title to hover. */
  doneReason: string | null;
  /** The U-turn count was pressed: the hint shows what it means. */
  onUTurnHelp: () => void;
}

/**
 * The line over the toolbar's pills: what is drawn so far, its length, its
 * straight stretches and U-turns, and whether the router is still working.
 * The owner's frame (4304:21645) draws no count, so it sits in a pill of the
 * toolbar's own look.
 */
export function DrawCount({ draw, isFinger, doneReason, onUTurnHelp }: DrawCountProps) {
  const area = draw.area;
  const points = draw.controlPoints.length;
  const noun = area ? 'corner' : 'point';
  const freehandCount = draw.segments.filter((s) => s?.snap === 'freehand').length;
  const uTurns = draw.uTurns.length;
  return (
    <span className="rounded-full bg-surface px-3 py-1 text-center text-xs text-content-quaternary tabular-nums shadow-large">
      {area && (
        <span className="font-medium text-content-tertiary">
          {area.kind === 'terminal' ? 'Terminal' : 'Hintuan'} ·{' '}
        </span>
      )}
      {points} {points === 1 ? noun : `${noun}s`}
      {!area && draw.line.length > 1 && <> · {formatDistance(draw.metres)}</>}
      {!area && freehandCount > 0 && (
        <span className="text-content-disabled"> · {freehandCount} straight</span>
      )}
      {!area && uTurns > 0 && (
        <button
          type="button"
          onClick={onUTurnHelp}
          title={uTurnWarning(uTurns)}
          className="text-amber-700 underline decoration-dotted underline-offset-2"
        >
          · ⚠ {uTurns} U-turn{uTurns === 1 ? '' : 's'}
        </button>
      )}
      {draw.snapping > 0 && <span className="text-rose-600"> · snapping…</span>}
      {isFinger && doneReason && points > 0 && !draw.snapping && (
        <span className="text-content-disabled"> · {doneReason.toLowerCase()}</span>
      )}
    </span>
  );
}
