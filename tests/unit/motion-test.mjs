// The motion module (src/shared/utils/motion.ts) against the owner's tokens
// (src/design-system/foundation/tokens.css): every duration listed, and every recipe's tokens real.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/motion-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import * as motion from '../../src/shared/utils/motion.ts';
import * as contributeMotion from '../../src/features/contribute/common/motion.ts';

const { MOTION_DURATIONS } = contributeMotion;

const tokens = readFileSync(
  new URL('../../src/design-system/foundation/tokens.css', import.meta.url),
  'utf8',
);
const defined = (prefix) =>
  [...tokens.matchAll(new RegExp(`(${prefix}[\\w-]+)\\s*:`, 'g'))].map((match) => match[1]);

test('the duration list is every --transition-duration-* in tokens.css (slowmo slows them all)', () => {
  assert.deepEqual(
    [...MOTION_DURATIONS].sort(),
    [...new Set(defined('--transition-duration-'))].sort(),
  );
});

test('every recipe reads a duration and an easing that tokens.css defines', () => {
  const easings = new Set(defined('--ease-'));
  // Every recipe the module exports: a duration and an easing, by name.
  const recipes = Object.entries({ ...motion, ...contributeMotion }).filter(
    ([name, value]) => Array.isArray(value) && name !== 'MOTION_DURATIONS',
  );
  assert.ok(recipes.length >= 9, `${recipes.length} recipes`);
  for (const [name, [duration, easing]] of recipes) {
    assert.ok(MOTION_DURATIONS.includes(motion.durationToken(duration)), `${name}: ${duration}`);
    assert.ok(easings.has(`--ease-${easing}`), `${name}: ${easing}`);
  }
});
