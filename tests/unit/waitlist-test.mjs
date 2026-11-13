// The waitlist Edge Function (supabase/functions/waitlist/handler.ts), with a fake fetch in place
// of Cloudflare, the database and Resend: a failed bot check saves nothing and sends nothing, an
// email already listed sends no second message and answers as a new one does, a new email is saved
// in lower case and gets exactly one message, a failed send still answers ok, and a bot check or a
// database that cannot be reached is answered and never thrown. Then it pins that
// /app/'s form posts to the project and uses the bot-check key .env.production names.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/waitlist-test.mjs
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { handle } from '../../supabase/functions/waitlist/handler.ts';

const env = {
  supabaseUrl: 'https://project.example',
  secretKey: 'secret-key',
  turnstileSecret: 'turnstile-secret',
  resendKey: 'resend-key',
  from: 'Para <hello@para-commute.org>',
};
const json = (body, status = 200) => new Response(JSON.stringify(body), { status });

/** A fetch that answers by host and keeps every call it got. */
function fake({
  human = true,
  saved = [{ email: 'x' }],
  savedStatus = 201,
  mailStatus = 200,
  unreachable = '',
} = {}) {
  const calls = [];
  const send = async (url, init) => {
    calls.push({ url: String(url), init });
    if (unreachable && String(url).includes(unreachable)) throw new TypeError('fetch failed');
    if (String(url).includes('turnstile')) return json({ success: human });
    if (String(url).includes('/rest/v1/waitlist')) return json(saved, savedStatus);
    return json({ id: 'sent' }, mailStatus);
  };
  return { calls, send, to: (part) => calls.filter((call) => call.url.includes(part)) };
}
const post = (body) =>
  new Request('https://project.example/functions/v1/waitlist', {
    method: 'POST',
    body: JSON.stringify(body),
  });

test('a new email is saved in lower case and gets one message', async () => {
  const net = fake();
  const response = await handle(post({ email: ' Ana@Example.com ', token: 't' }), env, net.send);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), '*');

  assert.equal(net.to('turnstile')[0].init.body.get('response'), 't');
  assert.equal(net.to('turnstile')[0].init.body.get('secret'), 'turnstile-secret');
  const [save] = net.to('/rest/v1/waitlist');
  assert.deepEqual(JSON.parse(save.init.body), { email: 'ana@example.com' });
  assert.equal(save.init.headers.apikey, 'secret-key');
  assert.equal(save.init.headers.Authorization, undefined);
  assert.match(save.init.headers.Prefer, /ignore-duplicates/);
  const mails = net.to('api.resend.com');
  assert.equal(mails.length, 1);
  assert.equal(mails[0].init.headers.Authorization, 'Bearer resend-key');
  const mail = JSON.parse(mails[0].init.body);
  assert.deepEqual(mail.to, ['ana@example.com']);
  assert.equal(mail.from, env.from);
});

test('an email already on the list gets no second message and the same answer', async () => {
  const net = fake({ saved: [], savedStatus: 200 });
  const response = await handle(post({ email: 'ana@example.com', token: 't' }), env, net.send);
  assert.deepEqual([response.status, await response.json()], [200, { ok: true }]);
  assert.equal(net.to('api.resend.com').length, 0);
});

test('a failed bot check saves nothing and sends nothing', async () => {
  const net = fake({ human: false });
  const response = await handle(post({ email: 'ana@example.com', token: 'bad' }), env, net.send);
  assert.deepEqual([response.status, await response.json()], [403, { error: 'check' }]);
  assert.equal(net.calls.length, 1);
});

test('what is not an email is refused before any call, and so is what the table refuses', async () => {
  const none = fake();
  for (const body of [{ email: 'no-at-sign', token: 't' }, { token: 't' }, 'not json']) {
    const response = await handle(post(body), env, none.send);
    assert.deepEqual([response.status, await response.json()], [400, { error: 'email' }]);
  }
  assert.equal(none.calls.length, 0);

  const refused = fake({ saved: { code: '23514' }, savedStatus: 400 });
  const response = await handle(post({ email: 'a b@example.com', token: 't' }), env, refused.send);
  assert.deepEqual([response.status, await response.json()], [400, { error: 'email' }]);
  assert.equal(refused.to('api.resend.com').length, 0);
});

test('a database that is down says try later, and a failed send still answers ok', async () => {
  const quiet = console.error;
  console.error = () => {};
  try {
    const down = fake({ saved: {}, savedStatus: 503 });
    const later = await handle(post({ email: 'ana@example.com', token: 't' }), env, down.send);
    assert.deepEqual([later.status, await later.json()], [502, { error: 'later' }]);
    assert.equal(down.to('api.resend.com').length, 0);

    const unsent = fake({ mailStatus: 429 });
    const response = await handle(post({ email: 'ana@example.com', token: 't' }), env, unsent.send);
    assert.deepEqual([response.status, await response.json()], [200, { ok: true }]);
  } finally {
    console.error = quiet;
  }
});

test('a bot check or a database that cannot be reached still gets a readable answer', async () => {
  const quiet = console.error;
  console.error = () => {};
  try {
    const unchecked = fake({ unreachable: 'turnstile' });
    const refused = await handle(
      post({ email: 'ana@example.com', token: 't' }),
      env,
      unchecked.send,
    );
    assert.deepEqual([refused.status, await refused.json()], [403, { error: 'check' }]);
    assert.equal(unchecked.calls.length, 1);

    const unsaved = fake({ unreachable: '/rest/v1/waitlist' });
    const later = await handle(post({ email: 'ana@example.com', token: 't' }), env, unsaved.send);
    assert.deepEqual([later.status, await later.json()], [502, { error: 'later' }]);
    assert.equal(later.headers.get('Access-Control-Allow-Origin'), '*');
    assert.equal(unsaved.to('api.resend.com').length, 0);
  } finally {
    console.error = quiet;
  }
});

test('the browser may ask first, and only a POST is taken', async () => {
  const net = fake();
  const url = 'https://project.example/functions/v1/waitlist';
  const asked = await handle(new Request(url, { method: 'OPTIONS' }), env, net.send);
  assert.equal(asked.status, 204);
  assert.match(asked.headers.get('Access-Control-Allow-Methods'), /POST/);
  assert.equal((await handle(new Request(url), env, net.send)).status, 405);
  assert.equal(net.calls.length, 0);
});

test("/app/'s form posts to the project and uses the bot-check key .env.production names", () => {
  const page = readFileSync(new URL('../../public/app/index.html', import.meta.url), 'utf8');
  const production = readFileSync(new URL('../../.env.production', import.meta.url), 'utf8');
  const named = (key) => production.match(new RegExp(`^${key}=(.+)$`, 'm'))[1].trim();
  assert.ok(page.includes(`${named('VITE_SUPABASE_URL')}/functions/v1/waitlist`));
  assert.ok(page.includes(`data-sitekey="${named('VITE_TURNSTILE_SITE_KEY')}"`));
});
