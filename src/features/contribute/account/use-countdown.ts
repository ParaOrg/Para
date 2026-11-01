import { useEffect, useState } from 'react';

/**
 * Seconds left of a countdown from `seconds`, started as the component mounts: one less each
 * second, down to 0. A text that changes once a second, nothing that moves, so less motion asked
 * for changes nothing.
 */
export function useCountdown(seconds: number): number {
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    if (left <= 0) return;
    const tick = window.setTimeout(() => setLeft(left - 1), 1000);
    return () => window.clearTimeout(tick);
  }, [left]);
  return left;
}
