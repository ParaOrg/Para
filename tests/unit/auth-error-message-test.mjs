import assert from 'node:assert/strict';
import { test } from 'node:test';

import { authErrorMessage } from '../../src/features/studio/auth/auth-error-message.ts';

const WRONG = 'That email and password do not match an account.';
const quietly = (fn) => {
  const warn = console.warn;
  console.warn = () => {};
  try {
    return fn();
  } finally {
    console.warn = warn;
  }
};

test("a password that does not match is said in the screen's own words", () => {
  assert.equal(authErrorMessage({ code: 'invalid_credentials', message: 'x' }, WRONG), WRONG);
  assert.equal(authErrorMessage({ message: 'Invalid login credentials' }, WRONG), WRONG);
});

test('too many tries, the bot check and no connection each say what to do', () => {
  assert.match(
    authErrorMessage({ code: 'over_request_rate_limit', message: 'x' }, WRONG),
    /^Too many tries/,
  );
  assert.match(
    authErrorMessage({ code: 'captcha_failed', message: 'captcha protection' }, WRONG),
    /not a bot/,
  );
  assert.match(
    authErrorMessage({ name: 'AuthRetryableFetchError', message: 'Failed to fetch' }, WRONG),
    /^No connection/,
  );
});

test("anything else is a plain sentence, never Supabase's own", () => {
  const said = quietly(() =>
    authErrorMessage(
      { code: 'unexpected_failure', message: 'Database error querying schema' },
      WRONG,
    ),
  );
  assert.equal(said, 'That did not go through. Try again in a moment.');
});
