// The suites' outside services, stood in on a run without PARA_LIVE_SERVICES (a pull request's,
// and a local one by default): each browser context a suite opens answers them from what is
// recorded here instead of the network. With PARA_LIVE_SERVICES=1 (main and staging pushes, the
// nightly run) nothing is stood in. outside-requests.mjs applies them to every context.
//
// The router (router.project-osrm.org): answers recorded from the live router, by the request's
// path, its coordinates rounded, and query (keyOf; fixtures/osrm/answers.json), trimmed to what
// the editor reads (snap.ts). A request with no recorded answer fails the suite, naming it:
// re-record (record-osrm.mjs).
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const IS_LIVE = Boolean(process.env.PARA_LIVE_SERVICES);
/** Recording: live, and each router answer written down (scripts/research/record-osrm.mjs). */
const IS_RECORDING_OSRM = Boolean(process.env.PARA_RECORD_OSRM);

const OSRM = /^https:\/\/router\.project-osrm\.org\//;
const ANSWERS = fileURLToPath(new URL('../fixtures/osrm/answers.json', import.meta.url));

const recorded = existsSync(ANSWERS) ? JSON.parse(readFileSync(ANSWERS, 'utf8')) : {};
/** Requests a run asked for that nothing answers: each fails the suite as it ends. */
const unrecorded = new Set();
let hasNewAnswers = false;

/**
 * A router request's key: its path, each coordinate rounded to 6 decimals (about 0.1 m, the
 * router's own precision), and its query. A point clicked at the same pixel comes back from
 * map.unproject a few 1e-12 degrees apart from run to run (float noise in the camera's path), so
 * the full digits would miss a recorded answer. A miss names this rounded key.
 */
export const keyOf = (url) => {
  const { pathname, search } = new URL(url);
  const rounded = pathname.replace(/-?\d+\.\d+/g, (n) => Number(n).toFixed(6));
  return rounded + search;
};

/** As much of the router's answer as snap.ts reads: a refusal's code and message, or the legs. */
const trimmed = (body) => ({
  code: body.code,
  ...(body.message === undefined ? {} : { message: body.message }),
  ...(body.routes === undefined
    ? {}
    : {
        routes: body.routes.slice(0, 1).map((r) => ({
          legs: r.legs.map((leg) => ({
            steps: leg.steps.map((s) => ({
              name: s.name,
              distance: s.distance,
              geometry: { coordinates: s.geometry.coordinates },
            })),
          })),
        })),
      }),
});

const answerRouter = async (route) => {
  const key = keyOf(route.request().url());
  if (IS_RECORDING_OSRM) {
    const response = await route.fetch();
    // A busy router's page is not an answer to keep: passed on, not written down.
    const body = await response.json().catch(() => null);
    if (body === null) return route.fulfill({ response });
    recorded[key] = { status: response.status(), body: trimmed(body) };
    hasNewAnswers = true;
    return route.fulfill({ response, json: body });
  }
  const answer = recorded[key];
  if (!answer) {
    unrecorded.add(key);
    return route.fulfill({ status: 500, json: { code: 'NotRecorded', message: key } });
  }
  return route.fulfill({ status: answer.status, json: answer.body });
};

/** The stand-ins on `context`, unless the run is live. */
export const applyStandIns = async (context) => {
  if (IS_LIVE && !IS_RECORDING_OSRM) return;
  await context.route(OSRM, answerRouter);
};

process.on('exit', () => {
  if (hasNewAnswers) {
    const sorted = Object.fromEntries(
      Object.entries(recorded).sort(([a], [b]) => a.localeCompare(b)),
    );
    writeFileSync(ANSWERS, `${JSON.stringify(sorted)}\n`);
  }
  if (unrecorded.size === 0) return;
  console.log(`FAIL  the router's stand-in has no answer for ${unrecorded.size} request(s):`);
  for (const key of unrecorded) console.log(`  ${key}`);
  console.log('  Re-record: node scripts/research/record-osrm.mjs (tests/e2e/README.md).');
  process.exitCode = 1;
});
