// Every request a suite's browser sends to a host off this machine, counted by host and printed
// as the suite ends: `outside: <host> ×n (network n, stood in n, failed n, cancelled n)`. "Network"
// answers came from the host itself; "stood in" ones a page.route answered (bareStyle, nodeFetch, a
// recording); "failed" never got an answer; "cancelled" the page dropped itself (net::ERR_ABORTED:
// MapLibre's tiles a move leaves behind). It prints only: no check reads it. harness.mjs imports it, so every
// suite that uses the harness reports, with no change to the suite.
import { chromium } from 'playwright';

import { applyStandIns } from './stand-ins.mjs';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);
/** Per host: how its requests were answered. */
const counts = new Map();
/** Whether a browser was launched: a run with none (a unit check of the harness) prints nothing. */
let hasLaunched = false;

const hostOf = (url) => {
  if (!/^https?:/.test(url)) return null;
  const { host, hostname } = new URL(url);
  return LOCAL_HOSTS.has(hostname) ? null : host;
};

const tally = (url, how) => {
  const host = hostOf(url);
  if (!host) return;
  const row = counts.get(host) ?? { network: 0, 'stood in': 0, failed: 0, cancelled: 0 };
  row[how] += 1;
  counts.set(host, row);
};

const watch = (context) => {
  context.on('response', async (response) => {
    // A routed answer has no server address: it never left the machine.
    const server = await response.serverAddr().catch(() => null);
    tally(response.url(), server ? 'network' : 'stood in');
  });
  context.on('requestfailed', (request) =>
    tally(
      request.url(),
      request.failure()?.errorText === 'net::ERR_ABORTED' ? 'cancelled' : 'failed',
    ),
  );
};

const launch = chromium.launch.bind(chromium);
chromium.launch = async (...options) => {
  const browser = await launch(...options);
  hasLaunched = true;
  const newContext = browser.newContext.bind(browser);
  browser.newContext = async (...args) => {
    const context = await newContext(...args);
    watch(context);
    await applyStandIns(context);
    return context;
  };
  const newPage = browser.newPage.bind(browser);
  browser.newPage = async (...args) => {
    const page = await newPage(...args);
    watch(page.context());
    await applyStandIns(page.context());
    return page;
  };
  return browser;
};

process.on('exit', () => {
  if (!hasLaunched) return;
  if (counts.size === 0) {
    console.log('outside: none');
    return;
  }
  for (const [host, row] of [...counts].sort(([a], [b]) => a.localeCompare(b))) {
    const total = row.network + row['stood in'] + row.failed + row.cancelled;
    console.log(
      `outside: ${host} ×${total} (network ${row.network}, stood in ${row['stood in']}, failed ${row.failed}, cancelled ${row.cancelled})`,
    );
  }
});
