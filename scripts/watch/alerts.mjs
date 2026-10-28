// What to do to the `alert` issues, given what the checks found. Pure: no network, no clock,
// so the unit checks can feed it a site that goes down, comes back, stays down or flaps.
//
// One problem is one issue. The issue carries its problem's key in a hidden marker, so a
// later run finds it again whatever the title says, and never opens a second one.

export const ALERT_LABEL = 'alert';

// A problem that comes back within a day reopens its old issue instead of opening a new
// one, so a flapping check is one thread, not a new email each time.
export const REOPEN_WITHIN_MS = 24 * 60 * 60 * 1000;

// The runbooks in docs/operations.md, on main: what is live is what an alert is about.
const RUNBOOKS = 'https://github.com/ParaOrg/Para/blob/main/docs/operations.md';

/** The link to one runbook section of docs/operations.md, by its heading's anchor. */
export function runbookLink(anchor) {
  return `${RUNBOOKS}#${anchor}`;
}

const MARKER = /<!-- alert: (\S+) since=(\S+) failures=(\d+) -->/;

/**
 * @typedef {object} CheckResult
 * @property {string} key Stable name of the problem, e.g. `site` or `run:backup.yml`.
 * @property {string} title The issue's title.
 * @property {boolean} ok
 * @property {string} [answer] What came back, for a failure.
 * @property {string} [hint] The first thing to try, for a failure.
 * @property {string} [runbook] The runbook's link, from `runbookLink`.
 * @property {boolean} [isEvent] A failed run, not a state: each one is worth a comment.
 */

/**
 * @typedef {object} AlertIssue
 * @property {number} number
 * @property {'open' | 'closed'} state
 * @property {string} body
 * @property {string | null} closedAt
 */

/** The key, start and failure count an alert issue's body carries, or null for none. */
export function readMarker(body) {
  const match = MARKER.exec(body ?? '');
  if (!match) return null;
  return { key: match[1], since: match[2], failures: Number(match[3]) };
}

/** The body of an alert issue: what failed, since when, the answer and the first thing to try. */
export function alertBody(result, since, failures, now) {
  const checks = failures === 1 ? '1 check' : `${failures} checks in a row`;
  return [
    `**What failed:** ${result.title}`,
    '',
    `**Since:** ${since} (${checks})`,
    `**Last failed:** ${now}`,
    '',
    '**The answer received:**',
    '',
    '```',
    result.answer ?? '(none)',
    '```',
    '',
    `**First thing to try:** ${result.hint ?? 'Open the run linked above and read its log.'}`,
    '',
    ...(result.runbook ? [`**Runbook:** ${result.runbook}`, ''] : []),
    '_Kept by the watch (`.github/workflows/watch.yml`). It closes this issue itself when the check passes again._',
    '',
    `<!-- alert: ${result.key} since=${since} failures=${failures} -->`,
  ].join('\n');
}

function findIssue(issues, key, state) {
  return issues
    .filter((issue) => issue.state === state && readMarker(issue.body)?.key === key)
    .sort((a, b) => a.number - b.number)[0];
}

function lastClosed(issues, key) {
  return issues
    .filter((issue) => issue.state === 'closed' && readMarker(issue.body)?.key === key)
    .sort((a, b) => Date.parse(b.closedAt ?? '') - Date.parse(a.closedAt ?? ''))[0];
}

/**
 * The actions that bring the alert issues in line with the results. A key with no result
 * (a check skipped this run) leaves its issue as it is.
 *
 * @param {CheckResult[]} results
 * @param {AlertIssue[]} issues Every issue labelled `alert`, open or recently closed.
 * @param {string} now ISO time of this run.
 */
export function planAlerts(results, issues, now) {
  const actions = [];
  for (const result of results) {
    const open = findIssue(issues, result.key, 'open');
    if (result.ok) {
      if (open) {
        actions.push({ type: 'close', number: open.number, comment: `Passing again at ${now}.` });
      }
      continue;
    }
    if (open) {
      const marker = readMarker(open.body);
      const failures = (marker?.failures ?? 0) + 1;
      const body = alertBody(result, marker?.since ?? now, failures, now);
      const comment = result.isEvent ? `Failed again at ${now}: ${result.answer}` : undefined;
      actions.push({ type: 'update', number: open.number, body, comment });
      continue;
    }
    const closed = lastClosed(issues, result.key);
    const closedAgo = closed ? Date.parse(now) - Date.parse(closed.closedAt ?? '') : Infinity;
    if (closed && closedAgo <= REOPEN_WITHIN_MS) {
      const body = alertBody(result, now, 1, now);
      const comment = `Failing again at ${now}, within a day of passing.`;
      actions.push({ type: 'reopen', number: closed.number, body, comment });
      continue;
    }
    actions.push({ type: 'create', title: result.title, body: alertBody(result, now, 1, now) });
  }
  return actions;
}
