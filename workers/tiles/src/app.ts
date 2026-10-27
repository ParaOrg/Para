import { openArchive } from './archive';
import type { Archive } from './archive';
import { corsHeaders, isAllowedOrigin } from './cors';
import { createCurrentReader } from './current';
import type { Current } from './current';
import { ASSETS_PREFIX, STYLE_NAMES, styleKey } from './keys';
import type { StyleName } from './keys';
import { isValidTile } from './pmtiles';
import { rewriteStyle } from './styles';
import type { EdgeCache, Env, ExecutionContext } from './types';

const TILE_ROUTE = /^\/(\d+)\/(\d+)\/(\d+)\.pbf$/;
const STYLE_ROUTE = /^\/styles\/([a-z]+)$/;
const TILE_CACHE_CONTROL = 'public, max-age=86400, stale-while-revalidate=604800';
const STYLE_CACHE_CONTROL = 'public, max-age=3600, stale-while-revalidate=86400';
const ASSET_CACHE_CONTROL = 'public, max-age=604800';

function findStyleName(name: string): StyleName | undefined {
  return STYLE_NAMES.find((known) => known === name);
}

function text(status: number, message: string): Response {
  return new Response(message, {
    status,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

function withCors(response: Response, origin: string | null): Response {
  const out = new Response(response.body, response);
  for (const [name, value] of Object.entries(corsHeaders(origin))) out.headers.set(name, value);
  out.headers.append('Vary', 'Origin');
  return out;
}

function notModified(request: Request, etag: string): Response | undefined {
  return request.headers.get('If-None-Match') === etag
    ? new Response(null, { status: 304, headers: { ETag: etag } })
    : undefined;
}

export function createApp() {
  // One reader and one open archive per isolate; a new build's file name replaces the archive.
  const readers = new WeakMap<Env['TILES'], () => Promise<Current>>();
  let archive: { file: string; opened: Promise<Archive> } | undefined;

  function currentFor(env: Env): Promise<Current> {
    let read = readers.get(env.TILES);
    if (!read) {
      read = createCurrentReader(env.TILES);
      readers.set(env.TILES, read);
    }
    return read();
  }

  function archiveFor(env: Env, current: Current, edgeCache?: EdgeCache): Promise<Archive> {
    if (archive?.file !== current.file) {
      const opened = openArchive(env.TILES, current.file, edgeCache);
      // A failed open must not stay cached.
      opened.catch(() => {
        if (archive?.opened === opened) archive = undefined;
      });
      archive = { file: current.file, opened };
    }
    return archive.opened;
  }

  async function tile(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
    z: number,
    x: number,
    y: number,
  ) {
    if (!isValidTile(z, x, y)) return text(400, 'Not a tile address.');
    const current = await currentFor(env);
    const etag = `"${current.file}"`;
    const early = notModified(request, etag);
    if (early) return early;

    // Cache API entries are stored only on a custom domain; on workers.dev every request
    // below reads R2 (the open archive still avoids re-reading the directories).
    const edgeCache = globalThis.caches?.default;
    const cacheKey = new Request(`https://tiles.internal/${current.file}/${z}/${x}/${y}`);
    const hit = await edgeCache?.match(cacheKey);
    if (hit) return hit;

    const opened = await archiveFor(env, current, edgeCache);
    const found = await opened.getTile(z, x, y);
    if (!found)
      return new Response(null, { status: 204, headers: { 'Cache-Control': TILE_CACHE_CONTROL } });
    const headers = new Headers({
      'Content-Type': 'application/x-protobuf',
      'Cache-Control': TILE_CACHE_CONTROL,
      ETag: etag,
    });
    if (found.isGzip) headers.set('Content-Encoding', 'gzip');
    const response = new Response(found.bytes, { headers });
    if (edgeCache) ctx.waitUntil(edgeCache.put(cacheKey, response.clone()));
    return response;
  }

  async function style(env: Env, origin: string, name: StyleName): Promise<Response> {
    const current = await currentFor(env);
    const [object, opened] = await Promise.all([
      env.TILES.get(styleKey(name)),
      archiveFor(env, current, globalThis.caches?.default),
    ]);
    if (!object) return text(404, 'Style not published.');
    const original: unknown = JSON.parse(await new Response(object.body).text());
    return Response.json(rewriteStyle(original, origin, opened.header), {
      headers: { 'Cache-Control': STYLE_CACHE_CONTROL },
    });
  }

  async function asset(env: Env, key: string): Promise<Response> {
    const object = await env.TILES.get(key);
    if (!object) return text(404, 'Not found.');
    const type = key.endsWith('.json')
      ? 'application/json'
      : key.endsWith('.png')
        ? 'image/png'
        : 'application/x-protobuf';
    return new Response(object.body, {
      headers: {
        'Content-Type': type,
        'Cache-Control': ASSET_CACHE_CONTROL,
        ETag: object.httpEtag,
      },
    });
  }

  async function route(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const tileMatch = TILE_ROUTE.exec(url.pathname);
    if (tileMatch) {
      const [z, x, y] = tileMatch.slice(1).map(Number);
      return tile(request, env, ctx, z ?? -1, x ?? -1, y ?? -1);
    }
    const styleMatch = STYLE_ROUTE.exec(url.pathname);
    const styleName = styleMatch?.[1] ? findStyleName(styleMatch[1]) : undefined;
    if (styleName) return style(env, url.origin, styleName);
    if (url.pathname.startsWith(`/${ASSETS_PREFIX}`) && !url.pathname.includes('..'))
      return asset(env, decodeURIComponent(url.pathname.slice(1)));
    if (url.pathname === '/health') {
      const { builtAt, file, tiles } = await currentFor(env);
      return Response.json({ builtAt, file, tiles }, { headers: { 'Cache-Control': 'no-store' } });
    }
    return text(404, 'Not found.');
  }

  return async function handle(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    const origin = request.headers.get('Origin');
    if (origin && !isAllowedOrigin(origin, env.EXTRA_ORIGINS))
      return text(403, 'Origin not allowed.');
    if (request.method === 'OPTIONS') return withCors(new Response(null, { status: 204 }), origin);
    if (request.method !== 'GET' && request.method !== 'HEAD')
      return text(405, 'Method not allowed.');
    try {
      return withCors(await route(request, env, ctx), origin);
    } catch (error) {
      console.error('tiles worker failed', error);
      return withCors(text(503, 'The map tiles are unavailable. Try again shortly.'), origin);
    }
  };
}
