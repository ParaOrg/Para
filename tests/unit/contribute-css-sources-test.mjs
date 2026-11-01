// The contributor page builds its own Tailwind (src/app/contribute/contribute.css: `source(none)`
// and a list of @source paths). A shared/ui file the page draws but the list leaves out gets
// none of its classes on the page: the toast came out unstyled. So every shared/ui file the page
// reaches, statically or lazily, that writes class names must be in the list.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/contribute-css-sources-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const src = join(root, 'src');
const cssFile = join(src, 'app', 'contribute', 'contribute.css');
const entry = join(src, 'app', 'contribute', 'main.tsx');

const SPECIFIERS = [
  /\bimport\s+(?:type\s+)?[^'"]*?from\s+['"]([^'"]+)['"]/g,
  /\bexport\s+[^'"]*?from\s+['"]([^'"]+)['"]/g,
  /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  /\bimport\s+['"]([^'"]+)['"]/g,
];

/** The source file an import names, or null for a package or anything not code. */
function resolveImport(from, specifier) {
  let base;
  if (specifier.startsWith('@/')) base = join(src, specifier.slice(2));
  else if (specifier.startsWith('.')) base = resolve(dirname(from), specifier);
  else return null;
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, join(base, 'index.ts')]) {
    if (/\.tsx?$/.test(candidate) && existsSync(candidate)) return candidate;
  }
  return null;
}

/** Every source file the contributor page's entry reaches, type-only imports aside. */
function reachedFrom(start) {
  const seen = new Set();
  const queue = [start];
  while (queue.length > 0) {
    const file = queue.pop();
    if (seen.has(file)) continue;
    seen.add(file);
    const text = readFileSync(file, 'utf8');
    for (const pattern of SPECIFIERS) {
      for (const match of text.matchAll(pattern)) {
        if (/^import\s+type\b/.test(match[0])) continue;
        const next = resolveImport(file, match[1]);
        if (next) queue.push(next);
      }
    }
  }
  return seen;
}

/** The files and folders contribute.css scans, as absolute paths. */
function scanned() {
  const css = readFileSync(cssFile, 'utf8');
  return [...css.matchAll(/^@source\s+'([^']+)';/gm)].map((match) =>
    resolve(dirname(cssFile), match[1]),
  );
}

const writesClasses = (file) => /className=|\bcn\(/.test(readFileSync(file, 'utf8'));

test('every shared/ui file the contributor page draws is in its CSS sources', () => {
  const sources = scanned();
  const sharedUi = join(src, 'shared', 'ui');
  const missing = [...reachedFrom(entry)]
    .filter((file) => file.startsWith(sharedUi) && writesClasses(file))
    .filter((file) => !sources.some((source) => file === source || file.startsWith(`${source}/`)))
    .map((file) => relative(root, file));
  assert.deepEqual(missing, [], `add to contribute.css: ${missing.join(', ')}`);
});

test('the walk finds the page’s shared/ui files at all', () => {
  const reached = [...reachedFrom(entry)].map((file) => relative(root, file));
  assert.ok(reached.includes('src/shared/ui/toast-host.tsx'), 'toast-host not reached');
  assert.ok(reached.includes('src/shared/ui/turnstile.tsx'), 'turnstile not reached');
});
