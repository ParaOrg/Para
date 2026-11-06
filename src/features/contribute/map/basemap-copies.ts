import type { Basemap, StyleCopies } from '@/features/routes/map/basemap';

/**
 * The app's copies of the basemaps' styles, for a map made with no signal (basemap.ts,
 * initialStyle, which checks a copy is a style before it draws with it): the style last fetched
 * on this phone, kept in its storage, else the one the app was built with (vite.apk.config.ts,
 * basemapStylesInTheApp), served from the app's own files. Each is the style as fetched, before
 * it is dressed. The tiles they point at come once there is a signal again (use-map-reconnect.ts).
 */
export const BASEMAP_COPIES: StyleCopies = {
  read: async (b) => keptCopy(b) ?? (await builtInCopy(b)),
  keep: (b, style) => {
    try {
      localStorage.setItem(keyOf(b), JSON.stringify(style));
    } catch (error) {
      // Full or blocked storage: the copy the app was built with stays the fallback.
      console.warn('The basemap could not be kept for offline use.', error);
    }
  },
};

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
