// Why an upload did not go through (src/features/contribute/api/upload-problem.ts):
// only a request that got no answer reads as no signal. Any answer the page does
// not know, such as sign-ups turned off, is ParaPo not accepting uploads.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/upload-problem-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { problemOf, signInProblemOf } from '../../src/features/contribute/api/upload-problem.ts';

test('a database answer is sorted into what the page does next', () => {
  assert.equal(
    problemOf({ code: 'P0001', message: 'day_cap: 20 contributions in 24 hours' }, 400),
    'day-cap',
  );
  assert.equal(
    problemOf({ code: 'P0001', message: 'bad_points: point 3 is faster than 150 km/h' }, 400),
    'refused',
  );
  assert.equal(
    problemOf({ code: '42501', message: 'new row violates row-level security policy' }, 401),
    'blocked',
  );
  assert.equal(problemOf({ code: '23514', message: 'check constraint' }, 400), 'refused');
});

test('a database request with no answer is no signal', () => {
  // postgrest-js answers a failed fetch with status 0 and an empty code.
  assert.equal(problemOf({ code: '', message: 'TypeError: Failed to fetch' }, 0), 'offline');
  assert.equal(problemOf({ code: '', message: 'AbortError: signal is aborted' }, 0), 'offline');
});

test('a database answer the page does not know is ParaPo not accepting, not no signal', () => {
  assert.equal(
    problemOf({ code: 'PGRST202', message: 'Could not find the function' }, 404),
    'not-accepting',
  );
  assert.equal(problemOf({ code: '', message: 'Service Unavailable' }, 503), 'not-accepting');
  assert.equal(problemOf({ message: 'Internal Server Error' }, 500), 'not-accepting');
});

test('a sign-in with no answer is no signal', () => {
  assert.equal(
    signInProblemOf({ name: 'AuthRetryableFetchError', message: 'Failed to fetch', status: 0 }),
    'offline',
  );
  assert.equal(signInProblemOf({ name: 'TypeError', message: 'Failed to fetch' }), 'offline');
  assert.equal(signInProblemOf({ name: 'AuthUnknownError', message: 'x', status: 0 }), 'offline');
});

test('a sign-in refused by its settings is ParaPo not accepting, not no signal', () => {
  assert.equal(
    signInProblemOf({
      name: 'AuthApiError',
      message: 'Signups not allowed for this instance',
      status: 422,
      code: 'signup_disabled',
    }),
    'not-accepting',
  );
  assert.equal(
    signInProblemOf({
      name: 'AuthApiError',
      message: 'Anonymous sign-ins are disabled',
      status: 422,
      code: 'anonymous_provider_disabled',
    }),
    'not-accepting',
  );
  assert.equal(
    signInProblemOf({ name: 'AuthApiError', message: 'Internal error', status: 500 }),
    'not-accepting',
  );
});

test('a refused bot check is the check failing, whatever its status', () => {
  assert.equal(
    signInProblemOf({
      name: 'AuthApiError',
      message: 'captcha protection: request disallowed (timeout-or-duplicate)',
      status: 400,
      code: 'captcha_failed',
    }),
    'check-failed',
  );
  assert.equal(
    signInProblemOf({ name: 'AuthApiError', message: 'Invalid captcha token', status: 400 }),
    'check-failed',
  );
});
