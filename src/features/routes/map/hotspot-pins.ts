import type {
  ExpressionSpecification,
  FilterSpecification,
  MapLibreMap,
  SymbolLayerSpecification,
} from 'maplibre-gl';

import { MAP_COLOURS } from '@/design-system/foundation/map-colours';
import { zoomForScale } from '@/shared/utils/geo';

import { LAYERS } from './layers';
import { SCALE_RULE_LAT } from './saved-hotspots-labels';
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

/** The most ground the scale bar's width may cover with the pins drawn. */
const PINS_WITHIN_M = 1000;

/**
 * The zoom from which a hotspot shows its pin, and below which its dot: the
 * moment the scale bar first reads 500 m (the owner's choice), once its width
 * covers less than 1000 m, zoom 12.89. The bar steps 1, 2, 3, 5, so it reads
 * 1 km down to 1000 m and 500 m below that. One zoom on every page, so the
 * pins come in at the same scale everywhere; the names follow a zoom later
 * (NAMES_FROM).
 */
export const PINS_FROM_ZOOM = zoomForScale(PINS_WITHIN_M, SCALE_RULE_LAT);

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

/**
 * The dot's diameter: 6 px up to DOT_SMALL_UNTIL_ZOOM, growing evenly to 16 px
 * at PINS_FROM_ZOOM, where the pin takes over (the owner's call). Full-size
 * dots at a whole city's view, as the public map opens, join into a chain
 * over the route lines; small ones leave the lines readable.
 */
const DOT_SMALL_SIZE_PX = 6;
const DOT_FULL_SIZE_PX = 16;
const DOT_SMALL_UNTIL_ZOOM = 11;

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
        'circle-radius': [
          'interpolate',
          ['linear'],
          ['zoom'],
          DOT_SMALL_UNTIL_ZOOM,
          DOT_SMALL_SIZE_PX / 2,
          PINS_FROM_ZOOM,
          DOT_FULL_SIZE_PX / 2,
        ],
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
