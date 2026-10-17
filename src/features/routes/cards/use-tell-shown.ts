import { useLayoutEffect, useRef } from 'react';

/**
 * What the RouteCards show, for the map to light; null once the card closes, so an open card
 * showing nothing still says it is open (a list kept behind it must not light its own). Told
 * before the first paint, so that list's routes do not flash lit for a frame. Told only when that
 * changes: the caller's function is read from a ref, so one made afresh each render cannot set the
 * lights going in a loop.
 *
 * `shownKey` is the shown direction ids joined with '\n', which this hook splits again; the
 * caller must join with '\n'.
 */
export function useTellShown(
  onShownChange: (ids: readonly string[] | null) => void,
  shownKey: string,
) {
  const onShown = useRef(onShownChange);
  // Kept current as each render commits, ahead of the effect below that reads it.
  useLayoutEffect(() => {
    onShown.current = onShownChange;
  });
  useLayoutEffect(() => {
    const tell = onShown.current;
    tell(shownKey ? shownKey.split('\n') : []);
    return () => tell(null);
  }, [shownKey]);
}
