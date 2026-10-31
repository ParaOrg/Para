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

import { fakeContributions } from './lib/fake-contributions.mjs';
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

/** Signs out through Account's Logout, and the sheet's Log out. */
async function signOut(page) {
  await page
    .getByRole('navigation', { name: 'Screens' })
    .getByRole('button', { name: 'Account' })
    .click();
  await page.getByRole('button', { name: 'Logout' }).click();
  await page
    .getByRole('alertdialog', { name: 'Log out?' })
    .getByRole('button', { name: 'Log out' })
    .click();
}

// ------------------------------------------------ no account: only Sign in
{
  const { page, fake, errors } = await phone();
  await SCREENS.signIn(page).waitFor({ timeout: 30000 });
  await shot(page, '1-sign-in');
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
  await setOffline(context, fake, true);
  const signedOut = await page.evaluate(() =>
    import('/src/features/contribute/api/account.ts')
      .then((account) => account.signOut())
      .then(
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

await browser.close();
tally();
