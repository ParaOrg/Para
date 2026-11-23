// The glossary's banned words (glossary-words.json, from CONTEXT.md's "_Avoid_" lists) kept out of
// src/, docs/ and CONTEXT.md: each use found fails, with the word to write instead. CONTEXT.md's
// own "_Avoid_:" lines name the words on purpose and are not read; past records are skipped, each
// with its reason in the list.
//
//   node scripts/checks/glossary.mjs
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const READ = ['src', 'docs', 'CONTEXT.md'];
const isText = (name) => /\.(tsx?|mjs|js|css|md|json)$/.test(name);

/** The pattern for a banned word, its plural and either case, as a whole word. */
export const patternOf = (word) => new RegExp(`\\b${word}s?\\b`, 'i');

/**
 * Each use of a banned word in `text` (the file at `path`), as "path:line: word → use". The
 * glossary's own "_Avoid_:" lines are left alone.
 */
export function usesIn(path, text, words) {
  const found = [];
  text.split('\n').forEach((line, index) => {
    if (line.trimStart().startsWith('_Avoid_:')) return;
    for (const { word, use } of words) {
      if (patternOf(word).test(line)) found.push(`${path}:${index + 1}: "${word}" → "${use}"`);
    }
  });
  return found;
}

/** Whether `path` is one of the skipped records, by a path or a folder's start. */
export const isSkipped = (path, skip) =>
  Object.keys(skip).some((start) => path === start || path.startsWith(start));

function* filesUnder(path) {
  if (!existsSync(path)) return;
  if (!statSync(path).isDirectory()) {
    yield path;
    return;
  }
  for (const entry of readdirSync(path, { withFileTypes: true })) {
    const full = join(path, entry.name);
    if (entry.isDirectory()) yield* filesUnder(full);
    else if (isText(entry.name)) yield full;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { words, skip } = JSON.parse(
    readFileSync(join(root, 'scripts/checks/glossary-words.json'), 'utf8'),
  );
  const found = [];
  for (const start of READ) {
    for (const full of filesUnder(join(root, start))) {
      const path = relative(root, full).split('\\').join('/');
      if (isSkipped(path, skip)) continue;
      // The file name too: a banned word in a path is read as often as one in a sentence.
      for (const { word, use } of words) {
        if (patternOf(word).test(path)) found.push(`${path} (its name): "${word}" → "${use}"`);
      }
      found.push(...usesIn(path, readFileSync(full, 'utf8'), words));
    }
  }
  for (const use of found) console.error(`FAIL  ${use}`);
  console.info(`Glossary: ${found.length === 0 ? 'no banned word' : `${found.length} uses`}.`);
  process.exit(found.length === 0 ? 0 : 1);
}
