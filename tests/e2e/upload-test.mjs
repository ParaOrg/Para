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

/**
 * A phone with the stand-in GPS and Supabase; `studioSession` is an editor signed in on the same
 * site. `consent` is what the phone has stored: '2' (the current text) unless given, 'yes' (the
 * first text) or null (never asked). `opens` is the screen the page is waited on.
 */
async function phone({ studioSession = false, consent = '2', opens = 'start' } = {}) {
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
  if (consent !== null) {
    await page.addInitScript((stored) => {
      // Only a first load seeds it, so a reload keeps what the page itself stored.
      if (!sessionStorage.getItem('seeded')) {
        localStorage.setItem('parapo.contribute.consent', stored);
        sessionStorage.setItem('seeded', 'yes');
      }
    }, consent);
  }
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
  await SCREENS[opens](page).waitFor({ timeout: 30000 });
  return { page, context, fake, errors };
}

const SCREENS = {
  start: (page) => page.getByRole('button', { name: 'Start recording' }),
  consent: (page) => page.getByRole('heading', { name: 'Before you record' }),
  earlier: (page) => page.getByRole('heading', { name: /earlier recordings? too\?/ }),
};

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
function savedRide(
  id,
  startedAt,
  { count = 30, upload, name = 'Fairview', isEarlier = false } = {},
) {
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
    // A recording made under the current consent text carries its version; an earlier one has none.
    ...(isEarlier ? {} : { consentVersion: 2 }),
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
/** Ready's History, opened if it is closed: the saved recordings show only once it is pressed. */
const openHistory = async (page) => {
  const history = page.getByRole('button', { name: 'History' });
  await history.waitFor({ timeout: 10000 });
  if ((await history.getAttribute('aria-expanded')) !== 'true') await history.click();
};
const waitForStatus = async (page, name, pattern) => {
  await openHistory(page);
  return page.waitForFunction(
    ([n, p]) =>
      [...document.querySelectorAll('li')].some(
        (li) => li.textContent.includes(n) && new RegExp(p).test(li.textContent),
      ),
    [name, pattern.source],
    { timeout: 15000 },
  );
};

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
      stored.recording.start_name === 'SM Fairview' &&
      stored.recording.consent_version === 2,
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
  await waitForStatus(page, 'SM Fairview', /Uploaded to ParaPo/);
  await shot(page, '1-uploaded');
  await page.reload({ waitUntil: 'load' });
  await waitForStatus(page, 'SM Fairview', /Uploaded to ParaPo/);
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
  await waitForStatus(page, 'Offline ride', /no signal/);
  await shot(page, '2-no-signal');
  check(
    'with no signal it says so, keeps the copy and counts it as not uploaded yet',
    fake.rows.size === 0 &&
      (await page.getByRole('heading', { name: /1 not uploaded yet/ }).count()) === 1,
  );
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await waitForStatus(page, 'Offline ride', /Uploaded to ParaPo/);
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
  await waitForStatus(page, 'Lost answer', /no signal/);
  check(
    'an answer lost on the way back reads as not uploaded, though ParaPo has it',
    fake.rows.size === 1 &&
      (await storedUpload(page, 'aaaaaaaa-0000-4000-8000-000000000002')) === 'none',
  );
  await row(page, 'Lost answer')
    .getByRole('button', { name: /^Upload / })
    .click();
  await waitForStatus(page, 'Lost answer', /Uploaded to ParaPo/);
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
      (await row(page, 'Held ride')
        .getByRole('button', { name: /^Upload / })
        .count()) === 0 &&
      (await row(page, 'Held ride')
        .getByRole('button', { name: /from this phone$/ })
        .count()) === 0,
    `${fake.saveRequests} sends`,
  );
  fake.release();
  await waitForStatus(page, 'Held ride', /Uploaded to ParaPo/);
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
  await waitForStatus(page, 'Refused ride', /refused/);
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
    (await row(page, 'Refused ride')
      .getByRole('button', { name: /^Upload / })
      .count()) === 1 &&
      (await row(page, 'Refused ride')
        .getByRole('button', { name: /^Download / })
        .count()) === 1,
  );
  fake.next.save = 'day_cap';
  await row(page, 'Refused ride')
    .getByRole('button', { name: /^Upload / })
    .click();
  await waitForStatus(page, 'Refused ride', /20 recordings today/);
  check('  the day cap says it tries again later', fake.rows.size === 0);
}

// -------------------------------------- remove the upload, keep the copy
{
  const id = 'aaaaaaaa-0000-4000-8000-000000000005';
  const { page, fake } = await phone();
  await seed(page, [savedRide(id, T0, { name: 'Remove me' })]);
  await page.reload({ waitUntil: 'load' });
  await waitForStatus(page, 'Remove me', /Uploaded to ParaPo/);
  await row(page, 'Remove me')
    .getByRole('button', { name: /^Remove the upload/ })
    .click();
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
  await row(page, 'Remove me')
    .getByRole('button', { name: /^Remove the upload/ })
    .click();
  await row(page, 'Remove me').getByRole('button', { name: 'Remove' }).click();
  await waitForStatus(page, 'Remove me', /Not removed/);
  check('  with no signal it says it was not removed', fake.rows.size === 1);
  await row(page, 'Remove me')
    .getByRole('button', { name: /^Remove the upload/ })
    .click();
  await row(page, 'Remove me').getByRole('button', { name: 'Remove' }).click();
  await waitForStatus(page, 'Remove me', /Upload removed/);
  check(
    '  removed from ParaPo; the phone keeps its copy, marked removed',
    fake.rows.size === 0 && (await storedUpload(page, id)) === 'removed',
  );
  await page.reload({ waitUntil: 'load' });
  await waitForStatus(page, 'Remove me', /Upload removed/);
  await page.waitForTimeout(500);
  const sendsBefore = fake.saveRequests;
  check('  a reload does not send it again on its own', fake.rows.size === 0 && sendsBefore === 1);
  await row(page, 'Remove me')
    .getByRole('button', { name: /^Upload / })
    .click();
  await waitForStatus(page, 'Remove me', /Uploaded to ParaPo/);
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
  await waitForStatus(page, 'Uploaded one', /Uploaded to ParaPo|no signal/);
  await waitForStatus(page, 'Local one', /Uploaded to ParaPo|no signal/);
  // Whichever went first met no signal; that one is the one not uploaded.
  const [upName, localName, upId, localId] = fake.rows.has(uploaded)
    ? ['Uploaded one', 'Local one', uploaded, local]
    : ['Local one', 'Uploaded one', local, uploaded];
  await row(page, upName)
    .getByRole('button', { name: /from this phone$/ })
    .click();
  check(
    "Delete from phone on an uploaded recording says ParaPo's copy stays",
    (await row(page, upName).getByRole('group').innerText()).includes(
      'Delete this recording from this phone? The copy uploaded to ParaPo stays.',
    ),
  );
  await shot(page, '4-delete-question');
  await row(page, upName).getByRole('button', { name: 'Delete' }).click();
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
  await row(page, localName)
    .getByRole('button', { name: /from this phone$/ })
    .click();
  const localQuestion = await row(page, localName).getByRole('group').innerText();
  check(
    '  on one never uploaded, it says it will be gone for good',
    localQuestion.includes('It has not been uploaded, so it will be gone for good.') &&
      !fake.rows.has(localId),
    localQuestion,
  );
  await row(page, localName).getByRole('button', { name: 'Delete' }).click();
  await page.waitForFunction(() => document.querySelectorAll('li').length === 0);
  check('  deleted from the phone', (await storedUpload(page, localId)) === 'gone');
}

// ------------------------------------- an upload an editor has deleted
{
  const id = 'aaaaaaaa-0000-4000-8000-000000000009';
  const { page, fake } = await phone();
  await seed(page, [savedRide(id, T0, { name: 'Editor deleted' })]);
  await page.reload({ waitUntil: 'load' });
  await waitForStatus(page, 'Editor deleted', /Uploaded to ParaPo/);
  fake.rows.delete(id);
  await page.reload({ waitUntil: 'load' });
  await waitForStatus(page, 'Editor deleted', /Removed from ParaPo by an editor/);
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
  await waitForStatus(page, 'Old identity', /earlier sign-in/);
  check(
    'an upload made by an earlier identity on this phone offers no Remove upload, and says why',
    (await row(page, 'Old identity')
      .getByRole('button', { name: /^Remove the upload/ })
      .count()) === 0,
  );
}

// ------------------------------------------ no consent, nothing is sent
{
  const { page, fake } = await phone({ consent: null, opens: 'consent' });
  const id = 'aaaaaaaa-0000-4000-8000-000000000011';
  await seed(page, [savedRide(id, T0, { name: 'No consent' })]);
  await page.reload({ waitUntil: 'load' });
  await SCREENS.consent(page).waitFor();
  await page.waitForTimeout(2000);
  check(
    'with no consent, a saved recording is not sent and the consent screen shows',
    fake.saveRequests === 0 && (await storedUpload(page, id)) === 'none',
    `${fake.saveRequests} sends`,
  );
  await page.getByRole('button', { name: 'Okay, I understand' }).click();
  await page.getByRole('button', { name: 'Start recording' }).waitFor();
  await waitForStatus(page, 'No consent', /Uploaded to ParaPo/);
  check(
    '  agreeing to the current text sends it, with the text' + "'" + 's version',
    fake.rows.size === 1 && [...fake.rows.values()][0].recording.consent_version === 2,
  );
  check(
    '  the phone remembers the version agreed to',
    (await page.evaluate(() => localStorage.getItem('parapo.contribute.consent'))) === '2',
  );
}

// -------------------- version-1 consent is not consent to the new text
{
  const { page, fake } = await phone({ consent: 'yes', opens: 'consent' });
  const earlier = 'aaaaaaaa-0000-4000-8000-000000000012';
  const stamped = 'aaaaaaaa-0000-4000-8000-000000000013';
  await seed(page, [
    savedRide(earlier, T0, { name: 'Under one', isEarlier: true }),
    savedRide(stamped, T0 + 600_000, { name: 'Stamped' }),
  ]);
  await page.reload({ waitUntil: 'load' });
  await SCREENS.consent(page).waitFor();
  await page.waitForTimeout(2000);
  check(
    'with version-1 consent, the new text shows, with no Start and nothing sent',
    (await page.getByRole('button', { name: 'Start recording' }).count()) === 0 &&
      fake.saveRequests === 0 &&
      (await storedUpload(page, earlier)) === 'none' &&
      (await storedUpload(page, stamped)) === 'none',
    `${fake.saveRequests} sends`,
  );
  check(
    '  the new text names machine learning and who is responsible',
    (await page.getByText(/machine learning/).count()) === 1 &&
      (await page.getByText('[owner contact]').count()) === 1,
  );
  await page.getByRole('button', { name: 'Okay, I understand' }).click();
  await SCREENS.earlier(page).waitFor();
  await page.waitForTimeout(1500);
  check(
    '  after agreeing, only the recording made under the current text goes; the earlier one is asked about',
    fake.rows.size === 1 &&
      fake.rows.has(stamped) &&
      (await storedUpload(page, earlier)) === 'none' &&
      (await page.getByRole('button', { name: 'Start recording' }).count()) === 0,
    [...fake.rows.keys()].join(),
  );
}

// ------------------------ earlier recordings: asked about, Keep on phone
{
  const a = 'aaaaaaaa-0000-4000-8000-000000000014';
  const b = 'aaaaaaaa-0000-4000-8000-000000000015';
  const { page, fake } = await phone();
  await seed(page, [
    savedRide(a, T0, { name: 'Earlier one', isEarlier: true }),
    savedRide(b, T0 + 600_000, { name: 'Earlier two', isEarlier: true }),
  ]);
  await page.reload({ waitUntil: 'load' });
  await SCREENS.earlier(page).waitFor();
  await page.waitForTimeout(1500);
  await shot(page, 'earlier-question');
  check(
    'earlier recordings are asked about once, by number, and nothing is sent meanwhile',
    (await page.getByRole('heading', { name: 'Send your 2 earlier recordings too?' }).count()) ===
      1 &&
      (await page.getByRole('button', { name: 'Send', exact: true }).count()) === 1 &&
      (await page.getByRole('button', { name: 'Keep on phone' }).count()) === 1 &&
      fake.saveRequests === 0,
  );
  await page.getByRole('button', { name: 'Keep on phone' }).click();
  await page.getByRole('button', { name: 'Start recording' }).waitFor();
  await openHistory(page);
  await page.waitForTimeout(1500);
  check(
    '  Keep on phone sends nothing, and History says so',
    fake.saveRequests === 0 &&
      (await storedUpload(page, a)) === 'none' &&
      /Not uploaded/.test(await statusOf(page, 'Earlier one')),
  );
  await page.reload({ waitUntil: 'load' });
  await page.getByRole('button', { name: 'Start recording' }).waitFor();
  await page.waitForTimeout(1000);
  check(
    '  after a reload it is not asked again and still not sent',
    (await SCREENS.earlier(page).count()) === 0 && fake.saveRequests === 0,
  );
  await openHistory(page);
  await row(page, 'Earlier one')
    .getByRole('button', { name: /^Upload / })
    .click();
  await waitForStatus(page, 'Earlier one', /Uploaded to ParaPo/);
  check(
    '  it can still be sent from History, one at a time',
    fake.rows.size === 1 &&
      fake.rows.has(a) &&
      /Not uploaded/.test(await statusOf(page, 'Earlier two')),
  );
}

// ------------------------------- earlier recordings: Send goes through
{
  const a = 'aaaaaaaa-0000-4000-8000-000000000016';
  const b = 'aaaaaaaa-0000-4000-8000-000000000017';
  const { page, fake } = await phone();
  await seed(page, [
    savedRide(a, T0, { name: 'Sent one', isEarlier: true }),
    savedRide(b, T0 + 600_000, { name: 'Sent two', isEarlier: true }),
  ]);
  await page.reload({ waitUntil: 'load' });
  await SCREENS.earlier(page).waitFor();
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await page.getByRole('button', { name: 'Start recording' }).waitFor();
  await waitForStatus(page, 'Sent two', /Uploaded to ParaPo/);
  await waitForStatus(page, 'Sent one', /Uploaded to ParaPo/);
  check(
    'Send uploads the earlier recordings, each with the current text' + "'" + 's version',
    fake.rows.size === 2 && [...fake.rows.values()].every((r) => r.recording.consent_version === 2),
  );
  await page.reload({ waitUntil: 'load' });
  await page.getByRole('button', { name: 'Start recording' }).waitFor();
  check('  and it is not asked again', (await SCREENS.earlier(page).count()) === 0);
}

await browser.close();
tally();
