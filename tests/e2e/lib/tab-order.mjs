// The contributor page's Tab order, as a keyboard or screen reader goes round it.

/**
 * The map's controls the keyboard reaches, Tab after Tab from the top of the page, once round:
 * each named as a screen reader would. The map and its controls are the page's first part.
 */
export async function mapControlsInTabOrder(page) {
  const reached = [];
  const seen = new Set();
  // Round the whole page and past the browser's own stop (the body), until a stop comes again.
  for (let i = 0; i < 80; i += 1) {
    await page.keyboard.press('Tab');
    const stop = await page.evaluate(() => {
      const element = document.activeElement;
      if (!element || element === document.body) return null;
      const mapPart = document.querySelector('main.contribute-page > :first-child');
      return {
        id: element.outerHTML.slice(0, 160),
        name: element.getAttribute('aria-label') ?? element.textContent?.trim().slice(0, 40),
        isOnMap: Boolean(mapPart?.contains(element)),
      };
    });
    if (!stop) continue;
    if (seen.has(stop.id)) break;
    seen.add(stop.id);
    if (stop.isOnMap) reached.push(stop.name);
  }
  return reached;
}
