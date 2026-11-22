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
  renamesOf,
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

test("git's renames are read from --name-status, and nothing else is", () => {
  assert.deepEqual(
    renamesOf(
      [
        'R100\tsrc/shared/ui/room.ts\tsrc/features/routes/map/room.ts',
        'R087\tsrc/a.ts\tsrc/b/a.ts',
        'M\tsrc/c.ts',
        'A\tsrc/d.ts',
        'D\tsrc/e.ts',
        '',
      ].join('\n'),
    ),
    { 'src/features/routes/map/room.ts': 'src/shared/ui/room.ts', 'src/b/a.ts': 'src/a.ts' },
  );
});

test('a file git saw moved keeps its limit at its new path', () => {
  const previous = { 'src/shared/ui/room.ts': 215 };
  const renames = { 'src/features/routes/map/room.ts': 'src/shared/ui/room.ts' };
  assert.deepEqual(
    problemsOf({}, { 'src/features/routes/map/room.ts': 215 }, previous, renames),
    [],
  );
  assert.deepEqual(
    problemsOf({}, { 'src/features/routes/map/room.ts': 200 }, previous, renames),
    [],
  );
});

test('a move whose limit is raised fails', () => {
  const previous = { 'src/shared/ui/room.ts': 215 };
  const renames = { 'src/features/routes/map/room.ts': 'src/shared/ui/room.ts' };
  assert.match(
    problemsOf({}, { 'src/features/routes/map/room.ts': 216 }, previous, renames)[0],
    /moved from src\/shared\/ui\/room\.ts and raised from 215 to 216/,
  );
});

test('an entry git did not see moved is an addition, and fails', () => {
  const previous = { 'src/shared/ui/room.ts': 215 };
  // A new entry, with no rename at all.
  assert.match(
    problemsOf({}, { 'src/shared/ui/room.ts': 215, 'src/new.ts': 200 }, previous, {})[0],
    /^src\/new\.ts: added/,
  );
  // One long file deleted and an unrelated one added under the same name: git reports no rename.
  assert.match(
    problemsOf({}, { 'src/features/routes/map/room.ts': 215 }, previous, {})[0],
    /^src\/features\/routes\/map\/room\.ts: added/,
  );
  // A rename from a path whose entry is still in the baseline is not a move of that entry.
  assert.match(
    problemsOf(
      {},
      { 'src/shared/ui/room.ts': 215, 'src/features/routes/map/room.ts': 215 },
      previous,
      { 'src/features/routes/map/room.ts': 'src/shared/ui/room.ts' },
    )[0],
    /^src\/features\/routes\/map\/room\.ts: added/,
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
