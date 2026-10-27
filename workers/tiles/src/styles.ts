// Rewrites one of OpenFreeMap's styles to read this Worker's tiles, sprite and glyphs.
import type { PmtilesHeader } from './pmtiles';

export const ATTRIBUTION = '© OpenMapTiles © OpenStreetMap contributors';
const UPSTREAM = 'https://tiles.openfreemap.org/';
const NATURAL_EARTH = '/natural_earth/';

type Json = Record<string, unknown>;

function isRecord(value: unknown): value is Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function mentionsNaturalEarth(source: Json): boolean {
  const urls = [source.url, ...(Array.isArray(source.tiles) ? source.tiles : [])];
  return urls.some((url) => typeof url === 'string' && url.includes(NATURAL_EARTH));
}

function ownAsset(url: unknown, origin: string): unknown {
  return typeof url === 'string' && url.startsWith(UPSTREAM)
    ? `${origin}/assets/${url.slice(UPSTREAM.length)}`
    : url;
}

export function rewriteStyle(style: unknown, origin: string, header: PmtilesHeader): Json {
  if (!isRecord(style) || !isRecord(style.sources) || !Array.isArray(style.layers))
    throw new Error('style is not a MapLibre style');

  const dropped = new Set<string>();
  const sources: Json = {};
  for (const [name, source] of Object.entries(style.sources)) {
    if (name === 'openmaptiles') {
      sources[name] = {
        type: 'vector',
        tiles: [`${origin}/{z}/{x}/{y}.pbf`],
        minzoom: 0,
        maxzoom: 14,
        bounds: header.bounds,
        attribution: ATTRIBUTION,
      };
    } else if (isRecord(source) && mentionsNaturalEarth(source)) {
      dropped.add(name);
    } else {
      sources[name] = source;
    }
  }
  if (!('openmaptiles' in sources)) throw new Error('style has no openmaptiles source');

  const layers = style.layers.filter(
    (layer) => !(isRecord(layer) && typeof layer.source === 'string' && dropped.has(layer.source)),
  );
  return {
    ...style,
    sources,
    layers,
    sprite: ownAsset(style.sprite, origin),
    glyphs: ownAsset(style.glyphs, origin),
  };
}
