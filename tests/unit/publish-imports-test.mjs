// The publish script imports the app's own rules from src/ (publish-map.mjs's
// header), and nothing runs it before the nightly workflow does: it reads the
// database as it loads. A renamed export it imports would fail there first,
// at four in the morning. So each name it imports from src/, itself or through
// the modules of its own folder it loads, is checked here, against the module it names (ticket 07 of the restructure follow-ups,
// 2026-10-07, which renamed stops and variants).
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/publish-imports-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const SCRIPT = new URL('../../scripts/publish/publish-map.mjs', import.meta.url);

/** `import { a, b } from '../../src/…'` lines, as [names, specifier]. */
function sourceImports(text) {
  return [...text.matchAll(/^import \{([^}]+)\} from '(\.\.\/\.\.\/src\/[^']+)';?$/gm)].map((m) => [
    m[1]
      .split(',')
      .map((n) => n.trim())
      .filter(Boolean),
    m[2],
  ]);
}

/** The script and every module of its own folder it loads, directly or through another. */
function publishModules(entry) {
  const seen = new Map();
  const visit = (url) => {
    if (seen.has(url.href)) return;
    const text = readFileSync(url, 'utf8');
    seen.set(url.href, text);
    for (const m of text.matchAll(/^import [^;]*? from '(\.\/[^']+\.mjs)';?$/gm)) {
      visit(new URL(m[1], url));
    }
  };
  visit(entry);
  return [...seen].map(([href, text]) => [new URL(href), text]);
}

test('every name the publish script imports from src/ is exported by the module it names', async () => {
  const imports = publishModules(SCRIPT).flatMap(([url, text]) =>
    sourceImports(text).map(([names, specifier]) => [names, new URL(specifier, url)]),
  );
  assert.ok(imports.length >= 5, `the script imports from src/ (${imports.length} lines found)`);
  for (const [names, specifier] of imports) {
    const module = await import(specifier.href);
    for (const name of names) {
      assert.ok(name in module, `${specifier} exports ${name}`);
    }
  }
});

test('the reader of the import lines reads the real forms', () => {
  const text = `import { a, b } from '../../src/x/y.ts';\nimport { c } from '../../src/z.ts'\nimport { d } from './local.mjs';\n`;
  assert.deepEqual(sourceImports(text), [
    [['a', 'b'], '../../src/x/y.ts'],
    [['c'], '../../src/z.ts'],
  ]);
});
