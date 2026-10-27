// Rewrites one of OpenFreeMap's styles to read this Worker's tiles, sprite and glyphs.
import type { PmtilesHeader } from './pmtiles';

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

// OpenFreeMap keeps its sprite in a versioned folder (sprites/ofm_f384/ofm); the build stores
// the files flat, as assets/sprites/ofm.json and so on.
function ownSprite(url: unknown, origin: string): unknown {
  return typeof url === 'string'
    ? url.replace(
        /^https:\/\/tiles\.openfreemap\.org\/sprites\/[^/]+\//,
        `${origin}/assets/sprites/`,
      )
    : url;
}

// The source carries no `attribution`: the app credits OpenMapTiles and OpenStreetMap itself, with
// links (src/features/routes/map/map-attribution.ts), and these styles are served to our origins only.
// The tile address carries the build (`?v=<archive file>`): phones keep tiles cache-first for a
// month, so without it a new build would show beside the old one, tile by tile. The tile route reads
// the path only, so the query changes nothing on this side.
export function rewriteStyle(
  style: unknown,
  origin: string,
  header: PmtilesHeader,
  build: string,
): Json {
  if (!isRecord(style) || !isRecord(style.sources) || !Array.isArray(style.layers))
    throw new Error('style is not a MapLibre style');

  const dropped = new Set<string>();
  const sources: Json = {};
  for (const [name, source] of Object.entries(style.sources)) {
    if (name === 'openmaptiles') {
      sources[name] = {
        type: 'vector',
        tiles: [`${origin}/{z}/{x}/{y}.pbf?v=${encodeURIComponent(build)}`],
        minzoom: 0,
        maxzoom: header.maxZoom,
        bounds: header.bounds,
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
    sprite: ownSprite(style.sprite, origin),
    glyphs: ownAsset(style.glyphs, origin),
  };
}
