// Pulls workflow runs and their jobs (with steps) from the GitHub API through `gh api`.
// Read-only: GET requests only. Writes raw JSON under ./raw/.
//
// usage: node fetch.mjs <label> <workflow-file> <event> <branch-or-''> <count>
import { execFile } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = 'ParaOrg/Para';
const [label, workflow, event, branch, countArg] = process.argv.slice(2);
const count = Number(countArg);
const outDir = join(HERE, 'raw', label);
mkdirSync(join(outDir, 'jobs'), { recursive: true });

function gh(path) {
  return new Promise((resolve, reject) => {
    execFile('gh', ['api', path.replace(/^\//, '')], { maxBuffer: 256 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) reject(new Error(`${path}: ${stderr || error.message}`));
      else resolve(JSON.parse(stdout));
    });
  });
}

async function pool(items, size, work) {
  const results = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: size }, async () => {
      while (next < items.length) {
        const index = next++;
        results[index] = await work(items[index], index);
      }
    }),
  );
  return results;
}

// 1. The runs: newest first, completed only.
const runs = [];
for (let page = 1; runs.length < count; page++) {
  const query = new URLSearchParams({ status: 'completed', per_page: '100', page: String(page) });
  if (event) query.set('event', event);
  if (branch) query.set('branch', branch);
  const body = await gh(`/repos/${REPO}/actions/workflows/${workflow}/runs?${query}`);
  if (body.workflow_runs.length === 0) break;
  runs.push(...body.workflow_runs);
}
runs.length = Math.min(runs.length, count);
writeFileSync(join(outDir, 'runs.json'), JSON.stringify(runs, null, 1));
console.log(`${label}: ${runs.length} runs`);

// 2. Every job of every attempt of every run, with steps.
async function jobsOf(path) {
  const jobs = [];
  for (let page = 1; ; page++) {
    const body = await gh(`${path}${path.includes('?') ? '&' : '?'}per_page=100&page=${page}`);
    jobs.push(...body.jobs);
    if (jobs.length >= body.total_count || body.jobs.length === 0) break;
  }
  return jobs;
}

await pool(runs, 6, async (run) => {
  const file = join(outDir, 'jobs', `${run.id}.json`);
  if (existsSync(file)) return;
  const attempts = {};
  for (let attempt = 1; attempt <= run.run_attempt; attempt++) {
    const jobs = await jobsOf(`/repos/${REPO}/actions/runs/${run.id}/attempts/${attempt}/jobs`);
    let meta = null;
    if (run.run_attempt > 1) {
      meta = await gh(`/repos/${REPO}/actions/runs/${run.id}/attempts/${attempt}`);
      meta = {
        run_attempt: meta.run_attempt,
        created_at: meta.created_at,
        run_started_at: meta.run_started_at,
        updated_at: meta.updated_at,
        conclusion: meta.conclusion,
      };
    }
    attempts[attempt] = { meta, jobs };
  }
  writeFileSync(file, JSON.stringify(attempts));
});
const done = runs.filter((run) => existsSync(join(outDir, 'jobs', `${run.id}.json`))).length;
console.log(`${label}: jobs for ${done}/${runs.length} runs`);
void readFileSync;
