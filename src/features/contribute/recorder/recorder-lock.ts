const LOCK_NAME = 'para-recorder';

let held: Promise<boolean> | null = null;
let freed: Promise<void> | null = null;

/** Keeps a granted lock for the page's lifetime: the browser lets it go as the page goes. */
const keepForever = () => new Promise<never>(() => undefined);

/**
 * Whether this tab is the one recorder on the phone. The first tab takes a Web Lock for
 * its lifetime; a second tab gets false, so two tabs never write the same ride's fixes
 * under the same keys. Asked once per page, so React's double effects share the answer.
 * A browser without Web Locks cannot tell, and records as before; one whose lock request
 * fails is treated as a second tab.
 */
export function holdRecorderLock(): Promise<boolean> {
  if (!('locks' in navigator)) return Promise.resolve(true);
  held ??= new Promise<boolean>((resolve) => {
    navigator.locks
      .request(LOCK_NAME, { ifAvailable: true }, (lock) => {
        resolve(lock !== null);
        return lock ? keepForever() : undefined;
      })
      .catch((error: unknown) => {
        console.warn('The recorder lock could not be taken.', error);
        resolve(false);
      });
  });
  return held;
}

/**
 * For a tab that was refused the recorder: resolves once the tab holding it has gone, and this
 * one holds it instead. A closed or reloaded tab lets go a moment after it goes, so a page
 * opened in that moment is refused, then handed the recorder almost at once. Asked once per
 * page; never resolves while the other tab stays open.
 */
export function whenRecorderFreed(): Promise<void> {
  freed ??= new Promise<void>((resolve) => {
    navigator.locks
      .request(LOCK_NAME, () => {
        held = Promise.resolve(true);
        resolve();
        return keepForever();
      })
      .catch((error: unknown) => {
        // Never handed over: the page stays a second tab, as it was.
        console.warn('The recorder lock could not be waited for.', error);
      });
  });
  return freed;
}
