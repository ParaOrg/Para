import { formatDistance, straightCount } from './toolbar-text';
import type { Drawing } from './use-drawing';

interface DrawCountProps {
  draw: Drawing;
}

/**
 * What is drawn so far, as text for a screen reader: its points and length,
 * its straight stretches and U-turns, and whether the router is still
 * working. The owner's toolbar shows none of it; the map shows the line and
 * rings each U-turn in amber, and this is the same news for someone who
 * cannot see the map. A live region, so a change is read out.
 */
export function DrawCount({ draw }: DrawCountProps) {
  const area = draw.area;
  const points = draw.controlPoints.length;
  const noun = area ? 'corner' : 'point';
  const straight = straightCount(draw.segments);
  const uTurns = draw.uTurns.length;
  return (
    <p role="status" className="sr-only">
      {area && <>{area.kind === 'terminal' ? 'Terminal' : 'Hintuan'} · </>}
      {points} {points === 1 ? noun : `${noun}s`}
      {!area && draw.line.length > 1 && <> · {formatDistance(draw.metres)}</>}
      {!area && straight > 0 && <> · {straight} straight</>}
      {!area && uTurns > 0 && (
        <>
          {' '}
          · ⚠ {uTurns} U-turn{uTurns === 1 ? '' : 's'}
        </>
      )}
      {draw.snapping > 0 && <> · snapping…</>}
    </p>
  );
}
