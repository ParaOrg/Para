// The watch's checks (scripts/watch/checks.mjs), fed fake answers: no request leaves the test.
//
//   node --test tests/unit/watch-checks-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  checkLastSuccess,
  checkPublishedMap,
  checkSite,
  lastRunSucceeded,
  PUBLISH_MAX_AGE_DAYS,
  tilesCheck,
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

test('the published map passes when its index answers and parses, whatever its age', async () => {
  const url = 'https://www.para-commute.org/data/index.v5.json';
  const old = fakeFetch({ [url]: { body: '{"published_at":"2026-10-01T00:00:00Z"}' } });
  assert.equal((await checkPublishedMap(old.fetchImpl)).ok, true);
  const html = fakeFetch({ [url]: { body: '<html>' } });
  assert.match((await checkPublishedMap(html.fetchImpl)).answer, /not JSON/);
  const empty = fakeFetch({ [url]: { body: '{}' } });
  assert.match((await checkPublishedMap(empty.fetchImpl)).answer, /no readable/);
  const gone = fakeFetch({});
  assert.match((await checkPublishedMap(gone.fetchImpl)).answer, /404/);
});

test('an index unchanged for days while the nightly publish passes raises no alert', () => {
  // published_at moves only when the map's content does (scripts/publish/assemble.mjs).
  const nightly = ['2026-10-27', '2026-10-26', '2026-10-25', '2026-10-24', '2026-10-23'].map(
    (day) => ({ conclusion: 'success', event: 'schedule', run_started_at: `${day}T20:00:00Z` }),
  );
  const freshness = checkLastSuccess(
    nightly,
    ['schedule', 'workflow_dispatch'],
    PUBLISH_MAX_AGE_DAYS,
    '2026-10-28T12:00:00Z',
  );
  assert.equal(freshness.ok, true);
  const stopped = checkLastSuccess(
    nightly,
    ['schedule', 'workflow_dispatch'],
    PUBLISH_MAX_AGE_DAYS,
    '2026-10-29T12:00:00Z',
  );
  assert.equal(stopped.ok, false, 'no good publish for 40 hours is an alert');
});

test('the tiles check asks for a style, then a tile, and never a tile when the style fails', async () => {
  const good = fakeFetch({
    'https://tiles.para-commute.org/10/856/470.pbf': { body: 'tile' },
    'https://tiles.para-commute.org/styles/positron': { body: '{}' },
  });
  assert.equal((await tilesCheck(good.fetchImpl)()).ok, true);
  assert.equal(good.asked.length, 2);
  const wrong = fakeFetch({});
  const result = await tilesCheck(wrong.fetchImpl, 'https://tiles.example.invalid')();
  assert.equal(result.ok, false);
  assert.deepEqual(wrong.asked, ['https://tiles.example.invalid/styles/positron']);
});

test('a retried tiles check fetches the tile once per run', async () => {
  const noTile = fakeFetch({ 'https://tiles.para-commute.org/styles/positron': { body: '{}' } });
  const result = await withRetries(tilesCheck(noTile.fetchImpl), { sleep: async () => {} });
  assert.equal(result.ok, false);
  assert.match(result.answer, /470\.pbf 404/);
  const tiles = noTile.asked.filter((url) => url.endsWith('.pbf'));
  assert.equal(tiles.length, 1);
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
