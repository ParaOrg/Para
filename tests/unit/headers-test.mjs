// public/_headers keeps every page that has an account out of other sites'
// frames, where a hidden copy could steer a click on "agree", "delete" or
// "approve". The public map has no account, so it stays frameable; and the
// frame rules stay out of /*, where a second CSP would be joined onto a
// page's own.
//
//   node --test tests/unit/headers-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/** Each path pattern in the file with its headers, names lower-cased. */
function headerRules(text) {
  const rules = new Map();
  let current = null;
  for (const line of text.split('\n')) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    if (!/^\s/.test(line)) {
      current = {};
      rules.set(line.trim(), current);
      continue;
    }
    const at = line.indexOf(':');
    if (current && at > 0)
      current[line.slice(0, at).trim().toLowerCase()] = line.slice(at + 1).trim();
  }
  return rules;
}

const RULES = headerRules(readFileSync(new URL('../../public/_headers', import.meta.url), 'utf8'));

for (const page of ['/studio/*', '/contribute/*']) {
  test(`${page} may not be framed by any site`, () => {
    const headers = RULES.get(page);
    assert.ok(headers, `${page} has a rule`);
    assert.equal(headers['x-frame-options'], 'DENY');
    assert.equal(headers['content-security-policy'], "frame-ancestors 'none'");
  });
}

test('the rule for every file sets no frame rule or CSP of its own', () => {
  const headers = RULES.get('/*');
  assert.ok(headers, '/* has a rule');
  assert.equal(headers['x-frame-options'], undefined);
  assert.equal(headers['content-security-policy'], undefined);
});
