/**
 * Whether what stands in the studio's left panel may take an Escape or a map tap: shown (the other
 * maps hide the panel, its card waiting), not under an inert page (the map's credits open over it)
 * and with no modal dialog over the page (an account dialog takes its own Escape). The map box's
 * sheets get the same from the inert map box; the panel stands outside it. `el` is the panel or
 * its host, which draws no box of its own (`display: contents`): its parent's then says if it shows.
 */
export function isPanelReachable(el: Element | null): boolean {
  if (!el || el.closest('[inert]')) return false;
  const isShown =
    getComputedStyle(el).display === 'contents'
      ? (el.parentElement?.checkVisibility() ?? false)
      : el.checkVisibility();
  return isShown && el.ownerDocument.querySelector(':modal') === null;
}
