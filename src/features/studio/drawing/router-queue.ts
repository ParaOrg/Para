/** One request still waiting for its turn. */
interface Waiter {
  start: () => void;
  signal?: AbortSignal;
  leave: () => void;
}

/**
 * Turns for a rate-limited server: one request every `gapMs`, first come
 * first served. A turn is handed out only when it comes, so a request called
 * off while it waits leaves the queue at once and the next one still wanted
 * takes its place, rather than waiting behind turns nobody will use.
 */
export function routerQueue(gapMs: number) {
  const waiting: Waiter[] = [];
  let lastStart = -Infinity;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const next = () => {
    timer = null;
    const waiter = waiting[0];
    if (!waiter) return;
    const wait = lastStart + gapMs - Date.now();
    if (wait > 0) {
      timer = setTimeout(next, wait);
      return;
    }
    waiting.shift();
    lastStart = Date.now();
    waiter.signal?.removeEventListener('abort', waiter.leave);
    waiter.start();
    if (waiting.length > 0) timer = setTimeout(next, gapMs);
  };

  /** Waits for this request's turn. Throws the signal's reason if it is called off first. */
  const takeTurn = (signal?: AbortSignal): Promise<void> => {
    signal?.throwIfAborted();
    return new Promise((resolve, reject) => {
      const waiter: Waiter = {
        start: resolve,
        signal,
        leave: () => {
          waiting.splice(waiting.indexOf(waiter), 1);
          reject(signal?.reason);
        },
      };
      signal?.addEventListener('abort', waiter.leave, { once: true });
      waiting.push(waiter);
      if (timer === null) next();
    });
  };

  return { takeTurn };
}
