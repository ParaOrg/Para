// The watch's checks (scripts/watch/checks.mjs), fed fake answers: no request leaves the test.
//
//   node --test tests/unit/watch-checks-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  checkLastSuccess,
  checkPublishedMap,
  checkSite,
  checkTiles,
  lastRunSucceeded,
  withRetries,
} from '../../scripts/watch/checks.mjs';

function fakeFetch(answers) {
  const asked = [];
  const fetchImpl = async (url) => {
    asked.push(url);
    const { status = 200, body = '', location } = answers[url] ?? { status: 404 };
    return new Response(status === 204 || (status >= 300 && status < 400) ? null : body, {
      status,
      headers: location ? { location } : {},
    });
  };
  return { fetchImpl, asked };
}

const page = '<html><div id="root"><p>Loading map…</p></div></html>';

test('the site passes with the app page and the bare domain redirecting to it', async () => {
  const { fetchImpl } = fakeFetch({
    'https://www.para-commute.org/': { body: page },
    'https://para-commute.org/': { status: 301, location: 'https://www.para-commute.org/' },
  });
  assert.equal((await checkSite(fetchImpl)).ok, true);
});

test('the site fails on an error, on another page, or on a lost redirect', async () => {
  const down = fakeFetch({ 'https://www.para-commute.org/': { status: 522, body: 'oops' } });
  assert.match((await checkSite(down.fetchImpl)).answer, /522/);
  const parked = fakeFetch({ 'https://www.para-commute.org/': { body: 'Domain for sale' } });
  assert.match((await checkSite(parked.fetchImpl)).answer, /without the app's page/);
  const noRedirect = fakeFetch({
    'https://www.para-commute.org/': { body: page },
    'https://para-commute.org/': { body: page },
  });
  assert.match((await checkSite(noRedirect.fetchImpl)).answer, /not a redirect/);
});

test('the published map passes under 36 hours old and fails past it or broken', async () => {
  const url = 'https://www.para-commute.org/data/index.v5.json';
  const fresh = fakeFetch({ [url]: { body: '{"published_at":"2026-10-27T23:50:17Z"}' } });
  assert.equal((await checkPublishedMap(fresh.fetchImpl, '2026-10-28T12:00:00Z')).ok, true);
  assert.equal((await checkPublishedMap(fresh.fetchImpl, '2026-10-29T12:00:00Z')).ok, false);
  const html = fakeFetch({ [url]: { body: '<html>' } });
  assert.match(
    (await checkPublishedMap(html.fetchImpl, '2026-10-28T12:00:00Z')).answer,
    /not JSON/,
  );
  const empty = fakeFetch({ [url]: { body: '{}' } });
  assert.match(
    (await checkPublishedMap(empty.fetchImpl, '2026-10-28T12:00:00Z')).answer,
    /no readable/,
  );
});

test('the tiles check asks for one tile and one style, and stops at the first failure', async () => {
  const good = fakeFetch({
    'https://tiles.para-commute.org/10/856/470.pbf': { body: 'tile' },
    'https://tiles.para-commute.org/styles/positron': { body: '{}' },
  });
  assert.equal((await checkTiles(good.fetchImpl)).ok, true);
  assert.equal(good.asked.length, 2);
  const wrong = fakeFetch({});
  const result = await checkTiles(wrong.fetchImpl, 'https://tiles.example.invalid');
  assert.equal(result.ok, false);
  assert.equal(wrong.asked.length, 1);
});

test('the last successful run counts only for the events that do the work', () => {
  const runs = [
    { conclusion: 'success', event: 'pull_request', run_started_at: '2026-10-28T00:00:00Z' },
    { conclusion: 'failure', event: 'schedule', run_started_at: '2026-10-27T00:00:00Z' },
    { conclusion: 'success', event: 'schedule', run_started_at: '2026-10-20T00:00:00Z' },
  ];
  assert.equal(checkLastSuccess(runs, ['schedule'], 8, '2026-10-27T00:00:00Z').ok, true);
  assert.equal(checkLastSuccess(runs, ['schedule'], 8, '2026-10-29T00:00:00Z').ok, false);
  assert.match(checkLastSuccess(runs, ['push'], 8, '2026-10-27T00:00:00Z').answer, /No successful/);
});

test('a workflow counts as passing again when its newest non-pull-request run succeeded', () => {
  const pr = { event: 'pull_request', conclusion: 'failure' };
  assert.equal(lastRunSucceeded([pr, { event: 'schedule', conclusion: 'success' }]), true);
  assert.equal(lastRunSucceeded([{ event: 'push', conclusion: 'failure' }]), false);
  assert.equal(lastRunSucceeded([]), false);
});

test('a check gets three tries, 20 seconds apart, and an exception counts as a failure', async () => {
  const waits = [];
  const sleep = async (ms) => waits.push(ms);
  let calls = 0;
  const flaky = async () => {
    calls += 1;
    if (calls === 1) throw new Error('reset');
    return { ok: calls === 2, answer: `try ${calls}` };
  };
  assert.deepEqual(await withRetries(flaky, { sleep }), { ok: true, answer: 'try 2' });
  assert.deepEqual(waits, [20_000]);
  const failing = await withRetries(async () => ({ ok: false, answer: 'no' }), { sleep });
  assert.equal(failing.ok, false);
  assert.deepEqual(waits, [20_000, 20_000, 20_000]);
});
