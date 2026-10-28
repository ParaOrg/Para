// The last job of publish-map.yml, backup.yml and tiles.yml, when the run failed: opens the
// workflow's `alert` issue, or brings the open one up to date with a comment naming this run.
// The watch closes it once the workflow's next run passes.
//
//   WORKFLOW_FILE=backup.yml WORKFLOW_NAME=Backup RUN_URL=... node scripts/watch/report-failed-run.mjs

import { planAlerts, runbookLink } from './alerts.mjs';
import { gitHub } from './github.mjs';

const env = process.env;
const now = new Date().toISOString();
const github = gitHub({ repository: env.GITHUB_REPOSITORY, token: env.GITHUB_TOKEN });

// The first thing to try, per workflow.
const HINTS = {
  'publish-map.yml':
    'Read the issue "The map needs a look": it is the same failure, with the run\'s log and the data report. An unreachable database or a table gone private are the usual causes. The live map keeps its last file meanwhile.',
  'backup.yml':
    'Open the run and read the failed step: a missing secret or key is named there. Press "Run workflow" on Backup once it is fixed; the run prints sizes and counts only.',
  'tiles.yml':
    'Open the run and read the failed step. The live tiles stay the last build\'s until a run uploads, so nothing is broken for commuters yet. Press "Run workflow" with "upload" ticked on staging once it is fixed.',
};

const RUNBOOKS = {
  'publish-map.yml': runbookLink('a-publish-failed'),
  'backup.yml': runbookLink('a-backup-failed'),
  'tiles.yml': runbookLink('the-tiles-build-failed'),
};

const result = {
  key: `run:${env.WORKFLOW_FILE}`,
  title: `Alert: the ${env.WORKFLOW_NAME} run failed`,
  ok: false,
  answer: `Run ${env.RUN_URL} failed (${env.GITHUB_EVENT_NAME ?? 'unknown'} on ${env.GITHUB_REF_NAME ?? 'unknown'}).`,
  hint: HINTS[env.WORKFLOW_FILE],
  runbook: RUNBOOKS[env.WORKFLOW_FILE],
  isEvent: true,
};

for (const action of planAlerts([result], await github.alertIssues(), now)) {
  const number = await github.apply(action);
  console.info(`${action.type} #${number}: ${result.title}`);
}
