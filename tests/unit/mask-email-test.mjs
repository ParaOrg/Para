// The email the reset code went to, as the code step shows it (src/features/contribute/account):
// recognisable to its owner, not readable by someone looking over a shoulder.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/mask-email-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { maskEmail } from '../../src/features/contribute/account/mask-email.ts';

test('a name of 8 or more keeps its first 4 and its last, a star for each between', () => {
  assert.equal(maskEmail('villanueva2@gmail.com'), 'vill******2@gmail.com');
  assert.equal(maskEmail('juandela@example.com'), 'juan***a@example.com');
});

test('a shorter name keeps only its first and last, so at least a third is hidden', () => {
  assert.equal(maskEmail('juanc@x.ph'), 'j***c@x.ph');
  assert.equal(maskEmail('ana@gmail.com'), 'a*a@gmail.com');
  assert.equal(maskEmail('juandel@gmail.com'), 'j*****l@gmail.com');
});

test('a name of 2 keeps its first alone, and a name of 1 shows none', () => {
  assert.equal(maskEmail('jo@gmail.com'), 'j*@gmail.com');
  assert.equal(maskEmail('j@gmail.com'), '*@gmail.com');
});

test('the masked name is as long as the real one, and the domain is shown whole', () => {
  for (const email of ['villanueva2@gmail.com', 'ana@up.edu.ph', 'jo@x.co', 'j@x.co']) {
    const masked = maskEmail(email);
    assert.equal(masked.length, email.length, email);
    assert.equal(masked.slice(masked.indexOf('@')), email.slice(email.indexOf('@')), email);
  }
});

test('the last @ splits the name from the domain', () => {
  assert.equal(maskEmail('"a@b"cdefgh@example.com'), '"a@b******h@example.com');
});

test('text with no @ is masked as a whole', () => {
  assert.equal(maskEmail('villanueva2'), 'vill******2');
  assert.equal(maskEmail(''), '');
});
