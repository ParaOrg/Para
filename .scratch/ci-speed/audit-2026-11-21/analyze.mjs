// Reads ./raw/<label>/ (fetch.mjs) and writes ./out/<label>.md and ./out/<label>.json.
//
// usage: node analyze.mjs <label> [take]      take = the newest N runs of the label (default all)
//
// Definitions (the report repeats them):
//   waiting  = job.started_at - job.created_at            (a runner being found)
//   setup    = job.started_at -> start of the first step that is not a setup step
//   running  = that step's start -> job.completed_at      (includes the "Post ..." steps)
//   percentiles are nearest-rank: p = sorted[ceil(q * n) - 1]
//   job stats use jobs that concluded success or failure; cancelled and skipped are counted apart.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const [label, takeArg] = process.argv.slice(2);
const rawDir = join(HERE, 'raw', label);
mkdirSync(join(HERE, 'out'), { recursive: true });

const SETUP_STEP = [
  /^Set up job$/,
  /^Pre /,
  /^Run actions\/checkout@/,
  /^Run actions\/setup-node@/,
  /^Run actions\/setup-java@/,
  /^Run actions\/cache/,
  /^Run gradle\/actions\/setup-gradle@/,
  /^Run npm ci$/,
  /^Run \.\/\.github\/actions\/prepare-/,
  /^Run npx playwright install/,
  /^Install Chromium's system packages$/,
  /^Give the dev server the public database address and key$/,
  /^Turn uploads on/,
  /^Give turnstile-test a Turnstile site key$/,
  /^Start the dev server$/,
  /^The preview build$/, // preview-suite: the artifact download
  /^Initialize CodeQL$/,
  /^Run github\/codeql-action\/init@/,
];
const TEARDOWN_STEP = [/^Post /, /^Complete job$/];
const isSetup = (name) => SETUP_STEP.some((re) => re.test(name));
const isTeardown = (name) => TEARDOWN_STEP.some((re) => re.test(name));

const GROUPS = [
  ['changes', /^What changed$/],
  ['build', /^Build and unit checks$/],
  ['storybook', /^Storybook plays$/],
  ['public', /^Build and the public map$/],
  ['studio', /^The editor$/],
  ['drawing', /^The drawing suites( \(\d of \d\))?$/],
  ['preview-suite', /^(pwa-test|pwa-test \(own tiles\)|handover-test|contribute-offline-test)$/],
  [
    'public-suite',
    /^(phone-test( \(\d of \d\))?|commuter-test( \(\d of \d\))?|The short public suites|gate-test|scale-test|map-pins-test|back-test|where-test|loop-test)$/,
  ],
  [
    'contribute-suite',
    /^(contribute-test|upload-test|profile-test|account-test, forgot-password-test, claim-test|account-test|forgot-password-test|claim-test)$/,
  ],
  [
    'studio-suite',
    /^(studio-scale-test, studio-contributors-test|turnstile-test, studio-public-view-test, studio-two-editors-test|save-test|save-ikot-test|save-edit-test|save-drafts-test|studio-scale-test|studio-contributors-test|turnstile-test|studio-public-view-test|studio-two-editors-test)$/,
  ],
];
const groupOf = (name) => GROUPS.find(([, re]) => re.test(name))?.[0] ?? 'other';
const NEEDS = {
  changes: [],
  build: ['changes'],
  storybook: ['changes'],
  'public-suite': ['changes'],
  'contribute-suite': ['changes'],
  'studio-suite': ['changes'],
  drawing: ['changes'],
  'preview-suite': ['changes', 'build'],
  public: ['changes', 'build', 'public-suite', 'contribute-suite', 'preview-suite'],
  studio: ['changes', 'build', 'studio-suite', 'drawing'],
};
const REQUIRED = ['What changed', 'Build and the public map', 'The editor'];
const OLD_SHAPE = /^(phone-test|commuter-test \(\d of 3\)|gate-test|The drawing suites)$/;

const t = (iso) => (iso ? Date.parse(iso) / 1000 : null);
const pct = (values, q) => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(q * sorted.length) - 1)];
};
const stat = (values) => ({
  n: values.length,
  p50: pct(values, 0.5),
  p95: pct(values, 0.95),
  max: values.length ? Math.max(...values) : null,
  mean: values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : null,
});
const fmt = (seconds) => {
  if (seconds == null) return '–';
  if (seconds < 100) return `${Math.round(seconds)} s`;
  return `${Math.floor(seconds / 60)}m${String(Math.round(seconds % 60)).padStart(2, '0')}s`;
};
const cell = (s) => `${fmt(s.p50)} / ${fmt(s.p95)}`;

let runs = JSON.parse(readFileSync(join(rawDir, 'runs.json'), 'utf8'));
if (takeArg) runs = runs.slice(0, Number(takeArg));

/** One job, split into waiting, setup and running. */
function split(job) {
  const created = t(job.created_at);
  const started = t(job.started_at);
  const completed = t(job.completed_at);
  const steps = (job.steps ?? []).slice().sort((a, b) => a.number - b.number);
  const firstWork = steps.find(
    (step) =>
      !isSetup(step.name) && !isTeardown(step.name) && step.conclusion !== 'skipped' && step.started_at,
  );
  const waiting = created != null && started != null ? Math.max(0, started - created) : null;
  const workStart = firstWork ? t(firstWork.started_at) : null;
  return {
    id: job.id,
    name: job.name,
    group: groupOf(job.name),
    conclusion: job.conclusion,
    created,
    started,
    completed,
    waiting,
    setup: workStart != null ? Math.max(0, workStart - started) : null,
    running: workStart != null ? Math.max(0, completed - workStart) : null,
    total: started != null && completed != null ? completed - started : null,
    billedMinutes:
      job.conclusion !== 'skipped' && started != null && completed != null
        ? Math.max(1, Math.ceil((completed - started) / 60))
        : 0,
    labels: (job.labels ?? []).join(','),
    runner: job.runner_group_name ?? '',
    firstWorkStep: firstWork?.name ?? null,
    steps: steps.map((step) => ({
      name: step.name,
      conclusion: step.conclusion,
      seconds:
        step.started_at && step.completed_at ? t(step.completed_at) - t(step.started_at) : null,
      setup: isSetup(step.name),
      teardown: isTeardown(step.name),
    })),
  };
}

const perRun = [];
const allJobs = [];
let multiAttempt = 0;
const missingCreated = { jobs: 0, missing: 0 };
for (const run of runs) {
  const attempts = JSON.parse(readFileSync(join(rawDir, 'jobs', `${run.id}.json`), 'utf8'));
  if (run.run_attempt > 1) multiAttempt++;
  const jobs = attempts[run.run_attempt].jobs.map(split);
  for (const job of attempts[run.run_attempt].jobs) {
    missingCreated.jobs++;
    if (!job.created_at) missingCreated.missing++;
  }
  const ran = jobs.filter((job) => job.conclusion !== 'skipped');
  const created = t(run.created_at);
  const byName = Object.fromEntries(jobs.map((job) => [job.name, job]));
  const required = REQUIRED.map((name) => byName[name]).filter(Boolean);
  const verdict =
    (run.conclusion === 'success' || run.conclusion === 'failure') &&
    required.length === REQUIRED.length &&
    required.every((job) => job.conclusion === 'success' || job.conclusion === 'failure');
  const resultAt = verdict ? Math.max(...required.map((job) => job.completed)) : null;
  const groupsRan = [...new Set(ran.map((job) => job.group))];
  const scope =
    ['public-suite', 'studio-suite', 'contribute-suite', 'drawing', 'build']
      .filter((group) => groupsRan.includes(group))
      .map((group) => group.replace('-suite', ''))
      .join('+') || 'nothing (docs only)';

  // The critical chain: from the required job that finished last, back through whichever needed
  // job finished last each time.
  let chain = [];
  if (verdict) {
    let job = required.reduce((a, b) => (b.completed > a.completed ? b : a));
    chain.push(job);
    for (;;) {
      const needs = NEEDS[job.group] ?? [];
      const before = ran.filter(
        (other) => needs.includes(other.group) && other.completed != null && other.completed <= job.created + 5,
      );
      if (before.length === 0) break;
      job = before.reduce((a, b) => (b.completed > a.completed ? b : a));
      chain.push(job);
    }
    chain = chain.reverse();
  }
  const firstJobCreated = ran.length ? Math.min(...ran.map((job) => job.created)) : null;
  const buckets = verdict
    ? {
        beforeFirstJob: firstJobCreated - created,
        waiting: chain.reduce((sum, job) => sum + (job.waiting ?? 0), 0),
        setup: chain.reduce((sum, job) => sum + (job.setup ?? 0), 0),
        running: chain.reduce((sum, job) => sum + (job.running ?? job.total ?? 0), 0),
      }
    : null;
  if (buckets) {
    buckets.handoffs =
      resultAt - created - buckets.beforeFirstJob - buckets.waiting - buckets.setup - buckets.running;
  }
  perRun.push({
    id: run.id,
    created_at: run.created_at,
    branch: run.head_branch,
    actor: run.actor?.login,
    conclusion: run.conclusion,
    attempt: run.run_attempt,
    oldShape: jobs.some((job) => OLD_SHAPE.test(job.name) && job.conclusion !== 'skipped'),
    jobsRan: ran.length,
    scope,
    result: verdict ? resultAt - created : null,
    wholeRun: t(run.updated_at) - created,
    beforeFirstJob: firstJobCreated != null ? firstJobCreated - created : null,
    chain: chain.map((job) => job.name),
    slowestLeaf: chain.length >= 2 ? chain[chain.length - 2].name : null,
    buckets,
    billedMinutes: ran.reduce((sum, job) => sum + job.billedMinutes, 0),
    failedJobs: jobs.filter((job) => job.conclusion === 'failure').map((job) => job.name),
    cancelledJobs: jobs.filter((job) => job.conclusion === 'cancelled').length,
  });
  for (const job of jobs) allJobs.push({ ...job, run: run.id });
}

// ---- per job
const names = [...new Set(allJobs.map((job) => job.name))];
const perJob = names
  .map((name) => {
    const jobs = allJobs.filter((job) => job.name === name);
    const done = jobs.filter((job) => job.conclusion === 'success' || job.conclusion === 'failure');
    const setupSteps = new Set();
    for (const job of done) for (const step of job.steps) if (step.setup && step.conclusion !== 'skipped') setupSteps.add(step.name.replace(/@[0-9a-f]{40}/, '@<sha>'));
    return {
      name,
      group: groupOf(name),
      ran: done.length,
      failed: jobs.filter((job) => job.conclusion === 'failure').length,
      cancelled: jobs.filter((job) => job.conclusion === 'cancelled').length,
      skipped: jobs.filter((job) => job.conclusion === 'skipped').length,
      waiting: stat(done.map((job) => job.waiting).filter((v) => v != null)),
      setup: stat(done.map((job) => job.setup).filter((v) => v != null)),
      running: stat(done.map((job) => job.running).filter((v) => v != null)),
      total: stat(done.map((job) => job.total).filter((v) => v != null)),
      firstWorkSteps: [...new Set(done.map((job) => job.firstWorkStep).filter(Boolean))],
      setupSteps: [...setupSteps],
    };
  })
  .filter((job) => job.ran > 0)
  .sort((a, b) => (b.total.p50 ?? 0) - (a.total.p50 ?? 0));

// ---- per group (every job of the group pooled)
const groups = [...new Set(allJobs.map((job) => job.group))];
const perGroup = groups.map((group) => {
  const done = allJobs.filter(
    (job) => job.group === group && (job.conclusion === 'success' || job.conclusion === 'failure'),
  );
  return {
    group,
    jobs: done.length,
    waiting: stat(done.map((job) => job.waiting).filter((v) => v != null)),
    setup: stat(done.map((job) => job.setup).filter((v) => v != null)),
    running: stat(done.map((job) => job.running).filter((v) => v != null)),
    total: stat(done.map((job) => job.total).filter((v) => v != null)),
  };
});
const everyDone = allJobs.filter((job) => job.conclusion === 'success' || job.conclusion === 'failure');
const overall = {
  jobs: everyDone.length,
  waiting: stat(everyDone.map((job) => job.waiting).filter((v) => v != null)),
  setup: stat(everyDone.map((job) => job.setup).filter((v) => v != null)),
  running: stat(everyDone.map((job) => job.running).filter((v) => v != null)),
  sumWaiting: everyDone.reduce((sum, job) => sum + (job.waiting ?? 0), 0),
  sumSetup: everyDone.reduce((sum, job) => sum + (job.setup ?? 0), 0),
  sumRunning: everyDone.reduce((sum, job) => sum + (job.running ?? 0), 0),
};

// ---- per step, per job name
const stepStats = {};
for (const job of everyDone) {
  for (const step of job.steps) {
    if (step.seconds == null || step.conclusion === 'skipped') continue;
    const stepName = step.name.replace(/@[0-9a-f]{40}/, '@<sha>');
    const key = `${job.group} :: ${stepName}`;
    (stepStats[key] ??= []).push(step.seconds);
  }
}
const perStep = Object.entries(stepStats)
  .map(([key, values]) => ({ key, ...stat(values) }))
  .filter((step) => step.p95 >= 2)
  .sort((a, b) => a.key.localeCompare(b.key));

// ---- runs
const verdictRuns = perRun.filter((run) => run.result != null);
const currentShape = verdictRuns.filter((run) => !run.oldShape);
const byScope = {};
for (const run of verdictRuns) (byScope[run.scope] ??= []).push(run);
const leaf = {};
for (const run of verdictRuns) if (run.slowestLeaf) leaf[run.slowestLeaf] = (leaf[run.slowestLeaf] ?? 0) + 1;
const failed = {};
for (const run of perRun) for (const name of run.failedJobs) failed[name] = (failed[name] ?? 0) + 1;
const conclusions = {};
for (const run of perRun) conclusions[run.conclusion] = (conclusions[run.conclusion] ?? 0) + 1;
const first = perRun[perRun.length - 1]?.created_at;
const last = perRun[0]?.created_at;
const days = (t(last) - t(first)) / 86400;
const billed = perRun.reduce((sum, run) => sum + run.billedMinutes, 0);
const billedByLabel = {};
for (const job of allJobs) if (job.billedMinutes) billedByLabel[`${job.labels} (${job.runner})`] = (billedByLabel[`${job.labels} (${job.runner})`] ?? 0) + job.billedMinutes;
const bucketStat = (list, key) => stat(list.map((run) => run.buckets[key]));

const summary = {
  label,
  runs: perRun.length,
  window: { first, last, days: Math.round(days * 100) / 100, runsPerDay: Math.round((perRun.length / days) * 10) / 10 },
  conclusions,
  multiAttempt,
  missingCreated,
  verdictRuns: verdictRuns.length,
  result: stat(verdictRuns.map((run) => run.result)),
  resultCurrentShape: stat(currentShape.map((run) => run.result)),
  wholeRun: stat(verdictRuns.map((run) => run.wholeRun)),
  beforeFirstJob: stat(perRun.map((run) => run.beforeFirstJob).filter((v) => v != null)),
  buckets: Object.fromEntries(
    ['beforeFirstJob', 'waiting', 'setup', 'running', 'handoffs'].map((key) => [key, bucketStat(verdictRuns, key)]),
  ),
  byScope: Object.fromEntries(
    Object.entries(byScope).map(([scope, list]) => [
      scope,
      {
        result: stat(list.map((run) => run.result)),
        jobsRan: stat(list.map((run) => run.jobsRan)),
        billed: stat(list.map((run) => run.billedMinutes)),
        buckets: Object.fromEntries(
          ['beforeFirstJob', 'waiting', 'setup', 'running', 'handoffs'].map((key) => [key, bucketStat(list, key)]),
        ),
      },
    ]),
  ),
  slowestLeaf: leaf,
  failedJobs: failed,
  billed: {
    minutes: billed,
    byLabel: billedByLabel,
    perRunMean: Math.round((billed / perRun.length) * 10) / 10,
    perDay: Math.round(billed / days),
    per30Days: Math.round((billed / days) * 30),
  },
  overall,
  perGroup,
  perJob,
  perStep,
};
writeFileSync(join(HERE, 'out', `${label}.json`), JSON.stringify({ summary, perRun }, null, 1));

// ---- markdown
const lines = [];
const out = (text = '') => lines.push(text);
out(`# ${label}: ${perRun.length} runs, ${first} to ${last} (${summary.window.days} days, ${summary.window.runsPerDay} runs/day)`);
out();
out(`Conclusions: ${JSON.stringify(conclusions)}. Runs with run_attempt > 1: ${multiAttempt}. Jobs without created_at: ${missingCreated.missing} of ${missingCreated.jobs}.`);
out();
out('## Time to result (run created to the last required job finished)');
out();
out('| Set | n | p50 | p95 | max |');
out('| --- | --- | --- | --- | --- |');
const row = (name, s) => out(`| ${name} | ${s.n} | ${fmt(s.p50)} | ${fmt(s.p95)} | ${fmt(s.max)} |`);
row('Every run with a verdict', summary.result);
row('…of the current job layout only', summary.resultCurrentShape);
row('Whole run (created to updated_at), verdict runs', summary.wholeRun);
row('Run created to first job created, all runs', summary.beforeFirstJob);
for (const [scope, value] of Object.entries(summary.byScope).sort((a, b) => b[1].result.n - a[1].result.n)) row(`scope: ${scope} (jobs ran p50 ${value.jobsRan.p50})`, value.result);
out();
out('## The critical chain, bucket by bucket (verdict runs)');
out();
out('| Bucket | p50 | p95 | mean |');
out('| --- | --- | --- | --- |');
for (const [key, s] of Object.entries(summary.buckets)) out(`| ${key} | ${fmt(s.p50)} | ${fmt(s.p95)} | ${fmt(s.mean)} |`);
out();
for (const [scope, value] of Object.entries(summary.byScope).sort((a, b) => b[1].result.n - a[1].result.n)) {
  out(`- scope ${scope} (n=${value.result.n}): ` + Object.entries(value.buckets).map(([key, s]) => `${key} ${fmt(s.p50)}/${fmt(s.p95)}`).join(', '));
}
out();
out('Job that set the result time (the last to finish before the summary job), by count: ' + Object.entries(leaf).sort((a, b) => b[1] - a[1]).map(([name, count]) => `${name} ${count}`).join('; '));
out();
out('## Every job: waiting / setup / running (p50 / p95)');
out();
out('| Job | group | ran | failed | cancelled | skipped | waiting | setup | running | whole job |');
out('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
for (const job of perJob) out(`| ${job.name} | ${job.group} | ${job.ran} | ${job.failed} | ${job.cancelled} | ${job.skipped} | ${cell(job.waiting)} | ${cell(job.setup)} | ${cell(job.running)} | ${cell(job.total)} |`);
out();
out('## By group (every job of the group pooled)');
out();
out('| Group | jobs | waiting | setup | running | whole job |');
out('| --- | --- | --- | --- | --- | --- |');
for (const group of perGroup) out(`| ${group.group} | ${group.jobs} | ${cell(group.waiting)} | ${cell(group.setup)} | ${cell(group.running)} | ${cell(group.total)} |`);
out(`| ALL | ${overall.jobs} | ${cell(overall.waiting)} | ${cell(overall.setup)} | ${cell(overall.running)} | |`);
out();
out(`Summed over every job that ran to a result: waiting ${Math.round(overall.sumWaiting / 60)} min, setup ${Math.round(overall.sumSetup / 60)} min, running ${Math.round(overall.sumRunning / 60)} min.`);
out();
out('## Steps (p95 of 2 s or more)');
out();
out('| group :: step | n | p50 | p95 | max |');
out('| --- | --- | --- | --- | --- |');
for (const step of perStep) out(`| ${step.key} | ${step.n} | ${fmt(step.p50)} | ${fmt(step.p95)} | ${fmt(step.max)} |`);
out();
out('## Setup steps and first work step, per job');
out();
for (const job of perJob) out(`- **${job.name}**: setup = ${job.setupSteps.join('; ')}. First work step: ${job.firstWorkSteps.join(' | ')}`);
out();
out('## Failures');
out();
out('Failed jobs by count: ' + (Object.entries(failed).sort((a, b) => b[1] - a[1]).map(([name, count]) => `${name} ${count}`).join('; ') || 'none'));
out();
out('## Billed minutes');
out();
out(`Sum of each job rounded up to the minute: ${billed} min over ${perRun.length} runs (${summary.billed.perRunMean} per run), ${summary.billed.perDay} per day, ${summary.billed.per30Days} per 30 days at this rate. By runner: ${JSON.stringify(billedByLabel)}.`);
writeFileSync(join(HERE, 'out', `${label}.md`), lines.join('\n') + '\n');
console.log(lines.slice(0, 40).join('\n'));
