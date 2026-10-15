// A trip card's timeline as it first renders (src/features/routes/cards/timeline-route-detail.tsx):
// folded rows are their bare <li>s until the fold is first opened (the
// cheap-phone plan, step 11, 2026-10-04) — each with its data, its classes
// and its 0fr row, so it folds, hides and first opens as it did — and one
// hidden name asks for the face their names are set in, as the hidden rows
// did. A lone hintuan is drawn as it is. Rendered to HTML by React's own
// server renderer, the component read through Vite (it is TSX, which Node
// cannot strip). What happens as the fold opens and folds again — every row
// drawn from then on — is phone-test's (a trip card's fold).
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
      livery: 'violet',
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

/** Every hintuan row: its opening tag's attributes and what it holds. */
const rows = (html) =>
  [...html.matchAll(/<li data-testid="trip-hintuan"([^>]*)>(.*?)<\/li>/g)].map(
    ([, attrs, inside]) => ({
      id: /data-hintuan="([^"]*)"/.exec(attrs)?.[1],
      state: /data-state="([^"]*)"/.exec(attrs)?.[1],
      cls: /class="([^"]*)"/.exec(attrs)?.[1],
      inside,
    }),
  );

/** The hidden name that asks for the rows' face: its class and its words. */
const askers = (html) =>
  [
    ...html.matchAll(
      /<span aria-hidden="true" class="([^"]*\binvisible absolute\b[^"]*)">([^<]*)<\/span>/g,
    ),
  ].map(([, cls, text]) => ({ cls, text }));

const FOLDED =
  'grid transition-[grid-template-rows,visibility] motion-reduce:transition-none invisible grid-rows-[0fr] duration-base ease-exit';
const SHOWN =
  'grid transition-[grid-template-rows,visibility] motion-reduce:transition-none visible grid-rows-[1fr] duration-gentle ease-enter';

test('folded and never opened, every row is its bare <li>: its data and its fold classes, nothing inside', () => {
  const html = render(10, { picked: 'h3' });
  const r = rows(html);
  assert.equal(r.length, 10);
  assert.deepEqual(
    r.map((x) => x.id),
    Array.from({ length: 10 }, (_, i) => `h${i}`),
  );
  assert.ok(
    r.every((x) => x.cls === FOLDED),
    'folded: invisible, a 0fr row, the fold-away motion',
  );
  assert.ok(
    r.every((x) => x.inside === ''),
    'no inside drawn',
  );
  // Folded away, a picked row stays picked (the owner's default).
  assert.deepEqual(
    r.map((x) => x.state),
    r.map((x) => (x.id === 'h3' ? 'selected' : 'rest')),
  );
  assert.ok(!html.includes('trip-hintuan-pick'), 'no row button');
  assert.ok(!html.includes('trip-hintuan-fare'), 'no pill');
  assert.match(html, /data-testid="trip-fold" aria-expanded="false"/);
  assert.match(html, />10 more hintuans</);
});

test('a train’s fold reads stations, a jeep’s hintuans (the owner, 2026-10-15)', () => {
  assert.match(render(7, { isTrain: true }), />7 more stations</);
  assert.match(render(7), />7 more hintuans</);
});

test("a hidden name asks for the rows' face as the card opens, in the weight a drawn row's name has", () => {
  const ask = askers(render(10));
  assert.equal(ask.length, 1, 'one, for every row');
  assert.equal(ask[0].text, 'Hintuan 0');
  assert.match(ask[0].cls, /\bpointer-events-none\b/);
  // A drawn row's name (a lone hintuan's), not picked: the same weight.
  const name = /<span class="min-w-0 flex-1 text-base\/6 ([^"]*)">Hintuan 0<\/span>/.exec(
    render(1),
  );
  assert.ok(name, "a lone hintuan's row draws its name");
  const weight = (cls) =>
    cls
      .split(' ')
      .find((c) =>
        /^font-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)$/.test(c),
      );
  assert.equal(weight(ask[0].cls), weight(name[1]));
});

test('a lone hintuan is drawn as it is: shown, its button, nothing to fold and nothing hidden to ask', () => {
  const html = render(1, { picked: 'h0', pickedPesos: '₱13' });
  const [row] = rows(html);
  assert.equal(row.cls, SHOWN);
  assert.match(row.inside, /data-testid="trip-hintuan-pick" aria-pressed="true"/);
  assert.match(row.inside, /data-testid="trip-hintuan-fare"[^>]*>₱13</);
  assert.ok(!html.includes('trip-fold'));
  assert.equal(askers(html).length, 0);
});

// The owner's answer of 2026-10-13 to the "YL06" his train frames draw in
// the pill: the station's code before the pesos, on a train only.
test("a train's picked station: its code, then the pesos, in the one pill", () => {
  const html = render(1, {
    livery: 'metro-rail-way-three',
    picked: 'h0',
    pickedPesos: '₱20',
    pickedCode: 'YL06',
  });
  const [row] = rows(html);
  assert.match(
    row.inside,
    /data-testid="trip-hintuan-fare"[^>]*><span data-part="code">YL06<\/span> <span aria-hidden="true">·<\/span> <span data-part="pesos">₱20<\/span><\/span>/,
  );
  // A station the table does not know: the pesos alone, as a jeepney's.
  const alone = rows(render(1, { picked: 'h0', pickedPesos: '₱20', pickedCode: null }))[0];
  assert.match(alone.inside, /data-testid="trip-hintuan-fare"[^>]*>₱20<\/span>/);
  assert.ok(!alone.inside.includes('data-part="code"'));
});

test('no hintuans: no rows, no fold, nothing hidden', () => {
  const html = render(0);
  assert.equal(rows(html).length, 0);
  assert.ok(!html.includes('trip-fold'));
  assert.equal(askers(html).length, 0);
});
