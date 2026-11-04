import type { FilterSpecification, MapLibreMap } from 'maplibre-gl';

import { MAP_PAINT } from '@/design-system/foundation/map-colours';

import hintuanIcon from './hintuan-pin-icon.svg?raw';
import { PIN_COLOUR, PIN_LAYER, PIN_SHAPE, pinImageOf } from './hotspot-pins';
import { HINTUAN_LABEL } from './saved-hotspots-labels';
import terminalIcon from './terminal-pin-icon.svg?raw';
import type { HotspotKind } from '../model/hotspots';

/*
 * The pins' images (MapPins, 4570:16579) and their layer: a chunk of their
 * own, fetched once the boxes are drawn (vite.config.ts keeps it out of
 * `shared`). Drawn on a canvas as the flagstop is (trail-flag.ts): the head
 * and the stem in the kind's colour, the kind's icon (Figma's own SVG, as
 * downloaded) over the head in the map's white.
 */

const ICONS: Record<HotspotKind, string> = { terminal: terminalIcon, hintuan: hintuanIcon };

/** An icon's one path and its fill rule, as its SVG writes them; its white is the map's own. */
function iconPath(svg: string): { path: Path2D; rule: CanvasFillRule } {
  const d = /\sd="([^"]+)"/.exec(svg)?.[1] ?? '';
  const rule = /fill-rule="evenodd"/.test(svg) ? 'evenodd' : 'nonzero';
  return { path: new Path2D(d), rule };
}

/** A kind's pin as an image, at twice its size for a sharp screen. Drawn on a canvas, so in the browser only. */
function pinImage(kind: HotspotKind): ImageData | null {
  const { width, height, head, stemWidth, padding } = PIN_SHAPE;
  const scale = 2;
  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;
  const context = canvas.getContext('2d');
  if (!context) return null;
  context.scale(scale, scale);
  context.fillStyle = PIN_COLOUR[kind];
  const round = width / 2;
  context.beginPath();
  // The head: round at its top two corners and its bottom right, square at its bottom left.
  context.roundRect(0, 0, width, head, [round, round, round, 0]);
  // The stem, from 2 px up inside the head down to the point, round at its foot.
  const stemTop = head - padding;
  context.roundRect(0, stemTop, stemWidth, height - stemTop, [0, 0, stemWidth / 2, stemWidth / 2]);
  context.fill();
  const icon = iconPath(ICONS[kind]);
  context.translate(padding, padding);
  context.fillStyle = MAP_PAINT['Paint/casing'];
  context.fill(icon.path, icon.rule);
  return context.getImageData(0, 0, canvas.width, canvas.height);
}

/** Gives the map both pins where it has none: as the pins' layer is added, and after a basemap swaps the style. */
export function addPinImages(map: Pick<MapLibreMap, 'hasImage' | 'addImage'>): void {
  for (const kind of ['terminal', 'hintuan'] as const) {
    if (map.hasImage(pinImageOf(kind))) continue;
    const image = pinImage(kind);
    if (image) map.addImage(pinImageOf(kind), image, { pixelRatio: 2 });
  }
}

/**
 * The pins' images and their layer, right under the hotspots' names: over the
 * boxes, the routes and the dots, wherever the names were put. `filter`
 * leaves out the box being edited, when one is (pinsOf). Once.
 */
export function addPinLayer(map: MapLibreMap, filter?: FilterSpecification): void {
  if (map.getLayer(PIN_LAYER.id) || !map.getLayer(HINTUAN_LABEL)) return;
  addPinImages(map);
  map.addLayer(filter ? { ...PIN_LAYER, filter } : PIN_LAYER, HINTUAN_LABEL);
}
