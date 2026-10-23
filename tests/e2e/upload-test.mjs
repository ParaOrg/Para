// The contributor page's uploads, driven by a phone: a saved recording goes to
// ParaPo on its own, waits out no signal, survives a lost answer and a double
// tap without being stored twice, and its upload can be removed while the
// phone keeps its copy. Supabase is the in-memory stand-in
// (lib/fake-contributions.mjs): nothing reaches a real project.
//
//   cp .env.production .env.local && echo VITE_CONTRIBUTIONS=1 >> .env.local
//                                        (a project URL to stand in for, and uploads on)
//   npm run dev                          (in another terminal)
//   node tests/e2e/upload-test.mjs
//
// PARAPO_SHOTS=dir keeps screenshots of the list's states at 393×852.
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

import { fakeContributions } from './lib/fake-contributions.mjs';
import { BASE, bareStyle, harness, nodeFetch } from './lib/harness.mjs';

const { check, tally } = harness();
const SHOTS = process.env.PARAPO_SHOTS;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const shot = (page, name) => (SHOTS ? page.screenshot({ path: `${SHOTS}/${name}.png` }) : null);

const T0 = Date.UTC(2026, 9, 19, 0, 0, 0);
const STUDIO_KEY = 'sb-smzwbqxttdyvohuizynl-auth-token';

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
  window.__fix = (lng, lat, t) =>
    watchers.forEach((ok) =>
      ok({
        timestamp: t,
        coords: { longitude: lng, latitude: lat, accuracy: 5, heading: null, speed: null },
      }),
    );
};

const browser = await chromium.launch();

/** A consented phone with the stand-in GPS and Supabase; `studioSession` is an editor signed in on the same site. */
async function phone({ studioSession = false } = {}) {
  const context = await browser.newContext({
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 2,
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  await nodeFetch(page);
  await bareStyle(page);
  const fake = await fakeContributions(page);
  // Cloudflare's Turnstile, standing in: the check passes at once. CI builds this suite with a site key.
  await page.route(/^https:\/\/challenges\.cloudflare\.com\//, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/javascript',
      body: 'window.turnstile={render(e,o){setTimeout(()=>o.callback("turnstile-token"),50);return "w"},remove(){}}',
    }),
  );
  await page.addInitScript(GPS);
  await page.addInitScript(() => localStorage.setItem('parapo.contribute.consent', 'yes'));
  if (studioSession) {
    await page.addInitScript(
      ([key]) => {
        if (!localStorage.getItem(key)) localStorage.setItem(key, '{"access_token":"editor"}');
      },
      [STUDIO_KEY],
    );
  }
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`${BASE}/contribute/`, { waitUntil: 'load' });
  await page.getByRole('button', { name: 'Start recording' }).waitFor({ timeout: 30000 });
  return { page, context, fake, errors };
}

/** Puts saved recordings straight into the phone's database, as an earlier visit would have left them. */
async function seed(page, recordings) {
  await page.evaluate(
    (rows) =>
      new Promise((resolve, reject) => {
        const open = indexedDB.open('parapo-contribute');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const tx = open.result.transaction(['recordings', 'fixes'], 'readwrite');
          for (const { recording, fixes } of rows) {
            tx.objectStore('recordings').put(recording);
            for (const fix of fixes) tx.objectStore('fixes').put(fix);
          }
          tx.oncomplete = () => {
            open.result.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    recordings,
  );
}

/** A saved recording of `count` fixes heading north from Fairview, a fix a second, 8 m apart. */
function savedRide(id, startedAt, { count = 30, upload, name = 'Fairview' } = {}) {
  const fixes = Array.from({ length: count }, (_, seq) => ({
    recordingId: id,
    seq,
    time: startedAt + seq * 1000,
    lng: 121.05,
    lat: 14.7 + (seq * 8) / 111_320,
    accuracyM: 5,
  }));
  const end = startedAt + count * 1000;
  const recording = {
    version: 1,
    id,
    status: 'saved',
    startedAt,
    stoppedAt: end,
    savedAt: end + 5000,
    gaps: [],
    startPointName: name,
    endPointName: 'Cubao',
    description: '',
    rideKind: 'Jeep',
    ...(upload ? { upload } : {}),
  };
  return { recording, fixes };
}

/** What the phone's database holds for a recording: its upload mark, or 'gone'. */
const storedUpload = (page, id) =>
  page.evaluate(
    (key) =>
      new Promise((resolve) => {
        const open = indexedDB.open('parapo-contribute');
        open.onsuccess = () => {
          const get = open.result.transaction('recordings').objectStore('recordings').get(key);
          get.onsuccess = () => {
            open.result.close();
            resolve(get.result ? (get.result.upload?.state ?? 'none') : 'gone');
          };
        };
      }),
    id,
  );

const row = (page, name) => page.getByRole('listitem').filter({ hasText: name });
const statusOf = (page, name) => row(page, name).locator('[aria-live]').innerText();
/** The History screen, opened through its button on Ready unless it is already showing. */
const openHistory = async (page) => {
  const heading = page.getByRole('heading', { level: 1, name: 'History' });
  const history = page.getByRole('button', { name: 'History' });
  // A reload on #history lands on the screen itself; otherwise Ready's button opens it.
  await heading.or(history).waitFor({ timeout: 10000 });
  if (await heading.isVisible()) return;
  await history.click();
  await heading.waitFor();
};
/** A card's actions, opened from its dots unless they are open, then the one named by `pattern`. */
const openMenu = async (page, name) => {
  const more = row(page, name).getByRole('button', { name: /^More actions/ });
  if ((await more.getAttribute('aria-expanded')) !== 'true') await more.click();
};
const act = async (page, name, pattern) => {
  await openMenu(page, name);
  await row(page, name).getByRole('button', { name: pattern }).click();
};
const countOf = async (page, name, pattern) => {
  await openMenu(page, name);
  return row(page, name).getByRole('button', { name: pattern }).count();
};
/**
 * Waits for a card whose group heading and text together match `pattern`: "Uploaded | ..." for a
 * card under Uploaded, "Not uploaded | ... No signal" for one that met no signal.
 */
const waitForStatus = async (page, name, pattern) => {
  await openHistory(page);
  return page.waitForFunction(
    ([n, p]) =>
      [...document.querySelectorAll('li')].some((li) => {
        const group = li.closest('section')?.querySelector('h2')?.textContent ?? '';
        return li.textContent.includes(n) && new RegExp(p).test(`${group} | ${li.textContent}`);
      }),
    [name, pattern.source],
    { timeout: 15000 },
  );
};
const UPLOADED = /^Uploaded \|/;

// ------------------------------------------------- record, save, uploaded
{
  const { page, fake, errors } = await phone({ studioSession: true });
  const studioBefore = await page.evaluate((k) => localStorage.getItem(k), STUDIO_KEY);
  await page.getByRole('button', { name: 'Start recording' }).click();
  for (let s = 0; s < 20; s += 1) {
    await page.evaluate(
      ([t, lat]) => window.__fix(121.05, lat, t),
      [T0 + s * 1000, 14.7 + (s * 8) / 111_320],
    );
  }
  await page.getByRole('button', { name: 'Save' }).click();
  await page.getByLabel('Start point name').fill('SM Fairview');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('heading', { name: 'Successfully recorded' }).waitFor();
  await page.getByText('Uploaded to ParaPo').waitFor({ timeout: 15000 });
  const [stored] = [...fake.rows.values()];
  check(
    'a saved recording is uploaded on its own, and Successfully recorded says so',
    fake.rows.size === 1 &&
      fake.saveRequests === 1 &&
      stored.recording.start_name === 'SM Fairview',
    `${fake.rows.size} stored, ${fake.saveRequests} sends`,
  );
  check(
    '  it went whole: its points, in batches, and the ride kind left blank',
    stored.recording.point_count === 20 &&
      stored.recording.batches.length === 1 &&
      stored.recording.vehicle === null,
    `${stored.recording.point_count} points`,
  );
  check(
    '  the phone keeps its copy, marked uploaded',
    (await storedUpload(page, stored.recording.id)) === 'uploaded',
  );
  check(
    "  with a Turnstile site key, the first sign-in carried the check's token",
    !process.env.PARAPO_TURNSTILE || fake.captchaTokens[0] === 'turnstile-token',
    String(fake.captchaTokens[0]),
  );
  check(
    "  the phone signed in under its own key; the editor's studio session is untouched",
    fake.signIns === 1 &&
      (await page.evaluate((k) => localStorage.getItem(k), STUDIO_KEY)) === studioBefore &&
      (await page.evaluate(() => localStorage.getItem('parapo.contributor-auth'))) !== null,
  );
  await page.getByRole('button', { name: 'Record again' }).click();
  await waitForStatus(page, 'SM Fairview', UPLOADED);
  await shot(page, '1-uploaded');
  await page.reload({ waitUntil: 'load' });
  await waitForStatus(page, 'SM Fairview', UPLOADED);
  await page.waitForTimeout(500);
  check(
    'after a reload it still reads as uploaded and is not sent again',
    fake.saveRequests === 1 && fake.signIns === 1,
    `${fake.saveRequests} sends`,
  );
  check(
    '  no request left for anything the stand-in does not know',
    fake.unknown.length === 0,
    fake.unknown.join(', '),
  );
  check('  no page errors', errors.length === 0, errors.join(' | '));
}

// --------------------------------------- no signal, then back online
{
  const { page, fake } = await phone();
  fake.next.save = 'offline';
  await seed(page, [
    savedRide('aaaaaaaa-0000-4000-8000-000000000001', T0, { name: 'Offline ride' }),
  ]);
  await page.reload({ waitUntil: 'load' });
  await waitForStatus(page, 'Offline ride', /No signal/);
  await shot(page, '2-no-signal');
  check(
    'with no signal it says so, keeps the copy and files it under Not uploaded',
    fake.rows.size === 0 &&
      (await page.getByRole('heading', { level: 2, name: 'Not uploaded' }).count()) === 1,
  );
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await waitForStatus(page, 'Offline ride', UPLOADED);
  check(
    '  back online, it is sent on its own, once',
    fake.rows.size === 1 && fake.saveRequests === 2,
  );
}

// ------------------------------------ the answer lost after storing
{
  const { page, fake } = await phone();
  fake.next.save = 'lostAnswer';
  await seed(page, [
    savedRide('aaaaaaaa-0000-4000-8000-000000000002', T0, { name: 'Lost answer' }),
  ]);
  await page.reload({ waitUntil: 'load' });
  await waitForStatus(page, 'Lost answer', /No signal/);
  check(
    'an answer lost on the way back reads as not uploaded, though ParaPo has it',
    fake.rows.size === 1 &&
      (await storedUpload(page, 'aaaaaaaa-0000-4000-8000-000000000002')) === 'none',
  );
  await row(page, 'Lost answer')
    .getByRole('button', { name: /^(Try again|Upload again)/ })
    .click();
  await waitForStatus(page, 'Lost answer', UPLOADED);
  check(
    '  Try again answers "already saved": uploaded, and stored once',
    fake.rows.size === 1 && fake.saveRequests === 2,
    `${fake.rows.size} stored`,
  );
}

// ----------------------------------- one send at a time, whatever the taps
{
  const { page, fake } = await phone();
  fake.next.save = 'hold';
  await seed(page, [savedRide('aaaaaaaa-0000-4000-8000-000000000003', T0, { name: 'Held ride' })]);
  await page.reload({ waitUntil: 'load' });
  await waitForStatus(page, 'Held ride', /Uploading/);
  for (let i = 0; i < 3; i += 1) {
    await page.evaluate(() => {
      window.dispatchEvent(new Event('online'));
      document.dispatchEvent(new Event('visibilitychange'));
    });
  }
  await page.waitForTimeout(500);
  check(
    'while an upload is in flight, coming online or to the front sends nothing more, and there is no Try again',
    fake.saveRequests === 1 &&
      (await countOf(page, 'Held ride', /^(Try again|Upload again)/)) === 0 &&
      (await countOf(page, 'Held ride', /^Delete from phone/)) === 0,
    `${fake.saveRequests} sends`,
  );
  fake.release();
  await waitForStatus(page, 'Held ride', UPLOADED);
  check('  released, it is uploaded once', fake.rows.size === 1 && fake.saveRequests === 1);
}

// ------------------------------------------------- refused, and day cap
{
  const { page, fake } = await phone();
  fake.next.save = 'bad_points';
  await seed(page, [
    savedRide('aaaaaaaa-0000-4000-8000-000000000004', T0, { name: 'Refused ride' }),
  ]);
  await page.reload({ waitUntil: 'load' });
  await waitForStatus(page, 'Refused ride', /Refused/);
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await page.waitForTimeout(500);
  check(
    'a refused recording says so, stays on the phone, and is not sent again on its own',
    fake.saveRequests === 1 &&
      (await storedUpload(page, 'aaaaaaaa-0000-4000-8000-000000000004')) === 'none',
    await statusOf(page, 'Refused ride'),
  );
  check(
    '  Try again is offered, and Download still is',
    (await countOf(page, 'Refused ride', /^(Try again|Upload again)/)) === 1 &&
      (await countOf(page, 'Refused ride', /^Download/)) === 1,
  );
  fake.next.save = 'day_cap';
  await row(page, 'Refused ride')
    .getByRole('button', { name: /^(Try again|Upload again)/ })
    .click();
  await waitForStatus(page, 'Refused ride', /20 recordings sent today/);
  check('  the day cap says it tries again later', fake.rows.size === 0);
}

// -------------------------------------- remove the upload, keep the copy
{
  const id = 'aaaaaaaa-0000-4000-8000-000000000005';
  const { page, fake } = await phone();
  await seed(page, [savedRide(id, T0, { name: 'Remove me' })]);
  await page.reload({ waitUntil: 'load' });
  await waitForStatus(page, 'Remove me', UPLOADED);
  await act(page, 'Remove me', /^Remove upload/);
  const question = await row(page, 'Remove me').getByRole('group').innerText();
  check(
    'Remove upload asks first, says the phone keeps its copy, and focuses Keep it',
    question.includes('Remove this recording from ParaPo? The copy on this phone stays.') &&
      (await page.evaluate(() => document.activeElement?.textContent)) === 'Keep it',
  );
  await shot(page, '3-remove-question');
  await row(page, 'Remove me').getByRole('button', { name: 'Keep it' }).click();
  check('  Keep it removes nothing', fake.rows.size === 1 && fake.deleteRequests === 0);
  fake.next.remove = 'removeOffline';
  await act(page, 'Remove me', /^Remove upload/);
  await row(page, 'Remove me').getByRole('button', { name: 'Remove', exact: true }).click();
  await waitForStatus(page, 'Remove me', /Not removed/);
  check('  with no signal it says it was not removed', fake.rows.size === 1);
  await act(page, 'Remove me', /^Remove upload/);
  await row(page, 'Remove me').getByRole('button', { name: 'Remove', exact: true }).click();
  await waitForStatus(page, 'Remove me', /^Only on this phone \|/);
  check(
    '  removed from ParaPo; the phone keeps its copy, marked removed',
    fake.rows.size === 0 && (await storedUpload(page, id)) === 'removed',
  );
  await page.reload({ waitUntil: 'load' });
  await waitForStatus(page, 'Remove me', /^Only on this phone \|/);
  await page.waitForTimeout(500);
  const sendsBefore = fake.saveRequests;
  check('  a reload does not send it again on its own', fake.rows.size === 0 && sendsBefore === 1);
  await row(page, 'Remove me')
    .getByRole('button', { name: /^(Try again|Upload again)/ })
    .click();
  await waitForStatus(page, 'Remove me', UPLOADED);
  check('  Upload again sends it back', fake.rows.size === 1);
}

// ------------------------------------------- delete the phone's copy
{
  const uploaded = 'aaaaaaaa-0000-4000-8000-000000000006';
  const local = 'aaaaaaaa-0000-4000-8000-000000000007';
  const { page, fake } = await phone();
  fake.next.save = 'offline';
  await seed(page, [
    savedRide(uploaded, T0, { name: 'Uploaded one' }),
    savedRide(local, T0 + 3_600_000, { name: 'Local one' }),
  ]);
  await page.reload({ waitUntil: 'load' });
  await waitForStatus(page, 'Uploaded one', /^Uploaded \||No signal/);
  await waitForStatus(page, 'Local one', /^Uploaded \||No signal/);
  // Whichever went first met no signal; that one is the one not uploaded.
  const [upName, localName, upId, localId] = fake.rows.has(uploaded)
    ? ['Uploaded one', 'Local one', uploaded, local]
    : ['Local one', 'Uploaded one', local, uploaded];
  await act(page, upName, /^Delete from phone/);
  check(
    "Delete from phone on an uploaded recording says ParaPo's copy stays",
    (await row(page, upName).getByRole('group').innerText()).includes(
      'Delete this recording from this phone? The copy uploaded to ParaPo stays.',
    ),
  );
  await shot(page, '4-delete-question');
  await row(page, upName).getByRole('button', { name: 'Delete', exact: true }).click();
  await page.waitForFunction(
    (n) => ![...document.querySelectorAll('li')].some((li) => li.textContent.includes(n)),
    upName,
  );
  check(
    '  two recordings waiting at once signed the phone in once',
    fake.signIns === 1,
    `${fake.signIns} sign-ins`,
  );
  check(
    "  the phone's copy is gone; ParaPo's is not",
    (await storedUpload(page, upId)) === 'gone' && fake.rows.has(upId),
  );
  await act(page, localName, /^Delete from phone/);
  const localQuestion = await row(page, localName).getByRole('group').innerText();
  check(
    '  on one never uploaded, it says it will be gone for good',
    localQuestion.includes('It has not been uploaded, so it will be gone for good.') &&
      !fake.rows.has(localId),
    localQuestion,
  );
  await row(page, localName).getByRole('button', { name: 'Delete', exact: true }).click();
  await page.waitForFunction(() => document.querySelectorAll('li').length === 0);
  check('  deleted from the phone', (await storedUpload(page, localId)) === 'gone');
}

// ------------------------------------- an upload an editor has deleted
{
  const id = 'aaaaaaaa-0000-4000-8000-000000000009';
  const { page, fake } = await phone();
  await seed(page, [savedRide(id, T0, { name: 'Editor deleted' })]);
  await page.reload({ waitUntil: 'load' });
  await waitForStatus(page, 'Editor deleted', UPLOADED);
  fake.rows.delete(id);
  await page.reload({ waitUntil: 'load' });
  await waitForStatus(page, 'Editor deleted', /Removed by an editor/);
  await page.waitForTimeout(500);
  check(
    'an upload an editor deleted reads so on reopening, stays on the phone, and is not sent again',
    fake.saveRequests === 1 && (await storedUpload(page, id)) === 'removed',
  );
}

// ---------------------------------- an upload from an earlier identity
{
  const id = 'aaaaaaaa-0000-4000-8000-000000000008';
  const { page } = await phone();
  await seed(page, [
    savedRide(id, T0, {
      name: 'Old identity',
      upload: { state: 'uploaded', at: T0, by: 'ffffffff-0000-4000-8000-000000000000' },
    }),
  ]);
  await page.reload({ waitUntil: 'load' });
  await waitForStatus(page, 'Old identity', UPLOADED);
  check(
    'an upload made by an earlier identity on this phone sits under Uploaded with no Remove upload',
    (await countOf(page, 'Old identity', /^Remove upload/)) === 0,
  );
}

await browser.close();
tally();
