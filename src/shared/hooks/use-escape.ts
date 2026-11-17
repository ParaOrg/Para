import { useEffect } from 'react';

/**
 * Whether a key is an Escape for a sheet to close on. Not one a handler nearer the key has already
 * taken (`defaultPrevented`), nor one pressed in a field with a list of its own (a combobox, as
 * place search's is): that Escape is the field's, to clear it or close its list, and the card
 * behind the field stays open.
 */
export function isEscapeToClose(
  event: Pick<KeyboardEvent, 'key' | 'defaultPrevented' | 'target'>,
): boolean {
  if (event.key !== 'Escape' || event.defaultPrevented) return false;
  const { target } = event;
  return !(target instanceof Element && target.closest('[role="combobox"]'));
}

/**
 * Escape does what ✕ does, as it does on any dialog — while `active`: a card
 * kept but hidden (a hotspot's under the trip it opened, the route list under
 * a trip) leaves Escape to the card over it. One hook for every sheet that
 * closes on it.
 */
export function useEscape(onEscape: () => void, active = true): void {
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (isEscapeToClose(e)) onEscape();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onEscape, active]);
}
