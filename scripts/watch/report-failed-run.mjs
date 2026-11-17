// The last job of the workflows failed-run.mjs lists, when the run failed: opens the workflow's
// `alert` issue, or brings the open one up to date with a comment naming this run.
// The watch closes it once the workflow's next run passes.
//
//   WORKFLOW_FILE=backup.yml WORKFLOW_NAME=Backup RUN_URL=... node scripts/watch/report-failed-run.mjs

import { planAlerts } from './alerts.mjs';
import { failedRunResult } from './failed-run.mjs';
import { gitHub } from './github.mjs';

const env = process.env;
const now = new Date().toISOString();
const github = gitHub({ repository: env.GITHUB_REPOSITORY, token: env.GITHUB_TOKEN });

const result = failedRunResult(env);

for (const action of planAlerts([result], await github.alertIssues(), now)) {
  const number = await github.apply(action);
  console.info(`${action.type} #${number}: ${result.title}`);
}
