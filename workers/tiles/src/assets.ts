import { ASSETS_PREFIX } from './keys';
import { isBody } from './types';
import type { R2Bucket } from './types';

const FONTS_PREFIX = `${ASSETS_PREFIX}fonts/`;
// Each font in a stack costs an R2 read, so a stack is read only this far.
const MAX_FONTSTACK = 3;
const ASSET_CACHE_CONTROL = 'public, max-age=604800';

/**
 * The bucket keys to try for a request path, in order, or undefined if the path is no asset.
 * A glyph request may name a fontstack ("Noto Sans Regular,Noto Sans Bold"); the build stores
 * single fonts only, so each font in the stack is a candidate, first one first.
 */
export function assetKeys(pathname: string): string[] | undefined {
  let key: string;
  try {
    key = decodeURIComponent(pathname.slice(1));
  } catch {
    return undefined;
  }
  if (!key.startsWith(ASSETS_PREFIX) || key.split('/').includes('..')) return undefined;
  if (!key.startsWith(FONTS_PREFIX)) return [key];
  const [stack = '', ...rest] = key.slice(FONTS_PREFIX.length).split('/');
  return stack
    .split(',')
    .slice(0, MAX_FONTSTACK)
    .map((font) => [`${FONTS_PREFIX}${font.trim()}`, ...rest].join('/'));
}

function contentType(key: string): string {
  if (key.endsWith('.json')) return 'application/json';
  if (key.endsWith('.png')) return 'image/png';
  return 'application/x-protobuf';
}

/** The first of `keys` the bucket holds, as it is stored; 404 when it holds none. */
export async function serveAsset(bucket: R2Bucket, keys: string[]): Promise<Response> {
  for (const key of keys) {
    const object = await bucket.get(key);
    if (!object || !isBody(object)) continue;
    return new Response(object.body, {
      headers: {
        'Content-Type': contentType(key),
        'Cache-Control': ASSET_CACHE_CONTROL,
        ETag: object.httpEtag,
      },
    });
  }
  return new Response('Not found.', {
    status: 404,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
