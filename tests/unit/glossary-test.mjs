// The glossary's banned words kept out of the code and the docs (scripts/checks/glossary.mjs).
//
//   node --test tests/unit/glossary-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { isSkipped, patternOf, usesIn } from '../../scripts/checks/glossary.mjs';

const WORDS = [{ word: 'visitor', use: 'commuter' }];

test('a banned word is found whole, in either case and in the plural', () => {
  assert.ok(patternOf('visitor').test('Visitors read a file'));
  assert.ok(patternOf('visitor').test('a visitor asks'));
  assert.equal(patternOf('visitor').test('revisitor'), false);
});

test('each use names its line and the word to write instead', () => {
  assert.deepEqual(usesIn('a.md', 'fine\nthe visitor map', WORDS), [
    'a.md:2: "visitor" → "commuter"',
  ]);
});

test("the glossary's own Avoid lines name the word on purpose", () => {
  assert.deepEqual(usesIn('CONTEXT.md', '_Avoid_: user, visitor', WORDS), []);
});

test('a skipped record is skipped by its path or its folder', () => {
  const skip = { 'docs/research/': 'notes', 'docs/plan.md': 'a plan' };
  assert.equal(isSkipped('docs/research/a.md', skip), true);
  assert.equal(isSkipped('docs/plan.md', skip), true);
  assert.equal(isSkipped('docs/adr/0001.md', skip), false);
});
