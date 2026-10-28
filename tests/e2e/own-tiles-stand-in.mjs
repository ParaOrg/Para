// Stands in for Para's own tiles server (workers/tiles) in a browser context, for a build made
// with VITE_BASEMAP_HOST set to it. Not a suite itself: pwa-test uses it when the build it runs
// names a host other than OpenFreeMap. The styles are OpenFreeMap's, rewritten by the Worker's own
// rewriteStyle, so the page and the offline worker see the addresses the real server hands out
// (tiles at the root, sprite and glyphs under /assets); the bytes behind them come from
// OpenFreeMap. While the context is offline, every request to the host fails as the network would.
import { rewriteStyle } from '../../workers/tiles/src/styles.ts';

export const OPENFREEMAP_HOST = 'https://tiles.openfreemap.org';

/** The basemap host a build was made for, read off its index.html's preconnect. */
export function builtBasemapHost(indexHtml) {
  return /<link rel="preconnect" href="([^"]+)" crossorigin \/>/.exec(indexHtml)?.[1] ?? null;
}

/** Answers `host`'s styles, tiles, sprite and glyphs in `ctx`, from OpenFreeMap. */
export async function standInForOwnTiles(ctx, host) {
  const tileJson = await (await fetch(`${OPENFREEMAP_HOST}/planet`)).json();
  const tileUrl = tileJson.tiles[0];
  const header = { maxZoom: tileJson.maxzoom, bounds: tileJson.bounds };
  const positron = await (await fetch(`${OPENFREEMAP_HOST}/styles/positron`)).json();
  // OpenFreeMap keeps its sprite in a versioned folder; the Worker serves it flat.
  const spriteFolder = positron.sprite.slice(0, positron.sprite.lastIndexOf('/') + 1);

  let isOffline = false;
  const setOffline = ctx.setOffline.bind(ctx);
  ctx.setOffline = async (offline) => {
    isOffline = offline;
    return setOffline(offline);
  };

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

  await ctx.route(`${host}/**`, async (route) => {
    if (isOffline) return route.abort('internetdisconnected');
    const url = new URL(route.request().url());
    const upstream = upstreamOf(decodeURIComponent(url.pathname));
    if (!upstream) return route.fulfill({ status: 404, body: 'not a tiles server path' });
    const res = await fetch(upstream.url);
    const headers = {
      'content-type': res.headers.get('content-type') ?? 'application/octet-stream',
      'access-control-allow-origin': '*',
    };
    if (!upstream.isStyle || !res.ok) {
      return route.fulfill({
        status: res.status,
        headers,
        body: Buffer.from(await res.arrayBuffer()),
      });
    }
    const style = rewriteStyle(await res.json(), host, header, 'stand-in');
    return route.fulfill({ status: 200, headers, body: JSON.stringify(style) });
  });
}
