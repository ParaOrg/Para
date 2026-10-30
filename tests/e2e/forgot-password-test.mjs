// The contributor page's "Forgot password", driven by a phone, in three steps: Sign in's button
// opens the email step; Verify sends a code and opens the code step, the same for an email with an
// account and one without; the code step shows the email masked, takes the 6-digit code (a wrong
// or old one refused in its own line) and resends; a right code opens the new-password step, which
// holds the page until Save, checks the two passwords match on the phone, and refuses the old
// password in its own line. Supabase is the in-memory stand-in (lib/fake-contributions.mjs):
// every request to *.supabase.co lands there, and one it does not know fails the run, so nothing
// reaches a real project.
//
//   cp .env.production .env.local && echo VITE_CONTRIBUTIONS=1 >> .env.local
//                                        (a project URL to stand in for, and uploads on)
//   npm run dev                          (in another terminal)
//   node tests/e2e/forgot-password-test.mjs
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
const RESENT = 'We sent a new code';
const EMAIL = 'juan@example.com';
const MASKED = 'Enter the verification code sent to j**n@example.com';
const OLD_PASSWORD = 'hunter2hunter2';
const NEW_PASSWORD = 'a-better-password';
const THIRD_PASSWORD = 'a-third-password';
const browser = await chromium.launch();

/** An account made elsewhere, as the database holds it. */
const accounts = new Map([
  [
    crypto.randomUUID(),
    {
      email: EMAIL,
      password: OLD_PASSWORD,
      isAccount: true,
      profile: { name: 'Juan dela Cruz', phone: '+639171234567' },
    },
  ],
]);

const ANON_ID = 'aaaaaaaa-0000-4000-8000-000000000001';

/**
 * A phone with nothing stored but its consent to the current text, and the stand-in Supabase. With
 * `anonymousWith` it already has its own anonymous user, and those uploads sent as it.
 */
async function phone({ users = accounts, anonymousWith = [] } = {}) {
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
  fake.users = users;
  if (anonymousWith.length) {
    users.set(ANON_ID, { email: null, password: null, isAccount: false, profile: null });
    for (const id of anonymousWith) fake.rows.set(id, { by: ANON_ID, recording: { id } });
    await page.addInitScript(
      ([key, anonymous]) => {
        if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(anonymous));
      },
      [AUTH_KEY, session(ANON_ID)],
    );
  }
  await fakeTurnstile(page);
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('seeded')) {
      localStorage.setItem('para.contribute.consent', '3');
      sessionStorage.setItem('seeded', 'yes');
    }
  });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`${BASE}/contribute/`, { waitUntil: 'load' });
  return { page, fake, errors };
}

const heading = (page, name) => page.getByRole('heading', { name, level: 1 });
const button = (page, name) => page.getByRole('button', { name, exact: true });
const field = (page, name) => page.getByLabel(name, { exact: true });
const start = (page) => page.getByRole('button', { name: 'Start recording' });
const alertText = (page) => page.getByRole('alert').innerText();
/** A new bot check is drawn after each send; its button is usable once it passes. */
const sendEnabled = (page, label) =>
  page.waitForFunction(
    (text) =>
      ![...document.querySelectorAll('button')].find((b) => b.textContent === text)?.disabled,
    label,
  );

async function openForgot(page) {
  await heading(page, 'Welcome Contributor').waitFor({ timeout: 30000 });
  await button(page, 'Forgot password').click();
  await heading(page, 'Forgot password').waitFor();
}

async function sendCode(page, email) {
  await field(page, 'Email').fill(email);
  await sendEnabled(page, 'Verify');
  await button(page, 'Verify').click();
  await heading(page, 'Enter the code').waitFor();
}

async function enterCode(page, code) {
  await field(page, 'Verification code').fill(code);
  await button(page, 'Verify').click();
}

async function savePassword(page, password, confirmation = password) {
  await field(page, 'New password').fill(password);
  await field(page, 'Confirm password').fill(confirmation);
  await button(page, 'Save').click();
}

const storedSession = (page) =>
  page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? 'null'), AUTH_KEY);

// ------------------------------------------------ the way in, and an email that has no account
{
  const { page, fake, errors } = await phone();
  await openForgot(page);
  await shot(page, '1-forgot-password');
  check(
    'Sign in has "Forgot password"; it opens a screen that asks for an email, and for nothing else',
    (await page.locator('input').count()) === 1 && (await field(page, 'Email').count()) === 1,
  );
  await sendEnabled(page, 'Verify');
  await button(page, 'Verify').click();
  check(
    '  Verify with nothing typed names what is missing and sends nothing',
    (await page.getByText('Enter a valid email').count()) === 1 && fake.recoveries === 0,
  );
  await sendCode(page, 'nobody@example.com');
  check(
    'an email with no account gets the same code step as one with an account, and no line',
    (await page.getByText('Enter the verification code sent to n****y@example.com').count()) ===
      1 &&
      fake.recoveries === 1 &&
      fake.codes.size === 0 &&
      (await page.getByRole('alert').count()) === 0,
  );
  check(
    '  the code step asks for the code, and for nothing else',
    (await page.locator('input').count()) === 1 &&
      (await field(page, 'Verification code').count()) === 1,
  );
  await enterCode(page, '123456');
  await page.getByRole('alert').waitFor();
  check(
    '  a code for it is refused in its own line, never "Wrong email or password"',
    (await alertText(page)) ===
      'That code is wrong or has expired. Check it, or send a new code.' &&
      (await start(page).count()) === 0,
    await alertText(page),
  );
  await button(page, 'Back').click();
  await heading(page, 'Forgot password').waitFor();
  check(
    '  Back from the code goes to the email, kept, with the line cleared',
    (await field(page, 'Email').inputValue()) === 'nobody@example.com' &&
      (await page.getByRole('alert').count()) === 0,
  );
  await button(page, 'Back').click();
  await heading(page, 'Welcome Contributor').waitFor();
  check('  and Back again goes to Sign in', (await field(page, 'Password').count()) === 1);
  check('  no request the stand-in does not know', fake.unknown.length === 0, fake.unknown.join());
  check('  no page errors', errors.length === 0, errors.join(' | '));
}

// ------------------------------------------------ an account: wrong code, resend, new password
{
  const { page, fake, errors } = await phone();
  await openForgot(page);
  await sendCode(page, ` ${EMAIL} `);
  const firstCode = fake.codes.get(EMAIL);
  check(
    'an email with an account is sent a 6-digit code, and the code step shows the email masked',
    /^[0-9]{6}$/.test(firstCode ?? '') &&
      fake.recoveries === 1 &&
      (await page.getByText(MASKED).count()) === 1,
    String(firstCode),
  );
  check(
    '  the bot check, when the build has a site key, went with the send',
    !process.env.PARA_TURNSTILE || /^token-/.test(String(fake.captchaTokens[0])),
    String(fake.captchaTokens[0]),
  );
  await shot(page, '2-enter-the-code');

  await enterCode(page, '12ab');
  check(
    '  a code that is not 6 digits is named, and nothing is sent',
    (await page.getByText('Enter the 6-digit code').count()) === 1 &&
      !fake.claims.includes('verify'),
  );

  await enterCode(page, '000000');
  await page.getByRole('alert').waitFor();
  check(
    '  a code that is not the one sent is refused in one line, and the old password stands',
    (await alertText(page)).startsWith('That code is wrong or has expired') &&
      accounts.values().next().value.password === OLD_PASSWORD,
    await alertText(page),
  );
  await shot(page, '3-code-rejected');

  await sendEnabled(page, 'Resend');
  await button(page, 'Resend').click();
  await page.getByText(RESENT).waitFor();
  const secondCode = fake.codes.get(EMAIL);
  check(
    '  Resend makes a new code, with a bot check of its own, says so, and clears the line',
    fake.recoveries === 2 &&
      secondCode !== firstCode &&
      (await page.getByRole('alert').count()) === 0 &&
      (!process.env.PARA_TURNSTILE || new Set(fake.captchaTokens.filter(Boolean)).size === 2),
    `${firstCode} → ${secondCode}`,
  );

  await enterCode(page, firstCode);
  await page.getByRole('alert').waitFor();
  check('  the earlier code no longer works', (await start(page).count()) === 0);

  await enterCode(page, secondCode);
  await heading(page, 'Enter new password').waitFor({ timeout: 15000 });
  await shot(page, '4-enter-new-password');
  check(
    'the right code opens the new password, with no way back, and holds the page there',
    (await button(page, 'Back').count()) === 0 &&
      (await start(page).count()) === 0 &&
      (await field(page, 'New password').count()) === 1 &&
      (await field(page, 'Confirm password').count()) === 1,
  );
  check(
    "  the code signed the phone in (the old password is still the account's until Save)",
    (await storedSession(page))?.user?.is_anonymous === false &&
      accounts.values().next().value.password === OLD_PASSWORD,
  );

  await savePassword(page, NEW_PASSWORD, `${NEW_PASSWORD}x`);
  check(
    '  two passwords that differ are named on the phone, and nothing is sent',
    (await page.getByText("The passwords don't match").count()) === 1 &&
      !fake.order.includes('update_password'),
    fake.order.join(),
  );
  await savePassword(page, 'short');
  check(
    '  a short password is named, and nothing is sent',
    (await page.getByText('Use at least 8 characters').count()) === 1 &&
      !fake.order.includes('update_password'),
  );

  await savePassword(page, NEW_PASSWORD);
  await start(page).waitFor({ timeout: 15000 });
  const [[id, account]] = [...accounts];
  const stored = await storedSession(page);
  check(
    'Save sets the new password and opens Ready, signed in to the same account',
    account.password === NEW_PASSWORD &&
      stored.user.id === id &&
      stored.user.is_anonymous === false &&
      fake.signIns === 0,
    JSON.stringify(stored.user),
  );
  check('  no request the stand-in does not know', fake.unknown.length === 0, fake.unknown.join());
  check('  no page errors', errors.length === 0, errors.join(' | '));
}

// ------------------------------------------------ the new password signs in; the old one does not
{
  const { page } = await phone();
  await heading(page, 'Welcome Contributor').waitFor({ timeout: 30000 });
  await field(page, 'Email').fill(EMAIL);
  await field(page, 'Password').fill(OLD_PASSWORD);
  await sendEnabled(page, 'Sign in');
  await button(page, 'Sign in').click();
  await page.getByRole('alert').waitFor();
  check('the old password is refused', (await alertText(page)) === 'Wrong email or password');
  await field(page, 'Password').fill(NEW_PASSWORD);
  await sendEnabled(page, 'Sign in');
  await button(page, 'Sign in').click();
  await start(page).waitFor({ timeout: 15000 });
  check('  the new one signs in', true);
}

// ------------------------------------------------ the same password, and too many sends
{
  const { page, fake } = await phone();
  await openForgot(page);
  await sendCode(page, EMAIL);
  await enterCode(page, fake.codes.get(EMAIL));
  await heading(page, 'Enter new password').waitFor({ timeout: 15000 });
  await savePassword(page, NEW_PASSWORD);
  await page.getByRole('alert').waitFor();
  check(
    'a new password that is the old one is refused in its own line, and the page stays on the step',
    (await alertText(page)) === "That's already your password. Choose a new one." &&
      (await start(page).count()) === 0 &&
      (await heading(page, 'Enter new password').count()) === 1,
    await alertText(page),
  );
  await shot(page, '5-same-password');
  await savePassword(page, THIRD_PASSWORD);
  await start(page).waitFor({ timeout: 15000 });
  check(
    '  another password then saves, and opens Ready',
    accounts.values().next().value.password === THIRD_PASSWORD,
  );
  check('  no request the stand-in does not know', fake.unknown.length === 0, fake.unknown.join());
}
{
  const { page, fake } = await phone();
  await openForgot(page);
  fake.next.recover = 'rateLimit';
  await sendCode(page, EMAIL);
  check(
    "the cool-down's answer is said as a send, so it gives away no account: the code step, no line",
    (await page.getByText(MASKED).count()) === 1 && (await page.getByRole('alert').count()) === 0,
  );
  check('  no request the stand-in does not know', fake.unknown.length === 0, fake.unknown.join());
}

// ------------------------------------------------ a phone with uploads of its own claims them first
for (const isSamePassword of [false, true]) {
  const users = new Map([
    [
      crypto.randomUUID(),
      {
        email: EMAIL,
        password: OLD_PASSWORD,
        isAccount: true,
        profile: { name: 'Juan dela Cruz', phone: '+639171234567' },
      },
    ],
  ]);
  const [[accountId]] = [...users];
  const { page, fake } = await phone({ users, anonymousWith: ['up-1', 'up-2'] });
  await openForgot(page);
  await sendCode(page, EMAIL);
  await enterCode(page, fake.codes.get(EMAIL));
  await heading(page, 'Enter new password').waitFor({ timeout: 15000 });
  await savePassword(page, isSamePassword ? OLD_PASSWORD : NEW_PASSWORD);
  if (isSamePassword) await page.getByRole('alert').waitFor();
  else await start(page).waitFor({ timeout: 15000 });
  const owners = [...fake.rows.values()].map((row) => row.by);
  check(
    isSamePassword
      ? 'with the same password refused, the claim had already finished with the code'
      : 'on a phone with uploads of its own: begin_claim, the code, finish_claim, then the password',
    fake.order.join() === 'begin_claim,verify,finish_claim,update_password',
    fake.order.join(),
  );
  check(
    "  the uploads are the account's, and none stays on the anonymous user",
    owners.length === 2 && owners.every((by) => by === accountId),
    owners.join(),
  );
  check('  no request the stand-in does not know', fake.unknown.length === 0, fake.unknown.join());
}

await browser.close();
tally();
