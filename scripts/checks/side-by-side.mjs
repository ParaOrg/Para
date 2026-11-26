// Runs several checks at once and reports every one: CI's build job starts formatting, lint,
// the build and the unit checks together, so the job takes as long as its slowest check, and
// a formatting slip no longer hides whether lint and the unit checks pass.
//
// Each argument is `name::command`. Every command runs to its end, whatever the others do.
// Their output is printed whole, one check after another in the order given, under a line
// that says how it ended; then every failure is named, and the exit code is 1 if there was
// any. Nothing is retried and nothing is cut short.
//
//   node scripts/checks/side-by-side.mjs "Lint::npm run lint" "The unit checks::npm run test:unit"
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const IN_ACTIONS = Boolean(process.env.GITHUB_ACTIONS);

/** `name::command` as its two parts; a name or a command left out is a mistake in the call. */
export function parseCheck(argument) {
  const at = argument.indexOf('::');
  const name = at < 0 ? '' : argument.slice(0, at).trim();
  const command = at < 0 ? '' : argument.slice(at + 2).trim();
  if (!name || !command) throw new Error(`"${argument}" is not name::command`);
  return { name, command };
}

/** One check run to its end: its output as it came (both streams, in order), and how it ended. */
function run({ name, command }) {
  return new Promise((resolve) => {
    const started = Date.now();
    const chunks = [];
    const child = spawn(command, { shell: true, stdio: ['ignore', 'pipe', 'pipe'] });
    child.stdout.on('data', (chunk) => chunks.push(chunk));
    child.stderr.on('data', (chunk) => chunks.push(chunk));
    const end = (code) =>
      resolve({
        name,
        command,
        code,
        seconds: (Date.now() - started) / 1000,
        output: Buffer.concat(chunks).toString('utf8'),
      });
    child.on('error', (error) => {
      chunks.push(Buffer.from(`${error.message}\n`));
      end(1);
    });
    // A check killed by a signal has no exit code: that is a failure, not a pass.
    child.on('close', (code) => end(code ?? 1));
  });
}

/** Every check at once; the results in the order the checks were given. */
export const runAll = (checks) => Promise.all(checks.map(run));

/** What is printed for the results: each check's output under its verdict, then the failures. */
export function report(results, inActions = IN_ACTIONS) {
  const lines = [];
  for (const { name, command, code, seconds, output } of results) {
    const verdict = `${code === 0 ? 'PASS' : 'FAIL'}  ${name}  (${seconds.toFixed(1)} s)`;
    lines.push(inActions ? `::group::${verdict}` : `\n=== ${verdict}`);
    lines.push(`$ ${command}`);
    lines.push(output.trimEnd());
    if (inActions) lines.push('::endgroup::');
  }
  const failed = results.filter((result) => result.code !== 0);
  lines.push('');
  for (const { name, code } of failed) {
    lines.push(
      inActions ? `::error::${name} failed (exit ${code})` : `FAILED  ${name} (exit ${code})`,
    );
  }
  lines.push(
    failed.length === 0
      ? `All ${results.length} checks passed.`
      : `${failed.length} of ${results.length} checks failed: ${failed.map((f) => f.name).join(', ')}.`,
  );
  return lines.join('\n');
}

async function main() {
  const checks = process.argv.slice(2).map(parseCheck);
  if (checks.length === 0) throw new Error('give at least one name::command');
  const results = await runAll(checks);
  // exitCode, not process.exit(): on a pipe (a runner's log) stdout may be written in the
  // background, and exiting at once would cut the report off before its failures.
  process.exitCode = results.some((result) => result.code !== 0) ? 1 : 0;
  console.log(report(results));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
