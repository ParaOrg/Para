import { openArchive, StaleArchiveError } from './archive';
import type { Archive } from './archive';
import { assetKeys, serveAsset } from './assets';
import { isAllowedOrigin } from './cors';
import { createCurrentReader } from './current';
import type { Current } from './current';
import { edgeCache, throughCache } from './edge-cache';
import { answerConditional, etagMatches, notModified, text, withCors } from './http';
import { STYLE_NAMES, styleKey } from './keys';
import type { StyleName } from './keys';
import { isValidTile } from './pmtiles';
import { rewriteStyle } from './styles';
import { isBody } from './types';
import type { Env, ExecutionContext, WorkerResponseInit } from './types';

const TILE_ROUTE = /^\/(\d+)\/(\d+)\/(\d+)\.pbf$/;
const STYLE_ROUTE = /^\/styles\/([a-z]+)$/;
const TILE_CACHE_CONTROL = 'public, max-age=86400, stale-while-revalidate=604800';
const STYLE_CACHE_CONTROL = 'public, max-age=3600, stale-while-revalidate=86400';
// Cache API keys; the host is never requested.
const INTERNAL = 'https://tiles.internal';

function findStyleName(name: string): StyleName | undefined {
  return STYLE_NAMES.find((known) => known === name);
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

  function archiveFor(env: Env, current: Current): Promise<Archive> {
    if (archive?.file !== current.file) {
      const opened = openArchive(env.TILES, current.file, edgeCache());
      // A failed open must not stay cached.
      opened.catch(() => {
        if (archive?.opened === opened) archive = undefined;
      });
      archive = { file: current.file, opened };
    }
    return archive.opened;
  }

  /** Runs `run` on the open archive; if the file was replaced meanwhile, opens it again once. */
  async function withArchive<T>(
    env: Env,
    current: Current,
    run: (opened: Archive) => Promise<T>,
  ): Promise<T> {
    try {
      return await run(await archiveFor(env, current));
    } catch (error) {
      if (!(error instanceof StaleArchiveError)) throw error;
      archive = undefined;
      return run(await archiveFor(env, current));
    }
  }

  async function tile(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
    [z, x, y]: [number, number, number],
  ): Promise<Response> {
    if (!isValidTile(z, x, y)) return text(400, 'Not a tile address.');
    const current = await currentFor(env);
    const etag = `"${current.file}"`;
    if (etagMatches(request.headers.get('If-None-Match'), etag))
      return notModified(etag, TILE_CACHE_CONTROL);

    return throughCache(
      edgeCache(),
      `${INTERNAL}/${current.file}/${z}/${x}/${y}`,
      ctx,
      async () => {
        const found = await withArchive(env, current, (opened) => opened.getTile(z, x, y));
        if (!found)
          return new Response(null, {
            status: 204,
            headers: { 'Cache-Control': TILE_CACHE_CONTROL },
          });
        const headers = new Headers({
          'Content-Type': 'application/x-protobuf',
          'Cache-Control': TILE_CACHE_CONTROL,
          ETag: etag,
        });
        // The bytes are already gzipped, so the runtime must not gzip them again.
        if (found.isGzip) headers.set('Content-Encoding', 'gzip');
        const init: WorkerResponseInit = { headers, encodeBody: 'manual' };
        return new Response(found.bytes, init);
      },
    );
  }

  async function style(
    env: Env,
    ctx: ExecutionContext,
    origin: string,
    name: StyleName,
  ): Promise<Response> {
    const current = await currentFor(env);
    const key = `${INTERNAL}/style/${current.file}/${name}?origin=${encodeURIComponent(origin)}`;
    return throughCache(edgeCache(), key, ctx, async () => {
      const object = await env.TILES.get(styleKey(name));
      if (!object || !isBody(object)) return text(404, 'Style not published.');
      const original: unknown = JSON.parse(await new Response(object.body).text());
      const { header } = await withArchive(env, current, async (opened) => opened);
      return Response.json(rewriteStyle(original, origin, header, current.file), {
        headers: { 'Cache-Control': STYLE_CACHE_CONTROL, ETag: `"${current.file}/${name}"` },
      });
    });
  }

  async function health(env: Env): Promise<Response> {
    const current = await currentFor(env);
    // A pointer to a file that is not there is not healthy.
    await withArchive(env, current, async (opened) => opened);
    const { builtAt, file, tiles } = current;
    return Response.json({ builtAt, file, tiles }, { headers: { 'Cache-Control': 'no-store' } });
  }

  async function route(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const tileMatch = TILE_ROUTE.exec(url.pathname);
    if (tileMatch) {
      const [z = -1, x = -1, y = -1] = tileMatch.slice(1).map(Number);
      return tile(request, env, ctx, [z, x, y]);
    }
    const styleMatch = STYLE_ROUTE.exec(url.pathname);
    const styleName = styleMatch?.[1] ? findStyleName(styleMatch[1]) : undefined;
    if (styleName) return style(env, ctx, url.origin, styleName);
    const keys = assetKeys(url.pathname);
    if (keys) {
      const { file } = await currentFor(env);
      return throughCache(edgeCache(), `${INTERNAL}/asset/${file}${url.pathname}`, ctx, () =>
        serveAsset(env.TILES, keys),
      );
    }
    if (url.pathname === '/health') return health(env);
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
      return withCors(answerConditional(request, await route(request, env, ctx)), origin);
    } catch (error) {
      console.error('tiles worker failed', error);
      return withCors(text(503, 'The map tiles are unavailable. Try again shortly.'), origin);
    }
  };
}
