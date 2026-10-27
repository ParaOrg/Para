// Turnstile on the studio's Auth requests: Sign in, Forgot password and the
// current-password check of Change password each carry a token, a fresh one
// every time (Supabase accepts a token once), and Sign in waits for the check.
// Cloudflare's script and Supabase Auth are stand-ins: no request leaves.
//
//   VITE_TURNSTILE_SITE_KEY=1x00000000000000000000AA npx vite --port 5176   (in another terminal)
//   PARA_BASE=http://localhost:5176 node tests/e2e/turnstile-test.mjs
import { chromium } from 'playwright';

import { BASE, harness } from './lib/harness.mjs';

const { check, tally } = harness();
const EMAIL = 'editor@para.test';

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
const session = () => ({
  access_token: 'editor-token',
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  refresh_token: 'editor-refresh',
  user: {
    id: '00000000-0000-0000-0000-0000000000e1',
    aud: 'authenticated',
    role: 'authenticated',
    email: EMAIL,
    app_metadata: {},
    user_metadata: {},
  },
});
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
        ? json(200, session())
        : json(400, {
            error: 'invalid_grant',
            error_description: 'Invalid login credentials',
            msg: 'Invalid login credentials',
          });
    }
    if (url.pathname === '/auth/v1/recover') return json(200, {});
    if (url.pathname === '/auth/v1/user') return json(200, session().user);
    return json(200, {});
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
