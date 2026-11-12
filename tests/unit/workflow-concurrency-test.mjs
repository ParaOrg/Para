// A run on staging or main that has started is never cancelled: the commit it checks gets its
// full verdict, and the workflow that watches staging (staging-red.yml) is told how it ended.
// So a workflow that runs on a push may cancel a run in progress for a pull request only, where
// the newest commit is the one that matters (.github/workflows/).
//
//   node --test tests/unit/workflow-concurrency-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';

const FOLDER = new URL('../../.github/workflows/', import.meta.url);

/** Each workflow's name and text, comments left out. */
const WORKFLOWS = readdirSync(FOLDER)
  .filter((name) => name.endsWith('.yml'))
  .map((name) => [
    name,
    readFileSync(new URL(name, FOLDER), 'utf8')
      .split('\n')
      .filter((line) => !line.trim().startsWith('#'))
      .join('\n'),
  ]);

/** Whether the workflow runs on a push: `push:` among its `on:` triggers. */
const runsOnPush = (text) => /^on:\n(?: .*\n|\n)*? {2}push:/m.test(text);

/** What its top-level `concurrency:` says of a run in progress, or null with no such line. */
const cancelsInProgress = (text) =>
  /^concurrency:\n(?: .*\n)*? {2}cancel-in-progress: (.+)$/m.exec(text)?.[1].trim() ?? null;

const PULL_REQUESTS_ONLY = "${{ github.event_name == 'pull_request' }}";

test('the workflows that run on a push are the ones this check knows', () => {
  const onPush = WORKFLOWS.filter(([, text]) => runsOnPush(text)).map(([name]) => name);
  for (const name of ['ci.yml', 'codeql.yml', 'contributor-app.yml', 'security.yml']) {
    assert.ok(onPush.includes(name), `${name} runs on a push`);
  }
});

test('a workflow that runs on a push cancels a run in progress for a pull request only', () => {
  for (const [name, text] of WORKFLOWS.filter(([, text]) => runsOnPush(text))) {
    const cancels = cancelsInProgress(text);
    assert.ok(
      cancels === null || cancels === 'false' || cancels === PULL_REQUESTS_ONLY,
      `${name}: cancel-in-progress is ${cancels}; a run on staging or main must finish`,
    );
  }
});
