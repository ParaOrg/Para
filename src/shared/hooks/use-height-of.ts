import { useCallback, useState } from 'react';

/** A callback ref, and the height in pixels of the element it is given, kept current (0 without one). */
export function useHeightOf(): [(el: HTMLElement | null) => () => void, number] {
  const [px, setPx] = useState(0);
  // Stable, so React attaches it once per element rather than on every render.
  const ref = useCallback((el: HTMLElement | null) => {
    if (!el) return () => undefined;
    const measure = () => setPx(el.offsetHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => {
      observer.disconnect();
      setPx(0);
    };
  }, []);
  return [ref, px];
}
