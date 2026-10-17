// The architecture page's two pure steps (scripts/docs/architecture.mjs): which unit
// a path belongs to, and which modules a file imports, on inline examples.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/architecture-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { assertKnownLayers, resolveImport, unitOf } from '../../scripts/docs/architecture.mjs';
import {
  parseCssImports,
  parseExports,
  parseImports,
  withoutComments,
} from '../../scripts/docs/source-scan.mjs';

/** routes and studio have concern folders; locator and published-map are one unit each. */
const GROUPED = new Map([
  ['routes', new Set(['model', 'geo', 'map', 'cards', 'published'])],
  ['studio', new Set(['auth', 'data', 'drawing', 'panels'])],
]);

test('a path maps to the unit of its folder', () => {
  const cases = {
    'app/public-map/main.tsx': 'app/public-map',
    'app/studio/studio-app.tsx': 'app/studio',
    'features/locator/use-locator.ts': 'features/locator',
    'features/published-map/status.ts': 'features/published-map',
    'features/published-map/api/fetch-index.ts': 'features/published-map',
    'features/routes/published/fetch-index.ts': 'features/routes/published',
    'features/routes/geo/pass.ts': 'features/routes/geo',
    'features/routes/map/basemap-thumbnails/osm.webp': 'features/routes/map',
    'features/studio/index.ts': 'features/studio',
    'features/studio/panels/save-panel.tsx': 'features/studio/panels',
    'shared/ui/bottom-sheet.tsx': 'shared/ui',
    'design-system/foundation/fonts/SNPro/a.woff2': 'design-system/foundation',
    'styles/global.css': 'styles',
  };
  for (const [path, unit] of Object.entries(cases)) {
    assert.equal(unitOf(path, GROUPED), unit, path);
  }
});

test('an import of a folder or of an extensionless file maps to a unit too', () => {
  assert.equal(unitOf('features/locator', GROUPED), 'features/locator');
  assert.equal(unitOf('features/studio', GROUPED), 'features/studio');
  assert.equal(unitOf('features/studio/auth', GROUPED), 'features/studio/auth');
  assert.equal(unitOf('shared/utils/geo', GROUPED), 'shared/utils');
});

test('a path outside every unit maps to none', () => {
  assert.equal(unitOf('vite-env.d.ts', GROUPED), null);
  assert.equal(unitOf('features/readme.md', GROUPED), null);
  assert.equal(unitOf('shared/stray.ts', GROUPED), null);
  assert.equal(unitOf('../scripts/node/map-file-constants.ts', GROUPED), null);
});

test('imports resolve from @/ and from relative paths, and packages resolve to nothing', () => {
  const from = 'features/routes/cards/route-card.tsx';
  assert.equal(resolveImport('@/shared/utils/geo', from), 'shared/utils/geo');
  assert.equal(resolveImport('../geo/pass', from), 'features/routes/geo/pass');
  assert.equal(
    resolveImport('./route-card-header', from),
    'features/routes/cards/route-card-header',
  );
  assert.equal(resolveImport('./sprite.svg?url', from), 'features/routes/cards/sprite.svg');
  assert.equal(resolveImport('react', from), null);
  assert.equal(resolveImport('maplibre-gl/dist/maplibre-gl.css', from), null);
  assert.equal(resolveImport('../../../../scripts/x.ts', from), null);
});

test('every form of import is found, comments and strings that look like one are not', () => {
  const text = `
    // import { nothing } from 'in-a-comment';
    import { a } from 'static';
    import type { B } from '@/shared/types';
    import 'side-effect.css';
    export { c } from './re-export';
    export * from './star';
    const note = "import { x } from 'in-a-string'";
    const Lazy = lazy(() => import('./lazy'));
    export const local = 1;
  `;
  assert.deepEqual(parseImports(text), [
    { specifier: 'static', isDynamic: false },
    { specifier: '@/shared/types', isDynamic: false },
    { specifier: 'side-effect.css', isDynamic: false },
    { specifier: './re-export', isDynamic: false },
    { specifier: './star', isDynamic: false },
    { specifier: './lazy', isDynamic: true },
  ]);
});

test('JSX files parse too', () => {
  const text = `import { a } from './a';\nexport function X() { return <div>{a}</div>; }`;
  assert.deepEqual(parseImports(text), [{ specifier: './a', isDynamic: false }]);
});

test('CSS @import is found in both forms, comments are not', () => {
  const css = `/* @import 'old.css'; */\n@import 'tailwindcss';\n@import url("../a/b.css");`;
  assert.deepEqual(
    parseCssImports(css).map((i) => i.specifier),
    ['tailwindcss', '../a/b.css'],
  );
});

test('an index.ts exports are its names, with type-only ones and star exports', () => {
  const text = `
    export { A, b as renamed } from './a';
    export { type C } from './c';
    export * from './d';
    export function e() {}
    export const F = 1;
    const hidden = 2;
  `;
  assert.deepEqual(parseExports(text), ['A', 'renamed', 'C', '* from ./d', 'e', 'F']);
});

test('a string, a template or a regular expression holding a quote or a comment does not hide an import', () => {
  const text = `
    const a = "it's // not a comment";
    const b = \`a \${"}"} \\\` // still the template\`;
    const c = /['"]\\/\\/x/.test(a) ? 1 : 2 / 2;
    import { real } from './real';
    const d = import('./late');
  `;
  assert.deepEqual(parseImports(text), [
    { specifier: './real', isDynamic: false },
    { specifier: './late', isDynamic: true },
  ]);
});

test('import.meta and a plain import word are not imports', () => {
  assert.deepEqual(parseImports('const u = import.meta.env.DEV; const important = 1;'), []);
});

test('multi-line, namespace, default and type-only forms are found', () => {
  const text = `import def, {
    a,
    b as c,
  } from './multi';
  import * as ns from './ns';
  import type Def from './type-default';
  export type { T } from './types';
  export * as all from './all';`;
  assert.deepEqual(
    parseImports(text).map((i) => i.specifier),
    ['./multi', './ns', './type-default', './types', './all'],
  );
});

test('comments are blanked and code lines are kept', () => {
  const text = 'const a = 1; // trailing\n/* block\n   block */\nconst s = "// kept";\n';
  const lines = withoutComments(text).split('\n');
  assert.equal(lines.length, 5);
  assert.equal(lines[0].trim(), 'const a = 1;');
  assert.equal(lines[1].trim(), '');
  assert.equal(lines[2].trim(), '');
  assert.equal(lines[3], 'const s = "// kept";');
  assert.equal(withoutComments(text).length, text.length);
});

test('a regex inside a template substitution does not lose the scanner its place (route-export.ts)', () => {
  const text = [
    'function csvField(value: string): string {',
    '  return /[",\\r\\n]/.test(value) ? `"${value.replace(/"/g, \'""\')}"` : value;',
    '}',
    "import { later } from './later';",
    "const x = import('./lazy');",
  ].join('\n');
  assert.deepEqual(parseImports(text), [
    { specifier: './later', isDynamic: false },
    { specifier: './lazy', isDynamic: true },
  ]);
});

test('code inside a template substitution is read: comments, nested templates, regexes and imports', () => {
  const text = [
    'const a = `${ /* } ` */ b }`;',
    'const c = `x ${`y ${z} // not a comment`} ${/`/.test(w)}`;',
    "const d = `${import('./inside')}`;",
    "import { after } from './after';",
  ].join('\n');
  assert.deepEqual(parseImports(text), [
    { specifier: './inside', isDynamic: true },
    { specifier: './after', isDynamic: false },
  ]);
});

test('a regex holding a backtick after => or a comparison does not open a template', () => {
  const text = "const f = (s) => /`/.test(s);\nimport { next } from './next';";
  assert.deepEqual(parseImports(text), [{ specifier: './next', isDynamic: false }]);
});

test('TSX: attributes in braces, text around braces and an apostrophe in text do not hide an import', () => {
  const cases = [
    "const a = <Foo a={b} />;\nimport { one } from './one';",
    "const a = <p>{a}/{b} text</p>;\nimport { two } from './two';",
    "const a = <p>Don't stop</p>;\nimport { three } from './three';",
    "const a = <p it's=\"x\">{`t ${u}`}</p>;\nimport { four } from './four';",
  ];
  for (const text of cases) {
    const found = parseImports(text).map((i) => i.specifier);
    assert.equal(found.length, 1, text);
    assert.match(found[0], /^\.\/(one|two|three|four)$/, text);
  }
});

test('rare import forms: a template specifier, a type import(), a method called import, a binding named from', () => {
  assert.deepEqual(parseImports('const m = import(`./tpl`);'), [
    { specifier: './tpl', isDynamic: true },
  ]);
  assert.deepEqual(parseImports("type M = import('./x').T;\ntype N = typeof import('./y');"), [
    { specifier: './x', isDynamic: false },
    { specifier: './y', isDynamic: false },
  ]);
  assert.deepEqual(parseImports("import('./z').then((m) => m.run());"), [
    { specifier: './z', isDynamic: true },
  ]);
  assert.deepEqual(parseImports("loader.import('y');"), []);
  assert.deepEqual(parseImports("import { from } from 'x';\nimport from from 'y';"), [
    { specifier: 'x', isDynamic: false },
    { specifier: 'y', isDynamic: false },
  ]);
});

test('exports: several declarators, modifiers, const enum, and nothing from inside a declared module', () => {
  const text = [
    'export const a = 1, b = [2, 3], c = { d: 4 };',
    'export declare function declared(): void;',
    'export abstract class Base {}',
    'export const enum Mode { A }',
    'export async function load() {}',
    "declare module 'x' { export const hidden: number; }",
    'export interface Shape {}',
    'export type Alias = string;',
  ].join('\n');
  assert.deepEqual(parseExports(text), [
    'a',
    'b',
    'c',
    'declared',
    'Base',
    'Mode',
    'load',
    'Shape',
    'Alias',
  ]);
});

test('a folder under src/ that is no known layer throws, so it cannot be dropped silently', () => {
  const src = mkdtempSync(join(tmpdir(), 'architecture-test-'));
  try {
    for (const name of ['app', 'features', 'shared', 'assets']) mkdirSync(join(src, name));
    assertKnownLayers(src);
    mkdirSync(join(src, 'pages'));
    assert.throws(() => assertKnownLayers(src), /src\/pages is not a layer/);
  } finally {
    rmSync(src, { recursive: true });
  }
});
