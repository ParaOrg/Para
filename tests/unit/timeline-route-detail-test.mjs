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
  const html = render(10);
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
  assert.ok(r.every((x) => x.state === 'rest'));
  assert.ok(!html.includes('trip-hintuan-pick'), 'no row button');
  assert.ok(!html.includes('trip-hintuan-fare'), 'no pill');
  assert.match(html, /data-testid="trip-fold" aria-expanded="false"/);
  assert.match(html, />10 more hintuans</);
});

// The owner's TimelineRouteDetail of 2026-10-15 (Figma 4137:9886): once a
// start or an end is picked, the ride's own rows stay open and the rows
// outside it fold, before it and after it.
test('a picked end: the ride’s rows open, the rows after it folded into one row above the destination', () => {
  const html = render(10, { picked: 'h3' });
  const r = rows(html);
  assert.deepEqual(
    r.filter((x) => x.cls === SHOWN).map((x) => x.id),
    ['h0', 'h1', 'h2', 'h3'],
  );
  assert.ok(r.slice(4).every((x) => x.cls === FOLDED && x.inside === ''));
  assert.equal(r.find((x) => x.id === 'h3').state, 'selected');
  assert.match(html, /data-testid="trip-fold" aria-expanded="false" data-part="after"/);
  assert.match(html, />6 more hintuans</);
  assert.doesNotMatch(html, /data-part="before"/);
});

test('a start and an end: folds before and after, S and E on their rows, the origin’s S and the destination’s E gone', () => {
  const html = render(10, { start: 'h3', picked: 'h6', onSetStart() {}, onRemoveStart() {} });
  const r = rows(html);
  assert.deepEqual(
    r.filter((x) => x.cls === SHOWN).map((x) => x.id),
    ['h3', 'h4', 'h5', 'h6'],
  );
  assert.match(html, /data-part="before"[^>]*>.*?3 more hintuans/s);
  assert.match(html, /data-part="after"[^>]*>.*?3 more hintuans/s);
  const marks = [...html.matchAll(/data-part="(start|end)"/g)].map(([, m]) => m);
  assert.deepEqual(marks, ['start', 'end'], 'one S and one E, on the rows');
  // The start's row carries × Remove as start; the end's no Set as start, a start being picked.
  assert.match(html, />Remove as start</);
  assert.doesNotMatch(html, />Set as start</);
});

// The owner's answers of 2026-10-16: the start's pill is its own code alone
// ("Pill on start is only the codesign of that station, no price"), the
// end's its code and the ride's pesos ("the end should have both price and
// codesign"); the S and the E sit on white, a green disc and one in the
// card's colour; Set as start and × Remove as start are in the card's
// colours, not brand blue.
test('a start and an end: the start’s pill its code alone, the end’s its code and the ride’s pesos', () => {
  const html = render(10, {
    livery: 'metro-rail-way-three',
    start: 'h3',
    picked: 'h6',
    startCode: 'YL07',
    pickedCode: 'YL11',
    pickedPesos: '₱20',
  });
  const pill = (id) => rows(html).find((x) => x.id === id).inside;
  assert.match(pill('h3'), /data-testid="trip-hintuan-fare" data-part="code"[^>]*>YL07<\/span>/);
  assert.doesNotMatch(pill('h3'), /₱20/, 'no price on the start');
  assert.match(pill('h6'), /data-part="code"[^>]*>YL11<\/span> <span data-part="pesos"[^>]*>₱20</);
  // A jeep's: no code to say on the start, so no pill; the pesos alone on the end.
  const jeep = render(10, { start: 'h3', picked: 'h6', pickedPesos: '₱13' });
  const pills = [...jeep.matchAll(/data-testid="trip-hintuan-fare"[^>]*>([^<]*)</g)].map(
    ([, p]) => p,
  );
  assert.deepEqual(pills, ['₱13']);
  // An end of the trip picked as the ride's end, with a start: its pill too.
  const toDestination = render(10, {
    livery: 'metro-rail-way-three',
    start: 'h3',
    startCode: 'YL07',
    endPicked: 'to',
    pickedCode: 'YL13',
    pickedPesos: '₱24',
  });
  const destination = /<li data-testid="trip-destination".*?<\/li>/s.exec(toDestination)?.[0] ?? '';
  assert.match(destination, /data-part="code"[^>]*>YL13<\/span> <span data-part="pesos"[^>]*>₱24</);
  const toOrigin = render(10, {
    livery: 'metro-rail-way-three',
    start: 'h3',
    startCode: 'YL07',
    endPicked: 'from',
    pickedCode: 'YL01',
    pickedPesos: '₱13',
  });
  const origin = /<li data-testid="trip-origin".*?<\/li>/s.exec(toOrigin)?.[0] ?? '';
  assert.match(origin, /data-part="code"[^>]*>YL01<\/span> <span data-part="pesos"[^>]*>₱13</);
});

test('the S on white with a green disc, the E on white in the card’s colour, the buttons in the card’s', () => {
  const html = render(10, { start: 'h3', picked: 'h6', onRemoveStart() {} });
  const mark = (part) => new RegExp(`data-part="${part}" class="([^"]*)"`).exec(html)?.[1] ?? '';
  assert.match(mark('start'), /\bbg-content-inverse\b/);
  assert.match(mark('start'), /\btext-map-hotspots-card-hintuan-surface\b/);
  assert.match(mark('end'), /\bbg-content-inverse\b/);
  assert.match(mark('end'), /\btext-card-violet-surface\b/);
  const button = /<button[^>]*class="([^"]*)"[^>]*>(?:(?!<\/button>).)*Remove as start/s.exec(
    html,
  )?.[1];
  assert.match(button, /\bbg-card-violet-surface\b/);
  assert.match(button, /\benabled:active:bg-card-violet-timeline-surface\b/);
  assert.doesNotMatch(button, /\bbg-brand-surface\b/);
  // Set as start, under an end alone, wears them too.
  const choosing = render(5, { picked: 'h2', onSetStart() {} });
  const set = /<button[^>]*class="([^"]*)"[^>]*>(?:(?!<\/button>).)*Set as start/s.exec(
    choosing,
  )?.[1];
  assert.match(set, /\bbg-card-violet-surface\b/);
});

test('an end alone carries Set as start; with no start the origin keeps its S', () => {
  const html = render(5, { picked: 'h2', onSetStart() {}, onRemoveStart() {} });
  assert.match(html, />Set as start</);
  const marks = [...html.matchAll(/data-part="(start|end)"/g)].map(([, m]) => m);
  assert.deepEqual(marks, ['start', 'end']);
});

// The owner's Variant3 of 2026-10-16 (4148:12161): a start alone is no ride
// yet. Its dot stands alone, the rail broken just above it and just below
// and running on along the rows above it; the fold of the rows after it,
// closed, sits next to it with no rail (his "when close it should
// disconnect the disclosure", 4194:12562), the destination's dot alone. The
// destination has no E, and its pill holds its code alone.
test('a start alone (Variant3): its dot alone, the rail above it, its closed fold and the destination without, no E, its code alone', () => {
  const html = render(10, {
    livery: 'metro-rail-way-three',
    start: 'h3',
    startCode: 'YL07',
    pickedPesos: '₱10',
    onRemoveStart() {},
  });
  const r = rows(html);
  // Folded as Choosing folded the end on its row a moment before: the rows
  // above it open, the rows after it in a fold above the destination.
  assert.deepEqual(
    r.filter((x) => x.cls === SHOWN).map((x) => x.id),
    ['h0', 'h1', 'h2', 'h3'],
  );
  assert.match(html, /data-testid="trip-fold"/);
  const pieces = [...html.matchAll(/data-rail="([a-z]+)"/g)].map(([, p]) => p);
  // The origin, h0 to h2 (h2 the rail's end above S), S alone, its button's
  // stick, the closed fold of h4 to h9 by it and the destination, no rail.
  assert.deepEqual(pieces, [
    'below',
    'through',
    'through',
    'above',
    'disconnected',
    'disconnected',
    'disconnected',
    'disconnected',
  ]);
  const marks = [...html.matchAll(/data-part="(start|end)"/g)].map(([, m]) => m);
  assert.deepEqual(marks, ['start'], 'the S on its row, no E anywhere');
  const s = r.find((x) => x.id === 'h3').inside;
  assert.match(s, /data-testid="trip-hintuan-fare" data-part="code"[^>]*>YL07<\/span>/);
  assert.doesNotMatch(s, /₱10/, 'no pesos: no ride to price yet');
});

test('a start alone on the first hintuan stands apart from the origin, on the last from the destination', () => {
  const pieces = (html) => [...html.matchAll(/data-rail="([a-z]+)"/g)].map(([, p]) => p);
  const first = render(10, { start: 'h0', onRemoveStart() {} });
  // The origin, S alone, its button's stick, the closed fold of h1 to h9 by
  // it, the destination: every dot alone.
  assert.deepEqual(pieces(first), Array(5).fill('disconnected'));
  const last = render(10, { start: 'h9', onRemoveStart() {} });
  // Nothing after it to fold: the origin, h0 to h8, S alone, its stick, the destination.
  assert.deepEqual(pieces(last), [
    'below',
    ...Array(8).fill('through'),
    'above',
    'disconnected',
    'disconnected',
    'disconnected',
  ]);
  assert.doesNotMatch(last, /data-testid="trip-fold"/);
});

test('a jeep’s start has no pill; a train’s ride with no fare has its start’s code alone, no pill on its end', () => {
  const jeep = render(10, { start: 'h3', pickedPesos: '₱13', onRemoveStart() {} });
  assert.doesNotMatch(jeep, /trip-hintuan-fare/, 'a jeep’s S: no code, no ride to price');
  const unpriced = render(10, {
    livery: 'metro-rail-way-three',
    start: 'h3',
    startCode: 'YL07',
    picked: 'h6',
    pickedCode: 'YL10',
  });
  const pills = [...unpriced.matchAll(/data-testid="trip-hintuan-fare"[^>]*>([^<]*)</g)].map(
    ([, p]) => p,
  );
  assert.deepEqual(pills, ['YL07'], 'the start’s code; nothing to price on the end');
});

// The owner, 2026-10-16: "can you still connect those dots, since it might
// see the users as broken" (his Variant5, 4151:13619): the rail runs along
// the rows outside the ride too, broken just above the ride and just below.
// A fold's row by the ride has none (his "when close it should disconnect
// the disclosure", 4194:12702): both folds closed, the origin and the
// destination are their dots alone.
test('a start and an end, both folds closed: the rail along the ride alone, the folds and the ends beyond them without', () => {
  const html = render(10, { start: 'h3', picked: 'h6', onRemoveStart() {} });
  const pieces = [...html.matchAll(/data-rail="([a-z]+)"/g)].map(([, p]) => p);
  // The origin alone, the closed fold of the three before the ride (folded,
  // they draw nothing yet), S (rail below) and the rail on beside its
  // × Remove as start, two through, E (rail above), the closed fold of the
  // three after it, and the destination alone.
  assert.deepEqual(pieces, [
    'disconnected',
    'disconnected',
    'below',
    'connected',
    'through',
    'through',
    'above',
    'disconnected',
    'disconnected',
  ]);
});

// 4194:12562: an end alone, the rows after it folded: the "N more" row has
// no rail beside it, and the destination's dot stands alone.
test('an end alone, its fold closed (4194:12562): the rail stops at the E, the fold and the destination without', () => {
  const html = render(10, { picked: 'h6', onSetStart() {} });
  const pieces = [...html.matchAll(/data-rail="([a-z]+)"/g)].map(([, p]) => p);
  // The origin, h0 to h5, E (rail above) and no rail beside Set as start,
  // the closed fold, the destination alone.
  assert.deepEqual(pieces, [
    'below',
    ...Array(6).fill('through'),
    'above',
    'disconnected',
    'disconnected',
    'disconnected',
  ]);
});

test('an end above the start (Variant5): the open rows run from the E down to the S, the rail broken just above the E and just below the S', () => {
  const html = render(10, { start: 'h6', picked: 'h2', onRemoveStart() {} });
  const r = rows(html);
  assert.deepEqual(
    r.filter((x) => x.cls === SHOWN).map((x) => x.id),
    ['h2', 'h3', 'h4', 'h5', 'h6'],
  );
  const pieces = [...html.matchAll(/data-rail="([a-z]+)"/g)].map(([, p]) => p);
  // The origin alone and the closed fold of the two rows before the ride,
  // no rail; E (rail below), three through, S (rail above) and no rail
  // beside its × Remove as start; the closed fold of the three after it and
  // the destination alone.
  assert.deepEqual(pieces, [
    'disconnected',
    'disconnected',
    'below',
    'through',
    'through',
    'through',
    'above',
    'disconnected',
    'disconnected',
    'disconnected',
  ]);
  const marks = [...html.matchAll(/data-part="(start|end)"/g)].map(([, m]) => m);
  assert.deepEqual(marks, ['end', 'start']);
});

// The owner, 2026-10-16: "keep the start": an end row tapped with a start
// is the ride's end, the start kept.
test('the destination picked with the start kept: its E, the ride from the S to it, the rows above folded', () => {
  const html = render(10, { start: 'h4', endPicked: 'to', onRemoveStart() {} });
  const pieces = [...html.matchAll(/data-rail="([a-z]+)"/g)].map(([, p]) => p);
  // The origin alone and the closed fold of the four above the ride, no
  // rail; S (rail below) and beside its × Remove as start, five through,
  // the destination.
  assert.deepEqual(pieces, [
    'disconnected',
    'disconnected',
    'below',
    'connected',
    'through',
    'through',
    'through',
    'through',
    'through',
    'above',
  ]);
  const marks = [...html.matchAll(/data-part="(start|end)"/g)].map(([, m]) => m);
  assert.deepEqual(marks, ['start', 'end'], 'the S on its row, the E on the destination');
  assert.match(html, /data-testid="trip-destination" data-state="selected"/);
  const origin = /<li data-testid="trip-origin".*?<\/li>/s.exec(html)?.[0] ?? '';
  assert.doesNotMatch(origin, /data-part="(start|end)"/, 'no S or E on the origin');
});

test('the origin picked with the start kept: its E, the ride back from the S to it, the rows after folded', () => {
  const html = render(10, { start: 'h4', endPicked: 'from', onRemoveStart() {} });
  const pieces = [...html.matchAll(/data-rail="([a-z]+)"/g)].map(([, p]) => p);
  // The origin, four through, S (rail above) and no rail beside its
  // × Remove as start, the closed fold of the five after it and the
  // destination alone.
  assert.deepEqual(pieces, [
    'below',
    'through',
    'through',
    'through',
    'through',
    'above',
    'disconnected',
    'disconnected',
    'disconnected',
  ]);
  const marks = [...html.matchAll(/data-part="(start|end)"/g)].map(([, m]) => m);
  assert.deepEqual(marks, ['end', 'start'], 'the E on the origin, the S below it');
  assert.match(html, /data-testid="trip-origin" data-state="selected"/);
});

test('the end rows say start or end to a screen reader, after the name, wherever the circled letter shows', () => {
  const sr = (html, id, name) => {
    const row = new RegExp(`<li data-testid="${id}".*?</li>`, 's').exec(html)?.[0] ?? '';
    return {
      mark: [...row.matchAll(/data-part="(start|end)"/g)].map(([, m]) => m),
      said: [...row.matchAll(/<span class="sr-only">([^<]*)<\/span>/g)].map(([, t]) => t),
      // The words follow this row's own name, which carries data-part="name".
      afterName: new RegExp(`data-part="name"[^>]*>${name}</span><span class="sr-only">`).test(row),
    };
  };
  const origin = (html) => sr(html, 'trip-origin', 'Tala');
  const destination = (html) => sr(html, 'trip-destination', 'Novaliches');
  // Nothing picked: the S on the origin, the E on the destination.
  const fresh = render(3);
  assert.deepEqual(origin(fresh).said, [', start']);
  assert.deepEqual(destination(fresh).said, [', end']);
  assert.ok(origin(fresh).afterName && destination(fresh).afterName);
  // A start kept and the origin picked as the end: the E moves to the origin.
  const back = render(3, { start: 'h1', endPicked: 'from', onRemoveStart() {} });
  assert.deepEqual(origin(back).said, [', end']);
  assert.deepEqual(destination(back).said, []);
  assert.ok(origin(back).afterName);
  // A start kept and nothing else: neither end row draws a letter.
  const startAlone = render(3, { start: 'h1', onRemoveStart() {} });
  assert.deepEqual(origin(startAlone).said, []);
  assert.deepEqual(destination(startAlone).said, []);
  // A start kept and the destination picked as the end: its E shows.
  const toEnd = render(3, { start: 'h1', endPicked: 'to', onRemoveStart() {} });
  assert.deepEqual(origin(toEnd).said, []);
  assert.deepEqual(destination(toEnd).said, [', end']);
  assert.ok(destination(toEnd).afterName);
  // Every circled letter on an end row comes with its words, and none without.
  const states = [
    fresh,
    back,
    startAlone,
    toEnd,
    render(3, { start: 'h1', picked: 'h2', onRemoveStart() {} }),
  ];
  for (const html of states) {
    for (const row of [origin(html), destination(html)]) {
      assert.equal(row.said.length, row.mark.length, 'one spoken mark for each circled letter');
    }
  }
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
// the pill: the station's code before the pesos, on a train only. Since
// 2026-10-15 they are two halves (RouteTripLineDetailPill's Two), the dot gone.
test("a train's picked station: its code, then the pesos, two halves of the pill", () => {
  const html = render(1, {
    livery: 'metro-rail-way-three',
    picked: 'h0',
    pickedPesos: '₱20',
    pickedCode: 'YL06',
  });
  const [row] = rows(html);
  assert.match(
    row.inside,
    /data-testid="trip-hintuan-fare"[^>]*><span data-part="code"[^>]*>YL06<\/span> <span data-part="pesos"[^>]*>₱20<\/span><\/span>/,
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
