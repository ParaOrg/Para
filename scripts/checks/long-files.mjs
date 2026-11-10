// No source file over LONG_FILE_LINES lines, but those already long when the check came in, each
// held to the length it had then (long-files-baseline.json). The baseline may only shrink: a new
// long file fails, a grandfathered one that grows fails, and on a pull request an entry added to
// the baseline, or raised, fails too. `--update` rewrites it lower, never higher.
//
//   node scripts/checks/long-files.mjs                       the check
//   node scripts/checks/long-files.mjs --base <old.json>     and the baseline against the old one
//   node scripts/checks/long-files.mjs --update              lowers the baseline to the files now
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const LONG_FILE_LINES = 150;
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const BASELINE = join(root, 'scripts/checks/long-files-baseline.json');

/** Lines in `text`, as an editor numbers them: a last newline starts no line of its own. */
export const lineCount = (text) => text.split('\n').length - (text.endsWith('\n') ? 1 : 0);

/** Source files are .ts and .tsx under src/, stories left out (as `npm run health` counts). */
const isSource = (name) => /\.tsx?$/.test(name) && !name.endsWith('.stories.tsx');

/** Written by a tool, never by hand (CLAUDE.md, TypeScript): no length to hold it to. */
export const GENERATED = new Set(['src/shared/types/database.types.ts']);

function* sourcesUnder(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* sourcesUnder(full);
    else if (isSource(entry.name)) yield relative(root, full).split('\\').join('/');
  }
}

/** Every source file over the limit, by path, with its lines. */
export function longFilesOf(files) {
  return Object.fromEntries(
    Object.entries(files).filter(
      ([path, lines]) => lines > LONG_FILE_LINES && !GENERATED.has(path),
    ),
  );
}

/**
 * What breaks the rule: `long` (the files over the limit now) against `baseline`, and the baseline
 * against `previous` (the base branch's) when given. Each problem is one line to print.
 */
export function problemsOf(long, baseline, previous = null) {
  const problems = [];
  for (const [path, lines] of Object.entries(long)) {
    const allowed = baseline[path];
    if (allowed === undefined) {
      problems.push(
        `${path}: ${lines} lines, over ${LONG_FILE_LINES}. Split it (CLAUDE.md, Components).`,
      );
    } else if (lines > allowed) {
      problems.push(
        `${path}: ${lines} lines, more than the ${allowed} it was held to. Split it, or bring it back.`,
      );
    }
  }
  if (previous) {
    for (const [path, allowed] of Object.entries(baseline)) {
      if (previous[path] === undefined)
        problems.push(`${path}: added to the baseline, which may only shrink.`);
      else if (allowed > previous[path])
        problems.push(
          `${path}: raised in the baseline from ${previous[path]} to ${allowed}, which may only shrink.`,
        );
    }
  }
  return problems;
}

/** The baseline lowered to `long`: each file at its length now if shorter, gone once under. */
export function loweredBaseline(long, baseline) {
  return Object.fromEntries(
    Object.entries(baseline)
      .filter(([path]) => long[path] !== undefined)
      .map(([path, allowed]) => [path, Math.min(allowed, long[path])])
      .sort(([a], [b]) => (a < b ? -1 : 1)),
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const files = {};
  for (const path of sourcesUnder(join(root, 'src'))) {
    files[path] = lineCount(readFileSync(join(root, path), 'utf8'));
  }
  const long = longFilesOf(files);
  const baseline = JSON.parse(readFileSync(BASELINE, 'utf8'));
  if (process.argv.includes('--update')) {
    writeFileSync(BASELINE, `${JSON.stringify(loweredBaseline(long, baseline), null, 2)}\n`);
    console.info(
      `The baseline holds ${Object.keys(loweredBaseline(long, baseline)).length} files.`,
    );
    process.exit(0);
  }
  const basePath = process.argv[process.argv.indexOf('--base') + 1];
  const previous =
    process.argv.includes('--base') && existsSync(basePath)
      ? JSON.parse(readFileSync(basePath, 'utf8'))
      : null;
  const problems = problemsOf(long, baseline, previous);
  for (const problem of problems) console.error(`FAIL  ${problem}`);
  const shorter = Object.keys(baseline).filter((path) => (long[path] ?? 0) < baseline[path]).length;
  if (shorter > 0)
    console.info(`${shorter} grandfathered files are shorter now: --update lowers the baseline.`);
  console.info(
    `${Object.keys(long).length} files over ${LONG_FILE_LINES} lines, all grandfathered: ${problems.length === 0}`,
  );
  process.exit(problems.length === 0 ? 0 : 1);
}
