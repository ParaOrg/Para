import { useLayoutEffect, type RefObject } from 'react';

/**
 * Along the bottom (as wide as the map), the cards are the foot the locate-me column stands on
 * (`--dock-foot`, locator.tsx), so it keeps 16 over them at any text size; floating in the corner
 * they leave the foot alone.
 */
export function useDockFoot(own: RefObject<HTMLDivElement | null>) {
  useLayoutEffect(() => {
    const cards = own.current;
    const host = cards?.closest<HTMLElement>('[data-dock-host]');
    if (!cards || !host) return;
    const place = () => {
      const isAlongBottom = cards.offsetWidth >= host.clientWidth;
      if (isAlongBottom) host.style.setProperty('--dock-foot', `${cards.offsetHeight}px`);
      else host.style.removeProperty('--dock-foot');
    };
    place();
    const watch = new ResizeObserver(place);
    watch.observe(cards);
    watch.observe(host);
    return () => {
      watch.disconnect();
      host.style.removeProperty('--dock-foot');
    };
  }, [own]);
}
