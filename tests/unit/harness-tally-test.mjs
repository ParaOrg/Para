// The browser suites' tally (tests/e2e/lib/harness.mjs): its last line counts
// the passed, the failed and the skipped checks, the skipped listed above it,
// and a failure, or a skip the suite does not know, ends the run non-zero.
// Each run is a child process, since tally ends its process.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/harness-tally-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

const HARNESS = new URL('../e2e/lib/harness.mjs', import.meta.url).href;

/** Runs `body` with check, skip and tally in scope; its exit code and printed lines. */
function run(body, options = '') {
  const script = `const { harness } = await import(${JSON.stringify(HARNESS)});
const { check, skip, tally } = harness(${options});
${body}`;
  const child = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
    encoding: 'utf8',
  });
  return { status: child.status, lines: child.stdout.trimEnd().split('\n') };
}

test('the last line counts the skipped checks beside the passed and the failed', () => {
  const { status, lines } = run(`
check('one', true);
skip('  a check today’s data cannot support', 'no such route');
check('two', true);
skip('another', 'no such hintuan');
tally();`);
  assert.equal(status, 0, 'a skip does not fail the run');
  assert.equal(lines.at(-1), '2 passed, 0 failed, 2 skipped');
  const listed = lines.indexOf('Skipped:');
  assert.ok(listed > 0, 'the skipped are listed before the last line');
  assert.deepEqual(lines.slice(listed + 1, listed + 3), [
    '  a check today’s data cannot support',
    '  another',
  ]);
});

test('with nothing skipped, the count says 0 and lists none', () => {
  const { status, lines } = run(`check('one', true); tally();`);
  assert.equal(status, 0);
  assert.equal(lines.at(-1), '1 passed, 0 failed, 0 skipped');
  assert.ok(!lines.includes('Skipped:'));
});

test('a failure still ends the run non-zero, skips or not', () => {
  const { status, lines } = run(
    `check('one', false, 'why'); skip('two', 'why not'); tally({ blankLine: false });`,
    '{ bracketed: true }',
  );
  assert.equal(status, 1);
  assert.equal(lines.at(-1), '0 passed, 1 failed, 1 skipped');
  assert.ok(lines.includes('SKIP  two  [why not]'));
  assert.ok(!lines.includes(''), 'no blank line when asked for none');
});

test('a skip the suite does not know ends the run non-zero, and names it', () => {
  const { status, lines } = run(
    `check('one', true); skip('  known', 'why not'); skip('new', 'why not'); tally();`,
    "{ knownSkips: ['known'] }",
  );
  assert.equal(status, 1);
  assert.ok(lines.includes('1 passed, 0 failed, 2 skipped'));
  assert.deepEqual(lines.slice(-2), [
    'Skipped, and not a skip this suite knows: a check stopped proving anything.',
    '  new',
  ]);
});

test('known skips pass, however often they skip', () => {
  const { status, lines } = run(
    `check('one', true); skip('known', 'a'); skip('  known', 'b'); tally();`,
    "{ knownSkips: ['  known'] }",
  );
  assert.equal(status, 0);
  assert.equal(lines.at(-1), '1 passed, 0 failed, 2 skipped');
});

test('with none known, the first skip fails the run', () => {
  const { status } = run(
    `check('one', true); skip('two', 'why not'); tally();`,
    '{ knownSkips: [] }',
  );
  assert.equal(status, 1);
});
