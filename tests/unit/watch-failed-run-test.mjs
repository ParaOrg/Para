// A failed scheduled run opens an alert (scripts/watch/failed-run.mjs, through
// report-failed-run.mjs): every workflow that reports one has its first thing to try and a
// runbook that exists, and the watch knows to close its alert once the next run passes.
//
//   node --test tests/unit/watch-failed-run-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';

import { FAILED_RUN_WORKFLOWS, failedRunResult } from '../../scripts/watch/failed-run.mjs';

const WORKFLOWS = new URL('../../.github/workflows/', import.meta.url);
/** The workflow files whose last job reports a failed run. */
const reporting = readdirSync(WORKFLOWS)
  .filter((file) => file.endsWith('.yml'))
  .filter((file) =>
    readFileSync(new URL(file, WORKFLOWS), 'utf8').includes('report-failed-run.mjs'),
  )
  .sort();

/** A heading's anchor, as GitHub makes it. */
const anchorOf = (heading) =>
  heading
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s/g, '-');
const anchors = new Set(
  readFileSync(new URL('../../docs/operations.md', import.meta.url), 'utf8')
    .split('\n')
    .filter((line) => /^#{2,3} /.test(line))
    .map((line) => anchorOf(line.replace(/^#+ /, ''))),
);

const run = (file) =>
  failedRunResult({
    WORKFLOW_FILE: file,
    WORKFLOW_NAME: 'Its name',
    RUN_URL: 'https://github.com/ParaOrg/Para/actions/runs/1',
    GITHUB_EVENT_NAME: 'schedule',
    GITHUB_REF_NAME: 'main',
  });

test('the database, security and CodeQL workflows report a failed scheduled run', () => {
  for (const file of ['database.yml', 'security.yml', 'codeql.yml'])
    assert.ok(reporting.includes(file), `${file} has no job that runs report-failed-run.mjs`);
});

test('every workflow that reports a failed run names itself, and never reports a pull request', () => {
  for (const file of reporting) {
    const text = readFileSync(new URL(file, WORKFLOWS), 'utf8');
    assert.match(text, new RegExp(`WORKFLOW_FILE: ${file.replace('.', '\\.')}\\b`), file);
    // A pull request's own checks say it failed: an alert is for a run nobody is watching.
    if (/^ {2}pull_request:/m.test(text))
      assert.match(
        text,
        /if: failure\(\) && github\.event_name (== 'schedule'|!= 'pull_request')/,
        file,
      );
  }
});

test('each has its first thing to try, and a runbook that is a heading of docs/operations.md', () => {
  assert.deepEqual([...FAILED_RUN_WORKFLOWS].sort(), reporting);
  for (const file of reporting) {
    const result = run(file);
    assert.equal(result.key, `run:${file}`);
    assert.equal(result.ok, false);
    assert.ok(result.hint && result.hint.length > 40, `${file} has no first thing to try`);
    const anchor = result.runbook?.split('#')[1];
    assert.ok(anchor && anchors.has(anchor), `${file}: no heading for #${anchor}`);
  }
});

test('the alert says which run failed, on what, in words with no raw error', () => {
  const result = run('database.yml');
  assert.equal(result.title, 'Alert: the Its name run failed');
  assert.match(result.answer, /actions\/runs\/1 failed \(schedule on main\)/);
  assert.equal(result.isEvent, true);
});
