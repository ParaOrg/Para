/**
 * How far down the floating cards start on a wide map, under the bar at rest: its top, then its
 * card (12 padding, the field's 20 label, 6 gap and 44 box, 12 padding) and 8 more. Literal
 * classes, so Tailwind finds them; a class on the page's root, so it is written only when a
 * notice comes or goes (BottomSheet reads it for its `corner` and `dock` kinds).
 */
const SHEET_TOP_UNDER = {
  map: '[--sheet-float-top:calc(env(safe-area-inset-top)+7.375rem)]',
  offlinePill: '[--sheet-float-top:calc(env(safe-area-inset-top)+9.875rem)]',
  update: '[--sheet-float-top:calc(env(safe-area-inset-top)+11.125rem)]',
} satisfies Record<'map' | 'offlinePill' | 'update', string>;

/** The root's class that starts the floating cards under the bar, as the notices place it. */
export function sheetTopUnderSearch(isUnderUpdate: boolean, isUnderOfflinePill: boolean): string {
  if (isUnderUpdate) return SHEET_TOP_UNDER.update;
  return isUnderOfflinePill ? SHEET_TOP_UNDER.offlinePill : SHEET_TOP_UNDER.map;
}
