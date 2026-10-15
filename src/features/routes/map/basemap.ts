import type {
  LayerSpecification,
  MapLibreMap,
  StyleSpecification,
  SymbolLayerSpecification,
} from 'maplibre-gl';

import { MAP_PAINT } from '@/design-system/foundation/map-colours';

import { monochromeStyle } from './monochrome';
import { mutedStyle } from './muted';
import { terrainStyle } from './terrain';

/**
 * The basemap designs a viewer can choose between, the owner's three
 * (2026-10-15): Monochrome, Colour and Fiord. All of them are OpenFreeMap
 * styles over the same `/planet` tiles, sprite and glyph endpoint, so a switch
 * fetches one small style file and nothing a phone has cached is wasted.
 *
 * Monochrome is the default: Positron, as detailed as its tiles allow and
 * still only grays, so the routes and hotspots painted on top carry all the
 * colour (monochrome.ts). Colour is Liberty, muted so the routes still carry
 * the strongest colour (muted.ts). Fiord, dark blue-gray, is for night.
 * Terrain, on this branch to look at, is the muted Colour with the hills
 * shaded and raised when the map is tilted (terrain.ts).
 *
 * Satellite is the studio's only (the owner, 2026-10-15): the studio adds it
 * to these (features/studio), so the photo's host never reaches the public
 * page.
 */
export interface Basemap {
  /** What the device remembers; the studio's designs bring ids of their own. */
  id: string;
  label: string;
  url: string;
  /** What is done to the style before it is drawn (see `dressed`). */
  dressing?: Dressing;
  /** A photo of the ground in place of Positron's drawing (see `satelliteStyle`). */
  imagery?: Imagery;
}

/** Monochrome's detail on Positron, Liberty's colours muted, or those with the ground's shape. */
export type Dressing = 'monochrome' | 'muted' | 'terrain';

export interface Imagery {
  /** The photo's tile address, with `{z}`, `{x}` and `{y}`. */
  tiles: string;
  /** The credit its provider asks for, shown in the map's attribution. */
  attribution: string;
  /** Positron's labels over the photo, or none at all. */
  isLabelled: boolean;
}

const OPENFREEMAP = 'https://tiles.openfreemap.org';

export const BASEMAPS: readonly Basemap[] = [
  // `positron` still, so a device that chose the old Gray or nothing at all
  // keeps the default; Gray, detailed (`positron-detailed`) and Dark (`dark`)
  // are gone, and a device that chose one falls back to it.
  {
    id: 'positron',
    label: 'Monochrome',
    url: `${OPENFREEMAP}/styles/positron`,
    dressing: 'monochrome',
  },
  { id: 'liberty', label: 'Colour', url: `${OPENFREEMAP}/styles/liberty`, dressing: 'muted' },
  { id: 'fiord', label: 'Fiord', url: `${OPENFREEMAP}/styles/fiord` },
  { id: 'terrain', label: 'Terrain', url: `${OPENFREEMAP}/styles/liberty`, dressing: 'terrain' },
];

export const DEFAULT_BASEMAP = BASEMAPS[0];

/**
 * Remembered on the device only, and only once a viewer has chosen: a visitor
 * who never touches the control leaves the browser's storage empty, which the
 * visitor test asserts and the no-tracking promise relies on.
 */
const STORAGE_KEY = 'parapo.basemap.v1';

/** The remembered design among `offered`; one this page does not offer (the studio's satellite, on the public map) falls back to the default. */
export function readBasemap(offered: readonly Basemap[]): Basemap {
  try {
    const id = localStorage.getItem(STORAGE_KEY);
    return offered.find((b) => b.id === id) ?? DEFAULT_BASEMAP;
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

// ------------------------------------------------------------- the photo

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
 * already. Unlabelled keeps no label at all. Pure: the input is left alone.
 */
function satelliteStyle(style: StyleSpecification, imagery: Imagery): StyleSpecification {
  const labels = imagery.isLabelled
    ? style.layers.filter((l): l is SymbolLayerSpecification => l.type === 'symbol').map(onPhoto)
    : [];
  return {
    ...style,
    sources: {
      ...style.sources,
      imagery: {
        type: 'raster',
        tiles: [imagery.tiles],
        tileSize: 256,
        maxzoom: 19,
        attribution: imagery.attribution,
      },
    },
    layers: [IMAGERY_LAYER, ...labels],
  };
}

/** A design MapLibre can take by its URL, with nothing to add. */
const isPlain = (b: Basemap): boolean => !b.dressing && !b.imagery;

/** What a design does to the style it fetches: the photo, Monochrome's detail, Colour's muting, or Terrain's hills. */
function dressed(b: Basemap, style: StyleSpecification): StyleSpecification {
  if (b.imagery) return satelliteStyle(style, b.imagery);
  if (b.dressing === 'monochrome') return monochromeStyle(style);
  if (b.dressing === 'muted') return mutedStyle(style);
  if (b.dressing === 'terrain') return terrainStyle(mutedStyle(style));
  return style;
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
 * Two jobs. First, dress the design (`dressed`). Second, carry our
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
