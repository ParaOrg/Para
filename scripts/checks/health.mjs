// Prints the codebase's health as markdown: `npm run health`. Every line is a
// number with the list behind it. The output is not checked in: it moves with
// every commit, so it is pasted into a release summary instead.
//
// It measures and never fails: ESLint errors, a build over budget and the like
// are reported here and enforced by `npm run check`.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';
import {
  FONTS_MAX_KB,
  GROUPS,
  SHARED_MAX_GZ_KB,
  chunksNamed,
  fontBytes,
  gzipBytes,
  readManifest,
} from './build-weight.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const LONG_FILE_LINES = 150;
const BIGGEST_SHOWN = 15;

/** Every file under dir whose name matches, as paths relative to the repository root. */
function* filesUnder(dir, matches) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* filesUnder(full, matches);
    else if (matches(entry.name)) yield relative(root, full).split('\\').join('/');
  }
}

const isSource = (name) => /\.tsx?$/.test(name) && !name.endsWith('.stories.tsx');
const read = (path) => readFileSync(join(root, path), 'utf8');
const lineCount = (text) => text.split('\n').length - (text.endsWith('\n') ? 1 : 0);
const kb = (bytes) => `${(bytes / 1024).toFixed(1)} kB`;

/** The text with every comment blanked out (newlines kept), so a line left empty was all comment. */
export function withoutComments(text, fileName = 'file.ts') {
  const source = ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true);
  const ranges = new Map();
  const visit = (node) => {
    const children = node.getChildren(source);
    if (children.length === 0 && node.kind !== ts.SyntaxKind.JsxText) {
      for (const range of ts.getLeadingCommentRanges(text, node.pos) ?? []) {
        ranges.set(range.pos, range.end);
      }
    }
    children.forEach(visit);
  };
  visit(source);
  let result = '';
  let cursor = 0;
  for (const [start, end] of [...ranges].sort((a, b) => a[0] - b[0])) {
    result += text.slice(cursor, start) + text.slice(start, end).replace(/[^\n]/g, ' ');
    cursor = end;
  }
  return result + text.slice(cursor);
}

/** How many of the non-blank lines of `text` hold nothing but comment. */
export function commentLines(text, fileName) {
  const stripped = withoutComments(text, fileName).split('\n');
  const original = text.split('\n');
  let nonBlank = 0;
  let comment = 0;
  original.forEach((line, i) => {
    if (line.trim() === '') return;
    nonBlank++;
    if (stripped[i].trim() === '') comment++;
  });
  return { nonBlank, comment };
}

/** Whether the file exports a PascalCase function, which is how a component is declared. */
export const exportsComponent = (text) => /^export (?:default )?function [A-Z]\w*/m.test(text);

function longFiles(files) {
  const long = files
    .map((path) => ({ path, lines: lineCount(read(path)) }))
    .filter((file) => file.lines > LONG_FILE_LINES)
    .sort((a, b) => b.lines - a.lines || (a.path < b.path ? -1 : 1));
  return [
    `- **Files over ${LONG_FILE_LINES} lines:** ${long.length}`,
    ...long.slice(0, BIGGEST_SHOWN).map((f) => `  - \`${f.path}\`: ${f.lines}`),
  ];
}

function commentShare(files) {
  let nonBlank = 0;
  let comment = 0;
  for (const path of files) {
    const counts = commentLines(read(path), path);
    nonBlank += counts.nonBlank;
    comment += counts.comment;
  }
  const share = nonBlank === 0 ? 0 : (comment / nonBlank) * 100;
  return [
    `- **Comments, as a share of \`src/\`'s non-blank lines:** ${share.toFixed(1)}%`,
    `  - ${comment} comment lines of ${nonBlank} non-blank lines (a line with code and a trailing comment counts as code)`,
  ];
}

function eslintReport() {
  const run = spawnSync('npx', ['--no-install', 'eslint', '.', '-f', 'json'], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
  });
  let results;
  try {
    results = JSON.parse(run.stdout);
  } catch {
    return ['- **ESLint:** no report (eslint did not print JSON; run `npm run lint`)'];
  }
  const errors = results.reduce((n, r) => n + r.errorCount, 0);
  const warnings = results.reduce((n, r) => n + r.warningCount, 0);
  const byRule = new Map();
  for (const { messages } of results) {
    for (const { ruleId, severity } of messages) {
      const key = `${ruleId ?? 'parse error'} (${severity === 2 ? 'error' : 'warning'})`;
      byRule.set(key, (byRule.get(key) ?? 0) + 1);
    }
  }
  return [
    `- **ESLint:** ${errors} errors, ${warnings} warnings`,
    ...[...byRule].sort((a, b) => b[1] - a[1]).map(([rule, n]) => `  - ${rule}: ${n}`),
  ];
}

function buildSize() {
  const dist = join(root, 'dist');
  const manifest = readManifest(dist);
  if (!manifest || !existsSync(join(dist, 'assets'))) {
    return ['- **Build size against its budget:** run npm run build first'];
  }
  const lines = ['- **Build size against its budget (gzipped unless noted):**'];
  let total = 0;
  for (const { name, maxGzKb } of GROUPS) {
    const bytes = gzipBytes(
      dist,
      chunksNamed(manifest, name).map((c) => c.file),
    );
    total += bytes;
    lines.push(`  - ${name} chunk: ${kb(bytes)} of ${maxGzKb} kB`);
  }
  lines.push(
    `  - MapLibre, React and the shared code together: ${kb(total)} of ${SHARED_MAX_GZ_KB} kB`,
  );
  lines.push(`  - fonts (not gzipped): ${kb(fontBytes(dist))} of ${FONTS_MAX_KB} kB`);
  return lines;
}

function testCounts() {
  const unit = [...filesUnder(join(root, 'tests', 'unit'), (n) => n.endsWith('-test.mjs'))]
    .map((path) => ({ path, tests: (read(path).match(/(?:^|[^\w.])test\(/g) ?? []).length }))
    .sort((a, b) => b.tests - a.tests || (a.path < b.path ? -1 : 1));
  const total = unit.reduce((n, f) => n + f.tests, 0);
  const e2e = [...filesUnder(join(root, 'tests', 'e2e'), (n) => n.endsWith('.mjs'))]
    .filter((path) => dirname(path) === 'tests/e2e')
    .map((path) => ({ path, lines: lineCount(read(path)) }))
    .sort((a, b) => b.lines - a.lines || (a.path < b.path ? -1 : 1));
  return [
    `- **Unit tests:** ${total} in ${unit.length} files (counted, not run). The ${BIGGEST_SHOWN} files with most:`,
    ...unit.slice(0, BIGGEST_SHOWN).map((f) => `  - \`${f.path}\`: ${f.tests}`),
    `- **Browser suites:** ${e2e.length}, by line count`,
    ...e2e.map((f) => `  - \`${f.path}\`: ${f.lines} lines`),
  ];
}

function componentsWithoutStory(files) {
  const missing = files
    .filter((path) => path.endsWith('.tsx') && exportsComponent(read(path)))
    .filter((path) => !existsSync(join(root, path.replace(/\.tsx$/, '.stories.tsx'))))
    .sort();
  return [
    `- **Components without a story:** ${missing.length}`,
    ...missing.map((path) => `  - \`${path}\``),
  ];
}

function main() {
  const files = [...filesUnder(join(root, 'src'), isSource)].sort();
  const sections = [
    '# Code health',
    '',
    ...longFiles(files),
    ...commentShare(files),
    ...eslintReport(),
    ...buildSize(),
    ...testCounts(),
    ...componentsWithoutStory(files),
    '',
  ];
  process.stdout.write(sections.join('\n'));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
