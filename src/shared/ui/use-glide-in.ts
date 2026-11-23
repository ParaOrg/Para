import { useLayoutEffect, useRef, type RefObject } from 'react';

/**
 * A sheet shown in another's place glides in from where that one stood, as any of the sheet's own
 * moves does (its `translate` transition), rather than appearing at its own height. A trip picked
 * from the route list is one: the list stays behind it, hidden, and the trip's Low sits lower than
 * the list's. Read from the page's `[data-dock-host]`, where the sheet on show last wrote its top
 * (`--dock-y`), and only while another sheet is still on that page: a sheet opened from the bare
 * map opens at its height, as before. Reduced motion keeps its jump (the sheet's
 * `motion-reduce:transition-none`). Runs before the sheet's own layout effect sets its rest, which
 * the start, read here first, makes a glide.
 */
export function useGlideIn(sheet: RefObject<HTMLDivElement | null>, isHidden: boolean): void {
  const wasHidden = useRef(true);
  useLayoutEffect(() => {
    const own = sheet.current;
    if (!own || isHidden) {
      wasHidden.current = true;
      return;
    }
    if (!wasHidden.current) return;
    wasHidden.current = false;
    const host = own.closest<HTMLElement>('[data-dock-host]');
    const from = host?.style.getPropertyValue('--dock-y') ?? '';
    const isInAnothersPlace = [...(host?.querySelectorAll('[data-snap]') ?? [])].some(
      (other) => other !== own,
    );
    if (!from || !isInAnothersPlace) return;
    own.style.setProperty('--sheet-y', from);
    // The start drawn as a style before the rest is set, so the change is a transition.
    own.getBoundingClientRect();
  }, [sheet, isHidden]);
}
