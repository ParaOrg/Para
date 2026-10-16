// Writes docs/architecture.md from the code: the units, who imports whom, each
// feature's public API and the app's entry points. Run `npm run docs:architecture`
// to write it, `node scripts/docs/architecture.mjs --check` (part of `npm run check`)
// to fail when the file on disk is not what the code now says.
//
// The page lists structure only: no file counts, no line counts, no weights on
// the edges. It changes when a unit, an import between units or a public API
// changes, never on an ordinary commit.
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, posix, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUTPUT = join(ROOT, 'docs', 'architecture.md');
const CHECK_MESSAGE = 'docs/architecture.md is out of date: run npm run docs:architecture';

/** Folders a small feature is split into by kind; they are not concerns of their own. */
const KIND_FOLDERS = new Set(['components', 'hooks', 'api', 'schemas', 'types', 'utils']);

/** The order the layers are drawn in, which is also the direction imports may flow. */
const LAYERS = ['app', 'features', 'shared', 'design-system', 'styles'];

const sorted = (values) => [...values].sort();

const subfolders = (dir) =>
  existsSync(dir)
    ? readdirSync(dir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
    : [];

/**
 * The features that are split into concern folders (routes: model, geo, map, cards),
 * as a Map of feature name → its concern folders. A feature whose subfolders are all
 * kind folders (api, schemas, ...) is one unit and is not in the Map.
 */
export function findGroupedFeatures(srcDir) {
  const featuresDir = join(srcDir, 'features');
  const grouped = new Map();
  for (const feature of subfolders(featuresDir)) {
    const concerns = subfolders(join(featuresDir, feature));
    if (concerns.some((name) => !KIND_FOLDERS.has(name))) grouped.set(feature, new Set(concerns));
  }
  return grouped;
}

const hasExtension = (segment) => /\.\w+$/.test(segment);

/**
 * The unit a path under src/ belongs to, or null when it belongs to none.
 * `srcPath` is relative to src/ with forward slashes, e.g. 'features/routes/geo/pass.ts';
 * it may be an import's target, so it may lack an extension or name a folder
 * ('features/locator' is the locator's index.ts). `groupedFeatures` is what
 * findGroupedFeatures returns.
 */
export function unitOf(srcPath, groupedFeatures = new Map()) {
  const [layer, name, third] = srcPath.split('/');
  switch (layer) {
    case 'app':
    case 'shared':
    case 'design-system':
      // A file straight in the layer's folder is no unit.
      return name === undefined || hasExtension(name) ? null : `${layer}/${name}`;
    case 'features': {
      if (name === undefined || hasExtension(name)) return null;
      // A file at a grouped feature's root belongs to the feature's root unit.
      return groupedFeatures.get(name)?.has(third)
        ? `features/${name}/${third}`
        : `features/${name}`;
    }
    case 'styles':
      return 'styles';
    default:
      return null;
  }
}

/** Every unit that exists on disk, sorted. */
export function listUnits(srcDir, groupedFeatures = findGroupedFeatures(srcDir)) {
  const units = [];
  for (const app of subfolders(join(srcDir, 'app'))) units.push(`app/${app}`);
  for (const feature of subfolders(join(srcDir, 'features'))) {
    const featureDir = join(srcDir, 'features', feature);
    if (!groupedFeatures.has(feature)) {
      units.push(`features/${feature}`);
      continue;
    }
    for (const concern of groupedFeatures.get(feature))
      units.push(`features/${feature}/${concern}`);
    // Its root is a unit only when code sits directly in it.
    const hasRootFiles = readdirSync(featureDir, { withFileTypes: true }).some(
      (entry) => entry.isFile() && /\.tsx?$/.test(entry.name),
    );
    if (hasRootFiles) units.push(`features/${feature}`);
  }
  for (const kind of subfolders(join(srcDir, 'shared'))) units.push(`shared/${kind}`);
  for (const layer of subfolders(join(srcDir, 'design-system'))) {
    units.push(`design-system/${layer}`);
  }
  if (existsSync(join(srcDir, 'styles'))) units.push('styles');
  return sorted(units);
}

/**
 * Every module a source text imports, as { specifier, isDynamic }. Covers
 * `import … from`, `export … from`, `import 'x'` and `import('x')`; comments and
 * strings that merely look like imports are ignored.
 */
export function parseImports(text, fileName = 'file.ts') {
  const source = ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, false);
  const found = [];
  const visit = (node) => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      found.push({ specifier: node.moduleSpecifier.text, isDynamic: false });
    } else if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments[0] &&
      ts.isStringLiteralLike(node.arguments[0])
    ) {
      found.push({ specifier: node.arguments[0].text, isDynamic: true });
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
}

/** The stylesheets a CSS text imports (`@import 'x'` and `@import url('x')`), as parseImports does. */
export function parseCssImports(text) {
  const withoutComments = text.replace(/\/\*[\s\S]*?\*\//g, '');
  return [...withoutComments.matchAll(/@import\s+(?:url\(\s*)?['"]([^'"]+)['"]/g)].map((m) => ({
    specifier: m[1],
    isDynamic: false,
  }));
}

/**
 * Where an import points, as a path relative to src/ ('shared/utils/geo'), or null
 * for a package or anything outside src/. `fromPath` is the importing file, relative
 * to src/. Query strings ('?url') are dropped.
 */
export function resolveImport(specifier, fromPath) {
  const clean = specifier.split('?')[0];
  if (clean.startsWith('@/')) return clean.slice(2);
  if (!clean.startsWith('.')) return null;
  const resolved = posix.join(posix.dirname(fromPath), clean);
  return resolved.startsWith('..') ? null : resolved;
}

/** Every .ts/.tsx/.css file under dir, as paths relative to it, stories left out. */
function* sourceFiles(dir, base = dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* sourceFiles(full, base);
    } else if (/\.(tsx?|css)$/.test(entry.name) && !entry.name.endsWith('.stories.tsx')) {
      yield full
        .slice(base.length + 1)
        .split('\\')
        .join('/');
    }
  }
}

/**
 * The imports between units: Map of 'from unit' → Map of 'to unit' → whether every
 * import between the pair is dynamic (lazy).
 */
export function buildGraph(srcDir) {
  const groupedFeatures = findGroupedFeatures(srcDir);
  const edges = new Map();
  for (const file of sourceFiles(srcDir)) {
    const from = unitOf(file, groupedFeatures);
    if (!from) continue;
    const text = readFileSync(join(srcDir, file), 'utf8');
    const imports = file.endsWith('.css') ? parseCssImports(text) : parseImports(text, file);
    for (const { specifier, isDynamic } of imports) {
      const target = resolveImport(specifier, file);
      const to = target && unitOf(target, groupedFeatures);
      if (!to || to === from) continue;
      const targets = edges.get(from) ?? new Map();
      targets.set(to, (targets.get(to) ?? true) && isDynamic);
      edges.set(from, targets);
    }
  }
  return edges;
}

/** The names a feature's index.ts exports; `export *` is listed as '* from <path>'. */
export function parseExports(text) {
  const source = ts.createSourceFile('index.ts', text, ts.ScriptTarget.Latest, false);
  const names = [];
  for (const node of source.statements) {
    if (ts.isExportDeclaration(node)) {
      if (node.exportClause && ts.isNamedExports(node.exportClause)) {
        for (const element of node.exportClause.elements) names.push(element.name.text);
      } else if (node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
        names.push(`* from ${node.moduleSpecifier.text}`);
      }
    } else if (ts.canHaveModifiers(node)) {
      const isExported = ts.getModifiers(node)?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
      if (!isExported) continue;
      if (ts.isVariableStatement(node)) {
        for (const declaration of node.declarationList.declarations) {
          if (ts.isIdentifier(declaration.name)) names.push(declaration.name.text);
        }
      } else if (node.name && ts.isIdentifier(node.name)) {
        names.push(node.name.text);
      }
    }
  }
  return names;
}

/** The module each HTML page loads: { page, script }, for the root's and studio/'s pages. */
export function findEntryPoints(rootDir) {
  const entries = [];
  for (const dir of ['.', 'studio']) {
    const full = join(rootDir, dir);
    if (!existsSync(full)) continue;
    for (const entry of readdirSync(full, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith('.html')) continue;
      const html = readFileSync(join(full, entry.name), 'utf8');
      const script = html.match(/<script[^>]*\btype="module"[^>]*\bsrc="([^"]+)"/)?.[1];
      if (script) {
        entries.push({
          page: dir === '.' ? entry.name : `${dir}/${entry.name}`,
          script: script.replace(/^\//, ''),
        });
      }
    }
  }
  return entries.sort((a, b) => (a.page < b.page ? -1 : 1));
}

const layerOf = (unit) => unit.split('/')[0];
const nodeId = (unit) => unit.replace(/[^a-z0-9]/gi, '_');
/** The label drops the layer a subgraph already names. */
const labelOf = (unit) => (unit.includes('/') ? unit.slice(unit.indexOf('/') + 1) : unit);

function mermaidOf(units, edges) {
  const lines = ['flowchart TD'];
  for (const layer of LAYERS) {
    const inLayer = units.filter((unit) => layerOf(unit) === layer);
    if (inLayer.length === 0) continue;
    lines.push(`  subgraph ${nodeId(layer)}_layer["${layer}"]`);
    for (const unit of inLayer) lines.push(`    ${nodeId(unit)}["${labelOf(unit)}"]`);
    lines.push('  end');
  }
  for (const from of units) {
    for (const to of sorted(edges.get(from)?.keys() ?? [])) {
      const arrow = edges.get(from).get(to) ? '-.->' : '-->';
      lines.push(`  ${nodeId(from)} ${arrow} ${nodeId(to)}`);
    }
  }
  return lines.join('\n');
}

/** The whole page, as the string the script writes. */
export function renderPage({ units, edges, apis, entryPoints }) {
  const out = [
    '<!-- Generated by scripts/docs/architecture.mjs from the code in src/. Do not edit by hand: run `npm run docs:architecture`. -->',
    '',
    '# Architecture',
    '',
    'This page is generated from the code, so it cannot go stale. It shows the structure only: which units exist, which import which, and what each feature exposes. Arrows point from the importing unit to the one it imports. A dashed arrow means every import between the two is lazy (`import()`). Stories are left out; stylesheet `@import`s count as imports. The rules the arrows must follow are in `.claude/CLAUDE.md`, and ESLint enforces them.',
    '',
    '## Units',
    '',
    'A unit is a folder: an app, a feature (or a concern folder of a feature that has them), a kind of shared code, a design-system layer, or the styles.',
    '',
  ];
  for (const layer of LAYERS) {
    const inLayer = units.filter((unit) => layerOf(unit) === layer);
    if (inLayer.length === 0) continue;
    out.push(`- **${layer}**: ${inLayer.map((unit) => `\`${labelOf(unit)}\``).join(', ')}`);
  }
  out.push('', '## Import graph', '', '```mermaid', mermaidOf(units, edges), '```', '');
  out.push('### What each unit imports', '', '| Unit | Imports |', '| --- | --- |');
  for (const unit of units) {
    const targets = sorted(edges.get(unit)?.keys() ?? []);
    out.push(`| \`${unit}\` | ${targets.map((t) => `\`${t}\``).join(', ') || '—'} |`);
  }
  out.push('', '## Public APIs', '');
  out.push(
    "A feature's `index.ts` is the only door into it for code outside the feature. What each one exports:",
    '',
  );
  for (const { feature, names } of apis) {
    out.push(`### \`${feature}\``, '', names.map((name) => `\`${name}\``).join(', '), '');
  }
  out.push('## Entry points', '', '| Page | Loads |', '| --- | --- |');
  for (const { page, script } of entryPoints) out.push(`| \`${page}\` | \`${script}\` |`);
  out.push('');
  return out.join('\n');
}

/** Reads the repository and returns the page's text. */
export function generate(rootDir = ROOT) {
  const srcDir = join(rootDir, 'src');
  const groupedFeatures = findGroupedFeatures(srcDir);
  const units = listUnits(srcDir, groupedFeatures);
  const apis = subfolders(join(srcDir, 'features'))
    .filter((feature) => existsSync(join(srcDir, 'features', feature, 'index.ts')))
    .sort()
    .map((feature) => ({
      feature: `features/${feature}`,
      names: parseExports(readFileSync(join(srcDir, 'features', feature, 'index.ts'), 'utf8')),
    }));
  return renderPage({
    units,
    edges: buildGraph(srcDir),
    apis,
    entryPoints: findEntryPoints(rootDir),
  });
}

function main() {
  const page = generate();
  if (process.argv.includes('--check')) {
    const current = existsSync(OUTPUT) ? readFileSync(OUTPUT, 'utf8') : '';
    if (current !== page) {
      console.error(CHECK_MESSAGE);
      process.exit(1);
    }
    return;
  }
  writeFileSync(OUTPUT, page);
  console.log('wrote docs/architecture.md');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
