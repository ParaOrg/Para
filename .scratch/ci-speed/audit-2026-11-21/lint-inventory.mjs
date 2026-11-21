// Every ESLint rule the repo's config turns on (from `eslint --print-config` of six
// representative files), checked by name against oxlint's rule list and Bun's rule list as
// downloaded today. A name match says the rule exists there; it does not prove the same options.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';

const files = readdirSync('.').filter((name) => name.endsWith('.json') && name !== 'inventory.json');
const rules = {};
for (const file of files) {
  const config = JSON.parse(readFileSync(file, 'utf8'));
  for (const [name, value] of Object.entries(config.rules ?? {})) {
    const level = Array.isArray(value) ? value[0] : value;
    if (level === 0 || level === 'off') continue;
    const entry = (rules[name] ??= { files: [], hasOptions: false, level });
    entry.files.push(file.replace('.json', ''));
    if (Array.isArray(value) && value.length > 1) entry.hasOptions = true;
  }
}
const names = (html, base) =>
  new Set([...html.matchAll(new RegExp(`href="${base}/([a-z_0-9-]+)/([a-z0-9-]+)"`, 'g'))].map((m) => `${m[1]}/${m[2]}`));
const oxlint = names(readFileSync('oxlint-rules.html', 'utf8'), '/docs/guide/usage/linter/rules');
const bun = names(readFileSync('bun-rules.html', 'utf8'), '/docs/lint/rules');

/** ESLint name -> the plugin folders each list files it under. */
function lookup(name) {
  let plugin = 'eslint';
  let rule = name;
  if (name.includes('/')) [plugin, rule] = [name.slice(0, name.lastIndexOf('/')), name.slice(name.lastIndexOf('/') + 1)];
  const ox = { '@typescript-eslint': ['typescript'], 'react-hooks': ['react'], 'jsx-a11y': ['jsx_a11y'], 'import-x': ['import'], eslint: ['eslint'], 'check-file': [] }[plugin] ?? [plugin];
  const bn = { '@typescript-eslint': ['typescript'], 'react-hooks': ['react'], 'jsx-a11y': ['jsx-a11y'], 'import-x': ['import'], eslint: ['eslint'], 'check-file': [] }[plugin] ?? [plugin];
  return {
    plugin,
    oxlint: ox.some((p) => oxlint.has(`${p}/${rule}`)) || (plugin === '@typescript-eslint' && false),
    // typescript-eslint extension rules (no-unused-vars and so on) are sometimes only listed under eslint/.
    oxlintCore: oxlint.has(`eslint/${rule}`),
    bun: bn.some((p) => bun.has(`${p}/${rule}`)),
    bunCore: bun.has(`eslint/${rule}`),
  };
}
const rows = Object.entries(rules)
  .map(([name, entry]) => ({ name, ...entry, ...lookup(name) }))
  .sort((a, b) => a.plugin.localeCompare(b.plugin) || a.name.localeCompare(b.name));
writeFileSync('inventory.json', JSON.stringify(rows, null, 1));

const byPlugin = {};
for (const row of rows) (byPlugin[row.plugin] ??= []).push(row);
for (const [plugin, list] of Object.entries(byPlugin)) {
  const missOx = list.filter((row) => !row.oxlint && !row.oxlintCore);
  const coreOnlyOx = list.filter((row) => !row.oxlint && row.oxlintCore);
  const missBun = list.filter((row) => !row.bun && !row.bunCore);
  console.log(`\n${plugin}: ${list.length} rules on`);
  console.log(`  oxlint has ${list.length - missOx.length}; not in oxlint's list: ${missOx.map((row) => row.name).join(', ') || 'none'}`);
  if (coreOnlyOx.length) console.log(`  (in oxlint only as the eslint/ core rule: ${coreOnlyOx.map((row) => row.name).join(', ')})`);
  console.log(`  Bun's list has ${list.length - missBun.length}; not in Bun's list: ${missBun.map((row) => row.name).join(', ') || 'none'}`);
}
console.log(`\nTotal rules on: ${rows.length}. oxlint list: ${oxlint.size} rules. Bun list: ${bun.size} rules.`);
console.log('\nRules with options (the option must carry over, not only the name):');
console.log(rows.filter((row) => row.hasOptions).map((row) => row.name).join(', '));
