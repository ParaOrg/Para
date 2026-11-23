import { useState } from 'react';

/**
 * A flag that turns on the first render `isOn` holds, and stays on whatever `isOn` does after,
 * until a render where `isReset` holds turns it off. It is set while rendering, as React allows
 * for state that follows other state, never from an effect: React renders again at once, so no
 * frame is painted with the flag behind what turned it on or off. Should both hold in one render,
 * `isReset` wins.
 *
 * @example
 * // Drawn from the first time it shows, and kept while hidden; signed out, it goes.
 * const isHistoryKept = useLatch(isHistoryShown, !canSend);
 */
export function useLatch(isOn: boolean, isReset = false): boolean {
  const [isLatched, setIsLatched] = useState(false);
  const shouldBeLatched = !isReset && (isLatched || isOn);
  if (shouldBeLatched !== isLatched) setIsLatched(shouldBeLatched);
  return isLatched;
}
