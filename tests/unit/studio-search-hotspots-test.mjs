// What studio place search looks through (src/features/studio/data/search-hotspots.ts,
// .scratch/place-search ticket 05): the saved hotspots, each new place still in a draft (marked
// a draft), and a draft edit's new names as more names of its saved hotspot.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/studio-search-hotspots-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { searchableHotspots } from '../../src/features/studio/data/search-hotspots.ts';
import { searchPlaces, searchablePlaces } from '../../src/features/routes/model/place-search.ts';

const ring = [
  [121.0, 14.6],
  [121.001, 14.6],
  [121.001, 14.601],
  [121.0, 14.6],
];
const stop = (name, extra = {}) => ({
  name,
  informal: null,
  aliases: [],
  kind: 'hintuan',
  note: null,
  area: { type: 'Polygon', coordinates: [ring] },
  point: { type: 'Point', coordinates: [121.0005, 14.6005] },
  line: null,
  ...extra,
});
const saved = (id, name, extra = {}) => ({
  id,
  ...stop(name, extra),
  createdAt: '2026-01-01T00:00:00Z',
});
const draft = (subjectId, isNew, payload, kind = 'hotspot') => ({
  id: `draft-${subjectId}`,
  kind,
  subject_id: subjectId,
  is_new: isNew,
  base_revision: null,
  revision: 1,
  status: 'draft',
  payload,
  note: null,
  editor_id: 'e1',
  created_at: '2026-11-07T00:00:00Z',
  updated_at: '2026-11-07T00:00:00Z',
  submitted_at: null,
});

test('saved hotspots pass through as they are, none a draft', () => {
  const hotspots = [saved('h1', 'Cubao Farmers'), saved('h2', 'Quiapo Church')];
  const result = searchableHotspots(hotspots, []);
  assert.deepEqual(result.hotspots, hotspots);
  assert.equal(result.draftIds.size, 0);
});

test('a new place still in a draft is a hotspot of its own, marked a draft, in the glossary names', () => {
  const result = searchableHotspots(
    [saved('h1', 'Cubao Farmers')],
    [
      draft('new-1', true, {
        version: 1,
        stop: stop('Litex Market', { informal: 'Litex' }),
        links: [],
      }),
    ],
  );
  const found = result.hotspots.find(({ id }) => id === 'new-1');
  assert.equal(found.name, 'Litex Market');
  assert.equal(found.informal, 'Litex');
  assert.equal(found.createdAt, '2026-11-07T00:00:00Z');
  assert.deepEqual(found.point.coordinates, [121.0005, 14.6005]);
  assert.deepEqual([...result.draftIds], ['new-1']);
});

test("a draft edit's new name and aliases find its saved hotspot, which stays saved", () => {
  const result = searchableHotspots(
    [saved('h1', 'Cubao Farmers', { informal: 'Cubao' })],
    [
      draft('h1', false, {
        version: 1,
        stop: stop('Cubao Farmers Plaza', {
          informal: 'Cubao',
          aliases: ['Farmers', 'cubao farmers'],
        }),
        links: [],
      }),
    ],
  );
  const [hotspot] = result.hotspots;
  assert.equal(hotspot.name, 'Cubao Farmers');
  assert.deepEqual(hotspot.aliases, ['Cubao Farmers Plaza', 'Farmers']);
  assert.equal(result.draftIds.size, 0);
  const [match] = searchPlaces('farmers plaza', searchablePlaces(result.hotspots));
  assert.equal(match.place.label, 'Cubao');
  assert.equal(match.matchedTerm, 'Cubao Farmers Plaza');
});

test('route drafts, unreadable payloads and an edit of a hotspot not on the list are passed over', () => {
  const result = searchableHotspots(
    [saved('h1', 'Cubao Farmers')],
    [
      draft('r1', true, { version: 1, route: {}, directions: [] }, 'route'),
      draft('new-2', true, { version: 1, stop: { name: 'No point' }, links: [] }),
      draft('new-3', true, 'not a payload'),
      draft('gone', false, { version: 1, stop: stop('Somewhere'), links: [] }),
    ],
  );
  assert.deepEqual(
    result.hotspots.map(({ id }) => id),
    ['h1'],
  );
  assert.equal(result.draftIds.size, 0);
});
