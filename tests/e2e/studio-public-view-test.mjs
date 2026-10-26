// The studio's Public map: /studio/?e2e=1 with VITE_STUDIO_DRAFTS=1.
//
//   VITE_STUDIO_DRAFTS=1 npm run dev           (in another terminal)
//   node tests/e2e/studio-public-view-test.mjs
//
// For the same published index (public/data/index.v5.json) the studio's Public
// map draws the same directions and hotspots as the public page at /, compared
// by id. Below it, "Waiting for tonight's publish" lists what was approved or
// taken down since the index's published_at, and is empty once nothing is.
// The database is a stand-in: only the two tables the list reads, no tiles.
import { chromium } from 'playwright';
import { readPublished } from './lib/big-map.mjs';
import { BASE, bareStyle, harness } from './lib/harness.mjs';

const { check, tally } = harness();
const published = readPublished();
const OLD = '2000-01-01T00:00:00Z';
const row = (id, extra) => ({
  id,
  status: 'approved',
  revision: 1,
  updated_at: OLD,
  status_at: OLD,
  ...extra,
});

// The first hotspot already on the map is up to date; "Waiting place" is not on it yet.
let stops = [
  row(published.stops[0].id, { name: published.stops[0].name }),
  row('waiting-place', { name: 'Waiting place', updated_at: new Date().toISOString() }),
];
const serve = (route) => {
  const table = new URL(route.request().url()).pathname.split('/rest/v1/')[1];
  const rows = table === 'stop' ? stops : [];
  return route.fulfill({
    status: 200,
    contentType: 'application/json',
    headers: {
      'content-range': rows.length ? `0-${rows.length - 1}/${rows.length}` : '*/0',
      'access-control-expose-headers': 'content-range',
    },
    body: JSON.stringify(rows),
  });
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await bareStyle(page);
await page.route(/\/rest\/v1\//, serve);
await page.route(/\/auth\/v1\//, (route) =>
  route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }),
);

/** The ids a page's map draws: directions from saved-routes, hotspots from saved-stops. */
const drawnIds = async (target) => {
  const count = (id) =>
    target.evaluate(
      async (source) => (await window.__map?.getSource(source)?.getData())?.features?.length ?? 0,
      id,
    );
  for (
    let i = 0;
    i < 300 && !((await count('saved-routes')) > 0 && (await count('saved-stops')) > 0);
    i++
  )
    await target.waitForTimeout(100);
  return target.evaluate(async () => {
    const ids = async (source) =>
      [
        ...new Set(
          (await window.__map.getSource(source).getData()).features.map((f) => f.properties.id),
        ),
      ].sort();
    return { directions: await ids('saved-routes'), hotspots: await ids('saved-stops') };
  });
};

await page.goto(`${BASE}/?e2e=1`, { waitUntil: 'load' });
const publicPage = await drawnIds(page);

await page.goto(`${BASE}/studio/?e2e=1`, { waitUntil: 'load' });
await page.locator('label', { hasText: 'Public' }).click();
const frame = page.frameLocator('iframe[title="Published ParaPo public map"]');
await frame.locator('canvas').first().waitFor();
const studioFrame = page.frames().find((f) => f !== page.mainFrame() && f.url().includes('/?'));
const inStudio = await drawnIds(studioFrame);

check(
  'the Public map draws the same directions as the public page',
  JSON.stringify(inStudio.directions) === JSON.stringify(publicPage.directions) &&
    inStudio.directions.length > 0,
  `${inStudio.directions.length} directions`,
);
check(
  'the Public map draws the same hotspots as the public page',
  JSON.stringify(inStudio.hotspots) === JSON.stringify(publicPage.hotspots) &&
    inStudio.hotspots.length > 0,
  `${inStudio.hotspots.length} hotspots`,
);
check(
  'every drawn direction and hotspot of the index is on the Public map',
  published.variants.filter((v) => v.shape).every((v) => inStudio.directions.includes(v.id)) &&
    published.stops.every((stop) => inStudio.hotspots.includes(stop.id)),
);

const heading = page.getByRole('heading', { name: 'Waiting for tonight’s publish' });
await heading.waitFor();
check(
  'the waiting list names the approved place not yet published',
  (await page.getByRole('listitem').filter({ hasText: 'Waiting place' }).count()) === 1,
);
check(
  'a place already on the map is not listed',
  (await page.getByRole('listitem').filter({ hasText: published.stops[0].name }).count()) === 0 ||
    published.stops[0].name === 'Waiting place',
);

// A publish brings the place onto the map: the list empties on the next read.
stops = [stops[0]];
await page.getByRole('button', { name: 'Reload published map' }).click();
await page.getByText('Nothing is waiting.').waitFor({ timeout: 10000 });
check('the list empties once nothing is waiting', true);

check('no page errors', errors.length === 0, errors.join(' | '));
await browser.close();
tally();
