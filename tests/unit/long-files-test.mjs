// No new source file over 150 lines; those already long are held to their length, and the list of
// them may only shrink (scripts/checks/long-files.mjs).
//
//   node --test tests/unit/long-files-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  lineCount,
  longFilesOf,
  loweredBaseline,
  problemsOf,
} from '../../scripts/checks/long-files.mjs';

test('lines are counted as an editor numbers them', () => {
  assert.equal(lineCount('a\nb\n'), 2);
  assert.equal(lineCount('a\nb'), 2);
  assert.equal(lineCount(''), 1);
});

test('only files over 150 lines are long', () => {
  assert.deepEqual(longFilesOf({ 'a.ts': 150, 'b.ts': 151 }), { 'b.ts': 151 });
});

test('a new long file fails; a grandfathered one at or under its length passes', () => {
  const baseline = { 'old.ts': 200 };
  assert.deepEqual(problemsOf({ 'old.ts': 200 }, baseline), []);
  assert.deepEqual(problemsOf({ 'old.ts': 180 }, baseline), []);
  assert.match(problemsOf({ 'new.ts': 151 }, baseline)[0], /^new\.ts: 151 lines, over 150/);
});

test('a grandfathered file that grows fails', () => {
  assert.match(problemsOf({ 'old.ts': 201 }, { 'old.ts': 200 })[0], /more than the 200/);
});

test('on a pull request the baseline may only shrink', () => {
  const previous = { 'old.ts': 200 };
  assert.deepEqual(problemsOf({}, { 'old.ts': 190 }, previous), []);
  assert.match(problemsOf({}, { 'old.ts': 210 }, previous)[0], /raised in the baseline/);
  assert.match(
    problemsOf({}, { 'old.ts': 200, 'sneak.ts': 300 }, previous)[0],
    /^sneak\.ts: added/,
  );
});

test('--update lowers the baseline and drops files back under the limit, never raising one', () => {
  const lowered = loweredBaseline(
    { 'a.ts': 170, 'c.ts': 400 },
    { 'a.ts': 180, 'b.ts': 160, 'c.ts': 300 },
  );
  assert.deepEqual(lowered, { 'a.ts': 170, 'c.ts': 300 });
});

test('a generated file is never long: it is written by a tool', () => {
  assert.deepEqual(longFilesOf({ 'src/shared/types/database.types.ts': 3000 }), {});
});
