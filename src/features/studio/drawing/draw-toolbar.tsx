import { useState } from 'react';

import { coarsePointer } from '@/features/routes/map/tap';

import { PickBar } from './pick-bar';
import { FollowChip, PointBar, PutBack } from './point-bar';
import { TapDraw } from './tap-draw';
import {
  drawHint,
  formatDistance,
  uTurnWarning,
  whyNotDone,
  type ExtendEnds,
} from './toolbar-text';
import { useDrawKeys } from './use-draw-keys';
import type { Drawing } from './use-drawing';

interface DrawToolbarProps {
  draw: Drawing;
  onDone: () => void;
  /** Whether the keyboard shortcuts may act. False while a panel is open. */
  keys?: boolean;
  /**
   * While extending: the places the direction being extended runs from and
   * to, and whether its stored line runs the other way round, so the two
   * keep buttons can say which part they keep in the jeep's own order.
   */
  ends?: ExtendEnds | null;
}

/**
 * Replaces the single idle button while drawing. Deliberately small: the map
 * is the document, and this is the only chrome allowed to compete with it.
 *
 * Serves both a route trace and a hotspot outline. The outline needs three
 * corners, has no router to wait for, and has no Tap | Draw switch because
 * every edge is already straight.
 *
 * Three of the buttons answer to a key as well — Ctrl+Z, Enter, F — but only
 * while `keys` is true: the studio turns them off the moment a panel opens,
 * so Enter in the save form submits the form and Ctrl+Z in a field is the
 * browser's own undo. Esc is deliberately unbound (owner, 2026-09-22): cancel
 * discards the whole trace, and that should not be one stray key away.
 */
export function DrawToolbar({ draw, onDone, keys = true, ends = null }: DrawToolbarProps) {
  if (draw.picking) return <PickBar draw={draw} ends={ends} />;
  return <Toolbar draw={draw} onDone={onDone} keys={keys} />;
}

function Toolbar({ draw, onDone, keys }: { draw: Drawing; onDone: () => void; keys: boolean }) {
  const points = draw.controlPoints.length;
  const freehandCount = draw.segments.filter((s) => s?.snap === 'freehand').length;
  const area = draw.area;
  const minPoints = area ? 3 : 2;
  const noun = area ? 'corner' : 'point';
  const uTurns = draw.uTurns.length;
  // A stand-in still on the line is not road geometry yet, and must not be saved.
  const waiting = draw.snapping > 0 || draw.unresolved;
  const canDone = points >= minPoints && !waiting;
  // A phone has no hover for a title, no right-click and no shift key: it is
  // told what a finger does, asked before ✕ throws the drawing away, and
  // gets the point bar (point-bar.tsx) for what the mouse's clicks do.
  const finger = coarsePointer();
  const [confirming, setConfirming] = useState(false);
  const [uTurnHelp, setUTurnHelp] = useState(false);
  const uTurnText = uTurnWarning(uTurns);
  const doneReason = whyNotDone(points, minPoints, noun, waiting);

  // While ✕ asks, Enter must not save what is about to be thrown away.
  useDrawKeys({ draw, isOn: keys && !confirming, points, canDone, isArea: !!area, onDone });

  const hint = drawHint({
    uTurnHelp: uTurnHelp ? uTurnText : null,
    isFinger: finger,
    isArea: !!area,
    points,
  });
  const contextual = draw.selected !== null || draw.canPutBack || draw.followOffer !== null;

  return (
    <div
      data-testid="draw-toolbar"
      className="absolute bottom-[calc(1.5rem+env(safe-area-inset-bottom))] left-1/2 z-10 flex w-max max-w-[calc(100%-2rem)] -translate-x-1/2 flex-col items-center gap-2"
    >
      {/* Dragging and right-clicking are not discoverable on a bare map (drawHint). */}
      {hint && !contextual && (
        <p
          className={
            finger
              ? 'rounded-full bg-neutral-900/80 px-3 py-1.5 text-center text-xs text-white'
              : 'text-center text-[11px] text-neutral-600 [text-shadow:0_1px_2px_white]'
          }
        >
          {hint}
        </p>
      )}

      <PointBar draw={draw} />
      <PutBack draw={draw} />
      <FollowChip draw={draw} />

      {!area && <TapDraw draw={draw} />}

      <div className="flex flex-col items-center rounded-3xl bg-white p-1.5 shadow-lg ring-1 ring-black/10">
        <span className="px-3 pt-0.5 text-center text-xs text-neutral-500 tabular-nums">
          {area && (
            <span className="font-medium text-neutral-700">
              {area.kind === 'terminal' ? 'Terminal' : 'Hintuan'} ·{' '}
            </span>
          )}
          {points} {points === 1 ? noun : `${noun}s`}
          {!area && draw.line.length > 1 && <> · {formatDistance(draw.metres)}</>}
          {!area && freehandCount > 0 && (
            <span className="text-neutral-400"> · {freehandCount} straight</span>
          )}
          {!area && uTurns > 0 && (
            <button
              type="button"
              onClick={() => setUTurnHelp(!uTurnHelp)}
              title={uTurnText}
              className="text-amber-700 underline decoration-dotted underline-offset-2"
            >
              · ⚠ {uTurns} U-turn{uTurns === 1 ? '' : 's'}
            </button>
          )}
          {draw.snapping > 0 && <span className="text-rose-600"> · snapping…</span>}
          {finger && doneReason && points > 0 && !draw.snapping && (
            <span className="text-neutral-400"> · {doneReason.toLowerCase()}</span>
          )}
        </span>

        {confirming ? (
          <div className="flex items-center gap-1">
            <span className="px-2 text-sm text-neutral-700">
              Discard this {area ? 'hotspot' : 'route'}?
            </span>
            <button type="button" onClick={() => setConfirming(false)} className={TOOL}>
              Keep
            </button>
            <button type="button" onClick={draw.cancel} className={TOOL + ' text-red-600'}>
              Discard
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={draw.undo}
              disabled={points === 0}
              title={`Undo last ${noun} (Ctrl+Z)`}
              className={TOOL}
            >
              ↶ Undo
            </button>

            <button
              type="button"
              onClick={onDone}
              disabled={!canDone}
              title={doneReason ?? (area ? 'Save this hotspot (Enter)' : 'Save this route (Enter)')}
              className="rounded-full bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              ✓ Done
            </button>

            <button
              type="button"
              onClick={finger && points > 0 ? () => setConfirming(true) : draw.cancel}
              title={area ? 'Discard this hotspot' : 'Discard this route'}
              className={TOOL + ' text-neutral-500'}
            >
              ✕
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * A tool button, the same size under a finger as under a mouse: the owner
 * dropped the 44 px floor (2026-10-16) and the toolbar isn't drawn in Figma yet.
 */
const TOOL =
  'rounded-full px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-40';
