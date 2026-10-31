// The map's credits (src/features/routes/map/map-attribution.ts), kept in one place: the
// contributor page's Map Data Source sheet lists all five rows, and the map's corner elsewhere
// shows the four credits among them, the tiles' line naming whoever serves them.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/map-attribution-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { mapAttribution, mapCredits } from '../../src/features/routes/map/map-attribution.ts';
import { OPENFREEMAP_HOST } from '../../src/shared/config/basemap-host.ts';

const OURS = 'https://tiles.para-commute.org';

test("on Para's own tiles, the five rows in Figma's order, OpenMapTiles credited for the styles", () => {
  assert.deepEqual(
    mapCredits(OURS).map(({ title, href }) => [title, href]),
    [
      ['© Para contributors · ODbL', 'https://github.com/ParaOrg/Para#data-and-licence'],
      ['© OpenStreetMap contributors', 'https://www.openstreetmap.org/copyright'],
      ['© OpenMapTiles', 'https://openmaptiles.org'],
      ['OSRM', 'https://project-osrm.org'],
      ['Improve map', 'https://www.openstreetmap.org/fixthemap'],
    ],
  );
});

test("on OpenFreeMap's tiles, the tiles' row names OpenFreeMap, its description the same", () => {
  const [, , ours] = mapCredits(OURS);
  const [, , theirs] = mapCredits(OPENFREEMAP_HOST);
  assert.equal(theirs.title, 'OpenFreeMap');
  assert.equal(theirs.href, 'https://openfreemap.org');
  assert.equal(theirs.description, ours.description);
});

test('every credit says what of the map it is; Improve map is a link, not a credit', () => {
  for (const credit of mapCredits(OURS)) {
    assert.equal(
      credit.isCredit,
      credit.description !== undefined,
      `${credit.title}: a credit has a description, and only a credit does`,
    );
  }
});

test("the map's corner shows the four credits as links in a new tab, and not Improve map", () => {
  const line = mapAttribution(OURS);
  const links = [...line.matchAll(/<a href="([^"]+)" target="_blank" rel="noreferrer">/g)];
  assert.deepEqual(
    links.map((m) => m[1]),
    mapCredits(OURS)
      .filter((c) => c.isCredit)
      .map((c) => c.href),
  );
  assert.doesNotMatch(line, /Improve map/);
  assert.match(mapAttribution(OPENFREEMAP_HOST), />OpenFreeMap</);
});
