// How fast the contributor page's toolbar moves between Record, History and Account: from the
// tap to the view transition's first frame, and to the new screen drawn, on a mid-range phone
// (4× CPU slow-down, DevTools' Fast 3G). Run against a production build of the page:
//
//   npx vite build && npx vite preview --port 5188
//   PARA_BASE=http://localhost:5188 node scripts/research/tab-speed.mjs
//
// Cold: a fresh browser, nothing cached, each tab's first tap. Warm: the same taps again.
// Prints one line per move, in milliseconds; "blank" counts a transition whose new state had no
// screen in it yet (the snapshot taken before the screen was drawn).
import { chromium } from 'playwright';

import { fakeContributions, session } from '../../tests/e2e/lib/fake-contributions.mjs';
import { fakeTurnstile } from '../../tests/e2e/lib/fake-turnstile.mjs';

const BASE = process.env.PARA_BASE ?? 'http://localhost:5188';
const ACCOUNT_ID = 'cccccccc-0000-4000-8000-000000000001';
const FAST_3G = {
  offline: false,
  latency: 562.5,
  downloadThroughput: (1.44 * 1024 * 1024 * 0.9) / 8,
  uploadThroughput: (675 * 1024 * 0.9) / 8,
};

/** What the page itself notes about each move: the tap, the transition, the screen. */
function watchMoves() {
  window.__moves = [];
  let current = null;
  document.addEventListener(
    'pointerdown',
    () => {
      current = { tap: performance.now() };
      window.__moves.push(current);
    },
    true,
  );
  window.addEventListener('hashchange', () => {
    if (current) current.hashchange ??= performance.now();
  });
  new MutationObserver(() => {
    if (current && !current.drawn && document.querySelector('[data-screen-hash]'))
      current.drawn = performance.now();
  }).observe(document, { childList: true, subtree: true });
  const start = document.startViewTransition?.bind(document);
  if (start) {
    document.startViewTransition = (update) => {
      const move = current;
      const transition = start(update);
      if (move) move.called = performance.now();
      transition.ready
        .then(() => {
          if (!move) return;
          move.ready = performance.now();
          // The new state the transition animates to: is the screen in it, or is it blank?
          move.screenAtReady = document.querySelectorAll('.tab-screen').length;
        })
        .catch(() => {});
      return transition;
    };
  }
}

async function phone() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 2,
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  const fake = await fakeContributions(page);
  fake.users.set(ACCOUNT_ID, {
    email: 'tester@example.com',
    password: 'hunter2hunter2',
    isAccount: true,
    profile: { name: 'Tester', phone: '+639171234567' },
  });
  await fakeTurnstile(page);
  await page.addInitScript(
    ([key, stored]) => localStorage.setItem(key, JSON.stringify(stored)),
    [
      'para.contributor-auth',
      session(ACCOUNT_ID, { email: 'tester@example.com', isAccount: true }),
    ],
  );
  await page.addInitScript(watchMoves);
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', FAST_3G);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  return { browser, page };
}

const tab = (page, name) =>
  page.getByRole('navigation', { name: 'Screens' }).getByRole('button', { name, exact: true });

/** Taps a tab and waits for its screen: the time to the transition's first frame and to the screen. */
async function move(page, name, isShown) {
  const before = await page.evaluate(() => window.__moves.length);
  await tab(page, name).click();
  await page.waitForFunction(isShown, null, { timeout: 30000 });
  const shownAt = await page.evaluate(() => performance.now());
  // Let the transition and any late paint finish before the next tap.
  await page.waitForTimeout(1200);
  const m = await page.evaluate((i) => window.__moves[i], before);
  return {
    to: name,
    toFirstFrame: m?.ready ? Math.round(m.ready - m.tap) : null,
    toScreen: m ? Math.round(shownAt - m.tap) : null,
    blank: m?.ready !== undefined && name !== 'Record' ? m.screenAtReady === 0 : false,
    ...(process.env.PARA_TRACE_CHUNKS && m
      ? {
          called: Math.round(m.called - m.tap),
          hashchange: Math.round(m.hashchange - m.tap),
          drawn: m.drawn ? Math.round(m.drawn - m.tap) : null,
        }
      : {}),
  };
}

const onHistory = () => !!document.querySelector('.tab-screen h1, .tab-screen [role="heading"]');
const onAccount = () => !!document.querySelector('.tab-screen')?.textContent?.includes('Tester');
const onRecord = () =>
  !document.querySelector('.tab-screen') &&
  [...document.querySelectorAll('button')].some((b) => b.textContent?.includes('Start'));

const { browser, page } = await phone();
await page.goto(`${BASE}/contribute/`, { waitUntil: 'load' });
await page.getByRole('button', { name: 'Start Tracking' }).waitFor({ timeout: 60000 });
// Start settled and idle, as a contributor reaching for a tab would find it.
await page.waitForTimeout(4000);

if (process.env.PARA_TRACE_CHUNKS)
  console.log(
    JSON.stringify(
      await page.evaluate(() =>
        performance
          .getEntriesByType('resource')
          .filter((e) => /history-view|account-view/.test(e.name))
          .map((e) => ({
            name: e.name.split('/').pop(),
            start: Math.round(e.startTime),
            end: Math.round(e.responseEnd),
            now: Math.round(performance.now()),
          })),
      ),
    ),
  );
const rows = [];
for (const round of ['cold', 'warm']) {
  rows.push({ round, ...(await move(page, 'History', onHistory)) });
  rows.push({ round, ...(await move(page, 'Account', onAccount)) });
  rows.push({ round, ...(await move(page, 'Record', onRecord)) });
}
for (const row of rows) console.log(JSON.stringify(row));
await browser.close();
