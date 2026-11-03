// The studio's password rule, as the project's Supabase Auth sets it
// ("Letters and digits", minimum 8): checked before a new password is sent,
// and Supabase's weak_password said in the same words.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/password-rule-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  PASSWORD_RULE_ERROR,
  meetsPasswordRule,
  setPasswordErrorMessage,
} from '../../src/features/studio/auth/password-rule.ts';

test('8 characters or more, with a letter and a digit, meets the rule', () => {
  for (const ok of ['abcdefg1', '1234567a', 'Para2026', 'a1b2c3d4e5', 'A-new-password-2026!']) {
    assert.equal(meetsPasswordRule(ok), true, ok);
  }
});

test('too short, no letter or no digit breaks it', () => {
  for (const bad of ['', 'abc1', 'abcdef1', 'abcdefgh', 'only-letters', '12345678', '1234-5678']) {
    assert.equal(meetsPasswordRule(bad), false, bad);
  }
  // Letters are a to z, as Supabase counts them: an accented letter alone is not one.
  assert.equal(meetsPasswordRule('ññññññ12'), false);
});

test("Supabase's weak_password is said as the rule; other errors as they come", () => {
  assert.equal(
    setPasswordErrorMessage({
      code: 'weak_password',
      message: 'Password should contain at least one character of each: abc…, 0123456789',
    }),
    PASSWORD_RULE_ERROR,
  );
  assert.equal(PASSWORD_RULE_ERROR, 'Use at least 8 characters, with letters and numbers');
  assert.equal(
    setPasswordErrorMessage({
      code: 'same_password',
      message: 'New password should be different.',
    }),
    'New password should be different.',
  );
  assert.equal(setPasswordErrorMessage({ message: 'Failed to fetch' }), 'Failed to fetch');
});
