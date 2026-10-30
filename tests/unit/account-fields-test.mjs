// The contributor's sign-in and sign-up fields (src/features/contribute/account): the mobile
// number's two spellings and the form it is stored in, what each field refuses, and how a failed
// Auth call is sorted into the one line the person reads.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/account-fields-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  checkForgotPassword,
  checkProfile,
  checkCode,
  checkNewPassword,
  checkSignIn,
  checkSignUp,
} from '../../src/features/contribute/account/account-fields.ts';
import { normalisePhoneNumber } from '../../src/features/contribute/account/phone-number.ts';
import {
  ACCOUNT_MESSAGES,
  accountProblemOf,
} from '../../src/features/contribute/api/account-problem.ts';

test('a local mobile number is stored with +63 in place of its 0', () => {
  assert.equal(normalisePhoneNumber('09171234567'), '+639171234567');
});

test("the number typed after PhoneField's +63 is stored with it", () => {
  assert.equal(normalisePhoneNumber('9171234567'), '+639171234567');
  assert.equal(normalisePhoneNumber('917 123 4567'), '+639171234567');
});

test('an international mobile number is stored as it is', () => {
  assert.equal(normalisePhoneNumber('+639171234567'), '+639171234567');
});

test('spaces, dashes and brackets are ignored', () => {
  assert.equal(normalisePhoneNumber('0917 123 4567'), '+639171234567');
  assert.equal(normalisePhoneNumber('+63 (917) 123-4567'), '+639171234567');
});

test('a number that is not a Philippine mobile is refused', () => {
  for (const text of [
    '',
    '0917123456',
    '917123456',
    '91712345678',
    '8171234567',
    '091712345678',
    '08171234567',
    '+649171234567',
    '639171234567',
    '+63917123456a',
    '02-8123-4567',
  ]) {
    assert.equal(normalisePhoneNumber(text), null, text);
  }
});

const GOOD = {
  name: ' Juan dela Cruz ',
  email: ' juan@example.com ',
  phone: '09171234567',
  password: 'hunter2hunter2',
};

test('sign-up trims the text and stores the number in its database form', () => {
  const checked = checkSignUp(GOOD);
  assert.deepEqual(checked, {
    isValid: true,
    value: {
      name: 'Juan dela Cruz',
      email: 'juan@example.com',
      phone: '+639171234567',
      password: 'hunter2hunter2',
    },
  });
});

test('sign-up names every field that is wrong, one message each', () => {
  const checked = checkSignUp({ name: '  ', email: 'juan', phone: '123', password: 'short' });
  assert.equal(checked.isValid, false);
  assert.deepEqual(Object.keys(checked.errors).sort(), ['email', 'name', 'password', 'phone']);
  assert.equal(checked.errors.name, 'Enter your name');
  assert.equal(checked.errors.password, 'Use at least 8 characters');
});

test('a name is 1 to 80 characters', () => {
  assert.equal(checkSignUp({ ...GOOD, name: 'a'.repeat(80) }).isValid, true);
  const tooLong = checkSignUp({ ...GOOD, name: 'a'.repeat(81) });
  assert.equal(tooLong.isValid, false);
  assert.equal(tooLong.errors.name, 'Use 80 characters or fewer');
});

test('a password is at least 8 characters, counted without trimming', () => {
  assert.equal(checkSignUp({ ...GOOD, password: '1234567' }).isValid, false);
  assert.equal(checkSignUp({ ...GOOD, password: '12345678' }).isValid, true);
  assert.equal(checkSignUp({ ...GOOD, password: '       8' }).isValid, true);
});

test('sign-in needs an email and a password, but holds the password to no minimum', () => {
  assert.deepEqual(checkSignIn({ email: ' a@b.co ', password: 'x' }), {
    isValid: true,
    value: { email: 'a@b.co', password: 'x' },
  });
  const checked = checkSignIn({ email: '', password: '' });
  assert.equal(checked.isValid, false);
  assert.deepEqual(Object.keys(checked.errors).sort(), ['email', 'password']);
});

test('a failed Auth call is sorted into what the person is told', () => {
  const cases = [
    [
      {
        name: 'AuthApiError',
        message: 'Invalid login credentials',
        status: 400,
        code: 'invalid_credentials',
      },
      'wrong-credentials',
    ],
    [
      { name: 'AuthApiError', message: 'registered', status: 422, code: 'email_exists' },
      'email-taken',
    ],
    [
      { name: 'AuthWeakPasswordError', message: 'weak', status: 422, code: 'weak_password' },
      'weak-password',
    ],
    [
      {
        name: 'AuthApiError',
        message: 'captcha protection: request disallowed',
        status: 400,
        code: 'captcha_failed',
      },
      'check-failed',
    ],
    [{ name: 'AuthRetryableFetchError', message: 'Failed to fetch', status: 0 }, 'offline'],
    [{ name: 'TypeError', message: 'Failed to fetch' }, 'offline'],
    [
      {
        name: 'AuthApiError',
        message: 'Signups not allowed',
        status: 422,
        code: 'signup_disabled',
      },
      'not-accepting',
    ],
  ];
  for (const [error, problem] of cases) {
    assert.equal(accountProblemOf(error), problem, error.message);
  }
});

test('every problem has one short line, with no raw error in it', () => {
  for (const line of Object.values(ACCOUNT_MESSAGES)) {
    assert.ok(line.length > 0 && line.length < 90 && !line.includes('\n'), line);
  }
  assert.equal(ACCOUNT_MESSAGES['wrong-credentials'], 'Wrong email or password');
  assert.equal(ACCOUNT_MESSAGES['email-taken'], 'That email already has an account');
});

test('the profile step checks the name and the number alone', () => {
  assert.deepEqual(checkProfile({ name: ' Ana ', phone: '0918 123 4567' }), {
    isValid: true,
    value: { name: 'Ana', phone: '+639181234567' },
  });
  const checked = checkProfile({ name: '', phone: '1' });
  assert.equal(checked.isValid, false);
  assert.deepEqual(Object.keys(checked.errors).sort(), ['name', 'phone']);
});

test('a password reset is sorted into its own lines, never "Wrong email or password"', () => {
  const cases = [
    [
      { name: 'AuthApiError', message: 'expired', status: 403, code: 'otp_expired' },
      'code-rejected',
    ],
    [
      { name: 'AuthApiError', message: 'same', status: 422, code: 'same_password' },
      'same-password',
    ],
    [
      {
        name: 'AuthApiError',
        message: 'slow down',
        status: 429,
        code: 'over_email_send_rate_limit',
      },
      'rate-limited',
    ],
    [
      { name: 'AuthApiError', message: 'slow down', status: 429, code: 'over_request_rate_limit' },
      'rate-limited',
    ],
  ];
  for (const [error, problem] of cases) {
    assert.equal(accountProblemOf(error), problem, error.code);
    assert.notEqual(ACCOUNT_MESSAGES[problem], ACCOUNT_MESSAGES['wrong-credentials']);
  }
});

test('the forgot-password email is trimmed and must be an email', () => {
  assert.deepEqual(checkForgotPassword({ email: ' juan@example.com ' }), {
    isValid: true,
    value: { email: 'juan@example.com' },
  });
  assert.deepEqual(checkForgotPassword({ email: 'juan' }), {
    isValid: false,
    errors: { email: 'Enter a valid email' },
  });
});

test('the reset code is 6 digits, with spaces ignored', () => {
  assert.deepEqual(checkCode({ code: '123 456' }), { isValid: true, value: { code: '123456' } });
  for (const code of ['', '12345', '1234567', '12345a']) {
    const checked = checkCode({ code });
    assert.equal(checked.isValid, false, code);
    assert.equal(checked.errors.code, 'Enter the 6-digit code');
  }
});

test('the new password is at least 8 characters, and typed the same twice', () => {
  const good = { password: 'hunter2hunter2', confirmation: 'hunter2hunter2' };
  assert.deepEqual(checkNewPassword(good), { isValid: true, value: good });
  assert.deepEqual(checkNewPassword({ password: 'short', confirmation: 'short' }).errors, {
    password: 'Use at least 8 characters',
  });
  assert.deepEqual(checkNewPassword({ ...good, confirmation: 'hunter2hunter3' }).errors, {
    confirmation: "The passwords don't match",
  });
  assert.deepEqual(checkNewPassword({ ...good, confirmation: '' }).errors, {
    confirmation: "The passwords don't match",
  });
});

test('a password is held to 72 characters, which is as far as the project reads', () => {
  const fields = { name: 'Juan', email: 'juan@example.com', phone: '09171234567' };
  assert.equal(checkSignUp({ ...fields, password: 'a'.repeat(72) }).isValid, true);
  const long = checkSignUp({ ...fields, password: 'a'.repeat(73) });
  assert.deepEqual(long.errors, { password: 'Use 72 characters or fewer' });
  const longReset = 'a'.repeat(73);
  assert.deepEqual(checkNewPassword({ password: longReset, confirmation: longReset }).errors, {
    password: 'Use 72 characters or fewer',
  });
});
