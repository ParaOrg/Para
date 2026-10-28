// The browser suites' tally (tests/e2e/lib/harness.mjs): its last line counts
// the passed, the failed and the skipped checks, the skipped listed above it,
// and a failure, or more skips than the suite allows, ends the run non-zero.
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

test('more skips than the suite allows end the run non-zero, and say why', () => {
  const { status, lines } = run(
    `check('one', true); skip('two', 'why not'); skip('three', 'why not'); tally();`,
    '{ maxSkips: 1 }',
  );
  assert.equal(status, 1);
  assert.ok(lines.includes('1 passed, 0 failed, 2 skipped'));
  assert.equal(
    lines.at(-1),
    'More skipped than the 1 this suite allows: a check stopped proving anything.',
  );
});

test('as many skips as the suite allows still pass', () => {
  const { status, lines } = run(
    `check('one', true); skip('two', 'why not'); tally();`,
    '{ maxSkips: 1 }',
  );
  assert.equal(status, 0);
  assert.equal(lines.at(-1), '1 passed, 0 failed, 1 skipped');
});

test('a limit of none fails on the first skip', () => {
  const { status } = run(`check('one', true); skip('two', 'why not'); tally();`, '{ maxSkips: 0 }');
  assert.equal(status, 1);
});
