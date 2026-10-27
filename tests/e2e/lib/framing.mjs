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
      await fetch('/data/index.v5.json', { headers: { 'x-para-test': '1' } })
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
