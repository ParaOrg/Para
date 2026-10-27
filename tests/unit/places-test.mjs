// The save panel's places (src/features/studio/panels/places.ts): the hotspots a route
// can end at, grouped by the name people say, the one box a picked place
// stands on, and the panel's first guess at a new route's ends.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/places-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  boxFor,
  endsByHead,
  groupPlaces,
  guessBox,
  guessEnds,
  nearestHotspot,
  placeAlreadyNamed,
  placeOfBox,
  terminalAlreadyAt,
} from '../../src/features/studio/panels/places.ts';

let n = 0;
/** A box at [lng, 14.7]: sample data, shaped like the stop rows. */
const box = (name, lng, kind = 'hintuan', informal = null) => ({
  id: `s${n++}`,
  kind,
  name,
  informal,
  aliases: [],
  point: { type: 'Point', coordinates: [lng, 14.7] },
});

test('boxes that share the name people say are one place; a terminal names it and comes first', () => {
  const a = box('SM Fairview Ilalim', 121.0, 'hintuan', 'SM Fairview');
  const b = box('SM Fairview Terminal B', 121.001, 'terminal', 'SM Fairview');
  const c = box('Bestlink', 121.01);
  const places = groupPlaces([c, a, b]);
  assert.deepEqual(
    places.map((p) => [p.label, p.boxes.length, p.terminal?.id ?? null]),
    [
      ['SM Fairview', 2, b.id],
      ['Bestlink', 1, null],
    ],
  );
});

test('a spelling typed in another case is the same place', () => {
  const places = groupPlaces([
    box('Tala', 121.0, 'hintuan', 'Tala'),
    box('tala', 121.002, 'hintuan', 'tala'),
  ]);
  assert.equal(places.length, 1);
});

test('a place stands on its terminal; with none, on the box nearest that end of the line', () => {
  const near = box('Bestlink', 121.0);
  const far = box('Bestlink', 121.05);
  const [place] = groupPlaces([far, near]);
  assert.equal(boxFor(place, [121.001, 14.7]), near.id);
  assert.equal(boxFor(place, [121.049, 14.7]), far.id);
  const term = box('Tala Terminal', 121.05, 'terminal', 'Bestlink');
  const [withTerminal] = groupPlaces([near, term]);
  assert.equal(boxFor(withTerminal, [121.0, 14.7]), term.id);
});

test('the nearest box to a point, and nothing without a point or boxes', () => {
  const a = box('A', 121.0),
    b = box('B', 121.1);
  assert.equal(nearestHotspot([a, b], [121.09, 14.7]), b.id);
  assert.equal(nearestHotspot([a, b], undefined), '');
  assert.equal(nearestHotspot([], [121.0, 14.7]), '');
});

test('a place has one terminal: a second is found by the name people say, or the ground name when that is blank', () => {
  const tala = box('Tala', 121.0, 'terminal');
  const fairview = box('SM Fairview Terminal A', 121.1, 'terminal', 'SM Fairview');
  const stops = [tala, fairview, box('Tala Ilalim', 121.0, 'hintuan', 'Tala')];
  // Two terminals both named "Tala", nothing informal: the gap the review of 2026-10-03 found.
  assert.equal(terminalAlreadyAt(stops, { id: null, name: 'Tala', informal: '' }), tala);
  assert.equal(
    terminalAlreadyAt(stops, { id: null, name: 'Tala Terminal B', informal: ' tala ' }),
    tala,
  );
  assert.equal(
    terminalAlreadyAt(stops, { id: null, name: 'sm  fairview', informal: '' }),
    fairview,
  );
  // The terminal itself, saved again, is no clash; a new place is none either.
  assert.equal(terminalAlreadyAt(stops, { id: tala.id, name: 'Tala', informal: '' }), null);
  assert.equal(terminalAlreadyAt(stops, { id: null, name: 'Novaliches', informal: '' }), null);
});

test('a box belongs to its place; an unknown or empty id to none', () => {
  const a = box('Bestlink', 121.0);
  const b = box('Tala', 121.1);
  const places = groupPlaces([a, b]);
  assert.equal(placeOfBox(places, b.id)?.label, 'Tala');
  assert.equal(placeOfBox(places, 'nowhere'), undefined);
  assert.equal(placeOfBox(places, ''), undefined);
});

test("the line's ends by the route's head, whichever way it was drawn", () => {
  const start = [121.0, 14.7];
  const mid = [121.05, 14.7];
  const end = [121.1, 14.7];
  const head = box('Tala', 121.099);
  // Drawn from the tail: the end nearer the head comes first.
  assert.deepEqual(endsByHead([start, mid, end], head), [end, start]);
  assert.deepEqual(endsByHead([end, mid, start], head), [end, start]);
  // A new route has no head yet: its line starts at its head.
  assert.deepEqual(endsByHead([start, mid, end], undefined), [start, end]);
  // Equally far either way: the line's own order.
  assert.deepEqual(endsByHead([start, end], box('Middle', 121.05)), [start, end]);
  assert.deepEqual(endsByHead([], head), [undefined, undefined]);
});

test("a line end's box: the nearest box's place, standing on its terminal", () => {
  const ilalim = box('SM Fairview Ilalim', 121.0, 'hintuan', 'SM Fairview');
  const terminal = box('SM Fairview Terminal B', 121.01, 'terminal', 'SM Fairview');
  const stops = [ilalim, terminal];
  const places = groupPlaces(stops);
  assert.equal(guessBox(places, stops, [121.0, 14.7]), terminal.id);
  assert.equal(guessBox(places, stops, undefined), '');
  assert.equal(guessBox([], [], [121.0, 14.7]), '');
});

test("a new route's ends follow its line, swapped when that pair is a route the other way round", () => {
  const tala = box('Tala', 121.0, 'terminal');
  const fairview = box('SM Fairview', 121.1, 'terminal');
  const stops = [tala, fairview];
  const places = groupPlaces(stops);
  const line = [
    [121.001, 14.7],
    [121.099, 14.7],
  ];
  assert.deepEqual(guessEnds(places, stops, line, []), [tala.id, fairview.id]);
  const fairviewTala = { route: { headHotspotId: fairview.id, tailHotspotId: tala.id } };
  assert.deepEqual(guessEnds(places, stops, line, [fairviewTala]), [fairview.id, tala.id]);
  // The pair the same way round is no reason to swap.
  const talaFairview = { route: { headHotspotId: tala.id, tailHotspotId: fairview.id } };
  assert.deepEqual(guessEnds(places, stops, line, [talaFairview]), [tala.id, fairview.id]);
  // No places: nothing guessed.
  assert.deepEqual(guessEnds([], [], line, []), ['', '']);
});

test('a name that is already a place is found, as the pickers group it: case and spacing do not matter', () => {
  const tala = box('Tala Jeepney Terminal', 121.1, 'terminal', 'Tala');
  const fairview = box('SM Fairview Ilalim', 121.2, 'hintuan', 'SM Fairview');
  const stops = [tala, fairview];
  assert.equal(placeAlreadyNamed(stops, { name: 'Tala', informal: '' }), tala);
  assert.equal(placeAlreadyNamed(stops, { name: 'tala', informal: '' }), tala);
  assert.equal(
    placeAlreadyNamed(stops, { name: 'Tala Bay', informal: '  SM   fairview ' }),
    fairview,
  );
  assert.equal(placeAlreadyNamed(stops, { name: ' SM Fairview ', informal: '' }), fairview);
});

test("a new name, a blank one, and the caller's own row are no match", () => {
  const tala = box('Tala Jeepney Terminal', 121.1, 'terminal', 'Tala');
  assert.equal(placeAlreadyNamed([tala], { name: 'Novaliches', informal: '' }), null);
  assert.equal(placeAlreadyNamed([tala], { name: '  ', informal: '' }), null);
  assert.equal(placeAlreadyNamed([tala], { name: 'Tala', informal: '' }, tala.id), null);
});
