// The watch, every 15 minutes from .github/workflows/watch.yml: checks the live site, a tile,
// the published map's age and the last backup and tiles builds, then opens, updates or
// closes one `alert` issue per problem. It writes nothing but issues.
//
//   GITHUB_REPOSITORY=ParaOrg/Para GITHUB_TOKEN=... node scripts/watch/watch.mjs
//
// WATCH_DRY_RUN=1 prints the plan and writes nothing. WATCH_TILES points the tiles check at
// another address (the acceptance check's "wrong address"). WATCH_ALL=1 runs the tiles check
// on every run; otherwise it runs on even run numbers only, so the Worker sees about 96
// requests a day, not 192.

import { planAlerts } from './alerts.mjs';
import {
  BACKUP_MAX_AGE_DAYS,
  MAP_MAX_AGE_HOURS,
  TILES,
  TILES_BUILD_MAX_AGE_DAYS,
  checkLastSuccess,
  checkPublishedMap,
  checkSite,
  checkTiles,
  lastRunSucceeded,
  withRetries,
} from './checks.mjs';
import { gitHub } from './github.mjs';

const env = process.env;
const now = new Date().toISOString();
const github = gitHub({ repository: env.GITHUB_REPOSITORY, token: env.GITHUB_TOKEN });
const tiles = env.WATCH_TILES || TILES;
const shouldCheckTiles = env.WATCH_ALL === '1' || Number(env.GITHUB_RUN_NUMBER ?? 0) % 2 === 0;

// Each check: its key, its issue's title, the first thing to try, and the check itself.
const checks = [
  {
    key: 'site',
    title: 'Alert: the site is down',
    hint: 'Open https://www.para-commute.org/ on a phone. If it is down, check the site Worker in the Cloudflare dashboard (Workers & Pages, its latest deployment) and the DNS records of para-commute.org.',
    run: () => checkSite(fetch),
  },
  {
    key: 'published-map',
    title: 'Alert: the published map is missing or stale',
    hint: `The map should be republished daily. Open the latest "Publish map" run in Actions: a failed run says why; no run in ${MAP_MAX_AGE_HOURS} hours means its schedule was turned off (Actions, Publish map, Enable workflow).`,
    run: () => checkPublishedMap(fetch, now),
  },
  {
    key: 'tiles',
    title: 'Alert: the map tiles are not loading',
    hint: `Open ${TILES}/health. A 503 means the bucket has no current.json; a 429 or 1027 error means the Worker's daily limit was reached; anything else, check the para-tiles Worker's logs in Cloudflare.`,
    run: () => checkTiles(fetch, tiles),
    isSkipped: !shouldCheckTiles,
  },
  {
    key: 'backup-age',
    title: 'Alert: no backup in over a week',
    hint: 'Open the latest "Backup" run in Actions. If its schedule is off, press Enable workflow; if a secret is missing, its log names it.',
    run: async () =>
      checkLastSuccess(
        await github.workflowRuns('backup.yml', 'success'),
        ['schedule', 'workflow_dispatch'],
        BACKUP_MAX_AGE_DAYS,
        now,
      ),
  },
  {
    key: 'tiles-build-age',
    title: 'Alert: the tiles have not been rebuilt this month',
    hint: 'Open the latest "Tiles" run in Actions. If its schedule is off, press Enable workflow; a failed upload names the step.',
    run: async () =>
      checkLastSuccess(
        await github.workflowRuns('tiles.yml', 'success'),
        ['schedule', 'push'],
        TILES_BUILD_MAX_AGE_DAYS,
        now,
      ),
  },
];

const results = [];
for (const check of checks.filter((each) => !each.isSkipped)) {
  const outcome = await withRetries(check.run);
  console.info(`${outcome.ok ? 'pass' : 'FAIL'} ${check.key}: ${outcome.answer}`);
  results.push({ key: check.key, title: check.title, hint: check.hint, ...outcome });
}

// A failed run's alert (scripts/watch/report-failed-run.mjs) closes once the workflow's
// next run passes. The watch never opens one: the failed run did.
for (const file of ['publish-map.yml', 'backup.yml', 'tiles.yml']) {
  if (lastRunSucceeded(await github.workflowRuns(file, 'completed'))) {
    results.push({ key: `run:${file}`, title: '', ok: true });
  }
}

const actions = planAlerts(results, await github.alertIssues(), now);
for (const action of actions) {
  console.info(
    `${action.type} #${action.number ?? 'new'}${action.title ? `: ${action.title}` : ''}`,
  );
  if (env.WATCH_DRY_RUN !== '1') await github.apply(action);
}
if (actions.length === 0) console.info('No issue to change.');
