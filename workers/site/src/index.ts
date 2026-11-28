import { servePage } from './coming-soon';
import { handleReport } from './report';
import { submitRouteReport } from './submit';
import { isTurnstileVerified } from './turnstile';

/**
 * The site's Worker, `para`. wrangler.jsonc sends /api/* here, and every page address
 * (run_worker_first): /api/report is the route report, and a page is served from dist/, with Coming
 * soon in the map's place on the production site (coming-soon.ts). The built files under /assets/,
 * /data/, /fonts/ and /icons/, the editor and the contributor page are served from dist/ without
 * this script running.
 */

/** The slice of Cloudflare's runtime this Worker uses, so it bundles with no install step. */
interface Env {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
  /** The Workers Rate Limiting binding (wrangler.jsonc, `ratelimits`). */
  REPORT_LIMIT: { limit: (options: { key: string }) => Promise<{ success: boolean }> };
  /** Secrets the owner sets on the Worker; missing, reports are unavailable. */
  REPORT_DATABASE_URL?: string;
  TURNSTILE_SECRET_KEY?: string;
}

interface ExecutionContext {
  waitUntil: (promise: Promise<unknown>) => void;
}

const notFound = (): Response =>
  new Response(JSON.stringify({ code: 'not_found' }), {
    status: 404,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });

const unavailable = (): Response =>
  new Response(JSON.stringify({ code: 'unavailable' }), {
    status: 503,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });

async function handle(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const { pathname } = new URL(request.url);
  if (!pathname.startsWith('/api/')) return servePage(request, env.ASSETS);
  if (pathname !== '/api/report') return notFound();
  const databaseUrl = env.REPORT_DATABASE_URL;
  const turnstileSecret = env.TURNSTILE_SECRET_KEY;
  if (!databaseUrl || !turnstileSecret) return unavailable();
  return handleReport(request, {
    // The address is handed to Cloudflare's limiter, in memory, and nowhere else: never stored,
    // never logged (Q196).
    isAllowed: async () =>
      (await env.REPORT_LIMIT.limit({ key: request.headers.get('cf-connecting-ip') ?? 'unknown' }))
        .success,
    isVerified: (token) => isTurnstileVerified(turnstileSecret, token),
    submit: (report) => submitRouteReport(databaseUrl, report, (promise) => ctx.waitUntil(promise)),
  });
}

// The Workers runtime requires a default export.
export default { fetch: handle };
