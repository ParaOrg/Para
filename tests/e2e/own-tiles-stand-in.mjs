// Stands in for Para's own tiles server (workers/tiles) on a loopback address, for a build made
// with VITE_BASEMAP_HOST set to it (http://127.0.0.1:<port>). Not a suite itself: pwa-test starts
// it when the build it runs names a host other than OpenFreeMap. The styles are the basemap
// fixtures (fixtures/basemap/), rewritten by the Worker's own rewriteStyle, so the page and the
// offline worker see the addresses the real server hands out (tiles at the root, sprite and glyphs
// under /assets). Every answer comes from those fixtures, through the basemap stand-in's
// basemapAnswer: nothing here reaches the network, and an address the fixtures do not cover is
// named at the end of the run and fails it. A real server rather than Playwright routes: a routed
// request held in the offline worker keeps a new worker from taking over, and the update checks
// would fail for that alone. Offline, the browser reaches it no more than any other host.
import { createServer } from 'node:http';

import { rewriteStyle } from '../../workers/tiles/src/styles.ts';

import { basemapAnswer } from './lib/stand-ins.mjs';

export const OPENFREEMAP_HOST = 'https://tiles.openfreemap.org';
/** The address CI builds pwa-test's own-tiles run with. */
export const STAND_IN_HOST = 'http://127.0.0.1:4390';

/** The basemap host a build was made for, read off its index.html's preconnect. */
export function builtBasemapHost(indexHtml) {
  return /<link rel="preconnect" href="([^"]+)" crossorigin \/>/.exec(indexHtml)?.[1] ?? null;
}

/** The OpenFreeMap address the fixtures answer for one of the host's, and whether it is a style. */
function upstreamOf(path) {
  const style = /^\/styles\/([\w-]+)$/.exec(path);
  if (style) return { url: `${OPENFREEMAP_HOST}/styles/${style[1]}`, isStyle: true };
  const tile = /^\/(\d+)\/(\d+)\/(\d+)\.pbf$/.exec(path);
  if (tile) return { url: `${OPENFREEMAP_HOST}/planet/stand-in/${tile.slice(1).join('/')}.pbf` };
  // OpenFreeMap keeps its sprite in a versioned folder; the Worker serves it flat.
  if (path.startsWith('/assets/sprites/')) {
    return { url: `${OPENFREEMAP_HOST}/sprites/ofm_f384/${path.slice('/assets/sprites/'.length)}` };
  }
  if (path.startsWith('/assets/')) return { url: `${OPENFREEMAP_HOST}/${path.slice(8)}` };
  return null;
}

/** The fixtures' answer for one of the host's addresses, as the host would give it. */
function answerOf(path, host, header) {
  const upstream = upstreamOf(path);
  // An address the real server does not have: the fixtures have no answer, and the run names it.
  if (!upstream) return basemapAnswer(`${host}${path}`);
  const answer = basemapAnswer(upstream.url);
  if (!upstream.isStyle || (answer.status ?? 200) !== 200) return answer;
  const style = rewriteStyle(JSON.parse(String(answer.body)), host, header, 'stand-in');
  return { contentType: 'application/json', body: JSON.stringify(style) };
}

/** Serves `host` (a loopback origin) from the basemap fixtures. Resolves to a function that stops it. */
export async function startOwnTilesStandIn(host) {
  const { hostname, port } = new URL(host);
  if (hostname !== '127.0.0.1' || !port) {
    throw new Error(`build with VITE_BASEMAP_HOST=${STAND_IN_HOST} to run against the stand-in`);
  }
  const tileJson = JSON.parse(String(basemapAnswer(`${OPENFREEMAP_HOST}/planet`).body));
  // The fixture's TileJSON names no bounds; the real server's archive covers the world.
  const header = { maxZoom: tileJson.maxzoom, bounds: [-180, -85.051129, 180, 85.051129] };

  const server = createServer((req, res) => {
    const cors = { 'access-control-allow-origin': '*' };
    const path = decodeURIComponent(new URL(req.url, host).pathname);
    const answer = answerOf(path, host, header);
    res
      .writeHead(answer.status ?? 200, { ...cors, 'content-type': answer.contentType })
      .end(answer.body);
  });
  await new Promise((resolve) => server.listen(Number(port), hostname, resolve));
  return () => new Promise((resolve) => server.close(resolve));
}
