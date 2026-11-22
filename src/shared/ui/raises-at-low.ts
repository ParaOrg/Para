/**
 * Whether a tap on `target`, in a sheet at Low, raises the sheet. At Low the top of a sheet's body
 * is not for picking, so a tap anywhere in `body` raises it as its handle does; but not on or in an
 * element marked `data-opens-at-low` (a public map's RouteCard), which opens there as it would
 * higher up.
 */
export function raisesAtLow(body: Element | null, target: Node | null): boolean {
  const element = target instanceof Element ? target : (target?.parentElement ?? null);
  return !!body?.contains(target) && element?.closest('[data-opens-at-low]') == null;
}
