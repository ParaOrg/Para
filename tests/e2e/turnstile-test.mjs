// Turnstile on the studio's Auth requests: Sign in, Forgot password and the
// current-password check of Change password each carry a token, a fresh one
// every time (Supabase accepts a token once), and Sign in waits for the check.
// And who gets in: an account am_i_editor says no for (a contributor's) is
// told so, sees no editing tool, and is signed out of the studio only, whether
// it signed in or its session was restored; an editor signs in as before.
// Cloudflare's script, Supabase Auth and the database are stand-ins: no request leaves.
//
//   VITE_TURNSTILE_SITE_KEY=1x00000000000000000000AA npx vite --port 5176   (in another terminal)
//   PARA_BASE=http://localhost:5176 node tests/e2e/turnstile-test.mjs
import { chromium } from 'playwright';

import { BASE, harness } from './lib/harness.mjs';

const { check, tally } = harness();
const EMAIL = 'editor@para.test';
const EDITOR_ID = '00000000-0000-0000-0000-0000000000e1';
const CONTRIBUTOR_EMAIL = 'contributor@para.test';
const CONTRIBUTOR_ID = '00000000-0000-0000-0000-0000000000c1';
/** The studio's own session, in its own storage key; the contributor page keeps another. */
const STUDIO_KEY = 'sb-smzwbqxttdyvohuizynl-auth-token';
const CONTRIBUTOR_PAGE_KEY = 'para.contributor-auth';

// Cloudflare's script, standing in: each widget passes after a moment with a token of its own.
const FAKE_TURNSTILE = `
  let n = 0;
  window.turnstile = {
    render(el, o) {
      const id = 'w' + ++n;
      el.textContent = 'Turnstile stand-in ' + id;
      setTimeout(() => o.callback('token-' + id), 300);
      return id;
    },
    remove() {},
  };
`;

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await context.newPage();
const shot = (name) =>
  process.env.PARA_SHOTS
    ? page.screenshot({ path: `${process.env.PARA_SHOTS}/${name}.png` })
    : null;
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));

let scriptLoads = 0;
await page.route(/^https:\/\/challenges\.cloudflare\.com\//, (route) => {
  scriptLoads += 1;
  return route.fulfill({ status: 200, contentType: 'text/javascript', body: FAKE_TURNSTILE });
});

/** Every Auth request: its path and the captcha token it carried. */
const auth = [];
let isPasswordRight = false;
/** Which account the password grant signs in: the email typed. */
const idOf = (email) => (email === CONTRIBUTOR_EMAIL ? CONTRIBUTOR_ID : EDITOR_ID);
const session = (id = EDITOR_ID) => ({
  access_token: `token-for-${id}`,
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  refresh_token: `refresh-for-${id}`,
  user: {
    id,
    aud: 'authenticated',
    role: 'authenticated',
    email: id === CONTRIBUTOR_ID ? CONTRIBUTOR_EMAIL : EMAIL,
    app_metadata: {},
    user_metadata: {},
  },
});
/** Every am_i_editor question: the account that asked. */
const asked = [];
await page.route(/^https:\/\/[^/]+\.supabase\.co\//, async (route) => {
  const request = route.request();
  const url = new URL(request.url());
  const json = (status, body) =>
    route.fulfill({
      status,
      contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*' },
      body: JSON.stringify(body),
    });
  if (request.method() === 'OPTIONS') {
    return route.fulfill({
      status: 204,
      headers: {
        'access-control-allow-origin': '*',
        'access-control-allow-headers': '*',
        'access-control-allow-methods': '*',
      },
    });
  }
  if (url.pathname.startsWith('/auth/v1/')) {
    const body = request.postDataJSON() ?? {};
    auth.push({
      path: `${url.pathname}${url.search}`,
      token: body.gotrue_meta_security?.captcha_token ?? null,
    });
    if (url.pathname === '/auth/v1/token' && url.searchParams.get('grant_type') === 'password') {
      return isPasswordRight
        ? json(200, session(idOf(body.email)))
        : json(400, {
            error: 'invalid_grant',
            error_description: 'Invalid login credentials',
            msg: 'Invalid login credentials',
          });
    }
    if (url.pathname === '/auth/v1/recover') return json(200, {});
    const caller = (request.headers().authorization ?? '').replace(/^Bearer token-for-/, '');
    if (url.pathname === '/auth/v1/user') return json(200, session(caller || EDITOR_ID).user);
    if (url.pathname === '/auth/v1/logout') return route.fulfill({ status: 204 });
    return json(200, {});
  }
  // 20261030090000: about the caller alone; only the editor is on the list.
  if (url.pathname === '/rest/v1/rpc/am_i_editor') {
    const caller = (request.headers().authorization ?? '').replace(/^Bearer token-for-/, '');
    asked.push(caller);
    return json(200, caller === EDITOR_ID);
  }
  // The studio's data, empty: this suite is about signing in.
  if (request.method() === 'GET') return json(200, []);
  return json(200, {});
});

await page.goto(`${BASE}/studio/`, { waitUntil: 'load' });
await page.getByText('Sign in to Para Studio').waitFor({ timeout: 30000 });
const signIn = page.locator('button[type="submit"]');
await page.getByPlaceholder('you@example.com').fill(EMAIL);
await page.getByPlaceholder('Password').fill('wrong');
check('Sign in waits for the check before it can be pressed', await signIn.isDisabled());
await page.getByText(/Turnstile stand-in w1/).waitFor();
await page.waitForFunction(() => !document.querySelector('button[type="submit"]')?.disabled);
check(
  '  the check passes and Sign in can be pressed; the script was loaded once',
  scriptLoads === 1,
);

await signIn.click();
await page.getByText('That email and password do not match an account.').waitFor();
check(
  'a refused sign-in carried the token',
  auth.at(-1)?.token === 'token-w1',
  JSON.stringify(auth.at(-1)),
);
await page.getByText(/Turnstile stand-in w2/).waitFor();
await page.waitForFunction(() => !document.querySelector('button[type="submit"]')?.disabled);
isPasswordRight = true;
await page.getByPlaceholder('Password').fill('right');
await signIn.click();
await page.getByRole('button', { name: 'Password', exact: true }).waitFor({ timeout: 20000 });
const passwordGrants = auth.filter((a) => a.path.includes('grant_type=password'));
check(
  '  the next try carried a new token, never the spent one, and signed in',
  passwordGrants.length === 2 && passwordGrants[1].token === 'token-w2',
  passwordGrants.map((a) => a.token).join(', '),
);
check(
  '  an editor: the studio asked am_i_editor for them, and let them in',
  asked.includes(EDITOR_ID),
  JSON.stringify(asked),
);

await page.getByRole('button', { name: 'Password', exact: true }).click();
await page.getByText('Change password').waitFor();
await page
  .locator('form')
  .getByText(/Turnstile stand-in w\d+/)
  .waitFor();
const fields = page.locator('form input[type="password"]');
await fields.nth(0).fill('right');
await fields.nth(1).fill('A-new-password-2026!');
await fields.nth(2).fill('A-new-password-2026!');
await page.waitForFunction(() => !document.querySelector('form button[type="submit"]')?.disabled);
await page.locator('form button[type="submit"]').click();
await page.getByText('Password changed').waitFor({ timeout: 15000 });
check(
  "Change password's current-password check carried a token of its own",
  (() => {
    const grants = auth.filter((a) => a.path.includes('grant_type=password'));
    const last = grants.at(-1)?.token;
    return grants.length === 3 && !!last && grants.slice(0, -1).every((g) => g.token !== last);
  })(),
);
await page.getByRole('button', { name: 'Done' }).click();

// An account that is not an editor (a contributor's), signing in at the door.
await page.evaluate(
  ([key]) => {
    localStorage.clear();
    localStorage.setItem(key, JSON.stringify({ kept: 'the contributor page' }));
  },
  [CONTRIBUTOR_PAGE_KEY],
);
await page.reload({ waitUntil: 'load' });
await page.getByText('Sign in to Para Studio').waitFor({ timeout: 30000 });
await page.getByPlaceholder('you@example.com').fill(CONTRIBUTOR_EMAIL);
await page.getByPlaceholder('Password').fill('right');
await page.waitForFunction(() => !document.querySelector('button[type="submit"]')?.disabled);
const logoutsBefore = auth.filter((a) => a.path.startsWith('/auth/v1/logout')).length;
await signIn.click();
const notEditor = page.getByRole('heading', { name: "This account isn't an editor" });
await notEditor.waitFor({ timeout: 20000 });
await shot('not-editor');
check(
  'a contributor account is told it is not an editor, focus on the heading',
  await notEditor.evaluate((el) => el === document.activeElement),
);
check(
  "  in the owner's words, with the contributor page and another sign-in",
  (await page
    .getByText(
      "Para Studio is for the people who draw the routes. You signed in with a contributor account, so you can't make changes here.",
    )
    .count()) === 1 &&
    (await page.getByRole('link', { name: 'Open the contributor page' }).getAttribute('href')) ===
      '/contribute/' &&
    (await page.getByRole('button', { name: 'Sign in with another account' }).count()) === 1,
);
const editingTools = () =>
  Promise.all([
    page.getByRole('button', { name: 'New route, terminal or hintuan' }).count(),
    page.getByRole('button', { name: 'Password', exact: true }).count(),
    page.locator('canvas.maplibregl-canvas').count(),
  ]).then((counts) => counts.reduce((a, b) => a + b, 0));
check('  and sees no editing tool, no account pill and no map', (await editingTools()) === 0);
const stored = () =>
  page.evaluate(
    ([a, b]) => [localStorage.getItem(a), localStorage.getItem(b)],
    [STUDIO_KEY, CONTRIBUTOR_PAGE_KEY],
  );
check(
  '  it is signed out of the studio, here only (scope local), the contributor page left signed in',
  await (async () => {
    await page.waitForFunction((key) => localStorage.getItem(key) === null, STUDIO_KEY);
    const [studio, contributorPage] = await stored();
    const logouts = auth.filter((a) => a.path.startsWith('/auth/v1/logout'));
    return (
      studio === null &&
      contributorPage !== null &&
      logouts.length === logoutsBefore + 1 &&
      logouts.at(-1).path.includes('scope=local')
    );
  })(),
  JSON.stringify({
    stored: await stored(),
    logouts: auth.filter((a) => a.path.startsWith('/auth/v1/logout')),
  }),
);
for (let i = 0; i < 4; i += 1) await page.keyboard.press('Tab');
check(
  '  focus stays in the notice: the page behind it is inert',
  await page.evaluate(() => !!document.activeElement?.closest('dialog[open]')),
);
await page.getByRole('button', { name: 'Sign in with another account' }).click();
check(
  '  Sign in with another account comes back to the door',
  (await page.getByText('Sign in to Para Studio').count()) === 1 && (await notEditor.count()) === 0,
);

// The same account's session, restored on load: turned away the same way.
await page.evaluate(
  ([key, s]) => localStorage.setItem(key, JSON.stringify(s)),
  [STUDIO_KEY, session(CONTRIBUTOR_ID)],
);
await page.reload({ waitUntil: 'load' });
await notEditor.waitFor({ timeout: 20000 });
check(
  "a contributor's session restored on load is turned away too, and never sees the workshop",
  (await editingTools()) === 0 &&
    (await page
      .waitForFunction((key) => localStorage.getItem(key) === null, STUDIO_KEY)
      .then(() => true)),
);

// From inside the workshop: an editor's session ends there (Sign out), the workshop stays,
// and a contributor's account signs in from its own Sign in dialog.
await page.evaluate(
  ([key, s]) => localStorage.setItem(key, JSON.stringify(s)),
  [STUDIO_KEY, session(EDITOR_ID)],
);
await page.reload({ waitUntil: 'load' });
await page.getByRole('button', { name: 'Sign out' }).click({ timeout: 20000 });
await page.getByRole('button', { name: 'Sign in', exact: true }).click({ timeout: 20000 });
const dialogSubmit = page.locator('form button[type="submit"]');
await page.getByPlaceholder('you@example.com').fill(CONTRIBUTOR_EMAIL);
await page.getByPlaceholder('Password').fill('right');
await page.waitForFunction(() => !document.querySelector('form button[type="submit"]')?.disabled);
await dialogSubmit.click();
await notEditor.waitFor({ timeout: 20000 });
check(
  "from the workshop's Sign in, a contributor account is turned away the same way, signed out",
  await page
    .waitForFunction((key) => localStorage.getItem(key) === null, STUDIO_KEY)
    .then(() => true),
);
await page.getByRole('button', { name: 'Sign in with another account' }).click();
await page.waitForFunction(
  () => !document.querySelector('form button[type="submit"]')?.disabled,
  null,
  { timeout: 20000 },
);
check(
  '  and its Sign in dialog is ready for another account, not stuck signing in',
  (await dialogSubmit.innerText()) === 'Sign in' && (await notEditor.count()) === 0,
  await dialogSubmit.innerText(),
);
await page.getByPlaceholder('you@example.com').fill(EMAIL);
await dialogSubmit.click();
await page.getByRole('button', { name: 'Sign out' }).waitFor({ timeout: 20000 });
check(
  '  where an editor then signs in, and the dialog closes',
  (await page.getByPlaceholder('you@example.com').count()) === 0,
);

// Forgot password, from a signed-out start.
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'load' });
await page.getByText('Sign in to Para Studio').waitFor({ timeout: 30000 });
await page.getByRole('button', { name: 'Forgot password?' }).click();
await page.getByPlaceholder('you@example.com').fill(EMAIL);
await page.waitForFunction(() => !document.querySelector('button[type="submit"]')?.disabled);
await page.locator('button[type="submit"]').click();
await page.waitForTimeout(500);
const recover = auth.filter((a) => a.path.startsWith('/auth/v1/recover'));
check(
  'Forgot password sent its reset with a token',
  recover.length === 1 && recover[0].token?.startsWith('token-w'),
  JSON.stringify(recover),
);

check('no page errors', errors.length === 0, errors.join(' | '));
await browser.close();
tally();
