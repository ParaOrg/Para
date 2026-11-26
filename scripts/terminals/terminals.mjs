// Builds the terminals file (terminal-file.mjs) from the extract's candidates, which build.sh
// exports with osmium, and fails on a file not to trust. With --compare, prints the kinds' counts
// before and after, for the monthly refresh's pull request.
//
//   node scripts/terminals/terminals.mjs --filter
//   node scripts/terminals/terminals.mjs <candidates.geojsonseq> <extract timestamp> <out.json>
//   node scripts/terminals/terminals.mjs --compare <before.json> <after.json>
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

import { readPanningBox } from '../tiles/area.mjs';
import {
  TERMINAL_FILTER,
  terminalCountsTable,
  terminalFileProblems,
  terminalFileText,
  terminalsFrom,
} from './terminal-file.mjs';

const RECORD_SEPARATOR = '\u001e';
const [first, second, third] = process.argv.slice(2);

if (first === '--filter') {
  console.log(TERMINAL_FILTER.join(' '));
} else if (first === '--compare') {
  const read = (path) => (path && existsSync(path) ? readFileSync(path, 'utf8') : '');
  console.log(terminalCountsTable(read(second), read(third)));
} else if (first && second && third) {
  const features = readFileSync(first, 'utf8')
    .split('\n')
    .map((line) => (line.startsWith(RECORD_SEPARATOR) ? line.slice(1) : line).trim())
    .filter((line) => line !== '')
    .map((line) => JSON.parse(line));
  const terminals = terminalsFrom(features, readPanningBox());
  const text = terminalFileText({ extractAt: second, terminals });
  const problems = terminalFileProblems(text);
  for (const problem of problems) console.error(`${third}: ${problem}`);
  if (problems.length > 0) process.exit(1);
  writeFileSync(third, text);
  const count = (kind) => terminals.filter((terminal) => terminal.kind === kind).length;
  console.error(
    `Wrote ${terminals.length} terminals to ${third}: jeepney ${count('jeepney')}, UV ${count('uv')}, ` +
      `bus ${count('bus')}, unknown ${count('unknown')}; ${Math.round(text.length / 1024)} kB.`,
  );
} else {
  console.error(
    'Usage: node scripts/terminals/terminals.mjs <candidates.geojsonseq> <extract timestamp> <out.json>',
  );
  process.exit(2);
}
