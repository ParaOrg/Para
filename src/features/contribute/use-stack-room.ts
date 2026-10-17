import { useEffect, useRef } from 'react';

/**
 * A ref for the stack of bars along the bottom of the screen. Its height is
 * kept in `--stack-room` on the page, which contribute.css lifts the map's
 * bottom corners by, so the credits and the scale stay above the bars.
 */
export function useStackRoom() {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const stack = ref.current;
    if (!stack) return;
    const root = document.documentElement;
    const measure = () => root.style.setProperty('--stack-room', `${stack.offsetHeight}px`);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(stack);
    return () => {
      observer.disconnect();
      root.style.removeProperty('--stack-room');
    };
  }, []);
  return ref;
}
