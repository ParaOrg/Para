// The contributor's sign-in and sign-up fields (src/features/contribute/account): the mobile
// number's two spellings and the form it is stored in, what each field refuses, and how a failed
// Auth call is sorted into the one line the person reads.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/account-fields-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  checkChangePassword,
  checkForgotPassword,
  checkProfile,
  checkCode,
  checkNewPassword,
  checkSignIn,
  checkSignUp,
  PASSWORD_RULE,
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
  assert.equal(checked.errors.password, 'Use at least 8 characters, with letters and numbers');
});

test('a name is 1 to 80 characters', () => {
  assert.equal(checkSignUp({ ...GOOD, name: 'a'.repeat(80) }).isValid, true);
  const tooLong = checkSignUp({ ...GOOD, name: 'a'.repeat(81) });
  assert.equal(tooLong.isValid, false);
  assert.equal(tooLong.errors.name, 'Use 80 characters or fewer');
});

test('a password is at least 8 characters, counted without trimming', () => {
  assert.equal(checkSignUp({ ...GOOD, password: 'abc1234' }).isValid, false);
  assert.equal(checkSignUp({ ...GOOD, password: 'abcd1234' }).isValid, true);
  assert.equal(checkSignUp({ ...GOOD, password: '   abc 1' }).isValid, true);
});

test("a new password needs a letter and a digit, as the project's Letters and digits setting does", () => {
  const refused = { password: 'Use at least 8 characters, with letters and numbers' };
  for (const password of ['abc1234', 'abcdefgh', 'ABCDEFGHIJ', '12345678', '1234 5678!']) {
    assert.deepEqual(checkSignUp({ ...GOOD, password }).errors, refused, password);
    assert.deepEqual(
      checkNewPassword({ password, confirmation: password }).errors,
      refused,
      password,
    );
  }
  for (const password of ['abcd1234', '1234567A', 'Pass word 9']) {
    assert.equal(checkSignUp({ ...GOOD, password }).isValid, true, password);
    assert.equal(checkNewPassword({ password, confirmation: password }).isValid, true, password);
  }
});

test('the letter and digit are Latin ones: the project looks for a-z, A-Z and 0-9 alone', () => {
  // Supabase Auth checks each required set with strings.ContainsAny, and "Letters and digits"
  // is the sets abc…zABC…Z and 0123456789: ñ, é or a Devanagari digit does not count.
  for (const password of ['ñññññ123', 'éééééé12', 'Ññññú2026', 'abcdefg\u0967']) {
    assert.deepEqual(
      checkSignUp({ ...GOOD, password }).errors,
      { password: 'Use at least 8 characters, with letters and numbers' },
      password,
    );
  }
  assert.equal(checkSignUp({ ...GOOD, password: 'Ñandú2026' }).isValid, true);
});

test('the rule under the field and the refusal say the same thing', () => {
  assert.equal(PASSWORD_RULE, 'At least 8 characters, with letters and numbers');
  assert.equal(
    ACCOUNT_MESSAGES['weak-password'],
    'Use at least 8 characters, with letters and numbers',
  );
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
    password: 'Use at least 8 characters, with letters and numbers',
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
  assert.equal(checkSignUp({ ...fields, password: 'a1'.repeat(36) }).isValid, true);
  const long = checkSignUp({ ...fields, password: 'a1'.repeat(36) + 'a' });
  assert.deepEqual(long.errors, { password: 'Use 72 characters or fewer' });
  const longReset = 'a1'.repeat(36) + 'a';
  assert.deepEqual(checkNewPassword({ password: longReset, confirmation: longReset }).errors, {
    password: 'Use 72 characters or fewer',
  });
});

test('a password change needs the current password, and holds the new one to the reset rules', () => {
  const good = {
    currentPassword: 'old-pass1',
    password: 'hunter2hunter2',
    confirmation: 'hunter2hunter2',
  };
  assert.deepEqual(checkChangePassword(good), { isValid: true, value: good });
  assert.deepEqual(checkChangePassword({ ...good, currentPassword: '' }).errors, {
    currentPassword: 'Enter your current password',
  });
  assert.deepEqual(
    checkChangePassword({ ...good, password: 'onlyletters', confirmation: 'onlyletters' }).errors,
    { password: 'Use at least 8 characters, with letters and numbers' },
  );
  assert.deepEqual(checkChangePassword({ ...good, confirmation: 'hunter2hunter3' }).errors, {
    confirmation: "The passwords don't match",
  });
});

test('a password change is sorted honestly: a wrong current password, and a sign-in too old', () => {
  assert.equal(
    accountProblemOf({
      name: 'AuthApiError',
      message: 'Reauthentication required',
      status: 401,
      code: 'reauthentication_needed',
    }),
    'needs-recent-sign-in',
  );
  assert.notEqual(ACCOUNT_MESSAGES['needs-recent-sign-in'], ACCOUNT_MESSAGES['not-accepting']);
  assert.equal(ACCOUNT_MESSAGES['wrong-current-password'], 'That’s not your current password');
});
