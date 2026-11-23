// What a hotspot's draft holds (src/features/studio/data/hotspot-save-input.ts):
// its stop row, from hotspotColumns, and its route links, from hotspotLinks.
// Both are pure; saveHotspotDraft and saveNewPlaceDraft store what they answer.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/hotspot-save-input-test.mjs
//
// These checks once ran through the direct save (saveHotspot), which wrote the
// same row and links to the approved tables.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hotspotColumns, hotspotLinks } from '../../src/features/studio/data/hotspot-save-input.ts';

const ring = [
  [121.04, 14.7],
  [121.0401, 14.7],
  [121.0401, 14.7001],
  [121.04, 14.7001],
];
const input = {
  hotspotId: null,
  kind: 'hintuan',
  name: 'Tala Ilalim',
  informal: 'Tala',
  aliases: [],
  note: '',
  ring,
  directions: [],
};

// The expected rows are spelled out, not computed by the code under test.
const POLYGON = { type: 'Polygon', coordinates: [[...ring, ring[0]]] };
const CENTRE = { type: 'Point', coordinates: [121.04005, 14.70005] };
/** A line that runs through the box: its second vertex is the first one inside it. */
const THROUGH = [
  [121.0399, 14.70005],
  [121.04005, 14.70005],
  [121.0402, 14.70005],
];
const AWAY = [
  [121.1, 14.8],
  [121.11, 14.8],
];
/** A direction as the studio holds it, as far as the links read it. */
const direction = (id, line, route = { mode: 'jeepney', line: null }) => ({
  id,
  routeId: 'r' + id,
  reversed: false,
  shape: { type: 'LineString', coordinates: line },
  segments: [],
  route,
});
/** The links of `input` and `over`, for a hotspot on no train line. */
const linksOf = (over, line = null) => {
  const whole = { ...input, ...over };
  return hotspotLinks(whole, hotspotColumns(whole).ring, line);
};

test('a hotspot holds its normalised name, kind, outline and centre', () => {
  const { row } = hotspotColumns({
    ...input,
    name: '  Tala   Ilalim ',
    informal: 'Tala',
    aliases: ['Tala Bridge'],
    note: ' Under the flyover ',
  });
  assert.deepEqual(row, {
    name: 'Tala Ilalim',
    informal: 'Tala',
    aliases: ['Tala Bridge'],
    kind: 'hintuan',
    note: 'Under the flyover',
    area: POLYGON,
    point: CENTRE,
  });
});

test('an informal name that is the name in other letters, or blank, is held as null', () => {
  const same = hotspotColumns({ ...input, name: 'Tala', informal: 'TALA', note: '' }).row;
  assert.equal(same.informal, null);
  assert.equal(same.note, null);
  assert.equal(hotspotColumns({ ...input, name: 'Tala', informal: '' }).row.informal, null);
});

test('the outline is rounded to six decimals', () => {
  const { row } = hotspotColumns({
    ...input,
    ring: ring.map(([x, y]) => [x + 0.00000004, y + 0.00000004]),
  });
  assert.deepEqual(row.area, POLYGON);
  assert.deepEqual(row.point, CENTRE);
});

test('a hotspot with no corners to speak of, or no name, is refused', () => {
  assert.throws(
    () => hotspotColumns({ ...input, ring: ring.slice(0, 2) }),
    /at least three corners/,
  );
  assert.throws(() => hotspotColumns({ ...input, name: '   ' }), /needs a name/);
});

test('a hintuan with no line through it has no links', () => {
  assert.deepEqual(linksOf({ directions: [direction('v1', AWAY)] }), []);
});

test('a hintuan is linked to each line that passes through it, at the vertex it meets the box', () => {
  assert.deepEqual(linksOf({ directions: [direction('v1', THROUGH), direction('v2', AWAY)] }), [
    { directionId: 'v1', sequence: 1 },
  ]);
});

test("a hintuan's ticked directions are ignored: its links are worked out from the ground", () => {
  const links = linksOf({
    directionIds: ['v2'],
    directions: [direction('v1', THROUGH), direction('v2', AWAY)],
  });
  assert.deepEqual(links, [{ directionId: 'v1', sequence: 1 }]);
});

test('a terminal is linked to the directions ticked, and to no others, in the ticked order', () => {
  const links = linksOf({
    kind: 'terminal',
    directionIds: ['v2', 'v1', 'gone'],
    directions: [direction('v1', THROUGH), direction('v2', AWAY), direction('v3', THROUGH)],
  });
  // v2 never enters the box: sequence 0, still a valid ordered link. v3 was not ticked; "gone" is no saved direction.
  assert.deepEqual(links, [
    { directionId: 'v2', sequence: 0 },
    { directionId: 'v1', sequence: 1 },
  ]);
});

test('a terminal with none ticked has no links', () => {
  assert.deepEqual(
    linksOf({ kind: 'terminal', directionIds: [], directions: [direction('v1', THROUGH)] }),
    [],
  );
});

test('a station is linked to the train of its line, not to the jeep or the other line passing under it', () => {
  const links = linksOf(
    {
      directions: [
        direction('v1', THROUGH),
        direction('v2', THROUGH, { mode: 'lrt', routeCode: 'LRT-1' }),
        direction('v3', THROUGH, { mode: 'mrt', routeCode: 'MRT-3' }),
      ],
    },
    'LRT-1',
  );
  assert.deepEqual(links, [{ directionId: 'v2', sequence: 1 }]);
});

// ---------------------------------------------------------------- an ikot's terminals (0021)

test("a terminal's links are the ticked directions and every ikot through its outline", () => {
  const links = linksOf({
    kind: 'terminal',
    // 'ikot' is ticked as well (a link it already had): it is not the owner's to pick.
    directionIds: ['plain', 'ikot'],
    directions: [
      direction('plain', THROUGH),
      direction('ikot', THROUGH, { mode: 'jeepney', isLoop: true }),
      direction('other-ikot', THROUGH, { mode: 'jeepney', isLoop: true }),
    ],
  });
  assert.deepEqual(links.map((l) => l.directionId).sort(), ['ikot', 'other-ikot', 'plain']);
});

test('an ikot the outline no longer meets loses its link on a terminal save', () => {
  const links = linksOf({
    kind: 'terminal',
    directionIds: ['ikot'],
    directions: [direction('ikot', AWAY, { mode: 'jeepney', isLoop: true })],
  });
  assert.deepEqual(links, []);
});
