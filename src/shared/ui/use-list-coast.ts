import { useEffect, useRef, type RefObject } from 'react';

import type { ListCoast } from './sheet-coast';

/**
 * The list at full height carrying on a coast the sheet began (glideTo's `list`), on the coast's
 * own curve, 1 − (1 − t)³, so it leaves at the speed the sheet arrived at and slows to rest. The
 * browser has no way to start a list's own momentum, so it is drawn frame by frame. A finger, a
 * mouse or a wheel on the list stops it where it is, as they stop a list's own.
 */
export function useListCoast(body: RefObject<HTMLDivElement | null>) {
  const frame = useRef<number | null>(null);
  const wait = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stop = () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    if (wait.current !== null) clearTimeout(wait.current);
    frame.current = null;
    wait.current = null;
  };
  const stopRef = useRef(stop);
  useEffect(() => {
    const el = body.current;
    const halt = () => stopRef.current();
    const bound = new AbortController();
    const on = { signal: bound.signal, passive: true };
    for (const type of ['pointerdown', 'touchstart', 'wheel'] as const)
      el?.addEventListener(type, halt, on);
    return () => {
      bound.abort();
      halt();
    };
  }, [body]);

  const run = (coast: ListCoast) => {
    stop();
    const start = () => {
      const el = body.current;
      if (!el) return;
      const from = el.scrollTop;
      let began: number | null = null;
      const step = (now: number) => {
        began ??= now;
        const t = Math.min(1, (now - began) / coast.ms);
        el.scrollTop = from + coast.px * (1 - (1 - t) ** 3);
        frame.current = t < 1 ? requestAnimationFrame(step) : null;
      };
      frame.current = requestAnimationFrame(step);
    };
    if (coast.afterMs > 0) wait.current = setTimeout(start, coast.afterMs);
    else start();
  };
  return { run, stop };
}
