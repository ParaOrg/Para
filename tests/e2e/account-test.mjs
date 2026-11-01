// The contributor page's accounts, driven by a phone: with no account the page shows only Sign in
// and Create an account; Create an account turns the phone's anonymous user into an account with the
// same id and stores the name and number; Sign in takes an account made elsewhere, refuses a wrong
// password in one line, and says so when there is no signal. Supabase is the in-memory stand-in
// (lib/fake-contributions.mjs): every request to *.supabase.co lands there, and one it does not
// know fails the run, so nothing reaches a real project.
//
//   cp .env.production .env.local && echo VITE_CONTRIBUTIONS=1 >> .env.local
//                                        (a project URL to stand in for, and uploads on)
//   npm run dev                          (in another terminal)
//   node tests/e2e/account-test.mjs
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

const AUTH_KEY = 'para.contributor-auth';
const browser = await chromium.launch();

/** A phone with nothing stored, and the stand-in Supabase. */
async function phone({ fake: shared, isCheckInteractive = false } = {}) {
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
  // A second phone shares the first's accounts: the database is one.
  if (shared) fake.users = shared.users;
  await fakeTurnstile(page, { interactive: isCheckInteractive });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`${BASE}/contribute/`, { waitUntil: 'load' });
  return { page, context, fake, errors };
}

const SCREENS = {
  signIn: (page) => page.getByRole('heading', { name: 'Welcome Contributor', level: 1 }),
  createAccount: (page) => page.getByRole('heading', { name: 'Create an account', level: 1 }),
  thankYou: (page) => page.getByRole('heading', { name: 'Thank you for signing up!', level: 1 }),
  start: (page) => page.getByRole('button', { name: 'Start Tracking' }),
};
const field = (page, name) => page.getByLabel(name, { exact: true });
const alertText = (page) => page.getByRole('alert').innerText();

async function fillCreateAccount(page, values) {
  for (const [name, value] of Object.entries(values)) await field(page, name).fill(value);
}

// The number as typed after the field's +63.
const TESTER = {
  'Full name': 'Juan dela Cruz',
  Email: 'juan@example.com',
  'Phone Number': '917 123 4567',
  Password: 'hunter2hunter2',
};

/** No signal: the browser says it is offline, and the stand-in drops what the page sends. */
async function setOffline(context, fake, isOffline) {
  fake.isOffline = isOffline;
  await context.setOffline(isOffline);
}

/** Signs out through Account's Logout, and the question's Logout. */
async function signOut(page) {
  await page
    .getByRole('navigation', { name: 'Screens' })
    .getByRole('button', { name: 'Account' })
    .click();
  await page.getByRole('button', { name: 'Logout' }).click();
  await page
    .getByRole('alertdialog', { name: 'Are you sure you want to logout?' })
    .getByRole('button', { name: 'Logout' })
    .click();
}

// ------------------------------------------------ no account: only Sign in
{
  const { page, fake, errors } = await phone();
  await SCREENS.signIn(page).waitFor({ timeout: 30000 });
  await shot(page, '1-sign-in');
  // The map and its controls are the page's first part; Sign in covers it all.
  await page.getByRole('button', { name: 'Map design', includeHidden: true }).waitFor({
    state: 'attached',
    timeout: 15000,
  });
  const mapStops = [];
  for (let i = 0; i < 40; i += 1) {
    await page.keyboard.press('Tab');
    const stop = await page.evaluate(() => {
      const element = document.activeElement;
      const mapPart = document.querySelector('main.contribute-page > :first-child');
      return {
        name: element?.getAttribute('aria-label') ?? element?.textContent?.trim().slice(0, 40),
        isOnMap: Boolean(element && mapPart?.contains(element)),
      };
    });
    if (stop.isOnMap) mapStops.push(stop.name);
  }
  check(
    '  and no map control under it can be tabbed to or read out',
    mapStops.length === 0,
    mapStops.join(' | '),
  );
  check(
    'with no account the page shows Sign in, Create an account and Forgot password, no way back to the map, and no Start',
    (await field(page, 'Email').count()) === 1 &&
      (await field(page, 'Password').count()) === 1 &&
      (await page.getByRole('button', { name: 'Sign in', exact: true }).count()) === 1 &&
      (await page.getByRole('button', { name: 'Create an account' }).count()) === 1 &&
      (await page.getByRole('button', { name: 'Forgot password' }).count()) === 1 &&
      (await page.getByRole('button', { name: 'Back to the map' }).count()) === 0 &&
      (await SCREENS.start(page).count()) === 0,
  );
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  check(
    '  Sign in with nothing typed names what is missing and sends nothing',
    (await page.getByText('Enter a valid email').count()) === 1 &&
      (await page.getByText('Enter your password').count()) === 1 &&
      fake.passwordSignIns === 0,
  );
  check(
    '  and the page has asked the database for nothing yet',
    fake.signIns === 0 && fake.unknown.length === 0,
    fake.unknown.join(', '),
  );
  check('  no page errors', errors.length === 0, errors.join(' | '));
}

// ------------------------------- the bot check: last on the page, and seen only when it asks for a tap
if (process.env.PARA_TURNSTILE) {
  const { page, fake, errors } = await phone();
  await SCREENS.signIn(page).waitFor({ timeout: 30000 });
  const theCheck = page.getByRole('group', { name: 'Check that you are a person' });
  await theCheck.waitFor({ state: 'attached' });
  const isLast = await page.evaluate(() => {
    const form = document.querySelector('form');
    const widget = document.querySelector('[aria-label="Check that you are a person"]');
    const buttons = [...(form?.querySelectorAll('button') ?? [])];
    return (
      !!widget &&
      buttons.every(
        (button) =>
          button.compareDocumentPosition(widget) & window.Node.DOCUMENT_POSITION_FOLLOWING,
      ) &&
      widget.dataset.appearance === 'interaction-only'
    );
  });
  check(
    'the bot check is drawn interaction-only, after every button on Sign in',
    isLast && (await page.getByText('Tap the check at the bottom first').count()) === 0,
  );
  check('  no page errors', errors.length === 0, errors.join(' | '));
  await page.context().close();

  const asked = await phone({ fake, isCheckInteractive: true });
  await SCREENS.signIn(asked.page).waitFor({ timeout: 30000 });
  await asked.page.getByText('Tap the check at the bottom first').waitFor();
  const signInButton = asked.page.getByRole('button', { name: 'Sign in', exact: true });
  check(
    '  when Cloudflare asks for a tap, one line says where, and Sign in waits for it',
    await signInButton.isDisabled(),
  );
  await shot(asked.page, '1b-check-asks-for-a-tap');
  await asked.page.getByRole('button', { name: 'Verify you are human' }).click();
  await asked.page.getByText('Tap the check at the bottom first').waitFor({ state: 'detached' });
  check(
    '  the tap passes the check: the line goes and Sign in is usable',
    await signInButton.isEnabled(),
  );
  await asked.page.context().close();
}

// --------------------------------------------- create an account
const shared = {};
{
  const { page, fake, errors } = await phone();
  await SCREENS.signIn(page).waitFor({ timeout: 30000 });
  await page.getByRole('button', { name: 'Create an account' }).click();
  await SCREENS.createAccount(page).waitFor();
  await shot(page, '2-create-account');
  check(
    'Create an account asks for Full name, Email, Phone Number and Password, and for nothing else',
    (await page.locator('input').count()) === 4 &&
      (await field(page, 'Full name').count()) === 1 &&
      (await field(page, 'Phone Number').count()) === 1,
  );
  await fillCreateAccount(page, { ...TESTER, 'Phone Number': '12345', Password: 'short' });
  await page.getByRole('button', { name: 'Continue' }).click();
  await page
    .getByText('Use at least 8 characters, with letters and numbers', { exact: true })
    .waitFor();
  check(
    '  a bad number and a short password are named, field by field, and nothing is sent',
    (await page.getByText('Enter a mobile number like 917 123 4567').count()) === 1 &&
      fake.signIns === 0 &&
      fake.profileRequests === 0,
  );
  check(
    '  the password rule sits under the field, and the field names it',
    (await page
      .getByText('At least 8 characters, with letters and numbers', { exact: true })
      .isVisible()) &&
      (await field(page, 'Password').getAttribute('aria-describedby'))?.includes(
        (await page
          .getByText('At least 8 characters, with letters and numbers', { exact: true })
          .getAttribute('id')) ?? '-',
      ) === true,
  );
  await shot(page, '3-create-account-errors');
  await field(page, 'Phone Number').fill(TESTER['Phone Number']);
  await field(page, 'Password').fill('longenoughbutnodigit');
  await page.getByRole('button', { name: 'Continue' }).click();
  check(
    '  a long password with no digit is refused on the phone, and nothing is sent',
    (await page
      .getByText('Use at least 8 characters, with letters and numbers', { exact: true })
      .count()) === 1 &&
      (await page.getByText('Enter a mobile number like 917 123 4567').count()) === 0 &&
      fake.signIns === 0 &&
      fake.profileRequests === 0,
  );
  await field(page, 'Password').fill(TESTER.Password);
  fake.next.updateUser = 'hold';
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Creating account…' }).waitFor();
  for (let wait = 0; !fake.held && wait < 100; wait += 1) await page.waitForTimeout(100);
  check(
    '  while the account is being made, Back waits: leaving would lose the answer',
    await page.getByRole('button', { name: 'Back', exact: true }).isDisabled(),
  );
  fake.release();
  await SCREENS.thankYou(page).waitFor({ timeout: 15000 });
  await shot(page, '3b-thank-you');
  check(
    'a valid form ends on Thank you, which holds the page until Continue',
    (await SCREENS.start(page).count()) === 0 &&
      (await page.getByRole('button', { name: 'Continue' }).count()) === 1,
  );
  await page.getByRole('button', { name: 'Continue' }).click();
  await SCREENS.start(page).waitFor({ timeout: 15000 });
  const [[id, account]] = [...fake.users];
  check(
    '  the account was made, and Continue opens Ready',
    fake.users.size === 1 &&
      account.isAccount &&
      account.email === 'juan@example.com' &&
      account.password === TESTER.Password,
    JSON.stringify([...fake.users]),
  );
  check(
    "  the phone's anonymous user became the account: one user, one sign-in",
    fake.signIns === 1 && fake.users.size === 1,
    `${fake.signIns} sign-ins, ${fake.users.size} users`,
  );
  check(
    '  the name and number were stored, the number as +639XXXXXXXXX, by a renewed token',
    fake.profileRequests === 1 &&
      account.profile?.name === 'Juan dela Cruz' &&
      account.profile?.phone === '+639171234567',
    JSON.stringify(account.profile),
  );
  check(
    '  the first sign-in carried the bot check when the build has a site key',
    !process.env.PARA_TURNSTILE || /^token-/.test(String(fake.captchaTokens[0])),
    String(fake.captchaTokens[0]),
  );
  await page.reload({ waitUntil: 'load' });
  await SCREENS.start(page).waitFor({ timeout: 15000 });
  check(
    '  after a reload the phone is still signed in, with no new request for it',
    (await SCREENS.signIn(page).count()) === 0 && fake.signIns === 1 && fake.passwordSignIns === 0,
  );
  shared.users = fake.users;
  shared.id = id;
  check('  no request the stand-in does not know', fake.unknown.length === 0, fake.unknown.join());
  check('  no page errors', errors.length === 0, errors.join(' | '));
}

// ---------------------------------------- sign out, then sign in
{
  const { page, fake, errors } = await phone({ fake: shared });
  await SCREENS.signIn(page).waitFor({ timeout: 30000 });
  await field(page, 'Email').fill('juan@example.com');
  await field(page, 'Password').fill(TESTER.Password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await SCREENS.start(page).waitFor({ timeout: 15000 });
  await signOut(page);
  await SCREENS.signIn(page).waitFor({ timeout: 15000 });
  check(
    'signed out, the page asks for Sign in again',
    (await SCREENS.start(page).count()) === 0 &&
      (await page.evaluate((key) => localStorage.getItem(key), AUTH_KEY)) === null,
  );
  check(
    '  and the phone keeps nothing of whether the account had its name',
    (await page.evaluate(() => localStorage.getItem('para.contributor-profile'))) === null,
  );
  check(
    '  it signed out this phone only: the call carried the local scope',
    fake.logouts.join() === 'local',
    fake.logouts.join(),
  );

  await field(page, 'Email').fill('juan@example.com');
  await field(page, 'Password').fill('not-the-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByRole('alert').waitFor();
  check(
    'a wrong password is refused in one line, and the page stays on Sign in',
    (await alertText(page)) === 'Wrong email or password' &&
      (await SCREENS.start(page).count()) === 0 &&
      fake.passwordSignIns === 2,
    await alertText(page),
  );
  await shot(page, '4-wrong-password');

  await field(page, 'Password').fill(TESTER.Password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await SCREENS.start(page).waitFor({ timeout: 15000 });
  const stored = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), AUTH_KEY);
  check(
    'the right password signs in to the same account and opens Ready',
    fake.passwordSignIns === 3 &&
      stored.user.id === shared.id &&
      stored.user.is_anonymous === false,
    `${fake.passwordSignIns} tries, ${stored.user.id}`,
  );
  check('  no request the stand-in does not know', fake.unknown.length === 0, fake.unknown.join());
  check('  no page errors', errors.length === 0, errors.join(' | '));
}

// ---------------------------------------- refused and offline tries
{
  const { page, context, fake } = await phone({ fake: shared });
  await SCREENS.signIn(page).waitFor({ timeout: 30000 });
  await field(page, 'Email').fill('juan@example.com');
  await field(page, 'Password').fill(TESTER.Password);
  const signInButton = page.getByRole('button', { name: 'Sign in', exact: true });
  await signInButton.waitFor();
  await page.waitForFunction(
    () =>
      ![...document.querySelectorAll('button')].find((b) => b.textContent === 'Sign in')?.disabled,
  );
  await setOffline(context, fake, true);
  await signInButton.click();
  await page.getByRole('alert').waitFor({ timeout: 15000 });
  // A new bot check is drawn after each try; the button is usable once it passes.
  await page.waitForFunction(
    () =>
      ![...document.querySelectorAll('button')].find((b) => b.textContent === 'Sign in')?.disabled,
    undefined,
    { timeout: 5000 },
  );
  check(
    'with the browser offline, Sign in says so in one line, and its buttons are usable again',
    (await alertText(page)) === "No signal — try again when you're online" &&
      (await signInButton.isEnabled()) &&
      (await field(page, 'Email').inputValue()) === 'juan@example.com',
    await alertText(page),
  );
  await shot(page, '5-sign-in-offline');
  await setOffline(context, fake, false);
  await page.waitForFunction(
    () =>
      ![...document.querySelectorAll('button')].find((b) => b.textContent === 'Sign in')?.disabled,
  );
  await signInButton.click();
  await SCREENS.start(page).waitFor({ timeout: 15000 });
  check('  trying again, back online, signs in', true);
  // The module is fetched while there is signal: the page no longer loads it up front, and a
  // module asked for offline never arrives. Signing out is what goes with no signal.
  await page.evaluate(() =>
    import('/src/features/contribute/api/account.ts').then((account) => {
      window.__signOut = account.signOut;
    }),
  );
  await setOffline(context, fake, true);
  const signedOut = await page.evaluate(() =>
    window.__signOut().then(
      () => true,
      () => false,
    ),
  );
  check(
    '  signing out with no signal still works: the phone forgets the account',
    signedOut && (await page.evaluate((key) => localStorage.getItem(key), AUTH_KEY)) === null,
  );
}

{
  const { page, fake } = await phone({ fake: shared });
  await SCREENS.signIn(page).waitFor({ timeout: 30000 });
  await page.getByRole('button', { name: 'Create an account' }).click();
  await SCREENS.createAccount(page).waitFor();
  await fillCreateAccount(page, TESTER);
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('alert').waitFor();
  check(
    'an email that already has an account is refused in one line, with no second profile stored',
    (await alertText(page)) === 'That email already has an account' &&
      (await SCREENS.start(page).count()) === 0 &&
      fake.profileRequests === 0,
    await alertText(page),
  );
  await shot(page, '6-email-taken');
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await SCREENS.signIn(page).waitFor();
  check(
    '  Back to Sign in from there clears the line',
    (await page.getByRole('alert').count()) === 0,
  );
}

// ------------------- the profile fails after the account is made, then goes
{
  const { page, fake } = await phone();
  await SCREENS.signIn(page).waitFor({ timeout: 30000 });
  await page.getByRole('button', { name: 'Create an account' }).click();
  await SCREENS.createAccount(page).waitFor();
  await fillCreateAccount(page, { ...TESTER, Email: 'ana@example.com' });
  fake.next.profile = 'offline';
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('alert').waitFor();
  check(
    'if only the name and number fail to save, the page asks for just those two, and says why',
    (await alertText(page)).startsWith('No signal') &&
      (await SCREENS.start(page).count()) === 0 &&
      (await page.locator('input').count()) === 2 &&
      (await field(page, 'Email').count()) === 0,
    await alertText(page),
  );
  await shot(page, '7-profile-step');
  await page.reload({ waitUntil: 'load' });
  await field(page, 'Full name').waitFor({ timeout: 15000 });
  check(
    '  a reload lands on the same step: the account is not let in without its name',
    (await SCREENS.start(page).count()) === 0 && (await field(page, 'Phone Number').count()) === 1,
  );
  await field(page, 'Full name').fill('Ana Reyes');
  await field(page, 'Phone Number').fill('918 123 4567');
  await page.getByRole('button', { name: 'Continue' }).click();
  await SCREENS.start(page).waitFor({ timeout: 15000 });
  const mine = [...fake.users.values()].find((user) => user.email === 'ana@example.com');
  check(
    '  saving them finishes it on the same user: one account, only the profile sent again',
    fake.profileRequests === 2 &&
      fake.users.size === 1 &&
      mine?.profile?.name === 'Ana Reyes' &&
      mine?.profile?.phone === '+639181234567',
    JSON.stringify(mine),
  );
  check('  no request the stand-in does not know', fake.unknown.length === 0, fake.unknown.join());
}

// ----------------------------- Start never waits on the network: the stored session decides
/**
 * A phone already signed in to an account with its name stored. `storedSession` is what the
 * phone kept; the page is opened only once `beforeOpen` has set the stand-in up.
 */
async function signedInPhone({ storedSession, beforeOpen }) {
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
  await fakeTurnstile(page);
  await page.addInitScript(
    ([key, stored]) => {
      if (stored && !localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(stored));
      // When the map's canvas and Start are first seen, by the page's own clock.
      window.firstSeen = {};
      new MutationObserver(() => {
        const now = performance.now();
        if (!window.firstSeen.map && document.querySelector('.maplibregl-canvas')) {
          window.firstSeen.map = now;
        }
        const start = [...document.querySelectorAll('button')].find(
          (button) => button.textContent?.trim().toLowerCase() === 'start tracking',
        );
        if (!window.firstSeen.start && start) window.firstSeen.start = now;
      }).observe(document, { childList: true, subtree: true });
    },
    [AUTH_KEY, storedSession],
  );
  await beforeOpen?.(page, fake);
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`${BASE}/contribute/`, { waitUntil: 'load' });
  return { page, context, fake, errors };
}

{
  const ACCOUNT_ID = 'dddddddd-0000-4000-8000-000000000001';
  const account = {
    email: 'rider@example.com',
    password: 'hunter2hunter2',
    isAccount: true,
    profile: { name: 'Rider', phone: '+639171234567' },
  };
  // A signal that carries nothing: Para is asked for the profile, and never answers.
  let profileAsks = 0;
  const { page, context, errors } = await signedInPhone({
    storedSession: session(ACCOUNT_ID, { email: account.email, isAccount: true }),
    beforeOpen: async (opened, fake) => {
      fake.users.set(ACCOUNT_ID, account);
      await opened.route('**/rest/v1/rpc/get_profile', () => {
        profileAsks += 1;
      });
    },
  });
  await SCREENS.start(page).waitFor({ timeout: 15000 });
  await page.waitForFunction(() => window.firstSeen.map !== undefined, null, { timeout: 15000 });
  const firstSeen = await page.evaluate(() => window.firstSeen);
  check(
    'with the profile asked for and never answered, Start shows all the same: before Para answers',
    firstSeen.start !== undefined && profileAsks >= 1,
    JSON.stringify({ ...firstSeen, profileAsks }),
  );
  check(
    '  and the toolbar with it',
    (await page.getByRole('navigation', { name: 'Screens' }).count()) === 1,
  );
  check('  no page errors', errors.length === 0, errors.join(' | '));
  await context.close();
}

{
  // A session kept from long ago: its token has run out, and Para no longer knows its renewal.
  const GONE_ID = 'dddddddd-0000-4000-8000-000000000002';
  const expired = {
    ...session(GONE_ID, { email: 'gone@example.com', isAccount: true }),
    expires_at: Math.floor(Date.now() / 1000) - 3600,
  };
  const { page, context, errors } = await signedInPhone({ storedSession: expired });
  await SCREENS.signIn(page).waitFor({ timeout: 15000 });
  check(
    'a session Para no longer knows goes to Sign in once Para has said so, with no Start left',
    (await SCREENS.start(page).count()) === 0,
  );
  check('  no page errors', errors.length === 0, errors.join(' | '));
  await context.close();
}

/** What the phone keeps of whether the account had its name (account.ts). */
const PROFILE_KEY = 'para.contributor-profile';
const keptProfile = (page) =>
  page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? 'null'), PROFILE_KEY);

{
  // A's profile on its way, slowly; the contributor signs out and in as B meanwhile. A's late
  // answer must not land over B.
  const A_ID = 'dddddddd-0000-4000-8000-0000000000a1';
  const B_EMAIL = 'b@example.com';
  let heldProfile = null;
  let profileAsks = 0;
  const { page, context, fake, errors } = await signedInPhone({
    storedSession: session(A_ID, { email: 'a@example.com', isAccount: true }),
    beforeOpen: async (opened, stand) => {
      stand.users.set(A_ID, {
        email: 'a@example.com',
        password: 'hunter2hunter2',
        isAccount: true,
        profile: { name: 'A', phone: '+639171234567' },
      });
      stand.users.set('dddddddd-0000-4000-8000-0000000000b1', {
        email: B_EMAIL,
        password: 'hunter2hunter2',
        isAccount: true,
        profile: { name: 'B', phone: '+639171234568' },
      });
      // The first ask of the profile, A's as the page opens, is held; the rest go through.
      await opened.route('**/rest/v1/rpc/get_profile', (route) => {
        profileAsks += 1;
        if (profileAsks === 1) heldProfile = route;
        else route.fallback();
      });
    },
  });
  await SCREENS.start(page).waitFor({ timeout: 15000 });
  await signOut(page);
  await SCREENS.signIn(page).waitFor({ timeout: 15000 });
  await field(page, 'Email').fill(B_EMAIL);
  await field(page, 'Password').fill('hunter2hunter2');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await SCREENS.start(page).waitFor({ timeout: 15000 });
  // Now A's answer comes, late, if it is still asked for: A, with its name. The sign-out called
  // the check off, so its request may be gone already; either way, it has ended.
  const heldRequest = heldProfile?.request();
  if (heldRequest && heldRequest.failure() === null) {
    const ended = Promise.race([
      page.waitForEvent('requestfinished', (request) => request === heldRequest),
      page.waitForEvent('requestfailed', (request) => request === heldRequest),
    ]);
    await heldProfile
      .fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'access-control-allow-origin': '*' },
        body: JSON.stringify([{ name: 'A', phone: '+639171234567' }]),
      })
      .then(
        () => ended,
        // Called off by the page before the answer could be given.
        () => undefined,
      );
  }
  const storedUser = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key))?.user?.email,
    AUTH_KEY,
  );
  await page
    .getByRole('navigation', { name: 'Screens' })
    .getByRole('button', { name: 'Account' })
    .click();
  await page.getByText(B_EMAIL, { exact: true }).waitFor({ timeout: 15000 });
  const kept = await keptProfile(page);
  check(
    "A's answer arriving after a sign-out and B's sign-in is dropped: B stays signed in, and shown",
    heldProfile !== null &&
      storedUser === B_EMAIL &&
      (await page.getByText('a@example.com').count()) === 0,
    JSON.stringify({ storedUser, profileAsks }),
  );
  check(
    "  and what the phone keeps of the name is B's, not A's",
    kept?.id === 'dddddddd-0000-4000-8000-0000000000b1' && kept?.hasProfile === true,
    JSON.stringify(kept),
  );
  check('  no request the stand-in does not know', fake.unknown.length === 0, fake.unknown.join());
  check('  no page errors', errors.length === 0, errors.join(' | '));
  await context.close();
}

/**
 * Keeps `stored` as the phone's session and one saved recording waiting to go, as the phone would
 * have them after a ride: written into the page's own storage, for the next opening to find.
 */
const keepOnPhone = (page, key, stored) =>
  page.evaluate(
    ([authKey, kept]) =>
      new Promise((resolve, reject) => {
        localStorage.setItem(authKey, JSON.stringify(kept));
        const open = indexedDB.open('para-contribute');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const tx = open.result.transaction(['recordings', 'fixes'], 'readwrite');
          const startedAt = Date.UTC(2026, 9, 30, 0, 0, 0);
          tx.objectStore('recordings').put({
            version: 2,
            id: 'eeeeeeee-0000-4000-8000-0000000000c2',
            status: 'saved',
            startedAt,
            stoppedAt: startedAt + 60_000,
            savedAt: startedAt + 65_000,
            gaps: [],
            modes: [{ time: startedAt, to: 'ride' }],
            startPointName: 'Fairview',
            endPointName: 'Cubao',
            description: '',
            rideKind: 'Jeep',
            consentVersion: 4,
          });
          for (let seq = 0; seq < 30; seq += 1) {
            tx.objectStore('fixes').put({
              recordingId: 'eeeeeeee-0000-4000-8000-0000000000c2',
              seq,
              time: startedAt + seq * 2000,
              lng: 121.05,
              lat: 14.7 + (seq * 8) / 111_320,
              accuracyM: 5,
            });
          }
          tx.oncomplete = () => {
            open.result.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    [key, stored],
  );

{
  // A phone that kept a session Para no longer renews (the account deleted, or signed out on
  // another phone), and a recording waiting to go. Nothing may leave before Para has said who
  // this is, and nothing under a user that is not an account.
  const GONE_ID = 'dddddddd-0000-4000-8000-0000000000c1';
  const { page, context, fake, errors } = await signedInPhone({ storedSession: null });
  await SCREENS.signIn(page).waitFor({ timeout: 15000 });
  await keepOnPhone(page, AUTH_KEY, {
    ...session(GONE_ID, { email: 'gone2@example.com', isAccount: true }),
    expires_at: Math.floor(Date.now() / 1000) - 3600,
  });
  // Para's answer to the renewal is held while the page opens on the stored session, with
  // Start and the recording waiting; then it comes: no such session.
  const renewals = [];
  let noteRenewal = () => undefined;
  const isRenewing = new Promise((resolve) => {
    noteRenewal = resolve;
  });
  await page.route('**/auth/v1/token**', (route) => {
    renewals.push(route);
    noteRenewal();
  });
  await page.reload({ waitUntil: 'load' });
  await SCREENS.start(page).waitFor({ timeout: 15000 });
  await isRenewing;
  // Meanwhile History lists the recording as on the phone: no send has begun on the stored
  // session.
  await page
    .getByRole('navigation', { name: 'Screens' })
    .getByRole('button', { name: 'History' })
    .click();
  const card = page.getByRole('listitem').filter({ hasText: 'Fairview' });
  await card.waitFor({ timeout: 15000 });
  const whileUnsure = (await card.innerText()).replace(/\s+/g, ' ');
  await page.unroute('**/auth/v1/token**');
  for (const route of renewals) {
    await route.fulfill({
      status: 400,
      contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*' },
      body: JSON.stringify({
        code: 400,
        error_code: 'refresh_token_not_found',
        msg: 'Invalid Refresh Token: Refresh Token Not Found',
      }),
    });
  }
  await SCREENS.signIn(page).waitFor({ timeout: 15000 });
  // Everything the page set going has come back.
  await page.waitForLoadState('networkidle');
  check(
    'a session Para has not yet said is still there: its recording stays on the phone, not sending',
    whileUnsure.includes('Only on this phone') && !whileUnsure.includes('Sending'),
    whileUnsure,
  );
  check(
    '  Para says the session is gone: Sign in, and nothing was sent',
    fake.saveRequests === 0,
    `${fake.saveRequests} uploads`,
  );
  check('  nor any user made for it that is not an account', fake.signIns === 0, `${fake.signIns}`);
  check('  no page errors', errors.length === 0, errors.join(' | '));
  await context.close();
}

{
  // A connection that carries nothing back: every renewal of the session gets a 503, which
  // supabase-js keeps trying, so the check gives up (account.ts, 8 s) and the stored session
  // stands. Then Para says the session is gone: the page must see it once back online, not only
  // at its next opening. The page's clock is moved on rather than waited out.
  const LOST_ID = 'dddddddd-0000-4000-8000-0000000000d1';
  let renewals = 0;
  let noteRenewal = () => undefined;
  const isRenewing = new Promise((resolve) => {
    noteRenewal = resolve;
  });
  const { page, context, errors } = await signedInPhone({
    storedSession: {
      ...session(LOST_ID, { email: 'lost@example.com', isAccount: true }),
      expires_at: Math.floor(Date.now() / 1000) - 3600,
    },
    beforeOpen: async (opened) => {
      await opened.clock.install();
      await opened.route('**/auth/v1/token**', (route) => {
        renewals += 1;
        noteRenewal();
        return route.fulfill({
          status: 503,
          contentType: 'application/json',
          headers: { 'access-control-allow-origin': '*' },
          body: JSON.stringify({ code: 503, msg: 'Service Unavailable' }),
        });
      });
    },
  });
  await isRenewing;
  await SCREENS.start(page).waitFor({ timeout: 15000 });
  // Past the check's 8 s: it gives up, and the stored session stands.
  await page.clock.fastForward(9000);
  // Para answers the renewal now: no such session. supabase-js's next try hears it.
  await page.unroute('**/auth/v1/token**');
  const isGone = page
    .waitForResponse(
      (response) => response.url().includes('/auth/v1/token') && response.status() === 400,
      { timeout: 15000 },
    )
    .then(
      () => true,
      () => false,
    );
  await page.clock.fastForward(30_000);
  const isGoneHeard = await isGone;
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => resolve())));
  const isStartStill = (await SCREENS.start(page).count()) === 1;
  // The signal back, as the phone tells the page (its offline and online events; turning the
  // browser's own network off would also cut short the page's fetches of its code).
  await page.evaluate(() => {
    window.dispatchEvent(new Event('offline'));
    window.dispatchEvent(new Event('online'));
  });
  const isSignInShown = await SCREENS.signIn(page)
    .waitFor({ timeout: 15000 })
    .then(
      () => true,
      () => false,
    );
  check(
    'the check gives up and the stored session stands; back online, the session gone: Sign in',
    isGoneHeard && isStartStill && isSignInShown && (await SCREENS.start(page).count()) === 0,
    JSON.stringify({ renewals, isGoneHeard, isStartStill, isSignInShown }),
  );
  check('  no page errors', errors.length === 0, errors.join(' | '));
  await context.close();
}

{
  // Offline overnight: the session's token has run out and cannot be renewed for want of signal.
  // A recording waiting to go waits for the signal; it is not "signed out", and the page stays.
  const NIGHT_ID = 'dddddddd-0000-4000-8000-0000000000e1';
  const { page, context, fake, errors } = await signedInPhone({ storedSession: null });
  fake.users.set(NIGHT_ID, {
    email: 'night@example.com',
    password: 'hunter2hunter2',
    isAccount: true,
    profile: { name: 'Night', phone: '+639171234567' },
  });
  await SCREENS.signIn(page).waitFor({ timeout: 15000 });
  await keepOnPhone(page, AUTH_KEY, {
    ...session(NIGHT_ID, { email: 'night@example.com', isAccount: true }),
    expires_at: Math.floor(Date.now() / 1000) - 3600,
  });
  await page.clock.install();
  fake.isOffline = true;
  await page.reload({ waitUntil: 'load' });
  await SCREENS.start(page).waitFor({ timeout: 15000 });
  // The check gives up (8 s), and supabase-js's renewal tries give up (30 s): moved on, not waited.
  await page.clock.fastForward(9000);
  await page.clock.fastForward(31_000);
  await page
    .getByRole('navigation', { name: 'Screens' })
    .getByRole('button', { name: 'History' })
    .click();
  const card = page.getByRole('listitem').filter({ hasText: 'Fairview' });
  await card.getByText('Waiting for signal').waitFor({ timeout: 15000 });
  check(
    'offline with an expired token, a recording waiting says Waiting for signal, not Signed out',
    !(await card.innerText()).includes('Signed out') && (await SCREENS.signIn(page).count()) === 0,
    (await card.innerText()).replace(/\s+/g, ' '),
  );
  check('  nothing was sent, and no user made', fake.saveRequests === 0 && fake.signIns === 0);
  check('  no page errors', errors.length === 0, errors.join(' | '));
  await context.close();
}

{
  // Signed in and confirmed, a recording's first send lost to no signal; then the session is gone
  // from the phone (signed out in another tab). The send tried again finds no session: it sends
  // nothing and makes no user, and the page asks for Sign in.
  const TAB_ID = 'dddddddd-0000-4000-8000-0000000000f1';
  const { page, context, fake, errors } = await signedInPhone({ storedSession: null });
  fake.users.set(TAB_ID, {
    email: 'tab@example.com',
    password: 'hunter2hunter2',
    isAccount: true,
    profile: { name: 'Tab', phone: '+639171234567' },
  });
  await SCREENS.signIn(page).waitFor({ timeout: 15000 });
  await keepOnPhone(page, AUTH_KEY, session(TAB_ID, { email: 'tab@example.com', isAccount: true }));
  fake.next.save = 'offline';
  const firstSend = page.waitForEvent('requestfailed', (request) =>
    request.url().includes('save_contribution'),
  );
  await page.reload({ waitUntil: 'load' });
  await SCREENS.start(page).waitFor({ timeout: 15000 });
  await firstSend;
  const sendsBefore = fake.saveRequests;
  await page.evaluate((key) => localStorage.removeItem(key), AUTH_KEY);
  // Back online: the send waiting for signal is tried again.
  await page.evaluate(() => {
    window.dispatchEvent(new Event('offline'));
    window.dispatchEvent(new Event('online'));
  });
  await SCREENS.signIn(page).waitFor({ timeout: 15000 });
  check(
    'a send finding the session gone sends nothing more, makes no user, and the page asks for Sign in',
    fake.saveRequests === sendsBefore && fake.signIns === 0,
    JSON.stringify({ sendsBefore, after: fake.saveRequests, signIns: fake.signIns }),
  );
  check('  no page errors', errors.length === 0, errors.join(' | '));
  await context.close();
}

{
  // Another tab signs this phone in to another account. Back in this one, the session is asked
  // again as the page comes back to the front: what was kept for the last account must go with it.
  const FIRST_ID = 'dddddddd-0000-4000-8000-0000000000a7';
  const NEXT_ID = 'dddddddd-0000-4000-8000-0000000000b7';
  const { page, context, fake, errors } = await signedInPhone({
    storedSession: session(FIRST_ID, { email: 'first@example.com', isAccount: true }),
    beforeOpen: async (opened, stand) => {
      stand.users.set(FIRST_ID, {
        email: 'first@example.com',
        password: 'hunter2hunter2',
        isAccount: true,
        profile: { name: 'First Rider', phone: '+639171234567' },
      });
      stand.users.set(NEXT_ID, {
        email: 'next@example.com',
        password: 'hunter2hunter2',
        isAccount: true,
        profile: { name: 'Next Rider', phone: '+639171234568' },
      });
    },
  });
  const tabs = page.getByRole('navigation', { name: 'Screens' });
  await SCREENS.start(page).waitFor({ timeout: 15000 });
  await tabs.getByRole('button', { name: 'Account' }).click();
  await page.getByText('First Rider', { exact: true }).waitFor({ timeout: 15000 });
  await tabs.getByRole('button', { name: 'Record' }).click();
  await SCREENS.start(page).waitFor();
  // The other tab: signed out there, and signed in to the next account.
  const other = await context.newPage();
  await nodeFetch(other);
  await bareStyle(other);
  const otherFake = await fakeContributions(other);
  otherFake.users = fake.users;
  await fakeTurnstile(other);
  await other.goto(`${BASE}/contribute/`, { waitUntil: 'load' });
  await SCREENS.start(other).waitFor({ timeout: 15000 });
  await signOut(other);
  await SCREENS.signIn(other).waitFor({ timeout: 15000 });
  await field(other, 'Email').fill('next@example.com');
  await field(other, 'Password').fill('hunter2hunter2');
  await other.getByRole('button', { name: 'Sign in', exact: true }).click();
  await SCREENS.start(other).waitFor({ timeout: 15000 });
  await other.close();
  // Back to this tab, as the phone tells the page (visibilitychange, which reaches the window;
  // a headless browser has no tabs to bring forward).
  await page.evaluate(() =>
    document.dispatchEvent(new Event('visibilitychange', { bubbles: true })),
  );
  await tabs.getByRole('button', { name: 'Account' }).click();
  await page.getByText('next@example.com', { exact: true }).waitFor({ timeout: 15000 });
  await page
    .getByText('Next Rider', { exact: true })
    .waitFor({ timeout: 15000 })
    .catch(() => {});
  check(
    "the session found to be another account's, Account shows that account, none of the last one's",
    (await page.getByText('Next Rider', { exact: true }).count()) === 1 &&
      (await page.getByText('First Rider', { exact: true }).count()) === 0,
    (await page.locator('[data-screen-hash="#profile"]').innerText()).slice(0, 120),
  );
  check('  no request the stand-in does not know', fake.unknown.length === 0, fake.unknown.join());
  check('  no page errors', errors.length === 0, errors.join(' | '));
  await context.close();
}

await browser.close();
tally();
