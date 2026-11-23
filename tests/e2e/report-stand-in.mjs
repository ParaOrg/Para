// Stands in for /api/report on a loopback address: the site Worker's own handler (workers/site),
// with the parts that need Cloudflare or the live database stood in. Not a suite itself: the
// commuter's report tab's suite starts it once the tab exists, and tests/unit/report-stand-in-test.mjs
// proves it over real HTTP now.
//
//   - Turnstile: the token PASS_TOKEN passes, any other fails (Cloudflare's test keys behave so).
//   - The rate limit: `limit` reports a minute from one client, counted in memory.
//   - The database: each report is kept in `reports` and answered `answer(report)`, `sent` unless
//     a test says otherwise.
import { createServer } from 'node:http';

import { handleReport } from '../../workers/site/src/report.ts';

export const PASS_TOKEN = 'stand-in-pass';

/**
 * Starts the stand-in. Resolves to its origin, the reports it took, and a function that stops it.
 * `answer` decides what the database says to a report.
 */
export async function startReportStandIn({ limit = 5, answer = () => 'sent' } = {}) {
  const reports = [];
  const sent = new Map();
  const server = createServer(async (incoming, outgoing) => {
    const chunks = [];
    for await (const chunk of incoming) chunks.push(chunk);
    const origin = `http://${incoming.headers.host}`;
    const request = new Request(new URL(incoming.url ?? '/', origin), {
      method: incoming.method,
      headers: Object.entries(incoming.headers).flatMap(([name, value]) =>
        value === undefined ? [] : [[name, String(value)]],
      ),
      body: ['GET', 'HEAD'].includes(incoming.method ?? 'GET') ? undefined : Buffer.concat(chunks),
    });
    const { pathname } = new URL(request.url);
    const client = incoming.socket.remoteAddress ?? 'unknown';
    const response =
      pathname !== '/api/report'
        ? new Response(JSON.stringify({ code: 'not_found' }), { status: 404 })
        : await handleReport(request, {
            isAllowed: async () => {
              const count = (sent.get(client) ?? 0) + 1;
              sent.set(client, count);
              return count <= limit;
            },
            isVerified: async (token) => token === PASS_TOKEN,
            submit: async (report) => {
              const code = answer(report);
              if (code === 'sent') reports.push(report);
              return code;
            },
          });
    outgoing.writeHead(response.status, Object.fromEntries(response.headers));
    outgoing.end(Buffer.from(await response.arrayBuffer()));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  return {
    origin: `http://127.0.0.1:${port}`,
    reports,
    stop: () => new Promise((resolve) => server.close(resolve)),
  };
}
