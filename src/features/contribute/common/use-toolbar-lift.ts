import { useEffect, useState } from 'react';

/**
 * A callback ref for what stands under the page's toolbar on Record (the earlier-recordings
 * question): its height is kept in `--toolbar-lift` on the page, which lifts the toolbar
 * (TOOLBAR_PLACE) over it, as Start's own foot stood the tabs over it. A callback ref, so a
 * question that appears later is measured as it arrives.
 */
export function useToolbarLift(): (under: HTMLElement | null) => void {
  const [under, setUnder] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (!under) return;
    const root = document.documentElement;
    const measure = () => root.style.setProperty('--toolbar-lift', `${under.offsetHeight}px`);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(under);
    return () => {
      observer.disconnect();
      root.style.removeProperty('--toolbar-lift');
    };
  }, [under]);
  return setUnder;
}
