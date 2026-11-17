// Every request a suite's browser sends to a host off this machine, counted by host and printed
// as the suite ends: `outside: <host> ×n (network n, stood in n, failed n, cancelled n)`. "Network"
// answers came from the host itself; "stood in" ones a page.route answered (bareStyle, nodeFetch, a
// recording) or a stand-in server on this machine did; "failed" never got an answer; "cancelled" the page dropped itself (net::ERR_ABORTED:
// MapLibre's tiles a move leaves behind). harness.mjs imports it, so every suite that uses the
// harness reports, with no change to the suite.
//
// On a run without PARA_LIVE_SERVICES (a pull request's, and a local one by default) every outside
// host is stood in (stand-ins.mjs), so a "network" answer is a new outside call: it fails the
// suite, naming the host and the first addresses asked. Stand it in, or give the suite its own
// route. A live run only prints.
import { chromium } from 'playwright';

import { applyStandIns, IS_LIVE, withStandInContext, withStandInLaunch } from './stand-ins.mjs';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);
/** Per host: how its requests were answered. */
const counts = new Map();
/** Per host: the first addresses its network answers came from, for the failure to name. */
const reached = new Map();
const NAMED_PER_HOST = 5;
/** Whether a browser was launched: a run with none (a unit check of the harness) prints nothing. */
let hasLaunched = false;

const isLoopback = (ipAddress) => /^(127\.|::1$|\[::1\]$)/.test(ipAddress);

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
    // A routed answer has no server address, and a stand-in server's is on this machine: neither
    // left it.
    const address = await response.serverAddr().catch(() => null);
    const server = address && !isLoopback(address.ipAddress) ? address : null;
    tally(response.url(), server ? 'network' : 'stood in');
    const host = server && hostOf(response.url());
    if (host) {
      const urls = reached.get(host) ?? [];
      if (urls.length < NAMED_PER_HOST) urls.push(response.url());
      reached.set(host, urls);
    }
  });
  context.on('requestfailed', (request) =>
    tally(
      request.url(),
      request.failure()?.errorText === 'net::ERR_ABORTED' ? 'cancelled' : 'failed',
    ),
  );
};

const launch = chromium.launch.bind(chromium);
chromium.launch = async (options, ...rest) => {
  const browser = await launch(withStandInLaunch(options), ...rest);
  hasLaunched = true;
  const newContext = browser.newContext.bind(browser);
  browser.newContext = async (options, ...rest) => {
    const context = await newContext(withStandInContext(options), ...rest);
    watch(context);
    await applyStandIns(context);
    return context;
  };
  const newPage = browser.newPage.bind(browser);
  browser.newPage = async (options, ...rest) => {
    const page = await newPage(withStandInContext(options), ...rest);
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
  if (IS_LIVE) return;
  for (const [host, urls] of reached) {
    console.log(
      `FAIL  outside: ${host} answered ${counts.get(host)?.network} request(s) over the network on a stood-in run; stand it in (tests/e2e/lib/stand-ins.mjs) or route it in the suite:`,
    );
    for (const url of urls) console.log(`  ${url}`);
    process.exitCode = 1;
  }
});
