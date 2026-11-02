// The motion module (src/shared/utils/motion.ts) against the owner's tokens
// (src/design-system/foundation/tokens.css): every duration listed, every recipe's tokens real, and
// none of their names built from parts.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/motion-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';

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
    assert.ok(MOTION_DURATIONS.includes(duration), `${name}: ${duration}`);
    assert.ok(easings.has(easing), `${name}: ${easing}`);
  }
});

// Tailwind keeps a theme token in the CSS only where its whole name is in the source: a name a
// script builds from parts (`--ease-${name}`) is dropped from the page and reads empty, as the
// toolbar's pill once found, gliding in no time.
test('no source builds a Motion token name from parts', () => {
  // A type's `${string}` names no token; anything else in the braces builds one.
  const built = /--(?:transition-duration|ease)-\$\{(?!string\})/;
  const offenders = readdirSync(new URL('../../src/', import.meta.url), { recursive: true })
    .filter((file) => /\.(ts|tsx)$/.test(file))
    .filter((file) =>
      built.test(readFileSync(new URL(`../../src/${file}`, import.meta.url), 'utf8')),
    );
  assert.deepEqual(offenders, []);
});
