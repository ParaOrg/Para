// Records the live router's answers for the drawing suites, for their stand-in on runs without
// PARA_LIVE_SERVICES (tests/e2e/lib/stand-ins.mjs, tests/e2e/fixtures/osrm/answers.json).
//
// Run it when a drawing suite's coordinates change (a new click, a moved hotspot), or when a run
// fails with "the router's stand-in has no answer", with the dev server up:
//
//   npm run dev          (in another terminal)
//   node scripts/research/record-osrm.mjs
//
// Each suite runs against the live router, its answers written down (merged into what is there),
// trimmed to what the editor reads. The database stays stood in (the route tables built from the
// published map), so the answers are for the lines a pull request's run draws; nothing is read
// from the database. A suite that fails is reported and its answers kept; run it again.
import { spawnSync } from 'node:child_process';

const SUITES = [
  'group-test',
  'regression-gestures',
  'hotspot-test',
  'snap-test',
  'extend-test',
  'studio-phone-test',
];

let failed = 0;
for (const suite of SUITES) {
  console.log(`recording ${suite}`);
  const { status } = spawnSync('node', [`tests/e2e/${suite}.mjs`], {
    stdio: 'inherit',
    env: { ...process.env, PARA_LIVE_SERVICES: '1', PARA_RECORD_OSRM: '1' },
  });
  if (status !== 0) {
    console.error(`${suite} failed while recording`);
    failed += 1;
  }
}
process.exit(failed === 0 ? 0 : 1);
