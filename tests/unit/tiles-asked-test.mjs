// The basemap tiles the public map asked for before the service worker took
// control of a first visit, asked for again once it has, so the worker keeps
// them (src/features/routes/map/tiles-asked.ts, src/features/published-map/pwa.ts's warmCaches).
// Since the map opens on its routes (Q1, 2026-10-04) every tile of the first
// screen comes before the worker takes over; pwa-test's "basemap-tiles holds
// tiles" found none kept on GitHub's runner (2026-10-06).
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/tiles-asked-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  TILES_KEPT,
  noteTile,
  takeTilesAsked,
  tileNotes,
} from '../../src/features/routes/map/tiles-asked.ts';

const tile = (z, x, y) =>
  `https://tiles.openfreemap.org/planet/20260927_080001_pt/${z}/${x}/${y}.pbf`;

test('notes only tiles, each once, in the order asked, and changes no request', () => {
  const n = tileNotes();
  // MapLibre keeps the URL as it was when the transform returns nothing
  // (request_manager.ts: `this._transformRequestFn(url, type) || {url}`).
  assert.equal(n.note(tile(11, 1711, 940), 'Tile'), undefined);
  assert.equal(n.note('https://tiles.openfreemap.org/styles/positron', 'Style'), undefined);
  assert.equal(n.note('https://tiles.openfreemap.org/planet', 'Source'), undefined);
  assert.equal(
    n.note('https://tiles.openfreemap.org/fonts/Noto%20Sans%20Regular/0-255.pbf', 'Glyphs'),
    undefined,
  );
  assert.equal(
    n.note('https://tiles.openfreemap.org/sprites/ofm_f384/ofm@2x.png', 'SpriteImage'),
    undefined,
  );
  n.note(tile(11, 1711, 939), 'Tile');
  n.note(tile(11, 1711, 940), 'Tile');
  n.note(tile(12, 3422, 1880));
  assert.deepEqual(n.take(), [tile(11, 1711, 940), tile(11, 1711, 939)]);
});

test('take hands the tiles over once, and stops the noting', () => {
  const n = tileNotes();
  n.note(tile(11, 1, 1), 'Tile');
  assert.deepEqual(n.take(), [tile(11, 1, 1)]);
  assert.deepEqual(n.take(), []);
  // From now on the page's own requests go through the worker.
  n.note(tile(11, 1, 2), 'Tile');
  assert.deepEqual(n.take(), []);
});

test('nothing asked yet: nothing to take, and nothing noted after', () => {
  const n = tileNotes();
  assert.deepEqual(n.take(), []);
  n.note(tile(11, 1, 1), 'Tile');
  assert.deepEqual(n.take(), []);
});

test(`keeps at most ${TILES_KEPT} tiles, the first asked`, () => {
  assert.ok(TILES_KEPT >= 16, 'a phone screen of tiles at two zooms fits');
  const n = tileNotes();
  for (let i = 0; i < TILES_KEPT + 10; i++) n.note(tile(14, 13700 + i, 7520), 'Tile');
  const took = n.take();
  assert.equal(took.length, TILES_KEPT);
  assert.equal(took[0], tile(14, 13700, 7520));
  assert.equal(took.at(-1), tile(14, 13700 + TILES_KEPT - 1, 7520));
  const few = tileNotes(2);
  for (let i = 0; i < 5; i++) few.note(tile(14, i, 0), 'Tile');
  assert.deepEqual(few.take(), [tile(14, 0, 0), tile(14, 1, 0)]);
});

test("the module's own notes are one page's: noteTile and takeTilesAsked share them", () => {
  noteTile(tile(13, 6850, 3760), 'Tile');
  noteTile(tile(13, 6850, 3760), 'Tile');
  assert.deepEqual(takeTilesAsked(), [tile(13, 6850, 3760)]);
  noteTile(tile(13, 6851, 3760), 'Tile');
  assert.deepEqual(takeTilesAsked(), []);
});

test('the public map notes its tiles, the studio none, and the worker asks for them again once in control', () => {
  const view = readFileSync(
    new URL('../../src/features/routes/map/map-view.tsx', import.meta.url),
    'utf8',
  );
  assert.match(view, /import \{ noteTile, tilesFirstScreenIn \} from '\.\/tiles-asked'/);
  // Only with `openOn`, which only the public map passes; otherwise the page's own transform, which
  // only the contributor app passes (its basemap cache), and the studio none.
  assert.match(view, /transformRequest: openOn \? noteTile : transformRequest,/);
  const studio = readFileSync(
    new URL('../../src/app/studio/workshop.tsx', import.meta.url),
    'utf8',
  );
  assert.match(studio, /<MapView\b/, 'the studio renders its MapView here');
  assert.doesNotMatch(studio, /openOn/);
  assert.doesNotMatch(studio, /transformRequest/);

  const pwa = readFileSync(
    new URL('../../src/features/published-map/pwa.ts', import.meta.url),
    'utf8',
  );
  const warm = pwa.slice(pwa.indexOf('async function warmCaches'));
  const control = warm.indexOf("addEventListener('controllerchange'");
  const take = warm.indexOf('...takeTilesAsked().map(quiet)');
  assert.ok(
    control > 0 && take > control,
    'the tiles are taken once the worker controls the page, with the map file and the style',
  );
  assert.match(
    pwa,
    /import \{ takeTilesAsked, takeTilesAskedLater \} from '@\/features\/routes\/map\/tiles-asked'/,
  );
});

// ------------------------------------------------- the worker in control before the first tile
// On a fast connection the worker claims the page before the map has asked for a tile. MapLibre
// asks for tiles from its own worker, started as the page is read (map-view.tsx, prewarm); when
// that one is still loading its script as the service worker claims the page, it is left outside
// for good and its tiles go out direct. Those asked after the take were then never kept: pwa-test
// has found "basemap-tiles holds tiles (0)  the first visit's tile requests: 200 direct ×4", with
// the map file and the style kept in the same run.

test('the worker in control before the first tile: the tiles the map then asks for are handed over once its first screen is in', () => {
  const n = tileNotes();
  const later = [];
  // warmCaches, as the worker takes control: nothing asked yet.
  n.later((tiles) => later.push(tiles));
  assert.deepEqual(n.take(), []);
  // The map asks for its first screen.
  n.note(tile(11, 1711, 940), 'Tile');
  n.note(tile(11, 1711, 939), 'Tile');
  n.note(tile(11, 1711, 940), 'Tile');
  assert.deepEqual(later, [], 'not before they have been answered: the first screen is not in');
  n.firstScreenIn();
  assert.deepEqual(later, [[tile(11, 1711, 940), tile(11, 1711, 939)]]);
  // Once, and the noting is over.
  n.note(tile(11, 1712, 940), 'Tile');
  n.firstScreenIn();
  assert.deepEqual(later, [[tile(11, 1711, 940), tile(11, 1711, 939)]]);
  assert.deepEqual(n.take(), []);
});

test('the worker in control partway through the first screen: the tiles before it are taken, the rest handed over after', () => {
  const n = tileNotes();
  const later = [];
  n.note(tile(11, 1, 1), 'Tile');
  n.later((tiles) => later.push(tiles));
  assert.deepEqual(n.take(), [tile(11, 1, 1)]);
  n.note(tile(11, 1, 1), 'Tile');
  n.note(tile(11, 1, 2), 'Tile');
  n.firstScreenIn();
  assert.deepEqual(later, [[tile(11, 1, 2)]], 'a tile already taken is not asked for a third time');
});

test('the first screen in before the worker takes control, as on a slow connection: all are taken, as before, and none after', () => {
  const n = tileNotes();
  const later = [];
  n.note(tile(11, 1, 1), 'Tile');
  n.firstScreenIn();
  // A pan before the worker takes control is still noted.
  n.note(tile(11, 1, 2), 'Tile');
  n.later((tiles) => later.push(tiles));
  assert.deepEqual(n.take(), [tile(11, 1, 1), tile(11, 1, 2)]);
  n.note(tile(11, 1, 3), 'Tile');
  assert.deepEqual(n.take(), []);
  assert.deepEqual(later, []);
});

test('no tile asked after the worker took control: nothing is handed over, and never more than the tiles kept', () => {
  const none = tileNotes();
  const later = [];
  none.later((tiles) => later.push(tiles));
  none.take();
  none.firstScreenIn();
  assert.deepEqual(later, [], 'an empty hand-over asks for nothing');

  const few = tileNotes(3);
  few.note(tile(14, 0, 0), 'Tile');
  few.later((tiles) => later.push(tiles));
  assert.deepEqual(few.take(), [tile(14, 0, 0)]);
  for (let i = 1; i < 6; i++) few.note(tile(14, i, 0), 'Tile');
  few.firstScreenIn();
  assert.deepEqual(later, [[tile(14, 1, 0), tile(14, 2, 0)]], 'three in all, before and after');
});

test('the page wires it: the map says when its first screen is in, and warmCaches sets its taker before it takes', () => {
  const view = readFileSync(
    new URL('../../src/features/routes/map/map-view.tsx', import.meta.url),
    'utf8',
  );
  // At the public map's 'load', when every tile of the first screen has been answered.
  const load = view.slice(view.indexOf("map.on('load'"));
  assert.match(load.slice(0, load.indexOf('});')), /if \(openOn\) tilesFirstScreenIn\(\);/);

  const pwa = readFileSync(
    new URL('../../src/features/published-map/pwa.ts', import.meta.url),
    'utf8',
  );
  const warm = pwa.slice(pwa.indexOf('async function warmCaches'));
  const control = warm.indexOf("addEventListener('controllerchange'");
  const later = warm.indexOf('takeTilesAskedLater(');
  const take = warm.indexOf('...takeTilesAsked().map(quiet)');
  assert.ok(
    control > 0 && later > control && take > later,
    'once the worker controls the page, the taker for later tiles is set, then the tiles so far are taken',
  );
  // In the same turn: no `await` between the two, so no tile falls between them.
  assert.doesNotMatch(warm.slice(later, take), /\bawait\b[^;]*;\s*\n/);
});
