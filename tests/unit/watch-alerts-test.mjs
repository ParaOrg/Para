// The watch's issue logic (scripts/watch/alerts.mjs): one issue per problem, updated while it
// lasts, closed when it passes, reopened when it flaps.
//
//   node --test tests/unit/watch-alerts-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planAlerts, readMarker, runbookLink } from '../../scripts/watch/alerts.mjs';

const down = {
  key: 'site',
  title: 'Alert: the site is down',
  ok: false,
  answer: '503',
  hint: 'Look',
  runbook: runbookLink('the-map-is-blank'),
};
const up = { key: 'site', title: 'Alert: the site is down', ok: true };

// A fake issue tracker: applies the plan the way scripts/watch/github.mjs does.
function tracker() {
  const issues = [];
  return {
    issues,
    run(results, now) {
      const actions = planAlerts(results, issues, now);
      for (const action of actions) {
        if (action.type === 'create') {
          issues.push({
            number: issues.length + 1,
            state: 'open',
            body: action.body,
            closedAt: null,
          });
          continue;
        }
        const issue = issues.find((each) => each.number === action.number);
        if (action.body) issue.body = action.body;
        issue.state = action.type === 'close' ? 'closed' : 'open';
        issue.closedAt = action.type === 'close' ? now : null;
      }
      return actions;
    },
  };
}

test('down opens one issue with what failed, the answer and the first thing to try', () => {
  const { issues, run } = tracker();
  const [action] = run([down], '2026-10-28T00:00:00Z');
  assert.equal(action.type, 'create');
  assert.equal(action.title, 'Alert: the site is down');
  assert.match(action.body, /503/);
  assert.match(action.body, /Look/);
  assert.match(action.body, /operations\.md#the-map-is-blank/);
  assert.equal(issues.length, 1);
  assert.deepEqual(readMarker(issues[0].body), {
    key: 'site',
    since: '2026-10-28T00:00:00Z',
    failures: 1,
  });
});

test('still down updates the same issue and never opens a second one', () => {
  const { issues, run } = tracker();
  run([down], '2026-10-28T00:00:00Z');
  const [second] = run([down], '2026-10-28T00:15:00Z');
  const [third] = run([down], '2026-10-28T00:30:00Z');
  assert.equal(second.type, 'update');
  assert.equal(second.comment, undefined, 'a state that lasts is not an email every 15 minutes');
  assert.equal(third.number, 1);
  assert.equal(issues.length, 1);
  assert.deepEqual(readMarker(issues[0].body), {
    key: 'site',
    since: '2026-10-28T00:00:00Z',
    failures: 3,
  });
});

test('back up closes the issue with a comment', () => {
  const { issues, run } = tracker();
  run([down], '2026-10-28T00:00:00Z');
  const [action] = run([up], '2026-10-28T00:15:00Z');
  assert.equal(action.type, 'close');
  assert.match(action.comment, /Passing again/);
  assert.equal(issues[0].state, 'closed');
});

test('passing with nothing open does nothing', () => {
  const { run } = tracker();
  assert.deepEqual(run([up], '2026-10-28T00:00:00Z'), []);
});

test('flapping within a day reopens the same issue instead of opening another', () => {
  const { issues, run } = tracker();
  run([down], '2026-10-28T00:00:00Z');
  run([up], '2026-10-28T00:15:00Z');
  const [action] = run([down], '2026-10-28T00:30:00Z');
  run([up], '2026-10-28T00:45:00Z');
  run([down], '2026-10-28T01:00:00Z');
  assert.equal(action.type, 'reopen');
  assert.match(action.comment, /Failing again/);
  assert.equal(issues.length, 1);
  assert.equal(issues[0].state, 'open');
});

test('down again after more than a day opens a fresh issue', () => {
  const { issues, run } = tracker();
  run([down], '2026-10-28T00:00:00Z');
  run([up], '2026-10-28T00:15:00Z');
  const [action] = run([down], '2026-10-30T00:00:00Z');
  assert.equal(action.type, 'create');
  assert.equal(issues.length, 2);
});

test('each problem has its own issue, and a skipped check leaves its issue alone', () => {
  const { issues, run } = tracker();
  const tiles = { key: 'tiles', title: 'Alert: tiles', ok: false, answer: '429' };
  run([down, tiles], '2026-10-28T00:00:00Z');
  assert.equal(issues.length, 2);
  const actions = run([up], '2026-10-28T00:15:00Z');
  assert.deepEqual(
    actions.map((action) => [action.type, action.number]),
    [['close', 1]],
  );
  assert.equal(issues[1].state, 'open');
});

test('a failed run comments on every new failure, naming the run', () => {
  const { issues, run } = tracker();
  const failed = (id) => ({
    key: 'run:backup.yml',
    title: 'Alert: the Backup run failed',
    ok: false,
    answer: `Run https://github.com/ParaOrg/Para/actions/runs/${id} failed.`,
    isEvent: true,
  });
  run([failed(1)], '2026-10-28T00:00:00Z');
  const [action] = run([failed(2)], '2026-10-29T00:00:00Z');
  assert.equal(action.type, 'update');
  assert.match(action.comment, /runs\/2 failed/);
  assert.equal(issues.length, 1);
});

test("an issue without the marker, or someone else's, is never touched", () => {
  const issues = [{ number: 7, state: 'open', body: 'Hand-written alert', closedAt: null }];
  const [action] = planAlerts([up, down], issues, '2026-10-28T00:00:00Z');
  assert.equal(action.type, 'create');
});
