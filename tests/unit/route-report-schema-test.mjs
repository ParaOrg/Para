import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  ROUTE_REPORT_KINDS,
  routeReportSchema,
} from '../../src/features/routes/model/route-report-schema.ts';

const ROUTE = '7e7e7e90-0000-4000-8000-0000000000b1';
const DIRECTION = '7e7e7e90-0000-4000-8000-0000000000c1';
const ok = (report) =>
  routeReportSchema.safeParse({ routeId: ROUTE, turnstileToken: 't', ...report });

test('the kinds are the database check, in its order', () => {
  assert.deepEqual(ROUTE_REPORT_KINDS, [
    'wrong_line',
    'wrong_fare',
    'wrong_stop',
    'wrong_signboard',
    'no_longer_runs',
    'other',
  ]);
});

test('a kind with no words is a report; words are trimmed', () => {
  assert.equal(ok({ kind: 'no_longer_runs' }).success, true);
  const parsed = ok({ kind: 'wrong_fare', note: '  Now 15 pesos.  ', directionId: DIRECTION });
  assert.equal(parsed.success, true);
  assert.equal(parsed.data.note, 'Now 15 pesos.');
  assert.equal(parsed.data.directionId, DIRECTION);
});

test('other needs words, and blank words are none', () => {
  assert.equal(ok({ kind: 'other' }).success, false);
  assert.equal(ok({ kind: 'other', note: '   ' }).success, false);
  assert.equal(ok({ kind: 'other', note: 'The jeep waits an hour at the market.' }).success, true);
});

test('a note holds at most 500 characters, counted after trimming', () => {
  assert.equal(ok({ kind: 'wrong_stop', note: 'x'.repeat(500) }).success, true);
  assert.equal(ok({ kind: 'wrong_stop', note: ` ${'x'.repeat(500)} ` }).success, true);
  assert.equal(ok({ kind: 'wrong_stop', note: 'x'.repeat(501) }).success, false);
});

test('a kind off the list, a route that is no id, or no token is refused', () => {
  assert.equal(ok({ kind: 'wrong_path' }).success, false);
  assert.equal(
    routeReportSchema.safeParse({ routeId: 'r1', kind: 'other', note: 'x', turnstileToken: 't' })
      .success,
    false,
  );
  assert.equal(routeReportSchema.safeParse({ routeId: ROUTE, kind: 'wrong_line' }).success, false);
  assert.equal(ok({ kind: 'wrong_line', directionId: 'not-an-id' }).success, false);
});

test('nothing about the person comes through', () => {
  const parsed = ok({ kind: 'wrong_line', location: [121, 14], deviceId: 'abc', account: 'me' });
  assert.equal(parsed.success, true);
  assert.deepEqual(Object.keys(parsed.data).sort(), ['kind', 'routeId', 'turnstileToken']);
});
