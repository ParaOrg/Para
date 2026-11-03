/** Where the ?slowload switch is kept for the browser tab's session (slowload.ts). */
export const SLOWLOAD_KEY = 'para.slowload';

/** How long the switch holds each of History's and Account's loads back, in ms: none unless asked. */
let delayMs: Promise<number> = Promise.resolve(0);

/**
 * The ?slowload test switch (slowload.ts), fetched only when the address asks for it or the tab
 * kept it on: almost no one opens the page with it, so the page's opening does not carry it.
 */
export function applySlowloadIfAsked(): void {
  let isAsked = new URLSearchParams(window.location.search).has('slowload');
  try {
    isAsked ||= window.sessionStorage.getItem(SLOWLOAD_KEY) !== null;
  } catch {
    // Storage refused (a private window): only the address can ask for it.
    isAsked ||= false;
  }
  if (!isAsked) return;
  delayMs = import('./slowload').then(
    (slowload) => slowload.applySlowload(),
    (error: unknown) => {
      console.warn(
        'The ?slowload switch could not be fetched; loads run at their own pace.',
        error,
      );
      return 0;
    },
  );
}

/** `load`, held back first by the ?slowload switch's delay when it is on, so a skeleton can be seen. */
export async function slowloaded<T>(load: () => Promise<T>): Promise<T> {
  const ms = await delayMs;
  if (ms > 0) await new Promise((resolve) => setTimeout(resolve, ms));
  return load();
}
