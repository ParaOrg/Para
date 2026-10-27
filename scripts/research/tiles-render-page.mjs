// The page the render script drives: one basemap design, as the app dresses it, over either
// OpenFreeMap's tiles or the spike's own. Bundled by tiles-render.vite.config.mjs.
import { Map as MapLibreMap, setWorkerUrl } from 'maplibre-gl';
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';

import { BASEMAPS, initialStyle } from '@/features/routes/map/basemap';

setWorkerUrl(maplibreWorkerUrl);

const IDLE_TIMEOUT_MS = 60_000;
let current = null;

/** The app's own dressing of a design: the style it would hand to MapLibre. */
async function dressedStyle(basemap) {
  const style = await initialStyle(basemap);
  if (typeof style !== 'string') return style;
  return (await fetch(style)).json();
}

window.renderMap = async ({ basemapId, source, lng, lat, zoom }) => {
  current?.remove();
  const basemap = BASEMAPS.find((b) => b.id === basemapId);
  if (!basemap) throw new Error(`no design ${basemapId}`);
  const style = await dressedStyle(basemap);
  if (source === 'ours') {
    style.sources.openmaptiles = {
      type: 'vector',
      tiles: [`${location.origin}/tiles/{z}/{x}/{y}`],
      minzoom: 0,
      maxzoom: 14,
    };
  }
  const errors = [];
  const map = new MapLibreMap({
    container: 'map',
    style,
    center: [lng, lat],
    zoom,
    interactive: false,
    fadeDuration: 0,
    attributionControl: false,
  });
  map.on('error', (e) => errors.push(String(e.error?.message ?? e.error)));
  current = map;
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('map never went idle')), IDLE_TIMEOUT_MS);
    map.once('idle', () => {
      clearTimeout(timer);
      resolve();
    });
  });
  return { errors, layers: style.layers.length };
};
window.renderReady = true;
