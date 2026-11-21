// ESLint's usual report, and the same run's counts kept as JSON for the code-health page.
//
// CI's Lint step names this as its formatter with ESLINT_JSON set to a file, so one ESLint
// run serves both that step and Code health (scripts/checks/health.mjs), which otherwise
// runs ESLint a second time. Without ESLINT_JSON it is ESLint's stylish report and nothing
// more.
//
//   ESLINT_JSON=eslint.json npx eslint . --format ./scripts/checks/eslint-formatter.mjs
import { writeFileSync } from 'node:fs';
import { ESLint } from 'eslint';

/** What the code-health page reads of a file's result: its counts, and each message's rule. */
export const kept = (results) =>
  results.map(({ errorCount, warningCount, messages }) => ({
    errorCount,
    warningCount,
    messages: messages.map(({ ruleId, severity }) => ({ ruleId, severity })),
  }));

export default async function format(results) {
  const file = process.env.ESLINT_JSON;
  if (file) writeFileSync(file, JSON.stringify(kept(results)));
  const stylish = await new ESLint().loadFormatter('stylish');
  return stylish.format(results);
}
