// The Map Data Source sheet's rows (src/features/routes/map/data-source-credits.ts): the map's
// credits with Overture's, which its licences ask for wherever its places show. The sheet takes
// the map corner's place on every page with its own ⓘ, so the credit must be there.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/data-source-credits-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  OVERTURE_CREDIT,
  dataSourceCredits,
} from '../../src/features/routes/map/data-source-credits.ts';
import { OVERTURE_ATTRIBUTION } from '../../src/features/routes/map/establishment-overture.ts';
import { mapAttribution, mapCredits } from '../../src/features/routes/map/map-attribution.ts';
import { OPENFREEMAP_HOST } from '../../src/shared/config/basemap-host.ts';

const OURS = 'https://tiles.para-commute.org';

test("the sheet names Overture after OpenStreetMap, as the Overture source's own credit", () => {
  for (const host of [OURS, OPENFREEMAP_HOST]) {
    const titles = dataSourceCredits(host).map(({ title }) => title);
    assert.deepEqual(titles, [
      '© Para contributors · ODbL',
      '© OpenStreetMap contributors',
      '© Overture Maps Foundation',
      ...mapCredits(host)
        .slice(2)
        .map(({ title }) => title),
    ]);
  }
  assert.equal(OVERTURE_CREDIT.title, OVERTURE_ATTRIBUTION);
  assert.equal(OVERTURE_CREDIT.isCredit, true);
  assert.ok(OVERTURE_CREDIT.description);
});

test("the corner's own line does not carry it twice: MapLibre adds it from the Overture source", () => {
  assert.doesNotMatch(mapAttribution(OURS), /Overture/);
});
