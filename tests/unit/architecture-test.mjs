// The architecture page's two pure steps (scripts/docs/architecture.mjs): which unit
// a path belongs to, and which modules a file imports, on inline examples.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/architecture-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseCssImports,
  parseExports,
  parseImports,
  resolveImport,
  unitOf,
} from '../../scripts/docs/architecture.mjs';

/** routes and studio have concern folders; locator and published-map are one unit each. */
const GROUPED = new Map([
  ['routes', new Set(['model', 'geo', 'map', 'cards'])],
  ['studio', new Set(['auth', 'data', 'drawing', 'panels'])],
]);

test('a path maps to the unit of its folder', () => {
  const cases = {
    'app/public-map/main.tsx': 'app/public-map',
    'app/studio/studio-app.tsx': 'app/studio',
    'features/locator/use-locator.ts': 'features/locator',
    'features/published-map/api/fetch-index.ts': 'features/published-map',
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
  assert.deepEqual(parseImports(text, 'x.tsx'), [{ specifier: './a', isDynamic: false }]);
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
