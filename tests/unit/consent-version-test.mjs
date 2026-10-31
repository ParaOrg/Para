// The terms a recording goes under (src/features/contribute/consent/consent-version.ts): having an
// account is the agreement today, each upload says the terms its recording was made under, and
// recordings from before the second text wait on the person's answer.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/consent-version-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  CONSENT_VERSION,
  isEarlierRecording,
  sentConsentVersion,
  shouldAskAboutEarlier,
} from '../../src/features/contribute/consent/consent-version.ts';

test('the current terms are version 4: agreed by having an account, no screen shown', () => {
  assert.equal(CONSENT_VERSION, 4);
});

test('an upload carries the terms its recording was made under', () => {
  assert.equal(sentConsentVersion(4), 4);
  assert.equal(sentConsentVersion(3), 3);
  assert.equal(sentConsentVersion(2), 2);
});

test('a recording with no terms on it, sent once the person said so, goes under the current ones', () => {
  assert.equal(sentConsentVersion(undefined), CONSENT_VERSION);
});

test('a recording is earlier unless it was made under the second text or later', () => {
  assert.equal(isEarlierRecording(undefined), true);
  assert.equal(isEarlierRecording(1), true);
  assert.equal(isEarlierRecording(2), false);
  assert.equal(isEarlierRecording(3), false);
  assert.equal(isEarlierRecording(CONSENT_VERSION), false);
});

test('the earlier-recordings question shows only when signed in, with no answer yet and something unsent', () => {
  const base = { hasConsent: true, hasAnswered: false, unsentEarlierCount: 2 };
  assert.equal(shouldAskAboutEarlier(base), true);
  assert.equal(shouldAskAboutEarlier({ ...base, hasConsent: false }), false);
  assert.equal(shouldAskAboutEarlier({ ...base, hasAnswered: true }), false);
  assert.equal(shouldAskAboutEarlier({ ...base, unsentEarlierCount: 0 }), false);
});
