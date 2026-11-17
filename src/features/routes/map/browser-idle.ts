/** What a warm-up asks of the browser for a spare moment: a unit check hands it a stand-in. */
export interface Idle {
  requestIdleCallback?: (run: () => void, options?: { timeout: number }) => number;
  cancelIdleCallback?: (handle: number) => void;
  setTimeout: (run: () => void, ms: number) => unknown;
  clearTimeout: (timer: unknown) => void;
}

/**
 * The page's own: each asked of the browser as it is called, so a browser without
 * requestIdleCallback (Safari) answers with none and the warm-up takes a timer instead.
 */
export const BROWSER_IDLE: Idle = {
  get requestIdleCallback() {
    return typeof globalThis.requestIdleCallback === 'function'
      ? globalThis.requestIdleCallback.bind(globalThis)
      : undefined;
  },
  get cancelIdleCallback() {
    return typeof globalThis.cancelIdleCallback === 'function'
      ? globalThis.cancelIdleCallback.bind(globalThis)
      : undefined;
  },
  setTimeout: (run, ms) => globalThis.setTimeout(run, ms),
  // A browser's timer is a number; anything else was never one of its timers.
  clearTimeout: (timer) => {
    if (typeof timer === 'number') globalThis.clearTimeout(timer);
  },
};
