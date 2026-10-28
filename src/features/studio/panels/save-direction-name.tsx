import { LOOP_WORD } from '@/features/routes/model/routes';

interface SaveDirectionNameProps {
  isLoop: boolean;
  /** The route's name, generated from its ends (or a loop's from its signboard). */
  name: string;
  /** The direction's name, generated from its ends. */
  direction: string;
  /** The line joins a route that exists. */
  hasParent: boolean;
  /** The line is an edit of a saved direction. */
  isEdit: boolean;
}

/** What the line will be called, generated and never typed: the loop's name, or the direction and its route. */
export function SaveDirectionName({
  isLoop,
  name,
  direction,
  hasParent,
  isEdit,
}: SaveDirectionNameProps) {
  if (isLoop)
    return (
      <p className="mt-3 rounded-lg bg-neutral-100 px-3 py-2 text-sm text-neutral-600">
        <span className="text-xs text-neutral-400">This line is the {LOOP_WORD.toLowerCase()}</span>
        <br />
        <strong data-testid="save-direction" className="text-neutral-900">
          {name}
        </strong>
        <br />
        <span className="text-[11px] text-neutral-400">
          One way round, as drawn: the jeep goes the way this line does. The other way round is
          another ikot, with its own signboard.
        </span>
      </p>
    );

  return (
    <p className="mt-3 rounded-lg bg-neutral-100 px-3 py-2 text-sm text-neutral-600">
      <span className="text-xs text-neutral-400">This line is the direction</span>
      <br />
      <strong data-testid="save-direction" className="text-neutral-900">
        {direction || '—'}
      </strong>
      <br />
      <span className="text-xs text-neutral-500">
        {hasParent ? 'of the route ' : 'of a new route, '}
        <span data-testid="save-name" className="font-medium text-neutral-700">
          {name || '—'}
        </span>
      </span>
      <br />
      <span className="text-[11px] text-neutral-400">
        {isEdit
          ? 'Both names are generated from the two ends: pick another place above to change them.'
          : 'Both names are generated from the two ends. Rename a hotspot to change them.'}
      </span>
    </p>
  );
}
