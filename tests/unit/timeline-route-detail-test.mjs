// A trip's stops as they first render (src/features/routes/cards/timeline-route-detail.tsx), Figma's
// RouteStopsCard (4681:29138) and its RouteStopsTimeline rows (4611:10957): every stop drawn, the
// card cut at 120 and the stops under the cut out of a keyboard's reach until "View more"; a pick
// opens it (T2). Rendered to HTML by React's own server renderer, the component read
// through Vite (it is TSX, which Node cannot strip). What a tap on View more does is phone-test's.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/timeline-route-detail-test.mjs
import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

const vite = await createServer({
  configFile: false,
  root: fileURLToPath(new URL('../..', import.meta.url)),
  // configFile: false leaves vite.config.ts unread, so the `@/` alias is given here.
  resolve: { alias: { '@': fileURLToPath(new URL('../../src', import.meta.url)) } },
  logLevel: 'silent',
  appType: 'custom',
  server: { middlewareMode: true, hmr: false, watch: null, ws: false },
  optimizeDeps: { noDiscovery: true, include: [] },
});
after(() => vite.close());
const { TimelineRouteDetail } = await vite.ssrLoadModule(
  '/src/features/routes/cards/timeline-route-detail.tsx',
);

/** The timeline of a trip with `n` hintuans, h0 … h(n-1), as it first renders. */
const render = (n, props = {}) =>
  renderToStaticMarkup(
    createElement(TimelineRouteDetail, {
      livery: 'bus',
      routeOrigin: 'Tala',
      hintuans: Array.from({ length: n }, (_, i) => ({ id: `h${i}`, label: `Hintuan ${i}` })),
      picked: null,
      onPick() {},
      onEnd() {},
      endPicked: null,
      routeDirection: 'Novaliches',
      ...props,
    }),
  );

/** Every row, origin first: its test id, whether it is inert, its rail, and its S or E. */
const rows = (html) =>
  [
    ...html.matchAll(
      /<li data-testid="(trip-origin|trip-hintuan|trip-destination)"([^>]*)>(.*?)<\/li>/g,
    ),
  ].map(([, kind, attrs, inside]) => ({
    kind,
    id: /data-hintuan="([^"]*)"/.exec(attrs)?.[1],
    isInert: /\binert=""/.test(attrs),
    rail: /data-rail="([^"]*)"/.exec(inside)?.[1],
    sign: /data-part="(start|end)"/.exec(inside)?.[1] ?? null,
    inside,
  }));
const rails = (html) => rows(html).map((r) => r.rail);
const signs = (html) => rows(html).map((r) => r.sign);

test('it opens folded: every stop drawn, the card cut at 120, the stops under the cut inert', () => {
  const html = render(4);
  const all = rows(html);
  assert.equal(all.length, 6);
  assert.deepEqual(
    all.map((r) => r.isInert),
    [false, false, true, true, true, true],
  );
  assert.match(html, /max-h-30/);
  assert.match(html, /aria-expanded="false"[^>]*>View more/);
});

test('no hintuans: nothing folds, no View more', () => {
  const html = render(0);
  assert.doesNotMatch(html, /View more|View less|max-h-30/);
  assert.ok(rows(html).every((r) => !r.isInert));
});

test('nothing picked: every stop on the rail, S on the origin, E on the destination', () => {
  const html = render(3);
  assert.deepEqual(rails(html), ['below', 'through', 'through', 'through', 'above']);
  assert.deepEqual(signs(html), ['start', null, null, null, 'end']);
});

test('a picked end opens the stops; the ride from the origin to it, the rest standing alone', () => {
  const html = render(4, { picked: 'h1', pickedPesos: '₱13', onSetStart() {} });
  assert.match(html, /aria-expanded="true"[^>]*>View less/);
  assert.ok(rows(html).every((r) => !r.isInert));
  assert.deepEqual(rails(html), [
    'below',
    'through',
    'above',
    'disconnected',
    'disconnected',
    'disconnected',
  ]);
  assert.deepEqual(signs(html), ['start', null, 'end', null, null, null]);
  assert.match(rows(html)[2].inside, /Set as start/);
});

test('a start and an end: S and E on their rows, the ride between on the rail', () => {
  const html = render(4, { start: 'h0', picked: 'h2', pickedPesos: '₱13', onRemoveStart() {} });
  assert.deepEqual(rails(html), [
    'disconnected',
    'below',
    'through',
    'above',
    'disconnected',
    'disconnected',
  ]);
  assert.deepEqual(signs(html), [null, 'start', null, 'end', null, null]);
  assert.match(rows(html)[1].inside, /Remove as start/);
});

test('a start alone is no ride yet: every stop alone, its S, no E', () => {
  const html = render(4, { start: 'h2', onRemoveStart() {} });
  assert.ok(rails(html).every((r) => r === 'disconnected'));
  assert.deepEqual(signs(html), [null, null, null, 'start', null, null]);
});

test('the destination picked with the start kept: its E, the ride from the S down to it', () => {
  const html = render(3, { start: 'h1', endPicked: 'to', pickedPesos: '₱20' });
  assert.deepEqual(rails(html), ['disconnected', 'disconnected', 'below', 'through', 'above']);
  assert.deepEqual(signs(html), [null, null, 'start', null, 'end']);
});

test('a train: its ends carry their station codes; a picked station its code and pesos', () => {
  const html = render(3, {
    livery: 'metro-rail-way-three',
    originCode: 'YL01',
    destinationCode: 'YL13',
  });
  assert.match(rows(html)[0].inside, />YL01</);
  assert.match(rows(html).at(-1).inside, />YL13</);
  const picked = render(3, {
    livery: 'metro-rail-way-three',
    picked: 'h1',
    pickedCode: 'YL06',
    pickedPesos: '₱20',
  });
  assert.match(rows(picked)[2].inside, /YL06/);
  assert.match(rows(picked)[2].inside, /₱20/);
});

test('a sign is for the eye: its row says start or end after the name', () => {
  const html = render(2);
  assert.match(rows(html)[0].inside, /Tala<\/span><span class="sr-only">, start<\/span>/);
  assert.match(rows(html).at(-1).inside, /Novaliches<\/span><span class="sr-only">, end<\/span>/);
});
