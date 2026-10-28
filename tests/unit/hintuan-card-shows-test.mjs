// What a hotspot's HintuanCard shows (src/features/routes/model/hintuan-card-shows.ts):
// the routes of the Selected box or of the whole place, which way round, and
// where SWITCH takes the selection.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/hintuan-card-shows-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hintuanCardShows } from '../../src/features/routes/model/hintuan-card-shows.ts';

const LINE = {
  type: 'LineString',
  coordinates: [
    [121, 14],
    [121.01, 14.01],
  ],
};

/** A drawn direction from `from` to `to`, `reversed` for the way back. */
const direction = (id, from, to, reversed, { isLoop = false, drawn = true } = {}) => ({
  id,
  routeId: `route-${id}`,
  name: `${from} → ${to}`,
  reversed,
  shape: drawn ? LINE : { type: 'LineString', coordinates: [] },
  route: { name: `${from} – ${to}`, mode: 'jeepney', isLoop },
});

/** A hintuan box of the place `informal`, at [lng, 14.7]. */
const box = (id, informal, lng) => ({
  id,
  kind: 'hintuan',
  name: `${informal} ${id}`,
  informal,
  aliases: [],
  point: { type: 'Point', coordinates: [lng, 14.7] },
  createdAt: `2026-10-0${id.length}T00:00:00Z`,
});

const LAGRO_1 = box('l1', 'Lagro', 121.0);
const LAGRO_2 = box('l22', 'Lagro', 121.0005);
const FAR_LAGRO = box('l333', 'Lagro', 121.01);
const HOTSPOTS = [LAGRO_1, LAGRO_2, FAR_LAGRO];

const THERE = direction('there', 'Tala', 'SM Fairview', false);
const BACK = direction('back', 'SM Fairview', 'Tala', true);
const NOVA = direction('nova', 'Tala', 'Novaliches', false);

const shows = (links, opts = {}) =>
  hintuanCardShows({
    hotspot: LAGRO_1,
    hotspots: HOTSPOTS,
    linkedDirectionIds: (id) => links[id] ?? [],
    directions: [THERE, BACK, NOVA],
    deselected: false,
    flipped: false,
    ...opts,
  });

test('a box passed both ways shows the way there, and the way back once flipped', () => {
  const links = { l1: ['there', 'back', 'nova'] };
  const there = shows(links);
  assert.equal(there.back, false);
  assert.deepEqual(there.shown, ['there', 'nova']);
  assert.equal(there.heads, 1, 'one RouteCard: both leave from Tala');
  assert.equal(there.switchTo, LAGRO_1, 'SWITCH turns them round here');

  const back = shows(links, { flipped: true });
  assert.equal(back.back, true);
  assert.deepEqual(back.shown, ['back']);
  assert.equal(back.switchTo, LAGRO_1);
});

test('a box passed one way shows that way, whatever was asked', () => {
  const links = { l1: ['back'] };
  for (const flipped of [false, true]) {
    const s = shows(links, { flipped });
    assert.equal(s.back, true);
    assert.deepEqual(s.shown, ['back']);
  }
});

test('passed one way here, SWITCH goes to the nearest box of the place passed the other way', () => {
  const s = shows({ l1: ['there'], l22: ['back'], l333: ['back'] });
  assert.equal(s.back, false);
  assert.equal(s.switchTo, LAGRO_2);
});

test('with no box passed the other way, SWITCH is disabled', () => {
  const s = shows({ l1: ['there', 'nova'] });
  assert.deepEqual(s.shown, ['there', 'nova']);
  assert.equal(s.switchTo, null);
});

test('no row Selected: the routes of every box of the place, each once, and no SWITCH to another box', () => {
  const s = shows({ l1: ['there'], l22: ['there', 'nova'] }, { deselected: true });
  assert.deepEqual(
    s.routes.map((v) => v.id),
    ['there', 'nova'],
  );
  assert.deepEqual(s.shown, ['there', 'nova']);
  assert.equal(s.switchTo, null);
});

test('the rows are every box of the place', () => {
  assert.deepEqual(
    shows({}).rows.map((r) => r.box.id),
    ['l1', 'l22', 'l333'],
  );
});

test('a box no route passes shows none, counts none, and has no SWITCH', () => {
  const s = shows({});
  assert.deepEqual(s.routes, []);
  assert.deepEqual(s.shown, []);
  assert.equal(s.heads, 0);
  assert.equal(s.switchTo, null);
});

test('a direction not drawn is not shown, nor does it decide the way round', () => {
  const sketch = direction('sketch', 'SM Fairview', 'Tala', true, { drawn: false });
  const s = hintuanCardShows({
    hotspot: LAGRO_1,
    hotspots: HOTSPOTS,
    linkedDirectionIds: () => ['there', 'sketch'],
    directions: [THERE, sketch],
    deselected: false,
    flipped: true,
  });
  assert.equal(s.back, false);
  assert.deepEqual(s.shown, ['there']);
});

test('a loop never decides the way round, and shows either way', () => {
  const loop = direction('ikot', 'UP', 'UP', false, { isLoop: true });
  const s = hintuanCardShows({
    hotspot: LAGRO_1,
    hotspots: HOTSPOTS,
    linkedDirectionIds: () => ['back', 'ikot'],
    directions: [BACK, loop],
    deselected: false,
    flipped: false,
  });
  assert.equal(s.back, true, 'only the way back is two-ended here');
  assert.deepEqual(s.shown.sort(), ['back', 'ikot']);
});

test('a box missing from the hotspots is still its own row', () => {
  const lone = box('x', 'Nova Mall', 121.2);
  const s = hintuanCardShows({
    hotspot: lone,
    hotspots: HOTSPOTS,
    linkedDirectionIds: () => [],
    directions: [],
    deselected: false,
    flipped: false,
  });
  assert.deepEqual(
    s.rows.map((r) => r.box.id),
    ['x'],
  );
});
