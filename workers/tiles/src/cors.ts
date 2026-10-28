const FIXED_ORIGINS = new Set([
  'https://parapo.villaralvorovic2.workers.dev',
  'https://staging-parapo.villaralvorovic2.workers.dev',
  'https://para.para-ph-info.workers.dev',
  'https://staging-para.para-ph-info.workers.dev',
  'http://localhost:5173',
]);
// Workers Builds previews: https://<branch>-<worker>.<account>.workers.dev. The site's
// Worker is `para` on para-ph-info and `parapo` on villaralvorovic2, where the old site runs.
const PREVIEW_ORIGINS = [
  /^https:\/\/[a-z0-9]([a-z0-9-]*[a-z0-9])?-para\.para-ph-info\.workers\.dev$/,
  /^https:\/\/[a-z0-9]([a-z0-9-]*[a-z0-9])?-parapo\.villaralvorovic2\.workers\.dev$/,
];

export function isAllowedOrigin(origin: string, extraOrigins = ''): boolean {
  if (FIXED_ORIGINS.has(origin) || PREVIEW_ORIGINS.some((preview) => preview.test(origin))) {
    return true;
  }
  return extraOrigins
    .split(',')
    .map((extra) => extra.trim())
    .includes(origin);
}

/** CORS headers for an allowed origin; only Vary for a request without an Origin. */
export function corsHeaders(origin: string | null): Record<string, string> {
  // The answer differs by Origin, so shared caches must key on it even when there is none.
  if (!origin) return { Vary: 'Origin' };
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}
