const LOCK_NAME = 'parapo-recorder';

let held: Promise<boolean> | null = null;

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
        return lock ? new Promise<never>(() => undefined) : undefined;
      })
      .catch((error: unknown) => {
        console.warn('The recorder lock could not be taken.', error);
        resolve(false);
      });
  });
  return held;
}
