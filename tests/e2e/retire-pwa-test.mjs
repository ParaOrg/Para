// A phone that installed the public map, once the production site retires it, checked against
// the production build in `vite preview`. Run `npm run build` first.
//
//   node tests/e2e/retire-pwa-test.mjs
//
// Starts its own preview server on :4173 (or uses PARA_BASE) and the site in front of it on
// :4175. First the build is served as a
// Preview serves it: the map's worker installs and fills its stores, the contributor page's
// worker installs beside it, and the editor is open in a tab. Then every request is answered by
// the site Worker's own code (workers/site/src/coming-soon.ts) as the production host
// www.para-commute.org, with the build as its files, and the map's tab checks for an update as an
// installed app does. Then:
//   - the map's worker is gone (no registration for /), and so are its stores, the precache
//     among them
//   - the map's tab was reloaded onto Coming soon, and a fresh visit to / is Coming soon
//   - the contributor page's worker and its store are still there, and the editor's tab was not
//     reloaded
//   - no page errors
//
// Each check prints PASS/FAIL and the script exits non-zero on any failure.
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { until } from './lib/harness.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const require = createRequire(join(root, 'package.json'));
const { chromium } = require('playwright');

// The site Worker is TypeScript that imports without extensions, as the app does.
await import('../../scripts/node/ts-resolve.mjs');
const { servePage } = await import('../../workers/site/src/coming-soon.ts');

const PRODUCTION = 'https://www.para-commute.org';
const MAP_CACHES = ['map-file'];
const SITE_PORT = 4175;

let failed = 0;
const check = (name, ok, detail = '') => {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`);
};

if (!existsSync(join(root, 'dist', 'sw.js'))) {
  console.log('FAIL  dist/sw.js missing — run npm run build first');
  process.exit(1);
}

let server = null;
let base = process.env.PARA_BASE;
if (!base) {
  const { preview } = await import('vite');
  server = await preview({ preview: { port: 4173, strictPort: true }, logLevel: 'silent' });
  base = server.resolvedUrls.local[0].replace(/\/$/, '');
}
console.log(`preview at ${base}`);

// The site the browser visits: a server of its own in front of the preview. It passes each
// request to the preview as a Preview's host does, until `isProduction` is set; from then on it
// answers as the production site does, through the site Worker's code. The browser's update
// check for a worker is its own request, which only a real server sees.
let isProduction = false;
const files = {
  fetch: async (asked) => {
    const { pathname, search } = new URL(asked.url);
    return fetch(`${base}${pathname}${search}`, { redirect: 'manual' });
  },
};
const site = createServer(async (incoming, outgoing) => {
  const path = incoming.url ?? '/';
  const asked = new Request(`${PRODUCTION}${path}`, { method: incoming.method });
  const response = isProduction ? await servePage(asked, files) : await files.fetch(asked);
  const headers = Object.fromEntries(response.headers);
  // fetch has already decoded the body.
  delete headers['content-encoding'];
  delete headers['content-length'];
  outgoing.writeHead(response.status, headers);
  outgoing.end(Buffer.from(await response.arrayBuffer()));
});
await new Promise((done) => site.listen(SITE_PORT, '127.0.0.1', done));
const siteBase = `http://localhost:${SITE_PORT}`;

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 393, height: 852 } });
const errors = [];

// Nothing but the site is reachable.
await context.route('**/*', (route) =>
  new URL(route.request().url()).origin === siteBase ? route.continue() : route.abort(),
);
context.on('page', (page) => page.on('pageerror', (error) => errors.push(error.message)));

/** What a page can see of the workers and the stores. */
const state = (page) =>
  page.evaluate(async () => ({
    scopes: (await navigator.serviceWorker.getRegistrations()).map(
      (r) => new URL(r.scope).pathname,
    ),
    caches: await caches.keys(),
    title: document.title,
    marked: window.__retirePwaMark === true,
  }));

try {
  // 1. As a Preview serves it: the map installs, then the contributor page, and the editor opens.
  const map = await context.newPage();
  await map.goto(`${siteBase}/`);
  await map.evaluate(() => navigator.serviceWorker.ready);
  await until(
    () => state(map),
    (s) => s.caches.some((n) => n.startsWith('workbox-precache')),
    20_000,
  );
  await map.reload();
  await until(
    () => state(map),
    (s) => s.caches.includes('map-file'),
    20_000,
  );

  const contribute = await context.newPage();
  await contribute.goto(`${siteBase}/contribute/`);
  await until(
    () => state(contribute),
    (s) =>
      s.scopes.includes('/contribute/') && s.caches.some((n) => n.startsWith('para-contribute-')),
    30_000,
  );

  const studio = await context.newPage();
  await studio.goto(`${siteBase}/studio/`);
  await studio.evaluate(() => (window.__retirePwaMark = true));
  await map.evaluate(() => (window.__retirePwaMark = true));

  const before = await state(map);
  check(
    'before: the map worker and the contributor page worker are installed',
    before.scopes.includes('/') && before.scopes.includes('/contribute/'),
    before.scopes.join(' '),
  );
  check(
    "before: the map's stores are filled",
    before.caches.some((n) => n.startsWith('workbox-precache')) &&
      before.caches.includes('map-file'),
    before.caches.join(' '),
  );
  check('before: the map tab is the map', before.title === 'Para', before.title);

  // 2. The production site: the installed app checks for an update, as it does on a navigation,
  //    hourly, and at least daily.
  isProduction = true;
  const reloaded = map.waitForEvent('framenavigated', { timeout: 20_000 });
  await map.evaluate(async () => (await navigator.serviceWorker.getRegistration('/'))?.update());
  await reloaded;
  await map.waitForLoadState('load');

  const seen = await until(
    () => state(map),
    (s) => !s.scopes.includes('/') && s.title === 'Para is coming soon',
    20_000,
  );
  check("after: the map's worker is gone", !seen.scopes.includes('/'), seen.scopes.join(' '));
  check(
    "after: the map's stores are gone, the precache among them",
    !seen.caches.some((n) => n.startsWith('workbox-') || MAP_CACHES.includes(n)),
    seen.caches.join(' '),
  );
  check(
    "after: the map's tab was reloaded onto Coming soon",
    seen.title === 'Para is coming soon' && !seen.marked,
    `${seen.title}; reloaded ${!seen.marked}`,
  );
  check(
    "after: the contributor page's worker and its store are still there",
    seen.scopes.includes('/contribute/') &&
      seen.caches.some((n) => n.startsWith('para-contribute-')),
    `${seen.scopes.join(' ')} | ${seen.caches.join(' ')}`,
  );
  const studioAfter = await state(studio);
  check("after: the editor's tab was not reloaded", studioAfter.marked, studioAfter.title);

  const fresh = await context.newPage();
  await fresh.goto(`${siteBase}/`);
  const freshState = await state(fresh);
  check(
    'after: a fresh visit to / is Coming soon',
    freshState.title === 'Para is coming soon',
    freshState.title,
  );
  check(
    'after: and it installs no worker for /',
    !freshState.scopes.includes('/'),
    freshState.scopes.join(' '),
  );
} catch (error) {
  check('the suite ran to the end', false, error instanceof Error ? error.message : String(error));
} finally {
  check('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  await browser.close();
  site.close();
  await server?.close();
}

console.log(failed === 0 ? 'all passed' : `${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
