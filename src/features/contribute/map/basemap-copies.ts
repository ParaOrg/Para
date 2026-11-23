import type { StyleSpecification } from 'maplibre-gl';

import { isStyle, styleToDraw, type Basemap } from '@/features/routes/map/basemap';

/**
 * What the contributor app's map is made with (MapView's `makeStyle`), in place of the public
 * map's initialStyle: the style fetched, and kept as this phone's copy; with no signal, the copy
 * (BASEMAP_COPIES), so the map still loads. Unlike initialStyle it always fetches, even a plain
 * design, so that it has a copy of each.
 */
export async function styleWithCopies(
  b: Basemap,
  areLabelsShown: boolean,
): Promise<StyleSpecification> {
  let fetched: unknown = null;
  try {
    const response = await fetch(b.url);
    if (response.ok) fetched = await response.json();
  } catch {
    // No signal, or no answer: the copy below.
  }
  if (isStyle(fetched)) BASEMAP_COPIES.keep(b, fetched);
  const style = isStyle(fetched) ? fetched : await BASEMAP_COPIES.offline(b);
  return styleToDraw(b, style, areLabelsShown);
}

/**
 * The app's copies of the basemaps' styles, for a map made with no signal: the style last fetched
 * on this phone, kept in its storage, else the one the app was built with (vite.apk.config.ts,
 * basemapStylesInTheApp), served from the app's own files, else a flat map. Each copy is the style
 * as fetched, before it is dressed. The tiles they point at come from the phone's cache
 * (basemap-cache.ts), or once there is a signal again (use-map-reconnect.ts).
 */
export const BASEMAP_COPIES = {
  keep: (b: Basemap, style: StyleSpecification): void => {
    try {
      localStorage.setItem(keyOf(b), JSON.stringify(style));
    } catch (error) {
      // Full or blocked storage: the copy the app was built with stays the fallback.
      console.warn('The basemap could not be kept for offline use.', error);
    }
  },
  /** What to draw `b` with when it cannot be fetched: its copy, else a flat style. Never rejects. */
  offline: async (b: Basemap): Promise<StyleSpecification> => {
    const kept = keptCopy(b);
    if (isStyle(kept)) return kept;
    try {
      const builtIn = await builtInCopy(b);
      if (isStyle(builtIn)) return builtIn;
    } catch (error) {
      console.warn('The basemap the app was built with could not be read.', error);
    }
    return FLAT_STYLE;
  },
};

/**
 * The map with no basemap at all: no roads, no labels, no 3D. It has no layer of its own, so the
 * map's own ground (MapView's surface-secondary) shows through. Owner to design later
 * (.scratch/contribute-apk/README.md).
 */
export const FLAT_STYLE: StyleSpecification = { version: 8, sources: {}, layers: [] };

/** Where the app's build puts each design's style, as `<id>.json`. */
const BUILT_IN_STYLES_FOLDER = 'basemap-styles';

const keyOf = (b: Basemap): string => `para.basemap-copy.v1.${b.id}`;

/** The copy kept on this phone, parsed; null with none, or none readable. */
function keptCopy(b: Basemap): unknown {
  try {
    const kept = localStorage.getItem(keyOf(b));
    return kept === null ? null : JSON.parse(kept);
  } catch (error) {
    console.warn('The basemap kept for offline use could not be read.', error);
    return null;
  }
}

/** The copy the app was built with; null for a design it was not built with. */
async function builtInCopy(b: Basemap): Promise<unknown> {
  const response = await fetch(`/${BUILT_IN_STYLES_FOLDER}/${b.id}.json`);
  return response.ok ? response.json() : null;
}
