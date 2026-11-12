// The /api/report stand-in (tests/e2e/report-stand-in.mjs) over real HTTP: what the commuter's
// report tab will send, and every answer it will have to show.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/report-stand-in-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { PASS_TOKEN, startReportStandIn } from '../e2e/report-stand-in.mjs';

const ROUTE = '7e7e7e90-0000-4000-8000-0000000000b1';

const send = (origin, body) =>
  fetch(`${origin}/api/report`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

test('a report goes through, and only its route, kind and words are kept', async () => {
  const standIn = await startReportStandIn();
  try {
    const response = await send(standIn.origin, {
      routeId: ROUTE,
      kind: 'wrong_signboard',
      note: ' Says Cubao, goes to Quiapo. ',
      turnstileToken: PASS_TOKEN,
      location: [121.05, 14.6],
    });
    assert.equal(response.status, 201);
    assert.deepEqual(await response.json(), { code: 'sent' });
    assert.deepEqual(standIn.reports, [
      { routeId: ROUTE, kind: 'wrong_signboard', note: 'Says Cubao, goes to Quiapo.' },
    ]);
  } finally {
    await standIn.stop();
  }
});

test('a failed bot check, a full table and a report over the limit each have their answer', async () => {
  const standIn = await startReportStandIn({
    limit: 2,
    answer: (report) => (report.kind === 'wrong_fare' ? 'full' : 'sent'),
  });
  try {
    const robot = await send(standIn.origin, {
      routeId: ROUTE,
      kind: 'other',
      note: 'x',
      turnstileToken: 'no',
    });
    assert.equal(robot.status, 403);
    const full = await send(standIn.origin, {
      routeId: ROUTE,
      kind: 'wrong_fare',
      turnstileToken: PASS_TOKEN,
    });
    assert.equal(full.status, 503);
    assert.deepEqual(await full.json(), { code: 'full' });
    const third = await send(standIn.origin, {
      routeId: ROUTE,
      kind: 'wrong_line',
      turnstileToken: PASS_TOKEN,
    });
    assert.equal(third.status, 429);
    assert.equal(standIn.reports.length, 0);
  } finally {
    await standIn.stop();
  }
});

test('only /api/report answers, and only to a POST', async () => {
  const standIn = await startReportStandIn();
  try {
    assert.equal((await fetch(`${standIn.origin}/api/other`)).status, 404);
    assert.equal((await fetch(`${standIn.origin}/api/report`)).status, 405);
  } finally {
    await standIn.stop();
  }
});
