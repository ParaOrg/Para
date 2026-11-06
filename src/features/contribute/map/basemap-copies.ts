import type { StyleSpecification } from 'maplibre-gl';

import { isStyle, type Basemap, type StyleCopies } from '@/features/routes/map/basemap';

/**
 * The app's copies of the basemaps' styles, for a map made with no signal (basemap.ts,
 * initialStyle): the style last fetched on this phone, kept in its storage, else the one the app
 * was built with (vite.apk.config.ts, basemapStylesInTheApp), served from the app's own files,
 * else a flat map. Each copy is the style as fetched, before it is dressed. The tiles they point at
 * come once there is a signal again (use-map-reconnect.ts).
 */
export const BASEMAP_COPIES: StyleCopies = {
  keep: (b, style) => {
    try {
      localStorage.setItem(keyOf(b), JSON.stringify(style));
    } catch (error) {
      // Full or blocked storage: the copy the app was built with stays the fallback.
      console.warn('The basemap could not be kept for offline use.', error);
    }
  },
  offline: async (b) => {
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
