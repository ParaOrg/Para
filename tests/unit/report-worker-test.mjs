// The site Worker's /api/report handler and its Turnstile check, with the rate limit, Turnstile and
// the database stood in for.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/report-worker-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { handleReport, MAX_BODY_BYTES } from '../../workers/site/src/report.ts';
import { isTurnstileVerified } from '../../workers/site/src/turnstile.ts';

const ROUTE = '7e7e7e90-0000-4000-8000-0000000000b1';
const REPORT = { routeId: ROUTE, kind: 'wrong_fare', note: ' Now 15. ', turnstileToken: 'token-1' };

/** Deps that let everything through and record what reached them. */
function deps(overrides = {}) {
  const seen = { submitted: [], tokens: [], limited: 0 };
  return {
    seen,
    isAllowed: async () => {
      seen.limited += 1;
      return true;
    },
    isVerified: async (token) => {
      seen.tokens.push(token);
      return true;
    },
    submit: async (report) => {
      seen.submitted.push(report);
      return 'sent';
    },
    ...overrides,
  };
}

const post = (body, headers = { 'content-type': 'application/json' }) =>
  new Request('https://para.example/api/report', {
    method: 'POST',
    headers,
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

const codeOf = async (response) => (await response.json()).code;

test('a good report is verified, sent without its token, and answered 201 sent', async () => {
  const d = deps();
  const response = await handleReport(post(REPORT), d);
  assert.equal(response.status, 201);
  assert.equal(await codeOf(response), 'sent');
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(d.seen.tokens, ['token-1']);
  assert.deepEqual(d.seen.submitted, [{ routeId: ROUTE, kind: 'wrong_fare', note: 'Now 15.' }]);
});

test('only a POST of JSON is read', async () => {
  const d = deps();
  const get = await handleReport(new Request('https://para.example/api/report'), d);
  assert.equal(get.status, 405);
  assert.equal(get.headers.get('allow'), 'POST');
  const form = await handleReport(post('kind=other', { 'content-type': 'text/plain' }), d);
  assert.equal(form.status, 415);
  assert.equal(d.seen.limited, 0);
  assert.equal(d.seen.submitted.length, 0);
});

test('over the rate limit: 429 too_many, before the body is read or Turnstile asked', async () => {
  const d = deps({ isAllowed: async () => false });
  const response = await handleReport(post(REPORT), d);
  assert.equal(response.status, 429);
  assert.equal(await codeOf(response), 'too_many');
  assert.equal(response.headers.get('retry-after'), '60');
  assert.deepEqual(d.seen.tokens, []);
});

test('a body far larger than a report is refused unread', async () => {
  const d = deps();
  const big = { ...REPORT, note: 'x'.repeat(MAX_BODY_BYTES) };
  assert.equal((await handleReport(post(big), d)).status, 413);
  assert.deepEqual(d.seen.tokens, []);
});

test('what is not a report is 400 bad_request, and Turnstile is not asked', async () => {
  const d = deps();
  for (const body of [
    '{not json',
    { ...REPORT, kind: 'wrong_path' },
    { ...REPORT, routeId: 'r1' },
    { ...REPORT, kind: 'other', note: '  ' },
    { routeId: ROUTE, kind: 'wrong_line' },
  ]) {
    const response = await handleReport(post(body), d);
    assert.equal(response.status, 400);
    assert.equal(await codeOf(response), 'bad_request');
  }
  assert.deepEqual(d.seen.tokens, []);
  assert.equal(d.seen.submitted.length, 0);
});

test('a token Turnstile does not vouch for: 403 not_verified, nothing sent', async () => {
  const d = deps({ isVerified: async () => false });
  const response = await handleReport(post(REPORT), d);
  assert.equal(response.status, 403);
  assert.equal(await codeOf(response), 'not_verified');
});

test("the database's answers reach the page as codes with their statuses", async () => {
  const expected = {
    bad_kind: 422,
    bad_note: 422,
    unknown_route: 422,
    busy: 429,
    route_full: 429,
    full: 503,
  };
  for (const [code, status] of Object.entries(expected)) {
    const response = await handleReport(post(REPORT), deps({ submit: async () => code }));
    assert.equal(response.status, status, code);
    assert.equal(await codeOf(response), code);
  }
});

test('a database that does not answer: 503 unavailable, and the log holds nothing of the report', async () => {
  const lines = [];
  const original = console.error;
  console.error = (...args) => lines.push(args.join(' '));
  try {
    const failing = deps({
      submit: async () => {
        throw new Error(`insert failed for ${ROUTE} with note Now 15.`);
      },
    });
    const response = await handleReport(post(REPORT), failing);
    assert.equal(response.status, 503);
    assert.equal(await codeOf(response), 'unavailable');
  } finally {
    console.error = original;
  }
  assert.equal(lines.length, 1);
  for (const secret of [ROUTE, 'Now 15', 'token-1', 'wrong_fare']) {
    assert.ok(!lines[0].includes(secret), `the log names ${secret}`);
  }
});

test("Turnstile: success only on siteverify's own yes; no address is passed", async () => {
  const sent = [];
  const fetcher =
    (answer, status = 200) =>
    async (url, init) => {
      sent.push({ url, body: String(init.body) });
      return new Response(JSON.stringify(answer), { status });
    };
  assert.equal(await isTurnstileVerified('s3cret', 'tok', fetcher({ success: true })), true);
  assert.equal(await isTurnstileVerified('s3cret', 'tok', fetcher({ success: false })), false);
  assert.equal(await isTurnstileVerified('s3cret', 'tok', fetcher({ success: 'true' })), false);
  assert.equal(await isTurnstileVerified('s3cret', 'tok', fetcher({ success: true }, 500)), false);
  assert.equal(
    await isTurnstileVerified('s3cret', 'tok', async () => {
      throw new Error('offline');
    }),
    false,
  );
  assert.equal(sent[0].url, 'https://challenges.cloudflare.com/turnstile/v0/siteverify');
  const fields = new URLSearchParams(sent[0].body);
  assert.deepEqual([...fields.keys()].sort(), ['response', 'secret']);
});
