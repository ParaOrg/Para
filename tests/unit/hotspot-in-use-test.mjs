// A hotspot a route ends at cannot be deleted (src/features/studio/panels/hotspot-in-use.ts):
// the routes that end there, each once, and the sentence the notice shows.
// save-test reads that sentence, so its two shapes are pinned here.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/hotspot-in-use-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { endsRefusal, routesEndingAt } from '../../src/features/studio/panels/hotspot-in-use.ts';

/** A box, shaped like the hotspot rows: sample data only. */
const tala = {
  id: 'h-tala',
  kind: 'terminal',
  name: 'Tala Terminal',
  informal: 'Tala',
  aliases: [],
  point: { type: 'Point', coordinates: [121.0, 14.7] },
};

/** A direction of a route running between two hotspots. */
const direction = (id, name, headHotspotId, tailHotspotId) => ({
  id,
  routeId: `route-${name}`,
  route: { name, headHotspotId, tailHotspotId },
});

test('nothing ends here: no routes, no refusal', () => {
  const directions = [direction('a', 'Novaliches – Fairview', 'h-nova', 'h-fairview')];
  assert.deepEqual(routesEndingAt(tala, directions), []);
  assert.equal(endsRefusal(tala, directions), null);
});

test('one route, listed by both its directions, is counted once: "ends", "that route"', () => {
  const directions = [
    direction('out', 'Tala – Fairview', 'h-tala', 'h-fairview'),
    direction('back', 'Tala – Fairview', 'h-tala', 'h-fairview'),
  ];
  assert.deepEqual(routesEndingAt(tala, directions), ['Tala – Fairview']);
  assert.equal(
    endsRefusal(tala, directions),
    '"Tala" is where Tala – Fairview ends. Delete that route first.',
  );
});

test('two routes, at either end: "end", "those routes"', () => {
  const directions = [
    direction('a', 'Tala – Fairview', 'h-tala', 'h-fairview'),
    direction('b', 'Novaliches – Tala', 'h-nova', 'h-tala'),
    direction('c', 'Novaliches – Fairview', 'h-nova', 'h-fairview'),
  ];
  assert.deepEqual(routesEndingAt(tala, directions), ['Tala – Fairview', 'Novaliches – Tala']);
  assert.equal(
    endsRefusal(tala, directions),
    '"Tala" is where Tala – Fairview, Novaliches – Tala end. Delete those routes first.',
  );
});
