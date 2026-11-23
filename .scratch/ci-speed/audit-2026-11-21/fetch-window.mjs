// Every workflow run of the repository created in the audit window (all workflows, all events),
// and the jobs of a sample of each workflow+event group, to estimate the whole repository's
// job-minutes per month. Read-only (GET). Writes ./raw/window/.
import { execFile } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = 'ParaOrg/Para';
const outDir = join(HERE, 'raw', 'window');
mkdirSync(join(outDir, 'jobs'), { recursive: true });
const SAMPLE = 25;
// Seven whole days ending where the 150 pull-request runs end.
const DAYS = ['2026-11-14', '2026-11-15', '2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20'];

const gh = (path) =>
  new Promise((resolve, reject) => {
    execFile('gh', ['api', path], { maxBuffer: 256 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) reject(new Error(`${path}: ${stderr || error.message}`));
      else resolve(JSON.parse(stdout));
    });
  });

let runs = [];
const listFile = join(outDir, 'runs.json');
if (existsSync(listFile)) runs = JSON.parse(readFileSync(listFile, 'utf8'));
else {
  for (const day of DAYS) {
    // Two halves a day keeps each query under the API's 1,000-result cap.
    for (const [from, to] of [['00:00:00', '11:59:59'], ['12:00:00', '23:59:59']]) {
      for (let page = 1; ; page++) {
        const body = await gh(
          `repos/${REPO}/actions/runs?created=${day}T${from}Z..${day}T${to}Z&per_page=100&page=${page}`,
        );
        runs.push(
          ...body.workflow_runs.map((run) => ({
            id: run.id,
            name: run.name,
            path: run.path,
            event: run.event,
            status: run.status,
            conclusion: run.conclusion,
            created_at: run.created_at,
            run_started_at: run.run_started_at,
            updated_at: run.updated_at,
            run_attempt: run.run_attempt,
            head_branch: run.head_branch,
          })),
        );
        if (body.workflow_runs.length < 100) break;
      }
    }
    console.log(day, runs.length);
  }
  writeFileSync(listFile, JSON.stringify(runs));
}

const groups = {};
for (const run of runs) (groups[`${run.path} | ${run.event}`] ??= []).push(run);
const sample = [];
for (const list of Object.values(groups)) {
  const step = Math.max(1, Math.floor(list.length / SAMPLE));
  sample.push(...list.filter((_, index) => index % step === 0).slice(0, SAMPLE));
}
console.log(`${runs.length} runs in ${Object.keys(groups).length} groups; sampling jobs of ${sample.length}`);

let next = 0;
await Promise.all(
  Array.from({ length: 6 }, async () => {
    while (next < sample.length) {
      const run = sample[next++];
      const file = join(outDir, 'jobs', `${run.id}.json`);
      if (existsSync(file)) continue;
      const jobs = [];
      for (let page = 1; ; page++) {
        const body = await gh(`repos/${REPO}/actions/runs/${run.id}/jobs?filter=all&per_page=100&page=${page}`);
        jobs.push(...body.jobs);
        if (jobs.length >= body.total_count || body.jobs.length === 0) break;
      }
      writeFileSync(
        file,
        JSON.stringify(
          jobs.map((job) => ({
            name: job.name,
            conclusion: job.conclusion,
            run_attempt: job.run_attempt,
            created_at: job.created_at,
            started_at: job.started_at,
            completed_at: job.completed_at,
            labels: job.labels,
          })),
        ),
      );
    }
  }),
);

// Billed minutes: each job that ran, rounded up to the minute; every attempt counts.
const rows = [];
let total = 0;
for (const [key, list] of Object.entries(groups)) {
  const sampled = list.filter((run) => existsSync(join(outDir, 'jobs', `${run.id}.json`)));
  let minutes = 0;
  let jobsRan = 0;
  const labels = new Set();
  for (const run of sampled) {
    for (const job of JSON.parse(readFileSync(join(outDir, 'jobs', `${run.id}.json`), 'utf8'))) {
      if (job.conclusion === 'skipped' || !job.started_at || !job.completed_at) continue;
      minutes += Math.max(1, Math.ceil((Date.parse(job.completed_at) - Date.parse(job.started_at)) / 60000));
      jobsRan++;
      for (const label of job.labels ?? []) labels.add(label);
    }
  }
  const perRun = sampled.length ? minutes / sampled.length : 0;
  const weekly = perRun * list.length;
  total += weekly;
  rows.push({
    group: key,
    runs: list.length,
    sampled: sampled.length,
    jobsPerRun: sampled.length ? Math.round((jobsRan / sampled.length) * 10) / 10 : 0,
    minutesPerRun: Math.round(perRun * 10) / 10,
    minutesIn7Days: Math.round(weekly),
    labels: [...labels].join(','),
    reruns: list.filter((run) => run.run_attempt > 1).length,
  });
}
rows.sort((a, b) => b.minutesIn7Days - a.minutesIn7Days);
mkdirSync(join(HERE, 'out'), { recursive: true });
writeFileSync(join(HERE, 'out', 'window.json'), JSON.stringify({ days: DAYS, runs: runs.length, total: Math.round(total), rows }, null, 1));
console.log('| workflow | event | runs in 7 days | sampled | jobs per run | job-minutes per run | job-minutes in 7 days | runner | runs re-run |');
console.log('| --- | --- | --- | --- | --- | --- | --- | --- | --- |');
for (const row of rows) {
  const [path, event] = row.group.split(' | ');
  console.log(`| ${path.replace('.github/workflows/', '')} | ${event} | ${row.runs} | ${row.sampled} | ${row.jobsPerRun} | ${row.minutesPerRun} | ${row.minutesIn7Days} | ${row.labels} | ${row.reruns} |`);
}
console.log(`\nTotal: ${Math.round(total)} job-minutes in 7 days = ${Math.round((total / 7) * 30)} per 30 days.`);
