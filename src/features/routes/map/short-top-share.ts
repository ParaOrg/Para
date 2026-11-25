/**
 * A sheet resting at full height whose content stands shorter than the map (the route list fits
 * its cards): the height it shows, as a share of the map. The trip picked from it opens there,
 * not taller (the owner's rule, 2026-11-25: switching cards keeps the height). Null for any other
 * sheet, which keeps the shared height as it is.
 */
export function shortTopShare(sheet: HTMLElement | null): number | null {
  const map = sheet?.offsetParent;
  if (!sheet || !map || sheet.dataset.snap !== 'full') return null;
  const mapBox = map.getBoundingClientRect();
  const shown = mapBox.bottom - sheet.getBoundingClientRect().top;
  return mapBox.height > 0 && shown < sheet.offsetHeight - 2 ? shown / mapBox.height : null;
}
