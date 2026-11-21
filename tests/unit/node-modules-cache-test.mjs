// CI keeps node_modules between runs (.github/workflows/ci.yml's build job and the browser
// suites' shared setup, .github/actions/prepare-browser-suite). What makes that safe is checked
// here: the key names everything the folder depends on, nothing but an exact match is restored,
// a miss installs with `npm ci`, and the folder is saved before any tool writes into it.
//
//   node --test tests/unit/node-modules-cache-test.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const PLACES = {
  'the build job': read('.github/workflows/ci.yml'),
  'the browser suites’ setup': read('.github/actions/prepare-browser-suite/action.yml'),
};
const KEY =
  "node-modules-${{ runner.os }}-${{ runner.arch }}-${{ steps.node.outputs.node-version }}-${{ hashFiles('package-lock.json') }}";

/** The steps from the node_modules restore to its save, comment lines left out. */
const cacheSteps = (text) => {
  const lines = text.split('\n').filter((line) => !line.trim().startsWith('#'));
  const from = lines.findIndex((line) => line.includes('id: modules'));
  const to = lines.findIndex((line, i) => i > from && line.includes('cache-primary-key'));
  assert.ok(from > 0 && to > from, 'the restore and the save are there');
  return lines.slice(from, to + 1).join('\n');
};

for (const [place, text] of Object.entries(PLACES)) {
  test(`${place}: the key is the lockfile, the installed Node, the system and the chip`, () => {
    assert.ok(cacheSteps(text).includes(`key: ${KEY}`));
    assert.match(
      text,
      /- id: node\n\s+uses: actions\/setup-node@/,
      'setup-node is the step named node',
    );
  });

  test(`${place}: only an exact match is restored, never another lockfile’s packages`, () => {
    assert.ok(!cacheSteps(text).includes('restore-keys'));
  });

  test(`${place}: a miss installs with npm ci and saves at once, under the key it looked for`, () => {
    const steps = cacheSteps(text);
    const order = [
      'uses: actions/cache/restore@',
      "if: steps.modules.outputs.cache-hit != 'true'",
      'run: npm ci',
      "if: steps.modules.outputs.cache-hit != 'true'",
      'uses: actions/cache/save@',
      'key: ${{ steps.modules.outputs.cache-primary-key }}',
    ];
    let at = 0;
    for (const part of order) {
      const found = steps.indexOf(part, at);
      assert.ok(found >= 0, `"${part}" comes next`);
      at = found + part.length;
    }
    assert.equal(
      steps.match(/path: node_modules/g).length,
      2,
      'the restore and the save name node_modules',
    );
  });

  test(`${place}: setup-node no longer keeps npm’s download cache as well`, () => {
    const setup = /uses: actions\/setup-node@[\s\S]*?node-version: 22\n(.*)\n/.exec(text);
    assert.ok(setup && !setup[1].includes('cache: npm'));
  });
}
