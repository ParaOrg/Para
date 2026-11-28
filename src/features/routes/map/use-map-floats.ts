import { useEffect, useState, type RefObject } from 'react';

/** Where the cards float on the map (global.css's --container-float), in rem. */
const FLOAT_REM = 64;

/**
 * Whether the public map is wide enough for its cards to float (`@float:`, the map's container at
 * 64rem and up): for what CSS alone cannot move, as the list's filter, which stands over locate on
 * a phone and beside Vice Versa where the card floats (4885:41761, 4886:47571).
 */
export function useMapFloats(root: RefObject<HTMLElement | null>): boolean {
  const [floats, setFloats] = useState(false);
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const measure = () => setFloats(el.clientWidth >= FLOAT_REM * rem);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [root]);
  return floats;
}
