// CI lints once: the Lint step's formatter prints ESLint's usual report and keeps the run's
// counts for the code-health page, which reads them in place of a second ESLint run
// (scripts/checks/eslint-formatter.mjs, scripts/checks/health.mjs).
//
//   node --test tests/unit/eslint-formatter-test.mjs
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { ESLint } from 'eslint';
import format, { kept } from '../../scripts/checks/eslint-formatter.mjs';
import { eslintLines } from '../../scripts/checks/health.mjs';

const message = (ruleId, severity) => ({
  ruleId,
  severity,
  message: `${ruleId} fired`,
  line: 1,
  column: 1,
});
const RESULTS = [
  {
    filePath: '/repo/src/a.ts',
    messages: [message('no-console', 2), message('no-console', 2), message('no-var', 1)],
    errorCount: 2,
    warningCount: 1,
    fixableErrorCount: 0,
    fixableWarningCount: 0,
    suppressedMessages: [],
    usedDeprecatedRules: [],
  },
  {
    filePath: '/repo/src/b.ts',
    messages: [message(null, 2)],
    errorCount: 1,
    warningCount: 0,
    fixableErrorCount: 0,
    fixableWarningCount: 0,
    suppressedMessages: [],
    usedDeprecatedRules: [],
  },
];

/** `format` run with ESLINT_JSON as given, put back after. */
async function formatted(file) {
  const before = process.env.ESLINT_JSON;
  if (file === undefined) delete process.env.ESLINT_JSON;
  else process.env.ESLINT_JSON = file;
  try {
    return await format(RESULTS);
  } finally {
    if (before === undefined) delete process.env.ESLINT_JSON;
    else process.env.ESLINT_JSON = before;
  }
}

test('the report it prints is ESLint’s own stylish one, with or without ESLINT_JSON', async () => {
  const stylish = (await new ESLint().loadFormatter('stylish')).format(RESULTS);
  assert.equal(await formatted(undefined), stylish);
  const dir = mkdtempSync(join(tmpdir(), 'eslint-formatter-'));
  try {
    assert.equal(await formatted(join(dir, 'eslint.json')), stylish);
  } finally {
    rmSync(dir, { recursive: true });
  }
});

test('with ESLINT_JSON it keeps every file’s counts and each message’s rule and severity', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'eslint-formatter-'));
  try {
    const file = join(dir, 'eslint.json');
    await formatted(file);
    assert.deepEqual(JSON.parse(readFileSync(file, 'utf8')), kept(RESULTS));
    assert.deepEqual(kept(RESULTS)[1], {
      errorCount: 1,
      warningCount: 0,
      messages: [{ ruleId: null, severity: 2 }],
    });
  } finally {
    rmSync(dir, { recursive: true });
  }
});

test('the code-health page says the same of the kept counts as of ESLint’s full results', () => {
  const lines = [
    '- **ESLint:** 3 errors, 1 warnings',
    '  - no-console (error): 2',
    '  - no-var (warning): 1',
    '  - parse error (error): 1',
  ];
  assert.deepEqual(eslintLines(RESULTS), lines);
  assert.deepEqual(eslintLines(kept(RESULTS)), lines);
});

test('a clean run reads 0 errors, 0 warnings; no report at all says so', () => {
  assert.deepEqual(eslintLines([{ errorCount: 0, warningCount: 0, messages: [] }]), [
    '- **ESLint:** 0 errors, 0 warnings',
  ]);
  assert.match(eslintLines(null)[0], /no report/);
});
