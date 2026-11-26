// The camera the public map is made at, worked out the way the app works it
// out: from the map file's overviews, through MapLibre's own constructor.
// Used by commuter-test and phone-test.

/**
 * The camera a map made on the box round every overview in the published map
 * gets: 100 px clear of the edges, zoom 13 at most (ROUTES_FRAMING), inside
 * the live map's maxBounds and at its size. `cameraForBounds` is no stand-in:
 * it ignores maxBounds, so on a box whose fit would show past Greater Manila's
 * edge it frames a view the map never holds. A throwaway map made the app's
 * way, with `bounds` and `fitBoundsOptions`, holds exactly what the app does.
 */
export const routesFraming = (page) =>
  page.evaluate(async () => {
    const live = window.__map;
    const f = await (
      await fetch('/data/index.v6.json', { headers: { 'x-para-test': '1' } })
    ).json();
    let [w, s, e, n] = [Infinity, Infinity, -Infinity, -Infinity];
    for (const v of f.variants) {
      for (const [x, y] of v.overview?.coordinates ?? []) {
        if (x < w) w = x;
        if (x > e) e = x;
        if (y < s) s = y;
        if (y > n) n = y;
      }
    }
    const container = document.createElement('div');
    const { clientWidth, clientHeight } = live.getContainer();
    container.style.cssText = `position:fixed;left:0;top:0;visibility:hidden;width:${clientWidth}px;height:${clientHeight}px`;
    document.body.append(container);
    const MapClass = live.constructor;
    const ref = new MapClass({
      container,
      style: { version: 8, sources: {}, layers: [] },
      maxBounds: live.getMaxBounds(),
      bounds: [
        [w, s],
        [e, n],
      ],
      fitBoundsOptions: { padding: 100, maxZoom: 13 },
      attributionControl: false,
    });
    const c = ref.getCenter();
    const camera = { lng: c.lng, lat: c.lat, zoom: ref.getZoom(), bearing: 0, pitch: 0 };
    ref.remove();
    container.remove();
    return camera;
  });

/**
 * Whether the camera has taken a route in whole, as a trip opening does: once the map is at rest,
 * every point of `coords` ([lng, lat]) is on the map and none is under the card, and the route
 * fills at least half the room the card leaves across or down, unless the fit's zoom cap (16)
 * stopped it short. The room is the map above the card on a phone, beside the panel on a desktop.
 * Used by phone-test, commuter-test and save-test.
 */
export const routeFitted = async (page, coords, card = '[data-testid="card"]') => {
  await page
    .waitForFunction(() => !window.__map.isMoving(), null, { timeout: 5000 })
    .catch(() => {});
  return page.evaluate(
    ({ line, cardSelector }) => {
      const map = window.__map;
      const box = map.getContainer().getBoundingClientRect();
      const sheet = document.querySelector(cardSelector)?.getBoundingClientRect();
      if (!sheet) return { ok: false, why: 'no card on show' };
      const isAcross = sheet.width >= box.width * 0.9;
      const room = isAcross
        ? {
            left: box.left,
            right: box.right,
            top: box.top,
            bottom: Math.min(box.bottom, sheet.top),
          }
        : {
            left: Math.max(box.left, sheet.right),
            right: box.right,
            top: box.top,
            bottom: box.bottom,
          };
      const points = line.map((c) => {
        const q = map.project(c);
        return [box.left + q.x, box.top + q.y];
      });
      const xs = points.map((p) => p[0]);
      const ys = points.map((p) => p[1]);
      const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
      const inRoom =
        x0 >= room.left - 2 && x1 <= room.right + 2 && y0 >= room.top - 2 && y1 <= room.bottom + 2;
      const fill = Math.max(
        (x1 - x0) / (room.right - room.left),
        (y1 - y0) / (room.bottom - room.top),
      );
      const zoom = map.getZoom();
      const why = `route x ${Math.round(x0)}–${Math.round(x1)}, y ${Math.round(y0)}–${Math.round(y1)}; room x ${Math.round(room.left)}–${Math.round(room.right)}, y ${Math.round(room.top)}–${Math.round(room.bottom)}; fills ${Math.round(fill * 100)}%, zoom ${zoom.toFixed(2)}`;
      return { ok: inRoom && (fill >= 0.5 || zoom >= 15.99), why };
    },
    { line: coords, cardSelector: card },
  );
};
