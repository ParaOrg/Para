import type {
  ExpressionSpecification,
  LayerSpecification,
  MapLibreMap,
  StyleSpecification,
  SymbolLayerSpecification,
} from 'maplibre-gl';

import { MAP_PAINT } from '@/design-system/foundation/map-colours';

/**
 * The basemap designs a viewer can choose between. All of them are OpenFreeMap
 * styles over the same `/planet` tiles, sprite and glyph endpoint, so a switch
 * fetches one small style file and nothing a phone has cached is wasted.
 *
 * Positron is the default: gray, so the routes and hotspots painted on top
 * carry all the colour. "Gray, detailed" is Positron plus a few layers drawn
 * from data the tiles already carry (see `detailStyle`). Liberty is the
 * colourful OSM look; Dark is for night.
 *
 * Below the four: candidates on the theme-comparison branch only, every free
 * no-key style that fits (2026-10-15), so the owner can pick on a phone.
 * Bright and Fiord are OpenFreeMap's too. CARTO's and VersaTiles' are other
 * hosts: not preconnected, not kept offline by the worker, and drawn with
 * OpenFreeMap's fonts (see `withOurFonts`). The two satellite designs are
 * Esri's World Imagery under Positron's labels, or none (see `satelliteStyle`).
 */
export type BasemapId =
  | 'positron'
  | 'positron-detailed'
  | 'liberty'
  | 'dark'
  | 'satellite'
  | 'satellite-labelled'
  | 'bright'
  | 'fiord'
  | 'carto-voyager'
  | 'carto-positron'
  | 'carto-dark-matter'
  | 'versatiles-colorful'
  | 'versatiles-gray'
  | 'versatiles-muted'
  | 'versatiles-colorful-dark'
  | 'versatiles-gray-dark';
export interface Basemap {
  id: BasemapId;
  label: string;
  url: string;
  detailed?: true;
  /** A photo of the ground in place of Positron's drawing, bare or under its labels. */
  imagery?: 'bare' | 'labelled';
}

const OPENFREEMAP = 'https://tiles.openfreemap.org';
const POSITRON = `${OPENFREEMAP}/styles/positron`;
const CARTO = 'https://basemaps.cartocdn.com/gl';
const VERSATILES = 'https://tiles.versatiles.org/assets/styles';

export const BASEMAPS: readonly Basemap[] = [
  { id: 'positron', label: 'Gray', url: POSITRON },
  { id: 'positron-detailed', label: 'Gray, detailed', url: POSITRON, detailed: true },
  { id: 'liberty', label: 'Colour', url: `${OPENFREEMAP}/styles/liberty` },
  { id: 'dark', label: 'Dark', url: `${OPENFREEMAP}/styles/dark` },
  { id: 'satellite', label: 'Satellite', url: POSITRON, imagery: 'bare' },
  { id: 'satellite-labelled', label: 'Satellite, labelled', url: POSITRON, imagery: 'labelled' },
  { id: 'bright', label: 'Bright', url: `${OPENFREEMAP}/styles/bright` },
  { id: 'fiord', label: 'Fiord', url: `${OPENFREEMAP}/styles/fiord` },
  { id: 'carto-voyager', label: 'CARTO Voyager', url: `${CARTO}/voyager-gl-style/style.json` },
  { id: 'carto-positron', label: 'CARTO Positron', url: `${CARTO}/positron-gl-style/style.json` },
  {
    id: 'carto-dark-matter',
    label: 'CARTO Dark Matter',
    url: `${CARTO}/dark-matter-gl-style/style.json`,
  },
  {
    id: 'versatiles-colorful',
    label: 'VersaTiles Colorful',
    url: `${VERSATILES}/colorful/style.json`,
  },
  { id: 'versatiles-gray', label: 'VersaTiles Gray', url: `${VERSATILES}/gray/style.json` },
  { id: 'versatiles-muted', label: 'VersaTiles Muted', url: `${VERSATILES}/muted/style.json` },
  {
    id: 'versatiles-colorful-dark',
    label: 'VersaTiles Dark',
    url: `${VERSATILES}/colorful-dark/style.json`,
  },
  {
    id: 'versatiles-gray-dark',
    label: 'VersaTiles Gray Dark',
    url: `${VERSATILES}/gray-dark/style.json`,
  },
];

export const DEFAULT_BASEMAP = BASEMAPS[0];

/**
 * Remembered on the device only, and only once a viewer has chosen: a visitor
 * who never touches the control leaves the browser's storage empty, which the
 * visitor test asserts and the no-tracking promise relies on.
 */
const STORAGE_KEY = 'parapo.basemap.v1';

export function readBasemap(): Basemap {
  try {
    const id = localStorage.getItem(STORAGE_KEY);
    return BASEMAPS.find((b) => b.id === id) ?? DEFAULT_BASEMAP;
  } catch {
    return DEFAULT_BASEMAP;
  }
}

export function rememberBasemap(b: Basemap): void {
  try {
    if (b.id === DEFAULT_BASEMAP.id) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, b.id);
  } catch {
    // Private mode or blocked storage: the choice lasts for this page only.
  }
}

// ---------------------------------------------------------------- the detail

/*
 * "Gray, detailed" — decided 2026-09-22.
 *
 * The z14 tile over SM Fairview is 253 kB and already holds the `poi`,
 * `building` and `housenumber` layers: 19 of 22 names read off the owner's
 * openstreetmap.org screenshot were in it, "Novaliches Public Terminal" and
 * "Nova Stop" among them. Positron draws none of the POIs and paints
 * buildings almost invisibly. These layers draw what is already downloaded —
 * no new request, no bigger cache — and stay gray so the routes and hotspots
 * keep the colour. Italic is the basemap's voice; our own labels are bold.
 *
 * Only what helps someone place themselves while tracing: transit first,
 * then the landmarks a driver would name. Convenience stores, eateries and
 * gates (2,594 of them under one viewport) stay hidden. Taps are unaffected:
 * `tapTargets` queries our two hit layers by name and nothing else.
 */

const SOURCE = 'openmaptiles';
const FONT = ['Noto Sans Italic'];
const NAME: ExpressionSpecification = ['get', 'name'];
/** The 11 px icons in OpenFreeMap's sprite are named `<class>_11`: small and quiet. */
const ICON: ExpressionSpecification = ['concat', ['get', 'class'], '_11'];

const TRANSIT_COLOUR = MAP_PAINT['Paint/basemap-transit'];
const LANDMARK_COLOUR = MAP_PAINT['Paint/basemap-landmark'];

const label = (
  id: string,
  minzoom: number,
  filter: ExpressionSpecification,
  colour: string,
): SymbolLayerSpecification => ({
  id,
  type: 'symbol',
  source: SOURCE,
  'source-layer': 'poi',
  minzoom,
  filter: ['all', ['==', ['geometry-type'], 'Point'], filter],
  layout: {
    'icon-image': ICON,
    'icon-allow-overlap': false,
    'text-field': NAME,
    'text-font': FONT,
    'text-size': 11,
    'text-anchor': 'top',
    'text-offset': [0, 0.7],
    'text-max-width': 8,
    'text-optional': true,
  },
  paint: {
    'icon-opacity': 0.75,
    'text-color': colour,
    'text-halo-color': MAP_PAINT['Paint/casing'],
    'text-halo-width': 1.2,
    'text-halo-blur': 0.4,
  },
});

const DETAIL_LAYERS: readonly LayerSpecification[] = [
  // Terminals and rail stations from z13: few, and the thing this map is for.
  label(
    'detail-stations',
    13,
    ['any', ['==', ['get', 'subclass'], 'bus_station'], ['==', ['get', 'class'], 'railway']],
    TRANSIT_COLOUR,
  ),
  // Bus stops from z15, once there is room between them.
  label('detail-stops', 15, ['==', ['get', 'subclass'], 'bus_stop'], TRANSIT_COLOUR),
  // The big anchors people give directions by, from z15: the mall, the
  // market, the hospital, the college, the hall, the police station.
  label(
    'detail-landmarks',
    15,
    [
      'any',
      ['match', ['get', 'class'], ['grocery', 'college', 'town_hall', 'police'], true, false],
      ['all', ['==', ['get', 'class'], 'hospital'], ['==', ['get', 'subclass'], 'hospital']],
      [
        'all',
        ['==', ['get', 'class'], 'shop'],
        ['match', ['get', 'subclass'], ['mall', 'department_store'], true, false],
      ],
    ],
    LANDMARK_COLOUR,
  ),
  // The smaller ones from z16: schools, churches, gas stations and parks are
  // real landmarks but there are hundreds under one z15 view, and at z15 they
  // crowded the anchors out (measured over SM Fairview, 2026-09-22).
  label(
    'detail-landmarks-minor',
    16,
    ['match', ['get', 'class'], ['school', 'place_of_worship', 'fuel', 'park'], true, false],
    LANDMARK_COLOUR,
  ),
];

/** Positron paints buildings rgb(234,234,229) on a rgb(245,245,241) ground — a whisper. A shade darker reads as a block. */
const BUILDING_PAINT = {
  'fill-color': MAP_PAINT['Paint/basemap-building'],
  'fill-outline-color': MAP_PAINT['Paint/basemap-building-edge'],
};

/** Positron plus the detail layers and firmer buildings. Pure: the input is left alone. */
function detailStyle(style: StyleSpecification): StyleSpecification {
  return {
    ...style,
    layers: [
      ...style.layers.map((l) =>
        l.id === 'building' && l.type === 'fill'
          ? { ...l, paint: { ...l.paint, ...BUILDING_PAINT } }
          : l,
      ),
      ...DETAIL_LAYERS,
    ],
  };
}

// ------------------------------------------------------------- the photo

/*
 * Esri's World Imagery: the one street-level satellite photo with no key to
 * ask for (2026-10-15), sharp to z19 over Metro Manila. To look at on the
 * theme-comparison branch only: going live needs Esri's free developer key
 * (or MapTiler's), and its tiles are not kept offline.
 */
const IMAGERY_TILES =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

const IMAGERY_LAYER: LayerSpecification = { id: 'imagery', type: 'raster', source: 'imagery' };

/** A Positron label made to read on a photo: white, on a dark halo. */
const onPhoto = (l: SymbolLayerSpecification): SymbolLayerSpecification => ({
  ...l,
  paint: {
    ...l.paint,
    'text-color': MAP_PAINT['Paint/basemap-photo-label'],
    'text-halo-color': MAP_PAINT['Paint/basemap-photo-halo'],
    'text-halo-width': 1.5,
    'text-halo-blur': 0.5,
  },
});

/**
 * Positron with the photo in place of its drawing. Its symbol layers are its
 * labels; everything else (ground, water, roads, buildings) the photo shows
 * already. Bare keeps no label at all. Pure: the input is left alone.
 */
function satelliteStyle(style: StyleSpecification, isLabelled: boolean): StyleSpecification {
  const labels = isLabelled
    ? style.layers.filter((l): l is SymbolLayerSpecification => l.type === 'symbol').map(onPhoto)
    : [];
  return {
    ...style,
    sources: {
      ...style.sources,
      imagery: {
        type: 'raster',
        tiles: [IMAGERY_TILES],
        tileSize: 256,
        maxzoom: 19,
        attribution: 'Imagery © Esri, Maxar, Earthstar Geographics',
      },
    },
    layers: [IMAGERY_LAYER, ...labels],
  };
}

// ------------------------------------------------- another provider's fonts

/** OpenFreeMap serves one font per request; these are its three. */
function notoFor(firstFont: string): string {
  const face = firstFont.toLowerCase();
  if (face.includes('italic')) return 'Noto Sans Italic';
  if (face.includes('bold') || face.includes('medium')) return 'Noto Sans Bold';
  return 'Noto Sans Regular';
}

/**
 * Another provider's style, set to fetch its fonts from OpenFreeMap. Our
 * hotspot names ask for Noto Sans Bold, which CARTO's and VersaTiles' font
 * servers answer with a 404 (checked 2026-10-15), so on their own glyphs the
 * names would vanish. Each of the provider's labels takes the Noto face
 * closest to the first font of its stack. Pure: the input is left alone.
 */
function withOurFonts(style: StyleSpecification): StyleSpecification {
  return {
    ...style,
    glyphs: `${OPENFREEMAP}/fonts/{fontstack}/{range}.pbf`,
    layers: style.layers.map((l) => {
      if (l.type !== 'symbol') return l;
      const stack: unknown = l.layout?.['text-font'];
      const first: unknown = Array.isArray(stack) ? stack[0] : undefined;
      if (typeof first !== 'string') return l;
      return { ...l, layout: { ...l.layout, 'text-font': [notoFor(first)] } };
    }),
  };
}

const isOpenFreeMap = (b: Basemap): boolean => b.url.startsWith(OPENFREEMAP);

/** A design MapLibre can take by its URL, with nothing to add. */
const isPlain = (b: Basemap): boolean => !b.detailed && !b.imagery && isOpenFreeMap(b);

/** What a design adds to the style it fetches: the photo, the detail, or our fonts on another host's. */
function dressed(b: Basemap, style: StyleSpecification): StyleSpecification {
  if (b.imagery) return satelliteStyle(style, b.imagery === 'labelled');
  if (b.detailed) return detailStyle(style);
  return isOpenFreeMap(b) ? style : withOurFonts(style);
}

/**
 * What to build a map with. `Map` takes a style URL or a style object and has
 * no transform hook, so a design with something to add (`dressed`) fetches
 * its style here and is dressed before the map exists — one request, the same one
 * MapLibre would have made, and no plain-gray flash first. If the fetch fails
 * the plain URL goes in instead, and MapLibre's own error path reports what it
 * can.
 */
export async function initialStyle(b: Basemap): Promise<StyleSpecification | string> {
  if (isPlain(b)) return b.url;
  try {
    const r = await fetch(b.url);
    if (!r.ok) return b.url;
    return dressed(b, (await r.json()) as StyleSpecification);
  } catch {
    return b.url;
  }
}

// -------------------------------------------------------------- the switch

/**
 * The hook MapLibre runs once a style has arrived and before it is committed.
 *
 * Two jobs. First, if the design asks for detail, add it. Second, carry our
 * own drawing across: `setStyle` replaces the whole style, sources and layers
 * included, which would silently drop the routes, the hotspots and a
 * half-drawn line. Ours are exactly the GeoJSON sources (the basemaps use
 * vector and raster only) and the layers drawn from them. They go on top, in
 * the order they had, so casing-under-line and draw-above-saved still hold.
 * The route and hotspot hooks never notice.
 */
function styleTransform(b: Basemap) {
  return (
    previous: StyleSpecification | undefined,
    next: StyleSpecification,
  ): StyleSpecification => {
    const styled = dressed(b, next);
    if (!previous) return styled;
    const ours = Object.fromEntries(
      Object.entries(previous.sources).filter(([, s]) => s.type === 'geojson'),
    );
    const ourLayers = previous.layers.filter((l) => 'source' in l && l.source in ours);
    // Our lines and fills go under the new style's labels — a road painted
    // blue still shows its name — and our own symbols (labels, arrows) on top.
    const firstLabel = styled.layers.findIndex((l) => l.type === 'symbol');
    const cut = firstLabel < 0 ? styled.layers.length : firstLabel;
    const ourMarks = ourLayers.filter((l) => l.type !== 'symbol');
    const ourSymbols = ourLayers.filter((l) => l.type === 'symbol');
    return {
      ...styled,
      sources: { ...styled.sources, ...ours },
      layers: [
        ...styled.layers.slice(0, cut),
        ...ourMarks,
        ...styled.layers.slice(cut),
        ...ourSymbols,
      ],
    };
  };
}

/**
 * Swap the basemap under everything drawn on it. The new style is not checked
 * against the spec as a whole: setStyle takes the map's `validateStyle: false`
 * (MapView.tsx) as its default, so no option is passed here (the cheap-phone
 * plan, step 1, 2026-10-04).
 */
export function applyBasemap(map: MapLibreMap, b: Basemap): void {
  map.setStyle(b.url, { transformStyle: styleTransform(b) });
}
