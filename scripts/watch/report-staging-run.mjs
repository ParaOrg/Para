// A run on staging finished (staging-red.yml, on CI, Contributor app and Security): a failed run
// opens the workflow's staging alert issue, labelled for triage, or brings the open one up to date
// with a comment naming the run; a passing run closes it. So a red staging is never left
// unnoticed, as it was from #830 to #839.
//
//   WORKFLOW_FILE=ci.yml WORKFLOW_NAME=CI CONCLUSION=failure RUN_URL=... HEAD_SHA=... \
//     node scripts/watch/report-staging-run.mjs

import { planAlerts } from './alerts.mjs';
import { gitHub } from './github.mjs';

const env = process.env;
const now = new Date().toISOString();
const github = gitHub({ repository: env.GITHUB_REPOSITORY, token: env.GITHUB_TOKEN });

const isRed = env.CONCLUSION === 'failure';
const result = {
  key: `staging:${env.WORKFLOW_FILE}`,
  title: `Staging is red: the ${env.WORKFLOW_NAME} run failed`,
  ok: !isRed,
  answer: `Run ${env.RUN_URL} failed on staging at ${String(env.HEAD_SHA ?? '').slice(0, 7)}.`,
  hint: 'Open the run and read the failed job. A known flake is fixed at its cause, never skipped; a real break is fixed before more work merges into staging.',
  isEvent: true,
  labels: ['needs-triage'],
};

for (const action of planAlerts([result], await github.alertIssues(), now)) {
  const number = await github.apply(action);
  console.info(`${action.type} #${number ?? ''}: ${result.title}`);
}
