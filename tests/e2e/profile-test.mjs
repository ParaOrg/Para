// The contributor page's Account and History, driven by a phone signed in to an account: Account,
// opened from the Account tab on Ready, shows the name, the email and the Commute Statistics
// (get_my_stats), with Account settings inside it, and History is a tab of its own; Account settings changes the name
// and number through set_profile, and Logout asks first and signs this phone out only. History lists
// the account's uploads from the database, whichever phone sent them, merged with this phone's
// own, and Remove works on any the account owns. Supabase is the in-memory stand-in
// (lib/fake-contributions.mjs): every request to *.supabase.co lands there, and one it does not
// know fails the run, so nothing reaches a real project.
//
//   cp .env.production .env.local && echo VITE_CONTRIBUTIONS=1 >> .env.local
//                                        (a project URL to stand in for, and uploads on)
//   npm run dev                          (in another terminal)
//   node tests/e2e/profile-test.mjs
//
// PARA_SHOTS=dir keeps screenshots of the screens at 393×852.
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

import { fakeContributions, session } from './lib/fake-contributions.mjs';
import { fakeTurnstile } from './lib/fake-turnstile.mjs';
import { BASE, bareStyle, harness, nodeFetch } from './lib/harness.mjs';

const { check, tally } = harness();
const SHOTS = process.env.PARA_SHOTS;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const shot = (page, name) => (SHOTS ? page.screenshot({ path: `${SHOTS}/${name}.png` }) : null);

const T0 = Date.UTC(2026, 9, 19, 0, 0, 0);
const ACCOUNT_ID = 'cccccccc-0000-4000-8000-000000000001';
const ACCOUNT = {
  email: 'tester@example.com',
  password: 'hunter2hunter2',
  isAccount: true,
  profile: { name: 'Tester', phone: '+639171234567' },
};
const AUTH_KEY = 'para.contributor-auth';
const browser = await chromium.launch();

/** The database both phones share: the account, and the uploads each of its phones sent. */
const database = { users: new Map([[ACCOUNT_ID, { ...ACCOUNT }]]), rows: new Map() };

/** A recording the account uploaded from some phone, as the database holds it. */
function uploadedRow(id, hoursIn, startName) {
  const start = T0 + hoursIn * 3_600_000;
  database.rows.set(id, {
    by: ACCOUNT_ID,
    recording: {
      id,
      started_at: new Date(start).toISOString(),
      ended_at: new Date(start + 600_000).toISOString(),
      start_name: startName,
      end_name: 'Cubao',
      description: '',
      vehicle: 'jeep',
      distance_m: 4_200,
      walk_m: 300,
      ride_m: 3_900,
    },
  });
}

const EDITOR_ID = 'eeeeeeee-0000-4000-8000-0000000000ee';
database.users.set(EDITOR_ID, {
  email: 'editor@example.com',
  password: 'hunter2hunter2',
  isAccount: true,
  isEditor: true,
  profile: { name: 'Editor', phone: '+639170000000' },
});

/**
 * A phone signed in to the account, on the shared database; `signedIn: false` has no session,
 * and `userId` signs in as another user (the editor).
 */
async function phone({ signedIn = true, userId = ACCOUNT_ID } = {}) {
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
  fake.users = database.users;
  fake.rows = database.rows;
  await fakeTurnstile(page);
  await page.addInitScript(
    ([key, stored]) => {
      if (stored && !localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(stored));
    },
    [
      AUTH_KEY,
      signedIn
        ? session(userId, { email: database.users.get(userId).email, isAccount: true })
        : null,
    ],
  );
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`${BASE}/contribute/`, { waitUntil: 'load' });
  return { page, fake, errors };
}

const button = (page, name) => page.getByRole('button', { name, exact: true });
/** Ready's Account tab, in the toolbar under Start tracking: the way into Account. */
const accountTab = (page) =>
  page.getByRole('navigation', { name: 'Screens' }).getByRole('button', { name: 'Account' });
/** The History tab, on Ready or on Account. */
const historyTab = (page) =>
  page.getByRole('navigation', { name: 'Screens' }).getByRole('button', { name: 'History' });
/** History, from Ready's History tab. */
const openHistory = async (page) => {
  await historyTab(page).click();
};
/** The tab focus is on, if focus is on one. */
const focusedTab = (page) =>
  page.evaluate(() =>
    document.activeElement?.closest('nav[aria-label="Screens"]')
      ? document.activeElement.textContent
      : null,
  );
const field = (page, name) => page.getByLabel(name, { exact: true });
/** Account's toolbar: Record, back to Start. */
const toolbarRecord = (page) =>
  page.getByRole('navigation', { name: 'Screens' }).getByRole('button', { name: 'Record' });
/** Account's Logout question (4521:3500). */
const logoutQuestion = (page) =>
  page.getByRole('alertdialog', { name: 'Are you sure you want to logout?' });
/** Account's Logout, then the question's Logout. */
const logout = async (page) => {
  await button(page, 'Logout').click();
  await logoutQuestion(page).getByRole('button', { name: 'Logout' }).click();
};
const start = (page) => page.getByRole('button', { name: 'Start Tracking' });
/** The Sakay or Lakad row of the Commute Statistics' legend. */
const legendRow = (stats, word) => stats.getByRole('listitem').filter({ hasText: word });
const row = (page, name) => page.getByRole('listitem').filter({ hasText: name });
/** A card opened: its ride's screen, with the sheet folded. */
const openRide = async (page, name) => {
  await row(page, name).locator('[data-ride-card]').click();
  await page.getByTestId('dock-handle').waitFor();
};
/** The ride's sheet raised, its Delete this record asked, and confirmed: back on History. */
const deleteRecord = async (page) => {
  await page.getByTestId('dock-handle').click();
  await page.getByRole('button', { name: 'Delete this record' }).click();
  await page
    .getByRole('alertdialog', { name: 'You want to remove this recording?' })
    .getByRole('button', { name: 'Delete this record' })
    .click();
  await page.getByRole('heading', { level: 1, name: 'History' }).waitFor();
};
/** A card's status line, the one under its date: Uploaded, Only on this phone, … */
// Its text, not its rendered text: a card off screen is not drawn (content-visibility), and its
// words are there all the same, as a screen reader finds them.
const statusOf = async (page, name) =>
  ((await row(page, name).locator('[aria-live]').textContent()) ?? '').trim();

/** A saved recording of this phone, put straight into its database as an earlier visit would. */
/** How many recordings this phone keeps, read from IndexedDB as History reads them. */
const recordingsOnPhone = (page) =>
  page.evaluate(
    () =>
      new Promise((resolve) => {
        const open = indexedDB.open('para-contribute');
        open.onsuccess = () => {
          const get = open.result.transaction('recordings').objectStore('recordings').getAll();
          get.onsuccess = () => {
            open.result.close();
            resolve(get.result.length);
          };
        };
      }),
  );

async function seed(page, id, name, upload) {
  const recording = {
    version: 1,
    id,
    status: 'saved',
    startedAt: T0,
    stoppedAt: T0 + 30_000,
    savedAt: T0 + 35_000,
    gaps: [],
    startPointName: name,
    endPointName: 'Cubao',
    description: '',
    rideKind: 'Jeep',
    consentVersion: 3,
    ...(upload ? { upload } : {}),
  };
  await page.evaluate(
    (stored) =>
      new Promise((resolve, reject) => {
        const open = indexedDB.open('para-contribute');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const tx = open.result.transaction(['recordings'], 'readwrite');
          tx.objectStore('recordings').put(stored);
          tx.oncomplete = () => {
            open.result.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    recording,
  );
}

// ------------------------------------------------ Account: the tab is the way in
{
  const { page, fake, errors } = await phone();
  await start(page).waitFor({ timeout: 30000 });
  const tab = await accountTab(page).boundingBox();
  check(
    'Ready has the History and Account tabs over Start, and no Account or History button elsewhere',
    !!tab &&
      (await page.getByRole('button', { name: 'Account' }).count()) === 1 &&
      (await button(page, 'History').count()) === 1 &&
      (await historyTab(page).count()) === 1,
    JSON.stringify({ tab }),
  );
  await shot(page, '1-ready');

  await accountTab(page).click();
  await page.getByRole('heading', { level: 1, name: 'Account' }).waitFor();
  await toolbarRecord(page).click();
  await start(page).waitFor();
  check(
    "Account's Record tab returns to Ready with focus on the Account tab",
    await page.evaluate(
      () =>
        document.activeElement?.textContent === 'Account' &&
        !!document.activeElement.closest('nav[aria-label="Screens"]'),
    ),
  );

  await openHistory(page);
  await page.getByRole('heading', { level: 1, name: 'History' }).waitFor();
  check(
    'History is a tab like Account: no Back, the toolbar with History marked, Record and Account beside it',
    (await button(page, 'Back').count()) === 0 &&
      (await page
        .getByRole('navigation', { name: 'Screens' })
        .locator('[aria-current="page"]')
        .textContent()) === 'History' &&
      (await toolbarRecord(page).count()) === 1 &&
      (await accountTab(page).count()) === 1,
  );
  await toolbarRecord(page).click();
  await start(page).waitFor();
  await page
    .waitForFunction(() => document.activeElement?.textContent === 'History', null, {
      timeout: 5000,
    })
    .catch(() => {});
  check(
    "Ready's History tab opens History; its Record tab returns to Ready, focus on the History tab",
    (await page.evaluate(() => location.hash)) === '' && (await focusedTab(page)) === 'History',
  );

  const isOnAccount = async () =>
    (await page.getByRole('heading', { level: 1, name: 'Account' }).count()) === 1 &&
    (await page.evaluate(() => location.hash)) === '#profile';
  await accountTab(page).click();
  await page.getByRole('heading', { level: 1, name: 'Account' }).waitFor();
  await historyTab(page).click();
  await page.getByRole('heading', { level: 1, name: 'History' }).waitFor();
  await accountTab(page).click();
  await page.getByRole('heading', { level: 1, name: 'Account' }).waitFor();
  check(
    "  Account's History tab opens History; History's Account tab returns to Account",
    await isOnAccount(),
  );
  await historyTab(page).click();
  await page.getByRole('heading', { level: 1, name: 'History' }).waitFor();
  await page.reload({ waitUntil: 'load' });
  await page.getByRole('heading', { level: 1, name: 'History' }).waitFor({ timeout: 30000 });
  await toolbarRecord(page).click();
  await start(page).waitFor();
  check(
    '  after a reload on #history, Record returns to Ready',
    (await page.evaluate(() => location.hash)) === '',
  );
  await openHistory(page);
  await page.getByText('No recordings yet.').waitFor({ timeout: 15000 });
  await button(page, 'Record a route').click();
  await start(page).waitFor();
  check(
    "  an empty History's Record a route goes to Start",
    (await page.evaluate(() => location.hash)) === '' &&
      (await page.getByRole('heading', { level: 1, name: 'History' }).count()) === 0,
  );

  await accountTab(page).click();
  await page.getByRole('heading', { level: 1, name: 'Account' }).waitFor();
  await button(page, 'Account settings').click();
  await page.getByRole('heading', { level: 1, name: 'Account settings' }).waitFor();
  await field(page, 'Name').waitFor();
  check(
    'Account settings (Figma 4540:4821): the name, the number after +63, the email as it is, Password a button',
    (await field(page, 'Email').inputValue()) === ACCOUNT.email &&
      (await field(page, 'Email').isDisabled()) &&
      (await page.locator('input').count()) === 3 &&
      (await page.evaluate(() => location.hash)) === '#account-settings' &&
      (await field(page, 'Name').inputValue()) === 'Tester' &&
      (await field(page, 'Phone number').inputValue()) === '9171234567' &&
      (await button(page, 'Change password').count()) === 1 &&
      (await button(page, 'Delete account').count()) === 1,
  );
  check(
    '  its heading has focus, and no Save changes until something changes',
    (await page.evaluate(() => document.activeElement?.textContent)) === 'Account settings' &&
      (await button(page, 'Save changes').count()) === 0,
  );
  await shot(page, '2-account');

  await field(page, 'Name').fill('Someone Else');
  const isSheetUp =
    (await button(page, 'Save changes').isVisible()) && (await button(page, 'Cancel').isVisible());
  await button(page, 'Cancel').click();
  check(
    '  a change raises Save changes and Cancel; Cancel puts back what is stored and lowers them',
    isSheetUp &&
      (await field(page, 'Name').inputValue()) === 'Tester' &&
      (await button(page, 'Save changes').count()) === 0 &&
      fake.profileRequests === 0,
  );

  // Typed the same as what is stored, in other words: nothing to save.
  await field(page, 'Name').fill('Tester  ');
  await field(page, 'Phone number').fill('0917 123 4567');
  check(
    '  an edit that changes nothing (spaces, 0917… for the stored +63917…) raises no sheet',
    (await button(page, 'Save changes').count()) === 0,
  );
  await field(page, 'Name').fill('Tester');
  await field(page, 'Phone number').fill('9171234567');

  // A change not saved yet: kept under Change password, dropped by Back.
  await field(page, 'Name').fill('Half Typed');
  await button(page, 'Change password').click();
  await page.getByRole('heading', { level: 1, name: 'Change password' }).waitFor();
  await button(page, 'Back').click();
  await page.getByRole('heading', { level: 1, name: 'Account settings' }).waitFor();
  check(
    '  a change not saved yet is still there back from Change password, its sheet up',
    (await field(page, 'Name').inputValue()) === 'Half Typed' &&
      (await button(page, 'Save changes').isVisible()),
  );
  await button(page, 'Back').click();
  await page.getByRole('heading', { level: 1, name: 'Account' }).waitFor();
  await button(page, 'Account settings').click();
  await field(page, 'Name').waitFor();
  check(
    '  and Back drops it, quietly: Account settings opens again on what is stored',
    (await field(page, 'Name').inputValue()) === 'Tester' &&
      (await button(page, 'Save changes').count()) === 0 &&
      fake.profileRequests === 0,
  );

  await field(page, 'Phone number').fill('12345');
  await button(page, 'Save changes').click();
  await page.getByText('Enter a mobile number like 917 123 4567').waitFor();
  check('  a bad number is named and nothing is sent', fake.profileRequests === 0);

  await field(page, 'Name').fill('Tester Two');
  await field(page, 'Phone number').fill('918 765 4321');
  fake.next.profile = 'offline';
  await button(page, 'Save changes').click();
  await page.getByRole('alert').waitFor();
  check(
    '  with no signal Save changes says so in one line and keeps what was typed',
    (await page.getByRole('alert').innerText()).startsWith('No signal') &&
      (await field(page, 'Name').inputValue()) === 'Tester Two' &&
      (await button(page, 'Save changes').isEnabled()),
  );

  await button(page, 'Save changes').click();
  await button(page, 'Save changes').waitFor({ state: 'detached' });
  const stored = database.users.get(ACCOUNT_ID).profile;
  check(
    '  saving stores the number as +639XXXXXXXXX, and the sheet goes down',
    stored.name === 'Tester Two' &&
      stored.phone === '+639187654321' &&
      (await field(page, 'Name').inputValue()) === 'Tester Two',
    JSON.stringify(stored),
  );
  await page.reload({ waitUntil: 'load' });
  await field(page, 'Name').waitFor({ timeout: 15000 });
  check(
    '  a reload stays on Account settings, with the saved values',
    (await field(page, 'Name').inputValue()) === 'Tester Two' &&
      (await field(page, 'Phone number').inputValue()) === '9187654321',
  );

  // Password opens Change password, a screen of its own inside Account settings.
  await button(page, 'Change password').click();
  await page.getByRole('heading', { level: 1, name: 'Change password' }).waitFor();
  check(
    '  Password opens Change password, at #change-password, its heading focused, no Save changes yet',
    (await page.evaluate(() => location.hash)) === '#change-password' &&
      (await page.evaluate(() => document.activeElement?.textContent)) === 'Change password' &&
      (await button(page, 'Save changes').count()) === 0,
  );
  await field(page, 'Old password').fill('x');
  await button(page, 'Cancel').click();
  await page.getByRole('heading', { level: 1, name: 'Account settings' }).waitFor();
  check(
    '  its Cancel goes back to Account settings',
    (await page.evaluate(() => location.hash)) === '#account-settings',
  );

  await button(page, 'Change password').click();
  await button(page, 'Forgot password?').click();
  await page.getByRole('heading', { level: 1, name: 'Forgot password' }).waitFor();
  check(
    '  Forgot password? starts the reset by email for the account’s own address, which cannot be changed',
    // By role: Account settings' own Email is still on the page, hidden under it.
    (await page.getByRole('textbox', { name: 'Email', exact: true }).inputValue()) ===
      ACCOUNT.email &&
      (await page.getByRole('textbox', { name: 'Email', exact: true }).isDisabled()),
  );
  await button(page, 'Back').click();
  await page.getByRole('heading', { level: 1, name: 'Change password' }).waitFor();

  // Change password asks for the old one: a phone left unlocked cannot change it.
  await field(page, 'Old password').fill(ACCOUNT.password);
  await field(page, 'New password').fill('n3wpassword');
  await field(page, 'Confirm password').fill('n3wpassword-not');
  await button(page, 'Save changes').click();
  await page.getByText("The passwords don't match").waitFor();
  check(
    "  the new password typed twice differently: The passwords don't match, and nothing is sent",
    !fake.order.includes('update_password'),
  );
  await field(page, 'Old password').fill('not-it-123');
  await field(page, 'Confirm password').fill('n3wpassword');
  await button(page, 'Save changes').click();
  await page.getByText('That’s not your current password').waitFor();
  check(
    '  a wrong old password is said on its field, and nothing changes',
    database.users.get(ACCOUNT_ID).password === ACCOUNT.password &&
      !fake.order.includes('update_password'),
  );
  await field(page, 'Old password').fill(ACCOUNT.password);
  await button(page, 'Save changes').click();
  await page.getByText('Your password is changed.').waitFor();
  check(
    '  the right old password changes it, checked first by signing in with it, and it is back on Account settings',
    database.users.get(ACCOUNT_ID).password === 'n3wpassword' &&
      fake.order.includes('update_password') &&
      (await page.evaluate(() => location.hash)) === '#account-settings',
  );
  check(
    '  its heading, focused, says the password is changed',
    (await page
      .getByRole('heading', { level: 1, name: 'Account settings' })
      .evaluate(
        (heading) =>
          document.activeElement === heading &&
          document.getElementById(heading.getAttribute('aria-describedby') ?? '')?.textContent,
      )) === 'Your password is changed.',
  );

  // The reset by email, from Change password, to its end: back on Account settings, which says so.
  await button(page, 'Change password').click();
  await button(page, 'Forgot password?').click();
  await page.getByRole('heading', { level: 1, name: 'Forgot password' }).waitFor();
  await page.waitForFunction(
    () =>
      ![...document.querySelectorAll('button')].find((b) => b.textContent === 'Verify')?.disabled,
  );
  await button(page, 'Verify').click();
  await page.getByRole('heading', { level: 1, name: 'Enter the code' }).waitFor();
  await field(page, 'Verification code').fill(fake.codes.get(ACCOUNT.email));
  await field(page, 'New password').fill('r3setpassword');
  await field(page, 'Confirm password').fill('r3setpassword');
  await button(page, 'Save').click();
  await page.getByRole('heading', { level: 1, name: 'Account settings' }).waitFor();
  check(
    '  a reset finished from Change password comes back to Account settings, which says so',
    database.users.get(ACCOUNT_ID).password === 'r3setpassword' &&
      (await page.evaluate(() => location.hash)) === '#account-settings' &&
      (await page.getByText('Your password is changed.').count()) === 1,
  );
  database.users.get(ACCOUNT_ID).password = ACCOUNT.password;

  check('  no request the stand-in does not know', fake.unknown.length === 0, fake.unknown.join());
  check('  no page errors', errors.length === 0, errors.join(' | '));
  database.users.get(ACCOUNT_ID).profile = { ...ACCOUNT.profile };
}

// ------------------------- motion between the tabs: the way the tabs run, and never in the way
{
  const { page, errors } = await phone();
  await start(page).waitFor({ timeout: 30000 });
  const heading = (name) => page.getByRole('heading', { level: 1, name });
  // Each screen's code fetched once, so the moves below are the moves a phone makes after its first.
  await historyTab(page).click();
  await heading('History').waitFor();
  await accountTab(page).click();
  await heading('Account').waitFor();
  await toolbarRecord(page).click();
  await start(page).waitFor();
  await page.waitForTimeout(600);

  /** What is moving 60 ms into a move: the view transition's parts and the toolbar's pill. */
  const midMove = async (tap) => {
    await tap.click();
    await page.waitForTimeout(60);
    return page.evaluate(() => ({
      direction: document.documentElement.dataset.tabMotion ?? null,
      parts: document
        .getAnimations()
        .map((a) => a.effect?.pseudoElement)
        .filter(Boolean),
      pill: document
        .getAnimations()
        .some(
          (a) =>
            a.effect?.target?.getAttribute?.('aria-hidden') === 'true' &&
            a.effect.target.parentElement?.classList.contains('tab-toolbar'),
        ),
    }));
  };
  const toHistory = await midMove(historyTab(page));
  check(
    'Record to History: History slides in from the right over the map, and the pill slides to its tab',
    toHistory.direction === 'forward' &&
      toHistory.parts.includes('::view-transition-new(tab-screen)') &&
      !toHistory.parts.includes('::view-transition-old(tab-screen)') &&
      toHistory.pill,
    JSON.stringify(toHistory),
  );
  check(
    '  focus is on its heading at once, not after the move',
    (await page.evaluate(() => document.activeElement?.textContent)) === 'History',
  );
  await page.waitForTimeout(400);
  const toAccount = await midMove(accountTab(page));
  check(
    '  History to Account: Account comes in from the right as History goes out to the left',
    toAccount.direction === 'forward' &&
      toAccount.parts.includes('::view-transition-new(tab-screen)') &&
      toAccount.parts.includes('::view-transition-old(tab-screen)'),
    JSON.stringify(toAccount),
  );
  await page.waitForTimeout(400);
  const toSettings = await midMove(button(page, 'Account settings'));
  check(
    '  Account settings pushes in from the right, inside Account',
    toSettings.direction === 'forward' &&
      toSettings.parts.includes('::view-transition-new(tab-screen)'),
    JSON.stringify(toSettings),
  );
  check(
    '  the toolbar, which Account settings has none of, fades out with Account rather than snapping off',
    toSettings.parts.includes('::view-transition-old(tab-toolbar)') &&
      !toSettings.parts.includes('::view-transition-new(tab-toolbar)'),
    JSON.stringify(toSettings),
  );
  await page.waitForTimeout(400);
  const back = await midMove(button(page, 'Back'));
  check('  and its Back goes the other way', back.direction === 'back', JSON.stringify(back));
  await heading('Account').waitFor();
  await page.waitForTimeout(400);
  const toRecord = await midMove(toolbarRecord(page));
  check(
    '  Account to Record goes left: Account slides away to the right, off the map',
    toRecord.direction === 'back' &&
      toRecord.parts.includes('::view-transition-old(tab-screen)') &&
      !toRecord.parts.includes('::view-transition-new(tab-screen)'),
    JSON.stringify(toRecord),
  );
  await start(page).waitFor();
  await page.waitForTimeout(400);

  // Every value is the owner's Motion token, read by the script's fallbacks from the same place.
  const timing = await page.evaluate(async () => {
    const { motionOf } = await import('/src/shared/utils/motion.ts');
    const { ARRIVE, MOVE, PILL } = await import('/src/features/contribute/motion/motion.ts');
    const { tabShift } = await import('/src/features/contribute/motion/tab-motion.ts');
    return {
      arrive: motionOf(ARRIVE),
      move: motionOf(MOVE),
      pill: motionOf(PILL),
      shift: tabShift(1),
    };
  });
  check(
    "the moves' timings are the owner's Motion tokens: base on ease-enter, gentle on ease-move, the pill's own spring, a 7-step shift",
    timing.arrive.duration === 200 &&
      timing.arrive.easing === 'cubic-bezier(0.22, 1, 0.36, 1)' &&
      timing.move.duration === 300 &&
      timing.move.easing === 'cubic-bezier(0.65, 0, 0.35, 1)' &&
      timing.pill.duration === 390 &&
      timing.pill.easing.startsWith('cubic-bezier(') &&
      /calc\(1 \* calc\(.*\* 7\)\)/.test(timing.shift),
    JSON.stringify(timing),
  );

  // A move to where the phone already is (a second tap) shows nothing: no slide replayed.
  const noMove = await page.evaluate(() =>
    import('/src/features/contribute/motion/tab-motion.ts').then((motion) => {
      motion.moveBetweenScreens(
        () => false,
        () => {},
      );
      return {
        direction: document.documentElement.dataset.tabMotion ?? null,
        moving: document.getAnimations().filter((a) => a.effect?.pseudoElement).length,
      };
    }),
  );
  check(
    '  a move to the screen already showing shows nothing, and leaves no slide set',
    noMove.direction === null && noMove.moving === 0,
    JSON.stringify(noMove),
  );

  // Three taps faster than a move: each lands, and the last one is where the phone ends up.
  await historyTab(page).click();
  await page.waitForTimeout(40);
  await accountTab(page).click();
  await page.waitForTimeout(40);
  await historyTab(page).click();
  await page.waitForTimeout(600);
  check(
    'taps faster than the moves land where the last one points: History, nothing else on top',
    (await page.evaluate(() => location.hash)) === '#history' &&
      (await heading('History').count()) === 1 &&
      (await heading('Account').count()) === 0 &&
      (await page.evaluate(
        () => document.getAnimations().filter((a) => a.effect?.pseudoElement).length,
      )) === 0,
  );

  // Less motion asked for: the screens and the pill just switch.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await accountTab(page).click();
  await page.waitForTimeout(40);
  const reduced = await page.evaluate(() =>
    document
      .getAnimations()
      .filter(
        (a) => a.effect?.pseudoElement || a.effect?.target?.closest?.('.tab-toolbar, .tab-screen'),
      )
      .map((a) => a.effect?.pseudoElement || a.effect?.target?.tagName),
  );
  await heading('Account').waitFor();
  check(
    'with less motion asked for, nothing slides or fades: Account just shows',
    reduced.length === 0,
    JSON.stringify(reduced),
  );
  check('  no page errors', errors.length === 0, errors.join(' | '));
  await page.context().close();
}

// ------------------------------------------- the toolbar stays in sight through every move
// The DOM can't see this: the toolbar element is there, but a screen's snapshot can paint over
// it. So the move is held halfway and the toolbar's pixels are looked at: its labels' and icons'
// ink must be there as it is before and after.
{
  const { page, errors } = await phone();
  await start(page).waitFor({ timeout: 30000 });
  const heading = (name) => page.getByRole('heading', { level: 1, name });
  // Each screen's code fetched once, so the moves below are a phone's after its first.
  await historyTab(page).click();
  await heading('History').waitFor();
  await accountTab(page).click();
  await heading('Account').waitFor();
  await toolbarRecord(page).click();
  await start(page).waitFor();

  // Whether the page has a view transition's parts moving (tab-motion.ts).
  const movesOver = () =>
    page.waitForFunction(
      () =>
        !document
          .getAnimations()
          .some((animation) => animation.effect?.pseudoElement?.startsWith('::view-transition')),
    );
  const box = await page.locator('.tab-toolbar').boundingBox();
  /** The toolbar's ink: its pixels darker than mid-grey, as the page shows them now. */
  const toolbarInk = async () => {
    const png = await page.screenshot({ clip: box });
    return page.evaluate(async (base64) => {
      const image = await createImageBitmap(
        await (await fetch(`data:image/png;base64,${base64}`)).blob(),
      );
      const canvas = new OffscreenCanvas(image.width, image.height);
      const context = canvas.getContext('2d');
      context.drawImage(image, 0, 0);
      const { data } = context.getImageData(0, 0, image.width, image.height);
      let ink = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2] < 128) ink += 1;
      }
      return ink;
    }, png.toString('base64'));
  };
  /** Taps `tab`, holds the move halfway, and reads the toolbar's ink there; then lets it end. */
  const inkHalfway = async (tab) => {
    await movesOver();
    await tab.click();
    await page.waitForFunction(() =>
      document
        .getAnimations()
        .some((animation) => animation.effect?.pseudoElement?.startsWith('::view-transition')),
    );
    await page.evaluate(() => {
      for (const animation of document.getAnimations()) {
        if (!animation.effect?.pseudoElement?.startsWith('::view-transition')) continue;
        animation.pause();
        animation.currentTime = animation.effect.getComputedTiming().endTime / 2;
      }
    });
    const ink = await toolbarInk();
    await page.evaluate(() => {
      for (const animation of document.getAnimations()) {
        if (animation.effect?.pseudoElement?.startsWith('::view-transition')) animation.play();
      }
    });
    await movesOver();
    return ink;
  };

  await movesOver();
  const onRecord = await toolbarInk();
  // The two moves from Record, where the screen exists only in the new page, and the moves
  // between screens and back to Record as controls.
  const ink = {
    recordToHistory: await inkHalfway(historyTab(page)),
    historyToAccount: await inkHalfway(accountTab(page)),
    accountToHistory: await inkHalfway(historyTab(page)),
    historyToRecord: await inkHalfway(toolbarRecord(page)),
    recordToAccount: await inkHalfway(accountTab(page)),
    accountToRecord: await inkHalfway(toolbarRecord(page)),
  };
  const isInSight = (halfway) => halfway > 0.7 * onRecord;
  const said = JSON.stringify({ onRecord, ...ink });
  check(
    'Record to History: halfway through the move the toolbar is in sight, not under History',
    isInSight(ink.recordToHistory),
    said,
  );
  check(
    '  Record to Account: halfway, the toolbar is in sight too',
    isInSight(ink.recordToAccount),
    said,
  );
  check(
    '  and between History and Account, and back to Record from each, as before',
    isInSight(ink.historyToAccount) &&
      isInSight(ink.accountToHistory) &&
      isInSight(ink.historyToRecord) &&
      isInSight(ink.accountToRecord),
    said,
  );
  check('  no page errors', errors.length === 0, errors.join(' | '));
  await page.context().close();
}

// ------------- History with a hundred recordings: every fact at once, and nothing moving
{
  const { page, errors } = await phone();
  await start(page).waitFor({ timeout: 30000 });
  const COUNT = 100;
  const FIXES = 300;
  const LEGACY_ID = 'eeeeeeee-0000-4000-8000-000000000000';
  const PICTURE =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
  // A straight ride north, a fix a second 8 m apart; all but the oldest kept their distance as
  // they were saved, and most a picture. The oldest is from before the distance was kept.
  await page.evaluate(
    ({ count, fixCount, legacyId, picture }) =>
      new Promise((resolve, reject) => {
        const open = indexedDB.open('para-contribute');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const tx = open.result.transaction(['recordings', 'fixes', 'thumbnails'], 'readwrite');
          for (let n = 0; n < count; n += 1) {
            const id =
              n === 0 ? legacyId : `eeeeeeee-0000-4000-8000-${String(n).padStart(12, '0')}`;
            const startedAt = Date.UTC(2026, 8, 1) + n * 86_400_000;
            const stoppedAt = startedAt + fixCount * 1000;
            tx.objectStore('recordings').put({
              version: 2,
              id,
              status: 'saved',
              startedAt,
              stoppedAt,
              savedAt: stoppedAt + 5000,
              gaps: [],
              modes: [{ time: startedAt, to: n % 4 === 0 ? 'walk' : 'ride' }],
              startPointName: `From ${n}`,
              endPointName: `To ${n}`,
              description: '',
              rideKind: n % 4 === 0 ? null : 'Jeep',
              upload: { state: 'uploaded', at: stoppedAt + 6000, by: 'phone' },
              ...(n === 0 ? {} : { distanceM: 2392 }),
            });
            for (let seq = 0; seq < fixCount; seq += 1) {
              tx.objectStore('fixes').put({
                recordingId: id,
                seq,
                time: startedAt + seq * 1000,
                lng: 121.05,
                lat: 14.6 + (seq * 8) / 111_320,
                accuracyM: 5,
              });
            }
            // The oldest has its picture, so only its distance sends History to its fixes.
            if (n === 0 || n % 10 !== 0)
              tx.objectStore('thumbnails').put({ recordingId: id, dataUrl: picture });
          }
          tx.oncomplete = () => {
            open.result.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    { count: COUNT, fixCount: FIXES, legacyId: LEGACY_ID, picture: PICTURE },
  );
  await page.reload({ waitUntil: 'load' });
  await start(page).waitFor({ timeout: 30000 });
  // Played in the page: waitForFunction does not wait out a promise, so the import's answer is
  // kept on the window and read on each poll.
  await page.waitForFunction(
    () => {
      import('/src/features/contribute/screen-loaders.ts').then((loaders) => {
        window.isHistoryHeld = loaders.historyChunk.loaded() !== null;
      });
      return window.isHistoryHeld === true;
    },
    null,
    { timeout: 15000, polling: 100 },
  );
  // A mid-range phone: four times slower than this machine.
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.evaluate(() => {
    window.historyOpening = { shift: 0, tappedAt: 0, shownAtFirstList: null };
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) window.historyOpening.shift += entry.value;
      }
    }).observe({ type: 'layout-shift' });
    document.addEventListener(
      'pointerdown',
      () => {
        window.historyOpening.tappedAt ||= performance.now();
      },
      { capture: true },
    );
    // How many distances the list has in the first frame it is drawn.
    const watch = () => {
      const cards = document.querySelectorAll('ul[aria-label="Recordings"] > li');
      if (cards.length === 0) {
        requestAnimationFrame(watch);
        return;
      }
      window.historyOpening.shownAtFirstList = [...cards].filter(
        (card) => /\d (m|km)/.test(card.textContent) && !card.querySelector('.invisible'),
      ).length;
    };
    requestAnimationFrame(watch);
  });
  await openHistory(page);
  // A card's distance is shown when it is in the card and no room is still held for it
  // (card-meta.tsx). Every kept one is, at once; the oldest's is worked out from its fixes, once.
  const shownWithin = (count) =>
    page
      .waitForFunction(
        (wanted) => {
          const cards = [...document.querySelectorAll('ul[aria-label="Recordings"] > li')];
          const shown = cards.filter(
            (card) => /\d (m|km)/.test(card.textContent) && !card.querySelector('.invisible'),
          ).length;
          return shown >= wanted ? performance.now() - window.historyOpening.tappedAt : false;
        },
        count,
        { polling: 'raf', timeout: 30000 },
      )
      .then((handle) => handle.jsonValue());
  const keptIn = await shownWithin(COUNT - 1);
  const allIn = await shownWithin(COUNT);
  // Until the oldest's distance is kept on the phone: the last thing the opening does.
  /** The oldest recording's distance as the phone keeps it, read in the page; null for none. */
  const keptDistance = () =>
    page.evaluate(
      (id) =>
        new Promise((resolve) => {
          const open = indexedDB.open('para-contribute');
          open.onsuccess = () => {
            const get = open.result.transaction('recordings').objectStore('recordings').get(id);
            get.onsuccess = () => {
              open.result.close();
              resolve(get.result?.distanceM ?? null);
            };
          };
        }),
      LEGACY_ID,
    );
  // Played in the page: waitForFunction does not wait out a promise, so IndexedDB's answer is
  // kept on the window and read on each poll.
  await page.waitForFunction(
    (id) => {
      const open = indexedDB.open('para-contribute');
      open.onsuccess = () => {
        const get = open.result.transaction('recordings').objectStore('recordings').get(id);
        get.onsuccess = () => {
          open.result.close();
          window.isLegacyDistanceKept = get.result?.distanceM !== undefined;
        };
      };
      return window.isLegacyDistanceKept === true;
    },
    LEGACY_ID,
    { timeout: 15000, polling: 100 },
  );
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  const opening = await page.evaluate(() => window.historyOpening);
  // The dev server's React and unbundled modules run several times slower than the build, so
  // the time is only said here; what must hold is that the list never waits on the fixes.
  check(
    'History with a hundred recordings: every kept distance is there in the first frame of the list',
    opening.shownAtFirstList === COUNT - 1,
    `${opening.shownAtFirstList} of ${COUNT - 1}, all but one in ${Math.round(keptIn)} ms, the one worked out from its fixes in ${Math.round(allIn)} ms (4× slower CPU, dev server)`,
  );
  check(
    '  and nothing on it moves as the facts come: layout shift under 0.01',
    opening.shift < 0.01,
    String(opening.shift),
  );

  const legacy = await keptDistance();
  const legacyCard = await page
    .locator('ul[aria-label="Recordings"] > li')
    .filter({ hasText: 'From 0' })
    .textContent();
  const kilometres = legacy === null ? '' : `${(Math.round(legacy) / 1000).toFixed(1)} km`;
  check(
    '  a recording saved before its distance was kept shows it, worked out from its fixes, and keeps it now',
    legacy !== null && legacy > 2000 && legacy < 2600 && legacyCard.includes(kilometres),
    `${legacy} m, card: ${legacyCard}`,
  );
  // Once: opened again, after a reload, History reads none of its fixes for it.
  await page.addInitScript((id) => {
    window.legacyFixReads = 0;
    const getAll = IDBObjectStore.prototype.getAll;
    IDBObjectStore.prototype.getAll = function (query, count) {
      if (this.name === 'fixes' && query instanceof window.IDBKeyRange && query.lower?.[0] === id) {
        window.legacyFixReads += 1;
      }
      return getAll.call(this, query, count);
    };
  }, LEGACY_ID);
  await page.goto(`${BASE}/contribute/`, { waitUntil: 'load' });
  await start(page).waitFor({ timeout: 30000 });
  await openHistory(page);
  await page
    .locator('ul[aria-label="Recordings"] > li')
    .filter({ hasText: 'From 0' })
    .getByText(kilometres)
    .waitFor({ timeout: 15000 });
  check(
    '  and only once: opened again after a reload, History reads none of its fixes for it',
    (await page.evaluate(() => window.legacyFixReads)) === 0,
    String(await page.evaluate(() => window.legacyFixReads)),
  );
  check('  no page errors', errors.length === 0, errors.join(' | '));
  await page.context().close();
}

// ------------------------- taps faster than the moves, by touch: every one lands, the last wins
{
  const { page, errors } = await phone();
  await start(page).waitFor({ timeout: 30000 });
  const heading = (name) => page.getByRole('heading', { level: 1, name });
  // Each tab once, as a phone has after its first minute.
  await historyTab(page).click();
  await heading('History').waitFor();
  await accountTab(page).click();
  await heading('Account').waitFor();
  await toolbarRecord(page).click();
  await start(page).waitFor();
  // Every tap's tab, from where it landed (a tap mid-move lands on the page, not the tab), and
  // whether that tab came to be marked before the next tap.
  await page.evaluate(() => {
    window.burst = [];
    const tabAt = (x, y) =>
      [...document.querySelectorAll('[data-tab]')].find((tab) => {
        const box = tab.getBoundingClientRect();
        return x >= box.left && x <= box.right && y >= box.top && y <= box.bottom;
      })?.dataset.tab ?? null;
    document.addEventListener(
      'pointerdown',
      (event) => {
        window.burst.push({
          to: tabAt(event.clientX, event.clientY),
          isOnTab: Boolean(event.target.closest?.('[data-tab]')),
          isMarked: false,
        });
      },
      { capture: true },
    );
    const frame = () => {
      const marked = document.querySelector('nav[aria-label="Screens"] [aria-current="page"]')
        ?.dataset.tab;
      // Each tap is credited only while it is the latest: a lost tap is never covered by a
      // later one to the same tab.
      const latest = window.burst[window.burst.length - 1];
      if (latest && marked === latest.to) latest.isMarked = true;
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });
  const cdp = await page.context().newCDPSession(page);
  const points = {};
  for (const name of ['record', 'history', 'account']) {
    const box = await page.locator(`nav[aria-label="Screens"] [data-tab="${name}"]`).boundingBox();
    points[name] = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  }
  const RUN = [
    'history',
    'account',
    'history',
    'record',
    'account',
    'record',
    'history',
    'account',
  ];
  // A tap every 150 ms: the run's pace, not a wait on the page.
  const TAP_EVERY_MS = 150;
  for (const name of RUN) {
    const at = points[name];
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: at.x, y: at.y, id: 1 }],
    });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(TAP_EVERY_MS);
  }
  await page
    .waitForFunction(
      (count) => window.burst.length === count && window.burst.every((tap) => tap.isMarked),
      RUN.length,
      { timeout: 10000 },
    )
    .catch(() => null);
  const burst = await page.evaluate(() => window.burst);
  check(
    'taps faster than the moves, by touch: every one lands, the ones mid-move too',
    burst.length === RUN.length &&
      burst.every((tap, index) => tap.to === RUN[index] && tap.isMarked),
    JSON.stringify(burst),
  );
  check(
    '  some of them did come mid-move, onto the page and not the tab',
    burst.some((tap) => !tap.isOnTab),
    JSON.stringify(burst.map((tap) => tap.isOnTab)),
  );
  await heading('Account').waitFor();
  const shown = await page.evaluate(() =>
    [...document.querySelectorAll('[data-screen-hash]')]
      .filter((screen) => screen.checkVisibility())
      .map((screen) => screen.dataset.screenHash),
  );
  check(
    '  and the run ends where the last tap points: Account, and only Account in sight',
    JSON.stringify(shown) === '["#profile"]' &&
      (await page.evaluate(() => location.hash)) === '#profile',
    JSON.stringify(shown),
  );
  check(
    '  History, kept from before, is hidden: out of sight, and nothing in it can be reached',
    (await page.locator('[data-screen-hash="#history"]').count()) === 1 &&
      !(await page.locator('[data-screen-hash="#history"]').isVisible()),
  );
  check('  no page errors', errors.length === 0, errors.join(' | '));
  await page.context().close();
}

// ------------- a recording deleted while History works its distance out is not brought back
{
  const { page, errors } = await phone();
  await start(page).waitFor({ timeout: 30000 });
  const GONE_ID = 'eeeeeeee-0000-4000-8000-00000000dead';
  /** Writes, or with `isDeleting` deletes, the recording and its fixes in the page's database. */
  const store = (isDeleting) =>
    page.evaluate(
      ([id, isDelete]) =>
        new Promise((resolve, reject) => {
          const open = indexedDB.open('para-contribute');
          open.onsuccess = () => {
            const tx = open.result.transaction(['recordings', 'fixes'], 'readwrite');
            const fixes = window.IDBKeyRange.bound([id, 0], [id, Number.MAX_SAFE_INTEGER]);
            if (isDelete) {
              tx.objectStore('recordings').delete(id);
              tx.objectStore('fixes').delete(fixes);
            } else {
              const startedAt = Date.UTC(2026, 8, 1);
              tx.objectStore('recordings').put({
                version: 2,
                id,
                status: 'saved',
                startedAt,
                stoppedAt: startedAt + 60_000,
                savedAt: startedAt + 65_000,
                gaps: [],
                modes: [{ time: startedAt, to: 'ride' }],
                startPointName: 'Gone',
                endPointName: 'Away',
                description: '',
                rideKind: 'Jeep',
                consentVersion: 4,
              });
              for (let seq = 0; seq < 30; seq += 1) {
                tx.objectStore('fixes').put({
                  recordingId: id,
                  seq,
                  time: startedAt + seq * 2000,
                  lng: 121.05,
                  lat: 14.6 + (seq * 8) / 111_320,
                  accuracyM: 5,
                });
              }
            }
            tx.oncomplete = () => {
              open.result.close();
              resolve();
            };
            tx.onerror = () => reject(tx.error);
          };
        }),
      [GONE_ID, isDeleting],
    );
  const isKept = () =>
    page.evaluate(
      (id) =>
        new Promise((resolve) => {
          const open = indexedDB.open('para-contribute');
          open.onsuccess = () => {
            const get = open.result.transaction('recordings').objectStore('recordings').get(id);
            get.onsuccess = () => {
              open.result.close();
              resolve(get.result !== undefined);
            };
          };
        }),
      GONE_ID,
    );
  await store(false);
  await page.reload({ waitUntil: 'load' });
  await start(page).waitFor({ timeout: 30000 });
  // Deleted (another tab, say) after the page listed it, before History works its distance out.
  await store(true);
  await openHistory(page);
  const card = page.locator('ul[aria-label="Recordings"] > li').filter({ hasText: 'Gone' });
  // The distance, worked out from what it found of the fixes (none), is on the card.
  await card.getByText(/\d (m|km)/).waitFor({ timeout: 15000 });
  check(
    'a recording deleted while History works its distance out is not brought back by its write',
    !(await isKept()),
  );
  check('  no page errors', errors.length === 0, errors.join(' | '));
  await page.context().close();
  // It went up as the page opened: the database the blocks below share keeps none of it.
  database.rows.delete(GONE_ID);
}

// ------------------------------- the pill glides from tab to tab, two over included
{
  const { page, errors } = await phone();
  await start(page).waitFor({ timeout: 30000 });
  const heading = (name) => page.getByRole('heading', { level: 1, name });
  /**
   * Taps `tab` once the last move is over, and once this one shows, holds it a quarter in. The
   * pill's spring reaches its tab before half its time and overshoots it, so halfway it is at its
   * tab already; a quarter in, it is well on its way.
   */
  const pillPartway = async (tab) => {
    await page.waitForFunction(
      () =>
        !document
          .getAnimations()
          .some((animation) => animation.effect?.pseudoElement?.startsWith('::view-transition')),
    );
    await tab.click();
    await page.waitForFunction(() =>
      document
        .getAnimations()
        .some(
          (animation) =>
            animation.effect?.pseudoElement?.startsWith('::view-transition') &&
            animation.playState === 'running',
        ),
    );
    const at = await page.evaluate(() => {
      for (const animation of document.getAnimations()) {
        animation.pause();
        animation.currentTime = animation.effect.getComputedTiming().endTime / 4;
      }
      const bar = document.querySelector('.tab-toolbar');
      const left = (element) => Math.round(element.getBoundingClientRect().left);
      return {
        pill: left(bar.firstElementChild),
        ...Object.fromEntries(
          [...bar.querySelectorAll('[data-tab]')].map((tab) => [tab.dataset.tab, left(tab)]),
        ),
      };
    });
    await page.evaluate(() => {
      for (const animation of document.getAnimations()) animation.play();
    });
    return at;
  };
  const isBetween = (at, from, to) =>
    at.pill > Math.min(at[from], at[to]) && at.pill < Math.max(at[from], at[to]);

  const toAccount = await pillPartway(accountTab(page));
  await heading('Account').waitFor();
  check(
    'Record to Account: a quarter into the move, the pill is between them',
    isBetween(toAccount, 'record', 'account'),
    JSON.stringify(toAccount),
  );
  const toRecord = await pillPartway(toolbarRecord(page));
  await start(page).waitFor();
  check(
    '  Account to Record: a quarter in, the pill is between them',
    isBetween(toRecord, 'account', 'record'),
    JSON.stringify(toRecord),
  );
  const toHistory = await pillPartway(historyTab(page));
  await heading('History').waitFor();
  check(
    '  Record to History: a quarter in, the pill is between them',
    isBetween(toHistory, 'record', 'history'),
    JSON.stringify(toHistory),
  );
  check('  no page errors', errors.length === 0, errors.join(' | '));
  await page.context().close();
}

// --------------- a thumb's tap that drifts is still a tap: the pill glides, and turns at once
{
  const { page, errors } = await phone();
  await start(page).waitFor({ timeout: 30000 });
  const heading = (name) => page.getByRole('heading', { level: 1, name });
  const cdp = await page.context().newCDPSession(page);
  const bar = page.locator('.tab-toolbar');
  const centreOf = async (name) => {
    const box = await page.locator(`.tab-toolbar [data-tab="${name}"]`).boundingBox();
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  };
  const noMove = () =>
    page.waitForFunction(
      () =>
        !document
          .getAnimations()
          .some((animation) => animation.effect?.pseudoElement?.startsWith('::view-transition')),
    );
  // How long each press on the bar lasted, from the page's own clock: a press as long as the
  // hold (250 ms) is a hold, not the tap this block is about.
  await page.evaluate(() => {
    window.presses = [];
    let downAt = 0;
    const toolbar = document.querySelector('.tab-toolbar');
    toolbar.addEventListener('pointerdown', () => (downAt = performance.now()), true);
    toolbar.addEventListener(
      'pointerup',
      () => window.presses.push(performance.now() - downAt),
      true,
    );
  });
  /** The pill's painted span on the bar, in CSS px from its left, read from a screenshot. */
  const pillPainted = async () => {
    const box = await bar.boundingBox();
    const png = await page.screenshot({ clip: box });
    return page.evaluate(
      async ({ data, width }) => {
        const image = document.createElement('img');
        image.src = `data:image/png;base64,${data}`;
        await image.decode();
        const canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        const context = canvas.getContext('2d');
        context.drawImage(image, 0, 0);
        const scale = image.width / width;
        // 6 px down: inside the pill (4 px in), above the tabs' icons, clear of the bar's ends.
        const row = context.getImageData(0, Math.round(6 * scale), image.width, 1).data;
        // The longest unbroken run of the pill's grey, not the bar's white: one pill, not a stray
        // grey pixel of a tab.
        let best = null;
        let runStart = null;
        const last = Math.floor(image.width - 14 * scale);
        for (let x = Math.round(14 * scale); x <= last; x += 1) {
          const [red, green, blue] = row.slice(x * 4, x * 4 + 3);
          const isGrey = x < last && red + green + blue < 3 * 248;
          if (isGrey && runStart === null) runStart = x;
          if (!isGrey && runStart !== null) {
            if (!best || x - runStart > best.to - best.from) best = { from: runStart, to: x };
            runStart = null;
          }
        }
        return best ? { from: best.from / scale, to: best.to / scale } : null;
      },
      { data: png.toString('base64'), width: box.width },
    );
  };
  /**
   * A touch tap on `name` that drifts `drift` px along the bar before it lifts; once the move
   * shows, it is held a quarter into the pill's glide and the pill read, from the page and from
   * its pixels. A press the harness was too slow to keep under the hold is tried again.
   */
  const driftedTap = async (name, drift) => {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await noMove();
      await page.waitForTimeout(300);
      const at = await centreOf(name);
      await page.evaluate(() => (window.presses.length = 0));
      const touch = (type, x) =>
        cdp.send('Input.dispatchTouchEvent', {
          type,
          touchPoints: x === null ? [] : [{ x, y: at.y, id: 1 }],
        });
      await touch('touchStart', at.x);
      await touch('touchMove', at.x + drift / 2);
      await touch('touchMove', at.x + drift);
      await touch('touchEnd', null);
      const isMoving = await page
        .waitForFunction(
          () =>
            document
              .getAnimations()
              .some(
                (animation) =>
                  animation.effect?.pseudoElement?.startsWith('::view-transition') &&
                  animation.playState === 'running',
              ) &&
            document
              .querySelector('.tab-toolbar')
              .firstElementChild.getAnimations()
              .some((animation) => animation.playState === 'running'),
          null,
          { timeout: 3000 },
        )
        .then(() => true)
        .catch(() => false);
      const [pressMs] = await page.evaluate(() => window.presses);
      if (!isMoving || pressMs >= 250) {
        await noMove();
        continue;
      }
      const placed = await page.evaluate(() => {
        for (const animation of document.getAnimations()) {
          animation.pause();
          animation.currentTime = animation.effect.getComputedTiming().endTime / 4;
        }
        const toolbar = document.querySelector('.tab-toolbar');
        const barLeft = toolbar.getBoundingClientRect().left;
        const left = (element) => element.getBoundingClientRect().left - barLeft;
        return {
          pill: Math.round(left(toolbar.firstElementChild)),
          tabs: Object.fromEntries(
            [...toolbar.querySelectorAll('[data-tab]')].map((tab) => [
              tab.dataset.tab,
              { left: Math.round(left(tab)), centre: Math.round(left(tab) + tab.offsetWidth / 2) },
            ]),
          ),
        };
      });
      const painted = await pillPainted();
      await page.evaluate(() => {
        for (const animation of document.getAnimations()) animation.play();
      });
      return { pressMs: Math.round(pressMs), ...placed, painted };
    }
    return null;
  };
  const isBetween = (value, a, b) => value > Math.min(a, b) + 4 && value < Math.max(a, b) - 4;

  for (const [drift, to, from, shows] of [
    [9, 'history', 'record', () => heading('History')],
    [12, 'record', 'history', () => start(page)],
  ]) {
    const seen = await driftedTap(to, drift);
    await shows().waitFor();
    const paintedCentre = seen?.painted ? (seen.painted.from + seen.painted.to) / 2 : null;
    check(
      `${drift === 9 ? '' : '  '}a touch tap that drifts ${drift} px opens ${to === 'history' ? 'History' : 'Record'}, the pill a quarter into its glide between the tabs, not at the end`,
      !!seen &&
        isBetween(seen.pill, seen.tabs[from].left, seen.tabs[to].left) &&
        paintedCentre !== null &&
        isBetween(paintedCentre, seen.tabs[from].centre, seen.tabs[to].centre),
      JSON.stringify(seen),
    );
  }

  // A burst: History, then Record while the pill is still on its way. Where the pill is as
  // Record takes its tap, and the glide that follows: read from the pill's own animations, which
  // hold whether or not the page is drawing frames (a move's view transition pauses them).
  await noMove();
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    const toolbar = document.querySelector('.tab-toolbar');
    toolbar.addEventListener(
      'click',
      (event) => {
        if (event.target.closest('[data-tab]')?.dataset.tab !== 'record') return;
        const pill = toolbar.querySelector(':scope > span[aria-hidden]');
        window.pillAtRecordTap = {
          x: pill.getBoundingClientRect().left - toolbar.getBoundingClientRect().left,
          isGliding: pill.getAnimations().some((glide) => glide.playState === 'running'),
        };
      },
      true,
    );
  });
  for (const name of ['history', 'record']) {
    const at = await centreOf(name);
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: at.x, y: at.y, id: 1 }],
    });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    if (name === 'history') await page.waitForTimeout(120);
  }
  const turn = await page
    .waitForFunction(
      () => {
        const toolbar = document.querySelector('.tab-toolbar');
        const pill = toolbar.querySelector(':scope > span[aria-hidden]');
        const record = toolbar.querySelector('[data-tab="record"]');
        const history = toolbar.querySelector('[data-tab="history"]');
        const xOf = (keyframe) => Number(/translateX\(([-\d.]+)px\)/.exec(keyframe.transform)?.[1]);
        const glides = pill.getAnimations();
        const toRecord = glides.find(
          (glide) => xOf(glide.effect.getKeyframes().at(-1)) === record.offsetLeft,
        );
        if (!toRecord) return null;
        return {
          from: Math.round(xOf(toRecord.effect.getKeyframes()[0])),
          to: record.offsetLeft,
          history: history.offsetLeft,
          others: glides.length - 1,
        };
      },
      null,
      { timeout: 3000 },
    )
    .then((handle) => handle.jsonValue())
    .catch(() => null);
  const atTap = await page.evaluate(() => window.pillAtRecordTap ?? null);
  await start(page).waitFor();
  check(
    '  a burst, History then Record mid-glide: the pill turns to Record from where it is, the glide to History let go',
    !!atTap &&
      atTap.isGliding &&
      !!turn &&
      // From where it was, give or take the frame before the screen is drawn; never from History,
      // where it was headed and not yet.
      Math.abs(turn.from - atTap.x) <= 6 &&
      turn.from < turn.history &&
      turn.others === 0,
    JSON.stringify({ atTap, turn }),
  );
  check('  no page errors', errors.length === 0, errors.join(' | '));
  await page.context().close();
}

// ------------------------------------------- Account: the Commute Statistics
{
  const { page, fake, errors } = await phone();
  await start(page).waitFor({ timeout: 30000 });
  await accountTab(page).click();
  await page.getByRole('heading', { level: 1, name: 'Account' }).waitFor();
  await page.getByText(ACCOUNT.email, { exact: true }).waitFor();
  await page.waitForFunction(() => document.querySelector('[aria-busy="true"]') === null);
  check(
    'Account shows the name and email; with no get_my_stats yet, the statistics are left out quietly',
    (await page.getByText(ACCOUNT.profile.name, { exact: true }).count()) === 1 &&
      fake.statsRequests > 0 &&
      (await page.getByRole('heading', { name: 'Commute Statistics' }).count()) === 0 &&
      (await page.getByRole('alert').count()) === 0,
  );
  const general = page.locator('section[aria-labelledby="general-heading"]').getByRole('button');
  check(
    '  General: Account settings and Logout',
    (await general.allInnerTexts()).join('|') === 'Account settings|Logout',
    (await general.allInnerTexts()).join('|'),
  );

  // 62 hours, 1,240 km in 6 recordings, 40% of it walked.
  fake.stats = {
    rides: 6,
    distanceM: 1_240_500,
    movingS: 50 * 3600,
    standingS: 12 * 3600 + 1200,
    walkM: 496_200,
    rideM: 700_000,
    jeepRides: 3,
    eJeepRides: 2,
    busRides: 1_204,
    trainRides: 1,
    tricycleRides: 1,
    farePhpTotal: 1_240.5,
    fareRecordings: 31,
  };
  await toolbarRecord(page).click();
  await accountTab(page).click();
  const stats = page.getByRole('region', { name: 'Commute Statistics' });
  // The region shows placeholders first: read it once the numbers are in.
  await stats.getByText('Total time').waitFor();
  const statsText = await stats.innerText();
  await shot(page, '2-account-stats');
  check(
    '  with stats: total time in hours, distance in km with separators, the routes recorded counted',
    /Total time\s*62\s*hr/.test(statsText) &&
      /Total distance\s*1,240\s*km/.test(statsText) &&
      /Routes recorded\s*6/.test(statsText),
    statsText.replace(/\n/g, ' '),
  );
  check(
    '  the total fare in pesos with its centavos, said in pesos, between the cards and the vehicles',
    /Total fare\s*₱1,240\.50\s*1,240\.50 pesos/.test(statsText) &&
      statsText.indexOf('Total fare') > statsText.indexOf('Lakad') &&
      statsText.indexOf('Total fare') < statsText.indexOf('Jeep'),
    statsText.replace(/\n/g, ' '),
  );
  const vehicles = await stats
    .getByRole('list', { name: 'Rides by vehicle' })
    .getByRole('listitem')
    .allInnerTexts();
  check(
    "  rides by vehicle, the frame's six: -- for none, no Tricycle",
    vehicles.map((cell) => cell.replace(/\s+/g, ' ').trim()).join(' | ') ===
      'Jeep 3 | E-Jeep 2 | UV Express -- none | Bus 1,204 | Train 1 | Ferry -- none',
    vehicles.map((cell) => cell.replace(/\s+/g, ' ').trim()).join(' | '),
  );
  check(
    '  and Sakay and Lakad by distance, each share under its end, and said with its word',
    /^Sakay\s*60%$/.test(await legendRow(stats, 'Sakay').innerText()) &&
      /^Lakad\s*40%$/.test(await legendRow(stats, 'Lakad').innerText()),
  );

  // Asked again offline: the last numbers stay.
  fake.next.stats = 'offline';
  await toolbarRecord(page).click();
  await accountTab(page).click();
  await stats.waitFor();
  await page.waitForTimeout(500);
  check(
    '  asked again with no signal, the last numbers stay',
    /62\s*hr/.test(await stats.innerText()) && fake.next.stats === undefined,
  );
  check('  no request the stand-in does not know', fake.unknown.length === 0, fake.unknown.join());
  check('  no page errors', errors.length === 0, errors.join(' | '));
}
{
  // None had yet, and no signal: one short line in their place.
  const { page, fake } = await phone();
  fake.stats = { rides: 1, distanceM: 1000 };
  fake.next.stats = 'offline';
  await start(page).waitFor({ timeout: 30000 });
  await accountTab(page).click();
  const stats = page.getByRole('region', { name: 'Commute Statistics' });
  await stats.getByText('Your statistics show when you’re online.').waitFor();
  check('Commute Statistics with no signal and none kept: one short line', true);
  // No recordings yet: zeros and an empty bar.
  fake.stats = {};
  await toolbarRecord(page).click();
  await accountTab(page).click();
  // Read once the numbers are in, not the placeholders.
  await stats.getByText('Sakay', { exact: true }).waitFor();
  const zeroText = await stats.innerText();
  check(
    '  with no recordings: zeros, Sakay and Lakad with no shares, and no fare known: --, not ₱0',
    /Total time\s*0\s*min/.test(zeroText) &&
      /Routes recorded\s*0/.test(zeroText) &&
      /Total fare\s*--\s*none/.test(zeroText) &&
      !zeroText.includes('₱'),
    zeroText.replace(/\n/g, ' '),
  );
}

// --------------------------------- History: the account's uploads, any phone
uploadedRow('dddddddd-0000-4000-8000-000000000001', 1, 'From phone A');
uploadedRow('dddddddd-0000-4000-8000-000000000002', 2, 'Also phone A');
uploadedRow('dddddddd-0000-4000-8000-000000000003', 3, 'Here and there');
{
  const { page, fake, errors } = await phone();
  await start(page).waitFor({ timeout: 30000 });
  await seed(page, 'dddddddd-0000-4000-8000-000000000003', 'Here and there', {
    state: 'uploaded',
    at: T0,
    by: 'ffffffff-0000-4000-8000-000000000000',
  });
  await seed(page, 'eeeeeeee-0000-4000-8000-000000000004', 'Only here');
  await page.reload({ waitUntil: 'load' });
  await openHistory(page);
  await row(page, 'From phone A').waitFor({ timeout: 15000 });
  await shot(page, '3-history');
  check(
    'History lists uploads another phone sent, merged with this phone, each Uploaded',
    (await statusOf(page, 'From phone A')) === 'Uploaded' &&
      (await statusOf(page, 'Also phone A')) === 'Uploaded' &&
      (await statusOf(page, 'Here and there')) === 'Uploaded' &&
      (await page.getByRole('listitem').filter({ hasText: 'Here and there' }).count()) === 1,
  );
  check(
    '  an upload this phone also holds is one card, not two',
    (await page.getByRole('listitem').count()) === 4,
    String(await page.getByRole('listitem').count()),
  );
  const fromA = (await row(page, 'From phone A').innerText()).replace(/\n/g, ' ');
  check(
    "  another phone's upload shows what the database keeps of it: the jeep, and its distance",
    fromA.includes('Jeep,') && fromA.includes('4.2 km') && fromA.includes('0h 10m'),
    fromA,
  );
  // Nothing deletes an upload from Para: deleting takes it off this phone and out of History, and
  // the id is kept so the account's list never brings it back here.
  await openRide(page, 'From phone A');
  await deleteRecord(page);
  await row(page, 'From phone A').waitFor({ state: 'detached' });
  check(
    "  an upload from another phone can be deleted here: off the list, Para's row stays",
    database.rows.has('dddddddd-0000-4000-8000-000000000001') && fake.deleteRequests === 0,
  );
  // A reload on #history lands on History itself.
  await page.reload({ waitUntil: 'load' });
  await page.getByRole('heading', { level: 1, name: 'History' }).waitFor();
  await row(page, 'Also phone A').waitFor({ timeout: 15000 });
  check(
    '  and after a reload it does not come back',
    (await row(page, 'From phone A').count()) === 0,
  );

  await openRide(page, 'Here and there');
  await deleteRecord(page);
  await row(page, 'Here and there').waitFor({ state: 'detached' });
  check(
    "  an upload this phone sent under an earlier sign-in is deleted the same way: gone from History and the phone, Para's row stays",
    database.rows.has('dddddddd-0000-4000-8000-000000000003') &&
      fake.deleteRequests === 0 &&
      (await page.getByRole('listitem').filter({ hasText: 'Here and there' }).count()) === 0,
  );
  // A reload on #history lands on History itself.
  await page.reload({ waitUntil: 'load' });
  await page.getByRole('heading', { level: 1, name: 'History' }).waitFor();
  await row(page, 'Also phone A').waitFor({ timeout: 15000 });
  check(
    '  and it stays hidden after a reload',
    (await row(page, 'Here and there').count()) === 0 &&
      (await row(page, 'Only here').count()) === 1,
  );
  check('  no request the stand-in does not know', fake.unknown.length === 0, fake.unknown.join());
  check('  no page errors', errors.length === 0, errors.join(' | '));
}

// ---------------------- loading, failure and the other phone's view
{
  const { page, fake } = await phone();
  await start(page).waitFor({ timeout: 30000 });
  await seed(page, 'eeeeeeee-0000-4000-8000-000000000004', 'Only here');
  await page.reload({ waitUntil: 'load' });
  fake.next.list = 'hold';
  await openHistory(page);
  await page.getByRole('status').filter({ hasText: 'Loading…' }).waitFor();
  check(
    "while the account's uploads load, this phone's own are already listed",
    (await row(page, 'Only here').count()) === 1,
  );
  await shot(page, '4-history-loading');
  fake.release();
  await row(page, 'Also phone A').waitFor();
  check('  and the rest arrive', (await page.getByText('Loading…').count()) === 0);

  // The page stays on #history through the reload, and asks for the list as it opens.
  fake.next.list = 'offline';
  await page.reload({ waitUntil: 'load' });
  await page.getByRole('alert').filter({ hasText: "can't load your uploads" }).waitFor();
  check(
    "with no signal History says so in one line with Try again, and still lists this phone's own",
    (await row(page, 'Only here').count()) === 1 &&
      (await button(page, 'Try again').count()) === 1 &&
      (await row(page, 'Also phone A').count()) === 0,
  );
  await shot(page, '5-history-error');
  delete fake.next.list;
  await button(page, 'Try again').click();
  await row(page, 'Also phone A').waitFor();
  check('  Try again loads them', (await page.getByRole('alert').count()) === 0);
}

{
  const { page, errors } = await phone({ signedIn: false });
  await page
    .getByRole('heading', { name: 'Welcome Contributor', level: 1 })
    .waitFor({ timeout: 30000 });
  await field(page, 'Email').fill(ACCOUNT.email);
  await field(page, 'Password').fill(ACCOUNT.password);
  await button(page, 'Sign in').click();
  await start(page).waitFor({ timeout: 15000 });
  await openHistory(page);
  await row(page, 'Also phone A').waitFor({ timeout: 15000 });
  check(
    'another phone signed in to the account sees all its uploads, those deleted on the first phone too (Para keeps them), with none of its own',
    (await page.getByRole('listitem').count()) === 4 &&
      (await statusOf(page, 'From phone A')) === 'Uploaded' &&
      (await statusOf(page, 'Also phone A')) === 'Uploaded' &&
      (await statusOf(page, 'Here and there')) === 'Uploaded' &&
      (await statusOf(page, 'Only here')) === 'Uploaded',
  );
  check('  no page errors', errors.length === 0, errors.join(' | '));
}

// ------------------- an editor's session sees and removes only its own
{
  const mine = 'dddddddd-0000-4000-8000-0000000000ed';
  database.rows.set(mine, {
    by: EDITOR_ID,
    recording: {
      id: mine,
      started_at: new Date(T0).toISOString(),
      ended_at: new Date(T0 + 600_000).toISOString(),
      start_name: 'Editor ride',
      end_name: 'Cubao',
      description: '',
      vehicle: null,
      distance_m: 900,
      walk_m: 900,
      ride_m: 0,
    },
  });
  const { page, errors } = await phone({ userId: EDITOR_ID });
  await start(page).waitFor({ timeout: 30000 });
  await openHistory(page);
  await row(page, 'Editor ride').waitFor({ timeout: 15000 });
  check(
    "an editor signed in here sees only its own uploads in History, not everyone's",
    (await page.getByRole('listitem').count()) === 1,
    String(await page.getByRole('listitem').count()),
  );
  const others = [...database.rows.keys()].filter((id) => id !== mine);
  await page.evaluate(
    (ids) =>
      import('/src/features/contribute/api/upload-contribution.ts').then((upload) =>
        Promise.all(ids.map((id) => upload.removeUpload(id))),
      ),
    others,
  );
  check(
    "  and removing someone else's upload does nothing, though the session could delete it",
    others.length > 0 && others.every((id) => database.rows.has(id)),
    `${others.length} others`,
  );
  check('  no page errors', errors.length === 0, errors.join(' | '));
}

// ---------- right after sign-in, Account is there and Logout works
{
  const { page } = await phone({ signedIn: false });
  await page
    .getByRole('heading', { name: 'Welcome Contributor', level: 1 })
    .waitFor({ timeout: 30000 });
  // A #history kept from before sign-in must not open History once the account is in.
  await page.evaluate(() => {
    location.hash = 'history';
  });
  await page.reload({ waitUntil: 'load' });
  await page
    .getByRole('heading', { name: 'Welcome Contributor', level: 1 })
    .waitFor({ timeout: 30000 });
  await field(page, 'Email').fill(ACCOUNT.email);
  await field(page, 'Password').fill(ACCOUNT.password);
  await button(page, 'Sign in').click();
  await start(page).waitFor({ timeout: 15000 });
  check(
    'a stale #history from before sign-in is dropped: the account lands on Start, not History',
    (await page.evaluate(() => location.hash)) === '' &&
      (await page.getByRole('heading', { level: 1, name: 'History' }).count()) === 0,
  );
  const isConsentShown =
    (await page.getByRole('heading', { name: 'Before you record' }).count()) > 0;
  await accountTab(page).click();
  await page.getByRole('heading', { level: 1, name: 'Account' }).waitFor();
  await logout(page);
  await page
    .getByRole('heading', { name: 'Welcome Contributor', level: 1 })
    .waitFor({ timeout: 15000 });
  check(
    'right after sign-in, with no consent step, the Account tab opens Account, and Logout works',
    !isConsentShown,
  );
}

// ------------- a claim that moves uploads in refreshes an open History
{
  const claimed = 'dddddddd-0000-4000-8000-0000000000c1';
  const earlier = 'bbbbbbbb-0000-4000-8000-0000000000b1';
  const token = 'cccccccc-1111-4000-8000-0000000000c1';
  const { page, fake } = await phone();
  await start(page).waitFor({ timeout: 30000 });
  // An earlier anonymous identity of this phone holds an upload, and its claim is waiting.
  database.users.set(earlier, { email: null, password: null, isAccount: false, profile: null });
  database.rows.set(claimed, {
    by: earlier,
    recording: {
      id: claimed,
      started_at: new Date(T0).toISOString(),
      ended_at: new Date(T0 + 600_000).toISOString(),
      start_name: 'Claimed ride',
      end_name: 'Cubao',
      description: '',
      vehicle: 'bus',
      distance_m: 2_000,
      walk_m: null,
      ride_m: null,
    },
  });
  fake.tokens.set(token, { anonymousId: earlier, usedBy: null });
  await openHistory(page);
  await row(page, 'Also phone A').waitFor({ timeout: 15000 });
  check(
    "before the claim, History does not list the earlier identity's upload",
    (await row(page, 'Claimed ride').count()) === 0,
  );
  await page.evaluate(
    ([id, claim]) =>
      localStorage.setItem(
        'para.contributor-claim',
        JSON.stringify({ token: claim, accountId: id, wasTried: false }),
      ),
    [ACCOUNT_ID, token],
  );
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await row(page, 'Claimed ride').waitFor({ timeout: 15000 });
  check(
    '  a claim finished while History is open adds the moved upload to it',
    fake.claims.includes('finish_claim') && (await statusOf(page, 'Claimed ride')) === 'Uploaded',
    fake.claims.join(),
  );
  database.rows.delete(claimed);
  database.users.delete(earlier);
}

// ------------ signing out leaves a claim waiting for its own account
{
  const { page, fake } = await phone();
  await start(page).waitFor({ timeout: 30000 });
  await page.evaluate(
    ([id]) =>
      localStorage.setItem(
        'para.contributor-claim',
        JSON.stringify({
          token: 'cccccccc-2222-4000-8000-0000000000c2',
          accountId: id,
          wasTried: true,
        }),
      ),
    [ACCOUNT_ID],
  );
  await accountTab(page).click();
  await logout(page);
  await page
    .getByRole('heading', { name: 'Welcome Contributor', level: 1 })
    .waitFor({ timeout: 15000 });
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await page.waitForTimeout(500);
  const kept = JSON.parse(
    await page.evaluate(() => localStorage.getItem('para.contributor-claim')),
  );
  check(
    'Logout keeps a waiting claim, still bound to its account, and finishes nothing',
    kept?.accountId === ACCOUNT_ID && !fake.claims.includes('finish_claim'),
    JSON.stringify({ kept, claims: fake.claims }),
  );
}

// ----------------------------------------------------- Logout
{
  const { page, fake } = await phone();
  await start(page).waitFor({ timeout: 30000 });
  await seed(page, 'eeeeeeee-0000-4000-8000-000000000004', 'Only here');
  // Its upload fails, as with no signal: it is still on the phone, not sent, when Logout asks.
  fake.next.save = 'offline';
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => document.readyState === 'complete');
  await accountTab(page).click();
  await button(page, 'Logout').click();
  const sheet = logoutQuestion(page);
  await sheet.waitFor();
  check(
    'Logout asks first over the frosted page, focus on Cancel, and says the recording not sent stays on this phone',
    (await page.evaluate(() => document.activeElement?.textContent)) === 'Cancel' &&
      (await sheet
        .getByText('1 recording not sent yet will be left behind on this phone')
        .count()) === 1 &&
      (await sheet.getByRole('img').count()) === 0 &&
      (await sheet.locator('img[alt=""]').count()) === 1,
    await sheet.innerText(),
  );
  await page.keyboard.press('Shift+Tab');
  const wentRound = await page.evaluate(() => document.activeElement?.textContent);
  await page.keyboard.press('Tab');
  check(
    '  Tab goes round its two buttons and stays inside',
    wentRound === 'Logout' &&
      (await page.evaluate(() => document.activeElement?.textContent)) === 'Cancel',
    String(wentRound),
  );
  await page.keyboard.press('Escape');
  await sheet.waitFor({ state: 'detached' });
  check(
    '  Escape keeps the account signed in, focus back on Logout',
    fake.logouts.length === 0 &&
      (await page.evaluate(() => document.activeElement?.textContent)) === 'Logout',
  );
  await button(page, 'Logout').click();
  await sheet.getByRole('button', { name: 'Cancel' }).click();
  await sheet.waitFor({ state: 'detached' });
  check('  Cancel keeps it signed in too', fake.logouts.length === 0);
  // While the Logout is on its way nothing cancels it, and focus stays in the question.
  fake.next.logout = 'hold';
  await logout(page);
  await sheet.getByRole('button', { name: 'Logging out…' }).waitFor();
  await page.keyboard.press('Escape');
  check(
    '  while logging out it says so: Cancel waits, Escape does nothing, focus stays inside',
    (await sheet.count()) === 1 &&
      (await sheet.getByRole('button', { name: 'Cancel' }).isDisabled()) &&
      (await sheet.getByRole('button', { name: 'Logging out…' }).isDisabled()) &&
      (await page.evaluate(() => !!document.activeElement?.closest('[role="alertdialog"]'))),
  );
  fake.release();
  await page
    .getByRole('heading', { name: 'Welcome Contributor', level: 1 })
    .waitFor({ timeout: 15000 });
  check(
    'Logout signs this phone only, and the page asks for Sign in',
    fake.logouts.join() === 'local' &&
      (await page.evaluate((key) => localStorage.getItem(key), AUTH_KEY)) === null &&
      (await start(page).count()) === 0,
    fake.logouts.join(),
  );
  const kept = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const open = indexedDB.open('para-contribute');
        open.onsuccess = () => {
          const get = open.result.transaction('recordings').objectStore('recordings').getAll();
          get.onsuccess = () => resolve(get.result.length);
        };
      }),
  );
  check("  the phone's own recording stays", kept === 1, String(kept));
  await field(page, 'Email').fill(ACCOUNT.email);
  await field(page, 'Password').fill(ACCOUNT.password);
  await button(page, 'Sign in').click();
  await start(page).waitFor({ timeout: 15000 });
  check(
    '  signing in again lands on Ready, not on Account',
    (await page.getByRole('heading', { name: 'Account', level: 1 }).count()) === 0 &&
      !page.url().includes('#profile'),
    page.url(),
  );
  check('  no request the stand-in does not know', fake.unknown.length === 0, fake.unknown.join());
}

// ------------- a shared phone: the next account never sees the last one's statistics
{
  const OTHER_ID = 'dddddddd-0000-4000-8000-000000000002';
  database.users.set(OTHER_ID, {
    email: 'other@example.com',
    password: 'hunter2hunter2',
    isAccount: true,
    profile: { name: 'Other', phone: '+639170000002' },
  });
  const { page, fake, errors } = await phone();
  fake.stats = { rides: 6, distanceM: 1_240_500, movingS: 62 * 3600 };
  await start(page).waitFor({ timeout: 30000 });
  await accountTab(page).click();
  const stats = page.getByRole('region', { name: 'Commute Statistics' });
  await stats.getByText('Total time').waitFor();
  await logout(page);
  await page
    .getByRole('heading', { name: 'Welcome Contributor', level: 1 })
    .waitFor({ timeout: 15000 });
  await field(page, 'Email').fill('other@example.com');
  await field(page, 'Password').fill('hunter2hunter2');
  await button(page, 'Sign in').click();
  await start(page).waitFor({ timeout: 15000 });
  // The next account's numbers cannot be had: no signal.
  fake.next.stats = 'offline';
  await accountTab(page).click();
  await page.getByText('other@example.com', { exact: true }).waitFor();
  const isOfflineLine = await stats
    .getByText('Your statistics show when you’re online.')
    .waitFor({ timeout: 10000 })
    .then(() => true)
    .catch(() => false);
  check(
    "Logout, then another account signs in with no signal: none of the last account's statistics show",
    isOfflineLine &&
      (await stats.getByText('62', { exact: false }).count()) === 0 &&
      (await page.getByText('Tester', { exact: true }).count()) === 0,
    (await stats.innerText()).replace(/\n/g, ' '),
  );
  check('  no page errors', errors.length === 0, errors.join(' | '));
}

// ------------------------- Delete account: asks first, and leaves nothing of it, in Para or here
{
  const LEAVER_ID = 'ffffffff-0000-4000-8000-000000000003';
  database.users.set(LEAVER_ID, {
    email: 'leaver@example.com',
    password: 'hunter2hunter2',
    isAccount: true,
    profile: { name: 'Leaver', phone: '+639170000003' },
  });
  database.rows.set('ffffffff-1111-4000-8000-000000000001', {
    by: LEAVER_ID,
    recording: {
      id: 'ffffffff-1111-4000-8000-000000000001',
      started_at: new Date(T0).toISOString(),
      ended_at: new Date(T0 + 600_000).toISOString(),
      start_name: 'Leaving',
      end_name: 'Cubao',
      description: '',
    },
  });
  const { page, fake, errors } = await phone({ userId: LEAVER_ID });
  await start(page).waitFor({ timeout: 30000 });
  // On the phone: a recording not sent, and one another account sent. Every one goes.
  await seed(page, 'ffffffff-2222-4000-8000-000000000002', 'Only on the phone');
  await seed(page, 'ffffffff-2222-4000-8000-000000000003', 'Someone else sent it', {
    state: 'uploaded',
    at: T0,
    by: 'ffffffff-0000-4000-8000-0000000000ee',
  });
  fake.next.save = 'offline';
  await page.reload({ waitUntil: 'load' });
  await start(page).waitFor({ timeout: 30000 });
  await accountTab(page).click();
  await button(page, 'Account settings').click();
  await page.getByRole('heading', { level: 1, name: 'Account settings' }).waitFor();
  // The countdown runs on the suite's clock, not the runner's speed.
  await page.clock.install();
  await button(page, 'Delete account').click();
  await page.getByRole('heading', { level: 1, name: 'Delete account' }).waitFor();
  const screenText = await page.locator('[data-screen-hash="#delete-account"]').innerText();
  const counting = page.getByRole('button', { name: /^Delete account \(\d\)$/ });
  check(
    'Delete account (Figma 4543:5309) is a screen of its own: what goes, what stays, no switch to delete the uploads',
    (await page.evaluate(() => location.hash)) === '#delete-account' &&
      /removes your name, email, phone number and password/.test(screenText) &&
      /stay on Para, with your name taken off them/.test(screenText) &&
      /all recordings on this phone will be deleted too/.test(screenText) &&
      (await page.getByRole('switch').count()) === 0,
    screenText,
  );
  const firstCount = await counting.innerText();
  await counting.click({ force: true });
  check(
    '  Delete account counts down from 5, and cannot be pressed until it is done',
    /^Delete account \([45]\)$/.test(firstCount) &&
      (await counting.isDisabled()) &&
      (await page.getByRole('alertdialog').count()) === 0,
    firstCount,
  );
  const ready = button(page, 'Delete account');
  await page.clock.fastForward(5000);
  await ready.waitFor({ timeout: 8000 });
  check(
    '  then it can, and says so once, politely',
    (await ready.isEnabled()) &&
      (await page
        .getByRole('status')
        .filter({ hasText: 'Delete account can be pressed now.' })
        .count()) === 1,
  );

  await ready.click();
  const sheet = page.getByRole('alertdialog', { name: 'Do you want to delete your account?' });
  await sheet.waitFor();
  check(
    '  it asks first over the frosted page, focus on No, I change my mind; it can’t be undone',
    (await page.evaluate(() => document.activeElement?.textContent)) === 'No, I change my mind' &&
      /can’t be undone/.test(await sheet.innerText()),
    await sheet.innerText(),
  );
  await sheet.getByRole('button', { name: 'No, I change my mind' }).click();
  await sheet.waitFor({ state: 'detached' });
  check(
    '  No, I change my mind deletes nothing, focus back on Delete account',
    fake.deleteAccountRequests === 0 &&
      (await page.evaluate(() => document.activeElement?.textContent)) === 'Delete account',
  );

  await ready.click();
  fake.next.deleteAccount = 'offline';
  await sheet.getByRole('button', { name: 'Delete this account' }).click();
  await sheet.getByRole('alert').waitFor();
  check(
    '  with no signal the question says so in one line, and the account stays',
    (await sheet.getByRole('alert').innerText()).startsWith('No signal') &&
      database.users.has(LEAVER_ID),
    await sheet.getByRole('alert').innerText(),
  );
  check(
    '  and the phone keeps no deletion from it: Para never said yes, so nothing may later clear the phone',
    (await page.evaluate(() => localStorage.getItem('para.contributor-deletion'))) === null,
  );
  check(
    '  and both recordings are still on the phone',
    (await recordingsOnPhone(page)) === 2,
    String(await recordingsOnPhone(page)),
  );

  // While the delete is on its way, nothing cancels it: the safe answer and Escape wait.
  fake.next.deleteAccount = 'hold';
  await sheet.getByRole('button', { name: 'Delete this account' }).click();
  await sheet.getByRole('button', { name: 'Deleting…' }).waitFor();
  await page.keyboard.press('Escape');
  check(
    '  while it is on its way it says so, and No, I change my mind and Escape do not close it',
    (await sheet.count()) === 1 &&
      (await sheet.getByRole('button', { name: 'No, I change my mind' }).isDisabled()) &&
      (await sheet.getByRole('button', { name: 'Deleting…' }).isDisabled()),
  );
  // The phone's Back mid-delete: the screen and its question stay, so the answer is seen.
  await page.goBack();
  const isHashBack = await page
    .waitForFunction(() => location.hash === '#delete-account', null, { timeout: 5000 })
    .then(
      () => true,
      () => false,
    );
  check(
    "  the phone's Back while it is on its way leaves Delete account and its question up",
    isHashBack &&
      (await page.getByRole('heading', { level: 1, name: 'Delete account' }).count()) === 1 &&
      (await sheet.getByRole('button', { name: 'Deleting…' }).count()) === 1,
  );
  fake.release();
  await page
    .getByRole('heading', { name: 'Welcome Contributor', level: 1 })
    .waitFor({ timeout: 15000 });
  const keptRecordings = await recordingsOnPhone(page);
  const keptUpload = database.rows.get('ffffffff-1111-4000-8000-000000000001');
  check(
    '  switch off: Para is asked to keep the uploads, which stay with no one’s name; then Sign in, every recording on the phone gone',
    fake.deletedAccounts.join() === LEAVER_ID &&
      fake.deleteUploadsAsked.join() === 'false' &&
      !database.users.has(LEAVER_ID) &&
      !!keptUpload &&
      keptUpload.by === null &&
      (await page.evaluate((key) => localStorage.getItem(key), AUTH_KEY)) === null &&
      keptRecordings === 0,
    JSON.stringify({
      deleted: fake.deletedAccounts,
      asked: fake.deleteUploadsAsked,
      keptUpload: keptUpload?.by,
      keptRecordings,
    }),
  );
  check(
    '  and the phone keeps nothing of whether the account had its name',
    (await page.evaluate(() => localStorage.getItem('para.contributor-profile'))) === null,
  );
  database.rows.delete('ffffffff-1111-4000-8000-000000000001');

  // Another account signs in on the same tab: none of the deleted account's recordings show.
  const NEXT_ID = 'ffffffff-0000-4000-8000-000000000004';
  database.users.set(NEXT_ID, {
    email: 'next@example.com',
    password: 'hunter2hunter2',
    isAccount: true,
    profile: { name: 'Next', phone: '+639170000004' },
  });
  await field(page, 'Email').fill('next@example.com');
  await field(page, 'Password').fill('hunter2hunter2');
  await button(page, 'Sign in').click();
  await start(page).waitFor({ timeout: 15000 });
  await openHistory(page);
  await page.getByRole('heading', { level: 1, name: 'History' }).waitFor();
  await page.getByText('No recordings yet.').waitFor({ timeout: 15000 });
  check(
    '  the next account signed in on the same tab sees none of its recordings',
    (await row(page, 'Only on the phone').count()) === 0,
  );
  check('  no request the stand-in does not know', fake.unknown.length === 0, fake.unknown.join());
  check('  no page errors', errors.length === 0, errors.join(' | '));
}
{
  // An editor's account is not deleted from the contributor page: it says where to go.
  const { page, fake } = await phone({ userId: EDITOR_ID });
  await start(page).waitFor({ timeout: 30000 });
  await seed(page, 'ffffffff-2222-4000-8000-000000000010', 'The editor’s own ride');
  await accountTab(page).click();
  await button(page, 'Account settings').click();
  await button(page, 'Delete account').click();
  await page.getByRole('heading', { level: 1, name: 'Delete account' }).waitFor();
  await button(page, 'Delete account').waitFor({ timeout: 8000 });
  await button(page, 'Delete account').click();
  const sheet = page.getByRole('alertdialog', { name: 'Do you want to delete your account?' });
  await sheet.getByRole('button', { name: 'Delete this account' }).click();
  await sheet.getByRole('alert').waitFor();
  check(
    'Delete account for an editor is refused in one line, and the account stays',
    (await sheet.getByRole('alert').innerText()) ===
      "This account can't be deleted here. Ask Para's team to remove it." &&
      database.users.has(EDITOR_ID) &&
      fake.deletedAccounts.length === 0 &&
      (await recordingsOnPhone(page)) === 1,
    await sheet.getByRole('alert').innerText(),
  );
}
{
  // Refused for owning rows of the map, or as no account: one line each, nothing gone anywhere.
  // Then an answer lost on the way back: Para deleted it, so the try again hears it gone already.
  const OWNER_ID = 'ffffffff-0000-4000-8000-000000000006';
  database.users.set(OWNER_ID, {
    email: 'owner@example.com',
    password: 'hunter2hunter2',
    isAccount: true,
    profile: { name: 'Owner', phone: '+639170000006' },
  });
  const { page, fake, errors } = await phone({ userId: OWNER_ID });
  await start(page).waitFor({ timeout: 30000 });
  await seed(page, 'ffffffff-2222-4000-8000-000000000011', 'Still here');
  await accountTab(page).click();
  await button(page, 'Account settings').click();
  await page.clock.install();
  await button(page, 'Delete account').click();
  await page.getByRole('heading', { level: 1, name: 'Delete account' }).waitFor();
  await page.clock.fastForward(5000);
  await button(page, 'Delete account').waitFor({ timeout: 8000 });
  await button(page, 'Delete account').click();
  const sheet = page.getByRole('alertdialog', { name: 'Do you want to delete your account?' });
  const refusal = "This account can't be deleted here. Ask Para's team to remove it.";
  for (const fault of ['ownsMapRows', 'notAnAccount']) {
    fake.next.deleteAccount = fault;
    await sheet.getByRole('button', { name: 'Delete this account' }).click();
    await sheet.getByRole('alert').filter({ hasText: refusal }).waitFor();
    check(
      `refused (${fault}): one line, the account stays in Para, its recording stays on the phone, no deletion kept`,
      database.users.has(OWNER_ID) &&
        fake.deletedAccounts.length === 0 &&
        (await recordingsOnPhone(page)) === 1 &&
        (await page.evaluate(() => localStorage.getItem('para.contributor-deletion'))) === null,
      await sheet.getByRole('alert').innerText(),
    );
  }
  fake.next.deleteAccount = 'lostAnswer';
  await sheet.getByRole('button', { name: 'Delete this account' }).click();
  await sheet.getByRole('alert').filter({ hasText: 'No signal' }).waitFor();
  check(
    '  an answer lost on the way back says no signal; Para has deleted it, the phone still keeps everything',
    !database.users.has(OWNER_ID) &&
      fake.deletedAccounts.join() === OWNER_ID &&
      (await recordingsOnPhone(page)) === 1 &&
      (await page.evaluate(() => localStorage.getItem('para.contributor-deletion'))) === null,
  );
  await sheet.getByRole('button', { name: 'Delete this account' }).click();
  await page
    .getByRole('heading', { name: 'Welcome Contributor', level: 1 })
    .waitFor({ timeout: 15000 });
  check(
    '  tried again, Para answers it gone already: Sign in, nothing left on the phone, deleted once',
    fake.deletedAccounts.join() === OWNER_ID &&
      fake.deleteAccountRequests === 4 &&
      (await recordingsOnPhone(page)) === 0 &&
      (await page.evaluate((key) => localStorage.getItem(key), AUTH_KEY)) === null,
    JSON.stringify({ requests: fake.deleteAccountRequests, deleted: fake.deletedAccounts }),
  );
  check('  no page errors', errors.length === 0, errors.join(' | '));
}
// ------------------------------------------------ the toolbar stands still between its screens
{
  const { page } = await phone();
  const toolbar = page.getByRole('navigation', { name: 'Screens' });
  /** Once the move between screens is over: no view transition, no animation still running. */
  const moveOver = () =>
    page.waitForFunction(
      () =>
        !document.documentElement.matches(':active-view-transition') &&
        document.getAnimations().every((a) => a.playState !== 'running'),
      null,
      { timeout: 10000 },
    );
  const toolbarBox = async () => {
    await moveOver();
    return toolbar.locator('> div').boundingBox();
  };
  // The one toolbar: the same element from Record to History to Account, never taken off the page.
  const watchToolbar = () =>
    page.evaluate(() => {
      const bar = document.querySelector('nav[aria-label="Screens"]');
      window.__toolbar = { bar, wasRemoved: false };
      new MutationObserver(() => {
        if (!bar?.isConnected) window.__toolbar.wasRemoved = true;
      }).observe(document.body, { childList: true, subtree: true });
    });
  const isSameToolbar = () =>
    page.evaluate(
      () =>
        !window.__toolbar.wasRemoved &&
        window.__toolbar.bar === document.querySelector('nav[aria-label="Screens"]'),
    );
  // The move's view transition, as the page starts it: whether History was in its new state.
  const watchTransition = () =>
    page.evaluate(() => {
      window.__screenAtReady = null;
      const start = document.startViewTransition.bind(document);
      document.startViewTransition = (update) => {
        const transition = start(update);
        transition.ready
          .then(() => {
            // The screen in sight: History and Account, once opened, stay on the page hidden.
            const shown = [...document.querySelectorAll('[data-screen-hash]')].find((screen) =>
              screen.checkVisibility(),
            );
            window.__screenAtReady = shown ? shown.getAttribute('data-screen-hash') : '';
          })
          .catch(() => {});
        return transition;
      };
    });

  await page.getByRole('button', { name: 'Start Tracking' }).waitFor({ timeout: 20000 });
  // Start idle a moment: History and Account are fetched ahead (screen-loaders.ts), and held
  // once their code has run, not only once its first file has come.
  // Played in the page: waitForFunction does not wait out a promise, so the import's answer is
  // kept on the window and read on each poll.
  await page.waitForFunction(
    () => {
      import('/src/features/contribute/screen-loaders.ts').then((loaders) => {
        window.isHistoryHeld = loaders.historyChunk.loaded() !== null;
      });
      return window.isHistoryHeld === true;
    },
    null,
    { timeout: 15000, polling: 100 },
  );
  const onRecord = await toolbarBox();
  await watchToolbar();
  await watchTransition();
  await openHistory(page);
  await page.getByRole('heading', { name: 'History' }).waitFor();
  const onHistory = await toolbarBox();
  check(
    'a first tap on History, fetched ahead, slides in the real History: it is drawn by the time the move starts',
    (await page.evaluate(() => window.__screenAtReady)) === '#history',
    String(await page.evaluate(() => window.__screenAtReady)),
  );
  await toolbar.getByRole('button', { name: 'Account', exact: true }).click();
  await page.locator('[data-screen-hash="#profile"]').waitFor();
  const onAccount = await toolbarBox();
  // Logout's question over Account: the toolbar steps out of sight and out of reach.
  await button(page, 'Logout').click();
  await logoutQuestion(page).waitFor();
  await page
    .waitForFunction(
      () => !!document.querySelector('nav[aria-label="Screens"]')?.closest('[inert]'),
      null,
      { timeout: 5000 },
    )
    .catch(() => {});
  const toolbarUnderQuestion = await page.evaluate(() => {
    const bar = document.querySelector('nav[aria-label="Screens"]');
    return {
      isInert: !!bar?.closest('[inert]'),
      isHidden: !!bar && getComputedStyle(bar).visibility === 'hidden',
    };
  });
  let isTabbedTo = false;
  for (let i = 0; i < 6; i += 1) {
    await page.keyboard.press('Tab');
    if (await page.evaluate(() => !!document.activeElement?.closest('nav[aria-label="Screens"]')))
      isTabbedTo = true;
  }
  check(
    '  with Logout asked, the toolbar is out of sight and out of reach: no tap, no Tab onto it',
    toolbarUnderQuestion.isInert && toolbarUnderQuestion.isHidden && !isTabbedTo,
    JSON.stringify(toolbarUnderQuestion),
  );
  await logoutQuestion(page).getByRole('button', { name: 'Cancel' }).click();
  await logoutQuestion(page).waitFor({ state: 'detached' });
  check(
    '  the question gone, the toolbar is back',
    // Let go as the question leaves the page, a render later.
    await toolbar
      .getByRole('button', { name: 'Record', exact: true })
      .waitFor({ state: 'visible', timeout: 5000 })
      .then(() => true)
      .catch(() => false),
  );
  // Asked again, then left by the phone's Back: Account is kept hidden, and its question with
  // it must not be there on the way back.
  await button(page, 'Logout').click();
  await logoutQuestion(page).waitFor();
  await page.goBack();
  await page.getByRole('button', { name: 'Start Tracking' }).waitFor();
  await toolbar.getByRole('button', { name: 'Account', exact: true }).click();
  await page.getByRole('heading', { level: 1, name: 'Account' }).waitFor();
  check(
    '  left with its question open, Account comes back without it, and with the toolbar',
    (await logoutQuestion(page).count()) === 0 &&
      (await toolbar
        .getByRole('button', { name: 'Record', exact: true })
        .waitFor({ state: 'visible', timeout: 5000 })
        .then(() => true)
        .catch(() => false)),
  );
  await toolbar.getByRole('button', { name: 'Record', exact: true }).click();
  await page.getByRole('button', { name: 'Start Tracking' }).waitFor();
  await moveOver();
  const height = page.viewportSize()?.height ?? 0;
  const same = (a, b) =>
    !!a &&
    !!b &&
    Math.abs(a.x - b.x) < 1 &&
    Math.abs(a.y - b.y) < 1 &&
    Math.abs(a.width - b.width) < 1 &&
    Math.abs(a.height - b.height) < 1;
  check(
    'the toolbar stands in one place on Record, History and Account: 48 over the foot on each, as Figma draws it',
    same(onRecord, onHistory) &&
      same(onRecord, onAccount) &&
      Math.abs(height - (onRecord.y + onRecord.height) - 48) < 1,
    JSON.stringify({ onRecord, onHistory, onAccount }),
  );
  check(
    '  and it is one toolbar: the same element through Record, History, Account and back, never taken off',
    await isSameToolbar(),
  );
}

// ------------------------------------------------ a screen whose code cannot be fetched, then can
{
  const { page } = await phone();
  // History's chunk out of reach, as offline before the page kept it: every ask for it fails.
  const blockHistory = (route) => route.abort('internetdisconnected');
  await page.route(/history-view\.tsx/, blockHistory);
  await page.reload({ waitUntil: 'load' });
  await page.getByRole('button', { name: 'Start Tracking' }).waitFor({ timeout: 20000 });
  await openHistory(page);
  const unavailable = page.getByRole('heading', { name: 'History could not be opened' });
  await unavailable.waitFor({ timeout: 10000 });
  check(
    "History's code out of reach: the tap shows History could not be opened, with Try again, the page and its toolbar still there",
    (await page.getByRole('button', { name: 'Try again' }).count()) === 1 &&
      (await page.getByRole('navigation', { name: 'Screens' }).count()) === 1,
  );
  await page.unroute(/history-view\.tsx/, blockHistory);
  await page.getByRole('button', { name: 'Try again' }).click();
  await page.getByRole('heading', { name: 'History', exact: true }).waitFor({ timeout: 10000 });
  check(
    '  back in reach, Try again opens History in place, with no reload: a failed fetch is not kept failed',
    (await unavailable.count()) === 0 &&
      (await page.locator('[data-screen-hash="#history"]').count()) === 1,
  );
}

// ------------------------------------------------ hold the toolbar and slide to another tab
// A finger's touches through CDP, as a phone sends them: no mouse, and no click Playwright adds.
{
  const { page } = await phone();
  const cdp = await page.context().newCDPSession(page);
  const toolbar = page.getByRole('navigation', { name: 'Screens' });
  const bar = toolbar.locator('[data-tab]').first().locator('..');
  const centre = async (name) => {
    const box = await toolbar.locator(`[data-tab="${name}"]`).boundingBox();
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  };
  const FINGER_REST_MS = 100;
  const touch = async (type, point) => {
    await cdp.send('Input.dispatchTouchEvent', {
      type,
      touchPoints: point ? [{ x: point.x, y: point.y, id: 1 }] : [],
    });
  };
  const isOn = (hash) =>
    page.evaluate(
      (h) =>
        h === ''
          ? ![...document.querySelectorAll('[data-screen-hash]')].some((screen) =>
              screen.checkVisibility(),
            )
          : Boolean(document.querySelector(`[data-screen-hash="${h}"]`)?.checkVisibility()),
      hash,
    );
  /** Whether the screen at `hash` comes up, without throwing when it never does. */
  const opens = (hash) =>
    page
      .locator(`[data-screen-hash="${hash}"]`)
      .waitFor({ timeout: 5000 })
      .then(
        () => true,
        () => false,
      );
  const marked = () => toolbar.locator('[aria-current="page"]').getAttribute('data-tab');
  const sliding = toolbar.locator('[data-sliding]');
  // While screens move, a view transition's layer takes every touch (tab-motion.ts): a finger
  // goes down once the move is over, as it would on the bar the person sees settle.
  const movesOver = () =>
    page.waitForFunction(() =>
      document
        .getAnimations()
        .every((animation) => !animation.effect?.pseudoElement?.startsWith('::view-transition')),
    );
  /** Puts a finger on `from` and waits for the hold to pick the pill up. */
  const hold = async (from) => {
    await movesOver();
    const start = await centre(from);
    await touch('touchStart', start);
    await sliding.waitFor({ timeout: 5000 });
    return start;
  };
  /** Slides a held finger through `via`, a few steps between each. */
  const slideThrough = async (from, via) => {
    let at = from;
    for (const name of via) {
      const to = await centre(name);
      for (let step = 1; step <= 6; step++) {
        await touch('touchMove', {
          x: at.x + ((to.x - at.x) * step) / 6,
          y: at.y + ((to.y - at.y) * step) / 6,
        });
      }
      at = to;
    }
    // The finger rests before it lifts. Let go mid-move, Chrome reads a fling, and the next tap
    // only stops the fling, with no click. Its velocity looks back about 100 ms; one frame of
    // rest is not enough.
    await touch('touchMove', at);
    await page.waitForTimeout(FINGER_REST_MS);
    return at;
  };
  /** Lets go, and waits for the slide to be over. */
  const letGo = async (type = 'touchEnd') => {
    await touch(type);
    await sliding.waitFor({ state: 'detached', timeout: 5000 });
  };
  /** A finger's tap: down and up at once, as a phone makes a click of it. */
  const tap = async (name) => {
    const at = await centre(name);
    await movesOver();
    await touch('touchStart', at);
    await touch('touchEnd');
  };
  /** Back to Record by a tap, for the next case to start from. */
  const backToRecord = async () => {
    if (await isOn('')) return;
    await tap('record');
    await page.waitForFunction(
      () =>
        ![...document.querySelectorAll('[data-screen-hash]')].some((screen) =>
          screen.checkVisibility(),
        ),
    );
  };
  await page.getByRole('button', { name: 'Start Tracking' }).waitFor({ timeout: 20000 });
  const pillLeft = () =>
    // The pill is the bar's first child (bottom-toolbar.tsx).
    bar.evaluate((element) => Math.round(element.firstElementChild.getBoundingClientRect().left));

  const restingLeft = await pillLeft();
  const start = await hold('record');
  await slideThrough(start, ['history', 'account', 'history', 'record']);
  await letGo();
  check(
    'held and slid along the toolbar and back to Record, it lets go where it started: still on Record',
    (await isOn('')) && (await marked()) === 'record',
  );
  await tap('history');
  check(
    '  and the very next tap on another tab opens it: the release kept no click',
    await opens('#history'),
  );
  await backToRecord();

  await slideThrough(await hold('record'), ['history', 'account']);
  await letGo();
  check(
    'held on Record and slid to Account, it opens Account on release, the pill under Account',
    (await opens('#profile')) && (await marked()) === 'account',
  );
  await backToRecord();

  await hold('history');
  // The pill picked up glides to the finger from the tab it marked: held halfway, it is between.
  const pickedUp = await page.evaluate(() => {
    for (const animation of document.getAnimations()) {
      animation.pause();
      animation.currentTime = animation.effect.getComputedTiming().endTime / 2;
    }
    const bar = document.querySelector('.tab-toolbar');
    const left = (element) => Math.round(element.getBoundingClientRect().left);
    const at = {
      pill: left(bar.firstElementChild),
      record: left(bar.querySelector('[data-tab="record"]')),
      history: left(bar.querySelector('[data-tab="history"]')),
    };
    for (const animation of document.getAnimations()) animation.play();
    return at;
  });
  check(
    '  a still hold on another tab glides the pill there from Record, seen halfway between them',
    pickedUp.pill > pickedUp.record && pickedUp.pill < pickedUp.history,
    JSON.stringify(pickedUp),
  );
  await letGo();
  check(
    '  a still hold on another tab, let go there, opens it',
    (await opens('#history')) && (await marked()) === 'history',
  );
  await backToRecord();

  await slideThrough(await hold('record'), ['history', 'account']);
  await letGo('touchCancel');
  await page.waitForFunction(
    (left) => {
      const pill = document.querySelector('nav[aria-label="Screens"] [data-tab]')?.parentElement
        ?.firstElementChild;
      return !!pill && Math.round(pill.getBoundingClientRect().left) === left;
    },
    restingLeft,
    { timeout: 5000 },
  );
  check(
    '  a slide the phone calls off puts the pill back on Record, and Record stays',
    (await isOn('')) && (await marked()) === 'record',
  );

  await tap('history');
  check('  a plain tap on a tab still opens its screen', await opens('#history'));
  await backToRecord();

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await slideThrough(await hold('record'), ['history']);
  await letGo('touchCancel');
  const pillAnimations = await bar.evaluate(
    (element) =>
      element.getAnimations({ subtree: true }).filter((animation) => {
        const target = animation.effect?.target;
        return !!target && !target.matches('[data-tab], [data-tab] *');
      }).length,
  );
  check(
    '  with less motion asked for, the pill snaps back: no slide plays',
    pillAnimations === 0 && (await pillLeft()) === restingLeft,
    pillAnimations,
  );
}

// ---------------------- skeletons while History and Account load
{
  /** Some numbers for Commute Statistics: with none (null) the section is left out. */
  const SOME_STATS = {
    rides: 2,
    distanceM: 12_000,
    movingS: 3600,
    standingS: 600,
    walkM: 2_000,
    rideM: 10_000,
    jeepRides: 2,
    eJeepRides: 0,
    busRides: 0,
    trainRides: 0,
    tricycleRides: 0,
    farePhpTotal: 26,
    fareRecordings: 2,
  };
  /** Whether a skeleton is drawn and seen (not one still waiting its first moments, unseen). */
  const seenSkeletons = (page) =>
    page.evaluate(() => document.querySelectorAll('[data-skeleton]:not(.invisible)').length);
  /** The skeletons' light: the shimmer animations running on the page. */
  const shimmers = (page) =>
    page.evaluate(
      () =>
        document
          .getAnimations()
          .filter((animation) => animation.animationName === 'skeleton-shimmer').length,
    );
  /** From now on, notes whether a seen skeleton ever shows. */
  const watchForSkeletons = (page) =>
    page.evaluate(() => {
      window.__sawSkeleton = false;
      const look = () => {
        if (document.querySelector('[data-skeleton]:not(.invisible)')) window.__sawSkeleton = true;
      };
      new MutationObserver(look).observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class'],
      });
    });

  // A quick load shows none: History and Account open on what loads at once, with no flash.
  {
    const { page, fake, errors } = await phone();
    fake.stats = SOME_STATS;
    await start(page).waitFor({ timeout: 30000 });
    await watchForSkeletons(page);
    await openHistory(page);
    await page.getByRole('heading', { level: 1, name: 'History' }).waitFor();
    await page.locator('[aria-busy="true"]').waitFor({ state: 'detached', timeout: 10000 });
    await toolbarRecord(page).click();
    await accountTab(page).click();
    await page
      .getByRole('region', { name: 'Commute Statistics' })
      .getByText('Total time')
      .waitFor();
    check(
      'a load quicker than 300 ms shows no skeleton, on History or on Account',
      (await page.evaluate(() => window.__sawSkeleton)) === false,
    );
    check('  no page errors', errors.length === 0, errors.join(' | '));
  }

  // ?slowload holds the loads back 2 s: the skeletons show in their places, and go.
  {
    const { page, fake, errors } = await phone();
    fake.stats = SOME_STATS;
    await page.goto(`${BASE}/contribute/?slowload`, { waitUntil: 'load' });
    await start(page).waitFor({ timeout: 30000 });
    await openHistory(page);
    const list = page.locator('[data-history-skeleton]');
    await list.waitFor({ timeout: 5000 });
    await page.waitForTimeout(600);
    const history = await page.evaluate(() => ({
      cards: document.querySelectorAll('[data-history-skeleton] > li:not(.invisible)').length,
      busy: !!document.querySelector('[aria-busy="true"] [data-history-skeleton]'),
      said:
        document.querySelector('[data-screen-hash="#history"] [role="status"]')?.textContent ??
        null,
    }));
    const historyShimmers = await shimmers(page);
    await shot(page, '5-history-skeleton');
    check(
      '?slowload: History shows four card skeletons, shimmering, in a busy region that says "Loading your rides"',
      history.cards === 4 &&
        history.busy &&
        history.said === 'Loading your rides' &&
        historyShimmers > 0,
      JSON.stringify({ ...history, historyShimmers }),
    );
    await list.waitFor({ state: 'detached', timeout: 10000 });
    check(
      '  and once the uploads are in, the skeleton is gone and nothing is busy',
      (await seenSkeletons(page)) === 0 && (await page.locator('[aria-busy="true"]').count()) === 0,
    );

    // Account: the profile card and the stats' tiles, the same height as what replaces them.
    await toolbarRecord(page).click();
    await accountTab(page).click();
    const card = page.locator('[aria-busy="true"]').filter({ hasText: 'Loading your account' });
    await card.waitFor({ timeout: 5000 });
    await page.waitForTimeout(600);
    const stats = page.getByRole('region', { name: 'Commute Statistics' });
    const loading = {
      seen: await seenSkeletons(page),
      card: (await card.boundingBox())?.height,
      stats: (await stats.boundingBox())?.height,
    };
    await shot(page, '6-account-skeleton');
    await stats.getByText('Total time').waitFor({ timeout: 10000 });
    const loaded = {
      seen: await seenSkeletons(page),
      card: (await page.getByText(ACCOUNT.email).locator('..').locator('..').boundingBox())?.height,
      stats: (await stats.boundingBox())?.height,
    };
    check(
      '  Account: the profile card and the stats shimmer while they load, then their content takes the same room',
      loading.seen > 10 &&
        loaded.seen === 0 &&
        Math.abs(loading.card - loaded.card) < 1 &&
        Math.abs(loading.stats - loaded.stats) < 2,
      JSON.stringify({ loading, loaded }),
    );

    // Less motion asked for: the shapes stand still.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(`${BASE}/contribute/#account-settings`, { waitUntil: 'load' });
    const fields = page.locator('[aria-busy="true"]').filter({ hasText: 'Loading your account' });
    await fields.waitFor({ timeout: 30000 });
    await page.waitForTimeout(600);
    const settings = { seen: await seenSkeletons(page), shimmers: await shimmers(page) };
    check(
      '  Account settings: its fields shimmer in their places; with less motion asked for, still shapes with no animation',
      settings.seen === 4 && settings.shimmers === 0,
      JSON.stringify(settings),
    );
    await field(page, 'Name').waitFor({ timeout: 10000 });
    check(
      '  then the form takes their place',
      (await seenSkeletons(page)) === 0 && (await fields.count()) === 0,
    );
    check('  no page errors', errors.length === 0, errors.join(' | '));
  }
}

await browser.close();
tally();
