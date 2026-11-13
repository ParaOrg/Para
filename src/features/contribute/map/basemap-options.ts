import { basemapHost } from '@/shared/config/env';

import { keepBasemapOnThePhone } from './basemap-cache';
import { styleWithCopies } from './basemap-copies';

/**
 * How a contributor map is made: the page's own, and a flagged stop's on Stops notes. The app
 * keeps the basemaps' styles for a map made with no signal; the web page has its worker.
 */
export const MAKE_STYLE = import.meta.env.MODE === 'apk' ? styleWithCopies : undefined;

/** And the basemap's tiles, sprite and glyphs it has seen, in the app's Cache Storage. */
export const BASEMAP_REQUESTS =
  import.meta.env.MODE === 'apk' ? keepBasemapOnThePhone(basemapHost) : undefined;
