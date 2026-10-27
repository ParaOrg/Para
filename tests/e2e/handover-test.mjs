// A phone that carries the old app's worker moves to this app, checked against
// the production build in `vite preview`. Run `npm run build` first.
//
//   node tests/e2e/handover-test.mjs
//
// www.para-commute.org served "Para PH" before this app; its worker (the copy
// in fixtures/para-ph-sw.js, fetched from the live site and never shipped)
// sits at the same address and scope as ours. Starts its own preview server on
// :4173 (or uses PARAPO_BASE), then:
//   - the old worker is served as /sw.js and takes control of the page
//   - this app's build replaces it: ours controls the page, no "Update Para Po!"
//     was offered, the page was not reloaded, `para-ph-v20260912` is gone, and
//     the map file is stored as on a first visit
//   - a later version of ours is offered as "Update Para Po!" and waits until tapped
//   - no page errors
// The only host the browser can resolve is the preview's.
//
// Each check prints PASS/FAIL and the script exits non-zero on any failure.
import { createRequire } from 'node:module';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const require = createRequire(join(root, 'package.json'));
const { chromium } = require('playwright');

const OLD_CACHE = 'para-ph-v20260912';

let failed = 0;
const check = (name, ok, detail = '') => {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`);
};

if (!existsSync(join(root, 'dist', 'sw.js'))) {
  console.log('FAIL  dist/sw.js missing — run npm run build first');
  process.exit(1);
}
const oldWorker = readFileSync(join(root, 'tests', 'e2e', 'fixtures', 'para-ph-sw.js'), 'utf8');
const swFile = join(root, 'dist', 'sw.js');
const ourWorker = readFileSync(swFile, 'utf8');

let server = null;
let base = process.env.PARAPO_BASE;
if (!base) {
  const { preview } = await import('vite');
  server = await preview({ preview: { port: 4173, strictPort: true }, logLevel: 'silent' });
  base = server.resolvedUrls.local[0].replace(/\/$/, '');
}
console.log(`preview at ${base}`);

const isWorker = (url) => new URL(url).pathname === '/sw.js';
const serveWorker = (body) => (route) =>
  route.fulfill({
    status: 200,
    contentType: 'application/javascript',
    headers: { 'cache-control': 'no-cache' },
    body,
  });

/** What the page can see of its worker and the caches. */
const state = (page) =>
  page.evaluate(async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    return {
      controlled: !!navigator.serviceWorker.controller,
      controllerState: navigator.serviceWorker.controller?.state ?? null,
      waiting: !!reg?.waiting,
      caches: await caches.keys(),
      hasMapFile: await caches.has('map-file'),
      update: !!document.querySelector('[data-testid="update"]'),
      sameDocument: window.__handover === 'same',
    };
  });

// Nothing but the preview is reachable. The new worker cannot take over while
// the old one has a request in flight (the browser waits for it to go idle), and
// the basemap's tiles, asked of the old worker, would otherwise hang for about
// 30 s on a machine with no route to the tile host, past this suite's wait.
const browser = await chromium.launch({
  args: ['--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE localhost'],
});
try {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const errors = [];
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(e.message));

  // ------------------------------------------------ the old app's worker
  const old = serveWorker(oldWorker);
  await ctx.route(isWorker, old);
  await page.goto(`${base}/`, { waitUntil: 'load' });
  await page
    .waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 15000 })
    .catch(() => {});
  const withOld = await state(page);
  check('the old worker controls the page', withOld.controlled, JSON.stringify(withOld));

  // The old worker opens its cache on a page load it controls, as on a phone.
  await page.goto(`${base}/`, { waitUntil: 'load' });
  const opened = await state(page);
  check(`the old worker's cache ${OLD_CACHE} exists`, opened.caches.includes(OLD_CACHE));

  // -------------------------------------------- this app's build replaces it
  await ctx.unroute(isWorker, old);
  await page.evaluate(() => {
    window.__handover = 'same';
  });
  await page.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.update());
  // Ours installs (it precaches the shell), takes over, deletes the old cache and
  // stores the map file; the last of these is the end of the hand-over.
  let ours = false;
  for (let i = 0; i < 60 && !ours; i++) {
    const now = await state(page);
    ours = now.hasMapFile && !now.caches.includes(OLD_CACHE);
    if (!ours) await page.waitForTimeout(500);
  }
  check("this app's worker took over from the old one", ours);
  await page.waitForTimeout(2000);
  const after = await state(page);
  check(
    "this app's worker controls the page, and nothing waits",
    after.controlled && after.controllerState === 'activated' && !after.waiting,
    JSON.stringify(after),
  );
  check('no "Update Para Po!" was offered', !after.update);
  check('the page was not reloaded', after.sameDocument);
  check(`${OLD_CACHE} is gone`, !after.caches.some((n) => n.startsWith('para-ph-')));
  check('the map file is stored, as after a first visit', after.hasMapFile);

  // ------------------------------------------------ a later version of ours
  writeFileSync(swFile, `${ourWorker}\n// updated build\n`);
  await page.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.update());
  const offered = await page
    .locator('[data-testid="update"]')
    .waitFor({ timeout: 15000 })
    .then(
      () => true,
      () => false,
    );
  check('a later version of ours is offered as "Update Para Po!"', offered);
  const waiting = await state(page);
  check(
    'and waits while the current one keeps controlling the page',
    waiting.waiting && waiting.controlled,
  );
  if (offered) {
    await Promise.all([
      page.waitForEvent('load', { timeout: 15000 }).catch(() => {}),
      page.locator('[data-testid="update"]').click(),
    ]);
    await page.waitForTimeout(1500);
    const done = await state(page);
    check(
      'tapping Reload brings it in and the button goes',
      !done.waiting && done.controlled && !done.update,
      JSON.stringify(done),
    );
  }

  check('no page errors', errors.length === 0, errors.join(' | '));
  await ctx.close();
} finally {
  writeFileSync(swFile, ourWorker);
  await browser.close();
  await server?.close();
}

console.log(failed ? `\n${failed} FAILED` : '\nall passed');
process.exit(failed ? 1 : 0);
