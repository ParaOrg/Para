import type { EdgeCache, ExecutionContext } from './types';

function isEdgeCache(value: unknown): value is EdgeCache {
  return (
    typeof value === 'object' &&
    value !== null &&
    'match' in value &&
    typeof value.match === 'function' &&
    'put' in value &&
    typeof value.put === 'function'
  );
}

/**
 * The Cache API's default cache, or undefined where there is none (tests under Node). On a
 * workers.dev address it exists but keeps nothing; it stores responses only on a custom domain.
 */
export function edgeCache(): EdgeCache | undefined {
  if (typeof caches === 'undefined') return undefined;
  const candidate: unknown = 'default' in caches ? caches.default : undefined;
  return isEdgeCache(candidate) ? candidate : undefined;
}

/** Answers from the edge cache, or makes the response and stores a copy of a 200. */
export async function throughCache(
  cache: EdgeCache | undefined,
  key: string,
  ctx: ExecutionContext,
  make: () => Promise<Response>,
): Promise<Response> {
  const hit = await cache?.match(key);
  if (hit) return hit;
  const response = await make();
  if (cache && response.status === 200) ctx.waitUntil(cache.put(key, response.clone()));
  return response;
}
