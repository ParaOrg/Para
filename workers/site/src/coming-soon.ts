/**
 * The public site shows "Coming soon" and the waitlist in place of the map, so the map is not on
 * show yet (the owner, 2026-11-21). Only the production site does: www.para-commute.org, the bare
 * domain, and the Worker's own workers.dev address, para.<account>.workers.dev. Every branch's
 * Preview (<branch>-para.<account>.workers.dev), the staging site among them, keeps the map, so it
 * can still be built and checked there. The editor (/studio/) and the contributor page
 * (/contribute/) work as before on every host.
 *
 * The switch is the request's host, read here at the edge, not a build flag: production and every
 * Preview are built and deployed from the same dist/, so what CI checks is what serves.
 */

/** The production site's hosts: the custom domain, bare and www, and the Worker's workers.dev name. */
export function isComingSoonHost(hostname: string): boolean {
  return (
    hostname === 'www.para-commute.org' ||
    hostname === 'para-commute.org' ||
    /^para\.[a-z0-9-]+\.workers\.dev$/.test(hostname)
  );
}

/** Where the Coming soon page itself is built, from public/coming-soon/index.html. */
export const COMING_SOON_PATH = '/coming-soon/';

/** The pages that keep working on the production site: the editor, the contributor page, and Coming soon. */
const KEPT = ['/studio/', '/contribute/', COMING_SOON_PATH];

/**
 * Whether a page answered at `pathname` is swapped for Coming soon: any page (an HTML answer) but
 * the ones kept. So the map at /, /app/ (the download page, with its Android link), and every other
 * address the map answers for as a single-page app all show Coming soon. Files (scripts, styles,
 * fonts, pictures, the published map's data) are served as they are.
 */
export function showsComingSoon(pathname: string, contentType: string | null): boolean {
  if (!contentType?.startsWith('text/html')) return false;
  return !KEPT.some((kept) => pathname === kept.slice(0, -1) || pathname.startsWith(kept));
}

/** The slice of the static-assets binding this needs. */
interface Assets {
  fetch: (request: Request) => Promise<Response>;
}

/**
 * Any address but /api/*: the built file as usual, or on the production site, a page that is not
 * kept is answered with Coming soon in its place, at the same address (200, not a redirect), so a
 * link to / or /app/ still lands on it.
 */
export async function servePage(request: Request, assets: Assets): Promise<Response> {
  const response = await assets.fetch(request);
  const url = new URL(request.url);
  if (!isComingSoonHost(url.hostname)) return response;
  if (!showsComingSoon(url.pathname, response.headers.get('content-type'))) return response;
  return assets.fetch(new Request(new URL(COMING_SOON_PATH, url), request));
}
