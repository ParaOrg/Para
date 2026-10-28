/**
 * Phones that opened "Para PH", the app www.para-commute.org served before
 * this one, carry its worker at the same address (`/sw.js`) and scope. Its
 * caches all start with this prefix; ours never do.
 */
export const OLD_APP_CACHE_PREFIX = 'para-ph-';

/**
 * True when the worker controlling this page is the old app's, not ours. The
 * two share a script address, so the page cannot tell them apart by it; the
 * old worker's cache is the mark. A page the old worker controls was loaded
 * through its fetch handler, which opens that cache before answering, so it
 * is there by the time any script runs. Any doubt answers false, which is
 * today's behaviour: a waiting version of ours shows the update prompt.
 */
export async function isOldAppInControl(): Promise<boolean> {
  if (!navigator.serviceWorker.controller) return false;
  try {
    const names = await caches.keys();
    return names.some((name) => name.startsWith(OLD_APP_CACHE_PREFIX));
  } catch {
    return false;
  }
}
