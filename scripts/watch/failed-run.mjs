// What a failed run's alert says, per workflow: the first thing to try and its runbook. Pure, so
// tests/unit/watch-failed-run-test.mjs can hold every workflow that reports a failed run to
// having both. report-failed-run.mjs opens the alert; the watch closes it once the workflow's
// next run passes.

import { runbookLink } from './alerts.mjs';

// The first thing to try, per workflow.
const HINTS = {
  'publish-map.yml':
    'Read the issue "The map needs a look": it is the same failure, with the run\'s log and the data report. An unreachable database or a table gone private are the usual causes. The live map keeps its last file meanwhile.',
  'backup.yml':
    'Open the run and read the failed step: a missing secret or key is named there. Press "Run workflow" on Backup once it is fixed; the run prints sizes and counts only.',
  'tiles.yml':
    'Open the run and read the failed step. The live tiles stay the last build\'s until a run uploads, so nothing is broken for commuters yet. Press "Run workflow" with "upload" ticked on staging once it is fixed.',
  'landmarks.yml':
    'Open the run and read the failed step: a download from openstreetmap.fr, the file\'s check, or a shrink of more than 20% (tick "allow shrink" on "Run workflow" if it is real). The app keeps the committed landmark file meanwhile, so place search still works.',
  'database.yml':
    'Open the run and see which job failed. Nothing here touches the live database: it builds a throwaway copy from the migrations and checks its rules. A failure with no change to the SQL is usually a download or a container that did not start: press "Re-run failed jobs" once. If it fails again, the last change under supabase/ or the studio\'s data code broke a rule: tell the hub before anything else is applied live.',
  'security.yml':
    'Open the run and see which job failed. "No secrets in the history": a key may have been committed; do not delete the file, tell the owner first, because the key has to be changed before anything else. "No known holes in production dependencies": a package Para ships has a new advisory; `npm audit --omit=dev` names it and the version that fixes it.',
  'codeql.yml':
    'Open the run and read the failed step. This is the scan itself failing to run, not a finding: findings show under the repository\'s Security tab and never turn the run red. Press "Re-run failed jobs" once; if it fails again, tell the hub.',
};

const RUNBOOKS = {
  'publish-map.yml': runbookLink('a-publish-failed'),
  'backup.yml': runbookLink('a-backup-failed'),
  'tiles.yml': runbookLink('the-tiles-build-failed'),
  'landmarks.yml': runbookLink('the-landmark-refresh-failed'),
  'database.yml': runbookLink('the-database-check-failed'),
  'security.yml': runbookLink('a-secret-or-a-vulnerable-package-was-found'),
  'codeql.yml': runbookLink('a-secret-or-a-vulnerable-package-was-found'),
};

/** The workflow files whose failed run opens an alert. */
export const FAILED_RUN_WORKFLOWS = Object.keys(HINTS);

/** The alert for a failed run, read from the job's environment (report-failed-run.mjs's header). */
export function failedRunResult(env) {
  return {
    key: `run:${env.WORKFLOW_FILE}`,
    title: `Alert: the ${env.WORKFLOW_NAME} run failed`,
    ok: false,
    answer: `Run ${env.RUN_URL} failed (${env.GITHUB_EVENT_NAME ?? 'unknown'} on ${env.GITHUB_REF_NAME ?? 'unknown'}).`,
    hint: HINTS[env.WORKFLOW_FILE],
    runbook: RUNBOOKS[env.WORKFLOW_FILE],
    isEvent: true,
  };
}
