/** Where the ?slowmo switch is kept for the browser tab's session (slowmo.ts). */
export const SLOWMO_KEY = 'para.slowmo';

/**
 * The ?slowmo test switch (slowmo.ts), fetched only when the address asks for it or the tab kept
 * it on: almost no one opens the page with it, so the page's opening does not carry it.
 */
export function applySlowmoIfAsked(): void {
  let isAsked = new URLSearchParams(window.location.search).has('slowmo');
  try {
    isAsked ||= window.sessionStorage.getItem(SLOWMO_KEY) !== null;
  } catch {
    // Storage refused (a private window): only the address can ask for it.
    isAsked ||= false;
  }
  if (!isAsked) return;
  import('./slowmo').then(
    (slowmo) => slowmo.applySlowmo(),
    (error: unknown) => {
      console.warn(
        'The ?slowmo switch could not be fetched; the motion runs at its own pace.',
        error,
      );
    },
  );
}
