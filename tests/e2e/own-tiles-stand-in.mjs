// Stands in for Para's own tiles server (workers/tiles) on a loopback address, for a build made
// with VITE_BASEMAP_HOST set to it (http://127.0.0.1:<port>). Not a suite itself: pwa-test starts
// it when the build it runs names a host other than OpenFreeMap. The styles are OpenFreeMap's,
// rewritten by the Worker's own rewriteStyle, so the page and the offline worker see the addresses
// the real server hands out (tiles at the root, sprite and glyphs under /assets); the bytes behind
// them come from OpenFreeMap, fetched once each. A real server rather than Playwright routes: a
// routed request held in the offline worker keeps a new worker from taking over, and the update
// checks would fail for that alone. Offline, the browser reaches it no more than any other host.
import { createServer } from 'node:http';

import { rewriteStyle } from '../../workers/tiles/src/styles.ts';

export const OPENFREEMAP_HOST = 'https://tiles.openfreemap.org';
/** The address CI builds pwa-test's own-tiles run with. */
export const STAND_IN_HOST = 'http://127.0.0.1:4390';

/** The basemap host a build was made for, read off its index.html's preconnect. */
export function builtBasemapHost(indexHtml) {
  return /<link rel="preconnect" href="([^"]+)" crossorigin \/>/.exec(indexHtml)?.[1] ?? null;
}

/** Serves `host` (a loopback origin) from OpenFreeMap. Resolves to a function that stops it. */
export async function startOwnTilesStandIn(host) {
  const { hostname, port } = new URL(host);
  if (hostname !== '127.0.0.1' || !port) {
    throw new Error(`build with VITE_BASEMAP_HOST=${STAND_IN_HOST} to run against the stand-in`);
  }
  const tileJson = await (await fetch(`${OPENFREEMAP_HOST}/planet`)).json();
  const tileUrl = tileJson.tiles[0];
  const header = { maxZoom: tileJson.maxzoom, bounds: tileJson.bounds };
  const positron = await (await fetch(`${OPENFREEMAP_HOST}/styles/positron`)).json();
  // OpenFreeMap keeps its sprite in a versioned folder; the Worker serves it flat.
  const spriteFolder = positron.sprite.slice(0, positron.sprite.lastIndexOf('/') + 1);

  /** The OpenFreeMap address behind one of the host's, and whether it is a style to rewrite. */
  const upstreamOf = (path) => {
    const style = /^\/styles\/([\w-]+)$/.exec(path);
    if (style) return { url: `${OPENFREEMAP_HOST}/styles/${style[1]}`, isStyle: true };
    const tile = /^\/(\d+)\/(\d+)\/(\d+)\.pbf$/.exec(path);
    if (tile) {
      const [, z, x, y] = tile;
      return { url: tileUrl.replace('{z}', z).replace('{x}', x).replace('{y}', y) };
    }
    if (path.startsWith('/assets/sprites/')) {
      return { url: spriteFolder + path.slice('/assets/sprites/'.length) };
    }
    if (path.startsWith('/assets/')) return { url: `${OPENFREEMAP_HOST}/${path.slice(8)}` };
    return null;
  };

  const answers = new Map();
  /** OpenFreeMap's answer for one address, as the host would give it, fetched once. */
  const answerOf = (upstream) => {
    if (!answers.has(upstream.url)) {
      const answer = fetchAnswer(upstream);
      answers.set(upstream.url, answer);
      answer.catch(() => answers.delete(upstream.url));
    }
    return answers.get(upstream.url);
  };
  const fetchAnswer = async (upstream) => {
    const res = await fetch(upstream.url, { signal: AbortSignal.timeout(10_000) });
    const type = res.headers.get('content-type') ?? 'application/octet-stream';
    if (!upstream.isStyle || !res.ok) {
      return { status: res.status, type, body: Buffer.from(await res.arrayBuffer()) };
    }
    const style = rewriteStyle(await res.json(), host, header, 'stand-in');
    return { status: 200, type, body: JSON.stringify(style) };
  };

  const server = createServer(async (req, res) => {
    const cors = { 'access-control-allow-origin': '*' };
    const upstream = upstreamOf(decodeURIComponent(new URL(req.url, host).pathname));
    const answer = upstream ? await answerOf(upstream).catch(() => null) : null;
    if (!answer) {
      res.writeHead(upstream ? 502 : 404, cors).end();
      return;
    }
    res.writeHead(answer.status, { ...cors, 'content-type': answer.type }).end(answer.body);
  });
  await new Promise((resolve) => server.listen(Number(port), hostname, resolve));
  return () => new Promise((resolve) => server.close(resolve));
}
