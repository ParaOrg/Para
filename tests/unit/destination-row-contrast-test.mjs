// On the sheet's surface a destination row's arrow wears its mode's card fill only where that fill
// stands out from the surface at 3:1, the WCAG minimum for a non-text mark; elsewhere it takes
// Text/primary (SURFACE_ARROW, src/features/routes/cards/route-card-look.ts). The colours are read
// from tokens.css and Tailwind's theme, so a changed token re-decides it here.
//
//   node --test tests/unit/destination-row-contrast-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const tokens = read('../../src/design-system/foundation/tokens.css');
const tailwind = read('../../node_modules/tailwindcss/theme.css');
const row = read('../../src/features/routes/cards/route-card-look.ts');

const find = (css, name) => css.match(new RegExp(`--${name}:\\s*([^;]+);`))?.[1].trim();

/** A token's colour, following var() aliases down to a hex value. */
function hexOf(name) {
  let value = find(tokens, name) ?? find(tailwind, name);
  while (value?.startsWith('var(--')) {
    const next = value.slice(6, -1);
    value = find(tokens, next) ?? find(tailwind, next);
  }
  assert.match(value ?? '', /^#[0-9a-f]{3}([0-9a-f]{3})?$/i, `--${name} resolves to a hex colour`);
  return value.length === 4 ? '#' + [...value.slice(1)].map((d) => d + d).join('') : value;
}

/** Relative luminance and contrast ratio, as WCAG 2 defines them. */
const luminance = (hex) => {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

/** Each livery's card fill among the new semantics; E-jeep has none. */
const CARD_FILL = {
  jeep: 'card-jeep-fill',
  'uv-express': 'card-uv-express-fill',
  ejeep: null,
  bus: 'card-bus-fill',
  'light-rail-way-one': 'card-lrt-one-fill',
  'light-rail-way-two': 'card-lrt-two-fill',
  'metro-rail-way-three': 'card-mrt-three-fill',
  ferry: 'card-ferry-fill',
};

const map = row.match(/const SURFACE_ARROW = \{([\s\S]*?)\} satisfies/)?.[1] ?? '';
const arrow = Object.fromEntries(
  [...map.matchAll(/'?([\w-]+)'?: '([^']+)'/g)].map((m) => [m[1], m[2]]),
);
const surface = hexOf('bg-surface');

test('every livery has an arrow on the surface', () => {
  assert.deepEqual(Object.keys(arrow).sort(), Object.keys(CARD_FILL).sort());
});

test("the arrow wears the mode's fill exactly where it reaches 3:1, else Text/primary", () => {
  for (const [livery, fill] of Object.entries(CARD_FILL)) {
    const ratio = fill ? contrast(hexOf(fill), surface) : 0;
    const expected = ratio >= 3 ? `text-${fill}` : 'text-text-primary';
    assert.equal(
      arrow[livery],
      expected,
      `${livery}: ${fill ?? 'no fill'} at ${ratio.toFixed(2)}:1`,
    );
  }
});

test('the fallback itself stands out from the surface', () => {
  assert.ok(contrast(hexOf('text-primary'), surface) >= 3);
});
