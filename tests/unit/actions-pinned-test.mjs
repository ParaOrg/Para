// Every action a workflow or a local action uses from elsewhere is pinned to a full commit, its
// version beside it in a comment (`owner/repo@<40 hex> # v7`): a tag can be moved to other code,
// a commit cannot. Dependabot moves the commit and the comment together (.github/dependabot.yml).
// The repository's own actions (`./.github/actions/…`) are this commit's already.
//
//   node --test tests/unit/actions-pinned-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const GITHUB = fileURLToPath(new URL('../../.github/', import.meta.url));

/** Every workflow and local action file under .github/, by its path there. */
const files = (folder) =>
  readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
    const path = join(folder, entry.name);
    if (entry.isDirectory()) return files(path);
    return /\.ya?ml$/.test(entry.name) ? [path] : [];
  });

/** Each `uses:` line that names an action from elsewhere, with where it is. */
const uses = files(GITHUB).flatMap((path) =>
  readFileSync(path, 'utf8')
    .split('\n')
    .map((line, i) => ({ at: `${path.slice(GITHUB.length)}:${i + 1}`, line: line.trim() }))
    .filter(({ line }) => /^-?\s*uses:/.test(line) && !/uses:\s*\.\//.test(line)),
);

test('the workflows use actions from elsewhere', () => {
  assert.ok(uses.length > 0);
});

test('each one is pinned to a full commit, its version in a comment', () => {
  const loose = uses.filter(
    ({ line }) => !/uses:\s*[\w.-]+\/[\w./-]+@[0-9a-f]{40} # v\d/.test(line),
  );
  assert.deepEqual(
    loose.map(({ at, line }) => `${at} ${line}`),
    [],
    'pin each to its tag\'s commit: `git ls-remote --tags https://github.com/<owner>/<repo> "refs/tags/<tag>^{}"`',
  );
});
