import { useId } from 'react';

import { LOOP_WORD } from '@/features/routes/model/routes';

interface LoopToggleProps {
  isLoop: boolean;
  /** An ikot is made one or not and stays so: locked in Edit route, on a retried save. */
  isLocked: boolean;
  onChange: (isLoop: boolean) => void;
}

/**
 * Whether the line is an ikot: a route that goes round one way with no ends,
 * called by its signboard. The first control of the save panel, ticked for
 * itself when the line was closed on its own first point.
 */
export function LoopToggle({ isLoop, isLocked, onChange }: LoopToggleProps) {
  const ids = useId();
  return (
    <div className="mt-3">
      <label htmlFor={ids} className="flex items-center gap-2 text-sm font-medium text-neutral-800">
        <input
          id={ids}
          type="checkbox"
          data-testid="save-loop-toggle"
          aria-describedby={`${ids}-hint`}
          checked={isLoop}
          disabled={isLocked}
          onChange={(e) => onChange(e.target.checked)}
          className="h-4 w-4 accent-neutral-900"
        />
        {LOOP_WORD}: goes round, no ends
      </label>
      <p id={`${ids}-hint`} className="mt-0.5 pl-6 text-xs text-neutral-500">
        {isLocked
          ? 'A route is made an ikot or not, and stays so.'
          : 'No head, no tail, one direction: the jeep goes round the way this line was drawn.'}
      </p>
    </div>
  );
}
