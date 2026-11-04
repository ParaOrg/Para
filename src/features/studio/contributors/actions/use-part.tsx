import { useId, useState } from 'react';

import { Button } from '@/design-system/primitives/button';
import { lineLength, sliceLine, type LngLat } from '@/shared/utils/geo';

import { kilometres } from '../contribution-format';

interface UsePartProps {
  /** The ride's line, in time order. */
  line: readonly LngLat[];
  onUse: (part: LngLat[]) => void;
}

/** The slider's step, in metres: finer than a stop's spacing, coarse enough to drag. */
const STEP_M = 50;
/** The shortest part worth drawing a route from. */
const MIN_PART_M = 200;

/**
 * Use part of it: a ride often covers more than one route (a transfer the
 * contributor did not mark, or a long ride past the stretch being mapped).
 * Two sliders pick where the part starts and ends, in kilometres along the
 * ride, and that stretch goes to the Playground as Use this line sends the
 * whole. The editor sees it there and can undo. Its ends are left unnamed:
 * the upload's start and end names are the whole ride's.
 */
export function UsePart({ line, onUse }: UsePartProps) {
  const id = useId();
  const totalM = lineLength(line);
  const [fromM, setFromM] = useState(0);
  const [toM, setToM] = useState(totalM);
  const isTooShort = toM - fromM < MIN_PART_M;
  // ponytail: no map preview of the part yet; the draft in the Playground is the preview.
  return (
    <details className="w-full text-sm">
      <summary className="cursor-pointer text-content-secondary">Use part of it</summary>
      <div className="flex flex-col gap-2 pt-2">
        <label htmlFor={`${id}-from`} className="text-content-primary">
          From {kilometres(fromM)}
        </label>
        <input
          id={`${id}-from`}
          type="range"
          min={0}
          max={totalM}
          step={STEP_M}
          className="w-full accent-brand-surface"
          value={fromM}
          onChange={(event) => setFromM(Math.min(Number(event.target.value), toM))}
        />
        <label htmlFor={`${id}-to`} className="text-content-primary">
          To {kilometres(toM)}
        </label>
        <input
          id={`${id}-to`}
          type="range"
          min={0}
          max={totalM}
          step={STEP_M}
          className="w-full accent-brand-surface"
          value={toM}
          onChange={(event) => setToM(Math.max(Number(event.target.value), fromM))}
        />
        <Button
          variant="secondary"
          label={`Use this part · ${kilometres(toM - fromM)}`}
          disabled={isTooShort}
          onClick={() => onUse(sliceLine(line, fromM, toM))}
        />
      </div>
    </details>
  );
}
