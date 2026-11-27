// The lines' one rule (src/features/routes/model/routes.ts, servedBy): a train, or the
// ferry, stops only at its own line's stations; a road route — a jeep, a bus —
// at every hintuan it passes, a station's too. Every question of which
// hintuans a line passes asks it: the timeline, the ride-to cut, the links.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/rail-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  FERRY_LINES,
  LINES,
  MODES,
  RAIL_LINES,
  isFerry,
  isLineMode,
  isRail,
  servedBy,
} from '../../src/features/routes/model/routes.ts';
import { hintuansAlong, timelineFor } from '../../src/features/routes/model/timeline.ts';
import { rideCut } from '../../src/features/routes/model/ride.ts';
import { linksThrough } from '../../src/features/studio/data/hotspots-geometry.ts';

const JEEP = { mode: 'jeepney', routeCode: null };
const LRT1 = { mode: 'lrt', routeCode: 'LRT-1' };
const MRT3 = { mode: 'mrt', routeCode: 'MRT-3' };
const PRFS = { mode: 'ferry', routeCode: 'PRFS' };
const BUS = { mode: 'bus', routeCode: null };

test('only lrt and mrt are trains', () => {
  assert.deepEqual(
    MODES.filter((m) => isRail(m.value)).map((m) => m.value),
    ['lrt', 'mrt'],
  );
  assert.equal(isRail(undefined), false);
  assert.deepEqual([...RAIL_LINES], ['LRT-1', 'LRT-2', 'MRT-3']);
});

test('the ferry is a line, not a train', () => {
  assert.deepEqual(
    MODES.filter((m) => isLineMode(m.value)).map((m) => m.value),
    ['lrt', 'mrt', 'ferry', 'busway'],
  );
  assert.deepEqual(
    MODES.filter((m) => isFerry(m.value)).map((m) => m.value),
    ['ferry'],
  );
  assert.equal(isRail('ferry'), false);
  assert.deepEqual([...FERRY_LINES], ['PRFS']);
  assert.deepEqual([...LINES], ['LRT-1', 'LRT-2', 'MRT-3', 'PRFS', 'EDSA-C']);
});

test('the ferry stops at its own stations only, and no train at them; a jeep passing one does', () => {
  assert.equal(servedBy({ line: 'PRFS' }, PRFS), true);
  assert.equal(servedBy({ line: null }, PRFS), false);
  assert.equal(servedBy({ line: 'MRT-3' }, PRFS), false);
  assert.equal(servedBy({ line: 'PRFS' }, JEEP), true);
  assert.equal(servedBy({ line: 'PRFS' }, MRT3), false);
  assert.equal(servedBy({ line: null }, { mode: 'ferry', routeCode: null }), false);
});

test("a road route stops at every hintuan it passes, a station's too", () => {
  for (const road of [JEEP, BUS]) {
    assert.equal(servedBy({ line: null }, road), true);
    assert.equal(servedBy({}, road), true, 'a hotspot from a file before 0011');
    assert.equal(servedBy({ line: 'LRT-1' }, road), true);
    assert.equal(servedBy({ line: 'MRT-3' }, road), true);
  }
});

test("a train stops at its own line's stations only", () => {
  assert.equal(servedBy({ line: 'LRT-1' }, LRT1), true);
  assert.equal(servedBy({ line: 'MRT-3' }, LRT1), false);
  assert.equal(servedBy({ line: null }, LRT1), false);
  assert.equal(servedBy({ line: 'MRT-3' }, MRT3), true);
});

test('a train with no line named stops nowhere, not at the jeep hintuans under it', () => {
  for (const route of [{ mode: 'lrt', routeCode: null }, { mode: 'mrt' }]) {
    assert.equal(servedBy({ line: null }, route), false);
    assert.equal(servedBy({ line: 'LRT-1' }, route), false);
  }
});

// Taft Avenue, flat: a jeep hintuan and an LRT-1 station on the same stretch
// of road, the track right over it.
const pt = (lng) => ({ type: 'Point', coordinates: [lng, 0] });
const ringAt = (lng, r = 0.0002) => ({
  type: 'Polygon',
  coordinates: [
    [
      [lng - r, -r],
      [lng + r, -r],
      [lng + r, r],
      [lng - r, r],
      [lng - r, -r],
    ],
  ],
});
const hintuan = (id, lng, name, line = null) => ({
  id,
  kind: 'hintuan',
  name,
  informal: null,
  aliases: [],
  point: pt(lng),
  area: ringAt(lng),
  line,
});
const HOTSPOTS = [
  { id: 'h', kind: 'terminal', name: 'Head', informal: null, aliases: [], point: pt(0) },
  { id: 't', kind: 'terminal', name: 'Tail', informal: null, aliases: [], point: pt(0.03) },
  hintuan('jeep-buendia', 0.01, 'Buendia'),
  hintuan('lrt-buendia', 0.0101, 'Buendia', 'LRT-1'),
  hintuan('jeep-libertad', 0.02, 'Libertad'),
  hintuan('mrt-taft', 0.025, 'Taft Avenue', 'MRT-3'),
];
const LINE = [
  [0, 0],
  [0.01, 0],
  [0.02, 0],
  [0.03, 0],
];
const ids = (route) => hintuansAlong(LINE, HOTSPOTS, route).map((a) => a.hotspot.id);

test('along the same road, a road route lists the stations it passes; a train only its own', () => {
  const all = ['jeep-buendia', 'lrt-buendia', 'jeep-libertad', 'mrt-taft'];
  assert.deepEqual(ids(JEEP), all);
  assert.deepEqual(ids(BUS), all);
  assert.deepEqual(ids(LRT1), ['lrt-buendia']);
  assert.deepEqual(ids(MRT3), ['mrt-taft']);
});

test("a road route's timeline names a station by its own name, one row with a hintuan of its place", () => {
  const along = hintuansAlong(LINE, HOTSPOTS, BUS).map((a) => a.hotspot);
  const [head, tail] = [HOTSPOTS[0], HOTSPOTS[1]];
  const rows = timelineFor(head, tail, false, along, LINE[0]).between;
  assert.deepEqual(
    rows.map((r) => [r.id, r.label]),
    [
      ['jeep-buendia', 'Buendia'],
      ['jeep-libertad', 'Libertad'],
      ['mrt-taft', 'Taft Avenue'],
    ],
  );
});

test("a station of the end's place is left out of the middle, as any box of it is", () => {
  const atTail = [...HOTSPOTS, hintuan('lrt-tail', 0.0299, 'Tail', 'LRT-1')];
  const along = hintuansAlong(LINE, atTail, BUS).map((a) => a.hotspot);
  assert.ok(
    along.some((s) => s.id === 'lrt-tail'),
    'the bus passes it',
  );
  const rows = timelineFor(atTail[0], atTail[1], false, along, LINE[0]).between;
  assert.ok(!rows.some((r) => r.label === 'Tail'));
});

test('a train still lists no road hintuan under its track, however near', () => {
  const underTrack = [HOTSPOTS[0], HOTSPOTS[1], hintuan('jeep-under', 0.015, 'Under')];
  assert.deepEqual(hintuansAlong(LINE, underTrack, LRT1), []);
  assert.deepEqual(hintuansAlong(LINE, underTrack, MRT3), []);
});

test("the ride-to cut of a place shared by a jeep hintuan and a station keeps to the line's own", () => {
  const v = (route) => ({
    id: 'v',
    reversed: false,
    route: { ...route, headHotspotId: 'h', tailHotspotId: 't' },
    shape: { type: 'LineString', coordinates: LINE },
  });
  // The train's ride ends at its own box whichever order the boxes are listed
  // in: were the jeep's box counted too, it could be the last dot. The jeep
  // stops at both, so its ride ends at the place's last box it passes.
  for (const boxes of [HOTSPOTS, [...HOTSPOTS].reverse()]) {
    assert.equal(rideCut(v(JEEP), boxes, 'jeep-buendia').endHotspotId, 'lrt-buendia');
    assert.equal(rideCut(v(LRT1), boxes, 'lrt-buendia').endHotspotId, 'lrt-buendia');
  }
});

// The studio's links when a hintuan is saved (hotspots-geometry.ts, linksThrough):
// the one place that writes a box's route list, by the same rule.
test('a saved box is linked only to the directions that stop at it: a station to its train and the road routes', () => {
  const dir = (id, route) => ({ id, route, shape: { type: 'LineString', coordinates: LINE } });
  const variants = [dir('jeep', JEEP), dir('lrt', LRT1), dir('mrt', MRT3)];
  const ring = ringAt(0.01).coordinates[0];
  assert.deepEqual(
    linksThrough(ring, variants, null).map((l) => l.directionId),
    ['jeep'],
  );
  assert.deepEqual(
    linksThrough(ring, variants, 'LRT-1').map((l) => l.directionId),
    ['jeep', 'lrt'],
  );
});

// The publish's older shapes (scripts/publish/without-lines.mjs): the lines an
// older app does not know, their stations and every link to either left out,
// the rest as it was — shape 3 without the ferry, shapes 1 and 2 without any line.
const ROWS = {
  variants: [
    { id: 'jeep', route: JEEP },
    { id: 'lrt', route: LRT1 },
    { id: 'mrt', route: MRT3 },
    { id: 'ferry', route: PRFS },
  ],
  stops: [
    { id: 'h', line: null },
    { id: 'st', line: 'LRT-1' },
    { id: 'pier', line: 'PRFS' },
    { id: 'old' },
  ],
  links: [
    { route_variant_id: 'jeep', stop_id: 'h' },
    { route_variant_id: 'lrt', stop_id: 'st' },
    { route_variant_id: 'ferry', stop_id: 'pier' },
    { route_variant_id: 'jeep', stop_id: 'st' },
  ],
};

test('shape 3 leaves out the ferry, its stations and their links, and keeps the trains', async () => {
  const { withoutLines, FERRY } = await import('../../scripts/publish/without-lines.mjs');
  const out = withoutLines(ROWS, FERRY);
  assert.deepEqual(
    out.variants.map((v) => v.id),
    ['jeep', 'lrt', 'mrt'],
  );
  assert.deepEqual(
    out.stops.map((s) => s.id),
    ['h', 'st', 'old'],
  );
  assert.deepEqual(
    out.links.map((l) => l.route_variant_id),
    ['jeep', 'lrt', 'jeep'],
  );
  assert.deepEqual([...out.ids.variants], ['ferry']);
  assert.deepEqual([...out.ids.stops], ['pier']);
});

test('shapes 1 and 2 leave out every line, their stations and their links', async () => {
  const { withoutLines, EVERY_LINE } = await import('../../scripts/publish/without-lines.mjs');
  const out = withoutLines(ROWS, EVERY_LINE);
  assert.deepEqual(
    out.variants.map((v) => v.id),
    ['jeep'],
  );
  assert.deepEqual(
    out.stops.map((s) => s.id),
    ['h', 'old'],
  );
  assert.deepEqual(out.links, [{ route_variant_id: 'jeep', stop_id: 'h' }]);
  assert.deepEqual([...out.ids.variants], ['lrt', 'mrt', 'ferry']);
  assert.deepEqual([...out.ids.stops], ['st', 'pier']);
});

test('a jeep route that ends at a station is left out with the station, in the shapes that leave the station out', async () => {
  const { withoutLines, EVERY_LINE, FERRY } =
    await import('../../scripts/publish/without-lines.mjs');
  // Cogeo – Cubao, 2026-10-19: a jeep ending at the LRT-2 Cubao station. Shapes 1 and 2
  // left the station out and kept the jeep, so its route named a hotspot the file
  // did not have, and the nightly publish's check refused the map.
  const toStation = { ...JEEP, head_stop_id: 'h', tail_stop_id: 'st' };
  const rows = {
    ...ROWS,
    variants: [
      ...ROWS.variants,
      { id: 'to-st', route: toStation },
      { id: 'to-st-back', route: toStation },
    ],
    links: [...ROWS.links, { route_variant_id: 'to-st', stop_id: 'h' }],
  };
  const old = withoutLines(rows, EVERY_LINE);
  assert.deepEqual(
    old.variants.map((v) => v.id),
    ['jeep'],
  );
  assert.ok(
    old.ids.variants.has('to-st') && old.ids.variants.has('to-st-back'),
    'both its directions',
  );
  assert.ok(!old.links.some((l) => l.route_variant_id === 'to-st'), 'and their links');
  // Shape 3 keeps the trains and their stations, so the jeep to one stays.
  const v3 = withoutLines(rows, FERRY);
  assert.ok(v3.variants.some((v) => v.id === 'to-st'));
});
