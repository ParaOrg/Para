// The EDSA Carousel as a line (src/features/routes/model/busway.ts): its mode, 'busway', names its
// one line, EDSA-C, so a route drawn in the studio, whose draft never writes a routeCode, stops at
// the Carousel's stations only, and a jeep at them only where its line passes them (servedBy).
// Its bound is read from its stations' order, north to south; the studio offers it, locks it once saved and marks a hintuan its station;
// and the publish keeps it out of every file until a shape is made for it.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/edsa-carousel-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CAROUSEL_LINE,
  carouselStationIndex,
  isBusway,
  lineOfMode,
} from '../../src/features/routes/model/busway.ts';
import { isLineMode, isRail, servedBy } from '../../src/features/routes/model/routes.ts';
import { railBound } from '../../src/features/routes/model/rail-codes.ts';
import { railwayOf, vehicleOf } from '../../src/features/routes/model/vehicles.ts';
import { modeChoices } from '../../src/features/studio/panels/mode-choices.ts';

const CAROUSEL = { mode: 'busway', routeCode: null };
const JEEP = { mode: 'jeepney', routeCode: null };
const MRT3 = { mode: 'mrt', routeCode: 'MRT-3' };

/** A Carousel direction between two places, as the published map has it. */
const ride = (from, to) => ({
  id: `${from}-${to}`,
  name: `${from} → ${to}`,
  reversed: false,
  route: { id: 'carousel', name: 'Monumento – PITX', mode: 'busway', routeCode: null },
});

test('the Carousel is a line by its mode, not a train', () => {
  assert.equal(isBusway('busway'), true);
  assert.equal(isBusway('bus'), false);
  assert.equal(isLineMode('busway'), true);
  assert.equal(isRail('busway'), false);
  assert.equal(lineOfMode('busway'), 'EDSA-C');
  assert.equal(CAROUSEL_LINE, 'EDSA-C');
  for (const mode of ['jeepney', 'bus', 'p2p', 'lrt', 'mrt', 'ferry', null, undefined])
    assert.equal(lineOfMode(mode), null);
});

test('a Carousel route with no routeCode stops at its own stations only, and no train at them; a jeep passing one does', () => {
  assert.equal(servedBy({ line: 'EDSA-C' }, CAROUSEL), true);
  assert.equal(servedBy({ line: null }, CAROUSEL), false);
  assert.equal(servedBy({ line: 'MRT-3' }, CAROUSEL), false);
  assert.equal(servedBy({ line: 'EDSA-C' }, JEEP), true);
  assert.equal(servedBy({ line: 'EDSA-C' }, MRT3), false);
  assert.equal(servedBy({ line: 'MRT-3' }, MRT3), true);
});

test('its bound is read from its stations north to south, never guessed', () => {
  assert.equal(carouselStationIndex(' monumento '), 0);
  assert.equal(carouselStationIndex('MCU'), 0);
  assert.equal(carouselStationIndex('PITX'), 23);
  assert.equal(carouselStationIndex('Quezon Ave'), carouselStationIndex('Quezon Avenue'));
  assert.equal(
    carouselStationIndex('City of Dreams'),
    carouselStationIndex('Ayala Malls Manila Bay'),
  );
  assert.equal(carouselStationIndex('Cubao'), -1);
  assert.equal(railBound(ride('Monumento', 'PITX')), 'Southbound');
  assert.equal(railBound(ride('PITX', 'Monumento')), 'Northbound');
  assert.equal(railBound(ride('Ortigas', 'North Avenue')), 'Northbound');
  assert.equal(railBound(ride('Taft', 'MOA')), 'Southbound');
  assert.equal(railBound(ride('Monumento', 'Cubao')), null);
});

test('its ride is the EDSA Carousel, a railway-like line', () => {
  assert.equal(vehicleOf(ride('Monumento', 'PITX')), 'EDSA Carousel');
  assert.equal(railwayOf(ride('Monumento', 'PITX')), 'EDSA Carousel');
});

test('the studio offers the Carousel to a route drawn there, but never a train or the ferry', () => {
  const offered = modeChoices('jeepney').map((m) => m.value);
  assert.ok(offered.includes('busway'));
  assert.ok(!offered.includes('lrt') && !offered.includes('mrt') && !offered.includes('ferry'));
  assert.ok(modeChoices('ferry').some((m) => m.value === 'ferry'));
});

test('shape 6 holds the Carousel; every older shape leaves it, its stations and their links out', async () => {
  const { shapesOf } = await import('../../scripts/publish/shapes.mjs');
  const rows = {
    variants: [
      { id: 'jeep', route: { mode: 'jeepney', head_stop_id: 'h', tail_stop_id: 'h2' } },
      { id: 'carousel', route: { mode: 'busway', head_stop_id: 'st', tail_stop_id: 'st2' } },
      { id: 'jeep-to-station', route: { mode: 'jeepney', head_stop_id: 'h', tail_stop_id: 'st' } },
    ],
    stops: [
      { id: 'h', line: null },
      { id: 'h2', line: null },
      { id: 'st', line: 'EDSA-C' },
      { id: 'st2', line: 'EDSA-C' },
    ],
    links: [
      { route_variant_id: 'jeep', stop_id: 'h' },
      { route_variant_id: 'carousel', stop_id: 'st' },
    ],
  };
  const { v6, ...older } = shapesOf(rows);
  assert.equal(v6, rows);
  for (const [name, shape] of Object.entries(older)) {
    assert.deepEqual(
      shape.variants.map((v) => v.id),
      ['jeep'],
      name,
    );
    assert.deepEqual(
      shape.stops.map((s) => s.id),
      ['h', 'h2'],
      name,
    );
    assert.deepEqual(shape.links, [{ route_variant_id: 'jeep', stop_id: 'h' }], name);
  }
});
