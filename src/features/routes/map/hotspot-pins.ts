import type {
  ExpressionSpecification,
  FilterSpecification,
  MapLibreMap,
  SymbolLayerSpecification,
} from 'maplibre-gl';

import { MAP_COLOURS } from '@/design-system/foundation/map-colours';

import { LAYERS } from './layers';
import { METRES_PER_PX_AT_ZOOM_0 } from './saved-hotspots-labels';
import { boxCentre } from '../geo/box-centre';
import { hotspotRing, type Hotspot, type HotspotKind } from '../model/hotspots';

/*
 * A hotspot's pin (MapPins, Figma 4570:16579): a flag in its kind's colour
 * standing at the middle of its box, zoomed in, and a plain dot there zoomed
 * out. The box is drawn as ever, at every zoom; the pin only says where it is.
 * Its own point source, laid out with the boxes' (useSavedHotspotsLayers).
 * The dot comes with the boxes; the pin's images and its layer are fetched
 * just after them (hotspot-pin-images.ts), as no opening view is zoomed in
 * far enough to show one.
 */

export const PINS_SRC = 'saved-stops-pins';
export const PIN = LAYERS.hotspotsPin;
export const DOT = LAYERS.hotspotsDot;

/** The phone the owner measures the map on: 393 px across. */
const PHONE_WIDTH_PX = 393;
/** The most ground a phone's width may span with the pins drawn whole (the owner's call). */
const PINS_WITHIN_M = 500;

/**
 * The zoom from which a hotspot shows its pin, and below which its dot: the
 * zoom at which a 393 px phone spans 500 m at Manila's latitude, 15.86 with
 * MapLibre's 512 px tiles. One zoom on every page, so the pins come in at the
 * same scale everywhere.
 */
export const PINS_FROM_ZOOM = Math.log2((METRES_PER_PX_AT_ZOOM_0 * PHONE_WIDTH_PX) / PINS_WITHIN_M);

/** The pin's colour and its dot's, the same (MapPins). */
export const PIN_COLOUR: Record<HotspotKind, string> = {
  terminal: MAP_COLOURS['Map/Pin/Terminal/surface'],
  hintuan: MAP_COLOURS['Map/Pin/Hintuan/surface'],
};

/**
 * MapPins' geometry, in CSS pixels: a head 28 across and 28 tall (a 24 px
 * icon in 2 px of padding), round but for its bottom-left corner; under that
 * corner, overlapping it by 2, a stem 4 wide and 22 tall, round at its foot,
 * which is the pin's point.
 */
export const PIN_SHAPE = { width: 28, height: 48, head: 28, stemWidth: 4, padding: 2, icon: 24 };

/** Where the pin's point is, from the image's bottom-left corner: the stem's middle, at its foot. */
const PIN_POINT_X = PIN_SHAPE.stemWidth / 2;

/** The dot's diameter, zoomed out: 16 px (the owner's call). */
const DOT_SIZE_PX = 16;

export const pinImageOf = (kind: HotspotKind) => `hotspot-pin-${kind}`;

/** Whether the map is asking for a pin it has lost (a basemap switch): answer with addPinImages. */
export const isPinImage = (id: string) =>
  id === pinImageOf('terminal') || id === pinImageOf('hintuan');

/** A terminal's dot and pin drawn over a hintuan's where they meet, as its name is (saved-hotspots-labels.ts). */
const TERMINAL_ON_TOP: ExpressionSpecification = ['match', ['get', 'kind'], 'terminal', 1, 0];

/**
 * The pin's layer, from PINS_FROM_ZOOM (the dot's is below it, never both):
 * its point the stem's foot. Always drawn, and never in another symbol's way:
 * a pin marks a box, whatever else is near.
 */
export const PIN_LAYER = {
  id: PIN,
  type: 'symbol',
  source: PINS_SRC,
  minzoom: PINS_FROM_ZOOM,
  layout: {
    'icon-image': [
      'match',
      ['get', 'kind'],
      'terminal',
      pinImageOf('terminal'),
      pinImageOf('hintuan'),
    ],
    'icon-anchor': 'bottom-left',
    'icon-offset': [-PIN_POINT_X, 0],
    'icon-allow-overlap': true,
    'icon-ignore-placement': true,
    'symbol-sort-key': TERMINAL_ON_TOP,
  },
} satisfies SymbolLayerSpecification;

/** Each box's middle, a point inside it (boxCentre), with the hotspot's id and kind. */
export function hotspotPinsData(hotspots: readonly Hotspot[]) {
  return {
    type: 'FeatureCollection' as const,
    features: hotspots
      .filter((s) => s.area !== null && hotspotRing(s).length >= 3)
      .map((s) => ({
        type: 'Feature' as const,
        properties: { id: s.id, kind: s.kind },
        geometry: { type: 'Point' as const, coordinates: boxCentre(hotspotRing(s)) },
      })),
  };
}

/** The pins' filter, the hotspot being edited (`hidden`, '' for none) left out. */
export const pinsOf = (hidden: string): FilterSpecification => ['!=', ['get', 'id'], hidden];

/**
 * The pins' source, laid out from `hotspots`, and the dots' layer, below
 * PINS_FROM_ZOOM, added on top or under `before`. The pins' own layer joins it
 * once their images are here (addPinLayer).
 */
export function addHotspotPins(
  map: Pick<MapLibreMap, 'addSource' | 'addLayer'>,
  hotspots: readonly Hotspot[],
  before?: string,
): void {
  map.addSource(PINS_SRC, { type: 'geojson', data: hotspotPinsData(hotspots) });
  map.addLayer(
    {
      id: DOT,
      type: 'circle',
      source: PINS_SRC,
      maxzoom: PINS_FROM_ZOOM,
      layout: { 'circle-sort-key': TERMINAL_ON_TOP },
      paint: {
        'circle-radius': DOT_SIZE_PX / 2,
        'circle-color': [
          'match',
          ['get', 'kind'],
          'terminal',
          PIN_COLOUR.terminal,
          PIN_COLOUR.hintuan,
        ],
      },
    },
    before,
  );
}
