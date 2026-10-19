// Upload → view in the studio, end to end, on the isolated preview: the real
// SQL behind real PostgREST (scripts/preview/README.md, "Contributions"), never
// Supabase. Two phones upload; row security keeps each to its own and anon to
// nothing; an editor signs in to the studio's Contributors map and finds every
// upload there, in the list and on the map alike, and opens one to its trail.
//
//   PARAPO_PREVIEW=http://127.0.0.1:4280 node tests/e2e/contributions-preview-test.mjs
//
// PARAPO_SHOTS=dir keeps screenshots of each step at 393×852 and 1280×800.
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

import { bareStyle, harness } from './lib/harness.mjs';

const { check, tally } = harness();
const BASE = (process.env.PARAPO_PREVIEW ?? 'http://127.0.0.1:4280').replace(/\/$/, '');
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(BASE)) {
  console.log('Refused: PARAPO_PREVIEW must be the loopback preview');
  process.exit(1);
}
const SHOTS = process.env.PARAPO_SHOTS;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const shot = (page, name) => (SHOTS ? page.screenshot({ path: `${SHOTS}/${name}.png` }) : null);
/** This run's tag, so names are this run's whatever the disposable database already holds. */
const RUN = Date.now().toString(36).slice(-4);
const STUDIO_KEY = 'sb-127-auth-token';
const PHONE_KEY = 'parapo.contributor-auth';

const GPS = () => {
  const watchers = new Map();
  let nextId = 0;
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: {
      watchPosition: (ok) => {
        watchers.set(++nextId, ok);
        return nextId;
      },
      clearWatch: (id) => watchers.delete(id),
      getCurrentPosition: () => {},
    },
  });
  // The page's own clock, held by the suite: a fix and a tap then agree on when they happened.
  let now = Date.now();
  Date.now = () => now;
  window.__advance = (ms) => (now += ms);
  window.__fix = (lng, lat, t) =>
    watchers.forEach((ok) =>
      ok({
        timestamp: t,
        coords: { longitude: lng, latitude: lat, accuracy: 5, heading: null, speed: null },
      }),
    );
};

const browser = await chromium.launch();
const errors = [];
const outside = [];

async function newPage(context) {
  const page = await context.newPage();
  await bareStyle(page);
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('request', (r) => {
    const url = new URL(r.url());
    if (/supabase\.co$/.test(url.hostname)) outside.push(r.url());
  });
  return page;
}

/** A consented phone, on the contributor page. */
async function phone() {
  const context = await browser.newContext({
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 2,
    hasTouch: true,
    isMobile: true,
  });
  const page = await newPage(context);
  await page.addInitScript(GPS);
  await page.addInitScript(() => localStorage.setItem('parapo.contribute.consent', 'yes'));
  await page.goto(`${BASE}/contribute/`, { waitUntil: 'load' });
  await page.getByRole('button', { name: 'Start recording' }).waitFor({ timeout: 30000 });
  return { context, page };
}

/** Records `seconds` of a ride north from `lat`, a fix a second, and saves it with a start name. */
async function recordAndSave(page, name, lat, seconds = 40) {
  await page.getByRole('button', { name: 'Start recording' }).click();
  for (let s = 0; s < seconds; s += 1) {
    const standing = s >= 15 && s < 25;
    const north = (standing ? 15 : s < 15 ? s : s - 10) * 8;
    await page.evaluate(
      (y) => window.__fix(121.05, y, window.__advance(1000)),
      lat + north / 111_320,
    );
  }
  await page.getByRole('button', { name: 'Save' }).click();
  await page.getByLabel('Start point name').fill(`${name} ${RUN}`);
  await page.getByLabel('End point name').fill('Cubao');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('heading', { name: 'Successfully recorded' }).waitFor();
  await page.getByText(/Uploaded to ParaPo|refused|no signal/).waitFor({ timeout: 20000 });
  return page.getByText('Uploaded to ParaPo').count();
}

/** A REST read with this page's phone session, as the phone itself could make it. */
const phoneRead = (page, table) =>
  page.evaluate(
    async ([key, path]) => {
      const token = JSON.parse(localStorage.getItem(key) ?? 'null')?.access_token;
      const r = await fetch(`/api/rest/v1/${path}`, {
        headers: { apikey: 'x', ...(token ? { authorization: `Bearer ${token}` } : {}) },
      });
      return { status: r.status, body: await r.json() };
    },
    [PHONE_KEY, table],
  );

// ------------------------------------------------------------ two phones
const a = await phone();
check(
  'phone A: a ride recorded and saved is uploaded',
  (await recordAndSave(a.page, 'Fairview A', 14.7)) === 1,
);
await shot(a.page, '1-phone-uploaded');
await a.page.getByRole('button', { name: 'Record again' }).click();
check(
  'phone A: a second ride is uploaded too',
  (await recordAndSave(a.page, 'Lagro A', 14.72)) === 1,
);
await a.page.getByRole('button', { name: 'Record again' }).click();
await a.page.getByText('Saved recordings').waitFor();
await shot(a.page, '2-phone-list');

const b = await phone();
check('phone B: its ride is uploaded', (await recordAndSave(b.page, 'Novaliches B', 14.74)) === 1);

const aOwn = await phoneRead(a.page, 'contribution?select=id,start_name');
const bOwn = await phoneRead(b.page, 'contribution?select=id,start_name');
check(
  'row security: each phone reads only its own uploads',
  aOwn.body.length === 2 &&
    aOwn.body.every((r) => r.start_name.includes(' A ')) &&
    bOwn.body.length === 1 &&
    bOwn.body[0].start_name === `Novaliches B ${RUN}`,
  `A ${aOwn.body.length}, B ${bOwn.body.length}`,
);
const bPoints = await phoneRead(b.page, 'point_batch?select=seq');
check(
  '  a phone reads no points back, not even its own',
  bPoints.status === 200 && bPoints.body.length === 0,
);
const anon = await a.page.evaluate(
  async () => (await fetch('/api/rest/v1/contribution', { headers: { apikey: 'x' } })).status,
);
check('  the publishable key alone reads nothing', anon === 401, String(anon));
const bDeletesA = await b.page.evaluate(
  async ([key, id]) => {
    const token = JSON.parse(localStorage.getItem(key)).access_token;
    const r = await fetch(`/api/rest/v1/contribution?id=eq.${id}`, {
      method: 'DELETE',
      headers: { apikey: 'x', authorization: `Bearer ${token}`, prefer: 'return=representation' },
    });
    return (await r.json()).length;
  },
  [PHONE_KEY, aOwn.body[0].id],
);
check("  phone B cannot delete phone A's upload", bDeletesA === 0);

// ------------------------------------------------- the studio, as an editor
const studioContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const studio = await newPage(studioContext);
await studio.goto(`${BASE}/studio/?map=contributors`, { waitUntil: 'load' });
await studio.getByText('Sign in to ParaPo Studio').waitFor({ timeout: 30000 });
check(
  'a signed-out visitor meets the studio sign-in, and no upload is read',
  (await studio.getByRole('list', { name: 'Uploads' }).count()) === 0,
);
await shot(studio, '3-studio-signed-out');
await studio.getByPlaceholder('you@example.com').fill('preview@parapo.test');
await studio.getByPlaceholder('Password').fill('preview');
await studio.locator('button[type="submit"]').click();
await studio.getByRole('list', { name: 'Uploads' }).waitFor({ timeout: 20000 });
const rows = await studio
  .getByRole('list', { name: 'Uploads' })
  .getByRole('listitem')
  .allInnerTexts();
const ours = rows.filter((r) => r.includes(` ${RUN} `));
check(
  "signed in, the editor sees every phone's uploads, newest first",
  ours.length === 3 &&
    ours[0].startsWith(`Novaliches B ${RUN}`) &&
    ours.some((r) => r.startsWith(`Fairview A ${RUN}`)),
  ours.map((r) => r.split('\n')[0]).join(' | '),
);
check(
  '  minutes and distance read as recorded',
  /0\.2 km · 1 min/.test(ours[0]),
  ours[0]?.split('\n')[1],
);
await studio.waitForFunction(() => !!window.__map?.getSource('studio-contributions'), null, {
  timeout: 20000,
});
const mapIds = await studio.evaluate(() =>
  window.__map
    .getSource('studio-contributions')
    .serialize()
    .data.features.map((f) => f.properties.id),
);
const runIds = (await phoneRead(a.page, 'contribution?select=id')).body
  .concat((await phoneRead(b.page, 'contribution?select=id')).body)
  .map((r) => r.id);
check(
  "  the map draws the same uploads the list shows: as many, once each, this run's among them",
  mapIds.length === rows.length &&
    new Set(mapIds).size === mapIds.length &&
    runIds.every((id) => mapIds.includes(id)),
  `${mapIds.length} on the map, ${rows.length} in the list`,
);
check(
  '  the phone code is six characters, never the whole identity',
  rows.every((r) => /Phone [0-9a-f]{6} ·/.test(r)),
);
await shot(studio, '4-studio-list');

await studio.getByRole('button', { name: new RegExp(`^Fairview A ${RUN}`) }).click();
await studio.getByText(/On the map: the whole trail, \d+ points/).waitFor({ timeout: 20000 });
const details = await studio.locator('section dl').innerText();
const trailText = await studio.getByText(/On the map: the whole trail/).innerText();
check(
  'opening an upload shows what the phone saved: places, vehicle, totals, points',
  details.includes(`Fairview A ${RUN}`) &&
    details.includes('Cubao') &&
    /Points\s+\d+/.test(details),
  details.replaceAll('\n', ' '),
);
check(
  '  and its whole trail with its hinto, on the map',
  /40 points, and 1 hinto/.test(trailText),
  trailText,
);
const opened = await studio.evaluate(() =>
  window.__map
    .getSource('studio-contribution-opened')
    .serialize()
    .data.features.map((f) => f.properties.kind),
);
check(
  '  the map holds the trail and the hinto',
  opened.includes('trail') && opened.includes('hinto'),
  opened.join(','),
);
await shot(studio, '5-studio-opened');
await studio.getByRole('button', { name: 'Close' }).click();
check(
  '  Close returns to the list',
  (await studio.getByRole('list', { name: 'Uploads' }).count()) === 1,
);

// The editor's session and the phone's, in one browser.
const shared = await phone();
await recordAndSave(shared.page, 'Same browser', 14.76);
const phoneSession = await shared.page.evaluate((k) => localStorage.getItem(k), PHONE_KEY);
const sharedStudio = await newPage(shared.context);
await sharedStudio.goto(`${BASE}/studio/?map=contributors`, { waitUntil: 'load' });
await sharedStudio.getByPlaceholder('you@example.com').fill('preview@parapo.test');
await sharedStudio.getByPlaceholder('Password').fill('preview');
await sharedStudio.locator('button[type="submit"]').click();
await sharedStudio.getByRole('list', { name: 'Uploads' }).waitFor({ timeout: 20000 });
check(
  "in one browser, the editor's sign-in leaves the phone's session as it was, and the phone's never became the studio's",
  (await sharedStudio.evaluate((k) => localStorage.getItem(k), PHONE_KEY)) === phoneSession &&
    JSON.parse(await sharedStudio.evaluate((k) => localStorage.getItem(k), STUDIO_KEY)).user
      .is_anonymous === false,
);

check(
  'nothing asked a real Supabase project',
  outside.length === 0,
  outside.slice(0, 3).join(', '),
);
check('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
await browser.close();
tally();
