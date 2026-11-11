// 9. Each page's content policy (public/_headers, report-only for now): the
//    built site sends every page exactly one, from one rule, since two would be
//    joined into one header and read as neither; every inline script a page
//    carries is allowed by its hash, so a changed script fails here with the
//    hash to paste rather than in a commuter's browser; and each policy lets
//    the page reach the basemap host this build was made for.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { headersFor, parseHeadersFile, ruleMatches } from '../../node/headers-file.ts';

const REPORT_ONLY = 'content-security-policy-report-only';
const PAGES = [
  { path: '/', file: 'index.html' },
  { path: '/studio/', file: 'studio/index.html' },
  { path: '/contribute/', file: 'contribute/index.html' },
];

/** A policy's directives by name: `script-src` → its sources. */
const directivesOf = (policy) =>
  new Map(
    policy
      .split(';')
      .map((d) => d.trim().split(/\s+/))
      .filter((d) => d[0])
      .map(([name, ...sources]) => [name, sources]),
  );

export function proveContentPolicy(build, check) {
  const { dist, html, basemapHost } = build;
  const file = join(dist, '_headers');
  check('the build carries _headers', existsSync(file));
  if (!existsSync(file)) return;
  const rules = parseHeadersFile(readFileSync(file, 'utf8'));

  for (const page of PAGES) {
    const setters = rules.filter((r) => ruleMatches(r, page.path) && r.sets[REPORT_ONLY]?.length);
    const isOne = setters.length === 1 && setters[0].sets[REPORT_ONLY].length === 1;
    check(
      `${page.path} is sent one report-only content policy, from one rule`,
      isOne,
      setters.map((r) => r.pattern).join(', ') || 'no rule sets one',
    );
    if (!isOne) continue;
    const directives = directivesOf(headersFor(rules, page.path)[REPORT_ONLY]);

    const scripts = [
      ...html(page.file).matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g),
    ];
    const hashes = scripts.map(
      (m) => `'sha256-${createHash('sha256').update(m[1]).digest('base64')}'`,
    );
    const allowed = directives.get('script-src') ?? [];
    const missing = hashes.filter((h) => !allowed.includes(h));
    check(
      `${page.path}: its policy allows each of the page's ${scripts.length} inline script(s) by hash, and no other inline script`,
      missing.length === 0 && !allowed.includes("'unsafe-inline'"),
      missing.length > 0 ? `add to script-src in public/_headers: ${missing.join(' ')}` : '',
    );

    // A build for a stand-in on a loopback address is a suite's own (pwa-test's own-tiles
    // run): the policies name the hosts the site is deployed with, never that one.
    const isStandIn = /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(basemapHost);
    const reach = directives.get('connect-src') ?? [];
    check(
      `${page.path}: its policy lets the page reach this build's basemap host`,
      isStandIn || reach.includes(basemapHost),
      isStandIn
        ? `${basemapHost} is a suite's stand-in, not named`
        : `${basemapHost}; connect-src ${reach.join(' ')}`,
    );
  }
}
