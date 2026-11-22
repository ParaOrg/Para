// Pulls one workflow run's jobs (with steps) and each job's plain-text log through `gh api`, for
// check-times.mjs. Read-only: GET requests only.
//
// usage: node fetch-logs.mjs <run id>        writes ./logs/<run id>/jobs.json and <job id>.txt
import { execFile } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = 'ParaOrg/Para';
const [runId] = process.argv.slice(2);
if (!/^\d+$/.test(runId ?? '')) {
  console.error('usage: node fetch-logs.mjs <run id>');
  process.exit(2);
}
const outDir = join(HERE, 'logs', runId);
mkdirSync(outDir, { recursive: true });

const gh = (path, json = true) =>
  new Promise((resolve, reject) => {
    execFile('gh', ['api', path], { maxBuffer: 256 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) reject(new Error(`${path}: ${stderr || error.message}`));
      else resolve(json ? JSON.parse(stdout) : stdout);
    });
  });

const jobs = [];
for (let page = 1; ; page++) {
  const body = await gh(`repos/${REPO}/actions/runs/${runId}/jobs?per_page=100&page=${page}`);
  jobs.push(...body.jobs);
  if (jobs.length >= body.total_count || body.jobs.length === 0) break;
}
writeFileSync(
  join(outDir, 'jobs.json'),
  JSON.stringify(
    jobs.map(({ id, name, conclusion, started_at, completed_at, steps }) => ({
      id,
      name,
      conclusion,
      started_at,
      completed_at,
      steps: (steps ?? []).map(({ name, started_at, completed_at, conclusion }) => ({
        name,
        started_at,
        completed_at,
        conclusion,
      })),
    })),
    null,
    1,
  ),
);

let saved = 0;
for (const job of jobs.filter((j) => j.conclusion === 'success' || j.conclusion === 'failure')) {
  try {
    writeFileSync(join(outDir, `${job.id}.txt`), await gh(`repos/${REPO}/actions/jobs/${job.id}/logs`, false));
    saved++;
  } catch (error) {
    console.error(`no log for ${job.name}: ${error.message}`);
  }
}
console.log(`${runId}: ${jobs.length} jobs, ${saved} logs in logs/${runId}/`);
