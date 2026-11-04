// The contributor page /contribute/, driven by a phone: a mocked GPS walks the
// whole loop and the screens answer it.
//
//   npm run dev                          (in another terminal)
//   node tests/e2e/contribute-test.mjs
//
// PARA_SHOTS=dir keeps screenshots of Ready, Recording (Lakad, then
// Sakay), the Save form and the Route recorded toast on Record at 393×852.
//
// The GPS is a stand-in navigator.geolocation the suite feeds fix by fix, with
// timestamps of its own (a second apart), so a kilometre out and back takes
// no time. The 2-minute form timeout runs on Playwright's fake clock.
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';
import { fakeContributions } from './lib/fake-contributions.mjs';
import { BASE, bareStyle, harness, nodeFetch, until } from './lib/harness.mjs';
import { checkLocationLabels } from './lib/location-labels.mjs';
import { mapControlsInTabOrder } from './lib/tab-order.mjs';

const { check, tally } = harness();
const SHOTS = process.env.PARA_SHOTS;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });

// Tala's neighbourhood, 14.6°N: a degree of longitude is 107.6 km there.
const START = [121.0, 14.6];
const M_PER_DEG_LNG = 107_600;
const eastOf = (metres) => [START[0] + metres / M_PER_DEG_LNG, START[1]];

const GPS = () => {
  const watchers = new Map();
  let nextId = 0;
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: {
      watchPosition: (ok, _error, options) => {
        watchers.set(++nextId, { ok, options });
        return nextId;
      },
      clearWatch: (id) => watchers.delete(id),
      getCurrentPosition: () => {},
    },
  });
  // A phone that keeps the screen awake when asked, as most do; headless Chromium refuses. The
  // wake lock block below puts its own in place.
  Object.defineProperty(navigator, 'wakeLock', {
    configurable: true,
    value: {
      request: async () => {
        const sentinel = new EventTarget();
        sentinel.released = false;
        sentinel.release = async () => {
          sentinel.released = true;
        };
        return sentinel;
      },
    },
  });
  // The page's own clock, held by the suite: a fix and a tap then agree on when they happened.
  let now = Date.UTC(2026, 9, 17, 6, 0, 0);
  Date.now = () => now;
  window.__advance = (ms) => (now += ms);
  window.__fix = (lng, lat, t) =>
    watchers.forEach(({ ok }) =>
      ok({
        timestamp: t,
        coords: { longitude: lng, latitude: lat, accuracy: 5, heading: null, speed: null },
      }),
    );
  // The recording's watch asks for no cached fix (maximumAge 0); the locator's takes one a second old.
  const count = (isRecording) =>
    [...watchers.values()].filter(({ options }) => (options?.maximumAge === 0) === isRecording)
      .length;
  window.__watchers = () => count(true);
  window.__locatorWatchers = () => count(false);
};

const browser = await chromium.launch();

/**
 * A phone-sized page with the stand-in GPS. `earlierConsent` stores the first consent screen's
 * agreement, as a phone from before kept it. `granted` is a browser that already lets the page
 * read the location.
 */
async function phone({ earlierConsent = false, granted = false } = {}) {
  const context = await browser.newContext({
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 2,
    hasTouch: true,
    isMobile: true,
  });
  // The browser already lets the page read the location, as it does after a first visit's yes.
  if (granted) await context.grantPermissions(['geolocation']);
  const page = await context.newPage();
  // PARA_CPU_THROTTLE=4 runs the page at a quarter of the container's speed, as a slow CI runner is.
  if (process.env.PARA_CPU_THROTTLE) {
    const cdp = await context.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', {
      rate: Number(process.env.PARA_CPU_THROTTLE),
    });
  }
  await nodeFetch(page);
  await bareStyle(page);
  // Saved recordings upload: to the stand-in, never to a real project (upload-test covers it).
  await fakeContributions(page);
  await page.addInitScript(GPS);
  // Checks read the requests the page made: room for all of them, tiles and the screens fetched
  // ahead at idle included, where the browser keeps 250 by default and drops the rest.
  await page.addInitScript(() => performance.setResourceTimingBufferSize(5000));
  if (earlierConsent) {
    await page.addInitScript(() => localStorage.setItem('para.contribute.consent', 'yes'));
  }
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`${BASE}/contribute/`, { waitUntil: 'load' });
  return { page, context, errors };
}

const shot = (page, name) => (SHOTS ? page.screenshot({ path: `${SHOTS}/${name}.png` }) : null);
/**
 * How many rows the phone holds in one of the page's stores (fixes, thumbnails), read in the page.
 * Waits poll it from here with until(): page.waitForFunction does not await a predicate's promise,
 * so a wait written that way returns at once, whatever the count.
 */
const storedCount = (page, store) =>
  page.evaluate(
    (name) =>
      new Promise((resolve) => {
        const open = indexedDB.open('para-contribute');
        open.onerror = () => resolve(-1);
        open.onsuccess = () => {
          const db = open.result;
          if (!db.objectStoreNames.contains(name)) {
            db.close();
            resolve(0);
            return;
          }
          const count = db.transaction(name).objectStore(name).count();
          count.onsuccess = () => {
            db.close();
            resolve(count.result);
          };
        };
      }),
    store,
  );
/** One fix of the ride, `metres` east of the start, a second after the last. */
const emit = (page, metres) => {
  const [lng, lat] = eastOf(metres);
  return page.evaluate(([a, b]) => window.__fix(a, b, window.__advance(1000)), [lng, lat]);
};
/** A fix every 10 m from `from` to `to` metres east, a second apart: 36 km/h, as a jeepney. */
const ride = async (page, from, to) => {
  const step = to >= from ? 10 : -10;
  for (let m = from; step > 0 ? m <= to : m >= to; m += step) await emit(page, m);
};
const mapSource = (page) =>
  page.evaluate(() => window.__map.getSource('recording-trail')?.serialize().data ?? null);
/** The map's bearing as 0–360, so -90 and 270 are the same way. */
/** A phone's compass, facing `heading`: Chrome's absolute orientation, alpha counter-clockwise from north. */
const face = (page, heading) =>
  page.evaluate((h) => {
    window.dispatchEvent(
      new DeviceOrientationEvent('deviceorientationabsolute', {
        alpha: (360 - h) % 360,
        beta: 0,
        gamma: 0,
        absolute: true,
      }),
    );
  }, heading);
/** The locator's button, and the look it wears (LocatorButton's Property 1). */
const locate = (page) => page.locator('[data-testid="where"]');
const locatorMode = (page) => locate(page).getAttribute('data-mode');
/** How far the map's centre is from `metres` east of the start, in metres. */
const centreOff = (page, metres) =>
  page.evaluate(
    ([lng, mPerDeg]) => Math.abs(window.__map.getCenter().lng - lng) * mPerDeg,
    [eastOf(metres)[0], M_PER_DEG_LNG],
  );
const bearing = (page) => page.evaluate(() => (window.__map.getBearing() + 360) % 360);
/** Ready's History tab, in the toolbar under Start tracking. */
const historyTab = (page) =>
  page.getByRole('navigation', { name: 'Screens' }).getByRole('button', { name: 'History' });
/** The Record tab, in the toolbar at the foot of History: back to Start. */
const recordTab = (page) =>
  page.getByRole('navigation', { name: 'Screens' }).getByRole('button', { name: 'Record' });
/** The History screen, opened by Ready's History tab unless it is already showing. */
const openHistory = async (page) => {
  const heading = page.getByRole('heading', { level: 1, name: 'History' });
  const history = historyTab(page);
  // A reload on #history lands on the screen itself; otherwise Ready's History tab opens it.
  await heading.or(history).waitFor({ timeout: 10000 });
  if (await heading.isVisible()) return;
  await history.click();
  await heading.waitFor();
};
/** The first card opened: its ride's screen, the sheet folded. */
const openFirstRide = async (page) => {
  await page.locator('[data-ride-card]').first().click();
  await page.getByTestId('dock-handle').waitFor();
};
/** The open ride's sheet raised, Delete this record asked and confirmed: back on History. */
const deleteRecord = async (page) => {
  await page.getByTestId('dock-handle').click();
  await page.getByRole('button', { name: 'Delete this record' }).click();
  await page
    .getByRole('alertdialog', { name: 'You want to remove this recording?' })
    .getByRole('button', { name: 'Delete this record' })
    .click();
  await page.getByRole('heading', { level: 1, name: 'History' }).waitFor();
};
/**
 * The newest saved recording on this phone, read back from IndexedDB as History reads it, with
 * how many fixes it keeps: what the contributor's phone holds, in place of a file handed over.
 */
const lastSavedRide = (page) =>
  page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const open = indexedDB.open('para-contribute');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const tx = open.result.transaction(['recordings', 'fixes']);
          const recordings = tx.objectStore('recordings').getAll();
          const fixes = tx.objectStore('fixes').getAll();
          tx.oncomplete = () => {
            open.result.close();
            const saved = recordings.result
              .filter((r) => r.status === 'saved')
              .sort((a, b) => b.savedAt - a.savedAt);
            const ride = saved[0] ?? null;
            resolve(
              ride && {
                ...ride,
                fixes: fixes.result.filter((f) => f.recordingId === ride.id).length,
              },
            );
          };
        };
      }),
  );
/** The recordings and the number of fixes IndexedDB holds. */
const stored = (page) =>
  page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const open = indexedDB.open('para-contribute');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const tx = open.result.transaction(['recordings', 'fixes']);
          const recordings = tx.objectStore('recordings').getAll();
          const fixes = tx.objectStore('fixes').count();
          tx.oncomplete = () => {
            open.result.close();
            resolve({
              recordings: recordings.result.map((r) => ({
                status: r.status,
                description: r.description,
                failedFixWrites: r.failedFixWrites ?? 0,
              })),
              fixes: fixes.result,
            });
          };
        };
      }),
  );
/** The card's Time in seconds, whether it reads "42 sec" or "12 min". */
const recordedSeconds = (stats) => {
  const [, value, unit] = stats.match(/Time\s+(\d+) (sec|min)/) ?? [];
  return Number(value) * (unit === 'min' ? 60 : 1);
};
/** Pause, then Finish: how a recording ends and opens the Save form. */
const finishRecording = async (page) => {
  const pause = page.getByRole('button', { name: 'Pause', exact: true });
  if (await pause.count()) await pause.click();
  await page.getByRole('button', { name: 'Finish', exact: true }).click();
};
/** Start's ⓘ, which opens the map's credits as the Map Data Source sheet. */
const creditsButton = (page) => page.getByRole('button', { name: 'Map data sources' });

/** Flag a stop, at the top of the right-hand column while recording. */
const flagButton = (page) => page.getByRole('button', { name: 'Flag a stop' });
/** The tint's state and its edges' colour: "lakad:from-blue-700/10". */
const tintOf = (page) =>
  page.evaluate(() => {
    const tint = document.querySelector('[data-tint]');
    const from = tint?.firstElementChild?.className.match(/from-\S+/)?.[0];
    return `${tint?.getAttribute('data-tint')}:${from}`;
  });
/** The toast at the top saying these words: a problem the page tells of until it is fixed. */
const toastSaying = (page, words) => page.getByTestId('toast').filter({ hasText: words });
/** Once the toast has slid into place: where it stands, measured, not where it came from. */
const toastSettled = (page) =>
  page.waitForFunction(() => {
    const toast = document.querySelector('[data-testid="toast"]');
    return !!toast && toast.getAnimations({ subtree: true }).length === 0;
  });
/**
 * What the page's status regions say, together: its own announcer, and the toasts' polite one
 * (empty but for info toasts) once a problem has brought the toasts in.
 */
const statusText = async (page) => (await page.getByRole('status').allInnerTexts()).join('');
/** The fold: the chevron at the left over the card, or at the foot with it folded away. */
const foldButton = (page) => page.getByRole('button', { name: /^(Hide|Show) the recording card$/ });
const buttons = (page) =>
  page
    .getByRole('button')
    .evaluateAll((els) => els.map((e) => e.getAttribute('aria-label') ?? e.textContent));

// ----------------------------------- no consent screen, whatever the phone kept
{
  const { page, errors } = await phone({ earlierConsent: true });
  await page.getByRole('button', { name: 'Start Tracking' }).waitFor({ timeout: 20000 });
  check(
    'a phone that agreed to the first consent screen opens on Start: no consent screen is shown',
    (await page.getByRole('heading', { name: 'Before you record' }).count()) === 0 &&
      (await page.getByRole('button', { name: 'Okay, I understand' }).count()) === 0 &&
      errors.length === 0,
    errors.join(' | '),
  );
  check(
    '  the web page never shows the Android app’s permissions screen: the browser asks at Start',
    (await page.getByRole('heading', { name: 'Para needs some permissions' }).count()) === 0 &&
      (await page.getByRole('switch').count()) === 0,
  );
}

// ------------------------------------ light always: the phone's dark theme changes nothing
{
  const { page, errors } = await phone({ earlierConsent: true });
  const start = page.getByRole('button', { name: 'Start Tracking' });
  await start.waitFor({ timeout: 20000 });
  const colours = async () => ({
    ...(await page.evaluate(() => ({
      isDark: matchMedia('(prefers-color-scheme: dark)').matches,
      // Chrome writes "only light" back as "light only".
      scheme: getComputedStyle(document.documentElement).colorScheme,
      meta: document.querySelector('meta[name="color-scheme"]')?.getAttribute('content'),
      page: [document.documentElement, document.body].map(
        (e) => getComputedStyle(e).backgroundColor,
      ),
      text: getComputedStyle(document.body).color,
    }))),
    button: await start.evaluate((b) => {
      const style = getComputedStyle(b);
      return [style.backgroundColor, style.color];
    }),
  });
  await page.emulateMedia({ colorScheme: 'light' });
  const light = await colours();
  await page.emulateMedia({ colorScheme: 'dark' });
  const dark = await colours();
  check(
    'the phone in its dark theme: the contributor page stays light (color-scheme "only light")',
    dark.isDark && dark.scheme === 'light only' && dark.meta === 'only light',
    JSON.stringify(dark),
  );
  check(
    '  every colour as in the light theme: the page, its words and Start Tracking',
    JSON.stringify({ ...light, isDark: null }) === JSON.stringify({ ...dark, isDark: null }),
    `${JSON.stringify(light)} vs ${JSON.stringify(dark)}`,
  );
  check('  no page errors', errors.length === 0, errors.join('; '));
  await page.context().close();
}

// ------------------------------------------------------------ the tutorial
{
  const { page, errors } = await phone({ earlierConsent: true });
  await page.getByRole('button', { name: 'Start Tracking' }).waitFor({ timeout: 20000 });
  await page.waitForFunction(() => !!window.__map?.loaded(), null, { timeout: 30000 });
  const locatorWatchersBefore = await page.evaluate(() => window.__locatorWatchers());
  const dialog = page.getByRole('dialog');
  const help = page.getByRole('button', { name: 'How to record' });
  const offer = page.getByRole('region', { name: 'Track your routes' });
  /** The ?, then the card's Start Tutorial: the way into the tutorial. */
  const openTutorial = async () => {
    await help.click();
    await offer.getByRole('button', { name: 'Start Tutorial' }).click();
  };
  /** The coachmark's spotlight round the control it names, and its card on the near side. */
  const placement = (name) =>
    page.evaluate((label) => {
      const target =
        label === null
          ? document.querySelector('[data-start-tracking]')
          : document.querySelector(`button[aria-label="${label}"]`);
      const card = document.querySelector('[role="dialog"]');
      const spot = card?.parentElement?.firstElementChild;
      if (!target || !card || !spot) return null;
      const t = target.getBoundingClientRect();
      const s = spot.getBoundingClientRect();
      const c = card.getBoundingClientRect();
      return {
        isRound:
          Math.abs(s.left - (t.left - 8)) < 1.5 &&
          Math.abs(s.top - (t.top - 8)) < 1.5 &&
          Math.abs(s.width - (t.width + 16)) < 1.5 &&
          Math.abs(s.height - (t.height + 16)) < 1.5,
        isBeside: c.bottom <= s.top - 9 || c.top >= s.bottom + 9,
        isInset: Math.abs(c.left - 32) < 1 && Math.abs(c.right - (innerWidth - 32)) < 1,
      };
    }, name);
  const STEPS = [
    ['Start tracking', null],
    ['Lakad or Sakay', 'Switch to Sakay'],
    ['Flag a stop', 'Flag a stop'],
    ['Pause anytime', 'Pause'],
    ['See more of the map', 'Hide the recording card'],
    ['Stop without saving', 'Discard recording'],
    ['Finish and save', 'Finish'],
  ];
  await openTutorial();
  for (const [index, [title, target]] of STEPS.entries()) {
    await dialog.getByRole('heading', { name: title }).waitFor({ timeout: 10000 });
    const isLast = index === STEPS.length - 1;
    const next = dialog.getByRole('button', { name: isLast ? 'Got it' : 'Next' });
    await page.waitForFunction(
      () => document.activeElement?.closest('[role="dialog"]') !== null,
      null,
      { timeout: 5000 },
    );
    const place = await placement(target);
    const seen = {
      count: await dialog.getByText(`${index + 1} of 7`).count(),
      skips: await dialog.getByRole('button', { name: 'Skip' }).count(),
      focus: await page.evaluate(() => document.activeElement?.textContent),
      recordingWatchers: await page.evaluate(() => window.__watchers()),
      locatorWatchers: await page.evaluate(() => window.__locatorWatchers()),
      // The demo under the overlay: nothing in it can be focused or pressed.
      isTargetInert:
        target === null ||
        (await page.evaluate(
          (label) => !!document.querySelector(`button[aria-label="${label}"]`)?.closest('[inert]'),
          target,
        )),
    };
    check(
      `the tutorial's step ${index + 1}, ${title}: "${index + 1} of 7", ${isLast ? 'Got it alone' : 'Skip and Next'}, focus on ${isLast ? 'Got it' : 'Next'}; the spotlight 8 round ${target ?? 'Start tracking'}, the card 32 in on its near side; no location asked for`,
      seen.count === 1 &&
        seen.skips === (isLast ? 0 : 1) &&
        seen.focus === (isLast ? 'Got it' : 'Next') &&
        !!place?.isRound &&
        place.isBeside &&
        place.isInset &&
        seen.recordingWatchers === 0 &&
        seen.locatorWatchers === locatorWatchersBefore &&
        seen.isTargetInert,
      JSON.stringify({ seen, place }),
    );
    if (index === 0) {
      // A tap on the dimmed page puts focus nowhere in the card; Tab then finds only the card:
      // the page under it, Start and the tabs included, is out of reach.
      await page.mouse.click(196, 200);
      await page.keyboard.press('Tab');
      const tabbedTo = await page.evaluate(() => ({
        isInCard: !!document.activeElement?.closest('[role="dialog"]'),
        name:
          document.activeElement?.getAttribute('aria-label') ?? document.activeElement?.textContent,
      }));
      // Every button outside the card: none may be reached.
      const reachable = await page.evaluate(() =>
        [...document.querySelectorAll('button')]
          .filter((button) => !button.closest('[role="dialog"]') && !button.closest('[inert]'))
          .map((button) => button.getAttribute('aria-label') ?? button.textContent?.trim()),
      );
      check(
        '  a tap on the dimmed page, then Tab, lands in the card: no button outside it is reachable',
        tabbedTo.isInCard && reachable.length === 0,
        JSON.stringify({ tabbedTo, reachable }),
      );
      await next.focus();
    }
    if (index === 3) {
      // Tab goes round the card: from Next back to Skip, never onto the page under it.
      await page.keyboard.press('Tab');
      const afterTab = await page.evaluate(() => document.activeElement?.textContent);
      await page.keyboard.press('Shift+Tab');
      const afterShiftTab = await page.evaluate(() => document.activeElement?.textContent);
      check(
        '  Tab from Next goes to Skip and Shift+Tab back to Next: focus stays in the card',
        afterTab === 'Skip' && afterShiftTab === 'Next',
        JSON.stringify([afterTab, afterShiftTab]),
      );
    }
    await next.click();
  }
  await page.getByRole('button', { name: 'Start Tracking' }).waitFor({ timeout: 5000 });
  check(
    '  Got it is back on Record: no dialog, no demo, Start tracking pressable, nothing recorded, focus on the ?',
    (await dialog.count()) === 0 &&
      (await page.evaluate(() => document.activeElement?.getAttribute('aria-label'))) ===
        'How to record' &&
      (await page.getByRole('button', { name: 'Pause' }).count()) === 0 &&
      (await flagButton(page).count()) === 0 &&
      (await page.evaluate(() => window.__watchers())) === 0,
  );

  // The ? offers the tutorial first: Later, Escape and a tap outside close the offer and nothing else.
  {
    await help.click();
    await offer.waitFor({ timeout: 5000 });
    const open = {
      isFocusInCard: await page.evaluate(
        () => !!document.activeElement?.closest('section[aria-labelledby]'),
      ),
      texts: await offer.locator('button').allTextContents(),
      dialogs: await dialog.count(),
    };
    check(
      '  the ? opens the "Track your routes" card with Later then Start Tutorial, focus in it, no tutorial yet',
      open.isFocusInCard && open.texts.join('|') === 'Later|Start Tutorial' && open.dialogs === 0,
      JSON.stringify(open),
    );
    for (const close of ['Later', 'Escape', 'outside']) {
      if (close === 'Later') await offer.getByRole('button', { name: 'Later' }).click();
      else if (close === 'Escape') await page.keyboard.press('Escape');
      else await page.mouse.click(196, 600);
      await offer.waitFor({ state: 'detached', timeout: 5000 });
      check(
        `  ${close} closes the card: no tutorial, focus on the ?`,
        (await dialog.count()) === 0 &&
          (await page.evaluate(() => document.activeElement?.getAttribute('aria-label'))) ===
            'How to record',
      );
      await help.click();
      await offer.waitFor({ timeout: 5000 });
    }
    await page.keyboard.press('Escape');
    await offer.waitFor({ state: 'detached', timeout: 5000 });
  }
  // Leaving part-way, by Skip and by Escape, is back on Record too.
  for (const leave of ['Skip', 'Escape']) {
    await openTutorial();
    await dialog.getByRole('heading', { name: 'Start tracking' }).waitFor({ timeout: 10000 });
    await dialog.getByRole('button', { name: 'Next' }).click();
    await dialog.getByRole('heading', { name: 'Lakad or Sakay' }).waitFor();
    if (leave === 'Skip') await dialog.getByRole('button', { name: 'Skip' }).click();
    else await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Start Tracking' }).waitFor({ timeout: 5000 });
    check(
      `  ${leave} on step 2 is back on Record: no dialog, no demo recording, focus on the ?`,
      (await page.evaluate(() => document.activeElement?.getAttribute('aria-label'))) ===
        'How to record' &&
        (await dialog.count()) === 0 &&
        (await page.getByRole('button', { name: 'Switch to Sakay' }).count()) === 0 &&
        (await flagButton(page).count()) === 0,
    );
  }
  // The phone's Back closes it, on the page: the entry it added is the one taken off.
  {
    const before = await page.evaluate(() => ({
      url: location.href,
      length: window.history.length,
    }));
    await openTutorial();
    await dialog.getByRole('heading', { name: 'Start tracking' }).waitFor({ timeout: 10000 });
    await dialog.getByRole('button', { name: 'Next' }).click();
    await dialog.getByRole('heading', { name: 'Lakad or Sakay' }).waitFor();
    await page.goBack();
    await page.getByRole('button', { name: 'Start Tracking' }).waitFor({ timeout: 5000 });
    const after = await page.evaluate(() => ({
      url: location.href,
      focus: document.activeElement?.getAttribute('aria-label'),
    }));
    check(
      "  the phone's Back on step 2 closes it and stays on the page: Record, no demo, focus on the ?",
      (await dialog.count()) === 0 &&
        (await page.getByRole('button', { name: 'Switch to Sakay' }).count()) === 0 &&
        after.url === before.url &&
        after.focus === 'How to record',
      JSON.stringify({ before, after }),
    );
  }
  // A move to another screen by its hash (the browser's Forward, say) ends it as well.
  {
    await openTutorial();
    await dialog.getByRole('button', { name: 'Next' }).click();
    await dialog.getByRole('heading', { name: 'Lakad or Sakay' }).waitFor();
    await page.evaluate(() => {
      window.history.pushState(null, '', `${location.pathname}#history`);
      window.dispatchEvent(new window.HashChangeEvent('hashchange'));
    });
    await page.getByRole('heading', { level: 1, name: 'History' }).waitFor({ timeout: 5000 });
    check(
      '  a hash move onto History ends it: History shows with no coachmark and no demo over it',
      (await dialog.count()) === 0 &&
        (await page.getByRole('button', { name: 'Switch to Sakay' }).count()) === 0,
    );
  }
  check('  the tutorial raised no page errors', errors.length === 0, errors.join(' | '));
  await page.context().close();
}

// ---------------------------------------------------------------- the loop
{
  const { page, errors } = await phone();
  await page.getByRole('button', { name: 'Start Tracking' }).waitFor({ timeout: 20000 });
  check(
    'a first visit opens on Start, with no consent screen and focus on the heading',
    (await page.getByRole('heading', { name: 'Before you record' }).count()) === 0 &&
      (await page.evaluate(() => document.activeElement?.id === 'ready-heading')),
  );
  await page.waitForFunction(() => !!window.__map?.loaded(), null, { timeout: 30000 });
  {
    const start = await page.getByRole('button', { name: 'Start Tracking' }).boundingBox();
    const info = await creditsButton(page).boundingBox();
    check(
      "on a first visit the map's ⓘ sits at the bottom left, under Start tracking, and MapLibre's credits are gone",
      start &&
        info &&
        info.y >= start.y + start.height - 0.5 &&
        !(await page.locator('.maplibregl-ctrl-attrib').isVisible()),
      JSON.stringify([info, start]),
    );
  }
  await page.waitForFunction(() => !!window.__map?.loaded());
  const paraMark = await page.locator('[data-para-mark]').boundingBox();
  check(
    "Ready: Para's mark at the top left, 48 px, 20 in and 24 down (Figma's Frame 259), hidden from screen readers",
    paraMark &&
      Math.abs(paraMark.x - 20) < 1 &&
      Math.abs(paraMark.y - 24) < 1 &&
      Math.abs(paraMark.width - 48) < 1 &&
      (await page.locator('[data-para-mark]').getAttribute('aria-hidden')) === 'true',
    JSON.stringify(paraMark),
  );
  check(
    "Ready: Start, the tutorial's ? at the top right (no Back to the map), no saved-recordings list",
    (await page.getByRole('button', { name: 'Back to the map' }).count()) === 0 &&
      (await page.getByRole('button', { name: 'How to record' }).count()) === 1 &&
      (await page.getByText('Saved on this phone').count()) === 0 &&
      (await page.getByText('No saved recordings yet.').count()) === 0,
  );
  {
    const history = historyTab(page);
    check(
      '  with no accounts in the build the tabs under Start tracking are Record and History, no Account; the top right empty, nothing of History shows',
      (await history.count()) === 1 &&
        (await page.getByRole('button', { name: 'History' }).count()) === 1 &&
        (await page.getByRole('button', { name: 'Account' }).count()) === 0 &&
        (await page.getByRole('heading', { name: 'History' }).count()) === 0 &&
        (await page.getByRole('button', { name: 'Start Tracking' }).count()) === 1 &&
        (await page.getByText('Start Tracking').count()) === 1,
    );
    const start = await page.getByRole('button', { name: 'Start Tracking' }).boundingBox();
    const tabs = await page.getByRole('navigation', { name: 'Screens' }).boundingBox();
    const stack = await page.locator('section[aria-labelledby="ready-heading"]').boundingBox();
    check(
      "  as Figma's Record has it (4520:3197): Start tracking 32 in each side and 48 tall, the tabs 12 under it, 48 over the foot",
      !!start &&
        !!tabs &&
        !!stack &&
        Math.abs(stack.y - start.y) <= 1 &&
        Math.abs(start.x - 32) <= 0.5 &&
        Math.abs(start.width - (393 - 64)) <= 0.5 &&
        Math.abs(start.height - 48) <= 0.5 &&
        Math.abs(tabs.y - (start.y + start.height) - 12) <= 0.5 &&
        Math.abs(stack.y + stack.height - (tabs.y + tabs.height) - 48) <= 0.5,
      JSON.stringify([stack, tabs, start]),
    );
    await history.click();
    await page.getByRole('heading', { level: 1, name: 'History' }).waitFor();
    await page
      .waitForFunction(() => document.activeElement?.textContent === 'History', null, {
        timeout: 5000,
      })
      .catch(() => {});
    const opened = {
      hash: await page.evaluate(() => location.hash),
      focus: await page.evaluate(() => document.activeElement?.textContent),
      starts: await page.getByRole('button', { name: 'Start Tracking' }).count(),
      // History is a tab like Account: the toolbar at its foot, History marked, Record beside it.
      tabs: await page.getByRole('navigation', { name: 'Screens' }).count(),
      marked: await page
        .getByRole('navigation', { name: 'Screens' })
        .locator('[aria-current="page"]')
        .textContent(),
      records: await recordTab(page).count(),
      accounts: await page.getByRole('button', { name: 'Account' }).count(),
      backs: await page.getByRole('button', { name: 'Back', exact: true }).count(),
      // Inert, not removed: the map stays mounted, but nothing in it can be focused or pressed.
      isMapInert: await page.evaluate(
        () => !!document.querySelector('button[aria-label="Map design"]')?.closest('[inert]'),
      ),
      empty: await page.getByText('No recordings yet.').count(),
    };
    check(
      '  History opens at #history, focus on its heading, no Start, no Back, the toolbar with History marked and Record (no Account in this build), no map controls reachable',
      opened.hash === '#history' &&
        opened.focus === 'History' &&
        opened.starts === 0 &&
        opened.tabs === 1 &&
        opened.marked === 'History' &&
        opened.records === 1 &&
        opened.accounts === 0 &&
        opened.backs === 0 &&
        opened.isMapInert &&
        opened.empty === 1,
      JSON.stringify(opened),
    );
    await page.reload({ waitUntil: 'load' });
    await page.getByRole('heading', { level: 1, name: 'History' }).waitFor({ timeout: 10000 });
    check('  a reload stays on History', (await page.evaluate(() => location.hash)) === '#history');
    await recordTab(page).click();
    await page.getByRole('button', { name: 'Start Tracking' }).waitFor();
    check(
      '  its Record tab returns to Ready, and the hash is gone',
      (await page.evaluate(() => location.hash)) === '',
    );
    await historyTab(page).click();
    await page.getByRole('heading', { level: 1, name: 'History' }).waitFor();
    await recordTab(page).click();
    await page.getByRole('button', { name: 'Start Tracking' }).waitFor();
    check(
      '  opened from the History tab, Record hands focus back to the History tab',
      await page
        .waitForFunction(
          () =>
            document.activeElement?.textContent === 'History' &&
            !!document.activeElement.closest('nav[aria-label="Screens"]'),
          null,
          { timeout: 5000 },
        )
        .then(() => true)
        .catch(() => false),
    );
    await historyTab(page).click();
    await page.getByRole('heading', { level: 1, name: 'History' }).waitFor();
    await page.goBack();
    await page.getByRole('button', { name: 'Start Tracking' }).waitFor();
    check(
      "  the browser's Back returns to Ready with focus back on the tab too",
      (await page.getByRole('heading', { name: 'History' }).count()) === 0 &&
        (await page
          .waitForFunction(
            () =>
              document.activeElement?.textContent === 'History' &&
              !!document.activeElement.closest('nav[aria-label="Screens"]'),
            null,
            { timeout: 5000 },
          )
          .then(() => true)
          .catch(() => false)),
    );
  }
  check(
    '  the map-style button is on the locator button',
    (await page.getByRole('button', { name: 'Map design' }).count()) === 1,
  );
  check(
    '  nothing scrolls sideways',
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  );
  // The map's first frame is still painting under the buttons for a moment.
  await page.waitForTimeout(1500);
  await shot(page, '1-ready');

  await page.getByRole('button', { name: 'Start Tracking' }).click();
  await page.getByRole('group', { name: 'Recording so far' }).waitFor();
  check(
    'Start begins on Lakad: the stats say so, and the mode button offers Sakay',
    (await page.getByRole('group', { name: 'Recording so far' }).innerText()).includes('Lakad') &&
      (await page.getByRole('group', { name: 'Recording so far' }).innerText()).includes(
        'Recording',
      ) &&
      (await buttons(page)).join('|').includes('Switch to Sakay'),
  );
  check(
    '  Pause, Switch to Sakay and ✕ (Discard recording) are buttons, and nothing else ends it',
    (await page.getByRole('button', { name: 'Finish', exact: true }).count()) === 0 &&
      (
        await Promise.all(
          ['Pause', 'Switch to Sakay', 'Discard recording'].map((n) =>
            page.getByRole('button', { name: n, exact: true }).count(),
          ),
        )
      ).every((c) => c === 1),
  );
  check(
    '  the stats are not a live region; every status region is empty',
    (await page.locator('[aria-live]').count()) === 0 &&
      (await page.getByRole('status').allInnerTexts()).every((text) => text === ''),
  );

  // Out 1.2 km, a fix every 100 m.
  await ride(page, 0, 1200);
  await page.waitForTimeout(1500);
  const outDistance = await page.getByRole('group', { name: 'Recording so far' }).innerText();
  check(
    'the distance reads one decimal: 1.2 km',
    /1\.2\s*km/.test(outDistance),
    outDistance.replace(/\n/g, ' '),
  );
  await page.waitForFunction(() => !window.__map.isMoving(), null, { timeout: 30000 });
  check(
    "Start puts the locator on the ride: the camera follows it, north up, and the dot is the locator's",
    (await locatorMode(page)) === 'TrackedLocation' &&
      (await centreOff(page, 1200)) < 15 &&
      Math.abs((await bearing(page)) % 360) < 1 &&
      (await page.locator('[data-testid="locator-overlay"]').count()) === 1,
    `${await locatorMode(page)}, ${(await centreOff(page, 1200)).toFixed(1)} m off, bearing ${await bearing(page)}`,
  );
  const lift = await page.evaluate(([lng, lat]) => {
    const stack = parseFloat(document.documentElement.style.getPropertyValue('--stack-room'));
    return { y: window.__map.project([lng, lat]).y, mid: (innerHeight - stack) / 2, stack };
  }, eastOf(1200));
  check(
    '  and it sits lifted clear of the bottom bars, in the middle of the map above them',
    lift.stack > 0 && Math.abs(lift.y - lift.mid) < 3,
    JSON.stringify(lift),
  );
  const outData = await mapSource(page);
  check(
    'the trail is drawn live: one walked line, and the start leaves no switch dot',
    outData?.features.filter((f) => f.properties.mode === 'walk').length === 1 &&
      outData.features.filter((f) => f.properties.kind === 'switch').length === 0,
  );
  const paint = await page.evaluate(() => {
    const paintOf = (id, name) => window.__map.getPaintProperty(id, name);
    return JSON.stringify({
      ride: paintOf('recording-trail-line', 'line-color'),
      walk: paintOf('recording-trail-walk', 'line-color'),
      dashes: paintOf('recording-trail-walk', 'line-dasharray'),
      cap: window.__map.getLayoutProperty('recording-trail-walk', 'line-cap'),
      foot: window.__map.getLayoutProperty('recording-trail-feet', 'icon-image'),
      hasFoot: window.__map.hasImage('recording-trail-foot'),
    });
  });
  check(
    "  walked in round dashes with a foot along it in blue/700, ridden solid in green/700, the tint's Lakad and Sakay from map-colours",
    paint ===
      JSON.stringify({
        ride: '#008236',
        walk: '#1447e6',
        dashes: [0.5, 2],
        cap: 'round',
        foot: 'recording-trail-foot',
        hasFoot: true,
      }),
    paint,
  );
  await shot(page, '2-recording-lakad');
  check(
    "  Lakad tints the map's edges blue/700 at 10%, Figma's OverlayIndicator",
    (await tintOf(page)) === 'lakad:from-blue-700/10',
  );

  // Pause, and Resume carries on. Watched from inside the page: the frost is whole in the same
  // frame Resume first shows, not faded or ringed in after it.
  await page.evaluate(() => {
    window.__frostAtPause = new Promise((resolve) => {
      const seen = new MutationObserver(() => {
        const isPaused = [...document.querySelectorAll('button')].some(
          (button) =>
            button.textContent.trim() === 'Resume' ||
            button.getAttribute('aria-label') === 'Resume',
        );
        if (!isPaused) return;
        seen.disconnect();
        const layer = document.querySelector('[data-map-frost]');
        resolve({
          visibility: layer ? getComputedStyle(layer).visibility : 'missing',
          opacity: layer ? getComputedStyle(layer).opacity : 'missing',
          transition: layer ? getComputedStyle(layer).transitionDuration : 'missing',
          rings: layer?.querySelectorAll('[data-frost-ring]').length ?? 0,
        });
      });
      seen.observe(document.body, { childList: true, subtree: true, characterData: true });
    });
  });
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await page.getByRole('button', { name: 'Resume' }).waitFor();
  const frostAtPause = await page.evaluate(() => window.__frostAtPause);
  check(
    '  the frost is whole the moment Paused shows: visible, all four layers, no fade',
    frostAtPause.visibility === 'visible' &&
      frostAtPause.opacity === '1' &&
      frostAtPause.transition === '0s' &&
      frostAtPause.rings === 4,
    JSON.stringify(frostAtPause),
  );
  check(
    '  Paused tints them neutral/900, and Flag a stop shows, disabled',
    (await tintOf(page)) === 'paused:from-neutral-900/10' && (await flagButton(page).isDisabled()),
  );
  const pausedCard = await page.getByRole('group', { name: 'Recording so far' }).innerText();
  check(
    'Pause: Resume and Finish replace Pause and the mode button, and the card says Paused and --',
    (await page.getByRole('button', { name: 'Pause', exact: true }).count()) === 0 &&
      (await page.getByRole('button', { name: /^Switch to/ }).count()) === 0 &&
      (await page.getByRole('button', { name: 'Finish', exact: true }).count()) === 1 &&
      (await page.getByRole('button', { name: 'Discard recording' }).count()) === 1 &&
      pausedCard.includes('Paused') &&
      pausedCard.includes('--'),
    pausedCard.replace(/\n/g, ' '),
  );
  // Paused, the map frosts over; the card and the map's own buttons stay crisp over it.
  const frost = page.locator('[data-map-frost]');
  await frost.waitFor({ state: 'attached', timeout: 5000 });
  const frosted = await page.evaluate(() => {
    const layer = document.querySelector('[data-map-frost]');
    // What a tap at an element's middle reaches, and whether any of its ancestors is filtered.
    const crisp = (el) => {
      if (!el) return 'missing';
      const box = el.getBoundingClientRect();
      const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
      for (let node = el; node; node = node.parentElement) {
        if (getComputedStyle(node).filter !== 'none') return 'filtered';
      }
      return hit && (el === hit || el.contains(hit)) ? 'crisp' : 'covered';
    };
    const box = layer.getBoundingClientRect();
    const dot = document.querySelector('[data-testid="locator-overlay"]').getBoundingClientRect();
    const rings = [...layer.querySelectorAll('[data-frost-ring]')].map((ring) => ({
      blur: Number(/blur\(([\d.]+)px\)/.exec(getComputedStyle(ring).backdropFilter)?.[1]),
      mask: getComputedStyle(ring).maskImage,
    }));
    return {
      centre: [Number(layer.dataset.frostX), Number(layer.dataset.frostY)],
      clear: Number(layer.dataset.frostClear),
      dot: [dot.left + dot.width / 2 - box.left, dot.top + dot.height / 2 - box.top],
      blurs: rings.map((ring) => ring.blur),
      reached: Math.hypot(...rings.map((ring) => ring.blur)),
      masked: rings.every((ring) => ring.mask.startsWith('radial-gradient')),
      wash: getComputedStyle(layer.querySelector('[data-frost-wash]')).backgroundColor,
      card: crisp(document.querySelector('[aria-label="Recording so far"]')),
      resume: crisp([...document.querySelectorAll('button')].find((b) => b.innerText === 'Resume')),
      mapDesign: crisp(document.querySelector('button[aria-label="Map design"]')),
    };
  });
  check(
    '  paused, the map is frosted round the dot: clear at it, four layers to an 8 px blur, a faint white wash, the card and map buttons crisp over it',
    Math.hypot(frosted.centre[0] - frosted.dot[0], frosted.centre[1] - frosted.dot[1]) < 2 &&
      frosted.clear >= 80 &&
      frosted.blurs.length === 4 &&
      Math.abs(frosted.reached - 8) < 0.05 &&
      frosted.masked &&
      // The surface's white at 25%, however the browser writes the colour.
      /[,/] ?0\.25\)$/.test(frosted.wash) &&
      frosted.card === 'crisp' &&
      frosted.resume === 'crisp' &&
      frosted.mapDesign === 'crisp',
    JSON.stringify(frosted),
  );
  // The pixels: the frost against the same moment without it. Round the dot (outside the dot
  // itself, inside the clear radius) nothing changes; at the map's left edge it does.
  const mapBox = await page.locator('[data-map-frost]').boundingBox();
  const mapShot = () => page.screenshot({ clip: mapBox }).then((png) => png.toString('base64'));
  const withFrost = await mapShot();
  await page.evaluate(() => {
    document.querySelector('[data-map-frost]').style.display = 'none';
  });
  const withoutFrost = await mapShot();
  await page.evaluate(() => {
    document.querySelector('[data-map-frost]').style.display = '';
  });
  const changed = await page.evaluate(
    async ([a, b, [x, y], scale]) => {
      const pixels = async (src) => {
        const img = document.createElement('img');
        img.src = `data:image/png;base64,${src}`;
        await img.decode();
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const context = canvas.getContext('2d');
        context.drawImage(img, 0, 0);
        return context.getImageData(0, 0, img.width, img.height);
      };
      const [one, two] = await Promise.all([pixels(a), pixels(b)]);
      const at = (image, px, py) => {
        const i = (Math.round(py * scale) * image.width + Math.round(px * scale)) * 4;
        return [image.data[i], image.data[i + 1], image.data[i + 2]];
      };
      const differ = (points) =>
        points.reduce((sum, [px, py]) => {
          const [p, q] = [at(one, px, py), at(two, px, py)];
          return sum + Math.abs(p[0] - q[0]) + Math.abs(p[1] - q[1]) + Math.abs(p[2] - q[2]);
        }, 0) / points.length;
      const round = [...Array(24)].map((_, k) => [
        x + 40 * Math.cos((k * Math.PI) / 12),
        y + 40 * Math.sin((k * Math.PI) / 12),
      ]);
      const edge = [...Array(24)].map((_, k) => [4, 40 + k * 10]);
      return { nearDot: differ(round), edge: differ(edge) };
    },
    [withFrost, withoutFrost, frosted.dot, 2],
  );
  check(
    '  the dot’s street keeps its own pixels; the map’s edge is frosted',
    changed.nearDot < 1 && changed.edge > 2,
    JSON.stringify(changed),
  );
  await page.getByRole('button', { name: 'Resume' }).click();
  await page.getByRole('button', { name: 'Pause', exact: true }).waitFor();
  check(
    '  Resume clears the frost: gone from the page, not painted',
    await frost.waitFor({ state: 'detached', timeout: 5000 }).then(
      () => true,
      () => false,
    ),
  );
  check(
    '  and the frost layer is invisible, nothing left over the map',
    await page
      .waitForFunction(
        () => {
          const layer = document.querySelector('[data-testid="map-view"] ~ div[aria-hidden]');
          return !!layer && getComputedStyle(layer).visibility === 'hidden';
        },
        null,
        { timeout: 5000 },
      )
      .then(
        () => true,
        () => false,
      ),
  );

  // The mode button.
  await page.getByRole('button', { name: 'Switch to Sakay' }).click();
  await page.getByRole('button', { name: 'Switch to Lakad' }).waitFor();
  check(
    'the mode switch is announced once, politely, and the stats now say Sakay',
    (await statusText(page)) === 'Switched to Sakay' &&
      (await page.getByRole('group', { name: 'Recording so far' }).innerText()).includes('Sakay'),
    `${await statusText(page)} / ${(await page.getByRole('group', { name: 'Recording so far' }).innerText()).replace(/\n/g, ' ')}`,
  );
  const afterSwitch = await mapSource(page);
  check(
    'a dot is left at the switch',
    afterSwitch?.features.filter((f) => f.properties.kind === 'switch').length === 1,
  );
  await ride(page, 1190, 700);
  await page.waitForTimeout(1200);
  const sakayData = await mapSource(page);
  const lineOf = (mode) =>
    sakayData.features.filter(
      (f) => f.geometry.type === 'LineString' && f.properties.mode === mode,
    );
  check(
    'a walked line and a ridden line, joined at the switch',
    lineOf('ride').length === 1 &&
      lineOf('walk').length === 1 &&
      JSON.stringify(lineOf('ride')[0].geometry.coordinates[0]) ===
        JSON.stringify(lineOf('walk')[0].geometry.coordinates.at(-1)),
  );
  check(
    '  no dot of the recording is drawn: the locator is the one dot',
    sakayData.features.every((f) => f.properties.kind !== 'here'),
  );
  await shot(page, '3-recording-sakay');

  check(
    "  Sakay tints the map's edges green/700 at 10%",
    (await tintOf(page)) === 'sakay:from-green-700/10',
  );

  // Flag a stop: Figma's flagstop pin where the trail is, a "Stop flagged" toast, nothing to answer.
  const flagBox = await flagButton(page).boundingBox();
  const locatorBox = await locate(page).boundingBox();
  const styleBox = await page.getByRole('button', { name: 'Map design' }).boundingBox();
  check(
    'while recording, Flag a stop is a 48 px button at the top of the right-hand column, 16 over the map-style button',
    flagBox?.width === 48 &&
      flagBox.height === 48 &&
      Math.abs(flagBox.x - locatorBox.x) < 1 &&
      Math.abs(styleBox.y - (flagBox.y + flagBox.height) - 16) < 0.5 &&
      Math.abs(393 - (locatorBox.x + locatorBox.width) - 20) < 0.5,
    JSON.stringify([flagBox, styleBox, locatorBox]),
  );
  await flagButton(page).click();
  const stopFlagged = toastSaying(page, 'Stop flagged');
  await stopFlagged.waitFor({ timeout: 5000 });
  check(
    '  on Sakay a tap says "Stop flagged" in a compact info toast at the top (no ✕), politely, with no dialog',
    (await page.getByTestId('toast').count()) === 1 &&
      (await stopFlagged.getAttribute('data-kind')) === 'info' &&
      (await stopFlagged.getAttribute('data-size')) === 'compact' &&
      (await stopFlagged.getByRole('button', { name: 'Close' }).count()) === 0 &&
      (await page.getByRole('status').filter({ hasText: 'Stop flagged' }).count()) === 1 &&
      (await page
        .getByRole('status')
        .filter({ hasText: /Flagged, \d/ })
        .count()) === 0 &&
      (await page.getByRole('dialog').count()) === 0,
    await page
      .getByTestId('toast')
      .allInnerTexts()
      .then((texts) => texts.join(' | ')),
  );
  check(
    '  the dark "Flagged" pill beside the button is gone',
    (await page.getByTestId('flagged-note').count()) === 0 &&
      (await page.getByText('Flagged', { exact: true }).count()) === 0,
  );
  await shot(page, '3b-flagged');
  const marked = await mapSource(page);
  check(
    "  Figma's flagstop pin is left on the trail, its point on the place, above the line",
    marked?.features.filter((f) => f.properties.kind === 'mark').length === 1 &&
      (await page.evaluate(() => {
        const m = window.__map;
        const layer = m.getLayer('recording-trail-marks');
        const ids = m.getStyle().layers.map((l) => l.id);
        return (
          layer?.type === 'symbol' &&
          m.getLayoutProperty('recording-trail-marks', 'icon-image') === 'recording-trail-flag' &&
          m.getLayoutProperty('recording-trail-marks', 'icon-anchor') === 'bottom-left' &&
          m.hasImage('recording-trail-flag') &&
          ids.indexOf('recording-trail-marks') > ids.indexOf('recording-trail-line')
        );
      })),
  );
  // A second flag while it shows: the same toast, said again in place, never a second.
  await flagButton(page).click();
  await page.waitForTimeout(300);
  check(
    '  a second flag while it shows: still exactly one toast',
    (await page.getByTestId('toast').count()) === 1 && (await stopFlagged.count()) === 1,
    `${await page.getByTestId('toast').count()} toast(s)`,
  );
  check(
    '  "Stop flagged" leaves by itself',
    await stopFlagged.waitFor({ state: 'detached', timeout: 8000 }).then(
      () => true,
      () => false,
    ),
  );

  // The locator's cycle: turn with the compass, north up again, a pan lets go, a tap follows.
  await face(page, 270);
  await locate(page).click();
  await page.waitForFunction(
    () => Math.abs(((window.__map.getBearing() + 360) % 360) - 270) < 5,
    null,
    {
      timeout: 30000,
    },
  );
  check(
    'a tap on the locator turns the map the way the phone faces: west, as the ride goes',
    (await locatorMode(page)) === 'TracksTheMapBasedOnCompassFacing',
    `${await locatorMode(page)}, bearing ${await bearing(page)}`,
  );
  check(
    '  its label has become "Put north up"',
    (await locate(page).getAttribute('aria-label')) === 'Put north up',
  );
  await locate(page).click();
  await page.waitForFunction(
    () => Math.abs(window.__map.getBearing()) < 1 || Math.abs(window.__map.getBearing()) > 359,
    null,
    { timeout: 30000 },
  );
  check(
    'the next tap puts north up again, still following',
    (await locatorMode(page)) === 'TrackedLocation',
    await locatorMode(page),
  );
  await page.mouse.move(200, 300);
  await page.mouse.down();
  await page.mouse.move(120, 360, { steps: 6 });
  await page.mouse.up();
  await page.waitForFunction(() => !window.__map.isMoving(), null, { timeout: 30000 });
  check(
    'a pan lets the camera go: the locator button offers the way back',
    (await locatorMode(page)) === 'TrackOwnLocation' &&
      (await locate(page).getAttribute('aria-label')) === 'Show where I am',
    await locatorMode(page),
  );
  // The drag's glide is over; then a fix arrives, and the camera must not follow it.
  const centreBefore = await page.evaluate(() => window.__map.getCenter().lng);
  await ride(page, 690, 640);
  await page.waitForTimeout(1500);
  check(
    '  a new fix does not move a map the finger took',
    Math.abs((await page.evaluate(() => window.__map.getCenter().lng)) - centreBefore) < 1e-6,
  );
  await locate(page).click();
  await page.waitForFunction(() => !window.__map.isMoving(), null, { timeout: 30000 });
  check(
    '  a tap brings the camera back to the ride',
    (await locatorMode(page)) === 'TrackedLocation' && (await centreOff(page, 640)) < 15,
    `${await locatorMode(page)}, ${(await centreOff(page, 640)).toFixed(1)} m off`,
  );

  // Back near the start, the recording goes on: it ends only when the contributor saves it.
  await ride(page, 630, 150);
  await page.waitForTimeout(1500);
  check(
    'back within 300 m of the start after a kilometre, the recording goes on: it never stops itself',
    (await page.getByRole('button', { name: 'Pause', exact: true }).count()) === 1 &&
      (await page.getByRole('heading', { name: 'Save Recording' }).count()) === 0,
  );
  await finishRecording(page);
  await page.getByRole('heading', { name: 'Save Recording' }).waitFor({ timeout: 10000 });
  check(
    'Pause and Finish open the Save form, focus on its heading',
    await page.evaluate(() => document.activeElement?.textContent === 'Save Recording'),
  );
  check('  the watch let go of the GPS', (await page.evaluate(() => window.__watchers())) === 0);
  const labels = await page.locator('label').allInnerTexts();
  check(
    '  five visible labels: start point name, end point name, fare, What did you ride?, description',
    ['Start point name', 'End point name', 'Fare', 'What did you ride?', 'Description'].every((l) =>
      labels.some((t) => t.startsWith(l)),
    ),
    labels.map((l) => l.split('\n')[0]).join(' | '),
  );
  check(
    '  Save recording and Resume, Discard recording, and "Saves by itself in" quietly',
    (await page.getByRole('button', { name: 'Save recording' }).count()) === 1 &&
      (await page.getByRole('button', { name: 'Resume', exact: true }).count()) === 1 &&
      (await page.getByRole('button', { name: 'Discard recording' }).count()) === 1 &&
      /Saves by itself in \d:\d\d/.test(await page.locator('form').innerText()),
  );
  await shot(page, '4-form');
  await page.getByRole('button', { name: 'Save recording' }).click();
  const recorded = toastSaying(page, 'Route recorded');
  await recorded.waitFor({ timeout: 5000 });
  await page.getByRole('button', { name: 'Start Tracking' }).waitFor();
  check(
    'Save recording with nothing typed saves and is straight back on Record: no Saved screen',
    (await page.getByRole('heading', { name: 'Successfully recorded' }).count()) === 0 &&
      (await page.getByRole('button', { name: 'Record again' }).count()) === 0 &&
      (await page.getByText('Saved on this phone').count()) === 0,
  );
  // This build uploads nothing, so the route stays on the phone.
  check(
    '  one "Route recorded" info toast, with the check, saying it is kept on this phone, read politely',
    (await page.getByTestId('toast').count()) === 1 &&
      (await recorded.getAttribute('data-kind')) === 'info' &&
      (await recorded.innerText()).includes('Kept on this phone.') &&
      (await page.getByRole('status').filter({ hasText: 'Route recorded' }).count()) === 1,
    await page
      .getByTestId('toast')
      .allInnerTexts()
      .then((texts) => texts.join(' | ')),
  );
  check(
    '  focus lands on Start tracking',
    await page.evaluate(() => document.activeElement?.hasAttribute('data-start-tracking') ?? false),
    await page.evaluate(() => document.activeElement?.outerHTML.slice(0, 80) ?? 'none'),
  );
  await shot(page, '5-route-recorded');
  // Nothing of the recording stays over Record: no card, no Start morph's ghost, and nothing of
  // the page's fixed over the screen but the toasts' own place (ToastHost's, at --toast-top).
  const leftOver = await page.evaluate(() => ({
    card: document.querySelectorAll('[data-recording-card]').length,
    ghost: document.querySelectorAll('[data-start-morph]').length,
    recordingGroup: document.querySelectorAll('[aria-label="Recording so far"]').length,
    fixed: [...document.querySelectorAll('body *')]
      .filter((el) => getComputedStyle(el).position === 'fixed')
      .filter((el) => !el.closest('[class*="--toast-top"]'))
      .map((el) => `${el.tagName.toLowerCase()}.${el.className}`.slice(0, 80)),
  }));
  check(
    '  no recording card, pill or ghost is left over Record after the save',
    leftOver.card === 0 &&
      leftOver.ghost === 0 &&
      leftOver.recordingGroup === 0 &&
      leftOver.fixed.length === 0,
    JSON.stringify(leftOver),
  );
  check(
    'Record offers no Download after a save: the ride is kept on the phone, nothing handed over',
    (await page.getByRole('button', { name: /download/i }).count()) === 0,
  );
  const file = await lastSavedRide(page);
  check(
    'the phone keeps the ride: its start on Lakad and its switch to Sakay, no details, many fixes',
    JSON.stringify(file.modes.map((m) => m.to)) === '["walk","ride"]' &&
      file.startPointName === '' &&
      file.rideKind === null &&
      file.fixes > 20 &&
      file.savedAt !== null,
    `${file.modes.length} modes, ${file.fixes} fixes`,
  );
  // Two: the flag, and the second while "Stop flagged" showed.
  check(
    '  and its two marks',
    file.marks.length === 2 && file.marks.every((mark) => Number.isFinite(mark.time)),
    `${file.marks.length} marks`,
  );
  check('  and no Flag a stop on Record', (await flagButton(page).count()) === 0);
  check(
    '  "Route recorded" leaves by itself',
    await recorded.waitFor({ state: 'detached', timeout: 8000 }).then(
      () => true,
      () => false,
    ),
  );
  check('no page errors on the loop', errors.length === 0, errors.join('; '));
  await page.context().close();
}

// ----------------------------------------------- Finish by hand, and ✕
{
  const { page, errors } = await phone();
  await page.getByRole('button', { name: 'Start Tracking' }).click();
  await page.getByRole('group', { name: 'Recording so far' }).waitFor();
  await ride(page, 0, 300);

  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await page.getByRole('button', { name: 'Resume' }).waitFor();
  await page.evaluate(() => window.__advance(600_000));
  await page.getByRole('button', { name: 'Resume' }).click();
  await page.getByRole('button', { name: 'Pause', exact: true }).waitFor();
  check(
    'after ten minutes stopped, Resume shows no time for the pause before the first new fix',
    /Time\s+\d+ sec/.test(await page.getByRole('group', { name: 'Recording so far' }).innerText()),
    (await page.getByRole('group', { name: 'Recording so far' }).innerText()).replace(/\n/g, ' '),
  );
  await ride(page, 310, 330);
  // ✕ pauses the recording and asks over the whole screen.
  const stopScreen = page.getByRole('alertdialog', { name: 'Stop and delete this ride?' });
  const distanceShown = (await page.getByRole('group', { name: 'Recording so far' }).innerText())
    .match(/Distance\s+(\S+ \S+)|(\S+ (?:m|km))\s+Distance/)
    ?.slice(1)
    .find(Boolean);
  await page.getByRole('button', { name: 'Discard recording' }).click();
  await stopScreen.waitFor();
  check(
    '✕ pauses the recording and asks on a screen of its own, with the distance so far, focus on Keep recording',
    (await page.evaluate(() => window.__watchers())) === 0 &&
      (await stopScreen.getAttribute('aria-modal')) === 'true' &&
      (
        await page.evaluate(() => {
          const screen = document.querySelector('[role="alertdialog"]');
          const text = document.getElementById(screen?.getAttribute('aria-describedby') ?? '');
          return text?.textContent ?? '';
        })
      ).startsWith('You’ve recorded ') &&
      (await stopScreen.innerText()).includes('Recording Paused') &&
      (await page.evaluate(() => document.activeElement?.textContent === 'Keep recording')) &&
      (await page.evaluate(
        () => !!document.querySelector('[aria-label="Discard recording"]')?.closest('[inert]'),
      )),
    distanceShown,
  );
  for (let i = 0; i < 3; i += 1) await page.keyboard.press('Tab');
  check(
    '  Tab goes round its two buttons',
    await page.evaluate(() => !!document.activeElement?.closest('[role="alertdialog"]')),
  );
  // Where the question and the figures stand, and whether the screen scrolls to reach them.
  const stopLayout = () =>
    page.evaluate(() => {
      const screen = document.querySelector('[role="alertdialog"]');
      const box = (testId) =>
        screen.querySelector(`[data-testid="${testId}"]`).getBoundingClientRect();
      const question = box('stop-question');
      const paused = box('stop-paused');
      return {
        middle: question.top + question.height / 2,
        questionBottom: question.bottom,
        pausedTop: paused.top,
        pausedBottom: paused.bottom,
        height: screen.clientHeight,
        isScrolling: screen.scrollHeight > screen.clientHeight,
      };
    });
  {
    const layout = await stopLayout();
    check(
      "  as the frame has it: the question's middle 40 over the screen's, the figures at its foot, no scroll",
      Math.abs(layout.middle - (layout.height / 2 - 40)) < 1 &&
        Math.abs(layout.pausedBottom - layout.height) < 1 &&
        layout.questionBottom <= layout.pausedTop &&
        !layout.isScrolling,
      JSON.stringify(layout),
    );
  }
  // A short phone, or one on its side: the whole screen scrolls, the figures last, nothing overlaps.
  await page.setViewportSize({ width: 360, height: 480 });
  await page.waitForTimeout(200);
  {
    const layout = await stopLayout();
    const keep = stopScreen.getByRole('button', { name: 'Keep recording' });
    const stop = stopScreen.getByRole('button', { name: 'Stop without saving' });
    await stop.scrollIntoViewIfNeeded();
    const isStopInView = await stop.evaluate((button) => {
      const { top, bottom } = button.getBoundingClientRect();
      return top >= 0 && bottom <= window.innerHeight;
    });
    // Scrolled to the end, the figures are whole on the screen.
    const isPausedInView = await stopScreen.evaluate((screen) => {
      screen.scrollTop = screen.scrollHeight;
      const paused = screen.querySelector('[data-testid="stop-paused"]').getBoundingClientRect();
      return paused.top >= 0 && paused.bottom <= window.innerHeight + 0.5;
    });
    await keep.scrollIntoViewIfNeeded();
    const isKeepInView = await keep.evaluate((button) => {
      const { top, bottom } = button.getBoundingClientRect();
      return top >= 0 && bottom <= window.innerHeight;
    });
    check(
      '  at 360×480 the screen scrolls: both answers and the figures are reached, none over another',
      layout.isScrolling &&
        layout.questionBottom + 24 <= layout.pausedTop + 0.5 &&
        isStopInView &&
        isPausedInView &&
        isKeepInView,
      JSON.stringify({ ...layout, isStopInView, isPausedInView, isKeepInView }),
    );
  }
  await page.setViewportSize({ width: 393, height: 852 });
  await stopScreen.getByRole('button', { name: 'Keep recording' }).click();
  await stopScreen.waitFor({ state: 'detached' });
  check(
    '  Keep recording resumes the recording it paused, and puts focus back on ✕',
    (await page.getByRole('button', { name: 'Pause', exact: true }).count()) === 1 &&
      (await page.evaluate(() => window.__watchers())) === 1 &&
      (await page.evaluate(
        () => document.activeElement?.getAttribute('aria-label') === 'Discard recording',
      )),
  );
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await page.getByRole('button', { name: 'Resume' }).waitFor();
  await page.getByRole('button', { name: 'Discard recording' }).click();
  await stopScreen.waitFor();
  await page.keyboard.press('Escape');
  await stopScreen.waitFor({ state: 'detached' });
  check(
    '  paused before ✕, Escape keeps recording and it stays paused',
    (await page.getByRole('button', { name: 'Resume' }).count()) === 1 &&
      (await page.evaluate(
        () => document.activeElement?.getAttribute('aria-label') === 'Discard recording',
      )),
  );
  await page.getByRole('button', { name: 'Resume' }).click();
  await page.getByRole('button', { name: 'Pause', exact: true }).waitFor();
  await finishRecording(page);
  await page.getByRole('heading', { name: 'Save Recording' }).waitFor();
  check(
    'Pause and Finish by hand stop the recording and show the same form',
    (await page.evaluate(() => window.__watchers())) === 0 &&
      (await page.getByRole('button', { name: 'Save recording' }).count()) === 1,
  );
  // "What did you ride?": a sheet that holds the keyboard, its rides a radio group.
  const rideField = page.getByRole('button', { name: 'What did you ride?' });
  const rideSheet = page.getByRole('dialog', { name: 'What did you ride?' });
  const isFocusOnRideField = () =>
    page.evaluate(() => document.activeElement?.getAttribute('aria-haspopup') === 'dialog');
  await rideField.click();
  await rideSheet.waitFor();
  const rides = (await rideSheet.getByRole('radio').allInnerTexts()).map((t) => t.trim());
  check(
    '"What did you ride?" opens a sheet of seven rides, Others last and no Tricycle, focus in it',
    JSON.stringify(rides) ===
      JSON.stringify(['Jeep', 'E-Jeep', 'UV Express', 'Bus', 'Train', 'Ferry', 'Others']) &&
      (await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'))),
    rides.join(' | '),
  );
  await page.keyboard.press('Escape');
  check(
    '  Escape closes it with nothing picked, focus back on the field, still "Pick one"',
    (await rideSheet.count()) === 0 &&
      (await isFocusOnRideField()) &&
      (await rideField.innerText()).includes('Pick one'),
  );
  await rideField.click();
  await rideSheet.waitFor();
  await rideSheet.getByRole('button', { name: 'Close' }).click();
  check('  ✕ closes it too', (await rideSheet.count()) === 0 && (await isFocusOnRideField()));
  await rideField.click();
  await rideSheet.waitFor();
  const focusName = () =>
    page.evaluate(
      () =>
        document.activeElement?.getAttribute('aria-label') ??
        document.activeElement?.textContent?.trim(),
    );
  await page.keyboard.press('Tab');
  const afterOneTab = await focusName();
  await page.keyboard.press('Tab');
  const afterTwoTabs = await focusName();
  await page.keyboard.press('Tab');
  const afterThreeTabs = await focusName();
  check(
    '  Tab goes round inside it: ✕, the rides (one stop), and back to ✕',
    afterOneTab === 'Close' && afterTwoTabs === 'Jeep' && afterThreeTabs === 'Close',
    [afterOneTab, afterTwoTabs, afterThreeTabs].join(' → '),
  );
  await page.keyboard.press('Tab');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Tab');
  const afterArrowTab = await focusName();
  await page.keyboard.press('Shift+Tab');
  const afterArrowShiftTab = await focusName();
  check(
    '  after an arrow key, Tab still stays inside it (back to ✕), and Shift+Tab returns to the ride moved to',
    (await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'))) &&
      afterArrowTab === 'Close' &&
      afterArrowShiftTab === 'E-Jeep',
    [afterArrowTab, afterArrowShiftTab].join(' → '),
  );
  await page.keyboard.press('Enter');
  check(
    '  the arrow keys move along the rides, and Enter picks one: the sheet closes, the field shows it',
    (await rideSheet.count()) === 0 &&
      (await isFocusOnRideField()) &&
      (await rideField.innerText()).includes('E-Jeep'),
    await rideField.innerText(),
  );

  // Discard asks over the whole screen, as ✕ does while recording; Keep it is back to the form.
  await page.getByLabel('Start point name').fill('Tala');
  await page.getByRole('button', { name: 'Discard recording' }).click();
  const discardQuestion = page.getByRole('alertdialog');
  await discardQuestion.waitFor();
  check(
    'Discard recording on the form asks first, on the Stopping screen: Keep it or Stop without saving',
    (await discardQuestion.getByRole('button', { name: 'Keep it' }).count()) === 1 &&
      (await discardQuestion.getByRole('button', { name: 'Stop without saving' }).count()) === 1 &&
      (await discardQuestion.getByRole('button', { name: 'Keep recording' }).count()) === 0,
  );
  await discardQuestion.getByRole('button', { name: 'Keep it' }).click();
  check(
    '  Keep it is back on the form as it was, focus on Discard recording',
    (await page.getByRole('alertdialog').count()) === 0 &&
      (await page.getByLabel('Start point name').inputValue()) === 'Tala' &&
      (await focusName()) === 'Discard recording',
  );

  await page.getByLabel('End point name').fill('Cubao');
  await page.getByLabel('Fare').fill('15');
  await rideField.click();
  await page.getByRole('radio', { name: 'Jeep', exact: true }).click();
  await page.getByRole('button', { name: 'Save recording' }).click();
  await page.getByTestId('toast').filter({ hasText: 'Route recorded' }).waitFor();
  const file = await lastSavedRide(page);
  check(
    'Save recording saves with the details, the fare among them',
    file.startPointName === 'Tala' &&
      file.endPointName === 'Cubao' &&
      file.rideKind === 'Jeep' &&
      file.farePhp === 15,
    JSON.stringify([file.startPointName, file.endPointName, file.rideKind, file.farePhp]),
  );

  // Discard's Stop without saving throws the stopped recording away.
  await page.getByRole('button', { name: 'Start Tracking' }).click();
  await page.getByRole('group', { name: 'Recording so far' }).waitFor();
  await ride(page, 0, 100);
  await finishRecording(page);
  await page.getByRole('heading', { name: 'Save Recording' }).waitFor();
  await page.getByRole('button', { name: 'Discard recording' }).click();
  await page.getByRole('button', { name: 'Stop without saving' }).click();
  await page.getByRole('button', { name: 'Start Tracking' }).waitFor();
  const afterDiscard = await stored(page);
  check(
    '  and Stop without saving from the form throws it away and lands on Start',
    afterDiscard.recordings.every((r) => r.status === 'saved') &&
      (await lastSavedRide(page)).startPointName === 'Tala',
    JSON.stringify(afterDiscard.recordings),
  );
  await page.getByRole('button', { name: 'Start Tracking' }).click();
  await page.getByRole('button', { name: 'Discard recording' }).waitFor();
  await page.getByRole('button', { name: 'Discard recording' }).click();
  await page.getByRole('button', { name: 'Stop without saving' }).click();
  await page.getByRole('button', { name: 'Start Tracking' }).waitFor();
  check(
    '✕ then Stop without saving throws the recording away and lands on Start',
    (await page.getByRole('alertdialog').count()) === 0 &&
      (await page.evaluate(() => window.__watchers())) === 0,
  );
  check('no page errors', errors.length === 0, errors.join('; '));
  await page.context().close();
}

// ------------------------------------------- Flag a stop on Lakad, and the card folded away
{
  const { page, errors } = await phone();
  await page.getByRole('button', { name: 'Start Tracking' }).click();
  await page.getByRole('group', { name: 'Recording so far' }).waitFor();
  await ride(page, 0, 60);
  await flagButton(page).click();
  check(
    'on Lakad, Flag a stop is enabled and flags the place',
    (await toastSaying(page, 'Stop flagged')
      .waitFor({ timeout: 5000 })
      .then(
        () => true,
        () => false,
      )) &&
      (await mapSource(page))?.features.filter((f) => f.properties.kind === 'mark').length === 1,
  );
  // The column's tooltips run past the screen's edge: the page must not slide to them, even from
  // code, as focus and scrollIntoView do (once seen on CI: every control 72 in and 16 up).
  check(
    '  the page cannot be scrolled, even from code: nothing slides',
    await page.evaluate(() => {
      const main = document.querySelector('main');
      main.scrollLeft = 1000;
      main.scrollTop = 1000;
      document.querySelector('[aria-label="Flag a stop"]').scrollIntoView({ inline: 'end' });
      return main.scrollLeft === 0 && main.scrollTop === 0;
    }),
  );

  const discard = await page.getByRole('button', { name: 'Discard recording' }).boundingBox();
  check(
    "✕ stands 20 in and 17 under the safe area's top, as the recording frames have it",
    Math.abs(discard.x - 20) < 0.5 && Math.abs(discard.y - 17) < 0.5,
    JSON.stringify(discard),
  );

  const card = page.getByRole('group', { name: 'Recording so far' });
  const open = {
    fold: await foldButton(page).boundingBox(),
    locator: await locate(page).boundingBox(),
    card: await card.boundingBox(),
  };
  check(
    'open, the chevron is at the left, 20 in, level with the column, both 16 over the card',
    (await foldButton(page).getAttribute('aria-label')) === 'Hide the recording card' &&
      (await foldButton(page).getAttribute('aria-expanded')) === 'true' &&
      Math.abs(open.fold.x - 20) < 0.5 &&
      Math.abs(open.fold.y + open.fold.height - (open.locator.y + open.locator.height)) < 0.5,
    JSON.stringify(open),
  );
  // The ⓘ under the card opens the credits, and has the focus back once they close.
  const sheet = page.getByRole('dialog', { name: 'Map Data Source' });
  await creditsButton(page).click();
  await sheet.waitFor();
  check(
    'while recording, the ⓘ under the card opens Map Data Source, the screen inert under it',
    await page.evaluate(
      () => !!document.querySelector('[aria-label="Discard recording"]')?.closest('[inert]'),
    ),
  );
  await page.keyboard.press('Escape');
  await sheet.waitFor({ state: 'detached' });
  check(
    '  Escape closes it, focus back on the ⓘ',
    await page.evaluate(
      () => document.activeElement?.getAttribute('aria-label') === 'Map data sources',
    ),
  );
  await foldButton(page).click();
  await card.waitFor({ state: 'hidden' });
  // The column and the chevron slide down together (duration/sheet).
  await page.waitForTimeout(800);
  const folded = {
    fold: await foldButton(page).boundingBox(),
    locator: await locate(page).boundingBox(),
    stack: await page.locator('section[aria-labelledby="recording-heading"]').boundingBox(),
  };
  // Folded, the stack is Figma's 40 under the column, less the column's 16 over it. That the
  // screen may sleep is a toast at the top, not in the stack.
  const foldedFoot = 852 - (folded.locator.y + folded.locator.height);
  check(
    '  folded: the card hides, and the column and the chevron, turned up, slide down to 16 over what is left of the stack',
    (await foldButton(page).getAttribute('aria-label')) === 'Show the recording card' &&
      (await foldButton(page).getAttribute('aria-expanded')) === 'false' &&
      folded.locator.y + folded.locator.height > open.locator.y + open.locator.height + 100 &&
      Math.abs(folded.stack.y - (folded.locator.y + folded.locator.height) - 16) < 0.5 &&
      Math.abs(foldedFoot - 40) < 0.5 &&
      Math.abs(folded.fold.y + folded.fold.height - (folded.locator.y + folded.locator.height)) <
        0.5 &&
      (await page.evaluate(() => document.activeElement?.getAttribute('aria-expanded'))) ===
        'false',
    JSON.stringify(folded),
  );
  await creditsButton(page).click();
  await sheet.waitFor();
  await sheet.getByRole('button', { name: 'Close' }).click();
  await sheet.waitFor({ state: 'detached' });
  check('  folded, the ⓘ opens it too', true);
  const fixesBefore = (await mapSource(page))?.features.find(
    (f) => f.geometry.type === 'LineString',
  )?.geometry.coordinates.length;
  await ride(page, 61, 90);
  // The trail is redrawn after React has the fixes, not as each one is emitted: wait for it.
  const fixesAfter = await page
    .waitForFunction(
      (before) => {
        const length = window.__map
          .getSource('recording-trail')
          ?.serialize()
          .data?.features.find((f) => f.geometry.type === 'LineString')?.geometry
          .coordinates.length;
        return length > before ? length : false;
      },
      fixesBefore,
      { timeout: 5000 },
    )
    .then((handle) => handle.jsonValue())
    .catch(() => fixesBefore);
  check(
    '  the recording goes on while folded: the trail grows, and the flag still works',
    fixesAfter > fixesBefore && (await flagButton(page).isEnabled()),
    `${fixesBefore} → ${fixesAfter}`,
  );
  await foldButton(page).click();
  await card.waitFor();
  check(
    '  Show brings the card back, with the time and the distance gone on',
    /Time\s+\d+ (sec|min)/.test(await card.innerText()) &&
      (await foldButton(page).getAttribute('aria-expanded')) === 'true',
  );
  await page.getByRole('button', { name: 'Switch to Sakay' }).click();
  await page.getByRole('button', { name: 'Switch to Lakad' }).waitFor();
  await foldButton(page).click();
  await card.waitFor({ state: 'hidden' });
  await ride(page, 91, 100);
  check(
    '  folded on Sakay, it stays folded as the fixes come',
    (await card.isHidden()) &&
      (await foldButton(page).getAttribute('aria-label')) === 'Show the recording card',
  );
  // ✕ is still there with the card folded: discard, and the next recording opens with its card.
  await page.getByRole('button', { name: 'Discard recording' }).click();
  await page.getByRole('button', { name: 'Stop without saving' }).click();
  await page.getByRole('button', { name: 'Start Tracking' }).click();
  await card.waitFor();
  check(
    'the next recording starts with its card out',
    (await foldButton(page).getAttribute('aria-expanded')) === 'true',
  );
  check('no page errors', errors.length === 0, errors.join('; '));
  await page.context().close();
}

// ------------------------- Flag a stop not fetched (offline before the worker kept it): the ride goes on
{
  const { page, errors } = await phone();
  // Its code fails to arrive, before Ready fetches it ahead and again when the ride asks for it.
  await page.route(/flag-stop-button/, (route) => route.abort('internetdisconnected'));
  await page.reload({ waitUntil: 'load' });
  await page.getByRole('button', { name: 'Start Tracking' }).click();
  await page.getByRole('group', { name: 'Recording so far' }).waitFor();
  await ride(page, 0, 60);
  await page.waitForTimeout(300);
  check(
    'Flag a stop not fetched: the recording screen still shows, and records, with no Flag a stop',
    (await page.getByRole('button', { name: 'Pause', exact: true }).count()) === 1 &&
      (await page.getByRole('button', { name: 'Discard recording' }).count()) === 1 &&
      (await flagButton(page).count()) === 0 &&
      /Distance\s+\d+ m/.test(
        await page.getByRole('group', { name: 'Recording so far' }).innerText(),
      ),
    (await page.getByRole('group', { name: 'Recording so far' }).innerText()).replace(/\n/g, ' '),
  );
  check('  and no page error', errors.length === 0, errors.join('; '));
  await page.context().close();
}

// ------------- a screen that fails: the page says recording is paused, and Try again brings the ride back
{
  const { page, errors } = await phone();
  await page.getByRole('button', { name: 'Start Tracking' }).click();
  await page.getByRole('group', { name: 'Recording so far' }).waitFor();
  await ride(page, 0, 300);
  const distanceOf = async () =>
    (await page.getByRole('group', { name: 'Recording so far' }).innerText())
      .match(/Distance\s+(\S+\s*\S*)/)?.[1]
      .trim();
  const distanceBefore = await distanceOf();
  // Fixes are written as they arrive: the page goes once the phone holds all 31 ridden, not after
  // a guess at how long the last writes take (the page may be busy, its map settling).
  await until(
    () => storedCount(page, 'fixes'),
    (count) => count >= 31,
    10000,
  );
  // The recording screen's code no longer arrives, as with no signal before the worker kept it.
  await page.route(/\/screens\/recording-screen\.tsx/, (route) =>
    route.abort('internetdisconnected'),
  );
  await page.reload({ waitUntil: 'load' });
  await page.getByRole('heading', { name: 'A recording was left open' }).waitFor();
  await page.getByRole('button', { name: 'Resume' }).click();
  const failed = page.getByRole('heading', { name: 'Para couldn’t open this screen' });
  await failed.waitFor();
  check(
    'a screen that fails shows what happened, focus on it, that recording is paused and what was recorded is safe, with Try again',
    (await page.evaluate(() => document.activeElement?.tagName === 'H1')) &&
      (await page
        .getByText(/^Recording is paused\. What you’ve recorded so far is safe/)
        .count()) === 1 &&
      (await page.getByRole('button', { name: 'Try again' }).count()) === 1,
  );
  // The ride goes on while the error shows: the words must not promise these are kept.
  await ride(page, 310, 600);
  await page.unroute(/\/screens\/recording-screen\.tsx/);
  await page.getByRole('button', { name: 'Try again' }).click();
  await page.getByRole('heading', { name: 'A recording was left open' }).waitFor();
  check(
    '  Try again reloads, and the ride comes back left open at the distance it had before the error: nothing recorded while it showed',
    Boolean(distanceBefore) && (await distanceOf()) === distanceBefore,
    `${distanceBefore} / ${await distanceOf()}`,
  );
  await page.getByRole('button', { name: 'Resume' }).click();
  await page.getByRole('button', { name: 'Pause', exact: true }).waitFor();
  // On from where the kept ride stopped, the page's clock (started afresh by the reload) moved
  // past the fixes it kept.
  await page.evaluate(() => window.__advance(10 * 60 * 1000));
  await ride(page, 300, 600);
  await page.waitForTimeout(500);
  const distanceAfter = await distanceOf();
  check(
    '  and Resume carries on recording it',
    distanceAfter !== undefined && distanceAfter !== distanceBefore,
    `${distanceBefore} / ${distanceAfter}`,
  );
  check('  with no page error', errors.length === 0, errors.join('; '));
  await page.context().close();
}

// -------- the save screens not fetched ahead (offline on Ready), then the signal back: the ride saves
{
  const { page, errors } = await phone();
  // Chromium keeps a failed dynamic import failed for the page's life: Ready's fetch ahead must
  // not leave the form unreachable once the signal is back.
  const warnings = [];
  page.on('console', (message) => {
    if (message.type() === 'warning') warnings.push(message.text());
  });
  const SAVE_SCREENS = /screens\/save-form/;
  await page.route(SAVE_SCREENS, (route) => route.abort('internetdisconnected'));
  await page.reload({ waitUntil: 'load' });
  await page.getByRole('button', { name: 'Start Tracking' }).waitFor();
  for (let i = 0; i < 50 && !warnings.some((w) => w.includes('fetched ahead')); i += 1) {
    await page.waitForTimeout(100);
  }
  const isFetchAheadFailed = warnings.some((w) => w.includes('fetched ahead'));
  await page.unroute(SAVE_SCREENS);
  await page.getByRole('button', { name: 'Start Tracking' }).click();
  await page.getByRole('group', { name: 'Recording so far' }).waitFor();
  await ride(page, 0, 100);
  await finishRecording(page);
  const description = page.getByLabel('Description');
  const isFormShown = await description
    .waitFor({ timeout: 10000 })
    .then(() => true)
    .catch(() => false);
  check(
    'the save screens not fetched ahead on Ready: with the signal back, Finish still opens the form',
    isFetchAheadFailed && isFormShown,
    JSON.stringify({ isFetchAheadFailed, isFormShown }),
  );
  if (isFormShown) {
    await description.fill('Fetched again');
    await page.getByRole('button', { name: 'Save recording' }).click();
  }
  check(
    '  and Save recording saves it: Route recorded, back on Record',
    await toastSaying(page, 'Route recorded')
      .waitFor({ timeout: 10000 })
      .then(() => true)
      .catch(() => false),
  );
  check('  and no page error', errors.length === 0, errors.join('; '));
  await page.context().close();
}

// ------------------- History's picture: the whole trail, taken as the form opens, kept and deleted with it
{
  const { page, errors } = await phone();
  // A picture given up says each step of the capture and when it came (capture-trail-picture.ts).
  const givenUp = [];
  page.on('console', (message) => {
    if (message.text().includes('picture was given up')) givenUp.push(message.text());
  });
  const thumbnails = () =>
    page.evaluate(
      () =>
        new Promise((resolve) => {
          const open = indexedDB.open('para-contribute');
          open.onsuccess = () => {
            const get = open.result.transaction('thumbnails').objectStore('thumbnails').getAll();
            get.onsuccess = () =>
              resolve(get.result.map((row) => ({ id: row.recordingId, url: row.dataUrl })));
          };
        }),
    );
  await page.getByRole('button', { name: 'Start Tracking' }).click();
  await page.getByRole('group', { name: 'Recording so far' }).waitFor();
  await ride(page, 0, 600);
  await finishRecording(page);
  await page.getByLabel('Description').waitFor();
  await until(
    () => storedCount(page, 'thumbnails'),
    (count) => count > 0,
    15000,
  );
  const [picture] = await thumbnails();
  const size = picture ? Buffer.from(picture.url.split(',')[1], 'base64').length : 0;
  // The capture gives up quietly (no idle map within 8 s, a tile failed, the frame moved): what
  // the map was doing says which, if the picture is missing.
  const mapWhenAsked = await page.evaluate(() => ({
    isLoaded: window.__map.loaded(),
    areTilesLoaded: window.__map.areTilesLoaded(),
    isMoving: window.__map.isMoving(),
    zoom: window.__map.getZoom(),
  }));
  check(
    'as the form opens, a picture of the trail is kept for History: small, a WebP or JPEG',
    !!picture && /^data:image\/(webp|jpeg);base64,/.test(picture.url) && size > 0 && size < 40_000,
    `${picture?.url.slice(0, 22)} ${size} bytes ${picture ? '' : JSON.stringify(mapWhenAsked)} ${givenUp.join(' | ')}`,
  );
  // The locator keeps the map on the rider under the form; the picture's framing is put back.
  const centre = await page.evaluate(() => window.__map.getCenter().toArray());
  check(
    '  the map under the form is back on the rider, not on the picture’s frame',
    Math.abs(centre[0] - eastOf(600)[0]) < 1e-5 && Math.abs(centre[1] - START[1]) < 0.01,
    JSON.stringify(centre),
  );
  await page.getByRole('button', { name: 'Save recording' }).click();
  await page.getByTestId('toast').filter({ hasText: 'Route recorded' }).waitFor();
  await openHistory(page);
  const card = page.getByRole('listitem').first();
  await card.locator('img').waitFor({ timeout: 10000 });
  // The card is content-visibility:auto: until the browser's next rendering pass finds it on
  // screen its contents are skipped, and innerText reads ''. Its picture can arrive before that.
  await page.waitForFunction(
    (element) => element.innerText.trim() !== '',
    await card.elementHandle(),
    {
      timeout: 5000,
    },
  );
  const shown = {
    src: await card.locator('img').getAttribute('src'),
    text: (await card.innerText()).replace(/\n/g, ' '),
  };
  check(
    "  History's card shows that picture, and its day, time and distance in Figma's order",
    shown.src === picture?.url &&
      /\w{3} \d{1,2}, \d{4} 0h \dm \d{3} m/.test(shown.text) &&
      shown.text.includes('Only on this phone'),
    shown.text,
  );
  // With no picture kept (no tiles when the form opened), the card draws the trail itself.
  await page.evaluate(
    () =>
      new Promise((resolve) => {
        const open = indexedDB.open('para-contribute');
        open.onsuccess = () => {
          const tx = open.result.transaction('thumbnails', 'readwrite');
          tx.objectStore('thumbnails').clear();
          tx.oncomplete = resolve;
        };
      }),
  );
  await page.reload({ waitUntil: 'load' });
  await openHistory(page);
  // Attached, not visible: this trail runs due east, a line with no height.
  await card.locator('path[stroke]').first().waitFor({ state: 'attached', timeout: 10000 });
  check(
    '  with no picture, the card draws the trail from its fixes instead',
    (await card.locator('img').count()) === 0 && (await card.locator('path[stroke]').count()) > 0,
  );
  // Kept again, so removing the recording below has a picture to take with it. With none taken
  // above (already a FAIL), there is none to keep: a row with no key would never be written, and
  // the wait for it would hang the suite until the job's own time ran out.
  if (picture) {
    await page.evaluate(
      (row) =>
        new Promise((resolve, reject) => {
          const open = indexedDB.open('para-contribute');
          open.onsuccess = () => {
            const tx = open.result.transaction('thumbnails', 'readwrite');
            tx.objectStore('thumbnails').put(row);
            tx.oncomplete = resolve;
            tx.onerror = () => reject(tx.error);
          };
        }),
      { recordingId: picture.id, dataUrl: picture.url },
    );
  }
  check('  (its picture kept again)', (await thumbnails()).length === 1);
  await openFirstRide(page);
  await deleteRecord(page);
  await page.getByText('No recordings yet.').waitFor();
  check('  deleting the recording deletes its picture', (await thumbnails()).length === 0);
  check('  no page error', errors.length === 0, errors.join('; '));
  await page.context().close();
}

// --------- the form closed while its picture is on its way: no picture, and the camera stays on the rider
{
  const { page, errors } = await phone();
  const thumbnailCount = () =>
    page.evaluate(
      () =>
        new Promise((resolve) => {
          const open = indexedDB.open('para-contribute');
          open.onsuccess = () => {
            const count = open.result.transaction('thumbnails').objectStore('thumbnails').count();
            count.onsuccess = () => resolve(count.result);
          };
        }),
    );
  // The capture's code held back 3 s: the form closes before it can start.
  let releaseCapture = () => {};
  const isCaptureHeld = new Promise((resolve) => {
    page.route('**/capture-trail-picture*', async (route) => {
      resolve(true);
      await new Promise((release) => (releaseCapture = release));
      await route.continue();
    });
  });
  await page.getByRole('button', { name: 'Start Tracking' }).click();
  await page.getByRole('group', { name: 'Recording so far' }).waitFor();
  await ride(page, 0, 300);
  await finishRecording(page);
  await page.getByRole('heading', { name: 'Save Recording' }).waitFor();
  await isCaptureHeld;
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await page.getByRole('button', { name: 'Pause', exact: true }).waitFor();
  releaseCapture();
  // The rider rides on; the locator follows. A capture that ran now would frame the whole trail,
  // then put the camera back where the rider was when the form opened.
  await ride(page, 310, 600);
  await page.waitForTimeout(3000);
  const off = await centreOff(page, 600);
  check(
    'Keep recording while the picture is on its way: none is taken, and the camera stays on the moving rider',
    off < 30 && (await thumbnailCount()) === 0,
    `${Math.round(off)} m off`,
  );
  check('  no page error', errors.length === 0, errors.join('; '));
  await page.context().close();
}
{
  // The same, but the recording thrown away before the held capture's code arrives.
  const { page, errors } = await phone();
  let releaseCapture = () => {};
  const isCaptureHeld = new Promise((resolve) => {
    page.route('**/capture-trail-picture*', async (route) => {
      resolve(true);
      await new Promise((release) => (releaseCapture = release));
      await route.continue();
    });
  });
  await page.getByRole('button', { name: 'Start Tracking' }).click();
  await page.getByRole('group', { name: 'Recording so far' }).waitFor();
  await ride(page, 0, 300);
  await finishRecording(page);
  await page.getByRole('heading', { name: 'Save Recording' }).waitFor();
  await isCaptureHeld;
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await page.getByRole('button', { name: 'Discard recording' }).click();
  await page.getByRole('button', { name: 'Stop without saving' }).click();
  await page.getByRole('button', { name: 'Start Tracking' }).waitFor();
  releaseCapture();
  await page.waitForTimeout(3000);
  const left = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const open = indexedDB.open('para-contribute');
        open.onsuccess = () => {
          const count = open.result.transaction('thumbnails').objectStore('thumbnails').count();
          count.onsuccess = () => resolve(count.result);
        };
      }),
  );
  check(
    '  Stop without saving before it arrives leaves no picture behind',
    left === 0,
    String(left),
  );
  check('  no page error', errors.length === 0, errors.join('; '));
  await page.context().close();
}

// ------------- a page older than the phone's database (an update rolled back) still records and saves
{
  const { page, errors } = await phone();
  await page.getByRole('button', { name: 'Start Tracking' }).waitFor();
  // A newer page took the database to 3; this page's code asks for 2.
  const version = await page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const open = indexedDB.open('para-contribute', 3);
        open.onsuccess = () => {
          const { version: opened } = open.result;
          open.result.close();
          resolve(opened);
        };
        open.onerror = () => reject(open.error);
      }),
  );
  await page.reload({ waitUntil: 'load' });
  await page.getByRole('button', { name: 'Start Tracking' }).click();
  await page.getByRole('group', { name: 'Recording so far' }).waitFor();
  await ride(page, 0, 200);
  await finishRecording(page);
  await page.getByRole('button', { name: 'Save recording' }).click();
  const isSaved = await toastSaying(page, 'Route recorded')
    .waitFor({ timeout: 10000 })
    .then(() => true)
    .catch(() => false);
  const kept = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const open = indexedDB.open('para-contribute');
        open.onsuccess = () => {
          const count = open.result.transaction('recordings').objectStore('recordings').count();
          count.onsuccess = () => resolve([open.result.version, count.result]);
        };
      }),
  );
  check(
    "a page whose code is older than the phone's database opens it at the phone's version, and records and saves",
    version === 3 && isSaved && kept[0] === 3 && kept[1] === 1,
    JSON.stringify({ version, isSaved, kept }),
  );
  check('  no page error', errors.length === 0, errors.join('; '));
  await page.context().close();
}

// ------------------------------------------------------- Keep recording on the form
{
  const { page, errors } = await phone();
  const stats = async () =>
    (await page.getByRole('group', { name: 'Recording so far' }).innerText()).replace(/\n/g, ' ');
  const activeName = () => page.evaluate(() => document.activeElement?.getAttribute('aria-label'));

  // (a) a Save after a switch, ten minutes on the form, and back.
  await page.getByRole('button', { name: 'Start Tracking' }).click();
  await page.getByRole('group', { name: 'Recording so far' }).waitFor();
  await ride(page, 0, 1200);
  await page.getByRole('button', { name: 'Switch to Sakay' }).click();
  await ride(page, 1190, 200);
  await finishRecording(page);
  await page.getByRole('heading', { name: 'Save Recording' }).waitFor({ timeout: 30000 });
  await page.evaluate(() => window.__advance(600_000));
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await page.getByRole('button', { name: 'Pause', exact: true }).waitFor();
  check(
    'Resume on the form: back on the recording screen, Pause focused, "Recording again" said',
    (await activeName()) === 'Pause' && (await statusText(page)) === 'Recording again',
    `${await activeName()} / ${await statusText(page)}`,
  );
  const seconds = recordedSeconds(await stats());
  check(
    '  Time does not count the ten minutes on the form',
    seconds < 8 * 60,
    `${seconds} s; ${await stats()}`,
  );
  await ride(page, 190, 50);
  await page.waitForTimeout(500);
  check(
    '  a fix near the start does not stop it, and the modes are kept',
    (await page.getByRole('heading', { name: 'Save Recording' }).count()) === 0 &&
      (await stats()).includes('Sakay') &&
      (await mapSource(page)).features.filter((f) => f.properties.kind === 'switch').length === 1,
    await stats(),
  );

  // (c) then Pause, Finish and Save recording save it once, as one contribution.
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await finishRecording(page);
  await page.getByRole('button', { name: 'Save recording' }).click();
  await page.getByTestId('toast').filter({ hasText: 'Route recorded' }).waitFor();
  const counts = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const open = indexedDB.open('para-contribute');
        open.onsuccess = () => {
          const all = open.result.transaction('recordings').objectStore('recordings').getAll();
          all.onsuccess = () => resolve(all.result.map((r) => r.status));
        };
      }),
  );
  check(
    'after Resume, Pause, Finish and Save recording save it once, as one contribution',
    counts.length === 1 && counts[0] === 'saved',
    JSON.stringify(counts),
  );

  // (b) a Save by hand, then Keep recording.
  await page.getByRole('button', { name: 'Start Tracking' }).click();
  await page.getByRole('group', { name: 'Recording so far' }).waitFor();
  await ride(page, 0, 300);
  await finishRecording(page);
  await page.getByRole('heading', { name: 'Save Recording' }).waitFor();
  await page.evaluate(() => window.__advance(600_000));
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await page.getByRole('button', { name: 'Pause', exact: true }).waitFor();
  check(
    'Resume on the form after a stop by hand: recording again, Pause focused, no time for the form',
    (await activeName()) === 'Pause' &&
      recordedSeconds(await stats()) < 8 * 60 &&
      (await page.evaluate(() => window.__watchers())) === 1,
    await stats(),
  );
  await ride(page, 310, 340);
  check('  and the fixes after it count', /Distance\s+3\d\d m/.test(await stats()), await stats());
  check('no page errors', errors.length === 0, errors.join('; '));
  await page.context().close();
}

// ----------------- the locator before Start: on its own when the browser allows it, else on a tap
{
  const { page, errors } = await phone({ granted: true });
  await page.getByRole('button', { name: 'Start Tracking' }).waitFor();
  await page.waitForFunction(() => !!window.__map?.loaded(), null, { timeout: 30000 });
  await page.waitForFunction(() => window.__locatorWatchers() === 1, null, { timeout: 10000 });
  check(
    'with location already allowed, the locator starts on open, and the recording has not',
    (await page.evaluate(() => window.__watchers())) === 0,
  );
  await emit(page, 0);
  await page.waitForFunction(
    (lng) => Math.abs(window.__map.getCenter().lng - lng) < 1e-4 && !window.__map.isMoving(),
    eastOf(0)[0],
    { timeout: 30000 },
  );
  check(
    '  its dot shows on the first fix, and the camera is on it, before Start',
    (await page.locator('[data-testid="locator-overlay"]').count()) === 1 &&
      (await locatorMode(page)) === 'TrackedLocation' &&
      (await centreOff(page, 0)) < 15,
    `${await locatorMode(page)}, ${(await centreOff(page, 0)).toFixed(1)} m off`,
  );
  await page.getByRole('button', { name: 'Start Tracking' }).click();
  await page.getByRole('group', { name: 'Recording so far' }).waitFor();
  check(
    'Start leaves the locator following, with its own watch beside the recording',
    (await locatorMode(page)) === 'TrackedLocation' &&
      (await page.evaluate(() => [window.__watchers(), window.__locatorWatchers()])).join() ===
        '1,1',
  );
  check('no page errors', errors.length === 0, errors.join('; '));
  await page.context().close();
}
{
  const { page, errors } = await phone();
  await page.getByRole('button', { name: 'Start Tracking' }).waitFor();
  await page.waitForFunction(() => !!window.__map?.loaded(), null, { timeout: 30000 });
  await page.waitForTimeout(500);
  check(
    'without it, nothing asks until a tap: no watch, no dot, the button offers location',
    (await page.evaluate(() => window.__locatorWatchers())) === 0 &&
      (await locatorMode(page)) === 'LocationOff' &&
      (await locate(page).getAttribute('aria-label')) === 'Turn on my location',
  );
  await locate(page).click();
  check(
    '  a tap on the button asks, as on the public map',
    (await page.evaluate(() => window.__locatorWatchers())) === 1,
  );
  await emit(page, 0);
  await page.waitForFunction(
    (lng) => Math.abs(window.__map.getCenter().lng - lng) < 1e-4 && !window.__map.isMoving(),
    eastOf(0)[0],
    { timeout: 30000 },
  );
  await page.mouse.move(200, 300);
  await page.mouse.down();
  await page.mouse.move(120, 360, { steps: 6 });
  await page.mouse.up();
  await page.waitForFunction(() => !window.__map.isMoving(), null, { timeout: 30000 });
  check('  a drag lets the camera go', (await locatorMode(page)) === 'TrackOwnLocation');
  await page.getByRole('button', { name: 'Start Tracking' }).click();
  await page.getByRole('group', { name: 'Recording so far' }).waitFor();
  await page.waitForFunction(() => !window.__map.isMoving(), null, { timeout: 30000 });
  check(
    'Start with the camera let go brings it back to the contributor',
    (await locatorMode(page)) === 'TrackedLocation',
    await locatorMode(page),
  );
  check('no page errors', errors.length === 0, errors.join('; '));
  await page.context().close();
}

// ----------------- where the buttons are, standing still, and Stop on an unfinished one
{
  const { page, errors } = await phone();
  await page.getByRole('button', { name: 'Start Tracking' }).waitFor();
  await page.waitForFunction(() => !!window.__map?.loaded(), null, { timeout: 30000 });
  // The locator's dock slides up as the stack is measured: let it settle.
  await page.waitForTimeout(800);
  const box = await page.getByRole('button', { name: 'Map design' }).boundingBox();
  const locatorBox = await locate(page).boundingBox();
  const bars = await page.locator('section[aria-labelledby="ready-heading"]').boundingBox();
  check(
    "the map-style button sits on the locator button, the public map's 48 px pair, 20 px from the right as Figma has it",
    box &&
      locatorBox &&
      Math.abs(box.width - 48) < 0.5 &&
      Math.abs(393 - (box.x + box.width) - 20) < 0.5 &&
      Math.abs(locatorBox.x - box.x) < 0.5 &&
      box.y + box.height <= locatorBox.y + 0.5,
    JSON.stringify([box, locatorBox]),
  );
  check(
    '  and 24 px over Start tracking as Figma has it',
    bars && locatorBox && Math.abs(bars.y - (locatorBox.y + locatorBox.height) - 24) < 0.5,
    JSON.stringify([locatorBox, bars]),
  );
  {
    const info = await creditsButton(page).boundingBox();
    const bar = await page.getByRole('button', { name: 'Start Tracking' }).boundingBox();
    check(
      "  the map's ⓘ is 32 px, at the bottom left, 12 px in and 12 px over the screen's foot",
      info &&
        bar &&
        Math.abs(info.width - 32) < 0.5 &&
        Math.abs(info.x - 12) < 0.5 &&
        Math.abs(852 - (info.y + info.height) - 12) < 0.5,
      JSON.stringify([info, bar]),
    );
  }

  await page.getByRole('button', { name: 'Start Tracking' }).click();
  await page.getByRole('group', { name: 'Recording so far' }).waitFor();
  await ride(page, 0, 500);
  await page.waitForTimeout(1500);
  // Two minutes standing 500 m out, the phone's position wandering by up to 8 m.
  let seed = 7;
  const wander = () => ((seed = (seed * 16807) % 2147483647) / 2147483647 - 0.5) * 16;
  const headings = [];
  for (let s = 0; s < 120; s++) {
    const [lng, lat] = eastOf(500 + wander());
    await page.evaluate(
      ([a, b]) => window.__fix(a, b, window.__advance(1000)),
      [lng, lat + wander() / 111_000],
    );
    if (s % 4 === 0) headings.push(await bearing(page));
  }
  await page.waitForTimeout(1000);
  headings.push(await bearing(page));
  const turn = Math.max(...headings.map((h) => Math.abs(((h - headings[0] + 540) % 360) - 180)));
  check(
    'standing still two minutes with the phone wandering 8 m, the map keeps its heading',
    turn < 5,
    `heading ${headings[0].toFixed(1)}°, largest turn ${turn.toFixed(1)}°`,
  );
  console.log(`  standing-still max turn: ${turn.toFixed(2)} degrees`);

  await page.reload({ waitUntil: 'load' });
  await page
    .getByRole('heading', { name: 'A recording was left open' })
    .waitFor({ timeout: 30000 });
  await page.getByRole('button', { name: 'Stop', exact: true }).click();
  await page.getByRole('button', { name: 'Resume' }).waitFor();
  check(
    'Stop on a recording left open pauses it too: Resume and Finish, no form',
    (await page.getByRole('heading', { name: 'Save Recording' }).count()) === 0 &&
      (await page.getByRole('button', { name: 'Finish', exact: true }).count()) === 1,
  );
  check('no page errors', errors.length === 0, errors.join('; '));
  await page.context().close();
}

// ------------------------------------------- two minutes alone on the form
{
  const { page, errors } = await phone();
  await page.getByRole('button', { name: 'Start Tracking' }).click();
  await page.getByRole('group', { name: 'Recording so far' }).waitFor();
  await ride(page, 0, 200);
  // Installed before the form opens, so the form's own timer runs on it.
  await page.clock.install();
  await finishRecording(page);
  await page.getByRole('heading', { name: 'Save Recording' }).waitFor();
  // Never under something the contributor is answering: the sheet holds the two minutes.
  await page.getByRole('button', { name: 'What did you ride?' }).click();
  await page.clock.runFor(125_000);
  check(
    'the form does not save itself while the ride sheet is open over it',
    (await page.getByRole('heading', { name: 'Save Recording' }).count()) === 1 &&
      (await page.getByRole('dialog', { name: 'What did you ride?' }).count()) === 1,
  );
  await page.keyboard.press('Escape');
  await page.clock.runFor(61_000);
  const sixty = await page.locator('form').innerText();
  check(
    'the form shows the time left, quietly: Saves by itself in 1:00 after a minute',
    /Saves by itself in (0:59|1:00)/.test(sixty),
  );
  await page.getByLabel('Description').fill('Crowded');
  await page.clock.runFor(2_000);
  check(
    'a hand on the form starts the two minutes again',
    /Saves by itself in (1:5\d|2:00)/.test(await page.locator('form').innerText()),
    (await page.locator('form').innerText()).match(/Saves by itself in \d:\d\d/)?.[0],
  );
  await page.clock.runFor(116_000);
  check(
    'still on the form a couple of seconds before the time is up',
    (await page.getByRole('heading', { name: 'Save Recording' }).count()) === 1,
  );
  await page.clock.runFor(3_000);
  await page.getByTestId('toast').filter({ hasText: 'Route recorded' }).waitFor({ timeout: 5000 });
  check('left alone for two minutes, the form closes and saves', true);
  await page.clock.resume();
  const file = await lastSavedRide(page);
  check(
    '  and it saved what was typed',
    file.description === 'Crowded' && file.savedAt !== null,
    file.description,
  );
  check('no page errors', errors.length === 0, errors.join('; '));
  await page.context().close();
}

// ------------------------------------------- saved recordings, still there after a reload
{
  const { page, errors } = await phone();
  check(
    'with nothing saved, Ready shows no History',
    (await page.getByRole('heading', { name: 'History' }).count()) === 0,
  );
  await page.getByRole('button', { name: 'Start Tracking' }).click();
  await page.getByRole('group', { name: 'Recording so far' }).waitFor();
  await ride(page, 0, 100);
  await finishRecording(page);
  await page.getByLabel('Description').fill('Reload me');
  await page.getByRole('button', { name: 'Save recording' }).click();
  await page.getByTestId('toast').filter({ hasText: 'Route recorded' }).waitFor();
  await openHistory(page);
  const rowTitles = page.locator('[data-ride-card]').filter({ hasText: 'Reload me' });
  await rowTitles.first().waitFor();
  check('the recording just saved is listed in History', (await rowTitles.count()) === 1);
  await page.reload({ waitUntil: 'load' });
  await openHistory(page);
  await rowTitles.first().waitFor();
  check('after a reload it is still listed', (await rowTitles.count()) === 1);
  const file = await lastSavedRide(page);
  check(
    '  and the phone still holds that recording',
    file?.description === 'Reload me' && file.savedAt !== null,
    file?.description,
  );
  check(
    '  History has no Start tracking',
    (await page.getByRole('button', { name: 'Start Tracking' }).count()) === 0,
  );
  await recordTab(page).click();
  await page.getByRole('button', { name: 'Start Tracking' }).waitFor();
  check('no page errors', errors.length === 0, errors.join('; '));
  await page.context().close();
}

// --------------------------------------- the phone refusing writes, and saving anyway
/** Makes IndexedDB refuse puts into a store while `window.__fail[store]` is set. */
const FAIL_WRITES = () => {
  const put = IDBObjectStore.prototype.put;
  window.__fail = {};
  IDBObjectStore.prototype.put = function (...args) {
    if (window.__fail[this.name]) throw new DOMException('Full', 'QuotaExceededError');
    return put.apply(this, args);
  };
};
const setFail = (page, store, on) => page.evaluate(([s, v]) => (window.__fail[s] = v), [store, on]);
const STORE_PROBLEM = 'Recording not kept';
{
  const { page, errors } = await phone();
  await page.addInitScript(FAIL_WRITES);
  await page.reload({ waitUntil: 'load' });
  await page.getByRole('button', { name: 'Start Tracking' }).click();
  await page.getByRole('group', { name: 'Recording so far' }).waitFor();
  await ride(page, 0, 100);
  await setFail(page, 'fixes', true);
  await ride(page, 110, 150);
  await setFail(page, 'fixes', false);
  await page.waitForTimeout(300);
  await finishRecording(page);
  await page.getByRole('heading', { name: 'Save Recording' }).waitFor();
  const ROOM_WARNING = 'Your phone ran out of room for part of this recording.';
  check(
    'fix writes that failed are noted on the form in one line, with no Download',
    (await page.getByRole('alert').filter({ hasText: ROOM_WARNING }).count()) === 1 &&
      (await page.getByRole('button', { name: /download/i }).count()) === 0,
  );
  for (
    let tries = 0;
    tries < 50 && (await stored(page)).recordings[0]?.status !== 'stopped';
    tries++
  ) {
    await page.waitForTimeout(100);
  }
  await setFail(page, 'recordings', true);
  await page.getByRole('button', { name: 'Save recording' }).click();
  await page.waitForTimeout(800);
  const refused = await stored(page);
  check(
    'a save the phone refuses stays on the form, says so, and is not marked saved',
    (await page.getByRole('heading', { name: 'Save Recording' }).count()) === 1 &&
      (await toastSaying(page, STORE_PROBLEM).count()) > 0 &&
      refused.recordings[0]?.status === 'stopped',
    JSON.stringify(refused),
  );
  check(
    '  the failed fixes were written again on the way, all 16 now stored',
    refused.fixes === 16,
    refused.fixes,
  );
  check(
    '  so the form no longer warns of fixes it could not keep',
    (await page.getByText(ROOM_WARNING).count()) === 0,
  );
  await setFail(page, 'recordings', false);
  await page.getByLabel('Description').fill('Crowded');
  // A tap and the form's own timeout landing together: one save, the first.
  await page.evaluate(() => {
    const byText = (t) =>
      [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === t);
    byText('Save recording').click();
    byText('Save recording').click();
  });
  await page.getByTestId('toast').filter({ hasText: 'Route recorded' }).waitFor({ timeout: 5000 });
  await page.waitForTimeout(300);
  const saved = await stored(page);
  check(
    'tried again, it saves once, with what was typed, every fix and no failures left',
    saved.recordings.length === 1 &&
      saved.recordings[0].status === 'saved' &&
      saved.recordings[0].description === 'Crowded' &&
      saved.recordings[0].failedFixWrites === 0 &&
      saved.fixes === 16,
    JSON.stringify(saved),
  );
  check('no page errors', errors.length === 0, errors.join('; '));
  await page.context().close();
}

// ------------------------------------- Start tracking becomes the recording card, never holding it up
/** Every animate() the page starts, with its timing and whether it is the morph's ghost's. */
const ANIMATIONS = () => {
  window.__animations = [];
  const animate = Element.prototype.animate;
  Element.prototype.animate = function (keyframes, options) {
    window.__animations.push({
      isGhost: this.hasAttribute('data-start-morph'),
      isCard: this.hasAttribute('data-recording-card'),
      duration: typeof options === 'object' ? options.duration : options,
      easing: typeof options === 'object' ? (options.easing ?? 'linear') : 'linear',
      props: Object.keys(Array.isArray(keyframes) ? (keyframes[0] ?? {}) : keyframes),
      at: performance.now(),
    });
    return animate.call(this, keyframes, options);
  };
  window.__ghostSeen = false;
  new MutationObserver(() => {
    if (document.querySelector('[data-start-morph]')) window.__ghostSeen = true;
  }).observe(document, { childList: true, subtree: true });
};
{
  const { page, context, errors } = await phone();
  await page.addInitScript(ANIMATIONS);
  await page.reload({ waitUntil: 'load' });
  await page.getByRole('button', { name: 'Start Tracking' }).waitFor({ timeout: 20000 });
  await page.waitForFunction(() => !!window.__map?.loaded(), null, { timeout: 30000 });
  const tokens = await page.evaluate(() => {
    const style = getComputedStyle(document.documentElement);
    const read = (name) => style.getPropertyValue(name).trim();
    return {
      quick: parseFloat(read('--transition-duration-quick')),
      gentle: parseFloat(read('--transition-duration-gentle')),
      exit: read('--ease-exit'),
      move: read('--ease-move'),
    };
  });
  await page.getByRole('button', { name: 'Start Tracking' }).click();
  const atTap = await page.evaluate(() => ({
    watchers: window.__watchers(),
    ghost: !!document.querySelector('[data-start-morph]'),
  }));
  check(
    'Start tracking starts the recording on the tap: the watch is on while the morph has only begun',
    atTap.watchers === 1 && atTap.ghost,
    JSON.stringify(atTap),
  );
  await page.waitForFunction(() => !document.querySelector('[data-start-morph]'), null, {
    timeout: 5000,
  });
  const ghostAnimations = await page.evaluate(() => window.__animations.filter((a) => a.isGhost));
  const fold = ghostAnimations[0];
  const open = ghostAnimations[1];
  check(
    '  it folds into a pill on duration-quick and ease-exit, then opens into the card on duration-gentle and ease-move',
    !!fold &&
      !!open &&
      fold.duration === tokens.quick &&
      fold.easing === tokens.exit &&
      open.duration === tokens.gentle &&
      open.easing === tokens.move &&
      fold.props.join() === 'clipPath' &&
      open.props.join() === 'clipPath',
    JSON.stringify({ tokens, ghostAnimations }),
  );
  check(
    '  about 450 ms in all, and only clip-path and opacity move',
    tokens.quick + tokens.gentle >= 400 &&
      tokens.quick + tokens.gentle <= 450 &&
      (await page.evaluate(() =>
        window.__animations.every((a) => a.props.every((p) => ['clipPath', 'opacity'].includes(p))),
      )),
  );
  check(
    '  then the card stands in its own place, the ghost gone',
    (await page.getByRole('group', { name: 'Recording so far' }).isVisible()) &&
      (await page.locator('[data-start-morph]').count()) === 0 &&
      (await page.evaluate(
        () => getComputedStyle(document.querySelector('[data-recording-card]')).opacity,
      )) === '1',
  );

  // Pause mid-morph: what the ghost covers takes the tap.
  await page.getByRole('button', { name: 'Discard recording' }).click();
  await page.getByRole('button', { name: 'Stop without saving' }).click();
  await page.getByRole('button', { name: 'Start Tracking' }).click();
  const isMorphing = await page.evaluate(() => !!document.querySelector('[data-start-morph]'));
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await page.getByRole('button', { name: 'Resume' }).waitFor({ timeout: 5000 });
  // Two frames on: the ghost never shows the card as it was before the pause.
  const ghostAfterPause = await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() =>
          requestAnimationFrame(() =>
            // The copy's buttons, by their words: its status line may say "Paused", rightly.
            resolve(
              [...document.querySelectorAll('[data-start-morph] button')].map(
                (button) => button.textContent?.trim() ?? '',
              ),
            ),
          ),
        ),
      ),
  );
  check(
    '  a tap on Pause mid-morph pauses the recording, and the morph shows no Pause over Resume',
    isMorphing &&
      (await page.getByRole('button', { name: 'Finish', exact: true }).count()) === 1 &&
      !ghostAfterPause.includes('Pause'),
    ghostAfterPause.join(' | '),
  );
  await page.waitForFunction(() => !document.querySelector('[data-start-morph]'), null, {
    timeout: 5000,
  });
  await page.getByRole('button', { name: 'Discard recording' }).click();
  await page.getByRole('button', { name: 'Stop without saving' }).click();

  // Pause while the pill opens into the card: the copy of the card it shows is out of date, so
  // the morph ends there and then.
  await page.getByRole('button', { name: 'Start Tracking' }).click();
  const pausedWhileOpening = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const look = () => {
          const ghost = document.querySelector('[data-start-morph]');
          if (!ghost) return resolve(null);
          if (!ghost.textContent?.includes('Pause')) return requestAnimationFrame(look);
          const pause = [...document.querySelectorAll('[data-recording-card] button')].find(
            (button) => button.textContent?.trim() === 'Pause',
          );
          pause?.click();
          requestAnimationFrame(() =>
            requestAnimationFrame(() =>
              resolve({
                isGhostGone: !document.querySelector('[data-start-morph]'),
                isCardShown: getComputedStyle(
                  document.querySelector('[data-recording-card]') ?? document.body,
                ).opacity,
              }),
            ),
          );
        };
        look();
      }),
  );
  check(
    '  a Pause while the pill opens into the card ends the morph at once, the real card shown',
    pausedWhileOpening?.isGhostGone === true &&
      pausedWhileOpening.isCardShown === '1' &&
      (await page.getByRole('button', { name: 'Resume' }).count()) === 1,
    JSON.stringify(pausedWhileOpening),
  );
  await page.getByRole('button', { name: 'Discard recording' }).click();
  await page.getByRole('button', { name: 'Stop without saving' }).click();
  await page.getByRole('button', { name: 'Start Tracking' }).waitFor();

  // A start that fails (a second tab, which records nothing): the card never comes, the button does.
  const second = await context.newPage();
  await nodeFetch(second);
  await bareStyle(second);
  await second.addInitScript(GPS);
  await second.addInitScript(ANIMATIONS);
  await page.getByRole('button', { name: 'Start Tracking' }).click();
  await page.getByRole('group', { name: 'Recording so far' }).waitFor();
  await second.goto(`${BASE}/contribute/`, { waitUntil: 'load' });
  await toastSaying(second, 'Para is open in another tab').waitFor({ timeout: 10000 });
  await second.getByRole('button', { name: 'Start Tracking' }).click();
  const secondMorphed = await second.evaluate(() => !!document.querySelector('[data-start-morph]'));
  await second.waitForFunction(() => !document.querySelector('[data-start-morph]'), null, {
    timeout: 5000,
  });
  await second.waitForTimeout(100);
  check(
    '  a start that fails: the pill opens back into Start tracking, shown again, and no card comes',
    secondMorphed &&
      (await second.getByRole('group', { name: 'Recording so far' }).count()) === 0 &&
      (await second.getByRole('button', { name: 'Start Tracking' }).isVisible()) &&
      (await second.evaluate(
        () => getComputedStyle(document.querySelector('[data-start-tracking]')).opacity,
      )) === '1',
  );
  await second.close();
  await page.getByRole('button', { name: 'Discard recording' }).click();
  await page.getByRole('button', { name: 'Stop without saving' }).click();

  // Reduced motion: no ghost, the card only fades in, quickly.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.evaluate(() => {
    window.__animations = [];
    window.__ghostSeen = false;
  });
  await page.getByRole('button', { name: 'Start Tracking' }).click();
  await page.getByRole('group', { name: 'Recording so far' }).waitFor();
  await page.waitForTimeout(400);
  const reduced = await page.evaluate(() => ({
    ghostSeen: window.__ghostSeen,
    card: window.__animations.filter((a) => a.isCard),
  }));
  check(
    '  with reduced motion: no fold and no opening, only a quick crossfade of the card',
    !reduced.ghostSeen &&
      reduced.card.some((a) => a.duration === tokens.quick && a.props.join() === 'opacity') &&
      reduced.card.every((a) => a.duration <= tokens.quick && a.props.join() === 'opacity'),
    JSON.stringify(reduced),
  );
  check('  no page errors', errors.length === 0, errors.join('; '));
  await context.close();
}

// ------------------------------------------------------------- a second tab
{
  const { page, context, errors } = await phone();
  await page.getByRole('button', { name: 'Start Tracking' }).click();
  await page.getByRole('group', { name: 'Recording so far' }).waitFor();
  await ride(page, 0, 50);
  const second = await context.newPage();
  await nodeFetch(second);
  await bareStyle(second);
  await second.addInitScript(GPS);
  await second.goto(`${BASE}/contribute/`, { waitUntil: 'load' });
  await toastSaying(second, 'Para is open in another tab').waitFor({ timeout: 10000 });
  check(
    'a second tab does not reopen the ride the first is recording',
    (await second.getByRole('button', { name: 'Resume' }).count()) === 0,
  );
  await second.getByRole('button', { name: 'Start Tracking' }).click();
  await second.waitForTimeout(500);
  const both = await stored(page);
  check(
    '  and its Start records nothing: still one recording, and the warning stays',
    (await second.getByRole('group', { name: 'Recording so far' }).count()) === 0 &&
      (await toastSaying(second, 'Para is open in another tab').count()) > 0 &&
      both.recordings.length === 1,
    JSON.stringify(both.recordings),
  );
  // The warning toast stays until closed: closed, as a contributor would, to reach History's cards.
  {
    const warning = toastSaying(second, 'Para is open in another tab');
    await warning.getByRole('button', { name: 'Close' }).click();
    await warning.waitFor({ state: 'detached' });
  }
  await openHistory(second);
  await finishRecording(page);
  await page.getByLabel('Description').fill('From the first tab');
  await page.getByRole('button', { name: 'Save recording' }).click();
  await page.getByTestId('toast').filter({ hasText: 'Route recorded' }).waitFor();
  await second
    .getByRole('heading', { level: 1, name: 'History' })
    .waitFor({ timeout: 5000 })
    .catch(() => {});
  check(
    '  once the first tab saves, the second lists it without a reload',
    (await second.locator('[data-ride-card]').filter({ hasText: 'From the first tab' }).count()) ===
      1,
  );
  // The first tab closes: the second is handed the recorder, as a page opened afresh would be.
  await page.close();
  await second.keyboard.press('Escape');
  await recordTab(second).click();
  await second.getByRole('button', { name: 'Start Tracking' }).waitFor();
  const handedOver = await toastSaying(second, 'Para is open in another tab')
    .waitFor({ state: 'detached', timeout: 5000 })
    .then(
      () => true,
      () => false,
    );
  await second.getByRole('button', { name: 'Start Tracking' }).click();
  const isRecording = await second
    .getByRole('group', { name: 'Recording so far' })
    .waitFor({ timeout: 10000 })
    .then(
      () => true,
      () => false,
    );
  check(
    '  once the first tab closes, the second holds the recorder: the warning goes and its Start records',
    handedOver && isRecording,
  );
  check('no page errors', errors.length === 0, errors.join('; '));
  await context.close();
}

// ------------------------------------------- a second tab, handed a ride left open
{
  const { page, context, errors } = await phone();
  await page.getByRole('button', { name: 'Start Tracking' }).click();
  await page.getByRole('group', { name: 'Recording so far' }).waitFor();
  await ride(page, 0, 50);
  const second = await context.newPage();
  await nodeFetch(second);
  await bareStyle(second);
  await second.addInitScript(GPS);
  await second.goto(`${BASE}/contribute/`, { waitUntil: 'load' });
  await toastSaying(second, 'Para is open in another tab').waitFor({ timeout: 10000 });
  const before = await stored(page);
  // The first tab closes mid-ride: the second takes the ride back, as a reload of the first would.
  await page.close();
  const handedOver = await second
    .locator('#unfinished-heading')
    .waitFor({ timeout: 10000 })
    .then(
      () => true,
      () => false,
    );
  const after = await stored(second);
  check(
    'a ride left open by a tab that closes is taken back by the other: Unfinished, its fixes all there, no second recording, the warning gone',
    handedOver &&
      before.recordings.length === 1 &&
      after.recordings.length === 1 &&
      after.recordings[0].status === before.recordings[0].status &&
      after.fixes === before.fixes &&
      (await toastSaying(second, 'Para is open in another tab').count()) === 0,
    JSON.stringify({ before, after }),
  );
  check('  no page errors', errors.length === 0, errors.join('; '));
  await context.close();
}

// ------------------------------------------------- one wake lock, released on Stop
const WAKE = () => {
  window.__wake = { requests: 0, active: 0, pending: [] };
  let visible = 'visible';
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => visible });
  window.__show = (state) => {
    visible = state;
    document.dispatchEvent(new Event('visibilitychange'));
  };
  window.__grant = () => window.__wake.pending.splice(0).forEach((grant) => grant());
  Object.defineProperty(navigator, 'wakeLock', {
    configurable: true,
    value: {
      request: () => {
        window.__wake.requests++;
        return new Promise((resolve) =>
          window.__wake.pending.push(() => {
            const sentinel = new EventTarget();
            sentinel.released = false;
            sentinel.release = async () => {
              if (sentinel.released) return;
              sentinel.released = true;
              window.__wake.active--;
              sentinel.dispatchEvent(new Event('release'));
            };
            window.__wake.active++;
            resolve(sentinel);
          }),
        );
      },
    },
  });
};
{
  const { page, errors } = await phone();
  await page.addInitScript(WAKE);
  await page.reload({ waitUntil: 'load' });
  await page.getByRole('button', { name: 'Start Tracking' }).click();
  await page.getByRole('group', { name: 'Recording so far' }).waitFor();
  await page.evaluate(() => {
    window.__show('hidden');
    window.__show('visible');
  });
  await page.evaluate(() => window.__grant());
  await page.waitForTimeout(200);
  const held = await page.evaluate(() => ({ ...window.__wake, pending: undefined }));
  check(
    'the page shown again while the wake lock is being asked for asks no second time',
    held.requests === 1 && held.active === 1,
    JSON.stringify(held),
  );
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await page.waitForTimeout(200);
  check(
    '  and Pause lets the one lock go',
    (await page.evaluate(() => window.__wake.active)) === 0,
  );
  check('no page errors', errors.length === 0, errors.join('; '));
  await page.context().close();
}

// --------------------- a screen the phone will not keep awake: a toast, until closed or fixed
const REFUSING_WAKE = () => {
  window.__wakeAnswer = 'refuse';
  window.__wakeAsks = 0;
  let visible = 'visible';
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => visible });
  window.__show = (state) => {
    visible = state;
    document.dispatchEvent(new Event('visibilitychange'));
  };
  // Held until the suite answers it, as a phone thinking it over: 'refuse' or 'grant'.
  const waiting = [];
  window.__answerWake = () =>
    waiting.splice(0).forEach(({ resolve, reject }) => {
      if (window.__wakeAnswer === 'refuse') {
        reject(new DOMException('Low battery', 'NotAllowedError'));
        return;
      }
      const sentinel = new EventTarget();
      sentinel.released = false;
      sentinel.release = async () => {
        sentinel.released = true;
      };
      resolve(sentinel);
    });
  Object.defineProperty(navigator, 'wakeLock', {
    configurable: true,
    value: {
      request: () => {
        window.__wakeAsks++;
        return new Promise((resolve, reject) => waiting.push({ resolve, reject }));
      },
    },
  });
};
{
  const { page, errors } = await phone();
  await page.addInitScript(REFUSING_WAKE);
  await page.reload({ waitUntil: 'load' });
  const asleep = toastSaying(page, 'Screen may sleep');
  await page.getByRole('button', { name: 'Start Tracking' }).click();
  await page.getByRole('group', { name: 'Recording so far' }).waitFor();
  await page.waitForFunction(() => window.__wakeAsks === 1);
  await page.waitForTimeout(300);
  check(
    'while the phone is still asked to keep the screen awake, no toast: nothing flashes on every start',
    (await page.getByTestId('toast').count()) === 0,
  );
  const focusBefore = await page.evaluate(() => {
    window.__focusBefore = document.activeElement;
    return document.activeElement?.tagName;
  });
  await page.evaluate(() => window.__answerWake());
  await asleep.waitFor({ timeout: 5000 });
  const said = {
    focusBefore,
    isFocusKept: await page.evaluate(() => document.activeElement === window.__focusBefore),
    words: await asleep.innerText(),
    alert: (await page.getByRole('alert').allInnerTexts()).join(' | '),
  };
  check(
    '  refused: a toast at the top says the screen may sleep and why, read out at once, taking no focus',
    /Screen may sleep/.test(said.words) &&
      /recording may stop when it sleeps/.test(said.words) &&
      said.alert.includes('Screen may sleep. It could not be kept awake') &&
      said.isFocusKept,
    JSON.stringify(said),
  );
  // Drawn with its classes on this page, which builds its own CSS: Storybook cannot show that.
  await toastSettled(page);
  const looks = await asleep.evaluate((toast) => {
    const style = getComputedStyle(toast);
    return {
      background: style.backgroundColor,
      radius: style.borderTopLeftRadius,
      shadow: style.boxShadow,
      top: toast.getBoundingClientRect().top,
      left: toast.getBoundingClientRect().left,
    };
  });
  check(
    "  the toast is drawn as designed on this page: the surface's colour, round corners, a shadow, 12 in and 12 down, over the top row",
    looks.background !== 'rgba(0, 0, 0, 0)' &&
      looks.radius === '16px' &&
      looks.shadow !== 'none' &&
      looks.left === 12 &&
      looks.top === 12,
    JSON.stringify(looks),
  );
  // A flag while the problem stands is not said: no "Stop flagged" now, nor late, after ✕.
  await flagButton(page).click();
  await page.waitForTimeout(300);
  check(
    '  a flag while it shows says nothing: still the one toast, no "Stop flagged"',
    (await page.getByTestId('toast').count()) === 1 &&
      (await toastSaying(page, 'Stop flagged').count()) === 0,
    await page
      .getByTestId('toast')
      .allInnerTexts()
      .then((texts) => texts.join(' | ')),
  );
  await asleep.getByRole('button', { name: 'Close' }).click();
  await asleep.waitFor({ state: 'detached', timeout: 5000 });
  await page.waitForTimeout(500);
  check(
    '  ✕ closes it, and it does not come back while the same refusal stands, nor the flag after it',
    (await page.getByTestId('toast').count()) === 0,
    await page
      .getByTestId('toast')
      .allInnerTexts()
      .then((texts) => texts.join(' | ')),
  );
  // Paused, the lock is let go and the problem with it; recording again asks afresh.
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await page.getByRole('button', { name: 'Resume' }).click();
  await page.waitForFunction(() => window.__wakeAsks === 2);
  await page.evaluate(() => window.__answerWake());
  check(
    '  refused again after a Resume, it is new: the toast comes back',
    await asleep.waitFor({ timeout: 5000 }).then(
      () => true,
      () => false,
    ),
  );
  // Over the top row: where the toast meets the recording's ✕, the toast is what a tap reaches.
  await toastSettled(page);
  const overTopRow = await page.evaluate(() => {
    const toast = document.querySelector('[data-testid="toast"]');
    const discard = document.querySelector('button[aria-label="Discard recording"]');
    if (!toast || !discard) return { isOver: false, reason: 'missing' };
    const box = discard.getBoundingClientRect();
    const toastBox = toast.getBoundingClientRect();
    const x = box.left + box.width / 2;
    const y = box.top + box.height / 2;
    const isUnderToast =
      x >= toastBox.left && x <= toastBox.right && y >= toastBox.top && y <= toastBox.bottom;
    return {
      isOver: isUnderToast && toast.contains(document.elementFromPoint(x, y)),
      discard: { x, y },
      toast: { top: toastBox.top, bottom: toastBox.bottom },
    };
  });
  check(
    "  the toast sits over the top row: over the recording's ✕ while it shows",
    overTopRow.isOver,
    JSON.stringify(overTopRow),
  );
  // Closed with its own ✕, the recording's ✕ under it is there to press.
  await asleep.getByRole('button', { name: 'Close' }).click();
  await asleep.waitFor({ state: 'detached', timeout: 5000 });
  await page.getByRole('button', { name: 'Discard recording' }).click({ timeout: 5000 });
  const stopScreen = page.getByRole('alertdialog', { name: 'Stop and delete this ride?' });
  check(
    "  closed, the recording's ✕ under it is pressed and asks to stop",
    await stopScreen.waitFor({ timeout: 5000 }).then(
      () => true,
      () => false,
    ),
  );
  // ✕ paused it, so the lock was let go with the problem; Keep recording asks again, refused.
  await stopScreen.getByRole('button', { name: 'Keep recording' }).click();
  await stopScreen.waitFor({ state: 'detached' });
  await page.waitForFunction(() => window.__wakeAsks === 3);
  await page.evaluate(() => window.__answerWake());
  await asleep.waitFor({ timeout: 5000 });
  // The phone says yes when the page is shown again: fixed, the toast goes by itself.
  await page.evaluate(() => {
    window.__wakeAnswer = 'grant';
    window.__show('hidden');
    window.__show('visible');
  });
  await page.waitForFunction(() => window.__wakeAsks === 4);
  await page.evaluate(() => window.__answerWake());
  check(
    '  granted later, the toast goes by itself, with no ✕',
    await asleep.waitFor({ state: 'detached', timeout: 5000 }).then(
      () => true,
      () => false,
    ),
  );
  check('  no page errors', errors.length === 0, errors.join('; '));
  await page.context().close();
}

// ------------------ the locator refused: its note a toast, one with the recorder's, never stacked
const REFUSING_LOCATION = () => {
  const refuse = (error) =>
    setTimeout(() => error?.({ code: 1, PERMISSION_DENIED: 1, message: 'User denied' }), 50);
  window.__locationAsks = 0;
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: {
      watchPosition: (_ok, error) => {
        window.__locationAsks++;
        refuse(error);
        return window.__locationAsks;
      },
      clearWatch: () => {},
      getCurrentPosition: (_ok, error) => refuse(error),
    },
  });
};
{
  const { page, errors } = await phone();
  await page.addInitScript(REFUSING_LOCATION);
  await page.reload({ waitUntil: 'load' });
  const where = page.getByTestId('where');
  const refused = toastSaying(page, 'Location is off for this site');
  const tapRefused = async () => {
    const asks = await page.evaluate(() => window.__locationAsks);
    await where.click();
    await page.waitForFunction((before) => window.__locationAsks > before, asks);
    await page.waitForTimeout(300);
  };
  await tapRefused();
  check(
    "the locate button refused: the locator's note is a problem toast at the top, with its drawing",
    await refused.waitFor({ timeout: 5000 }).then(
      () => true,
      () => false,
    ),
    await page
      .getByTestId('toast')
      .allInnerTexts()
      .then((texts) => texts.join(' | ')),
  );
  await tapRefused();
  await tapRefused();
  check(
    '  tapped twice more, still refused: the same toast, never a second',
    (await page.getByTestId('toast').count()) === 1 && (await refused.count()) === 1,
    `${await page.getByTestId('toast').count()} toast(s)`,
  );
  await refused.getByRole('button', { name: 'Close' }).click();
  await refused.waitFor({ state: 'detached', timeout: 5000 });
  await tapRefused();
  check(
    '  closed with ✕, a tap still refused says it again',
    await refused.waitFor({ timeout: 5000 }).then(
      () => true,
      () => false,
    ),
  );
  // The recorder is refused too: one location problem, one toast, in the recorder's words.
  await page.getByRole('button', { name: 'Start Tracking' }).click();
  const blocked = toastSaying(page, 'Location is blocked');
  check(
    "  Start refused as well: the recorder's words take the one location toast",
    await blocked.waitFor({ timeout: 5000 }).then(
      () => true,
      () => false,
    ),
    await page
      .getByTestId('toast')
      .allInnerTexts()
      .then((texts) => texts.join(' | ')),
  );
  await blocked.getByRole('button', { name: 'Close' }).click();
  await blocked.waitFor({ state: 'detached', timeout: 5000 });
  await page.waitForTimeout(1000);
  check(
    "  closed, no second location toast waits behind it: the locator's note is not said twice",
    (await page.getByTestId('toast').count()) === 0,
    await page
      .getByTestId('toast')
      .allInnerTexts()
      .then((texts) => texts.join(' | ')),
  );
  check('  no page errors', errors.length === 0, errors.join('; '));
  await page.context().close();
}

// ------------------- Back to the map on Unfinished, not on Start or Recording, nor after a save; a ride kept
{
  const { page, errors } = await phone();
  const back = page.getByRole('button', { name: 'Back to the map' });
  const hasOneBack = async () => (await back.count()) === 1;
  await page.getByRole('button', { name: 'Start Tracking' }).waitFor();
  check(
    "Ready has no Back to the map (the browser goes back), no scale bar, and the map's credits behind its ⓘ",
    (await back.count()) === 0 &&
      (await page.locator('.maplibregl-ctrl-scale').isVisible()) === false &&
      !(await page.locator('.maplibregl-ctrl-attrib').isVisible()) &&
      (await creditsButton(page).count()) === 1,
  );

  await page.getByRole('button', { name: 'Start Tracking' }).click();
  await page.getByRole('group', { name: 'Recording so far' }).waitFor();
  await ride(page, 0, 300);
  check(
    'Recording has ✕ where Back to the map was, and no way back of its own',
    (await back.count()) === 0 &&
      (await page.getByRole('button', { name: 'Discard recording' }).count()) === 1,
  );
  // Recording keeps the credits behind its own ⓘ, as Start does: no corner one beside it.
  const hasOwnCredits = async () =>
    (await creditsButton(page).isVisible()) &&
    !(await page.locator('.maplibregl-ctrl-attrib').isVisible());
  check("  and the map's credits behind its own ⓘ while recording", await hasOwnCredits());
  // How far the map's right-hand buttons stand over the stack of cards (--dock-foot).
  const mapButtonsOver = async (stackHeading) => {
    // Once the buttons have come to rest: they slide as the stack's room changes.
    await page.waitForFunction(() => {
      const button = document.querySelector('[aria-label="Map design"]');
      return (
        button !== null &&
        !document
          .getAnimations()
          .some(
            (animation) =>
              animation.playState === 'running' &&
              animation.effect?.target instanceof Element &&
              animation.effect.target.contains(button),
          )
      );
    });
    return page.evaluate((heading) => {
      const stack = document.querySelector(`[aria-labelledby="${heading}"]`);
      const buttons = [
        ...document.querySelectorAll(
          '[aria-label="Map design"], [aria-label="Turn on my location"], [aria-label="Show where I am"], [aria-label="You are here"]',
        ),
      ];
      const lowest = Math.max(...buttons.map((button) => button.getBoundingClientRect().bottom));
      return Math.round(stack.getBoundingClientRect().top - lowest);
    }, stackHeading);
  };
  const overRecording = await mapButtonsOver('recording-heading');
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await page.getByRole('button', { name: 'Resume' }).waitFor();
  check('  and while paused', await hasOwnCredits());
  await page.getByRole('button', { name: 'Resume' }).click();
  await page.getByRole('button', { name: 'Pause', exact: true }).waitFor();
  // Fixes are written as they arrive; a moment lets the last ones land before the page goes.
  const distanceOf = async () =>
    (await page.getByRole('group', { name: 'Recording so far' }).innerText())
      .match(/Distance\s+(\S+\s*\S*)/)?.[1]
      .trim();
  const distanceBefore = await distanceOf();
  await page.waitForTimeout(3000);
  await page.goto(`${BASE}/`, { waitUntil: 'load' });

  await page.goto(`${BASE}/contribute/`, { waitUntil: 'load' });
  await page.getByRole('heading', { name: 'A recording was left open' }).waitFor();
  check(
    '  coming back shows the ride as left open, with the distance it had',
    Boolean(distanceBefore) && (await distanceOf()) === distanceBefore,
    `${distanceBefore} / ${await distanceOf()}`,
  );
  check('Unfinished has Back to the map', await hasOneBack());
  // Its credits behind its own ⓘ, as Start's and Recording's are, MapLibre's corner one aside:
  // 12 in from the left, 12 over the cards, as the ⓘ rides over a card on the public map.
  const info = await creditsButton(page).boundingBox();
  const why = await page
    .getByRole('heading', { name: 'A recording was left open' })
    .locator('..')
    .boundingBox();
  check(
    "  and the map's credits behind its own ⓘ, 12 in and 12 over the cards, no corner one",
    (await hasOwnCredits()) &&
      Math.round(info.x) === 12 &&
      Math.round(why.y - (info.y + info.height)) === 12,
    JSON.stringify({ info, why }),
  );
  const overUnfinished = await mapButtonsOver('unfinished-heading');
  check(
    "  the map's buttons stand as far over Unfinished's cards as over Recording's: the ⓘ takes no room",
    overUnfinished === overRecording,
    JSON.stringify({ overRecording, overUnfinished }),
  );
  const unfinishedSheet = page.getByRole('dialog', { name: 'Map Data Source' });
  await creditsButton(page).click();
  await unfinishedSheet.waitFor();
  check(
    '  the ⓘ opens Map Data Source, the card inert under it',
    await page.evaluate(
      () =>
        !!document
          .querySelector('[aria-labelledby="unfinished-heading"] button')
          ?.closest('[inert]'),
    ),
  );
  await page.keyboard.press('Escape');
  await unfinishedSheet.waitFor({ state: 'detached' });
  check(
    '  Escape closes it, focus back on the ⓘ',
    await page.evaluate(
      () => document.activeElement?.getAttribute('aria-label') === 'Map data sources',
    ),
  );
  const onUnfinished = await mapControlsInTabOrder(page);
  check(
    "  and the map's own buttons, in sight above its card, still in reach",
    onUnfinished.includes('Map design'),
    onUnfinished.join(' | '),
  );

  await page.getByRole('button', { name: 'Stop', exact: true }).click();
  await finishRecording(page);
  await page.getByRole('button', { name: 'Save recording' }).waitFor();
  const onForm = await mapControlsInTabOrder(page);
  check(
    'the Save form covers the whole map: no map control under it, its credits included, can be tabbed to or read out',
    onForm.length === 0,
    onForm.join(' | '),
  );
  await page.getByRole('button', { name: 'Save recording' }).click();
  await page.getByTestId('toast').filter({ hasText: 'Route recorded' }).waitFor();
  await page.getByRole('button', { name: 'Start Tracking' }).waitFor();
  const afterSave = await mapControlsInTabOrder(page);
  check(
    'saved, it is straight back on Record, as Start is: no Back to the map, the map in reach again',
    (await back.count()) === 0 && afterSave.includes('Map design'),
    afterSave.join(' | '),
  );
  check('no page errors', errors.length === 0, errors.join('; '));
  await page.context().close();
}

// ------------------------------------------------ the map's credits: the Map Data Source sheet
{
  const { page, errors } = await phone();
  await page.getByRole('button', { name: 'Start Tracking' }).waitFor({ timeout: 20000 });
  await page.waitForFunction(() => !!window.__map?.loaded(), null, { timeout: 30000 });
  const sheet = page.getByRole('dialog', { name: 'Map Data Source' });
  const isMapInert = () =>
    page.evaluate(
      () => !!document.querySelector('button[aria-label="Map design"]')?.closest('[inert]'),
    );
  const focusIsOnInfo = () =>
    page
      .waitForFunction(
        () => document.activeElement?.getAttribute('aria-label') === 'Map data sources',
        null,
        { timeout: 5000 },
      )
      .then(() => true)
      .catch(() => false);

  await creditsButton(page).click();
  await sheet.waitFor();
  // Which tiles this build draws, from the style it asked for: VITE_BASEMAP_HOST, OpenFreeMap when unset.
  const isOpenFreeMap = await page.evaluate(() =>
    performance
      .getEntriesByType('resource')
      .some((entry) => /^https:\/\/tiles\.openfreemap\.org\/styles\//.test(entry.name)),
  );
  const rows = await sheet.getByRole('link').evaluateAll((links) =>
    links.map((a) => ({
      text: a.textContent,
      href: a.getAttribute('href'),
      target: a.getAttribute('target'),
      rel: a.getAttribute('rel'),
    })),
  );
  const tiles = isOpenFreeMap
    ? ['OpenFreeMap', 'https://openfreemap.org']
    : ['© OpenMapTiles', 'https://openmaptiles.org'];
  const expected = [
    ['© Para contributors · ODbL', 'https://github.com/ParaOrg/Para#data-and-licence'],
    ['© OpenStreetMap contributors', 'https://www.openstreetmap.org/copyright'],
    tiles,
    ['OSRM', 'https://project-osrm.org'],
    ['Improve map', 'https://www.openstreetmap.org/fixthemap'],
  ];
  check(
    `the ⓘ opens Map Data Source: five rows, each a link out in a new tab (${isOpenFreeMap ? 'OpenFreeMap' : 'our tiles'})`,
    rows.length === 5 &&
      rows.every(
        (row, i) =>
          row.text.startsWith(expected[i][0]) &&
          row.href === expected[i][1] &&
          row.target === '_blank' &&
          row.rel === 'noreferrer',
      ),
    JSON.stringify(rows),
  );
  check(
    '  the map under it is dimmed and inert, the scrim hidden from screen readers, focus in the sheet',
    (await isMapInert()) &&
      (await page.locator('.bg-surface-transparent[aria-hidden="true"]').count()) === 1 &&
      (await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'))),
  );
  for (let i = 0; i < 8; i += 1) await page.keyboard.press('Tab');
  const isStillIn = await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'));
  await page.keyboard.press('Shift+Tab');
  check(
    '  Tab and Shift+Tab go round inside it',
    isStillIn && (await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'))),
  );
  await page.keyboard.press('Escape');
  await sheet.waitFor({ state: 'detached' });
  check(
    '  Escape closes it, focus back on the ⓘ, the map live again',
    (await focusIsOnInfo()) && !(await isMapInert()),
  );

  await creditsButton(page).click();
  await sheet.getByRole('button', { name: 'Close' }).click();
  await sheet.waitFor({ state: 'detached' });
  check('  ✕ closes it, focus back on the ⓘ', await focusIsOnInfo());

  // A tap on the dimmed map over a control of Start's: it closes the sheet and presses nothing.
  // Over the top right's Account button where Start has one, else over bare map.
  const person = page.locator('button[aria-label="Account"]');
  const target = (await person.count()) ? await person.boundingBox() : null;
  await creditsButton(page).click();
  await sheet.waitFor();
  check(
    '  Start under it is inert too: its bar and tabs are not reached behind the sheet',
    await page.evaluate(
      () =>
        !!document.querySelector('section[aria-labelledby="ready-heading"]')?.closest('[inert]'),
    ),
  );
  await page.touchscreen.tap(
    target ? target.x + target.width / 2 : 200,
    target ? target.y + target.height / 2 : 120,
  );
  await sheet.waitFor({ state: 'detached' });
  await page.waitForTimeout(500);
  check(
    `  a tap on the dimmed map${target ? " over Start's Account button" : ''} closes it, and presses nothing under it`,
    (await page.getByRole('button', { name: 'Start Tracking' }).count()) === 1 &&
      (await page.evaluate(() => location.hash)) === '',
  );
  check('  no page errors', errors.length === 0, errors.join('; '));
  await page.context().close();
}

// ------------------------------------------------- Location Labels on the Map Style card
{
  const { page, errors } = await phone();
  // A stand-in for each design with labels of its own, from a vector source whose tiles are
  // empty, over the bare style: the switch is read off the layers, never off the tiles.
  await page.route(/tiles\.openfreemap\.org/, (route) => {
    const url = route.request().url();
    const design = url.match(/\/styles\/([a-z]+)/)?.[1];
    if (!design) return route.fulfill({ status: 204, body: '' });
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        version: 8,
        sources: {
          openmaptiles: {
            type: 'vector',
            tiles: ['https://tiles.openfreemap.org/stand-in/{z}/{x}/{y}.pbf'],
          },
        },
        layers: [
          { id: `${design}-bg`, type: 'background', paint: { 'background-color': '#eeeeee' } },
          {
            id: `${design}-place`,
            type: 'symbol',
            source: 'openmaptiles',
            'source-layer': 'place',
          },
          { id: `${design}-road`, type: 'symbol', source: 'openmaptiles', 'source-layer': 'road' },
          // Coloured draws its places, train stations among them, by an icon and a name, as
          // Liberty's poi_r1 does.
          ...(design === 'liberty'
            ? [
                {
                  id: 'liberty-poi',
                  type: 'symbol',
                  source: 'openmaptiles',
                  'source-layer': 'poi',
                  filter: ['>=', ['get', 'rank'], 1],
                  layout: { 'icon-image': '{class}', 'text-field': '{name}' },
                },
              ]
            : []),
        ],
      }),
    });
  });
  const waitForMap = (p) =>
    p.waitForFunction(() => !!window.__map?.loaded(), null, { timeout: 30000 });
  await page.reload({ waitUntil: 'load' });
  await page.getByRole('button', { name: 'Start Tracking' }).waitFor({ timeout: 20000 });
  await waitForMap(page);
  // The published hotspots, names and pins, come once the map settles: in before the labels are
  // read, so "ours" is the same list at the start as after each switch.
  await page.waitForFunction(() => !!window.__map.getLayer('saved-stops-pin'), null, {
    timeout: 30000,
  });
  await checkLocationLabels(page, { check, prefix: 'contributor page', waitForMap });
  check('  no page errors', errors.length === 0, errors.join('; '));
  await page.context().close();
}

// ------------------------------------- the published routes, faint under the trail, a picture only
// The resting paints of the public map (map-colours.ts): Map/RouteLine/surface-default, and each
// train line's Map/Rail/<line>/surface-pale.
const PUBLISHED_PAINT = {
  'published-routes-line': '#c1bfff',
  'published-saved-routes-rail-lrt-1': '#b7f5ca',
  'published-saved-routes-rail-lrt-2': '#d0b9ff',
  'published-saved-routes-rail-mrt-3': '#fff1b8',
};
/** When the map first settled, in the page's own time: the routes come after it. */
const FIRST_IDLE = () => {
  const watch = setInterval(() => {
    if (!window.__map) return;
    clearInterval(watch);
    window.__map.once('idle', () => (window.__firstIdle = performance.now()));
  }, 5);
};
{
  const { page, errors } = await phone();
  await page.addInitScript(FIRST_IDLE);
  await page.reload({ waitUntil: 'load' });
  await page.getByRole('button', { name: 'Start Tracking' }).waitFor({ timeout: 20000 });
  await page.waitForFunction(() => !!window.__map?.getLayer('published-routes-line'), null, {
    timeout: 30000,
  });
  const layers = await page.evaluate((paint) => {
    const map = window.__map;
    const order = map.getLayersOrder();
    const firstLabel = order.findIndex((id) => map.getLayer(id)?.type === 'symbol');
    return {
      at: Object.keys(paint).map((id) => order.indexOf(id)),
      casing: order.indexOf('published-routes-casing'),
      trail: order.indexOf('recording-trail-casing'),
      firstLabel,
      colours: Object.keys(paint).map((id) => map.getPaintProperty(id, 'line-color')),
      routes: map.getSource('published-routes').serialize().data.features.length,
      hit: order.filter((id) => id.startsWith('published') && /hit|selected/.test(id)),
    };
  }, PUBLISHED_PAINT);
  check(
    "the published routes are on the contributor's map: a casing and the four resting lines",
    layers.casing >= 0 && layers.at.every((i) => i > layers.casing) && layers.routes > 0,
    JSON.stringify(layers),
  );
  check(
    "  pale, in the public map's resting paints (Map/RouteLine/surface-default, the trains' surface-pale)",
    JSON.stringify(layers.colours) === JSON.stringify(Object.values(PUBLISHED_PAINT)),
    JSON.stringify(layers.colours),
  );
  check(
    "  under the recording trail and under the map's labels, with no tap area and no lit layer",
    layers.trail > Math.max(...layers.at) &&
      (layers.firstLabel < 0 || layers.firstLabel > Math.max(...layers.at)) &&
      layers.hit.length === 0,
    JSON.stringify(layers),
  );
  const asked = await page.evaluate(() => ({
    firstIdle: window.__firstIdle ?? null,
    index: performance
      .getEntriesByType('resource')
      .filter((entry) => entry.name.includes('/data/index.v5.json'))
      .map((entry) => entry.startTime),
  }));
  check(
    '  read only after the map first settled, off the opening path',
    asked.firstIdle !== null && asked.index.length === 1 && asked.index[0] >= asked.firstIdle,
    JSON.stringify(asked),
  );

  // A tap on a route does what a tap on empty map does: nothing opens.
  await page.evaluate(() => window.__map.jumpTo({ center: [121.0437, 14.6577], zoom: 14 }));
  await page.waitForFunction(() => !window.__map.isMoving() && window.__map.loaded());
  const onRoute = await page.evaluate(() => {
    const map = window.__map;
    const { width, height } = map.getCanvas().getBoundingClientRect();
    // A point on a route in the open middle of the screen, clear of the buttons at its edges.
    for (let y = height * 0.2; y < height * 0.6; y += 4) {
      for (let x = width * 0.2; x < width * 0.8; x += 4) {
        const hits = map.queryRenderedFeatures([x, y], { layers: ['published-routes-line'] });
        if (hits.length > 0) return { x, y };
      }
    }
    return null;
  });
  const before = await page.evaluate(() => ({
    text: document.body.innerText,
    hash: location.hash,
    dialogs: document.querySelectorAll('[role="dialog"], dialog[open]').length,
  }));
  if (onRoute) await page.touchscreen.tap(onRoute.x, onRoute.y);
  await page.waitForTimeout(400);
  const after = await page.evaluate(() => ({
    text: document.body.innerText,
    hash: location.hash,
    dialogs: document.querySelectorAll('[role="dialog"], dialog[open]').length,
  }));
  check(
    '  a tap on a route opens nothing: no card, no sheet, the same screen as before',
    !!onRoute &&
      after.hash === before.hash &&
      after.dialogs === before.dialogs &&
      after.text === before.text,
    JSON.stringify({
      onRoute,
      before: { ...before, text: before.text.length },
      after: { ...after, text: after.text.length },
    }),
  );
  check('  no page errors', errors.length === 0, errors.join('; '));
  await page.context().close();
}

// ------------- the published routes' full lines through a basemap switch, and kept out of the History picture
{
  const { page, errors } = await phone();
  await page.waitForFunction(() => !!window.__map?.getLayer('published-routes-line'), null, {
    timeout: 30000,
  });
  // Street zoom on a route, and the basemap switched at once, while its full lines are on their way.
  await page.evaluate(() => {
    const map = window.__map;
    const { features } = map.getSource('published-routes').serialize().data;
    const line = features.find((f) => f.properties.line === '').geometry.coordinates;
    map.jumpTo({ center: line[Math.floor(line.length / 2)], zoom: 16 });
  });
  const switched = page.evaluate(
    () => new Promise((resolve) => window.__map.once('style.load', () => resolve(true))),
  );
  await page.getByTestId('basemap').click();
  await page
    .getByRole('dialog', { name: 'Map Style' })
    .getByRole('button', { name: 'Dark', exact: true })
    .click();
  await switched;
  await page.keyboard.press('Escape');
  await page.waitForFunction(
    () =>
      window.__map.loaded() &&
      performance.getEntriesByType('resource').some((e) => e.name.includes('/data/lines/')),
    null,
    { timeout: 30000 },
  );
  await page.waitForFunction(() => !window.__map.isMoving() && window.__map.loaded());
  await page.waitForTimeout(1500);
  const drawn = await page.evaluate(async () => {
    const asked = [
      ...new Set(
        performance
          .getEntriesByType('resource')
          .filter((e) => e.name.includes('/data/lines/'))
          .map((e) => decodeURIComponent(e.name.split('/data/lines/')[1].replace(/\.json.*$/, ''))),
      ),
    ];
    const data = window.__map.getSource('published-routes').serialize().data;
    const out = [];
    for (const id of asked) {
      const file = await (await fetch(`/data/lines/${encodeURIComponent(id)}.json`)).json();
      const feature = data.features.find((f) => f.properties.id === id);
      out.push({
        id,
        full: file.shape?.coordinates.length ?? 0,
        drawn: feature?.geometry.coordinates.length ?? 0,
      });
    }
    return out;
  });
  check(
    'at street zoom, the full lines read come through a basemap switch: each drawn whole, not its overview',
    drawn.length > 0 && drawn.every(({ full, drawn: shown }) => full > 0 && shown === full),
    JSON.stringify(drawn),
  );

  // The History picture is the rider's own trail on the basemap: the routes are hidden for its cut.
  await page.evaluate(() => {
    const cut = window.HTMLCanvasElement.prototype.toDataURL;
    window.HTMLCanvasElement.prototype.toDataURL = function (...args) {
      window.__routesAtCut = window.__map.getLayoutProperty('published-routes-line', 'visibility');
      return cut.apply(this, args);
    };
  });
  await page.getByRole('button', { name: 'Start Tracking' }).click();
  await page.getByRole('group', { name: 'Recording so far' }).waitFor();
  await ride(page, 0, 300);
  await finishRecording(page);
  await page.waitForFunction(() => window.__routesAtCut !== undefined, null, { timeout: 20000 });
  await page.waitForTimeout(300);
  const atCut = await page.evaluate(() => ({
    atCut: window.__routesAtCut,
    after: window.__map.getLayoutProperty('published-routes-line', 'visibility') ?? 'visible',
  }));
  check(
    '  the History picture is cut with the published routes hidden, and they show again after',
    atCut.atCut === 'none' && atCut.after === 'visible',
    JSON.stringify(atCut),
  );
  check('  no page errors', errors.length === 0, errors.join('; '));
  await page.context().close();
}

// --------------------------- the published map unreachable: no routes, no word of it, and the ride records
{
  const { page, errors } = await phone();
  const warnings = [];
  page.on('console', (message) => {
    if (message.type() === 'warning') warnings.push(message.text());
  });
  await page.route(/\/data\/(index\.v5\.json|lines\/)/, (route) =>
    route.abort('internetdisconnected'),
  );
  await page.reload({ waitUntil: 'load' });
  await page.getByRole('button', { name: 'Start Tracking' }).waitFor({ timeout: 20000 });
  await page.waitForFunction(() => !!window.__map?.loaded(), null, { timeout: 30000 });
  await page.getByRole('button', { name: 'Start Tracking' }).click();
  await page.getByRole('group', { name: 'Recording so far' }).waitFor();
  await ride(page, 0, 300);
  await page.waitForTimeout(500);
  const trail = await mapSource(page);
  const ridden = (trail?.features ?? []).filter((f) => f.geometry.type === 'LineString');
  check(
    'with the published map unreachable, Start records: the trail is drawn as the fixes come',
    ridden.length > 0 && ridden.some((f) => f.geometry.coordinates.length > 10),
    JSON.stringify(ridden.map((f) => f.geometry.coordinates.length)),
  );
  check(
    '  and no routes are on the map, and nothing on the screen says so',
    (await page.evaluate(() => !window.__map.getLayer('published-routes-line'))) &&
      (await page.getByRole('alert').count()) === 0 &&
      (await page.getByText(/published|routes/i).count()) === 0,
    await page.evaluate(() => document.body.innerText),
  );
  check(
    '  the page notes it once, in the console only',
    warnings.filter((w) => w.includes('published routes could not be shown')).length === 1,
    JSON.stringify(warnings),
  );
  check('  no page errors', errors.length === 0, errors.join('; '));
  await page.context().close();
}

await browser.close();
tally();
