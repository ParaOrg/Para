// The reader of Cloudflare's _headers file (scripts/node/headers-file.ts), and what
// public/_headers sends each page by it: one report-only content policy for each of the
// three pages, never two joined into one.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs --test tests/unit/headers-file-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { headersFor, parseHeadersFile, ruleMatches } from '../../scripts/node/headers-file.ts';

const SAMPLE = `
# a comment
/*
  X-Content-Type-Options: nosniff
  X-Robots-Tag: nosnippet

/studio/*
  X-Robots-Tag: noindex
  Content-Security-Policy: frame-ancestors 'none'

/movies/:title
  ! X-Robots-Tag
  X-Movie: yes

https://old.example.workers.dev/*
  X-Robots-Tag: noindex
`;

test('a rule is a pattern and the headers under it, names lower-cased', () => {
  const rules = parseHeadersFile(SAMPLE);
  assert.deepEqual(
    rules.map((r) => r.pattern),
    ['/*', '/studio/*', '/movies/:title', 'https://old.example.workers.dev/*'],
  );
  assert.deepEqual(rules[1].sets['content-security-policy'], ["frame-ancestors 'none'"]);
  assert.deepEqual(rules[2].detaches, ['x-robots-tag']);
});

test('a splat is anything, a placeholder anything but a slash, a host pattern no path', () => {
  const [all, studio, movie, host] = parseHeadersFile(SAMPLE);
  assert.equal(ruleMatches(all, '/'), true);
  assert.equal(ruleMatches(studio, '/studio/'), true);
  assert.equal(ruleMatches(studio, '/studio'), false);
  assert.equal(ruleMatches(movie, '/movies/up'), true);
  assert.equal(ruleMatches(movie, '/movies/up/again'), false);
  assert.equal(ruleMatches(host, '/'), false);
});

test('every matching rule adds its headers, and one set twice is joined with a comma', () => {
  const sent = headersFor(parseHeadersFile(SAMPLE), '/studio/');
  assert.equal(sent['x-content-type-options'], 'nosniff');
  assert.equal(sent['x-robots-tag'], 'nosnippet, noindex');
  assert.equal(sent['content-security-policy'], "frame-ancestors 'none'");
});

test('"! Name" takes a header back out of what the rules before it set', () => {
  const sent = headersFor(parseHeadersFile(SAMPLE), '/movies/up');
  assert.equal(sent['x-robots-tag'], undefined);
  assert.equal(sent['x-movie'], 'yes');
});

const RULES = parseHeadersFile(
  readFileSync(new URL('../../public/_headers', import.meta.url), 'utf8'),
);
const REPORT_ONLY = 'content-security-policy-report-only';
const settersFor = (pathname) =>
  RULES.filter((r) => ruleMatches(r, pathname) && r.sets[REPORT_ONLY]?.length);

for (const page of ['/', '/studio/', '/contribute/']) {
  test(`${page} is sent one report-only content policy, from one rule`, () => {
    const setters = settersFor(page);
    assert.equal(setters.length, 1, `${setters.map((r) => r.pattern).join(', ') || 'no rule'}`);
    assert.equal(setters[0].sets[REPORT_ONLY].length, 1);
    assert.match(headersFor(RULES, page)[REPORT_ONLY], /^default-src 'self';/);
  });
}

test('the rule for every file sets no report-only policy, which would be joined onto a page’s own', () => {
  const all = RULES.find((r) => r.pattern === '/*');
  assert.ok(all, '/* has a rule');
  assert.equal(all.sets[REPORT_ONLY], undefined);
});

test('only the studio and the contributor page may load and frame the bot check', () => {
  const policy = (page) => headersFor(RULES, page)[REPORT_ONLY];
  for (const page of ['/studio/', '/contribute/']) {
    assert.match(policy(page), /script-src [^;]*https:\/\/challenges\.cloudflare\.com/);
    assert.match(policy(page), /frame-src [^;]*https:\/\/challenges\.cloudflare\.com/);
  }
  assert.doesNotMatch(policy('/'), /challenges\.cloudflare\.com/);
  assert.doesNotMatch(policy('/'), /supabase/);
});
