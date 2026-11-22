// How long each part and each check of a CI run took, read from the run's own job logs. GitHub
// stamps every log line with the time it was written, so a check's time is the time from the
// line before it that marks progress (the previous check, or the start of the suite's step) to
// its own PASS, FAIL or SKIP line. Nothing in the suites or the workflow changes to get it.
//
// usage: node check-times.mjs <logs-dir> [label]
//
// <logs-dir> holds the run as fetch-logs.mjs writes it: jobs.json (the run's jobs, with steps)
// and <job id>.txt (each job's log). Writes ./out/<label>.md and ./out/<label>.json; the label
// defaults to the folder's name (the run's id).
//
// What a check's time includes: everything the suite did between two check lines, the waits
// and the page's work alike, so the first check of a section carries the section's setup, and
// the first check of a step carries the step's start (a browser launching, a page loading). A
// line the suite printed between checks (a heading, a note) does not split the time. A job's
// "before the suite" is the time to the start of the first step that printed a check.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const [logsDir, labelArg] = process.argv.slice(2);
if (!logsDir || !existsSync(join(logsDir, 'jobs.json'))) {
  console.error('usage: node check-times.mjs <logs-dir with jobs.json and <job id>.txt> [label]');
  process.exit(2);
}
const label = labelArg ?? basename(logsDir.replace(/\/$/, ''));

const LINE = /^(\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z) (.*)$/;
const CHECK = /^(PASS|FAIL|SKIP) {2}(.*)$/;
const STEP_START = /^##\[group\]Run /;

const seconds = (from, to) => (Date.parse(to) - Date.parse(from)) / 1000;
const round = (value) => Math.round(value * 10) / 10;

/** A check's name: its text up to the detail, which the harness sets off with two spaces. */
const nameOf = (text) => {
  const indent = text.match(/^ */)[0].length;
  return `${' '.repeat(indent)}${text.trimStart().split(/ {2,}/)[0]}`.trimEnd();
};

function readJob(job) {
  const file = join(logsDir, `${job.id}.txt`);
  if (!existsSync(file)) return { ...job, missing: true, checks: [] };
  const lines = readFileSync(file, 'utf8')
    .split('\n')
    .map((line) => line.replace(/^\uFEFF/, '').match(LINE))
    .filter(Boolean)
    .map(([, at, text]) => ({ at, text }));
  const checks = [];
  let stepStart = null;
  let suiteStart = null;
  let mark = null;
  for (const { at, text } of lines) {
    if (STEP_START.test(text)) {
      stepStart = at;
      mark = at;
      continue;
    }
    const check = text.match(CHECK);
    if (!check || !mark) continue;
    suiteStart ??= stepStart;
    checks.push({ status: check[1], name: nameOf(check[2]), seconds: round(seconds(mark, at)) });
    mark = at;
  }
  return { ...job, suiteStart, checks };
}

const jobs = JSON.parse(readFileSync(join(logsDir, 'jobs.json'), 'utf8'))
  .filter((job) => job.conclusion === 'success' || job.conclusion === 'failure')
  .map(readJob);

const parts = jobs
  .filter((job) => job.checks.length > 0)
  .map((job) => {
    const total = seconds(job.started_at, job.completed_at);
    const setup = job.suiteStart ? seconds(job.started_at, job.suiteStart) : null;
    const inChecks = job.checks.reduce((sum, check) => sum + check.seconds, 0);
    return {
      id: job.id,
      job: job.name,
      conclusion: job.conclusion,
      total: round(total),
      setup: setup === null ? null : round(setup),
      inChecks: round(inChecks),
      count: job.checks.length,
      checks: job.checks,
    };
  })
  .sort((a, b) => b.total - a.total);

const allChecks = parts
  .flatMap((part) => part.checks.map((check) => ({ job: part.job, ...check })))
  .sort((a, b) => b.seconds - a.seconds);

const minutes = (value) =>
  value === null ? '–' : `${Math.floor(value / 60)}m${String(Math.round(value % 60)).padStart(2, '0')}s`;
const cell = (text) => text.replace(/\|/g, '\\|');

const report = [
  `# Check times: ${label}`,
  '',
  'Read from the job logs (check-times.mjs). A check\'s time runs from the line before it that marks progress to its own line, so it includes the waits before it.',
  '',
  '## Parts, slowest first',
  '',
  '| Job | Total | Before the suite | In checks | Checks | Slowest check |',
  '| --- | --- | --- | --- | --- | --- |',
  ...parts.map((part) => {
    const slowest = [...part.checks].sort((a, b) => b.seconds - a.seconds)[0];
    return `| ${part.job} | ${minutes(part.total)} | ${minutes(part.setup)} | ${minutes(part.inChecks)} | ${part.count} | ${cell(slowest.name.trim())} (${slowest.seconds} s) |`;
  }),
  '',
  '## The 40 slowest checks of the run',
  '',
  '| Seconds | Job | Check |',
  '| --- | --- | --- |',
  ...allChecks.slice(0, 40).map((c) => `| ${c.seconds} | ${c.job} | ${cell(c.name.trim())} |`),
  '',
  ...parts.flatMap((part) => [
    `## ${part.job}: the 15 slowest of ${part.count} checks`,
    '',
    '| Seconds | Check |',
    '| --- | --- |',
    ...[...part.checks]
      .sort((a, b) => b.seconds - a.seconds)
      .slice(0, 15)
      .map((c) => `| ${c.seconds} | ${cell(c.name.trim())} |`),
    '',
  ]),
].join('\n');

const missing = jobs.filter((job) => job.missing).map((job) => job.name);
mkdirSync(join(HERE, 'out'), { recursive: true });
writeFileSync(join(HERE, 'out', `${label}.md`), `${report}\n`);
// One check a line: a record that diffs and greps, without a line per field.
const checkLines = (part) => part.checks.map((check) => `   ${JSON.stringify(check)}`).join(',\n');
writeFileSync(
  join(HERE, 'out', `${label}.json`),
  `{"label": ${JSON.stringify(label)}, "parts": [\n${parts
    .map(({ checks, ...rest }) => `  {${JSON.stringify(rest).slice(1, -1)}, "checks": [\n${checkLines({ checks })}\n  ]}`)
    .join(',\n')}\n]}\n`,
);
console.log(
  `${label}: ${parts.length} parts with checks, ${allChecks.length} checks${missing.length ? `; no log for ${missing.join(', ')}` : ''}`,
);
console.log(`wrote out/${label}.md and out/${label}.json`);
