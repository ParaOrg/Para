// The route icons' sprite (src/shared/ui/route-icons.svg) and the boxes route-icons.tsx draws
// them in: every symbol has its box in ROUTE_SPRITE_VIEW_BOX, the same box, and nothing more.
//
//   node --test tests/unit/route-icons-sprite-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const svg = readFileSync(new URL('../../src/shared/ui/route-icons.svg', import.meta.url), 'utf8');
const tsx = readFileSync(new URL('../../src/shared/ui/route-icons.tsx', import.meta.url), 'utf8');

const symbols = Object.fromEntries(
  [...svg.matchAll(/<symbol id="([^"]+)" viewBox="([^"]+)"/g)].map((m) => [m[1], m[2]]),
);
const map = tsx.match(/const ROUTE_SPRITE_VIEW_BOX = \{([\s\S]*?)\} as const;/)?.[1] ?? '';
const boxes = Object.fromEntries(
  [...map.matchAll(/'?([\w-]+)'?: '([^']+)'/g)].map((m) => [m[1], m[2]]),
);

test('every symbol in the sprite is drawn in its own box, and none is missing', () => {
  assert.ok(Object.keys(symbols).length > 0, 'the sprite has symbols');
  assert.deepEqual(boxes, symbols);
});
