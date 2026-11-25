// 2. Strings, as a second net: the public chunks may not contain words only
//    the editor has —
//      router.project-osrm.org   the route snapper
//      para.draft              the drawing-draft key
//      Sign in to save, Login your admin account, New route, terminal or hintuan,
//      Draw the return trip
//      .supabase.co              the database's address: commuters read the
//                                published map and never call it
//    and the studio's search files (/data/search/) and OSM route files (/data/osm-routes/),
//    which only the studio fetches.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadEnv } from 'vite';

/** Cloudflare's script, at the address src/shared/ui/turnstile.tsx loads it from. */
const TURNSTILE_SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
/** The suites' Turnstile stand-in's own mark and words (tests/e2e/lib/fake-turnstile.mjs). */
const TURNSTILE_STAND_IN = ['para-e2e-turnstile-stand-in', 'Turnstile stand-in'];
/** Cloudflare's test site keys, which pass or fail every check whoever answers it. */
const TEST_SITE_KEY = /[123]x0{20}[A-F]{2}/;

const EDITOR_ONLY = [
  'router.project-osrm.org',
  'para.draft',
  'Sign in to save',
  'Login your admin account',
  'New route, terminal or hintuan',
  'Draw the return trip',
  '.supabase.co',
];

export function proveStrings(build, check) {
  const { root, dist, walk, commuterFiles, contributeFiles, text, commuter, studio, contribute } =
    build;

  const leaked = EDITOR_ONLY.filter((s) => commuter.includes(s));
  check('public page contains no editor-only string', leaked.length === 0, leaked.join(', '));

  // The studio's search files (scripts/search/search-file.mjs, about 1.7 MB gzipped together):
  // fetched only by the studio's search, never by the public page or the contributor page.
  const SEARCH_FILES = '/data/search/';
  check(
    'public page and contribute page name no studio search file; the studio names them — the string search works',
    !commuter.includes(SEARCH_FILES) &&
      !contribute.includes(SEARCH_FILES) &&
      studio.includes(SEARCH_FILES),
  );

  // The studio's OSM route files (scripts/osm-routes/, .scratch/osm-route-start): read only by
  // "Start from OSM route", never by the public page or the contributor page.
  const OSM_ROUTE_FILES = '/data/osm-routes/';
  check(
    'public page and contribute page name no OSM route file; the studio names them — the string search works',
    !commuter.includes(OSM_ROUTE_FILES) &&
      !contribute.includes(OSM_ROUTE_FILES) &&
      studio.includes(OSM_ROUTE_FILES),
  );

  // Its own chunks, not the ones it shares with the public page, whose map reader
  // names route_variant in the published file's fields.
  const contributeOwn = text(contributeFiles.filter((f) => !commuterFiles.includes(f)));
  // The database's address is the one editor string the contributor page needs. What it may not
  // name are the studio's tables and operations.
  const STUDIO_DATA = ['route_variant', 'route_stop', 'claim_draft', 'publish_draft', 'take_down'];
  const leakedToContribute = [
    ...EDITOR_ONLY.filter((s) => s !== '.supabase.co'),
    ...STUDIO_DATA,
  ].filter((s) => contributeOwn.includes(s));
  check(
    'contribute page contains no editor-only string and names no studio table',
    leakedToContribute.length === 0,
    leakedToContribute.join(', '),
  );
  check(
    'contribute page saves through save_contribution under its own session key — the string search works',
    contribute.includes('save_contribution') && contribute.includes('para.contributor-auth'),
  );
  const studioData = STUDIO_DATA.filter((s) => !studio.includes(s));
  check(
    'studio names every studio table and operation — the string search works',
    studioData.length === 0,
    studioData.length ? 'missing: ' + studioData.join(', ') : '',
  );

  // Turnstile, Cloudflare's bot check, is the studio's sign-in's (and the
  // contributor page's first upload's): commuters never load its script.
  const TURNSTILE = 'challenges.cloudflare.com';
  check(
    'public page loads no Turnstile; the studio and the contributor page carry it — the string search works',
    !commuter.includes(TURNSTILE) && studio.includes(TURNSTILE) && contribute.includes(TURNSTILE),
  );

  // The check is Cloudflare's own: the script at its own address, none of the suites' stand-in
  // built in, and the site key the build was given. Every build checked here is production-mode
  // (vite build), the deploy's and the preview builds the suites run alike, so a Cloudflare test
  // key, in the build or in the key it was given, fails: there is no exemption.
  check(
    "the studio and the contributor page load Cloudflare's own Turnstile script, at its address",
    studio.includes(TURNSTILE_SCRIPT) && contribute.includes(TURNSTILE_SCRIPT),
  );
  const built = [...walk(dist)]
    .filter((path) => /\.(js|html|json|webmanifest)$/.test(path))
    .map((path) => readFileSync(path, 'utf8'))
    .join('\n');
  const standIn = TURNSTILE_STAND_IN.filter((s) => built.includes(s));
  check(
    'no file of the build carries the Turnstile stand-in',
    standIn.length === 0,
    standIn.join(', '),
  );
  const siteKey = loadEnv('production', root, 'VITE_').VITE_TURNSTILE_SITE_KEY ?? '';
  const testKey = TEST_SITE_KEY.exec(siteKey)?.[0] ?? TEST_SITE_KEY.exec(built)?.[0];
  check(
    'no Turnstile test key in the build or the key it was given, and the studio and contributor page carry that key',
    testKey === undefined &&
      siteKey !== '' &&
      studio.includes(siteKey) &&
      contribute.includes(siteKey),
    testKey ?? '',
  );
  // /app/ is a static page with its key written in (public/app/index.html); the suites serve it
  // with a test key at visit time only (contribute-offline-test).
  const appKeys = [
    ...readFileSync(join(dist, 'app', 'index.html'), 'utf8').matchAll(/data-sitekey="([^"]*)"/g),
  ].map((m) => m[1]);
  check(
    '/app/ ships one Turnstile site key, and not a test key',
    appKeys.length === 1 && appKeys[0] !== '' && !TEST_SITE_KEY.test(appKeys[0]),
    appKeys.join(', '),
  );

  const missing = EDITOR_ONLY.filter((s) => !studio.includes(s));
  check(
    'studio contains every marker — the string search works',
    missing.length === 0,
    missing.length ? 'missing: ' + missing.join(', ') : '',
  );
}
